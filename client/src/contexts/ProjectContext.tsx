import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
  ReactNode,
} from 'react';
import { addRecentProject } from '@/utils/recentProjects';
import {
  storeDirectoryHandle,
  getDirectoryHandle,
  verifyPermission,
} from '@/utils/projectDatabase';
import { UploadSession, uploadMedia, uploadChunks } from '@/utils/uploadMedia';

// Define types for your project data
interface Metadata {
  name: string;
  projectDescription: string;
  projectCreated: string;
  projectUpdated: string;

  videoFiles: string[];
}

interface VideoData {
  name: string;
  objectURL: string;
  fileHandle: FileSystemFileHandle;
}

interface BookmarkData {
  name: string;
  description: string;
  objectURL: string;
  fileHandle: FileSystemFileHandle;
}

interface ProjectState {
  projectDirectoryHandle: FileSystemDirectoryHandle | null;
  metadata: Metadata | null;
  videos: Record<string, VideoData>;
  bookmarks: Record<string, BookmarkData>;
  isLoading: boolean;
  error: string | null;
  currentVideoId: string | null;
}

interface ProjectContextType extends ProjectState {
  loadProject: () => Promise<void>;
  loadProjectFromHandle: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  uploadVideo: () => Promise<string | undefined>;
  createProject: (
    name: string,
    description: string,
    dirHandle?: FileSystemDirectoryHandle
  ) => Promise<void>;
  updateBookmark: (videoId: string, newBookmarkData: BookmarkData) => void;
  setCurrentVideoId: (videoId: string | null) => void;
  selectProjectLocation: () => Promise<FileSystemDirectoryHandle | null>;
}

// Create initial state
const initialState: ProjectState = {
  projectDirectoryHandle: null,
  metadata: null,
  videos: {},
  bookmarks: {},
  isLoading: false,
  error: null,
  currentVideoId: null,
};

// Create the context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ProjectState>(initialState);

  // Clean up object URLs when unmounting or when videos change
  useEffect(() => {
    return () => {
      Object.values(state.videos).forEach((video) => {
        if (video.objectURL) URL.revokeObjectURL(video.objectURL);
      });
    };
  }, []); // Only run on unmount, not when videos change

  const loadProject = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Check if File System Access API is supported
      if (!('showDirectoryPicker' in window)) {
        throw new Error(
          'Your browser does not support the File System Access API'
        );
      }

      const dirHandle = await window.showDirectoryPicker();

      // Reset state for new project
      const newState = {
        ...initialState,
        projectDirectoryHandle: dirHandle,
        isLoading: true,
      };

      // 1. Load Metadata
      try {
        const metadataFileHandle =
          await dirHandle.getFileHandle('metadata.json');
        const metadataFile = await metadataFileHandle.getFile();
        const metadataText = await metadataFile.text();
        newState.metadata = JSON.parse(metadataText);
      } catch (e) {
        console.error('Failed to load metadata.json:', e);
        throw new Error('Could not load essential metadata.json');
      }

      const videoFiles = newState.metadata?.videoFiles || [];
      const videos: Record<string, VideoData> = {};
      const bookmarks: Record<string, BookmarkData> = {};

      // Get subdirectory handles
      let videosDirHandle: FileSystemDirectoryHandle | undefined;
      let bookmarksDirHandle: FileSystemDirectoryHandle | undefined;

      try {
        videosDirHandle = await dirHandle.getDirectoryHandle('videos');
      } catch (e) {
        console.warn('Videos directory not found:', e);
      }
      try {
        bookmarksDirHandle = await dirHandle.getDirectoryHandle('bookmarks');
      } catch (e) {
        console.warn('Bookmarks directory not found:', e);
      }

      // 2. Load Videos, Annotations, Bookmarks, Analysis concurrently
      await Promise.all(
        videoFiles.map(async (videoFilename) => {
          const videoId = videoFilename.split('.').slice(0, -1).join('.');

          // Load Video file
          if (videosDirHandle) {
            try {
              const fileHandle =
                await videosDirHandle.getFileHandle(videoFilename);
              const file = await fileHandle.getFile();
              // Revoke previous URL if reloading same video ID
              if (state.videos[videoId]?.objectURL) {
                URL.revokeObjectURL(state.videos[videoId].objectURL);
              }
              const objectURL = URL.createObjectURL(file);
              videos[videoId] = {
                name: videoFilename,
                objectURL,
                fileHandle,
              };
            } catch (e) {
              console.warn(`Could not load video ${videoFilename}:`, e);
            }
          }
          // Load Bookmarks
          if (bookmarksDirHandle) {
            try {
              const bmFileName = `${videoId}_bookmarks.json`;
              const bmFileHandle =
                await bookmarksDirHandle.getFileHandle(bmFileName);
              const bmFile = await bmFileHandle.getFile();
              bookmarks[videoId] = JSON.parse(await bmFile.text());
            } catch (e) {
              /* Expected if no bookmarks exist yet */
            }
          }
        })
      );

      newState.videos = videos;
      newState.bookmarks = bookmarks;

      // Select first video by default if any are loaded
      const firstVideoId = Object.keys(videos)[0];
      if (firstVideoId) {
        newState.currentVideoId = firstVideoId;
      }

      console.log('Project Loaded Successfully:', newState.metadata?.name);

      // Store directory handle in IndexedDB
      if (newState.metadata && dirHandle) {
        try {
          await storeDirectoryHandle(dirHandle.name, dirHandle);
        } catch (error) {
          console.warn('Could not store directory handle in IndexedDB:', error);
        }

        // Add to recent projects
        addRecentProject({
          name: newState.metadata.name,
          path: dirHandle.name,
          description: newState.metadata.projectDescription,
          lastOpened: new Date().toISOString(),
        });
      }

      setState({ ...newState, isLoading: false });
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error loading project:', err);
        setState((_) => ({
          ...initialState,
          error: err.message || 'Failed to load project.',
        }));
      } else {
        setState((s) => ({ ...s, isLoading: false })); // User cancelled
      }
    }
  }, [state.videos]);

  const loadProjectFromHandle = useCallback(
    async (path: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        // Get directory handle from IndexedDB
        const dirHandle = await getDirectoryHandle(path);

        if (!dirHandle) {
          throw new Error('Project directory not found in storage');
        }

        // Verify we have permission to access this directory
        const hasPermission = await verifyPermission(dirHandle);
        if (!hasPermission) {
          throw new Error('Permission denied to access project directory');
        }

        // Reset state for new project
        const newState = {
          ...initialState,
          projectDirectoryHandle: dirHandle,
          isLoading: true,
        };

        // 1. Load Metadata
        try {
          const metadataFileHandle =
            await dirHandle.getFileHandle('metadata.json');
          const metadataFile = await metadataFileHandle.getFile();
          const metadataText = await metadataFile.text();
          newState.metadata = JSON.parse(metadataText);
        } catch (e) {
          console.error('Failed to load metadata.json:', e);
          throw new Error('Could not load essential metadata.json');
        }

        const videoFiles = newState.metadata?.videoFiles || [];
        const videos: Record<string, VideoData> = {};
        const bookmarks: Record<string, BookmarkData> = {};

        // Get subdirectory handles
        let videosDirHandle: FileSystemDirectoryHandle | undefined;
        let bookmarksDirHandle: FileSystemDirectoryHandle | undefined;

        try {
          videosDirHandle = await dirHandle.getDirectoryHandle('videos');
        } catch (e) {
          console.warn('Videos directory not found:', e);
        }
        try {
          bookmarksDirHandle = await dirHandle.getDirectoryHandle('bookmarks');
        } catch (e) {
          console.warn('Bookmarks directory not found:', e);
        }

        // 2. Load Videos, Annotations, Bookmarks, Analysis concurrently
        await Promise.all(
          videoFiles.map(async (videoFilename) => {
            const videoId = videoFilename.split('.').slice(0, -1).join('.');

            // Load Video file
            if (videosDirHandle) {
              try {
                const fileHandle =
                  await videosDirHandle.getFileHandle(videoFilename);
                const file = await fileHandle.getFile();
                // Revoke previous URL if reloading same video ID
                if (state.videos[videoId]?.objectURL) {
                  URL.revokeObjectURL(state.videos[videoId].objectURL);
                }
                const objectURL = URL.createObjectURL(file);
                videos[videoId] = {
                  name: videoFilename,
                  objectURL,
                  fileHandle,
                };
              } catch (e) {
                console.warn(`Could not load video ${videoFilename}:`, e);
              }
            }
            // Load Bookmarks
            if (bookmarksDirHandle) {
              try {
                const bmFileName = `${videoId}_bookmarks.json`;
                const bmFileHandle =
                  await bookmarksDirHandle.getFileHandle(bmFileName);
                const bmFile = await bmFileHandle.getFile();
                bookmarks[videoId] = JSON.parse(await bmFile.text());
              } catch (e) {
                /* Expected if no bookmarks exist yet */
              }
            }
          })
        );

        newState.videos = videos;
        newState.bookmarks = bookmarks;

        // Select first video by default if any are loaded
        const firstVideoId = Object.keys(videos)[0];
        if (firstVideoId) {
          newState.currentVideoId = firstVideoId;
        }

        console.log(
          'Project Loaded Successfully from handle:',
          newState.metadata?.name
        );

        // Add to recent projects (updates the lastOpened timestamp)
        if (newState.metadata) {
          addRecentProject({
            name: newState.metadata.name,
            path: path,
            description: newState.metadata.projectDescription,
            lastOpened: new Date().toISOString(),
          });
        }

        setState({ ...newState, isLoading: false });
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('Error loading project from handle:', err);
          setState((_) => ({
            ...initialState,
            error: err.message || 'Failed to load project from handle.',
          }));
        } else {
          setState((s) => ({ ...s, isLoading: false }));
        }
      }
    },
    [state.videos]
  );

  const saveProject = useCallback(async () => {
    if (!state.projectDirectoryHandle) {
      setState((s) => ({
        ...s,
        error: 'No project directory loaded to save to.',
      }));
      return;
    }

    if (state.isLoading) return;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const dirHandle = state.projectDirectoryHandle;

      // 1. Save Metadata
      const metaFileHandle = await dirHandle.getFileHandle('metadata.json', {
        create: true,
      });
      const metaWritable = await metaFileHandle.createWritable();
      await metaWritable.write(JSON.stringify(state.metadata, null, 2));
      await metaWritable.close();

      // 2. Create subdirectories if they don't exist
      const bookmarksDirHandle = await dirHandle.getDirectoryHandle(
        'bookmarks',
        { create: true }
      );

      // Create a videos directory if it doesn't exist
      try {
        await dirHandle.getDirectoryHandle('videos');
      } catch (e) {
        await dirHandle.getDirectoryHandle('videos', {
          create: true,
        });
      }

      // 3. Save Bookmarks
      for (const [videoId, bookmarkData] of Object.entries(state.bookmarks)) {
        const bmFileName = `${videoId}_bookmarks.json`;
        const bmFileHandle = await bookmarksDirHandle.getFileHandle(
          bmFileName,
          { create: true }
        );
        const bmWritable = await bmFileHandle.createWritable();
        await bmWritable.write(JSON.stringify(bookmarkData, null, 2));
        await bmWritable.close();
      }

      console.log('Project saved successfully');
      setState((s) => ({
        ...s,
        isLoading: false,
      }));
    } catch (err: unknown) {
      console.error('Error saving project:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save project.';
      setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
    }
  }, [state]);

  const uploadVideo = useCallback(async (): Promise<string | undefined> => {
    if (!state.projectDirectoryHandle) {
      setState((s) => ({
        ...s,
        error: 'No project directory loaded to upload to.',
      }));
      return undefined;
    }

    if (state.isLoading) return undefined;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Create file input element
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/*';

      // Create promise that will resolve with the selected file
      const filePromise = new Promise<File | null>((resolve) => {
        // Handle file selection
        fileInput.addEventListener('change', () => {
          const files = fileInput.files;
          if (files && files.length > 0) {
            // TypeScript needs this assertion to be sure the file exists
            const file = files[0] as File;
            resolve(file);
          } else {
            resolve(null);
          }
        });

        // Handle cancellation
        window.addEventListener(
          'focus',
          () => {
            setTimeout(() => {
              if (!fileInput.files || fileInput.files.length === 0) {
                resolve(null);
              }
            }, 300);
          },
          { once: true }
        );
      });

      // Show file dialog
      fileInput.click();

      // Wait for user to select a file
      const file = await filePromise;

      // If no file was selected, stop here
      if (!file) {
        setState((s) => ({ ...s, isLoading: false }));
        return undefined;
      }

      // Begin upload to server
      const uploadSession = await uploadMedia(file);

      // At this point, TypeScript should know file is not null
      // Get the file name and make sure it exists
      const fileName = file.name;

      // Create video ID from filename (without extension)
      const videoId = fileName.split('.').slice(0, -1).join('.');
      // Extract file extension (or use mp4 as default)
      const extension = fileName.split('.').pop() || 'mp4';

      // Create final filename
      const videoFileName = `${videoId}.${extension}`;

      // Get videos directory
      const videosDirHandle =
        await state.projectDirectoryHandle.getDirectoryHandle('videos', {
          create: true,
        });

      // Save file to videos directory
      const videoFileHandle = await videosDirHandle.getFileHandle(
        videoFileName,
        { create: true }
      );
      const writable = await videoFileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      // Create URL for video preview
      const objectURL = URL.createObjectURL(file);

      // Begin upload to server
      const uploadSession = await uploadMedia(file);

      // Update state with new video
      setState((prevState) => {
        // Update metadata to include new video
        const updatedMetadata = prevState.metadata
          ? {
              ...prevState.metadata,
              videoFiles: [
                ...(prevState.metadata.videoFiles || []),
                videoFileName,
              ],
              projectUpdated: new Date().toISOString(),
            }
          : null;

        // Preserve existing videos and their blob URLs
        // Add the new video to the videos object without affecting existing ones
        return {
          ...prevState,
          metadata: updatedMetadata,
          videos: {
            ...prevState.videos,
            [videoId]: {
              name: videoFileName,
              objectURL,
              fileHandle: videoFileHandle,
            },
          },
          currentVideoId: videoId,
          isLoading: false,
        };
      });

      // Save changes to disk
      await saveProject();
      console.log('Video uploaded successfully:', videoId);

      return videoId;
    } catch (err: unknown) {
      console.error('Error uploading video:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload video.';
      setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
      return undefined;
    }
  }, [
    state.projectDirectoryHandle,
    state.isLoading,
    state.metadata,
    saveProject,
  ]);

  // Action to update bookmark data
  const updateBookmark = useCallback(
    (videoId: string, newBookmarkData: BookmarkData) => {
      setState((s) => ({
        ...s,
        bookmarks: {
          ...s.bookmarks,
          [videoId]: newBookmarkData,
        },
      }));
    },
    []
  );

  // Action to set current video
  const setCurrentVideoId = useCallback((videoId: string | null) => {
    setState((s) => ({ ...s, currentVideoId: videoId }));
  }, []);

  // Add this new function inside the ProjectProvider component
  const createProject = useCallback(
    async (
      name: string,
      description: string,
      projectDirHandle?: FileSystemDirectoryHandle
    ) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        // Check if File System Access API is supported
        if (!('showDirectoryPicker' in window)) {
          throw new Error(
            'Your browser does not support the File System Access API'
          );
        }

        // If no directory handle is provided, prompt user to select one
        let parentDirHandle = projectDirHandle;
        if (!parentDirHandle) {
          parentDirHandle = await window.showDirectoryPicker({
            id: 'veraProject',
            mode: 'readwrite',
          });
        }

        // Create a sanitized project name for the directory
        const projectDirName = name
          .trim()
          .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
          .toLowerCase(); // Convert to lowercase

        if (projectDirName === '') {
          throw new Error(
            'Project name must contain at least one alphanumeric character'
          );
        }

        // Create a subdirectory with the project name
        let projectSubDirHandle;
        try {
          projectSubDirHandle = await parentDirHandle.getDirectoryHandle(
            projectDirName,
            { create: true }
          );
        } catch (e) {
          console.error('Failed to create project subdirectory:', e);
          throw new Error(
            `Could not create project folder "${projectDirName}"`
          );
        }

        // Create basic metadata
        const metadata: Metadata = {
          name,
          projectDescription: description || '',
          projectCreated: new Date().toISOString(),
          projectUpdated: new Date().toISOString(),
          videoFiles: [],
        };

        // Create project structure inside the subdirectory
        try {
          await projectSubDirHandle.getDirectoryHandle('videos', {
            create: true,
          });
          await projectSubDirHandle.getDirectoryHandle('bookmarks', {
            create: true,
          });
        } catch (e) {
          console.error('Failed to create project subdirectories:', e);
          throw new Error('Could not create project structure');
        }

        // Save metadata file
        try {
          const metadataFileHandle = await projectSubDirHandle.getFileHandle(
            'metadata.json',
            { create: true }
          );
          const metadataWritable = await metadataFileHandle.createWritable();
          await metadataWritable.write(JSON.stringify(metadata, null, 2));
          await metadataWritable.close();
        } catch (e) {
          console.error('Failed to write metadata.json:', e);
          throw new Error('Could not create metadata.json');
        }

        // Update application state with the new project
        setState((_) => ({
          ...initialState,
          projectDirectoryHandle: projectSubDirHandle,
          metadata,
          isLoading: false,
        }));

        console.log('Project Created Successfully:', name);

        // Store directory handle in IndexedDB
        if (projectSubDirHandle) {
          try {
            await storeDirectoryHandle(
              projectSubDirHandle.name,
              projectSubDirHandle
            );
          } catch (error) {
            console.warn(
              'Could not store directory handle in IndexedDB:',
              error
            );
          }

          // Add to recent projects
          addRecentProject({
            name,
            path: projectSubDirHandle.name,
            description: description,
            lastOpened: new Date().toISOString(),
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error creating project:', err);
          setState((_) => ({
            ...initialState,
            error: err.message || 'Failed to create project.',
          }));
        } else {
          setState((s) => ({ ...s, isLoading: false })); // User cancelled
        }
      }
    },
    []
  );

  // Add new selectProjectLocation function
  const selectProjectLocation =
    useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
      try {
        // Check if File System Access API is supported
        if (!('showDirectoryPicker' in window)) {
          throw new Error(
            'Your browser does not support the File System Access API'
          );
        }

        // Show directory picker to select a location
        const dirHandle = await window.showDirectoryPicker({
          id: 'veraProjectLocation',
          mode: 'readwrite',
        });

        return dirHandle;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error selecting project location:', err);
          throw err;
        }
        // User cancelled - return null
        return null;
      }
    }, []);

  // Value provided to consumers
  const contextValue: ProjectContextType = {
    ...state,
    loadProject,
    loadProjectFromHandle,
    saveProject,
    uploadVideo,
    createProject,
    updateBookmark,
    setCurrentVideoId,
    selectProjectLocation,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// Custom hook for consuming the context
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
