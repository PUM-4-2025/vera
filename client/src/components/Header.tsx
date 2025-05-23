import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from '@/components/ThemeToggle';
import { toast } from 'sonner';
import {
  Save,
  UploadCloud,
  Download,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Eye,
  EyeOff,
  Circle,
  Square,
  ArrowRight,
  Type,
  Activity,
  Volume2,
  FileText,
  HelpCircle,
  Info,
  Headphones,
  Menu,
  ArrowLeft,
  BookMarked,
} from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import veraLogo from '../assets/vera_blagul.svg';
import { Button } from '@/components/ui/button';
import { VideoElementRef } from './VideoElement';

interface HeaderMenuItemProps {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const HeaderMenuItem: React.FC<HeaderMenuItemProps> = ({
  icon,
  label,
  shortcut,
  disabled = false,
  onClick,
}) => (
  <DropdownMenuItem
    disabled={disabled}
    onClick={onClick}
    className="flex items-center gap-2 text-sm px-3 py-2 cursor-pointer"
  >
    <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
    <span className="flex-1">{label}</span>
    {shortcut && (
      <span className="text-xs text-muted-foreground">{shortcut}</span>
    )}
  </DropdownMenuItem>
);

interface HeaderMenuProps {
  label: string;
  items: HeaderMenuItemProps[];
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ label, items }) => (
  <DropdownMenu modal={false}>
    <DropdownMenuTrigger asChild>
      <button className="px-3 py-1.5 text-sm font-medium hover:bg-vera-highlight/50 rounded-md transition-colors">
        {label}
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      className="w-52 glass-effect animate-scale-in"
      align="start"
    >
      {items.map((item, index) => (
        <HeaderMenuItem key={index} {...item} />
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);



interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  onInitiateSaveAs: () => void;
  onGoBackRequest: () => void;
  toggleBookmarkSidebar: () => void;
  isBookmarkSidebarOpen: boolean;
  videoElementRef: React.RefObject<VideoElementRef>;
}

const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  isSidebarOpen,
  onInitiateSaveAs,
  onGoBackRequest,
  toggleBookmarkSidebar,
  isBookmarkSidebarOpen,
  videoElementRef,
}) => {
  const {
    projectDirectoryHandle,
    saveProject,
    loadProject,
    uploadVideo,
  } = useProject();

  const analyzeMenuItems: HeaderMenuItemProps[] = [
    {
      icon: <Activity size={16} />,
      label: 'Detect Motion',
      shortcut: '⌘M',
      onClick: () => {
        if (videoElementRef.current) {
          videoElementRef.current.setMotionDetectionMode();
        }
      }
    },
    { icon: <Volume2 size={16} />, label: 'Detect Sound', shortcut: '⌘S' },
    { icon: <FileText size={16} />, label: 'Generate Log', shortcut: '⌘L' },
  ];

  const fileMenuItems: HeaderMenuItemProps[] = [
    {
      icon: <Save size={16} />,
      label: 'Save Project',
      shortcut: '⌘S',
      onClick: async () => {
        if (projectDirectoryHandle) {
          try {
            await saveProject();
            toast.success('Project saved successfully');
          } catch (error) {
            toast.error(`Failed to save project: ${error}`);
          }
        } else {
          onInitiateSaveAs();
          toast.info('Please specify project details to save.');
        }
      },
    },
    {
      icon: <UploadCloud size={16} />,
      label: 'Load Project',
      shortcut: '⌘O',
      onClick: async () => {
        try {
          await loadProject();
          toast.success('Project loaded successfully');
        } catch (error) {
          toast.error(`Failed to load project: ${error}`);
        }
      },
    },
    {
      icon: <UploadCloud size={16} />,
      label: 'Upload Video',
      shortcut: '⌘U',
      onClick: async () => {
        try {
          const videoId = await uploadVideo();
          if (videoId) {
            toast.success(`Video added to project: ${videoId}`);
          }
        } catch (error) {
          toast.error(`Failed to upload video: ${error}`);
        }
      },
    },
    { icon: <Download size={16} />, label: 'Export', shortcut: '⌘E' },
  ];

  const editMenuItems: HeaderMenuItemProps[] = [
    { icon: <Undo2 size={16} />, label: 'Undo', shortcut: '⌘Z' },
    { icon: <Redo2 size={16} />, label: 'Redo', shortcut: '⌘Y' },
    { icon: <Trash2 size={16} />, label: 'Clear Annotations', shortcut: '⌘D' },
  ];

  const viewMenuItems: HeaderMenuItemProps[] = [
    { icon: <ZoomIn size={16} />, label: 'Zoom In', shortcut: '⌘+' },
    { icon: <ZoomOut size={16} />, label: 'Zoom Out', shortcut: '⌘-' },
    {
      icon: <Maximize size={16} />,
      label: 'Fullscreen Toggle',
      shortcut: 'F11',
    },
    { icon: <Eye size={16} />, label: 'Show Annotations', shortcut: '⌘A' },
    { icon: <EyeOff size={16} />, label: 'Hide Annotations', shortcut: '⌘H' },
  ];

  const toolsMenuItems: HeaderMenuItemProps[] = [
    { icon: <Circle size={16} />, label: 'Draw Circle', shortcut: 'C' },
    { icon: <Square size={16} />, label: 'Draw Rectangle', shortcut: 'R' },
    { icon: <ArrowRight size={16} />, label: 'Draw Arrow', shortcut: 'A' },
    { icon: <Type size={16} />, label: 'Add Text Box', shortcut: 'T' },
  ];

  const helpMenuItems: HeaderMenuItemProps[] = [
    { icon: <HelpCircle size={16} />, label: 'User Guide', shortcut: 'F1' },
    { icon: <Info size={16} />, label: 'About VERA', shortcut: '' },
    { icon: <Headphones size={16} />, label: 'Contact Support', shortcut: '' },
  ];

  return (
    <header className="w-full h-14 border-b flex items-center justify-between px-3 bg-background dark:bg-sidebar dark:border-border backdrop-blur-md z-10">
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Menu size={20} />
        </Button>
        <div className="flex items-center mr-1 md:mr-4">
          <img src={veraLogo} alt="VERA Logo" className="h-8 w-auto" />
        </div>
        <div className="hidden sm:flex items-center space-x-1">
          <HeaderMenu label="File" items={fileMenuItems} />
          <HeaderMenu label="Edit" items={editMenuItems} />
          <HeaderMenu label="View" items={viewMenuItems} />
          <HeaderMenu label="Tools" items={toolsMenuItems} />
          <HeaderMenu label="Analyze" items={analyzeMenuItems} />
          <HeaderMenu label="Help" items={helpMenuItems} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onGoBackRequest}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleBookmarkSidebar}
          aria-label={
            isBookmarkSidebarOpen
              ? 'Close bookmark sidebar'
              : 'Open bookmark sidebar'
          }
        >
          <BookMarked
            size={20}
            className={`${isBookmarkSidebarOpen ? 'text-vera' : ''}`}
          />
        </Button>
      </div>
    </header>
  );
};

export default Header;
