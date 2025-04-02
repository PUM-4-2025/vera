import React, { useState } from 'react';
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

interface FileItemProps {
  name: string;
  type: 'video' | 'annotation' | 'result';
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
    annotation: <FileText size={16} />,
    result: <BarChart size={16} />,
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
    type: 'video' | 'annotation' | 'result';
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

const sampleData = {
  videos: [
    {
      id: 'video1',
      name: 'traffic_intersection.mp4',
      type: 'video' as const,
    },
    {
      id: 'video2',
      name: 'pedestrian_crossing.mp4',
      type: 'video' as const,
    },
    {
      id: 'video3',
      name: 'highway_accident.mp4',
      type: 'video' as const,
    },
  ],
  annotations: [
    {
      id: 'anno1',
      name: 'traffic_markings.json',
      type: 'annotation' as const,
    },
    {
      id: 'anno2',
      name: 'pedestrian_paths.json',
      type: 'annotation' as const,
    },
  ],
  results: [
    {
      id: 'result1',
      name: 'motion_analysis.csv',
      type: 'result' as const,
    },
    {
      id: 'result2',
      name: 'vehicle_count.pdf',
      type: 'result' as const,
    },
    {
      id: 'result3',
      name: 'speed_measurements.xlsx',
      type: 'result' as const,
    },
  ],
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const handleSelectFile = (id: string) => {
    setSelectedFile(id);
    console.log(`Loading file: ${id}`);
  };
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

          <Folder
            name="Videos"
            files={sampleData.videos}
            defaultOpen={true}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />

          <Folder
            name="Annotations"
            files={sampleData.annotations}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />

          <Folder
            name="Analysis Results"
            files={sampleData.results}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;
