import { useRef, useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  StepBack,
  StepForward,
  FilmIcon,
  RectangleVertical,
  RectangleHorizontal,
  AudioWaveform,
  Film,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';
import { VideoTimeSlider } from './VideoTimeSlider';
import { SoundWaveform } from './SoundWaveform';
import { MotionIntervals } from './MotionIntervals';
import VideoElement, { VideoElementRef } from './VideoElement';

const VideoPlayer = forwardRef<VideoElementRef>((_props, ref) => {
  const { videos, currentVideoId } = useProject();
  const videoElementRef = useRef<VideoElementRef>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const canSeekRef = useRef<boolean>(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [samples, setSamples] = useState([0]);
  const [activeComponent, setActiveComponent] = useState<
    'waveform' | 'intervals' | null
  >('waveform');
  const [hasAudio, setHasAudio] = useState(true);
  const [manualLayout, setManualLayout] = useState<
    'auto' | 'portrait' | 'landscape'
  >('auto');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [numFrames, setNumFrames] = useState(0); // temp: State to store the number of frames
  const [useMotionControls, setUseMotionControls] = useState(false);
  const playbackController = useRef<{
    active: boolean;
    nextCheck: number | null;
  }>({ active: false, nextCheck: null });

  const currentVideo = currentVideoId ? videos[currentVideoId] : null;
  const videoSrc = currentVideo?.objectURL || '';
  let filename = '';

  // runs when video changed
  useEffect(() => {
    if (currentVideoId && videos[currentVideoId] && currentVideo) {
      const videoData = videos[currentVideoId];
      setHasAudio(!!videoData.metadata?.audioCodec);
      setCurrentTime(0);
      setIsPlaying(false);
      setVideoDuration(videoData.metadata?.duration || 0);
      setManualLayout('auto');
      filename = currentVideo.metadata.filename;

      // temp: Calculate the number of frames
      const frameRate = videoData.metadata?.fps || 30;
      const totalFrames = Math.floor(videoData.metadata?.duration * frameRate);
      setNumFrames(totalFrames);
    }
  }, [currentVideoId, videos]);

  // Calculate original aspect ratio
  const originalWidth = currentVideo?.metadata?.width;
  const originalHeight = currentVideo?.metadata?.height;
  const originalAspectRatio = useMemo(() => {
    if (!originalWidth || !originalHeight) return 16 / 9; // Default to landscape if unknown
    return originalWidth / originalHeight;
  }, [originalWidth, originalHeight]);

  // Determine the effective layout based on video aspect ratio and manual setting
  const isNativePortrait = originalAspectRatio < 1;
  const effectiveLayout =
    manualLayout === 'auto'
      ? isNativePortrait
        ? 'portrait'
        : 'landscape'
      : manualLayout;
  const isPortraitLayout = effectiveLayout === 'portrait';

  // Calculate displayed aspect ratio (fixed based on layout)
  const displayedAR = useMemo(() => {
    return isPortraitLayout ? 9 / 16 : 16 / 9; // Fixed aspect ratio based on layout
  }, [isPortraitLayout]); // Depend only on the layout mode

  // Track video container size
  const updateDimensions = () => {
    // Video container size
    if (videoContainerRef.current) {
      setContainerSize({
        width: videoContainerRef.current.clientWidth,
        height: videoContainerRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    // Initial update
    updateDimensions();

    // Update on resize
    window.addEventListener('resize', updateDimensions);
    const interval = setInterval(() => {
      updateDimensions();
    }, 100);

    // Update container size periodically (in case layout changes without resize)
    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearInterval(interval);
    };
  }, []); // Empty dependency array: runs only on mount/unmount

  // Effect to update dimensions when layout or video source changes
  useEffect(() => {
    updateDimensions();
  }, [effectiveLayout, videoSrc]); // Depend on effectiveLayout and videoSrc

  // Restore requestAnimationFrame for smooth time updates during playback
  useEffect(() => {
    let animationFrameId: number;

    const updateTimeSmoothly = () => {
      if (videoElementRef.current && isPlaying) {
        const newTime = videoElementRef.current.getCurrentTime();
        setCurrentTime(newTime);
        animationFrameId = requestAnimationFrame(updateTimeSmoothly);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTimeSmoothly);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
    // Depend on isPlaying and the ref being available (though ref itself doesn't trigger updates)
  }, [isPlaying]);

  // Control Functions (using videoElementRef)
  const togglePlay = () => {
    if (!videoElementRef.current) return;
    const newState = !isPlaying;
    if (newState) {
      videoElementRef.current.play();
    } else {
      videoElementRef.current.pause();
    }
    setIsPlaying(newState);
  };

  const stepBackward = () => {
    videoElementRef.current?.prevFrame();
  };

  const stepForward = () => {
    videoElementRef.current?.nextFrame();
  };

  const skipBackward = () => {
    for (let i = 1; i <= 150; i++) {
      videoElementRef.current?.prevFrame();
    }
  };

  const skipForward = () => {
    for (let i = 1; i <= 150; i++) {
      videoElementRef.current?.nextFrame();
    }
  };

  const stopPlayback = () => {
    playbackController.current.active = false;
    if (playbackController.current.nextCheck !== null) {
      cancelAnimationFrame(playbackController.current.nextCheck);
    }
    if (videoElementRef.current) {
      videoElementRef.current.pause();
    }
    setIsPlaying(false);
  };

  const startPlayback = async () => {
    if (!videoElementRef.current) return;

    playbackController.current.active = true;
    setIsPlaying(true);

    try {
      videoElementRef.current.play();
      const checkFrames = () => {
        if (!playbackController.current.active) return;

        const currentTime = videoElementRef.current!.getCurrentTime();
        const currentFrame = Math.round(
          (currentTime / videoDuration) * numFrames
        );

        // End of video check with small epsilon
        if (currentTime >= videoDuration - 0.001) {
          stopPlayback();
          return;
        }

        console.log("Checking!");
        if (samples[0]) {
          if (currentFrame < samples[0]) {
            const targetTime = (samples[0] / numFrames) * videoDuration;
            videoElementRef.current!.seek(targetTime);
            setCurrentTime(targetTime);
          }
        }
        for (let i = 2; i < samples.length; i += 2) {
          console.log("Comparing frames: ", currentFrame, " | ", samples[i], " | ", samples[i - 1]);
          // Motion detection and frame skip
          if (samples[i] < currentFrame && samples[i - 1] > currentFrame) {
            console.log("True!");
            const targetTime = (samples[i] / numFrames) * videoDuration;
            videoElementRef.current!.seek(targetTime);
            setCurrentTime(targetTime);
          } else {
            console.log("False!");
          }
        }
        // Schedule next check using RAF only
        playbackController.current.nextCheck =
          requestAnimationFrame(checkFrames);
      };

      // Start the checking loop
      playbackController.current.nextCheck = requestAnimationFrame(checkFrames);
    } catch (error) {
      stopPlayback();
    }
  };

  const motionTogglePlay = () => {
    if (playbackController.current.active) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [videoSrc]);

  const motionStepBackward = () => {
    const currentFrame = Math.floor((currentTime / videoDuration) * numFrames - 1);
    let counter = 0;
    while (true) {
      videoElementRef.current?.prevFrame();
      if (samples[currentFrame - counter] == 1 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
  };

  const motionStepForward = () => {
    const currentFrame = Math.ceil((currentTime / videoDuration) * numFrames);
    let counter = 0;
    while (true) {
      videoElementRef.current?.nextFrame();
      if (samples[currentFrame + counter] == 1 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
  };

  const motionSkipBackward = () => {
    const currentFrame = Math.floor((currentTime / videoDuration) * numFrames - 1);
    let counter = 0;
    while (true) {
      videoElementRef.current?.prevFrame();
      if (samples[currentFrame - counter] == 1 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
    videoElementRef.current?.nextFrame();
    while (true) {
      videoElementRef.current?.prevFrame();
      if (samples[currentFrame - counter] == 0 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
    videoElementRef.current?.nextFrame();
  };

  const motionSkipForward = () => {
    const currentFrame = Math.ceil((currentTime / videoDuration) * numFrames);
    let counter = 0;
    while (true) {
      videoElementRef.current?.nextFrame();
      if (samples[currentFrame + counter] == 0 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
    videoElementRef.current?.prevFrame();
    while (true) {
      videoElementRef.current?.nextFrame();
      if (samples[currentFrame + counter] == 1 || counter > 1000) {
        break;
      }
      counter = counter + 1;
    }
  };

  const handleTimeChange = (time: number) => {
    // Always update the state immediately for UI responsiveness
    setCurrentTime(time);

    if (isSeeking) {
      // Throttle seeks during drag
      if (canSeekRef.current && videoElementRef.current) {
        videoElementRef.current.seek(time);
        canSeekRef.current = false;
        // Clear previous timeout if it exists
        if (throttleTimeoutRef.current) {
          clearTimeout(throttleTimeoutRef.current);
        }
        // Set new timeout to allow seeking again after delay
        throttleTimeoutRef.current = setTimeout(() => {
          canSeekRef.current = true;
        }, 100); // Throttle delay: 100ms
      }
    } else {
      // Seek immediately if not dragging (e.g., click)
      if (videoElementRef.current) {
        videoElementRef.current.seek(time);
      }
    }
  };

  // Handlers for slider drag state
  const handleSeekStart = () => {
    setIsSeeking(true);
    canSeekRef.current = true; // Allow immediate seek on drag start
    // Clear any lingering timeout from previous interactions
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
  };

  const handleSeekEnd = () => {
    setIsSeeking(false);
    // Clear throttle timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    // Perform the final accurate seek operation when dragging stops
    if (videoElementRef.current) {
      videoElementRef.current.seek(currentTime);
    }
  };

  // Callbacks for VideoElement
  const handleVideoTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleZoomChange = (delta: number) => {
    const newZoomLevel = Math.max(1, Math.min(10, zoomLevel + delta));
    setZoomLevel(newZoomLevel);
  };

  const handleSampleChange = (samples: number[]) => {
    setSamples(samples);
  };

  const toggleWaveform = () => {
    setActiveComponent((prev) => {
      const newValue = prev === 'waveform' ? null : 'waveform';
      console.log('Waveform toggled, activeComponent:', newValue);
      return newValue;
    });
  };

  const toggleIntervals = () => {
    setActiveComponent((prev) => {
      const newValue = prev === 'intervals' ? null : 'intervals';
      console.log('Intervals toggled, activeComponent:', newValue);
      return newValue;
    });
  };

  const toggleMotionControls = () => {
    setUseMotionControls((prev) => !prev);
    stopPlayback();
  };

  // Expose the video element ref to the parent component
  useImperativeHandle(ref, () => ({
    setMotionDetectionMode: () => {
      if (videoElementRef.current) {
        videoElementRef.current.setMotionDetectionMode();
      }
    },
    getCurrentTime: () => {
      return videoElementRef.current?.getCurrentTime() || 0;
    },
    play: () => {
      return videoElementRef.current?.play() || Promise.resolve();
    },
    pause: () => {
      videoElementRef.current?.pause();
    },
    prevFrame: () => {
      videoElementRef.current?.prevFrame();
    },
    nextFrame: () => {
      videoElementRef.current?.nextFrame();
    },
    seek: (time: number) => {
      videoElementRef.current?.seek(time);
    },
    getCurrentFrameNumber: () => {
      return videoElementRef.current?.getCurrentFrameNumber() || 0;
    },
    isPlaying: () => {
      return videoElementRef.current?.isPlaying() || false;
    },
  }));

  return (
    <div className="h-full">
      {videoSrc ? (
        // Combined Layout
        <div
          key={effectiveLayout}
          className={`flex ${isPortraitLayout
            ? 'flex-row h-full space-x-1'
            : 'flex-col space-y-1'
            } h-full`}
        >
          <div
            ref={videoContainerRef}
            className={`relative bg-vera-muted overflow-hidden flex items-center justify-center border border-border/30 ${isPortraitLayout ? 'h-full' : 'flex-1'
              }`}
            style={{
              aspectRatio: displayedAR,
            }}
          >
            <VideoElement
              ref={videoElementRef}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          </div>

          <div
            className={`${isPortraitLayout ? 'flex-1 h-full flex flex-col space-y-1' : ''
              }`}
          >
            <VideoTimeSlider
              currentTime={currentTime}
              videoDuration={videoDuration}
              zoomLevel={zoomLevel}
              onTimeChange={handleTimeChange}
              onZoomChange={handleZoomChange}
              activeComponent={activeComponent}
              onSeekStart={handleSeekStart}
              onSeekEnd={handleSeekEnd}
            />

            {activeComponent === 'waveform' && (
              <SoundWaveform
                filename={filename}
                currentTime={currentTime}
                videoDuration={videoDuration}
                zoomLevel={zoomLevel}
                onTimeChange={handleTimeChange}
                onZoomChange={handleZoomChange}
              />
            )}
            {activeComponent === 'intervals' && (
              <MotionIntervals
                filename={filename}
                currentTime={currentTime}
                videoDuration={videoDuration}
                zoomLevel={zoomLevel}
                onTimeChange={handleTimeChange}
                onZoomChange={handleZoomChange}
                onSamples={handleSampleChange}
                numFrames={numFrames} // temp: Pass the number of frames as a prop
              />
            )}

            <div className="flex justify-between items-center gap-4 px-2">
              <div className="text-sm font-mono text-muted-foreground tabular-nums w-28">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>

              <div className="flex gap-4">
                {useMotionControls ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-red-600 hover:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-full w-12 h-8"
                      aria-label="Motion step backward"
                      onClick={motionSkipBackward}
                      disabled={!videoSrc}
                    >
                      <SkipBack size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-red-600 hover:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-full w-12 h-8"
                      aria-label="Motion step backward"
                      onClick={motionStepBackward}
                      disabled={!videoSrc}
                    >
                      <StepBack size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-red-600 hover:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-full w-12 h-8"
                      aria-label="Motion play"
                      onClick={motionTogglePlay}
                      disabled={!videoSrc}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-red-600 hover:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-full w-12 h-8"
                      aria-label="Motion step forward"
                      onClick={motionStepForward}
                      disabled={!videoSrc}
                    >
                      <StepForward size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-red-600 hover:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-full w-12 h-8"
                      aria-label="Motion step forward"
                      onClick={motionSkipForward}
                      disabled={!videoSrc}
                    >
                      <SkipForward size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                      aria-label="Step backward"
                      onClick={skipBackward}
                      disabled={!videoSrc}
                    >
                      <SkipBack size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                      aria-label="Step backward"
                      onClick={stepBackward}
                      disabled={!videoSrc}
                    >
                      <StepBack size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                      onClick={togglePlay}
                      disabled={!videoSrc}
                    >
                      {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                      aria-label="Step forward"
                      onClick={stepForward}
                      disabled={!videoSrc}
                    >
                      <StepForward size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                      aria-label="Step forward"
                      onClick={skipForward}
                      disabled={!videoSrc}
                    >
                      <SkipForward size={16} />
                    </Button>
                  </>
                )}
              </div>

              <div className="w-28 flex justify-end">
                <Button
                  variant={
                    activeComponent === 'waveform' ? 'secondary' : 'outline'
                  }
                  size="icon"
                  className={`hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera ${!hasAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={
                    activeComponent === 'waveform'
                      ? 'Hide waveform'
                      : 'Show waveform'
                  }
                  onClick={toggleWaveform}
                  disabled={!videoSrc || !hasAudio}
                >
                  <AudioWaveform size={16} />
                </Button>
                <Button
                  variant={
                    activeComponent === 'intervals' ? 'secondary' : 'outline'
                  }
                  size="icon"
                  className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                  aria-label={
                    activeComponent === 'intervals'
                      ? 'Hide intervals'
                      : 'Show intervals'
                  }
                  onClick={toggleIntervals}
                  disabled={!videoSrc}
                >
                  <Film size={16} />
                </Button>
                <Button
                  variant={useMotionControls ? 'secondary' : 'outline'}
                  size="icon"
                  className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                  aria-label={
                    useMotionControls
                      ? 'Use normal controls'
                      : 'Use motion controls'
                  }
                  onClick={toggleMotionControls}
                  disabled={!videoSrc}
                >
                  <PlayCircle size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                  aria-label={
                    isPortraitLayout
                      ? 'Switch to landscape layout'
                      : 'Switch to portrait layout'
                  }
                  onClick={() =>
                    setManualLayout(
                      manualLayout === 'portrait' ? 'landscape' : 'portrait'
                    )
                  }
                  disabled={!videoSrc}
                >
                  {isPortraitLayout ? (
                    <RectangleHorizontal size={16} />
                  ) : (
                    <RectangleVertical size={16} />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // No Video Selected: Placeholder
        <div className="flex flex-col space-y-1 h-full">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FilmIcon size={48} className="mb-3 text-vera" strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Select a video from the sidebar to begin
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
