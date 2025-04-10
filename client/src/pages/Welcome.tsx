import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FolderOpen, PlusCircle, Clock, Moon, Sun } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import veraLogo from '../assets/vera_blagul.svg';
import {
  getThreeMostRecentProjects,
  RecentProject,
} from '@/utils/recentProjects';

const WelcomeContent = () => {
  const navigate = useNavigate();
  const {
    loadProject,
    loadProjectFromHandle,
    createProject,
    selectProjectLocation,
  } = useProject();
  const { theme, toggleTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
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

  useEffect(() => {
    // Load recent projects from localStorage
    setRecentProjects(getThreeMostRecentProjects());
  }, []);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoadProject = async () => {
    try {
      await loadProject();
      navigate('/editor');
    } catch (error) {
      toast.error(`Failed to load project: ${error}`);
    }
  };

  const handleLoadRecentProject = async (projectPath: string) => {
    try {
      await loadProjectFromHandle(projectPath);
      navigate('/editor');
    } catch (error) {
      console.error('Error loading recent project:', error);
      toast.error(`Failed to load recent project: ${error}`);

      // If the stored handle fails, fallback to manual selection
      try {
        toast.info('Trying to load project manually...');
        await loadProject();
        navigate('/editor');
      } catch (fallbackError) {
        toast.error(`Failed to load project manually: ${fallbackError}`);
      }
    }
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

  const handleCreateProject = async () => {
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
      navigate('/editor');
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-sidebar p-4">
      <div className="max-w-3xl w-full mx-auto">
        {!isCreating ? (
          <Card className="w-full">
            <CardHeader className="text-center relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="absolute right-4 top-4"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </Button>
              <img
                src={veraLogo}
                alt="VERA Logo"
                className="h-16 mx-auto mb-4"
              />
              <CardTitle className="text-3xl">Welcome to VERA</CardTitle>
              <CardDescription>
                Video Evidence Review and Analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 items-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <Button
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-2 text-lg hover:bg-primary/10"
                  onClick={() => setIsCreating(true)}
                >
                  <PlusCircle size={36} className="text-foreground" />
                  <span className="text-foreground">Create New Project</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-2 text-lg hover:bg-primary/10"
                  onClick={handleLoadProject}
                >
                  <FolderOpen size={36} className="text-foreground" />
                  <span className="text-foreground">Open Existing Project</span>
                </Button>
              </div>

              {recentProjects.length > 0 && (
                <div className="w-full mt-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center">
                    <Clock size={18} className="mr-2" />
                    Recent Projects
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {recentProjects.map((project) => (
                      <Button
                        key={project.path}
                        variant="outline"
                        className="flex flex-col items-start justify-start py-2 px-4 h-auto text-left hover:bg-primary/10"
                        onClick={() => handleLoadRecentProject(project.path)}
                      >
                        <div className="w-full flex justify-between items-center">
                          <div className="font-medium text-foreground">
                            {project.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Last opened:{' '}
                            {new Date(project.lastOpened).toLocaleDateString()}
                          </div>
                        </div>
                        {project.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {project.description}
                          </div>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              VERA v1.0.0 - PUM04
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Create New Project</CardTitle>
              <CardDescription>
                Provide details for your new VERA project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  name="projectName"
                  placeholder="My Video Analysis Project"
                  value={formData.projectName}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Description</Label>
                <Textarea
                  id="projectDescription"
                  name="projectDescription"
                  placeholder="Enter a description of your project (optional)"
                  rows={3}
                  value={formData.projectDescription}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectLocation">Project Location</Label>
                <div className="flex space-x-2">
                  <Input
                    id="projectLocation"
                    name="projectLocation"
                    value={
                      selectedLocation.displayPath +
                      '/' +
                      formData.projectName
                        .trim()
                        .replace(/[^a-z0-9]/gi, '_')
                        .toLowerCase()
                    }
                    placeholder="Select a location for your project"
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleSelectLocation}
                    className="shrink-0"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Browse
                  </Button>
                </div>
                {selectedLocation.displayPath && !formData.projectName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Please enter a project name to see the final path
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Back
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={
                  !formData.projectName.trim() || !selectedLocation.dirHandle
                }
              >
                Create Project
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

const Welcome = () => (
  <ThemeProvider>
    <WelcomeContent />
  </ThemeProvider>
);

export default Welcome;
