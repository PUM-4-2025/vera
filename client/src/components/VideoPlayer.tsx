import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FilmIcon,
  Waves,
  RectangleVertical,
  RectangleHorizontal,
  AudioWaveform,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';
import { VideoTimeSlider } from './VideoTimeSlider';
import { SoundWaveform } from './SoundWaveform';
import VideoElement, { VideoElementRef } from './VideoElement';
import AnnotationCanvas from './AnnotationCanvas';

const VideoPlayer: React.FC = () => {
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
  const [showWaveform, setShowWaveform] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [manualLayout, setManualLayout] = useState<
    'auto' | 'portrait' | 'landscape'
  >('auto');
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [clientSize, setClientSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const currentVideo = currentVideoId ? videos[currentVideoId] : null;
  const videoSrc = currentVideo?.objectURL || '';

  // runs when video changed
  useEffect(() => {
    if (currentVideoId && videos[currentVideoId]) {
      const videoData = videos[currentVideoId];
      setHasAudio(!!videoData.metadata?.audioCodec);
      setCurrentTime(0);
      setIsPlaying(false);
      setManualLayout('auto');
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

  // Track window, client and container dimensions
  const updateDimensions = () => {
    // Window size
    setWindowSize({
      width: window.outerWidth,
      height: window.outerHeight,
    });

    // Client size
    setClientSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    // Video container size
    if (videoContainerRef.current) {
      setContainerSize({
        width: videoContainerRef.current.offsetWidth,
        height: videoContainerRef.current.offsetHeight,
      });
    }
  };

  useEffect(() => {
    // Initial update
    updateDimensions();

    // Update on resize
    window.addEventListener('resize', updateDimensions);

    // Update container size periodically (in case layout changes without resize)
    const intervalId = setInterval(updateDimensions, 1000);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearInterval(intervalId);
    };
  }, []);

  // Effect to update dimensions when layout or video source changes
  useEffect(() => {
    // Add a small delay to allow DOM to update after layout change
    const timeoutId = setTimeout(() => {
      updateDimensions();
    }, 50); // 50ms delay

    return () => clearTimeout(timeoutId);
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

  const toggleWaveform = () => {
    setShowWaveform(!showWaveform);
  };

  // Size info panel component
  const SizeInfoPanel = () => {
    // Get physical screen resolution
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Calculate approximate zoom level
    const zoomLevel = Math.round((window.outerWidth / window.innerWidth) * 100);

    // Calculate actual physical container size by adjusting for zoom
    // Calculate actual physical container size by comparing CSS pixels to device pixels
    // (accounts for devicePixelRatio, not browser zoom)
    const actualContainerWidth = Math.round(
      containerSize.width * window.devicePixelRatio
    );
    const actualContainerHeight = Math.round(
      containerSize.height * window.devicePixelRatio
    );



    return (
      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white p-2 rounded text-xs z-10 font-mono">
        <div>
          Screen: {screenWidth}×{screenHeight}px
        </div>
        <div>
          Window: {windowSize.width}×{windowSize.height}px
        </div>
        <div>
          Client: {clientSize.width}×{clientSize.height}px
        </div>
        <div>Device Pixel Ratio: {window.devicePixelRatio}</div>
        <div>
          Container (CSS): {containerSize.width}×{containerSize.height}px
        </div>
        <div>
          Container (Actual): {actualContainerWidth}×{actualContainerHeight}px
        </div>
        <div>Zoom: ~{zoomLevel}%</div>
      </div>
    );
  };


  const getActualContainerSize = () => {
    const actualContainerWidth = Math.round(
      containerSize.width * window.devicePixelRatio
    );
    const actualContainerHeight = Math.round(
      containerSize.height * window.devicePixelRatio
    );
    return {
      width: actualContainerWidth,
      height: actualContainerHeight,
    };
  };

  return (
    <div className="h-full">
      {videoSrc ? (
        // Combined Layout
        <div
          key={effectiveLayout}
          className={`flex ${isPortraitLayout ? 'flex-row h-full space-x-1' : 'flex-col space-y-1'} h-full`}
        >
          <div
            ref={videoContainerRef}
            className={`relative bg-vera-muted overflow-hidden flex items-center justify-center border border-border/30 ${isPortraitLayout ? 'h-full' : 'flex-1 min-h-[30vh] lg:min-h-[40vh] self-center'}`}
            style={{
              aspectRatio: displayedAR,
              maxWidth: isPortraitLayout ? '90%' : '95%',
              maxHeight: isPortraitLayout ? '100%' : '85vh',
            }}
          >
            <SizeInfoPanel />
            <VideoElement
              ref={videoElementRef}
              src={videoSrc}
              containerWidth={getActualContainerSize().width}
              containerHeight={getActualContainerSize().height}
              videoWidth={originalWidth || 1920}
              videoHeight={originalHeight || 1080}
              initialFrameRate={currentVideo?.metadata?.fps || 30}
              onTimeUpdate={handleVideoTimeUpdate}
            />
          </div>

          <div
            className={`${isPortraitLayout ? 'flex-1 h-full flex flex-col space-y-1' : ''}`}
          >
            <VideoTimeSlider
              currentTime={currentTime}
              videoDuration={videoDuration}
              zoomLevel={zoomLevel}
              onTimeChange={handleTimeChange}
              onZoomChange={handleZoomChange}
              showWaveform={showWaveform}
              onSeekStart={handleSeekStart}
              onSeekEnd={handleSeekEnd}
            />

            {showWaveform && (
              <SoundWaveform
                currentTime={currentTime}
                videoDuration={videoDuration}
                zoomLevel={zoomLevel}
                onTimeChange={handleTimeChange}
                onZoomChange={handleZoomChange}
              />
            )}

            <div className="flex justify-between items-center gap-4 px-2">
              <div className="text-sm font-mono text-muted-foreground tabular-nums w-28">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
                  aria-label="Step backward"
                  onClick={stepBackward}
                  disabled={!videoSrc}
                >
                  <SkipBack size={16} />
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
                  <SkipForward size={16} />
                </Button>
              </div>

              <div className="w-28 flex justify-end">
                <Button
                  variant={showWaveform ? 'secondary' : 'outline'}
                  size="icon"
                  className={`hover-effect rounded-full w-12 h-8 bg-vera-muted hover:border-vera text-foreground hover:text-vera ${!hasAudio ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={showWaveform ? 'Hide waveform' : 'Show waveform'}
                  onClick={toggleWaveform}
                  disabled={!videoSrc || !hasAudio}
                >
                  <AudioWaveform size={16} />
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
          <SizeInfoPanel />
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
};

export default VideoPlayer;
