import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, FilmIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/contexts/ProjectContext';

const VideoPlayer: React.FC = () => {
  const { videos, currentVideoId } = useProject();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [_, setCurrentTime] = useState(0);

  // Get the current video object from the project context
  const currentVideo = currentVideoId ? videos[currentVideoId] : null;
  const videoSrc = currentVideo?.objectURL || '';

  // Effect to handle video play/pause
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

  // Handle video metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle step backward (5 seconds)
  const stepBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        videoRef.current.currentTime - 5
      );
    }
  };

  // Handle step forward (5 seconds)
  const stepForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoDuration,
        videoRef.current.currentTime + 5
      );
    }
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
            onTimeUpdate={handleTimeUpdate}
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
