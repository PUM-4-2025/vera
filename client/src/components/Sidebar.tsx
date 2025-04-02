import React, { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  Film,
  FileText,
  BarChart,
  MoreHorizontal,
  Trash2,
  Info,
  Upload,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useProject } from '@/contexts/ProjectContext';

interface FileItemProps {
  name: string;
  type: 'video' | 'bookmark';
  onSelect: () => void;
  isSelected: boolean;
}

const FileItem: React.FC<FileItemProps> = ({
  name,
  type,
  onSelect,
  isSelected,
}) => {
  const iconMap = {
    video: <Film size={16} />,
    bookmark: <FileText size={16} />,
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Deleted: ${name}`);
  };

  const handleShowMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(`Metadata for: ${name}`);
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between px-2 py-1.5 rounded-md text-sm cursor-pointer transition-colors group',
        isSelected
          ? 'bg-vera-highlight dark:bg-vera-highlight text-vera'
          : 'hover:bg-vera-highlight/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="text-vera group-hover:text-vera">{iconMap[type]}</span>
        <span className="truncate">{name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleShowMetadata}>
            <Info className="mr-2" size={14} />
            <span>Show Metadata</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
            <Trash2 className="mr-2" size={14} />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface FolderProps {
  name: string;
  files: {
    id: string;
    name: string;
    type: 'video' | 'bookmark';
  }[];
  defaultOpen?: boolean;
  selectedFile: string | null;
  onSelectFile: (id: string) => void;
}

const Folder: React.FC<FolderProps> = ({
  name,
  files,
  defaultOpen = false,
  selectedFile,
  onSelectFile,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-2 rounded-md text-sm cursor-pointer hover:bg-vera-highlight/50 transition-colors py-0"
      >
        <span className="mr-1 text-vera">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="mr-2 text-vera">
          <FolderIcon size={16} />
        </span>
        <span className="font-medium">{name}</span>
      </div>

      {isOpen && (
        <div className="ml-6 space-y-1 animate-slide-in">
          {files.map((file) => (
            <FileItem
              key={file.id}
              name={file.name}
              type={file.type}
              onSelect={() => onSelectFile(file.id)}
              isSelected={selectedFile === file.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { videos, bookmarks, currentVideoId, setCurrentVideoId, uploadVideo } =
    useProject();
  const [selectedFile, setSelectedFile] = useState<string | null>(
    currentVideoId
  );
  const [isDragging, setIsDragging] = useState(false);

  // Convert the videos object to the format needed for the Folder component
  const videoFiles = Object.entries(videos).map(([id, video]) => ({
    id,
    name: video.name,
    type: 'video' as const,
  }));

  // Convert the bookmarks object to the format needed for the Folder component
  const bookmarkFiles = Object.entries(bookmarks).map(([id, bookmark]) => ({
    id,
    name: `${id}_bookmarks.json`,
    type: 'bookmark' as const,
  }));

  const handleSelectFile = (id: string) => {
    setSelectedFile(id);
    // If it's a video, update the current video ID in the context
    if (videos[id]) {
      setCurrentVideoId(id);
    }
    console.log(`Loading file: ${id}`);
  };

  // Update selected file when currentVideoId changes
  React.useEffect(() => {
    if (currentVideoId) {
      setSelectedFile(currentVideoId);
    }
  }, [currentVideoId]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      // Check if files were dropped
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);

        // Filter for video files
        const videoFiles = files.filter(
          (file) =>
            file.type.startsWith('video/') ||
            ['.mp4', '.webm', '.mov', '.avi', '.mkv'].some((ext) =>
              file.name.toLowerCase().endsWith(ext)
            )
        );

        if (videoFiles.length === 0) {
          toast.error('Please drop video files only');
          return;
        }

        // For this simple implementation, we only handle the first video
        if (videoFiles.length > 1) {
          toast.info('Only the first video will be processed');
        }

        try {
          // We can't directly use the File object from the drop event with the File System Access API
          // Instead, we'll have to initiate the uploadVideo function which will prompt for a file
          toast.info('Please select the video file(s) when prompted');
          const videoIds = await uploadVideo();

          if (videoIds && videoIds.length > 0) {
            toast.success(`${videoIds.length} video(s) added to project`);
          }
        } catch (error) {
          toast.error(`Failed to process dropped video: ${error}`);
        }
      }
    },
    [uploadVideo]
  );

  return (
    <aside
      className={cn(
        'h-[calc(100vh-3.5rem)] border-r transition-all bg-sidebar relative',
        isOpen
          ? 'w-full md:w-72 opacity-100 translate-x-0'
          : 'w-0 md:w-0 opacity-0 -translate-x-full md:opacity-0 md:-translate-x-full'
      )}
    >
      <ScrollArea className="h-full">
        <div className="p-3 space-y-6">
          <div className="text-sm font-semibold text-sidebar-foreground/60 px-2 mb-2">
            PROJECT FILES
          </div>

          {videoFiles.length > 0 ? (
            <Folder
              name="Videos"
              files={videoFiles}
              defaultOpen={true}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
            />
          ) : (
            <div
              className={cn(
                'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors',
                isDragging
                  ? 'border-vera bg-vera-highlight/20'
                  : 'border-gray-300 dark:border-gray-700'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{ minHeight: '200px' }}
            >
              <Upload
                size={48}
                className={cn(
                  'mb-4 transition-colors',
                  isDragging ? 'text-vera' : 'text-gray-400 dark:text-gray-600'
                )}
              />
              <h3 className="text-lg font-medium mb-2">No Videos Yet</h3>
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-2">
                Drop video files here or use the File menu to upload
              </p>
              <p className="text-xs text-center text-gray-400 dark:text-gray-600">
                Supports MP4, WebM, MOV, AVI, MKV
              </p>
            </div>
          )}

          {bookmarkFiles.length > 0 && (
            <Folder
              name="Bookmarks"
              files={bookmarkFiles}
              selectedFile={selectedFile}
              onSelectFile={handleSelectFile}
            />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
