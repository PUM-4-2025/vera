import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react'; // Assuming you use lucide-react for icons
import { cn } from '@/lib/utils'; // Import cn utility
import { useProject } from '@/contexts/ProjectContext'; // Import useProject

interface BookmarkSidebarProps {
  isOpen: boolean;
}

const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({ isOpen }) => {
  const { videoApi, currentVideoId } = useProject(); // Get videoApi and currentVideoId

  const handleAddBookmark = () => {
    if (videoApi && currentVideoId) {
      const currentTime = videoApi.getCurrentTime();
      const currentFrame = videoApi.getCurrentFrame(); // Corrected to getCurrentFrame based on type definition
      // TODO: Implement actual bookmark creation logic.
      // For now, we'll just log it and show a toast.
      const message = `Bookmark added for video ${currentVideoId} at time: ${currentTime.toFixed(2)}s (Frame: ${currentFrame})`;
      console.log(message);
    } else {
      let reason = '';
      if (!currentVideoId) reason = 'No video is currently active.';
      else if (!videoApi)
        reason = 'Video player API is not available at the moment.';
    }
  };

  // Example function to demonstrate jumping to a time (e.g., from a bookmark click)
  const handleJumpToTime = async (time: number) => {
    // Made async to align with seek potentially being async
    if (videoApi && currentVideoId) {
      try {
        await videoApi.seek(time); // Await if seek is a promise
      } catch (error) {
        console.error('Error seeking video:', error);
      }
    } else {
      let reason = '';
      if (!currentVideoId) reason = 'No video is currently active.';
      else if (!videoApi) reason = 'Video player API is not available to seek.';
    }
  };

  return (
    <aside
      className={cn(
        'h-[calc(100vh-3.5rem)] bg-background border-l text-foreground transition-all flex flex-col dark:bg-sidebar dark:border-border relative',
        isOpen
          ? 'w-[280px] opacity-100 translate-x-0'
          : 'w-0 opacity-0 translate-x-full'
      )}
    >
      <div className="p-4 border-b dark:border-border flex justify-between items-center">
        <h2 className="text-lg font-semibold">Bookmarks</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAddBookmark} // Use the new handler
          title="Add bookmark at current time"
          disabled={!currentVideoId || !videoApi} // Disable if no video or API
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Placeholder for bookmark list */}
        <p className="text-sm text-muted-foreground">
          No bookmarks yet. Click the + button to add a new bookmark.
        </p>
        {/* Test button to jump to 10 seconds */}
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => handleJumpToTime(10)} // Jump to 10 seconds
          disabled={!currentVideoId || !videoApi} // Disable if no video or API
          title="Jump to 10s in current video (Test)"
        >
          Jump to 10s (Test)
        </Button>
      </div>
    </aside>
  );
};

export default BookmarkSidebar;
