import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';

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
      <video
        ref={videoRef}
        src={src}
        controls={false} // Disable native controls
        style={{
          width: '100%', // Keep width flexible to container
          height: `${currentContainerHeight}px`, // Apply dynamic height state
          objectFit: 'contain',
        }}
      />
    );
  }
);

VideoElement.displayName = 'VideoElement';

export default VideoElement;
