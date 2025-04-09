import React from 'react';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import cv from '@techstark/opencv-js';
import video from '../ungso.mp4';

const LINE_THICKNESS = 2;
const SELECTED_COLOR = [0, 255, 0, 255];
const DEFAULT_COLOR = [255, 0, 0, 255];
const TEMP_DRAW_COLOR = [0, 0, 255, 255];
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

interface Point {
  x: number;
  y: number;
}

interface Shape {
  id: string;
  type: 'circle' | 'arrow';
  startPoint: Point;
  endPoint?: Point; // for arrows
  radius?: number; // for circles
  selected: boolean;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function isPointNearShape(
  point: Point,
  shape: Shape,
  scale: number,
  tolerance: number = 5
): boolean {
  if (shape.type === 'circle' && shape.radius) {
    console.log(point.x);
    const distance = Math.sqrt(
      Math.pow(point.x - shape.startPoint.x, 2) +
        Math.pow(point.y - shape.startPoint.y, 2)
    );
    return Math.abs(distance - shape.radius / scale) < tolerance;
  } else if (shape.type === 'arrow' && shape.endPoint) {
    const lineLength = Math.sqrt(
      Math.pow(shape.endPoint.x - shape.startPoint.x, 2) +
        Math.pow(shape.endPoint.y - shape.startPoint.y, 2)
    );

    // Vector projection AI:ad
    const t =
      ((point.x - shape.startPoint.x) *
        (shape.endPoint.x - shape.startPoint.x) +
        (point.y - shape.startPoint.y) *
          (shape.endPoint.y - shape.startPoint.y)) /
      (lineLength * lineLength);

    const tClamped = Math.max(0, Math.min(1, t));

    const nearestX =
      shape.startPoint.x + tClamped * (shape.endPoint.x - shape.startPoint.x);
    const nearestY =
      shape.startPoint.y + tClamped * (shape.endPoint.y - shape.startPoint.y);

    const distance = Math.sqrt(
      Math.pow(point.x - nearestX, 2) + Math.pow(point.y - nearestY, 2)
    );

    return distance < tolerance;
  }
  return false;
}

function DrawPage() {
  const [drawMode, setDrawMode] = useState<'select' | 'circle' | 'arrow'>(
    'select'
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [drawing, setDrawing] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [_, setVideoLoaded] = useState(false);
  const [cvLoaded, setCvLoaded] = useState(false);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    // fult sätt att kolla om opencv har laddat, måste snyggas till, finns säkert en bättre lösning. se onRuntimeInitialized
    const checkCvReady = () => {
      if (cv && cv.Mat && typeof cv.Mat === 'function') {
        setCvLoaded(true);

        return true;
      }
      return false;
    };

    if (!checkCvReady()) {
      const interval = setInterval(() => {
        if (checkCvReady()) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, []);

  const getMousePosition = useCallback(
    (canvas: HTMLCanvasElement, event: React.MouseEvent): Point => {
      const rect = canvas.getBoundingClientRect();

      // kan föränklas ganska mycket, förut var inte viewport och canvas lika, fast jag varken orkar eller hinner fixa det nu
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      const viewportCenterX = rect.width / 2;
      const viewportCenterY = rect.height / 2;
      const vectorX = mouseX - viewportCenterX;
      const vectorY = mouseY - viewportCenterY;
      const scaledVectorX = vectorX / scale;
      const scaledVectorY = vectorY / scale;
      const unscaledCenterX = canvas.width / 2;
      const unscaledCenterY = canvas.height / 2;

      return {
        x: unscaledCenterX + scaledVectorX + offset.x,
        y: unscaledCenterY + scaledVectorY + offset.y,
      };
    },
    [scale, offset]
  );

  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !cvLoaded) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    const mat = new cv.Mat(
      canvas.height,
      canvas.width,
      cv.CV_8UC4,
      [0, 0, 0, 0]
    );

    shapes.forEach((shape) => {
      const centerX = canvas.offsetWidth / 2;
      const centerY = canvas.offsetHeight / 2;
      const vectorX = shape.startPoint.x - centerX;
      const vectorY = shape.startPoint.y - centerY;
      const scaledVectorX = vectorX * scale;
      const scaledVectorY = vectorY * scale;
      const finalX = centerX + scaledVectorX - offset.x * scale;
      const finalY = centerY + scaledVectorY - offset.y * scale;

      const startPointCV = new cv.Point(finalX, finalY);

      const color = shape.selected ? SELECTED_COLOR : DEFAULT_COLOR;

      if (shape.type === 'circle' && shape.radius) {
        cv.circle(mat, startPointCV, shape.radius, color, LINE_THICKNESS);
      } else if (shape.type === 'arrow' && shape.endPoint) {
        const vectorEndX = shape.endPoint.x - centerX;
        const vectorEndY = shape.endPoint.y - centerY;
        const scaledVectorEndX = vectorEndX * scale;
        const scaledVectorEndY = vectorEndY * scale;
        const finalEndX = centerX + scaledVectorEndX - offset.x * scale;
        const finalEndY = centerY + scaledVectorEndY - offset.y * scale;

        const startPointCV = new cv.Point(finalX, finalY);
        const endPointCV = new cv.Point(finalEndX, finalEndY);
        cv.line(
          mat,
          startPointCV,
          endPointCV,
          color,
          LINE_THICKNESS,
          cv.LINE_AA
        );
      }
    });

    if (drawing && startPoint && currentPoint) {
      const deltaX = (startPoint.x - currentPoint.x) * scale;
      const deltaY = (startPoint.y - currentPoint.y) * scale;
      const centerX = canvasRef.current.offsetWidth / 2;
      const centerY = canvasRef.current.offsetHeight / 2;
      const vectorX = startPoint.x - centerX;
      const vectorY = startPoint.y - centerY;
      const scaledVectorX = vectorX * scale;
      const scaledVectorY = vectorY * scale;
      const finalX = centerX + scaledVectorX - offset.x * scale;
      const finalY = centerY + scaledVectorY - offset.y * scale;

      if (drawMode === 'circle') {
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const startPointCV = new cv.Point(finalX, finalY);

        cv.circle(mat, startPointCV, radius, TEMP_DRAW_COLOR, LINE_THICKNESS);
      } else if (drawMode === 'arrow') {
        const vectorEndX = currentPoint.x - centerX;
        const vectorEndY = currentPoint.y - centerY;
        const scaledVectorEndX = vectorEndX * scale;
        const scaledVectorEndY = vectorEndY * scale;
        const finalEndX = centerX + scaledVectorEndX - offset.x * scale;
        const finalEndY = centerY + scaledVectorEndY - offset.y * scale;

        const startPointCV = new cv.Point(finalX, finalY);
        const endPointCV = new cv.Point(finalEndX, finalEndY);

        cv.line(
          mat,
          startPointCV,
          endPointCV,
          TEMP_DRAW_COLOR,
          LINE_THICKNESS,
          cv.LINE_AA
        );
      }
    }

    cv.imshow(canvas, mat);
    mat.delete();
  }, [
    shapes,
    drawing,
    startPoint,
    currentPoint,
    drawMode,
    scale,
    offset,
    cvLoaded,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!video || !canvas || !container) return;

    const handleVideoLoaded = () => {
      setVideoLoaded(true);
    };

    video.addEventListener('loadedmetadata', handleVideoLoaded);

    video.addEventListener('canplaythrough', () => {
      video.play().catch((err) => console.error('noob', err));
    });

    return () => {
      video.removeEventListener('loadedmetadata', handleVideoLoaded);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const transform = `translate(${-offset.x * scale}px, ${-offset.y * scale}px) scale(${scale})`;
    video.style.transform = transform;
  }, [scale, offset]);

  useEffect(() => {
    redrawCanvas();
  }, [shapes, drawing, startPoint, currentPoint, drawMode, scale, offset]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();

      const delta = -Math.sign(e.deltaY) * ZOOM_STEP;
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale + delta));

      const centerX = (container.offsetWidth * scale) / 2;
      const centerY = (container.offsetHeight * scale) / 2;
      const contentCenterX = (centerX + offset.x) / scale;
      const contentCenterY = (centerY + offset.y) / scale;
      const newContentCenterX = (contentCenterX - centerX / scale) * newScale;
      const newContentCenterY = (contentCenterY - centerY / scale) * newScale;

      setOffset({ x: newContentCenterX, y: newContentCenterY });
      setScale(newScale);
    };

    container.addEventListener('wheel', handleWheelEvent, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheelEvent);
    };
  }, [scale, offset]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' && selectedShapeId) {
        setShapes((prevShapes) =>
          prevShapes.filter((shape) => shape.id !== selectedShapeId)
        );
        setSelectedShapeId(null);
      } else if (event.key === 'z' && event.ctrlKey) {
        handleUndo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedShapeId]);

  const startPan = useCallback((event: React.MouseEvent) => {
    if (event.button === 0 && event.altKey) {
      setIsPanning(true);
      event.preventDefault();
    }
  }, []);

  const pan = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanning) {
        setOffset({
          x: offset.x - e.movementX / scale,
          y: offset.y - e.movementY / scale,
        });
      }
    },
    [isPanning, offset, scale]
  );

  const stopPan = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
  }, [isPanning]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleUndo = useCallback(() => {
    if (shapes.length > 0) {
      setShapes((prevShapes) => prevShapes.slice(0, -1));
    }
  }, [selectedShapeId, shapes.length]);

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || isPanning || event.altKey) return;

      const canvas = canvasRef.current;
      const mousePos = getMousePosition(canvas, event);

      if (drawMode === 'circle' || drawMode === 'arrow') {
        setDrawing(true);
        setStartPoint(mousePos);
        setCurrentPoint(mousePos);
        setSelectedShapeId(null);
        setShapes((prevShapes) =>
          prevShapes.map((shape) => ({ ...shape, selected: false }))
        ); // finns nog ett snyggare sätt att göra detta
      } else {
        setDrawing(false);

        let found = false;
        setShapes((prevShapes) => {
          return prevShapes.map((shape) => {
            if (isPointNearShape(mousePos, shape, scale)) {
              found = true;
              setSelectedShapeId(shape.id);
              return { ...shape, selected: true };
            }
            return { ...shape, selected: false };
          });
        });

        if (!found) {
          setSelectedShapeId(null);
        }
      }
    },
    [drawMode, getMousePosition, isPanning]
  );

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing || !canvasRef.current || !startPoint) return;

      const canvas = canvasRef.current;
      const mousePos = getMousePosition(canvas, event);
      setCurrentPoint(mousePos);
    },
    [drawing, startPoint, getMousePosition]
  );

  const handleMouseUp = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!drawing || !startPoint || !currentPoint) return;

      setDrawing(false);

      if (drawMode === 'circle') {
        const deltaX = (startPoint.x - currentPoint.x) * scale;
        const deltaY = (startPoint.y - currentPoint.y) * scale;
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (radius > 3) {
          setShapes((prevShapes) => [
            ...prevShapes,
            {
              id: generateId(),
              type: 'circle',
              startPoint: { ...startPoint },
              radius,
              selected: false,
            },
          ]);
        }
      } else if (drawMode === 'arrow') {
        const distance = Math.sqrt(
          Math.pow((currentPoint.x - startPoint.x) * scale, 2) +
            Math.pow((currentPoint.y - startPoint.y) * scale, 2)
        );

        if (distance > 3) {
          setShapes((prevShapes) => [
            ...prevShapes,
            {
              id: generateId(),
              type: 'arrow',
              startPoint: { ...startPoint },
              endPoint: { ...currentPoint },
              selected: false,
            },
          ]);
        }
      }

      setStartPoint(null);
      setCurrentPoint(null);
    },
    [drawing, startPoint, currentPoint, drawMode, scale]
  );

  const toggleVideo = useCallback(() => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => console.error('cringe', err));
    } else {
      videoRef.current.pause();
    }
  }, []);

  // Helper to create a styled button
  const createButton = useCallback(
    (text: string, onClick: () => void, isActive = false, isDanger = false) => {
      return (
        <button
          onClick={onClick}
          style={{
            padding: '8px 16px',
            border: `1px solid ${isDanger ? '#ff5555' : '#333'}`,
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: isActive ? '#000000' : '#111111',
            opacity: isActive ? 1 : 0.9,
            transition: 'all 0.2s ease',
          }}
        >
          {text}
        </button>
      );
    },
    []
  );

  return (
    <div>
      {/* Drawing Tools */}
      <div
        className="toolbar"
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '10px',
          width: '640px',
          margin: '0 auto 10px auto',
          padding: '10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {createButton(
          'Select',
          () => setDrawMode('select'),
          drawMode === 'select'
        )}
        {createButton(
          'Circle',
          () => setDrawMode('circle'),
          drawMode === 'circle'
        )}
        {createButton(
          'Arrow',
          () => setDrawMode('arrow'),
          drawMode === 'arrow'
        )}

        {/* Add spacer to push undo button to the right */}
        <div style={{ flexGrow: 1 }}></div>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={shapes.length === 0}
          style={{
            padding: '8px 16px',
            border: '1px solid #333',
            borderRadius: '4px',
            cursor: shapes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: shapes.length === 0 ? 0.5 : 1,
          }}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
      </div>

      {/* Video and Canvas Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '640px',
          height: '480px',
          border: '1px solid #333',
          margin: '0 auto',
          overflow: 'hidden',
          cursor: isPanning
            ? 'grabbing'
            : drawMode === 'select'
              ? 'default'
              : 'crosshair',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          borderRadius: '4px',
        }}
        onMouseDown={startPan}
        onMouseMove={pan}
        onMouseUp={stopPan}
        onMouseLeave={stopPan}
      >
        <video
          ref={videoRef}
          src={video}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transformOrigin: 'center',
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transformOrigin: 'center',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          width: '640px',
          margin: '10px auto',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px',
        }}
      >
        <button
          onClick={toggleVideo}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            border: '1px solid #ccc',
            borderRadius: '4px',
            transition: 'background-color 0.2s',
          }}
        >
          {videoRef.current?.paused ? 'Play Video' : 'Pause Video'}
        </button>

        {selectedShapeId && (
          <button
            onClick={() => {
              setShapes((prevShapes) =>
                prevShapes.filter((shape) => shape.id !== selectedShapeId)
              );
              setSelectedShapeId(null);
            }}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              border: '1px solid #ff5555',
              borderRadius: '4px',
            }}
            title="Delete selected shape (Delete)"
          >
            Delete Selected Shape
          </button>
        )}
      </div>

      {/* Zoom Controls */}
      <div
        style={{
          width: '640px',
          margin: '10px auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <div>Zoom: {Math.round(scale * 100)}%</div>
        <div>
          <button
            onClick={() =>
              setScale((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP))
            }
            style={{
              padding: '8px 16px',
              marginRight: '5px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            Zoom In
          </button>
          <button
            onClick={() =>
              setScale((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP))
            }
            style={{
              padding: '8px 16px',
              marginRight: '5px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            Zoom Out
          </button>
          <button
            onClick={resetView}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          >
            Reset View
          </button>
        </div>
      </div>
    </div>
  );
}

export default DrawPage;
