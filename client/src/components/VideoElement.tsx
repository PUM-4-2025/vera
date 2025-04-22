import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

import Konva from 'konva';
import {
  Stage,
  Layer,
  Circle,
  Rect,
  Arrow,
} from 'react-konva';

import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import {
  Circle as CircleIcon,
  ArrowUpRight,
  Square,
  Undo2,
  Trash2,
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
  selectedId,
  currentShapeType,
  getStagePointFromOriginalVideoCoords,
  scale,
}) => {
  return (
    <>
      {shapes.map(shape => {
        const commonProps = {
          key: shape.id,
          id: shape.id,
          stroke: shape.stroke,
          strokeWidth: shape.strokeWidth,
        };
        if (shape.type === 'rect') {
            const stagePoint = getStagePointFromOriginalVideoCoords({
            x: shape.x,
            y: shape.y,
          });
          if (!stagePoint) return null;
          return (
            <Rect
              {...commonProps}
              x={stagePoint.x}
              y={stagePoint.y}
              width={shape.width * scale}
              height={shape.height * scale}
            />
          )
        }
        if (shape.type === 'circle') {
          const stagePoint = getStagePointFromOriginalVideoCoords({
            x: shape.x,
            y: shape.y,
          });
          if (!stagePoint) return null;
          return (
            <Circle
              {...commonProps}
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
              {...commonProps}
              points={[stagePoint.x, stagePoint.y, stagePoint2.x, stagePoint2.y]}
              pointerLength={10}
              pointerWidth={10}
            />
          )
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

const NewShapePreview: React.FC<NewShapePreviewProps> = ({ newShape, getStagePointFromOriginalVideoCoords, scale }) => {
  if (!newShape) return null;

  if (newShape.type === 'rect') {
    const stagePoint = getStagePointFromOriginalVideoCoords({
      x: newShape.x,
      y: newShape.y,
    });
    if (!stagePoint) return null;
    return (
      <Rect
        x={stagePoint.x}
        y={stagePoint.y}
        width={newShape.width * scale}
        height={newShape.height * scale}
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
      <Arrow {...newShape} 
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
const MAX_ZOOM = 10; // Increased max zoom for video
const ZOOM_STEP = 0.1;

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
    const [currentShapeType, setCurrentShapeType] = useState<'rect' | 'circle' | 'arrow' | 'none'>('rect');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newShape, setNewShape] = useState<ShapeData | null>(null);
    const [drawStartX, setDrawStartX] = useState<number | null>(null); // Store initial X for drawing
    const [drawStartY, setDrawStartY] = useState<number | null>(null); // Store initial Y for drawing



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
    const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentShapeType === 'none') return;

      setSelectedId(null);

      const stagePoint = stageRef.current?.getRelativePointerPosition();
      if (!stagePoint) return;
      const videoCoords = getOriginalVideoCoordsFromStagePoint(stagePoint);
      if (!videoCoords) return;

      setDrawStartX(videoCoords.x);
      setDrawStartY(videoCoords.y);
      const id = uuidv4();

      if (currentShapeType === 'rect') {
        setNewShape({
          id,
          type: 'rect',
          x: videoCoords.x,
          y: videoCoords.y,
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
          points: [videoCoords.x, videoCoords.y, videoCoords.x, videoCoords.y] as [number, number, number, number],
          stroke: 'red',
          strokeWidth: 4,
        });
      }

    };

    const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only proceed if we have a shape and, if it's a circle, a starting point
      if (!newShape || (newShape.type === 'circle' && (drawStartX === null || drawStartY === null))) return;

      const stagePoint = stageRef.current?.getRelativePointerPosition();
      if (!stagePoint) return;
      const videoCoords = getOriginalVideoCoordsFromStagePoint(stagePoint);
      if (!videoCoords) return;

      setNewShape(prev => {
        if (!prev) return null;

        if (prev.type === 'rect') {
          return {
            id: prev.id,
            type: 'rect',
            x: prev.x,
            y: prev.y,
            width: videoCoords.x - prev.x,
            height: videoCoords.y - prev.y,
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          }
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
          }
        }
        if (prev.type === 'arrow') {
          const [x0, y0] = prev.points;
          return {
            id: prev.id,
            type: 'arrow',
            points: [x0, y0, videoCoords.x, videoCoords.y] as [number, number, number, number],
            stroke: prev.stroke,
            strokeWidth: prev.strokeWidth,
          }
        }
        return prev;
      });
    };

    const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
      const shape = newShape;
      if (shape) {
        setShapes(prev => [...prev, shape]);
      }
      setNewShape(null);
      setDrawStartX(null); // Reset drawing start point
      setDrawStartY(null); // Reset drawing start point
    };

    // --- Undo Handler ---
    const handleUndo = () => {
      setShapes(prevShapes => {
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

        {/* Annotation Tool Buttons - Only show when video is paused */}
        {!isPlaying && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              zIndex: 10,
              display: 'flex',
              gap: 4,
              // flexDirection: 'column' // Keep horizontal for now, or adjust as needed
            }}
          >
            <Button
              size="icon"
              variant={currentShapeType === 'rect' ? 'secondary' : 'outline'}
              onClick={() => setCurrentShapeType('rect')}
            >
              <Square size={16} />
            </Button>
            <Button
              size="icon"
              variant={currentShapeType === 'circle' ? 'secondary' : 'outline'}
              onClick={() => setCurrentShapeType('circle')}
            >
              <CircleIcon size={16} />
            </Button>
            <Button
              size="icon"
              variant={currentShapeType === 'arrow' ? 'secondary' : 'outline'}
              onClick={() => setCurrentShapeType('arrow')}
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
              className={shapes.length > 0 ? "hover:bg-red-100" : ""} // Optional: Add red hover if active
            >
              <Trash2 size={16} />
            </Button>
          </div>
        )}
        {/* Konva Stage for annotations - stays fixed, NOT scaled/translated */}
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer ref={annotationLayerRef} style={{ pointerEvents: 'auto' }}>
            {/* Render existing shapes */}
            <ExistingShapes
              shapes={shapes}
              selectedId={selectedId}
              currentShapeType={currentShapeType}
              getStagePointFromOriginalVideoCoords={getStagePointFromOriginalVideoCoords}
              scale={scale}
            />

            {/* Render new shape preview */}
            <NewShapePreview
              newShape={newShape}
              getStagePointFromOriginalVideoCoords={getStagePointFromOriginalVideoCoords}
              scale={scale}
            />
            
          </Layer>
        </Stage>
      </div>
    );
  }
);

VideoElement.displayName = 'VideoElement';

export default VideoElement;
