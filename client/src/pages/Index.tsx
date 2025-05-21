import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import VideoPlayer from '@/components/VideoPlayer';
import { VideoElementRef } from '@/components/VideoElement';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { useProject } from '@/contexts/ProjectContext';
import { CreateProjectCard } from '@/components/CreateProjectCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projectDirectoryHandle,
    createProject,
    selectProjectLocation,
    isSaved,
    resetProject,
  } = useProject();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoElementRef = useRef<VideoElementRef>(null);

  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    projectDescription: '',
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    dirHandle: FileSystemDirectoryHandle | null;
    displayPath: string;
  }>({
    dirHandle: null,
    displayPath: '',
  });
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isQuickStart = location.state?.quickStart === true;
    if (!projectDirectoryHandle && !isQuickStart) {
      navigate('/');
    }
  }, [projectDirectoryHandle, navigate, location.state]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSelectLocation = async () => {
    try {
      const location = await selectProjectLocation();
      if (location) {
        setSelectedLocation({
          dirHandle: location,
          displayPath: `${location.name}`,
        });
      }
    } catch (error) {
      toast.error(`Failed to select location: ${error}`);
    }
  };

  const handleCreateProjectFromModal = async () => {
    try {
      if (!formData.projectName.trim()) {
        toast.error('Please enter a project name');
        return;
      }
      if (!selectedLocation.dirHandle) {
        toast.error('Please select a location for your project');
        return;
      }
      await createProject(
        formData.projectName,
        formData.projectDescription,
        selectedLocation.dirHandle
      );
      setIsSaveAsModalOpen(false);
      setFormData({ projectName: '', projectDescription: '' });
      setSelectedLocation({ dirHandle: null, displayPath: '' });
      toast.success('Project created and saved successfully!');
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
  };

  const handleCancelCreate = () => {
    setIsSaveAsModalOpen(false);
  };

  const initiateSaveAs = () => {
    setIsSaveAsModalOpen(true);
  };

  const handleGoBackRequest = () => {
    if (!isSaved) {
      setIsConfirmDialogOpen(true);
    } else {
      resetProject();
      navigate('/');
    }
  };

  const confirmGoBack = () => {
    resetProject();
    navigate('/');
    setIsConfirmDialogOpen(false);
  };

  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col">
        <Header
          toggleSidebar={toggleSidebar}
          isSidebarOpen={sidebarOpen}
          onInitiateSaveAs={initiateSaveAs}
          onGoBackRequest={handleGoBackRequest}
          videoElementRef={videoElementRef as React.RefObject<VideoElementRef>}
        />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} />

          <main
            className={`flex-1 p-3 transition-all ${sidebarOpen ? 'md:ml-0' : 'md:ml-0'} overflow-y-auto`}
            ref={mainContentRef}
          >
            <VideoPlayer ref={videoElementRef} />
          </main>
        </div>
      </div>

      <Dialog open={isSaveAsModalOpen} onOpenChange={setIsSaveAsModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Provide details for your new VERA project to save your current
              work.
            </DialogDescription>
          </DialogHeader>
          <CreateProjectCard
            formData={formData}
            selectedLocation={selectedLocation}
            onFormChange={handleFormChange}
            onSelectLocation={handleSelectLocation}
            onCreateProject={handleCreateProjectFromModal}
            onCancel={handleCancelCreate}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to close the
              project? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmGoBack}>
              Close Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};

export default Index;
