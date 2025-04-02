import React from 'react';
import { Play, Pause, SkipBack, SkipForward, FilmIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
  videoSrc?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoSrc }) => {
  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="relative bg-vera-muted rounded-lg flex-1 min-h-[30vh] lg:min-h-[40vh] overflow-hidden flex items-center justify-center border border-border/30">
        {videoSrc ? (
          <video
            src={videoSrc}
            controls={false}
            className="w-full h-full object-contain"
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
        >
          <SkipBack size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label="Play"
        >
          <Play size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label="Pause"
        >
          <Pause size={18} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hover-effect rounded-full w-12 h-12 bg-vera-muted hover:border-vera text-foreground hover:text-vera"
          aria-label="Step forward"
        >
          <SkipForward size={18} />
        </Button>
      </div>

      <div className="bg-vera-muted/50 rounded-lg p-4 border border-border/30 min-h-[10vh] max-h-[10vh] overflow-y-auto">
        <h3 className="text-sm font-medium mb-2 text-foreground/70">
          Annotations & Analysis
        </h3>
        <div className="text-sm text-muted-foreground">
          No annotations available. Select a video and use the tools to begin
          annotating.
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
