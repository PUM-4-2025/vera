import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, FilmIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';
import { VideoTimeSlider } from './VideoTimeSlider';
import { SoundWaveform } from './SoundWaveform';

const VideoPlayer: React.FC = () => {
  const { videos, currentVideoId } = useProject();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  const currentVideo = currentVideoId ? videos[currentVideoId] : null;
  const videoSrc = currentVideo?.objectURL || '';

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch((error) => {
          console.error('Error playing video:', error);
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Smooth time updates using requestAnimationFrame
  useEffect(() => {
    let animationFrameId: number;
    const updateTime = () => {
      if (videoRef.current && isPlaying) {
        const newTime = videoRef.current.currentTime;
        setCurrentTime(newTime);
      }
      animationFrameId = requestAnimationFrame(updateTime);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const stepBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 5);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const stepForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(videoDuration, videoRef.current.currentTime + 5);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimeChange = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleZoomChange = (delta: number) => {
    const newZoomLevel = Math.max(1, Math.min(10, zoomLevel + delta));
    setZoomLevel(newZoomLevel);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="relative bg-vera-muted rounded-lg flex-1 min-h-[30vh] lg:min-h-[40vh] overflow-hidden flex items-center justify-center border border-border/30">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            controls={false}
            onLoadedMetadata={handleMetadataLoaded}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FilmIcon size={48} className="mb-3 text-vera" strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Select a video from the sidebar to begin
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label="Step backward"
          onClick={stepBackward}
          disabled={!videoSrc}
        >
          <SkipBack size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          onClick={togglePlay}
          disabled={!videoSrc}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label="Step forward"
          onClick={stepForward}
          disabled={!videoSrc}
        >
          <SkipForward size={18} />
        </Button>
      </div>

      <VideoTimeSlider
        currentTime={currentTime}
        videoDuration={videoDuration}
        zoomLevel={zoomLevel}
        onTimeChange={handleTimeChange}
        onZoomChange={handleZoomChange}
      />
      <SoundWaveform
        currentTime={currentTime}
        videoDuration={videoDuration}
        zoomLevel={zoomLevel}
        onTimeChange={handleTimeChange}
        onZoomChange={handleZoomChange}
      />

      <div className="time-display">
        {formatTime(currentTime)} / {formatTime(videoDuration)}
      </div>

      <div className="bg-vera-muted/50 rounded-lg p-4 border border-border/30 min-h-[10vh] max-h-[10vh] overflow-y-auto">
        <h3 className="text-sm font-medium mb-2 text-foreground/70">
          Annotations & Analysis
        </h3>
        <div className="text-sm text-muted-foreground">
          {currentVideo
            ? `Video: ${currentVideo.name} | Duration: ${Math.floor(videoDuration / 60)}:${Math.floor(
                videoDuration % 60
              )
                .toString()
                .padStart(2, '0')}`
            : 'No annotations available. Select a video and use the tools to begin annotating.'}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
