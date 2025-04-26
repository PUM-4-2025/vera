import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

import Konva from 'konva';
import { Stage, Layer, Circle, Rect, Arrow } from 'react-konva';

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
} from 'lucide-react';

// Discriminated union for different shape types
type RectShape = {
  id: string;
  type: 'rect';
  // Top left corner of the rectangle
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
};

type CircleShape = {
  id: string;
  type: 'circle';
  // Center of the circle
  x: number;
  y: number;
  radius: number;
  stroke: string;
  strokeWidth: number;
};

type ArrowShape = {
  id: string;
  type: 'arrow';
  // Start point of the arrow
  points: [number, number, number, number];
  stroke: string;
  strokeWidth: number;
};

type ShapeData = RectShape | CircleShape | ArrowShape;

// Define the interface for the functions/properties we want to expose
export interface VideoElementRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  setFrameRate: (rate: number) => void;
}

interface VideoElementProps {
  src: string;
  containerWidth: number;
  containerHeight: number;
  videoWidth: number;
  videoHeight: number;
  initialFrameRate: number;
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
  scale: number;
}

const ExistingShapes: React.FC<ExistingShapesProps> = ({
  shapes,
  getStagePointFromOriginalVideoCoords,
  scale,
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
          const centerCoordinate = getStagePointFromOriginalVideoCoords({
            x: shape.x,
            y: shape.y,
          });
          if (!centerCoordinate) return null;
          return (
            <Rect
              key={key} // Pass key directly
              {...otherCommonProps} // Spread the rest
              x={centerCoordinate.x - shape.width / 2}
              y={centerCoordinate.y - shape.height / 2}
              width={shape.width}
              height={shape.height}
            />
          );
        }
        if (shape.type === 'circle') {
          const stagePoint = getStagePointFromOriginalVideoCoords({
            x: shape.x,
            y: shape.y,
          });
          if (!stagePoint) return null;
          return (
            <Circle
              key={key} // Pass key directly
              {...otherCommonProps} // Spread the rest
              x={stagePoint.x}
              y={stagePoint.y}
              radius={shape.radius * scale}
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
  getStagePointFromOriginalVideoCoords: (
    videoCoords: { x: number; y: number } | null | undefined
  ) => { x: number; y: number } | null;
  scale: number;
}

const NewShapePreview: React.FC<NewShapePreviewProps> = ({
  newShape,
  getStagePointFromOriginalVideoCoords,
  scale,
}) => {
  if (!newShape) return null;

  if (newShape.type === 'rect') {
    const stagePoint = getStagePointFromOriginalVideoCoords({
      x: newShape.x,
      y: newShape.y,
    });
    if (!stagePoint) return null;
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
    const stagePoint = getStagePointFromOriginalVideoCoords({
      x: newShape.x,
      y: newShape.y,
    });
    if (!stagePoint) return null;
    return (
      <Circle
        x={stagePoint.x}
        y={stagePoint.y}
        radius={newShape.radius * scale}
        stroke={newShape.stroke}
        strokeWidth={newShape.strokeWidth}
        dash={[5, 5]}
      />
    );
  }
  if (newShape.type === 'arrow') {
    const stagePoint = getStagePointFromOriginalVideoCoords({
      x: newShape.points[0],
      y: newShape.points[1],
    });

    const stagePoint2 = getStagePointFromOriginalVideoCoords({
      x: newShape.points[2],
      y: newShape.points[3],
    });
    if (!stagePoint || !stagePoint2) return null;
    return (
      <Arrow
        {...newShape}
        points={[stagePoint.x, stagePoint.y, stagePoint2.x, stagePoint2.y]}
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
type InteractionMode = 'draw' | 'pan' | 'selectionZoom';

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
  (
    {
      src,
      containerWidth,
      containerHeight,
      videoWidth,
      videoHeight,
      initialFrameRate,
      onTimeUpdate,
    },
    ref
  ) => {
    // --- Refs ---
    const videoRef = useRef<HTMLVideoElement>(null); // Ref for the HTML video element
    const annotationLayerRef = useRef<Konva.Layer>(null); // Ref for Konva annotation layer
    const stageRef = useRef<Konva.Stage>(null); // Ref for Konva stage
    const containerRef = useRef<HTMLDivElement>(null); // Ref for the main container div

    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false); // Video playback state
    const [frameRate, setFrameRate] = useState<number>(initialFrameRate); // Video frame rate
    const [scale, setScale] = useState(1); // Video scale
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // Video translation offset

    // --- Annotation State ---
    const [shapes, setShapes] = useState<ShapeData[]>([]);
    const [currentShapeType, setCurrentShapeType] = useState<
      'rect' | 'circle' | 'arrow' | 'none'
    >('rect');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newShape, setNewShape] = useState<ShapeData | null>(null);
    const [drawStartX, setDrawStartX] = useState<number | null>(null); // Store initial X for drawing
    const [drawStartY, setDrawStartY] = useState<number | null>(null); // Store initial Y for drawing
    const [interactionMode, setInteractionMode] =
      useState<InteractionMode>('draw'); // New state for interaction mode
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

    // Effect to reset state when video source changes
    useEffect(() => {
      setShapes([]); // Clear existing shapes
      setScale(1); // Reset zoom
      setOffset({ x: 0, y: 0 }); // Reset pan
    }, [src]); // Dependency array includes src

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

    // Effect to update internal frame rate if prop changes
    useEffect(() => {
      setFrameRate(initialFrameRate);
    }, [initialFrameRate]);

    // Effect to handle video events (play, pause, timeupdate) and cleanup
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleTimeUpdateCallback = () => {
        onTimeUpdate(video.currentTime);
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
    }, [onTimeUpdate]);

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

    // --- Imperative Handle ---
    // Expose control methods (play, pause, seek, etc.) to parent components
    useImperativeHandle(ref, () => ({
      play: () => videoRef.current?.play(),
      pause: () => videoRef.current?.pause(),
      seek: (time: number) => {
        if (videoRef.current) videoRef.current.currentTime = time;
      },
      nextFrame: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          const frameDuration = 1 / frameRate;
          const newTime = Math.min(
            videoRef.current.duration,
            videoRef.current.currentTime + frameDuration
          );
          videoRef.current.currentTime = newTime;
        }
      },
      prevFrame: () => {
        if (videoRef.current) {
          videoRef.current.pause();
          const frameDuration = 1 / frameRate;
          const newTime = Math.max(
            0,
            videoRef.current.currentTime - frameDuration
          );
          videoRef.current.currentTime = newTime;
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      isPlaying: () => isPlaying,
      setFrameRate: (rate: number) => setFrameRate(rate),
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
        return; // Don't proceed with other interactions if panning
      }

      if (interactionMode === 'selectionZoom') {
        setSelectedId(null); // Clear shape selection if any
        setIsSelecting(true);
        setSelectionBox({
          x: stagePoint.x,
          y: stagePoint.y,
          width: 0,
          height: 0,
        });
        return; // Don't proceed with shape drawing if selecting
      }

      // Only draw if in 'draw' mode and a shape type is selected
      if (interactionMode !== 'draw' || currentShapeType === 'none') return;

      setSelectedId(null); // Deselect any selected shape when starting a new one

      const videoCoords = getOriginalVideoCoordsFromStagePoint(stagePoint);
      if (!videoCoords) return;

      setDrawStartX(videoCoords.x);
      setDrawStartY(videoCoords.y);
      const id = uuidv4();

      if (currentShapeType === 'rect') {
        setNewShape({
          id,
          type: 'rect',
          x: stagePoint.x,
          y: stagePoint.y,
          width: 0,
          height: 0,
          stroke: 'red',
          strokeWidth: 4,
        });
      }
      if (currentShapeType === 'circle') {
        setNewShape({
          id,
          type: 'circle',
          x: videoCoords.x,
          y: videoCoords.y,
          radius: 0,
          stroke: 'red',
          strokeWidth: 4,
        });
      }
      if (currentShapeType === 'arrow') {
        setNewShape({
          id,
          type: 'arrow',
          points: [
            videoCoords.x,
            videoCoords.y,
            videoCoords.x,
            videoCoords.y,
          ] as [number, number, number, number],
          stroke: 'red',
          strokeWidth: 4,
        });
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
        interactionMode !== 'draw' ||
        !newShape ||
        drawStartX === null ||
        drawStartY === null
      )
        return;

      const videoCoords =
        getOriginalVideoCoordsFromStagePoint(currentPointerPos);
      if (!videoCoords) return;

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
          const x1 = drawStartX as number; // Use fixed start X
          const y1 = drawStartY as number; // Use fixed start Y
          const x2 = videoCoords.x;
          const y2 = videoCoords.y;

          const centerX = (x1 + x2) / 2;
          const centerY = (y1 + y2) / 2;
          const radius = Math.hypot(x2 - x1, y2 - y1) / 2;

          return {
            id: prev.id,
            type: 'circle',
            x: centerX, // Update x to be the calculated center
            y: centerY, // Update y to be the calculated center
            radius,
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          };
        }
        if (prev.type === 'arrow') {
          const [x0, y0] = prev.points;
          return {
            id: prev.id,
            type: 'arrow',
            points: [x0, y0, videoCoords.x, videoCoords.y] as [
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

    const handleMouseUp = () => {
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

      // Finalize Shape Drawing (only if in 'draw' mode)
      if (interactionMode === 'draw' && newShape) {
        // Ensure shape has some minimal size? Optional.
        const shape = newShape;
        // Example minimal size check (adjust as needed)
        let isValidShape = true;
        if (
          shape.type === 'rect' &&
          (Math.abs(shape.width) < 5 || Math.abs(shape.height) < 5)
        )
          isValidShape = false;
        if (shape.type === 'circle' && shape.radius < 3) isValidShape = false;
        if (
          shape.type === 'arrow' &&
          Math.hypot(
            shape.points[2] - shape.points[0],
            shape.points[3] - shape.points[1]
          ) < 5
        )
          isValidShape = false;

        if (shape.type === 'rect') {
          // The 'shape' object currently holds stage coordinates with a top-left origin
          // We need to convert these to video coordinates with a center origin.

          const stageTopLeft = { x: shape.x, y: shape.y };
          const stageBottomRight = {
            x: shape.x + shape.width,
            y: shape.y + shape.height,
          };

          // Convert the stage corner points to the original video coordinate system
          const videoTopLeft =
            getOriginalVideoCoordsFromStagePoint(stageTopLeft);
          const videoBottomRight =
            getOriginalVideoCoordsFromStagePoint(stageBottomRight);

          if (!videoTopLeft || !videoBottomRight) {
            // If conversion fails, the shape is invalid
            console.error(
              'Failed to convert rectangle corners to video coordinates.'
            );
            isValidShape = false;
          } else {
            // Calculate the width and height in the video coordinate system
            const videoWidth = Math.abs(videoBottomRight.x - videoTopLeft.x);
            const videoHeight = Math.abs(videoBottomRight.y - videoTopLeft.y);

            // Re-validate the shape size based on video dimensions
            if (videoWidth < 5 || videoHeight < 5) {
              isValidShape = false;
            }

            // If the shape is still valid after size check
            if (isValidShape) {
              // Calculate the center point in the video coordinate system
              const videoCenterX = (videoTopLeft.x + videoBottomRight.x) / 2;
              const videoCenterY = (videoTopLeft.y + videoBottomRight.y) / 2;

              // Update the shape properties to store the center coordinates
              // and dimensions relative to the original video
              shape.x = videoCenterX;
              shape.y = videoCenterY;
            }
          }
        }

        // Add shape to shapes array
        if (isValidShape) {
          setShapes((prev) => [...prev, shape]);
        }

        setNewShape(null);
        setDrawStartX(null); // Reset drawing start point
        setDrawStartY(null); // Reset drawing start point
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
      setShapes((prevShapes) => {
        if (prevShapes.length === 0) {
          return prevShapes; // Nothing to undo
        }
        return prevShapes.slice(0, -1); // Return array without the last element
      });
    };

    // --- Clear All Handler ---
    const handleClearAll = () => {
      setShapes([]); // Set shapes to an empty array
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
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            position: 'absolute',
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0', // Scale from top-left corner
            top: 0,
            left: 0,
          }}
        />

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

        {/* Konva Stage for annotations - stays fixed, NOT scaled/translated */}
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            // Update cursor based on mode
            cursor:
              interactionMode === 'pan'
                ? isPanning
                  ? 'grabbing'
                  : 'grab'
                : interactionMode === 'selectionZoom'
                  ? 'crosshair' // Use crosshair for selection zoom
                  : 'default',
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
              scale={scale}
            />

            {/* Render new shape preview */}
            <NewShapePreview
              newShape={newShape}
              getStagePointFromOriginalVideoCoords={
                getStagePointFromOriginalVideoCoords
              }
              scale={scale}
            />

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
