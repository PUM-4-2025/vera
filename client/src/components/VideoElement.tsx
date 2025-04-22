import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

import AnnotationCanvas from './AnnotationCanvas';

import Konva from 'konva';
import {
  Stage,
  Layer,
  Circle,
  Rect,
  Line,
  Text,
  Image,
  Transformer,
  Group,
} from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';

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

    const printPos = () => {
      const stagePoint = stageRef.current?.getRelativePointerPosition();
      if (!stagePoint) return;
      const videoCoords = getOriginalVideoCoordsFromStagePoint(stagePoint);
      if (!videoCoords) return;
      console.log({ ...videoCoords, videoWidth, videoHeight });
    };
    // --- Effects ---

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
        {/* Konva Stage for annotations - stays fixed, NOT scaled/translated */}
        <Stage
          ref={stageRef}
          width={containerWidth}
          height={containerHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
          onClick={printPos}
        >
          <Layer ref={annotationLayerRef} style={{ pointerEvents: 'auto' }}>
            {/* Example Annotation Shape - Position is relative to the video */}
            <Rect
              x={20}
              y={20}
              width={100}
              height={100}
              fill="rgba(0, 255, 0, 0.5)"
              draggable
            />
            <Text
              text="Annotations here (video zooms behind)"
              x={150}
              y={50}
              fill="white"
              draggable
            />
          </Layer>
        </Stage>
      </div>
    );
  }
);

VideoElement.displayName = 'VideoElement';

export default VideoElement;
