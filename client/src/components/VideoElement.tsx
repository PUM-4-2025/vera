import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';

import Konva from 'konva';
import { Stage, Layer, Rect, Arrow, Ellipse } from 'react-konva';

import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  Circle as CircleIcon,
  ArrowUpRight,
  Square,
  Undo2,
  Trash2,
  MousePointer2,
  Hand,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';

import { ShapeData, RectShape } from '@/types/project';
import { startMotionDetection } from '@/utils/motionDetection';

// Define the interface for the functions/properties we want to expose
export interface VideoElementRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  getCurrentTime: () => number;
  getCurrentFrameNumber: () => number;
  isPlaying: () => boolean;
  setMotionDetectionMode: () => void;
}

interface VideoElementProps {
  containerWidth: number;
  containerHeight: number;
  onTimeUpdate: (time: number) => void;
}

// --- Shape Rendering Components ---

interface ExistingShapesProps {
  shapes: ShapeData[];
  selectedId: string | null;
  currentShapeType: 'rect' | 'circle' | 'arrow' | 'none';
  getStagePointFromOriginalVideoCoords: (
    videoCoords: { x: number; y: number } | null | undefined
  ) => { x: number; y: number } | null;
}

const ExistingShapes: React.FC<ExistingShapesProps> = ({
  shapes,
  getStagePointFromOriginalVideoCoords,
}) => {
  return (
    <>
      {shapes.map((shape) => {
        // Separate key from other props
        const { key, ...otherCommonProps } = {
          key: shape.id, // Use shape.id as key
          id: shape.id,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
        };
        if (shape.type === 'rect') {
          // Stored shape has video center (shape.x, shape.y) and video dimensions (shape.width, shape.height)
          const videoW = shape.width;
          const videoH = shape.height;

          // Calculate video corner points
          const videoTopLeft = { x: shape.x, y: shape.y };
          const videoBottomRight = { x: shape.x + videoW, y: shape.y + videoH };

          // Convert video corners to stage coordinates
          const stageTopLeft =
            getStagePointFromOriginalVideoCoords(videoTopLeft);
          const stageBottomRight =
            getStagePointFromOriginalVideoCoords(videoBottomRight);

          if (!stageTopLeft || !stageBottomRight) return null; // Handle conversion failure

          // Use stage coordinates for Konva Rect props
          return (
            <Rect
              key={key} // Pass key directly
              {...otherCommonProps} // Spread the rest
              x={stageTopLeft.x} // Use converted stage top-left X
              y={stageTopLeft.y} // Use converted stage top-left Y
              width={stageBottomRight.x - stageTopLeft.x} // Calculate stage width from converted points
              height={stageBottomRight.y - stageTopLeft.y} // Calculate stage height from converted points
            />
          );
        }
        if (shape.type === 'circle') {
          const stageCenter = getStagePointFromOriginalVideoCoords({
            x: shape.x,
            y: shape.y,
          });
          if (!stageCenter) return null;

          const stageBottomRight = getStagePointFromOriginalVideoCoords({
            x: shape.x + shape.radiusX,
            y: shape.y + shape.radiusY,
          });
          if (!stageBottomRight) return null;

          return (
            <Ellipse
              key={key} // Pass key directly
              {...otherCommonProps} // Spread the rest
              x={stageCenter.x}
              y={stageCenter.y}
              radiusX={stageBottomRight.x - stageCenter.x}
              radiusY={stageBottomRight.y - stageCenter.y}
            />
          );
        }
        if (shape.type === 'arrow') {
          const stagePoint = getStagePointFromOriginalVideoCoords({
            x: shape.points[0],
            y: shape.points[1],
          });
          const stagePoint2 = getStagePointFromOriginalVideoCoords({
            x: shape.points[2],
            y: shape.points[3],
          });
          if (!stagePoint || !stagePoint2) return null;
          return (
            <Arrow
              key={key} // Pass key directly
              {...otherCommonProps} // Spread the rest
              points={[
                stagePoint.x,
                stagePoint.y,
                stagePoint2.x,
                stagePoint2.y,
              ]}
              pointerLength={10}
              pointerWidth={10}
            />
          );
        }
        // Add rendering logic for other shape types here
        return null; // Placeholder for other shapes
      })}
    </>
  );
};

interface NewShapePreviewProps {
  newShape: ShapeData | null;
}

const NewShapePreview: React.FC<NewShapePreviewProps> = ({ newShape }) => {
  if (!newShape) return null;
  // These coordinates are all in the stages coordinates system, and will be transformed on mouse release.
  // We need to convert them to the video coordinates system when the shape is added to the shapes array.
  if (newShape.type === 'rect') {
    return (
      <Rect
        x={newShape.x}
        y={newShape.y}
        width={newShape.width}
        height={newShape.height}
        stroke={newShape.stroke}
        strokeWidth={newShape.strokeWidth}
        dash={[5, 5]}
      />
    );
  }
  if (newShape.type === 'circle') {
    return (
      <Ellipse
        x={newShape.x}
        y={newShape.y}
        radiusX={newShape.radiusX}
        radiusY={newShape.radiusY}
        stroke={newShape.stroke}
        strokeWidth={newShape.strokeWidth}
        dash={[5, 5]}
      />
    );
  }
  if (newShape.type === 'arrow') {
    return (
      <Arrow
        {...newShape}
        points={[
          newShape.points[0],
          newShape.points[1],
          newShape.points[2],
          newShape.points[3],
        ]}
        pointerLength={10}
        pointerWidth={10}
        dash={[5, 5]}
      />
    );
  }
  // Add rendering logic for other new shape types here
  return null; // Placeholder for other shapes
};

// Define zoom constants
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 25; // Increased max zoom for video
const ZOOM_STEP = 0.1;

// Define interaction modes
type InteractionMode = 'draw' | 'pan' | 'selectionZoom' | 'motionDetection';

// Add a simple component to render the selection rectangle
const SelectionRectangle: React.FC<{
  box: { x: number; y: number; width: number; height: number } | null;
}> = ({ box }) => {
  if (!box) return null;
  // Normalize box coordinates for rendering regardless of drawing direction
  const x = box.width < 0 ? box.x + box.width : box.x;
  const y = box.height < 0 ? box.y + box.height : box.y;
  const width = Math.abs(box.width);
  const height = Math.abs(box.height);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="rgba(0, 150, 255, 0.2)" // Light blue dashed line
      stroke="rgba(0, 150, 255, 0.8)" // Light blue dashed line
      strokeWidth={2}
      dash={[4, 4]}
      listening={false} // Prevent interaction with the selection box itself
    />
  );
};

const VideoElement = forwardRef<VideoElementRef, VideoElementProps>(
  ({ containerWidth, containerHeight, onTimeUpdate }, ref) => {
    const {
      videos,
      currentVideoId,
      annotations,
      setAnnotationsForFrame,
      captureCurrentFrame,
      currentFrame,
    } = useProject();

    const currentVideo = currentVideoId ? videos[currentVideoId] : null;
    const videoSrc = currentVideo?.objectURL;

    // Provide defaults if video data is missing
    const videoWidth = currentVideo?.metadata?.width || 1920;
    const videoHeight = currentVideo?.metadata?.height || 1080;
    // Ensure frameRate has a valid default if metadata is missing or fps is 0
    const frameRate = currentVideo?.metadata?.fps || 30;

    const videoAnnotations = currentVideoId ? annotations[currentVideoId] : [];

    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null); // Ref for the HTML video element
    const annotationLayerRef = useRef<Konva.Layer>(null); // Ref for Konva annotation layer
    const stageRef = useRef<Konva.Stage>(null); // Ref for Konva stage
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the main container div

    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false); // Video playback state
    const [scale, setScale] = useState(1); // Video scale
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // Video translation offset

    // --- Annotation State ---
    const [shapes, setShapes] = useState<ShapeData[]>([]);
    const [currentShapeType, setCurrentShapeType] = useState<
      'rect' | 'circle' | 'arrow' | 'none'
    >('none');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newShape, setNewShape] = useState<ShapeData | null>(null);
    const [drawStartX, setDrawStartX] = useState<number | null>(null); // Store initial X for drawing
    const [drawStartY, setDrawStartY] = useState<number | null>(null); // Store initial Y for drawing
    const [interactionMode, setInteractionMode] =
      useState<InteractionMode>('pan'); // New state for interaction mode
    const [isPanning, setIsPanning] = useState(false); // State for panning status
    const [panStartPoint, setPanStartPoint] = useState<{
      x: number;
      y: number;
    } | null>(null); // State for panning start point
    const [isSelecting, setIsSelecting] = useState(false); // State for selection zoom status
    const [selectionBox, setSelectionBox] = useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null); // State for selection box coordinates/dimensions
    const [showRawFrame, setShowRawFrame] = useState(false); // State for raw frame toggle
    const [isShowingRawFrame, setIsShowingRawFrame] = useState(false); // State for when raw frame is actually visible

    // --- Helper Function --- Moved up
    const getTargetTimeForFrame = (frameNumber: number): number | null => {
      if (!videoRef.current || frameRate <= 0) return null;
      const duration = videoRef.current.duration;
      if (isNaN(duration)) return null; // Duration might not be available yet

      const targetTime = (frameNumber + 0.5) / frameRate;

      // Clamp the time to be within the video duration
      // Allow seeking exactly to duration, but not beyond
      return Math.max(0, Math.min(targetTime, duration));
    };

    // Memoize getCurrentFrameNumber as it depends on frameRate (derived from currentVideo)
    // and is used as a dependency in useEffect. Moved up.
    const getCurrentFrameNumber = useCallback((): number => {
      if (!videoRef.current || frameRate <= 0) return 0;
      const currentTime = videoRef.current.currentTime;
      // Calculate frame number by flooring the result of time * fps
      return Math.max(0, Math.floor(currentTime * frameRate));
    }, [frameRate]); // Dependency is frameRate, which changes when currentVideo changes

    // --- Coordinate Conversion Functions ---

    // Convert stage coordinates to video coordinates
    const getOriginalVideoCoordsFromStagePoint = (
      stagePoint: { x: number; y: number } | null | undefined
    ): { x: number; y: number } | null => {
      if (!stagePoint || scale === 0) {
        // Return null if input is invalid or scale is zero
        return null;
      }

      // Convert stage coordinates to video coordinates
      const containerX = (stagePoint.x - offset.x) / scale;
      const containerY = (stagePoint.y - offset.y) / scale;

      const ratioX = containerX / containerWidth;
      const ratioY = containerY / containerHeight;

      const videoX = videoWidth * ratioX;
      const videoY = videoHeight * ratioY;

      return { x: videoX, y: videoY };
    };

    // Inverse: Convert original video coordinates to stage coordinates
    const getStagePointFromOriginalVideoCoords = (
      videoCoords: { x: number; y: number } | null | undefined
    ): { x: number; y: number } | null => {
      if (!videoCoords || scale === 0) {
        // Return null if input is invalid or scale is zero
        return null;
      }

      // Convert video coordinates to ratios
      const ratioX = videoCoords.x / videoWidth;
      const ratioY = videoCoords.y / videoHeight;

      // Convert ratios to container coordinates
      const containerX = ratioX * containerWidth;
      const containerY = ratioY * containerHeight;

      // Convert container coordinates to stage coordinates
      const stageX = containerX * scale + offset.x;
      const stageY = containerY * scale + offset.y;

      return { x: stageX, y: stageY };
    };

    // --- Effects ---

    // Effect to reset state and capture initial frame when video source changes
    useEffect(() => {
      setShapes([]); // Clear existing shapes
      setScale(1); // Reset zoom
      setOffset({ x: 0, y: 0 }); // Reset pan

      // When the video source or ID changes, attempt to capture the first frame.
      // This relies on `captureCurrentFrame` being able to handle the video's loading state,
      // or for the video to be ready enough when this is called.
      if (currentVideoId) {
        captureCurrentFrame(currentVideoId, getCurrentFrameNumber());
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoSrc, currentVideoId]); // User-specified dependencies

    // Effect to reset annotations when video is playing
    useEffect(() => {
      if (isPlaying) {
        setShapes([]); // Clear existing shapes
        setCurrentShapeType('none');
        setInteractionMode('selectionZoom'); // Default to select mode when playing
      } else {
        // When pausing, default back to drawing rectangle? Or last used mode? Let's stick to draw/rect for now.
        // Consider persisting the last active mode if needed.
        setInteractionMode('draw');
        setCurrentShapeType('rect');
      }
    }, [isPlaying]);

    // Effect to handle video events (play, pause, timeupdate) and cleanup
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => {
        setIsPlaying(false);
        // Capture frame when video is paused
        if (currentVideoId) {
          captureCurrentFrame(currentVideoId, getCurrentFrameNumber());
        }
      };
      const handleTimeUpdateCallback = () => {
        onTimeUpdate(video.currentTime);
        // Capture frame when video is paused and time changes
        if (!isPlaying && currentVideoId) {
          captureCurrentFrame(currentVideoId, getCurrentFrameNumber());
        }
      };

      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('timeupdate', handleTimeUpdateCallback);

      // Cleanup
      return () => {
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('timeupdate', handleTimeUpdateCallback);
      };
      // UPDATED DEPENDENCIES: Added memoized getCurrentFrameNumber
    }, [
      onTimeUpdate,
      captureCurrentFrame,
      currentVideoId,
      isPlaying,
      getCurrentFrameNumber,
    ]);

    // Effect for handling wheel zoom on the container, applying to the video element
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheelEvent = (e: WheelEvent) => {
        e.preventDefault();

        const pointerPosition = stageRef.current?.getRelativePointerPosition();
        if (!pointerPosition) return;
        const mouseX = pointerPosition.x;
        const mouseY = pointerPosition.y;

        const oldScale = scale;

        // Determine zoom direction and calculate new scale
        const direction = e.deltaY > 0 ? -1 : 1; // -1 zoom out, 1 zoom in
        const scaleFactor = 1 + direction * ZOOM_STEP;
        const newScale = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, oldScale * scaleFactor)
        );

        if (newScale !== oldScale) {
          // Calculate the point in the video content that was under the mouse before zoom
          const videoX = (mouseX - offset.x) / oldScale;
          const videoY = (mouseY - offset.y) / oldScale;

          // Calculate the new offset needed to keep that point under the mouse after zoom
          const newOffsetX = mouseX - videoX * newScale;
          const newOffsetY = mouseY - videoY * newScale;

          setScale(newScale);
          setOffset({ x: newOffsetX, y: newOffsetY });
        }
      };

      container.addEventListener('wheel', handleWheelEvent, { passive: false });

      return () => {
        container?.removeEventListener('wheel', handleWheelEvent);
      };
      // Depend on current scale and offset for calculations inside the handler
    }, [scale, offset]);

    useEffect(() => {
      console.log('currentFrame', currentFrame?.frameNumber);
    }, [currentFrame]);

    // --- Update shapes when timestamp changes ---
    useEffect(() => {
      if (videoAnnotations) {
        const frameNumber = getCurrentFrameNumber();
        setShapes(videoAnnotations[frameNumber] || []);
      }
    }, [videoAnnotations, getCurrentFrameNumber]);

    // Effect to update isShowingRawFrame based on conditions
    useEffect(() => {
      const conditionsResult =
        !isPlaying &&
        showRawFrame &&
        currentFrame &&
        currentFrame.frameNumber === getCurrentFrameNumber() &&
        currentFrame.blobUrl; // This can resolve to non-boolean (e.g. string, null)

      setIsShowingRawFrame(Boolean(conditionsResult)); // Ensure it's always a boolean for the state
    }, [isPlaying, showRawFrame, currentFrame, getCurrentFrameNumber]);

    // --- Imperative Handle ---
    // Expose control methods (play, pause, seek, etc.) to parent components
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        // Snap the seek time to the middle of the nearest frame
        const frameNumber = Math.max(0, Math.floor(time * frameRate));
        const targetTime = getTargetTimeForFrame(frameNumber);
        if (videoRef.current && targetTime !== null) {
          videoRef.current.currentTime = targetTime;
        }
      },
      nextFrame: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          const currentFrame = getCurrentFrameNumber();
          const targetTime = getTargetTimeForFrame(currentFrame + 1); // Go to middle of next frame
          if (targetTime !== null) {
            videoRef.current.currentTime = targetTime;
          }
        }
      },
      prevFrame: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          const currentFrame = getCurrentFrameNumber();
          // Ensure we don't go below frame 0
          const targetFrame = Math.max(0, currentFrame - 1);
          const targetTime = getTargetTimeForFrame(targetFrame); // Go to middle of previous (or first) frame
          if (targetTime !== null) {
            videoRef.current.currentTime = targetTime;
          }
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      // Add getCurrentFrameNumber to the exposed ref
      getCurrentFrameNumber: getCurrentFrameNumber,
      isPlaying: () => isPlaying,
      setMotionDetectionMode: () => {
        setInteractionMode('motionDetection');
        setCurrentShapeType('rect');
      },
    }));

    // --- Event Handlers for Annotations ---
    const handleMouseDown = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const stagePoint = stage.getRelativePointerPosition();
      if (!stagePoint) return;

      if (interactionMode === 'pan') {
        setIsPanning(true);
        setPanStartPoint(stagePoint);
        return;
      }

      if (interactionMode === 'selectionZoom') {
        setSelectedId(null);
        setIsSelecting(true);
        setSelectionBox({
          x: stagePoint.x,
          y: stagePoint.y,
          width: 0,
          height: 0,
        });
        return;
      }

      if (
        (interactionMode === 'draw' || interactionMode === 'motionDetection') &&
        currentShapeType !== 'none'
      ) {
        setSelectedId(null);
        setDrawStartX(stagePoint.x);
        setDrawStartY(stagePoint.y);
        const id = uuidv4();

        if (currentShapeType === 'rect') {
          setNewShape({
            id,
            type: 'rect',
            x: stagePoint.x,
            y: stagePoint.y,
            width: 0,
            height: 0,
            stroke: interactionMode === 'motionDetection' ? 'blue' : 'red',
            strokeWidth: 4,
          });
        }
        if (currentShapeType === 'circle') {
          setNewShape({
            id,
            type: 'circle',
            x: stagePoint.x,
            y: stagePoint.y,
            radiusX: 0,
            radiusY: 0,
            stroke: interactionMode === 'motionDetection' ? 'blue' : 'red',
            strokeWidth: 4,
          });
        }
        if (currentShapeType === 'arrow') {
          setNewShape({
            id,
            type: 'arrow',
            points: [
              stagePoint.x,
              stagePoint.y,
              stagePoint.x,
              stagePoint.y,
            ] as [number, number, number, number],
            stroke: interactionMode === 'motionDetection' ? 'blue' : 'red',
            strokeWidth: 4,
          });
        }
      }
    };

    const handleMouseMove = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const currentPointerPos = stage.getRelativePointerPosition();
      if (!currentPointerPos) return;

      // Handle Panning
      if (interactionMode === 'pan' && isPanning && panStartPoint) {
        const dx = currentPointerPos.x - panStartPoint.x;
        const dy = currentPointerPos.y - panStartPoint.y;
        setOffset((prevOffset) => ({
          x: prevOffset.x + dx,
          y: prevOffset.y + dy,
        }));
        // Update pan start point for continuous panning
        setPanStartPoint(currentPointerPos);
        return; // Don't do other things while panning
      }

      // Handle Selection Zoom drawing
      if (interactionMode === 'selectionZoom' && isSelecting && selectionBox) {
        const rawWidth = currentPointerPos.x - selectionBox.x;
        const rawHeight = currentPointerPos.y - selectionBox.y;

        let finalWidth = rawWidth;
        let finalHeight = rawHeight;

        // Ensure container dimensions are valid for aspect ratio calculation
        if (containerWidth > 0 && containerHeight > 0) {
          const containerAR = containerWidth / containerHeight;

          // Calculate magnitudes
          const dx = Math.abs(rawWidth);
          const dy = Math.abs(rawHeight);

          // Determine which dimension dictates the size based on container aspect ratio
          if (dx / containerAR >= dy) {
            // Width is the limiting dimension relative to AR, calculate height based on width
            finalHeight = Math.sign(rawHeight || 1) * (dx / containerAR);
            finalWidth = rawWidth; // Keep original width
          } else {
            // Height is the limiting dimension relative to AR, calculate width based on height
            finalWidth = Math.sign(rawWidth || 1) * (dy * containerAR);
            finalHeight = rawHeight; // Keep original height
          }
        }
        // If container dimensions are invalid, finalWidth/Height remain rawWidth/Height

        setSelectionBox({
          ...selectionBox,
          width: finalWidth,
          height: finalHeight,
        });
        return; // Don't draw shapes while selecting
      }

      // Handle Shape Drawing (only if in 'draw' mode and drawing started)
      if (
        (interactionMode !== 'draw' && interactionMode !== 'motionDetection') ||
        !newShape ||
        drawStartX === null ||
        drawStartY === null
      )
        return;

      setNewShape((prev) => {
        if (!prev) return null;

        if (prev.type === 'rect') {
          return {
            id: prev.id,
            type: 'rect',
            x: prev.x,
            y: prev.y,
            width: currentPointerPos.x - prev.x,
            height: currentPointerPos.y - prev.y,
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          };
        }
        if (prev.type === 'circle') {
          // Calculate center and radius based on the two diagonal points
          const centerX = (drawStartX + currentPointerPos.x) / 2;
          const centerY = (drawStartY + currentPointerPos.y) / 2;
          const rX = Math.abs((currentPointerPos.x - drawStartX) / 2);
          const rY = Math.abs((currentPointerPos.y - drawStartY) / 2);

          return {
            id: prev.id,
            type: 'circle',
            x: centerX, // Update x to be the calculated center
            y: centerY, // Update y to be the calculated center
            radiusX: rX,
            radiusY: rY,
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          };
        }
        if (prev.type === 'arrow') {
          const [x0, y0] = prev.points;
          return {
            id: prev.id,
            type: 'arrow',
            points: [x0, y0, currentPointerPos.x, currentPointerPos.y] as [
              number,
              number,
              number,
              number,
            ],
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          };
        }
        return prev;
      });
    };

    const handleMouseUp = async () => {
      // Stop Panning
      if (interactionMode === 'pan' && isPanning) {
        setIsPanning(false);
        setPanStartPoint(null);
        return; // Panning finished, do nothing else
      }

      // Finalize Selection Zoom
      if (interactionMode === 'selectionZoom' && isSelecting && selectionBox) {
        setIsSelecting(false);

        // Normalize selection box (handle drawing in any direction)
        const normX =
          selectionBox.width < 0
            ? selectionBox.x + selectionBox.width
            : selectionBox.x;
        const normY =
          selectionBox.height < 0
            ? selectionBox.y + selectionBox.height
            : selectionBox.y;
        const normWidth = Math.abs(selectionBox.width);
        const normHeight = Math.abs(selectionBox.height);

        // Only zoom if the box has significant size
        if (normWidth > 5 && normHeight > 5) {
          // 1. Calculate the target scale factor relative to current scale
          const scaleX = containerWidth / normWidth;
          const scaleY = containerHeight / normHeight;
          const targetScaleFactor = Math.min(scaleX, scaleY);

          // 2. Calculate the final absolute scale, clamped
          let newScale = scale * targetScaleFactor;
          newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

          // 3. Calculate the actual zoom factor applied (relative to current scale)
          // Avoid division by zero if scale is somehow 0
          const zoomFactor = scale !== 0 ? newScale / scale : 1;

          // 4. Find the stage center of the selection
          const selCenterX_stage = normX + normWidth / 2;
          const selCenterY_stage = normY + normHeight / 2;

          // 5. Calculate the new offset to center the selection box in the stage
          const stageCenterX = containerWidth / 2;
          const stageCenterY = containerHeight / 2;

          // Formula: newOffset = stageCenter - (selectionStageCenter - currentOffset) * zoomFactor
          const newOffsetX =
            stageCenterX - (selCenterX_stage - offset.x) * zoomFactor;
          const newOffsetY =
            stageCenterY - (selCenterY_stage - offset.y) * zoomFactor;

          // 6. Apply the new zoom and pan
          setScale(newScale);
          setOffset({ x: newOffsetX, y: newOffsetY });
        }

        setSelectionBox(null); // Clear the selection box visual
        return; // Selection zoom finished, do nothing else
      }

      // Handle both draw and motion detection modes
      if (
        (interactionMode === 'draw' || interactionMode === 'motionDetection') &&
        newShape
      ) {
        const shape = newShape;
        let isValidShape = true;
        if (
          shape.type === 'rect' &&
          (Math.abs(shape.width) < 5 || Math.abs(shape.height) < 5)
        )
          isValidShape = false;
        if (shape.type === 'circle' && (shape.radiusX < 3 || shape.radiusY < 3))
          isValidShape = false;
        if (
          shape.type === 'arrow' &&
          Math.hypot(
            shape.points[2] - shape.points[0],
            shape.points[3] - shape.points[1]
          ) < 5
        )
          isValidShape = false;

        if (shape.type === 'rect') {
          // Normalize rectangle coordinates based on drag direction
          const x1 = shape.x;
          const y1 = shape.y;
          const x2 = shape.x + shape.width;
          const y2 = shape.y + shape.height;

          const minX = Math.min(x1, x2);
          const minY = Math.min(y1, y2);
          const maxX = Math.max(x1, x2);
          const maxY = Math.max(y1, y2);

          // Use the normalized stage coordinates
          const stageTopLeft = { x: minX, y: minY };
          const stageBottomRight = { x: maxX, y: maxY };

          // Convert the normalized stage corner points to the original video coordinate system
          const videoTopLeft =
            getOriginalVideoCoordsFromStagePoint(stageTopLeft);
          const videoBottomRight =
            getOriginalVideoCoordsFromStagePoint(stageBottomRight);

          if (!videoTopLeft || !videoBottomRight) {
            isValidShape = false;
          } else {
            // Calculate the width and height in the video coordinate system
            const videoWidth = videoBottomRight.x - videoTopLeft.x;
            const videoHeight = videoBottomRight.y - videoTopLeft.y;

            // Update the shape properties to store the top-left coordinates
            // and dimensions relative to the original video
            shape.x = videoTopLeft.x;
            shape.y = videoTopLeft.y;
            shape.width = videoWidth;
            shape.height = videoHeight;
          }
        }
        if (shape.type === 'circle') {
          // The 'shape' object currently holds stage coordinates with a top-left origin
          // We need to convert these to video coordinates with a center origin.

          const stageCenter = { x: shape.x, y: shape.y };
          const stageBottomRight = {
            x: shape.x + shape.radiusX,
            y: shape.y + shape.radiusY,
          };

          const videoCenter = getOriginalVideoCoordsFromStagePoint(stageCenter);
          const videoBottomRight =
            getOriginalVideoCoordsFromStagePoint(stageBottomRight);

          if (!videoCenter || !videoBottomRight) {
            isValidShape = false;
          } else {
            const videoRadiusX = Math.abs(videoBottomRight.x - videoCenter.x);
            const videoRadiusY = Math.abs(videoBottomRight.y - videoCenter.y);
            shape.x = videoCenter.x;
            shape.y = videoCenter.y;
            shape.radiusX = videoRadiusX;
            shape.radiusY = videoRadiusY;
          }
        }
        if (shape.type === 'arrow') {
          // Arrow positions are in the stage coordinates system.
          // Tranform positions to the video coordinates system.
          const stagePoint = { x: shape.points[0], y: shape.points[1] };
          const stagePoint2 = { x: shape.points[2], y: shape.points[3] };
          const videoPoint = getOriginalVideoCoordsFromStagePoint(stagePoint);
          const videoPoint2 = getOriginalVideoCoordsFromStagePoint(stagePoint2);
          if (!videoPoint || !videoPoint2) {
            isValidShape = false;
          } else {
            shape.points = [
              videoPoint.x,
              videoPoint.y,
              videoPoint2.x,
              videoPoint2.y,
            ];
          }
        }

        // Add shape to shapes array
        if (isValidShape && currentVideoId) {
          const frameNumber = getCurrentFrameNumber();

          // If in motion detection mode, don't add the shape to shapes array
          if (interactionMode === 'motionDetection' && shape.type === 'rect') {
            const rectShape = shape as RectShape;
            const videoTopLeft = getOriginalVideoCoordsFromStagePoint({
              x: rectShape.x,
              y: rectShape.y,
            });

            if (videoTopLeft && currentVideo) {
              const region = {
                x: videoTopLeft.x >= 0 ? videoTopLeft.x : 0,
                y: videoTopLeft.y >= 0 ? videoTopLeft.y : 0,
                w: rectShape.width,
                h: rectShape.height,
              };

              console.log('Motion Detection Region:', region);

              setNewShape(null);
              setDrawStartX(null);
              setDrawStartY(null);
              setInteractionMode('pan');
              setCurrentShapeType('none');

              try {
                const success = await startMotionDetection(
                  currentVideo.metadata.filename,
                  region
                );
                if (success) {
                  console.log('Motion detection run successfully');
                } else {
                  console.error('Failed to start motion detection');
                }
              } catch (error) {
                console.error('Error starting motion detection:', error);
              }
            }
          } else {
            // For non-motion detection shapes, add to shapes array as before
            const newShapes = [...shapes, shape];
            setShapes(newShapes);
            setAnnotationsForFrame(currentVideoId, frameNumber, newShapes);
          }
        }

        setNewShape(null);
        setDrawStartX(null);
        setDrawStartY(null);
      }
    };

    const handleMouseLeave = () => {
      if (isPanning) {
        setIsPanning(false);
        setPanStartPoint(null); // Also clear the pan start point
      }
      if (isSelecting) {
        setIsSelecting(false);
        setSelectionBox(null); // Cancel selection on leave
      }
      // If drawing was in progress, cancel it.
      if (newShape) {
        setNewShape(null);
        setDrawStartX(null);
        setDrawStartY(null);
      }
    };

    // --- Reset View Handler ---
    const handleResetView = () => {
      setScale(1);
      setOffset({ x: 0, y: 0 });
    };

    // --- Undo Handler ---
    const handleUndo = () => {
      if (!currentVideoId) return; // Need a video context

      const frameNumber = getCurrentFrameNumber();

      setShapes((prevShapes) => {
        if (prevShapes.length === 0) {
          return prevShapes; // Nothing to undo
        }
        // Calculate the new shapes array after removing the last one
        const newShapes = prevShapes.slice(0, -1);

        // Update the context state *inside* the setState callback
        // This ensures we use the updated shapes array
        setAnnotationsForFrame(currentVideoId, frameNumber, newShapes);

        // Return the new shapes array to update the local state
        return newShapes;
      });
    };

    // --- Clear All Handler ---
    const handleClearAll = () => {
      setShapes([]); // Set shapes to an empty array
      if (currentVideoId) {
        setAnnotationsForFrame(currentVideoId, getCurrentFrameNumber(), []);
      }
    };

    // --- Render ---
    return (
      <div
        ref={containerRef} // Ref for wheel events
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: 'black', // Background visible when video is smaller than container
        }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0', // Scale from top-left corner
            top: 0,
            left: 0,
            zIndex: 0,
            imageRendering: 'pixelated',
          }}
        />
        {/* Display the current frame as an <img> if frameData is present and toggle is active */}
        {!isPlaying &&
          showRawFrame &&
          currentFrame &&
          currentFrame.frameNumber === getCurrentFrameNumber() &&
          currentFrame.blobUrl && (
            <img
              src={currentFrame.blobUrl}
              alt="Current Frame"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: '0 0',
                pointerEvents: 'none',
                opacity: 1,
                zIndex: 1,
                imageRendering: 'pixelated',
              }}
            />
          )}

        {/* ---- Control Buttons Container ---- */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column', // Stack the two button groups vertically
            gap: 8, // Add some space between the groups
          }}
        >
          {/* --- View Controls (Always Visible) --- */}
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              size="icon"
              variant="outline"
              onClick={handleResetView}
              title="Reset View (Zoom/Pan)"
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              size="icon"
              variant={
                interactionMode === 'selectionZoom' ? 'secondary' : 'outline'
              }
              onClick={() => {
                setInteractionMode('selectionZoom');
                setCurrentShapeType('none');
              }}
              title="Select Mode"
            >
              <MousePointer2 size={16} />
            </Button>
            <Button
              size="icon"
              variant={interactionMode === 'pan' ? 'secondary' : 'outline'}
              onClick={() => setInteractionMode('pan')}
              title="Pan Mode"
            >
              <Hand size={16} />
            </Button>
          </div>

          {/* --- Annotation Controls (Only when Paused) --- */}
          {!isPlaying && (
            <div
              style={{
                display: 'flex',
                gap: 4,
              }}
            >
              {/* Draw Buttons */}
              <Button
                size="icon"
                variant={
                  interactionMode === 'draw' && currentShapeType === 'rect'
                    ? 'secondary'
                    : 'outline'
                }
                onClick={() => {
                  setInteractionMode('draw');
                  setCurrentShapeType('rect');
                }}
                title="Draw Rectangle"
              >
                <Square size={16} />
              </Button>
              <Button
                size="icon"
                variant={
                  interactionMode === 'draw' && currentShapeType === 'circle'
                    ? 'secondary'
                    : 'outline'
                }
                onClick={() => {
                  setInteractionMode('draw');
                  setCurrentShapeType('circle');
                }}
                title="Draw Circle"
              >
                <CircleIcon size={16} />
              </Button>
              <Button
                size="icon"
                variant={
                  interactionMode === 'draw' && currentShapeType === 'arrow'
                    ? 'secondary'
                    : 'outline'
                }
                onClick={() => {
                  setInteractionMode('draw');
                  setCurrentShapeType('arrow');
                }}
                title="Draw Arrow"
              >
                <ArrowUpRight size={16} />
              </Button>
              {/* Undo Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={handleUndo}
                disabled={shapes.length === 0} // Disable if no shapes exist
              >
                <Undo2 size={16} />
              </Button>
              {/* Clear All Button */}
              <Button
                size="icon"
                variant="outline"
                onClick={handleClearAll}
                disabled={shapes.length === 0} // Disable if no shapes exist
                className={shapes.length > 0 ? 'hover:bg-red-100' : ''} // Optional: Add red hover if active
              >
                <Trash2 size={16} />
              </Button>
            </div>
          )}
        </div>

        {/* ---- Top-Right Controls Container ---- */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            gap: 4,
          }}
        >
          <Button
            size="icon"
            variant={showRawFrame ? 'secondary' : 'outline'}
            onClick={() => setShowRawFrame(!showRawFrame)}
            title="Toggle Raw Frame Display"
          >
            <Fingerprint
              size={16}
              color={isShowingRawFrame ? 'green' : 'red'}
            />
          </Button>
        </div>

        {/* Konva Stage for annotations - stays fixed, NOT scaled/translated */}
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor:
              interactionMode === 'pan'
                ? isPanning
                  ? 'grabbing'
                  : 'grab'
                : interactionMode === 'selectionZoom'
                  ? 'crosshair' // Use crosshair for selection zoom
                  : 'default',
            zIndex: 2, // Ensure Stage is above raw frame image (zIndex: 1)
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <Layer
            ref={annotationLayerRef}
            style={{
              pointerEvents: interactionMode === 'pan' ? 'none' : 'auto',
              zIndex: 10,
            }}
          >
            {/* Render existing shapes */}
            <ExistingShapes
              shapes={shapes}
              selectedId={selectedId}
              currentShapeType={currentShapeType}
              getStagePointFromOriginalVideoCoords={
                getStagePointFromOriginalVideoCoords
              }
            />

            {/* Render new shape preview */}
            <NewShapePreview newShape={newShape} />

            {/* Render selection zoom rectangle */}
            <SelectionRectangle box={selectionBox} />
          </Layer>
        </Stage>
      </div>
    );
  }
);

VideoElement.displayName = 'VideoElement';

export default VideoElement;
