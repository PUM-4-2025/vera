import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react'; // Assuming you use lucide-react for icons
import { cn } from '@/lib/utils'; // Import cn utility
import { useProject } from '@/contexts/ProjectContext'; // Import useProject
import { BookmarkEntry } from '@/types/project';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFFmpeg } from '@/contexts/FFmpegContext';
import { createBookmarkImage } from '@/utils/ffmpegUtils';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

interface BookmarkSidebarProps {
  isOpen: boolean;
}

const BookmarkSidebar: React.FC<BookmarkSidebarProps> = ({ isOpen }) => {
  const { videoApi, currentVideoId, bookmarks, currentFrame, setBookmarks } =
    useProject(); // Get videoApi and currentVideoId
  const { ffmpeg } = useFFmpeg();
  const [isDescriptionDialogOpen, setIsDescriptionDialogOpen] = useState(false);
  const [currentBookmarkDescription, setCurrentBookmarkDescription] =
    useState('');
  const [pendingBookmarkDetails, setPendingBookmarkDetails] = useState<{
    timestamp: number;
    blobUrl: string;
  } | null>(null);

  const formatTimestamp = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${minutes}:${paddedSeconds}`;
  };

  const handleOpenDescriptionDialog = () => {
    if (currentVideoId && videoApi && currentFrame?.blobUrl) {
      const timestamp = videoApi.getCurrentTime();
      setPendingBookmarkDetails({
        timestamp,
        blobUrl: currentFrame.blobUrl,
      });
      setCurrentBookmarkDescription(''); // Reset description
      setIsDescriptionDialogOpen(true);
    }
  };

  const handleConfirmAndAddBookmark = async () => {
    if (
      !currentVideoId ||
      !pendingBookmarkDetails ||
      !ffmpeg ||
      !currentFrame?.blobUrl ||
      !videoApi
    ) {
      console.error('Cannot add bookmark: Missing required data or API.', {
        currentVideoId,
        pendingBookmarkDetails,
        ffmpegReady: !!ffmpeg,
        currentFrameBlobUrl: currentFrame?.blobUrl,
        videoApiReady: !!videoApi,
      });
      setIsDescriptionDialogOpen(false);
      setPendingBookmarkDetails(null);
      return;
    }

    const { timestamp } = pendingBookmarkDetails;
    // videoApi is guaranteed to be non-null here.
    const annotationImageString = videoApi.getCurrentAnnotationImage(); // Returns string (dataURL or '')
    const dimensions = videoApi.getFrameDimensions();
    const fileName = `bookmark-${currentVideoId}-${timestamp}.png`;
    let bookmarkImageUrl = ''; // Use a more descriptive name

    try {
      // Call createBookmarkImage. It handles an empty annotationImageString internally.
      bookmarkImageUrl = await createBookmarkImage(
        ffmpeg,
        currentFrame.blobUrl,
        annotationImageString, // This is guaranteed to be a string
        dimensions
      );
    } catch (error) {
      console.error('Error during createBookmarkImage:', error);
      // bookmarkImageUrl will remain '' or be whatever createBookmarkImage returned before error if it partly succeeded.
      // Ensure it's reset or handled if createBookmarkImage might not clean up on error.
      // For now, we assume it results in an unusable URL or error is thrown before assignment.
    }

    if (!bookmarkImageUrl) {
      console.error(
        'Failed to create bookmark image. Result was empty or an error occurred.'
      );
      setIsDescriptionDialogOpen(false);
      setPendingBookmarkDetails(null);
      return;
    }

    const { scale, offsetX, offsetY } = videoApi.getTransformationMatrix();

    const newBookmark: BookmarkEntry = {
      id: uuidv4(), // Generate unique ID
      timestamp,
      path: 'bookmarks/' + fileName, // Consider if path needs to be more dynamic or handled differently
      description: currentBookmarkDescription,
      blobUrl: bookmarkImageUrl,
      scale,
      offsetX,
      offsetY,
    };

    const newBookmarks = {
      ...bookmarks,
      [currentVideoId]: [...(bookmarks[currentVideoId] || []), newBookmark],
    };
    setBookmarks(newBookmarks);
    console.log('Bookmark added:', newBookmark);

    setIsDescriptionDialogOpen(false);
    setPendingBookmarkDetails(null);
  };

  const handleBookmarkClick = (
    timestamp: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    if (videoApi) {
      videoApi.seek(timestamp);
      videoApi.setOffset(offsetX, offsetY);
      videoApi.setScale(scale);
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
          onClick={handleOpenDescriptionDialog}
          title="Add bookmark at current time"
          disabled={!currentVideoId || !videoApi}
        >
          <PlusIcon className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {currentVideoId &&
        bookmarks[currentVideoId] &&
        bookmarks[currentVideoId].length > 0 ? (
          bookmarks[currentVideoId]?.map((bookmark) => (
            <div
              key={bookmark.id}
              onClick={() =>
                handleBookmarkClick(
                  bookmark.timestamp,
                  bookmark.scale,
                  bookmark.offsetX,
                  bookmark.offsetY
                )
              }
              className="mb-2 p-2 border hover:bg-accent cursor-pointer dark:border-border dark:hover:bg-gray-700"
              role="button"
              tabIndex={0}
            >
              <img
                src={bookmark.blobUrl}
                alt={`Bookmark at ${formatTimestamp(bookmark.timestamp)}`}
                className="w-full h-auto object-cover rounded mb-1"
              />
              <p className="text-xs font-semibold">
                {formatTimestamp(bookmark.timestamp)}
              </p>
              <p className="text-xs truncate" title={bookmark.description}>
                {bookmark.description || 'No description'}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            No bookmarks yet. Click the + button to add a new bookmark.
          </p>
        )}
      </div>

      {/* Dialog for adding description */}
      <Dialog
        open={isDescriptionDialogOpen}
        onOpenChange={setIsDescriptionDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Bookmark Description</DialogTitle>
            <DialogDescription>
              Enter a description for your bookmark at{' '}
              {pendingBookmarkDetails
                ? formatTimestamp(pendingBookmarkDetails.timestamp)
                : ''}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={currentBookmarkDescription}
                onChange={(e) => setCurrentBookmarkDescription(e.target.value)}
                className="col-span-3"
                placeholder="Enter bookmark description"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    // Prevent default form submission if wrapped in a form, though not strictly necessary here
                    e.preventDefault();
                    handleConfirmAndAddBookmark();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDescriptionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAndAddBookmark}>Add Bookmark</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
};

export default BookmarkSidebar;
