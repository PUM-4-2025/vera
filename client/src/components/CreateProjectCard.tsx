import React from 'react';
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
import { FolderOpen } from 'lucide-react';

interface CreateProjectCardProps {
  formData: {
    projectName: string;
    projectDescription: string;
  };
  selectedLocation: {
    dirHandle: FileSystemDirectoryHandle | null;
    displayPath: string;
  };
  onFormChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSelectLocation: () => Promise<void>;
  onCreateProject: () => Promise<void>;
  onCancel: () => void;
}

export const CreateProjectCard: React.FC<CreateProjectCardProps> = ({
  formData,
  selectedLocation,
  onFormChange,
  onSelectLocation,
  onCreateProject,
  onCancel,
}) => {
  return (
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
            onChange={onFormChange}
            required
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
            onChange={onFormChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectLocation">Project Location</Label>
          <div className="flex space-x-2">
            <Input
              id="projectLocation"
              name="projectLocation"
              value={
                selectedLocation.displayPath
                  ? `${
                      selectedLocation.displayPath
                    }/${formData.projectName
                      .trim()
                      .replace(/[^a-z0-9]/gi, '_')
                      .toLowerCase()}`
                  : 'Select a location...'
              }
              placeholder="Select a location for your project"
              readOnly
              className="flex-1"
            />
            <Button
              type="button"
              onClick={onSelectLocation}
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
          {!selectedLocation.displayPath && (
             <p className="text-xs text-muted-foreground mt-1">
                The project will be created in a new folder inside the selected location.
             </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button
          onClick={onCreateProject}
          disabled={
            !formData.projectName.trim() || !selectedLocation.dirHandle
          }
        >
          Create Project
        </Button>
      </CardFooter>
    </Card>
  );
}; 