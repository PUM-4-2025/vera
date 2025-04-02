import React, { useState } from 'react';
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
import { FolderOpen, PlusCircle, FileSymlink } from 'lucide-react';
import { useProject } from '@/contexts/ProjectContext';
import { toast } from 'sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';

const Welcome = () => {
  const navigate = useNavigate();
  const { loadProject, createProject } = useProject();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    projectName: '',
    projectDescription: '',
  });

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

  const handleCreateProject = async () => {
    try {
      if (!formData.projectName.trim()) {
        toast.error('Please enter a project name');
        return;
      }

      await createProject(formData.projectName, formData.projectDescription);
      navigate('/editor');
    } catch (error) {
      toast.error(`Failed to create project: ${error}`);
    }
  };

  return (
    <ThemeProvider>
      <div className="h-screen w-screen flex items-center justify-center bg-sidebar p-4">
        <div className="max-w-3xl w-full mx-auto">
          {!isCreating ? (
            <Card className="w-full">
              <CardHeader className="text-center">
                <img
                  src="/src/assets/vera_blagul.svg"
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
                    className="h-32 flex flex-col items-center justify-center gap-2 text-lg"
                    onClick={() => setIsCreating(true)}
                  >
                    <PlusCircle size={36} />
                    <span>Create New Project</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center gap-2 text-lg"
                    onClick={handleLoadProject}
                  >
                    <FolderOpen size={36} />
                    <span>Open Existing Project</span>
                  </Button>
                </div>
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
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Back
                </Button>
                <Button onClick={handleCreateProject}>Create Project</Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Welcome;
