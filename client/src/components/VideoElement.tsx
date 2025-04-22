import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

import AnnotationCanvas from './AnnotationCanvas';

// Define the interface for the functions/properties we want to expose
export interface VideoElementRef {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  setContainerHeight: (height: number) => void;
  setFrameRate: (rate: number) => void;
}

interface VideoElementProps {
  src: string;
  containerWidth: number;
  containerHeight: number;
  videoWidth: number;
  videoHeight: number;
  initialFrameRate: number;
  onTimeUpdate?: (time: number) => void;
}

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [frameRate, setFrameRate] = useState<number>(initialFrameRate);
    const [currentContainerHeight, setCurrentContainerHeight] =
      useState<number>(containerHeight);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // Update internal frame rate state if prop changes
    useEffect(() => {
      setFrameRate(initialFrameRate);
    }, [initialFrameRate]);

    // Update internal playing state based on video events AND call callbacks
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleTimeUpdateCallback = () => {
        onTimeUpdate?.(video.currentTime);
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

    // Add mouse event listeners for panning
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        setPosition(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
        
        setDragStart({
          x: e.clientX,
          y: e.clientY
        });
      };
      
      const handleMouseUp = () => {
        setIsDragging(false);
      };
      
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, dragStart]);

    const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      e.preventDefault();
    };

    // Update internal container height state if prop changes
    useEffect(() => {
      setCurrentContainerHeight(containerHeight);
    }, [containerHeight]);

    // Expose control methods via useImperativeHandle
    useImperativeHandle(ref, () => ({
      play: () => {
        videoRef.current?.play().catch((e) => console.error('Play error:', e));
      },
      pause: () => {
        videoRef.current?.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },

      // Frame control methods
      nextFrame: () => {
        if (videoRef.current) {
          videoRef.current.pause(); // Pause to seek frame accurately
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
          videoRef.current.pause(); // Pause to seek frame accurately
          const frameDuration = 1 / frameRate;
          const newTime = Math.max(
            0,
            videoRef.current.currentTime - frameDuration
          );
          videoRef.current.currentTime = newTime;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
      isPlaying: () => {
        return isPlaying;
      },
      setContainerHeight: (height: number) => {
        setCurrentContainerHeight(height);
      },
      setFrameRate: (rate: number) => {
        // Add validation if needed (e.g., rate > 0)
        setFrameRate(rate);
      },
    }));

    return (
      <div className="relative" style={{ 
        width: `${containerWidth}px`, 
        height: `${containerHeight}px`,
        overflow: 'hidden',
        position: 'relative'
      }}>
      <video
        ref={videoRef}
        src={src}
        onMouseDown={handleMouseDown}
        controls={false} // Disable native controls
        style={{
          width: `${videoWidth}px`,
          height: `${videoHeight}px`,
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: 'absolute',
          objectFit: 'contain',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none'
        }}
        />
        <AnnotationCanvas />

      </div>
    );
  }
);

VideoElement.displayName = 'VideoElement';

export default VideoElement;
