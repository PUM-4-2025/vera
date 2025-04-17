import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FilmIcon,
  Waves,
} from 'lucide-react';
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
  const [showWaveform, setShowWaveform] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);

  const currentVideo = currentVideoId ? videos[currentVideoId] : null;
  const videoSrc = currentVideo?.objectURL || '';

  // runs when video changed
  useEffect(() => {
    if (currentVideoId && videos[currentVideoId]) {
      setHasAudio(!!videos[currentVideoId].metadata?.audioCodec);
      setVideoDuration(videos[currentVideoId].metadata?.duration || 0);
    }
  }, [currentVideoId, videos]);

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

  const toggleWaveform = () => {
    setShowWaveform(!showWaveform);
  };

  return (
    <div className="h-full flex flex-col space-y-1">
      <div className="relative bg-vera-muted flex-1 min-h-[30vh] lg:min-h-[40vh] overflow-hidden flex items-center justify-center border border-border/30">
        {videoSrc ? (
          <>
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain"
              controls={false}
              onEnded={() => setIsPlaying(false)}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <FilmIcon size={48} className="mb-3 text-vera" strokeWidth={1.5} />
            <span className="text-sm font-medium">
              Select a video from the sidebar to begin
            </span>
          </div>
        )}
      </div>

      <VideoTimeSlider
        currentTime={currentTime}
        videoDuration={videoDuration}
        zoomLevel={zoomLevel}
        onTimeChange={handleTimeChange}
        onZoomChange={handleZoomChange}
        showWaveform={showWaveform}
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
            <Waves size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
