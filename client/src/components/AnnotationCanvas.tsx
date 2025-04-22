import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Circle, Arrow } from 'react-konva';
import Konva from 'konva';
import {
  RectangleVertical,
  Circle as CircleIcon,
  ArrowUpRight,
  ZoomIn,
  ZoomOut,
  Move,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { v4 as uuidv4 } from 'uuid';

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

interface AnnotationCanvasProps {
  isPlaying?: boolean;
  containerWidth?: number;
  containerHeight?: number;
  videoRef?: React.RefObject<HTMLVideoElement>;
  onAnnotationChange?: (shapes: ShapeData[]) => void;
}

const AnnotationCanvas: React.FC<AnnotationCanvasProps> = ({
  isPlaying = false,
  containerWidth = 0,
  containerHeight = 0,
  videoRef,
  onAnnotationChange,
}) => {
  // Annotation state
  const [shapes, setShapes] = useState<ShapeData[]>([]);
  const [currentShapeType, setCurrentShapeType] = useState<'rect' | 'circle' | 'arrow' | 'move'>('rect');
  const [newShape, setNewShape] = useState<ShapeData | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Find the video element for direct manipulation
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Find the video element from the DOM if not provided as a prop
  useEffect(() => {
    if (videoRef?.current) {
      setVideoElement(videoRef.current);
    } else {
      // Try to find the video element in the DOM
      const vidEl = document.querySelector('video');
      if (vidEl) {
        setVideoElement(vidEl);
      }
    }
  }, [videoRef]);

  // Sync video position with Konva stage
  useEffect(() => {
    if (!videoElement) return;
    
    // For Konva, we need to invert the transformation direction
    // If Konva stage moves right, the video needs to move left
    const inverseX = -stagePosition.x / stageScale;
    const inverseY = -stagePosition.y / stageScale;
    
    // Apply transform to video
    videoElement.style.transform = `scale(${stageScale}) translate(${inverseX}px, ${inverseY}px)`;
    videoElement.style.transformOrigin = 'center center';
  }, [stagePosition, stageScale, videoElement]);

  // Effect to notify parent component of annotation changes
  useEffect(() => {
    onAnnotationChange?.(shapes);
  }, [shapes, onAnnotationChange]);

  // Handle stage zoom with mouse wheel
  const handleStageWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const scaleBy = 1.05;
    const oldScale = stageScale;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.5, Math.min(10, newScale));
    
    setStageScale(clampedScale);
    
    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    setStagePosition(newPos);
  };

  // Handle drawing shapes
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPlaying || currentShapeType === 'move') return;
    
    // Deselect any selected shape
    setSelectedId(null);
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Adjust for stage scale and position to get coordinates relative to video
    const x = (pointer.x - stagePosition.x) / stageScale;
    const y = (pointer.y - stagePosition.y) / stageScale;
    
    const id = uuidv4();
    
    if (currentShapeType === 'rect') {
      setNewShape({
        id,
        type: 'rect',
        x,
        y,
        width: 0,
        height: 0,
        stroke: 'red',
        strokeWidth: 2,
      });
    } else if (currentShapeType === 'circle') {
      setNewShape({
        id,
        type: 'circle',
        x,
        y,
        radius: 0,
        stroke: 'green',
        strokeWidth: 2,
      });
    } else if (currentShapeType === 'arrow') {
      setNewShape({
        id,
        type: 'arrow',
        points: [x, y, x, y] as [number, number, number, number],
        stroke: 'blue',
        strokeWidth: 2,
      });
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Update temporary newShape dimensions or points
    if (!newShape) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // Adjust for stage scale and position
    const x = (pointer.x - stagePosition.x) / stageScale;
    const y = (pointer.y - stagePosition.y) / stageScale;
    
    setNewShape(prev => {
      if (!prev) return null;
      
      // Rectangle: update width and height
      if (prev.type === 'rect') {
        return {
          id: prev.id,
          type: 'rect',
          x: prev.x,
          y: prev.y,
          width: x - prev.x,
          height: y - prev.y,
          stroke: prev.stroke,
          strokeWidth: prev.strokeWidth,
        };
      }
      
      // Circle: update radius
      if (prev.type === 'circle') {
        const radius = Math.hypot(x - prev.x, y - prev.y);
        return {
          id: prev.id,
          type: 'circle',
          x: prev.x,
          y: prev.y,
          radius,
          stroke: prev.stroke,
          strokeWidth: prev.strokeWidth,
        };
      }
      
      // Arrow: update end point, keep start point
      if (prev.type === 'arrow') {
        const [x0, y0] = prev.points;
        return {
          id: prev.id,
          type: 'arrow',
          points: [x0, y0, x, y] as [number, number, number, number],
          stroke: prev.stroke,
          strokeWidth: prev.strokeWidth,
        };
      }
      
      return prev;
    });
  };

  const handleMouseUp = () => {
    // Finalize shape creation
    const shape = newShape;
    if (shape) {
      // Only add shapes with some size (exclude tiny clicks)
      const hasSize = 
        (shape.type === 'rect' && (Math.abs(shape.width) > 5 || Math.abs(shape.height) > 5)) ||
        (shape.type === 'circle' && shape.radius > 5) ||
        (shape.type === 'arrow' && 
          Math.hypot(
            shape.points[2] - shape.points[0],
            shape.points[3] - shape.points[1]
          ) > 5
        );
      
      if (hasSize) {
        setShapes(prev => [...prev, shape]);
      }
      setNewShape(null);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedId) {
      setShapes(shapes.filter(shape => shape.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleShapeClick = (id: string) => {
    if (currentShapeType === 'move') {
      setSelectedId(id === selectedId ? null : id);
    }
  };

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    const id = e.target.id();
    setSelectedId(id);
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>, shape: ShapeData) => {
    // Update shape with new position
    const newShapes = shapes.map(s => {
      if (s.id !== shape.id) return s;
      
      // For arrows, we need to update all points
      if (s.type === 'arrow' && shape.type === 'arrow') {
        const dx = e.target.x();
        const dy = e.target.y();
        
        // Reset Konva node position since we're manually adjusting points
        e.target.position({ x: 0, y: 0 });
        
        return {
          ...s, 
          points: [
            shape.points[0] + dx, 
            shape.points[1] + dy, 
            shape.points[2] + dx, 
            shape.points[3] + dy
          ] as [number, number, number, number]
        };
      }
      
      // For rect and circle, update x and y
      return {
        ...s,
        x: e.target.x(),
        y: e.target.y()
      };
    });
    
    setShapes(newShapes);
  };

  return (
    <>
      {/* Annotation controls */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 10, 
          display: 'flex', 
          gap: 4,
          flexDirection: 'column'
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          <Button 
            size="icon" 
            variant={currentShapeType === 'rect' ? 'secondary' : 'outline'} 
            onClick={() => setCurrentShapeType('rect')}
            disabled={isPlaying}
          >
            <RectangleVertical size={16} />
          </Button>
          <Button 
            size="icon" 
            variant={currentShapeType === 'circle' ? 'secondary' : 'outline'} 
            onClick={() => setCurrentShapeType('circle')}
            disabled={isPlaying}
          >
            <CircleIcon size={16} />
          </Button>
          <Button 
            size="icon" 
            variant={currentShapeType === 'arrow' ? 'secondary' : 'outline'} 
            onClick={() => setCurrentShapeType('arrow')}
            disabled={isPlaying}
          >
            <ArrowUpRight size={16} />
          </Button>
          <Button 
            size="icon" 
            variant={currentShapeType === 'move' ? 'secondary' : 'outline'} 
            onClick={() => setCurrentShapeType('move')}
            disabled={isPlaying}
          >
            <Move size={16} />
          </Button>
        </div>
        
        <div style={{ display: 'flex', gap: 4 }}>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={() => {
              const newScale = Math.min(10, stageScale + 0.25);
              setStageScale(newScale);
            }}
          >
            <ZoomIn size={16} />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={() => {
              const newScale = Math.max(0.5, stageScale - 0.25);
              setStageScale(newScale);
            }}
          >
            <ZoomOut size={16} />
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={() => {
              setStageScale(1);
              setStagePosition({ x: 0, y: 0 });
            }}
          >
            <span style={{ fontSize: '10px' }}>RESET</span>
          </Button>
          <Button 
            size="icon" 
            variant="outline" 
            onClick={handleDeleteSelected}
            disabled={!selectedId}
            className={selectedId ? "bg-red-100" : ""}
          >
            <Trash2 size={16} />
          </Button>
        </div>
        
        <div style={{
          marginTop: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          color: 'white',
          borderRadius: '3px',
          textAlign: 'center'
        }}>
          Zoom: {Math.round(stageScale * 100)}%
        </div>
      </div>
      
      {/* Konva Stage for annotations */}
      <Stage
        width={containerWidth}
        height={containerHeight}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={currentShapeType === 'move'}
        onDragMove={(e) => {
          if (currentShapeType === 'move') {
            setStagePosition(e.target.position());
          }
        }}
        onWheel={handleStageWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          zIndex: 5, 
          pointerEvents: isPlaying ? 'none' : 'all',
          cursor: currentShapeType === 'move' ? 'move' : 'crosshair'
        }}
      >
        <Layer>
          {/* Existing shapes */}
          {shapes.map((shape) => {
            const isSelected = shape.id === selectedId;
            const commonProps = {
              key: shape.id,
              id: shape.id,
              stroke: shape.stroke,
              strokeWidth: shape.strokeWidth,
              draggable: currentShapeType === 'move',
              onClick: () => handleShapeClick(shape.id),
              onDragStart: handleDragStart,
              onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(e, shape),
              shadowColor: isSelected ? 'black' : undefined,
              shadowBlur: isSelected ? 10 : undefined,
              shadowOpacity: isSelected ? 0.6 : undefined,
            };
            
            if (shape.type === 'rect') {
              return (
                <Rect
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                />
              );
            }
            
            if (shape.type === 'circle') {
              return (
                <Circle
                  {...commonProps}
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius}
                />
              );
            }
            
            if (shape.type === 'arrow') {
              return (
                <Arrow
                  {...commonProps}
                  points={shape.points}
                  pointerLength={10}
                  pointerWidth={10}
                />
              );
            }
            
            return null;
          })}
          
          {/* Currently drawing shape */}
          {newShape && (
            newShape.type === 'rect' ? (
              <Rect
                x={newShape.x}
                y={newShape.y}
                width={newShape.width}
                height={newShape.height}
                stroke={newShape.stroke}
                strokeWidth={newShape.strokeWidth}
                dash={[5, 5]}
              />
            ) : newShape.type === 'circle' ? (
              <Circle
                x={newShape.x}
                y={newShape.y}
                radius={newShape.radius}
                stroke={newShape.stroke}
                strokeWidth={newShape.strokeWidth}
                dash={[5, 5]}
              />
            ) : (
              <Arrow
                points={newShape.points}
                stroke={newShape.stroke}
                strokeWidth={newShape.strokeWidth}
                pointerLength={10}
                pointerWidth={10}
                dash={[5, 5]}
              />
            )
          )}
        </Layer>
      </Stage>
    </>
  );
};

export default AnnotationCanvas;
