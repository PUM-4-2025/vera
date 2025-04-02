import React from 'react';
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
  FolderOutput,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';

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

const editMenuItems: HeaderMenuItemProps[] = [
  { icon: <Undo2 size={16} />, label: 'Undo', shortcut: '⌘Z' },
  { icon: <Redo2 size={16} />, label: 'Redo', shortcut: '⌘Y' },
  { icon: <Trash2 size={16} />, label: 'Clear Annotations', shortcut: '⌘D' },
];

const viewMenuItems: HeaderMenuItemProps[] = [
  { icon: <ZoomIn size={16} />, label: 'Zoom In', shortcut: '⌘+' },
  { icon: <ZoomOut size={16} />, label: 'Zoom Out', shortcut: '⌘-' },
  { icon: <Maximize size={16} />, label: 'Fullscreen Toggle', shortcut: 'F11' },
  { icon: <Eye size={16} />, label: 'Show Annotations', shortcut: '⌘A' },
  { icon: <EyeOff size={16} />, label: 'Hide Annotations', shortcut: '⌘H' },
];

const toolsMenuItems: HeaderMenuItemProps[] = [
  { icon: <Circle size={16} />, label: 'Draw Circle', shortcut: 'C' },
  { icon: <Square size={16} />, label: 'Draw Rectangle', shortcut: 'R' },
  { icon: <ArrowRight size={16} />, label: 'Draw Arrow', shortcut: 'A' },
  { icon: <Type size={16} />, label: 'Add Text Box', shortcut: 'T' },
];

const analyzeMenuItems: HeaderMenuItemProps[] = [
  { icon: <Activity size={16} />, label: 'Detect Motion', shortcut: '⌘M' },
  { icon: <Volume2 size={16} />, label: 'Detect Sound', shortcut: '⌘S' },
  { icon: <FileText size={16} />, label: 'Generate Log', shortcut: '⌘L' },
];

const helpMenuItems: HeaderMenuItemProps[] = [
  { icon: <HelpCircle size={16} />, label: 'User Guide', shortcut: 'F1' },
  { icon: <Info size={16} />, label: 'About VERA', shortcut: '' },
  { icon: <Headphones size={16} />, label: 'Contact Support', shortcut: '' },
];

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { saveProject, loadProject, uploadVideo } = useProject();

  const fileMenuItems: HeaderMenuItemProps[] = [
    {
      icon: <Save size={16} />,
      label: 'Save Project',
      shortcut: '⌘S',
      onClick: () => {
        saveProject();
        toast.success('Project saved successfully');
      },
    },
    {
      icon: <Save size={16} />,
      label: 'Load Project',
      shortcut: '⌘O',
      onClick: () => {
        loadProject();
        toast.success('Project loaded successfully');
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

  return (
    <header className="w-full h-14 border-b flex items-center justify-between px-3 backdrop-blur-md z-10">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-vera-highlight/50 transition-colors md:hidden"
          aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center mr-1 md:mr-4">
          <img
            src="/src/assets/vera_blagul.svg"
            alt="VERA Logo"
            className="h-8 w-auto"
          />
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
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  );
};

export default Header;
