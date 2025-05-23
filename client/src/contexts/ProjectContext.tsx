import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
  ReactNode,
  useRef,
} from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { addRecentProject } from '@/utils/recentProjects';
import {
  storeDirectoryHandle,
  getDirectoryHandle,
  verifyPermission,
} from '@/utils/projectDatabase';
import { useFFmpeg } from './FFmpegContext';
import { uploadMedia, uploadChunks, uploadStatus } from '@/utils/uploadMedia';
import { ffmpegWorkerPool } from '@/utils/ffmpegWorkerPool';
import { useAnalysis } from './AnalysisContext';

// Import types from the dedicated types file
import {
  Metadata,
  VideoEntry,
  ProjectState,
  ProjectContextType,
  CurrentFrame,
  VideoFFmpegHandle,
  ShapeData,
  VideoAnnotationData,
  FrameCache,
  VideoElementApi,
  BookmarkEntry,
  TaskStatus,
} from '@/types/project';

// Import utility functions
import {
  loadProjectLogic,
  createProjectLogic,
  saveProjectLogic,
  uploadVideoLogic,
} from '@/utils/projectUtils';
import { fetchFile } from '@ffmpeg/util';
import { toast } from 'sonner';
import { SrvRecord } from 'dns';

// --- Constants for Cache Configuration ---
const FRAME_CACHE_MAX_SIZE = 20;
const FRAMES_TO_CACHE_AROUND_CENTER = 3;
// --- End Constants ---

const defaultMetadata: Metadata = {
  name: 'Untitled Project',
  projectDescription: '',
  projectCreated: new Date().toISOString(),
  projectUpdated: new Date().toISOString(),
  videos: {},
  annotationFiles: [],
  bookmarkFiles: [],
  analysisFiles: [],
};

// Create initial state (conforms to ProjectState type)
const initialState: ProjectState = {
  projectDirectoryHandle: null,
  metadata: defaultMetadata,
  videos: {},
  bookmarks: {},
  annotations: {},
  analysis: {},
  isLoading: false,
  error: null,
  currentVideoId: null,
  isSaved: true,
  currentFrame: null,
  frameCache: {
    frames: new Map(),
    maxSize: FRAME_CACHE_MAX_SIZE,
    recentlyUsed: [],
  },
  videoApi: null,
};

// Create the context
const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Provider component
export const ProjectProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<ProjectState>(initialState);
  const { ffmpeg } = useFFmpeg();
  const justSavedRef = useRef(false);
  const justLoadedRef = useRef(false);
  const { updateHistogram } = useAnalysis();

  // Helper function to manage object URL cleanup
  const manageObjectUrlCleanup = useCallback(() => {
    // Store the object URLs currently in state when the component mounts
    const initialObjectUrls = Object.values(state.videos)
      .map((v) => v.objectURL)
      .filter((url) => !!url) as string[];
    return () => {
      // Revoke any URLs that were present initially or created during the component's lifetime
      // This is a broad cleanup; more precise cleanup happens in loadProjectLogic
      console.log('ProjectContext unmounting, revoking Object URLs');
      const currentObjectUrls = Object.values(state.videos)
        .map((v) => v.objectURL)
        .filter((url) => !!url) as string[];
      // Combine initial and current in case state cleared without revocation
      const allUrls = new Set([...initialObjectUrls, ...currentObjectUrls]);
      allUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [state.videos]);

  // Clean up object URLs when unmounting
  // This useEffect should ONLY run on unmount, so its dependency array is empty.
  // Object URLs are now created/revoked within the logic functions.
  useEffect(() => {
    const cleanup = manageObjectUrlCleanup();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array: Run only on mount and unmount

  /**
   * Updates the state with loaded project data.
   * @param loadedData - The data loaded from the project directory.
   * @param dirHandle - The directory handle of the loaded project.
   */
  const updateStateWithLoadedData = useCallback(
    (
      loadedData: {
        metadata: Metadata | null;
        videos: Record<string, VideoEntry>;
        annotations: Record<string, VideoAnnotationData>;
        currentVideoId: string | null;
      },
      dirHandle: FileSystemDirectoryHandle
    ) => {
      setState((s) => ({
        ...s, // Start with the previous state
        // Explicitly update fields from loaded data or reset them
        projectDirectoryHandle: dirHandle,
        metadata: loadedData.metadata ?? defaultMetadata, // Use default if loaded is null
        videos: loadedData.videos,
        annotations: loadedData.annotations,
        bookmarks: {}, // TODO: Add bookmarks
        analysis: {}, // TODO: Add analysis
        currentVideoId: loadedData.currentVideoId,
        isLoading: false,
        error: null, // Clear any previous errors
        isSaved: true,
        videoApi: null,
      }));
    },
    []
  );

  /**
   * Performs post-load actions such as storing the directory handle and updating recent projects.
   * @param dirHandle - The directory handle of the loaded project.
   * @param metadata - The metadata of the loaded project.
   * @param path - The path or name used as the key in IndexedDB.
   */
  const performPostLoadActions = useCallback(
    async (
      dirHandle: FileSystemDirectoryHandle,
      metadata: Metadata | null,
      path: string
    ) => {
      if (metadata) {
        try {
          await storeDirectoryHandle(dirHandle.name, dirHandle);
          addRecentProject({
            name: metadata.name,
            path: path,
            description: metadata.projectDescription,
            lastOpened: new Date().toISOString(),
          });
        } catch (postLoadError) {
          console.warn(
            'Post-load actions failed (IndexedDB/RecentProjects):',
            postLoadError
          );
        }
      }
    },
    []
  );

  /**
   * Prompts the user to select a project directory and loads the project.
   */
  const loadProject = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    let dirHandle: FileSystemDirectoryHandle | null = null;
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error(
          'File System Access API is not supported in your browser.'
        );
      }
      dirHandle = await window.showDirectoryPicker();
      if (!dirHandle) throw new Error('No directory selected.'); // Should not happen unless API changes

      // Call the utility function to perform loading logic
      const loadedData = await loadProjectLogic(dirHandle, state.videos);

      // Update state with the loaded data
      updateStateWithLoadedData(loadedData, dirHandle);

      // Update the ref to indicate that we just loaded
      justLoadedRef.current = true;

      // Post-load actions
      await performPostLoadActions(
        dirHandle,
        loadedData.metadata,
        dirHandle.name
      );

      console.log('Project Loaded Successfully:', loadedData.metadata?.name);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error loading project:', err);
        setState((_) => ({
          ...initialState,
          error: err.message || 'Failed to load project.',
        }));
      } else {
        // User cancelled the directory picker or another AbortError
        setState((s) => ({ ...s, isLoading: false }));
      }
    }
    // state.videos is passed to loadProjectLogic to handle URL revocation, but
    // loadProject itself shouldn't re-run just because videos change in state.
    // It runs on user action.
  }, [state.videos, updateStateWithLoadedData, performPostLoadActions]);

  /**
   * Loads a project from a previously stored directory handle path (IndexedDB).
   * @param path - The name/path used as the key in IndexedDB.
   */
  const loadProjectFromHandle = useCallback(
    async (path: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const dirHandle = await getDirectoryHandle(path);
        if (!dirHandle) {
          throw new Error(
            `Project directory "${path}" not found in storage. It may have been moved or deleted.`
          );
        }

        // Verify permission - this might re-prompt the user
        const hasPermission = await verifyPermission(dirHandle);
        if (!hasPermission) {
          throw new Error(
            `Permission denied to access project directory "${path}". Please grant access.`
          );
        }

        // Reuse the main loading logic function
        const loadedData = await loadProjectLogic(dirHandle, state.videos);

        // Update state with the loaded data
        updateStateWithLoadedData(loadedData, dirHandle);

        // Update the ref to indicate that we just loaded
        justLoadedRef.current = true;

        // Update recent projects timestamp
        await performPostLoadActions(dirHandle, loadedData.metadata, path);

        console.log(
          'Project Loaded Successfully from handle:',
          loadedData.metadata?.name
        );
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('Error loading project from handle:', err);
          setState((_) => ({
            ...initialState,
            error: err.message || 'Failed to load project from stored handle.',
          }));
        } else {
          setState((s) => ({ ...s, isLoading: false })); // Should not happen
        }
      }
      // Dependency justification similar to loadProject
    },
    [state.videos, updateStateWithLoadedData, performPostLoadActions]
  );

  /**
   * Saves the current project state (metadata, bookmarks) to disk.
   * Returns the updated metadata or null if saving failed.
   */
  const saveProject = useCallback(async (): Promise<Metadata | null> => {
    if (!state.projectDirectoryHandle) {
      const errorMsg = 'No project directory loaded to save to.';
      setState((s) => ({ ...s, error: errorMsg }));
      console.error(errorMsg);
      return null;
    }
    if (state.isLoading) {
      console.warn('Save operation skipped: Another operation is in progress.');
      return state.metadata;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const result = await saveProjectLogic({
        ...state,
        projectDirectoryHandle: state.projectDirectoryHandle,
        metadata: state.metadata,
      });
      setState((s) => ({
        ...s,
        metadata: result.updatedMetadata,
        isLoading: false,
        isSaved: true,
      }));
      justSavedRef.current = true;
      console.log('Project saved successfully');
      return result.updatedMetadata;
    } catch (err: unknown) {
      console.error('Error saving project:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to save project.';
      setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
      return null;
    }
  }, [
    state.projectDirectoryHandle,
    state.metadata,
    state.isLoading,
    state.videos,
    state.bookmarks,
    state.annotations,
    state.analysis,
  ]);

  /**
   * Updates the state with a new video entry after upload.
   * @param videoId - The ID of the uploaded video.
   * @param videoEntry - The video entry data.
   */
  const updateVideoState = useCallback(
    (videoId: string, videoEntry: VideoEntry) => {
      setState((s) => ({
        ...s,
        videos: {
          ...s.videos,
          [videoId]: {
            ...videoEntry,
            uploadStatus: videoEntry.uploadStatus || { type: 'not_uploaded' },
            taskStatus: videoEntry.taskStatus || { type: 'not_started' },
          } as VideoEntry,
        },
        currentVideoId: videoId,
        isLoading: false,
        error: null,
        frameCache: {
          frames: new Map(),
          maxSize: FRAME_CACHE_MAX_SIZE,
          recentlyUsed: [],
        },
        currentFrame: null,
      }));
    },
    []
  );

  /**
   * Prompts the user to select a video file, processes it, and adds it to the project state.
   * @returns The videoId of the uploaded video, or undefined on failure/cancellation.
   */
  const uploadVideoToFFmpeg = async (
    file: File,
    ffmpeg: FFmpeg
  ): Promise<VideoFFmpegHandle> => {
    const filename = `video-${Date.now()}.mp4`;
    await ffmpeg.writeFile(filename, await fetchFile(file));
    return { filename, file };
  };

  const uploadVideo = useCallback(async (): Promise<string | undefined> => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    let file: File | null = null;

    try {
      // --- Simplified File Picker Logic ---
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'video/*';
      fileInput.style.display = 'none'; // Keep it hidden

      const filePromise = new Promise<File | null>((resolve) => {
        const onChange = () => {
          const files = fileInput.files;
          if (files && files.length > 0 && files[0]) {
            console.log('File selected:', files[0].name);
            resolve(files[0]);
          } else {
            // No file selected, or user cancelled the dialog
            console.log(
              'File selection dialog closed without selection (onChange triggered).'
            );
            resolve(null);
          }
          cleanup(); // Clean up listeners and input element
        };

        // Function to remove listeners and the input element
        const cleanup = () => {
          fileInput.removeEventListener('change', onChange);
          // No longer need focus listener or its check
          if (document.body.contains(fileInput)) {
            document.body.removeChild(fileInput);
          }
          console.log('File input cleaned up.');
        };

        // IMPORTANT: Add the change listener *before* clicking
        fileInput.addEventListener('change', onChange);

        // Add the input to the DOM temporarily to allow click()
        document.body.appendChild(fileInput);
        fileInput.click();

        // Note: If the user closes the dialog without selecting *anything*,
        // the 'change' event might not fire reliably across all browsers.
        // However, resolving with null in the onChange when files.length is 0
        // covers the most common cancellation/no-selection scenario.
      });

      file = await filePromise;
      // --- End File Picker Logic ---

      if (!file) {
        // This log message should now only appear if the promise genuinely resolved with null
        console.log('Video upload cancelled by user or no file selected.');
        setState((s) => ({ ...s, isLoading: false }));
        return undefined;
      }

      // Upload to FFmpeg filesystem
      const ffmpegHandle = await uploadVideoToFFmpeg(file, ffmpeg as FFmpeg);

      // --- Process Video and Update State ---
      const result = await uploadVideoLogic(
        file,
        ffmpeg as FFmpeg,
        state.metadata as Metadata
      );

      // Set the updated metadata in the state *before* calling updateVideoState
      setState((s) => ({ ...s, metadata: result.updatedMetadata }));

      // Update state with the new video, including the FFmpeg handle and initial upload status
      updateVideoState(result.videoId, {
        ...result.videoEntry,
        ffmpegHandle,
        uploadStatus: { type: 'not_uploaded' }, // Initial status before server upload
      });
      console.log('Video added to state:', result.videoId);

      // --- Server Upload ---
      const videoId = result.videoId; // Capture videoId for use in async operations
      // Set status to uploading before starting
      setState((s) => {
        const currentVideo = s.videos[videoId];
        if (!currentVideo) return s; // Should exist as we just added it
        return {
          ...s,
          videos: {
            ...s.videos,
            [videoId]: {
              ...currentVideo,
              uploadStatus: { type: 'uploading', percentage: 0 },
            } as VideoEntry,
          },
        };
      });

      const uploadSession = await uploadMedia(file);

      if (uploadSession != null) {
        // Non-blocking progress update
        (async () => {
          const sleep = (ms: number) =>
            new Promise((resolve) => setTimeout(resolve, ms));
          let done = false;
          try {
            // Create a promise for uploadChunks so we can know when it is done
            uploadChunks(uploadSession)
              .then((result) => {
                console.log(
                  'All chunks uploaded and completion notified:',
                  result
                );
                done = true;
                toast.success('Video uploaded successfully');
                // Optionally update state here to reflect upload completion immediately
                setState((s) => {
                  const currentVideo = s.videos[videoId];
                  if (!currentVideo) return s;
                  return {
                    ...s,
                    videos: {
                      ...s.videos,
                      [videoId]: {
                        ...currentVideo,
                        uploadStatus: { type: 'uploaded' },
                      } as VideoEntry,
                    },
                  };
                });
                return result; // Continue the promise chain if needed
              })
              .catch((chunkError) => {
                console.error('Error during chunk upload:', chunkError);
                setState((s) => {
                  const currentVideo = s.videos[videoId];
                  if (!currentVideo) return s;
                  return {
                    ...s,
                    videos: {
                      ...s.videos,
                      [videoId]: {
                        ...currentVideo,
                        uploadStatus: {
                          type: 'failed',
                          error:
                            chunkError instanceof Error
                              ? chunkError.message
                              : 'Chunk upload failed',
                        },
                      } as VideoEntry,
                    },
                  };
                });
              });

            for (;;) {
              await sleep(1000); // Check status every 1 seconds
              if (done) {
                break;
              }
              const status = await uploadStatus(uploadSession.uploadId);
              console.log('Upload status:', status);
              const uploadProgress =
                status.totalChunks > 0
                  ? 100 * (status.completedChunks / status.totalChunks)
                  : 0;

              setState((s) => {
                const currentVideo = s.videos[videoId];
                if (!currentVideo) return s; // Guard against video being deleted mid-upload
                return {
                  ...s,
                  videos: {
                    ...s.videos,
                    [videoId]: {
                      ...currentVideo,
                      uploadStatus: {
                        type: 'uploading',
                        percentage: uploadProgress,
                      },
                    } as VideoEntry,
                  },
                };
              });

              if (status.status === 'Completed' || uploadProgress >= 100) {
                console.log('Upload completed or progress >= 100');
                break;
              }
              if (status.status === 'Failed') {
                throw new Error('Server reported upload failure.');
              }
            }

            setState((s) => {
              const currentVideo = s.videos[videoId];
              if (!currentVideo) return s;
              return {
                ...s,
                videos: {
                  ...s.videos,
                  [videoId]: {
                    ...currentVideo,
                    uploadStatus: { type: 'uploaded' },
                  } as VideoEntry,
                },
              };
            });
            // Tell server to perform audio analysis on video
            updateHistogram(file.name);
          } catch (uploadError) {
            console.error(
              'Error monitoring upload status or upload failed:',
              uploadError
            );
            setState((s) => {
              const currentVideo = s.videos[videoId];
              if (!currentVideo) return s;
              return {
                ...s,
                videos: {
                  ...s.videos,
                  [videoId]: {
                    ...currentVideo,
                    uploadStatus: {
                      type: 'failed',
                      error:
                        uploadError instanceof Error
                          ? uploadError.message
                          : 'Upload monitoring failed',
                    },
                  } as VideoEntry,
                },
              };
            });
          }
        })();
      } else {
        setState((s) => {
          const currentVideo = s.videos[videoId];
          if (!currentVideo) return s;
          return {
            ...s,
            videos: {
              ...s.videos,
              [videoId]: {
                ...currentVideo,
                uploadStatus: { type: 'uploaded' },
              } as VideoEntry,
            },
          };
        });
        // Tell server to perform audio analysis on video
        updateHistogram(file.name);
      }

      return result.videoId;
    } catch (err: unknown) {
      console.error('Error uploading video:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload video.';

      // Revoke object URL if it was created before the error occurred
      if (file) {
        const videoId = getVideoIdFromFilename(file.name);
        const videoEntry = state.videos[videoId];
        if (videoEntry?.objectURL) {
          try {
            console.log(
              `Attempting to revoke object URL for failed upload: ${videoEntry.objectURL}`
            );
            URL.revokeObjectURL(videoEntry.objectURL);
          } catch (revokeError) {
            console.warn(
              `Error revoking object URL for ${videoId} during error handling:`,
              revokeError
            );
          }
        }
      }

      setState((s) => ({ ...s, isLoading: false, error: errorMessage }));
      return undefined;
    }
  }, [
    state.projectDirectoryHandle,
    state.metadata,
    state.videos,
    ffmpeg,
    updateVideoState,
  ]);

  /**
   * Creates a new project directory and initializes it with metadata.
   * @param name - Project name.
   * @param description - Project description.
   * @param dirHandle - Optional: A pre-selected directory handle to create the project folder within.
   */
  const createProject = useCallback(
    async (
      name: string,
      description: string,
      projectDirHandle: FileSystemDirectoryHandle
    ) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const parentDirHandle = projectDirHandle;

        // Call utility function to handle directory/file creation
        const result = await createProjectLogic(
          parentDirHandle,
          name,
          description,
          state
        );

        // Update state with the newly created project data
        setState((prev) => ({
          ...prev,
          projectDirectoryHandle: result.projectDirectoryHandle,
          metadata: result.metadata,
          isLoading: false,
          error: null,
          isSaved: true,
        }));

        await saveProjectLogic({
          ...state,
          projectDirectoryHandle: result.projectDirectoryHandle,
          metadata: result.metadata,
        });

        // Update the ref to indicate that we just saved
        justSavedRef.current = true;

        // Post-creation actions: Store handle and add to recent projects
        try {
          await storeDirectoryHandle(
            result.projectDirectoryHandle.name,
            result.projectDirectoryHandle
          ); // Use correct handle
          addRecentProject({
            name: result.metadata.name,
            path: result.projectDirectoryHandle.name, // Use correct path/name
            description: result.metadata.projectDescription,
            lastOpened: new Date().toISOString(),
          });
        } catch (postCreateError) {
          console.warn(
            'Post-creation actions failed (IndexedDB/RecentProjects):',
            postCreateError
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error creating project:', err);
          setState((_) => ({
            ...initialState,
            error: err.message || 'Failed to create project.',
          }));
        } else {
          // User cancelled directory picker
          setState((s) => ({ ...s, isLoading: false }));
        }
      }
    },
    [state]
  );

  /**
   * Sets the currently active video ID.
   */
  const setCurrentVideoId = useCallback(
    (videoId: string | null) => {
      if (videoId === null || state.videos[videoId]) {
        setState((s) => ({
          ...s,
          currentVideoId: videoId,
          frameCache: {
            frames: new Map(),
            maxSize: FRAME_CACHE_MAX_SIZE,
            recentlyUsed: [],
          },
          currentFrame: null,
        }));
      } else {
        console.warn(
          `Attempted to set currentVideoId to non-existent video: ${videoId}`
        );
      }
    },
    [state.videos]
  );

  /**
   * Prompts the user to select a directory, intended for use *before* creating a project.
   * @returns The selected directory handle or null if cancelled.
   */
  const selectProjectLocation =
    useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
      try {
        if (!('showDirectoryPicker' in window)) {
          throw new Error('File System Access API not supported.');
        }
        const dirHandle = await window.showDirectoryPicker({
          id: 'veraProject',
          mode: 'readwrite',
        });
        return dirHandle;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error selecting project location:', err);
          // Re-throw the error to be handled by the caller (e.g., UI)
          throw err;
        }
        // User cancelled - return null
        return null;
      }
    }, []);

  const updateFrameCache = useCallback(
    (
      framesToAdd: CurrentFrame[],
      currentFrameCache: FrameCache
    ): FrameCache => {
      // Create new Map from the current cache's frames
      const newFramesMap = new Map(currentFrameCache.frames);

      // Add all frames to the cache
      framesToAdd.forEach((frame) => {
        newFramesMap.set(frame.frameNumber, frame);
      });

      // Update recently used list with all new frames
      const newRecentlyUsed = [
        ...framesToAdd.map((f) => f.frameNumber),
        ...currentFrameCache.recentlyUsed.filter(
          (n) => !framesToAdd.some((f) => f.frameNumber === n)
        ),
      ].slice(0, FRAME_CACHE_MAX_SIZE);

      // If we've exceeded the cache size, remove the least recently used frames
      while (
        newFramesMap.size > FRAME_CACHE_MAX_SIZE &&
        newRecentlyUsed.length > 0
      ) {
        const leastRecent = newRecentlyUsed.pop();
        if (leastRecent !== undefined) {
          newFramesMap.delete(leastRecent);
        }
      }

      return {
        // Return only the FrameCache object
        frames: newFramesMap,
        maxSize: FRAME_CACHE_MAX_SIZE,
        recentlyUsed: newRecentlyUsed,
      };
    },
    []
  );

  const getCachedFrame = useCallback(
    (frameNumber: number): CurrentFrame | null => {
      return state.frameCache.frames.get(frameNumber) || null;
    },
    [state.frameCache]
  );

  const cacheSurroundingFrames = useCallback(
    async (videoId: string, centerFrameNumber: number) => {
      const video = state.videos[videoId];
      // Ensure video, file, and metadata are available
      if (!video?.file || !video.metadata) {
        console.warn(
          'Video file or metadata not available for caching surrounding frames.'
        );
        return;
      }

      const fps = video.metadata.fps || 30;
      const frameDuration = 1 / fps;
      const totalFrames = video.metadata.totalFrames; // Get totalFrames from metadata

      const frameNumbersToConsider: number[] = [];
      for (let i = 1; i <= FRAMES_TO_CACHE_AROUND_CENTER; i++) {
        frameNumbersToConsider.push(centerFrameNumber - i);
        frameNumbersToConsider.push(centerFrameNumber + i);
      }

      const framesToCache = frameNumbersToConsider.filter(
        (n) =>
          n >= 0 && // Frame number is not negative
          (totalFrames === undefined || n < totalFrames) && // Frame number is within video bounds (if totalFrames is known)
          !state.frameCache.frames.has(n) // Frame is not already in cache
      );

      if (framesToCache.length === 0) {
        // console.log('All surrounding frames already cached or out of bounds'); // More accurate log
        return;
      }

      try {
        // Capture all frames in parallel using Promise.allSettled
        const framePromises = framesToCache.map(async (frameNumber) => {
          const timestamp = frameNumber * frameDuration;
          const blobUrl = await ffmpegWorkerPool.captureFrame(
            video.file!,
            timestamp,
            video.ffmpegHandle
          );
          return { timestamp, frameNumber, blobUrl } as CurrentFrame;
        });

        const results = await Promise.allSettled(framePromises);
        const successfullyCapturedFrames = results
          .filter((result) => result.status === 'fulfilled')
          .map(
            (result) => (result as PromiseFulfilledResult<CurrentFrame>).value
          );

        if (successfullyCapturedFrames.length > 0) {
          setState((prevState) => ({
            ...prevState,
            frameCache: updateFrameCache(
              successfullyCapturedFrames,
              prevState.frameCache
            ),
          }));
        }

        // Optional: Log rejected promises for debugging
        results.forEach((result) => {
          if (result.status === 'rejected') {
            console.error(
              'Failed to capture a surrounding frame:',
              result.reason
            );
          }
        });

        // console.log(`Successfully attempted to cache ${successfullyCapturedFrames.length} surrounding frames out of ${framesToCache.length} candidates.`);
      } catch (error) {
        // This catch is for errors in the setup of Promise.allSettled, not individual promise rejections
        console.error('Error in cacheSurroundingFrames dispatch logic:', error);
      }
    },
    [updateFrameCache, state.videos, state.frameCache]
  );

  const captureCurrentFrame = useCallback(
    async (videoId: string, frameNumber: number) => {
      const video = state.videos[videoId];
      if (!video?.file) {
        console.warn('No video file available for frame capture');
        return;
      }

      try {
        const cachedFrame = getCachedFrame(frameNumber);
        if (cachedFrame) {
          await handleCachedFrame(cachedFrame, videoId, frameNumber);
          return;
        }
        const fps = video.metadata.fps || 30;
        const timestamp = frameNumber / fps;

        await captureAndCacheNewFrame(videoId, timestamp, frameNumber);
      } catch (error) {
        console.error('Frame capture failed:', error);
      }
    },
    [state, getCachedFrame, updateFrameCache, cacheSurroundingFrames]
  );

  const handleCachedFrame = async (
    cachedFrame: CurrentFrame,
    videoId: string,
    frameNumber: number
  ) => {
    console.log(`Found frame ${frameNumber} in cache`);

    setState((s) => ({
      ...s,
      currentFrame: cachedFrame,
    }));

    cacheSurroundingFrames(videoId, frameNumber).catch((error) =>
      console.error(
        `Failed to cache surrounding frames for ${frameNumber}:`,
        error
      )
    );
  };

  const captureAndCacheNewFrame = async (
    videoId: string,
    timestamp: number,
    frameNumber: number
  ) => {
    console.log(`Frame ${frameNumber} not in cache, capturing...`);

    const video = state.videos[videoId];
    if (!video?.file) {
      console.warn(
        `No video file found for videoId: ${videoId} during captureAndCacheNewFrame`
      );
      return;
    }

    const blobUrl = await ffmpegWorkerPool.captureFrame(
      video.file!,
      timestamp,
      video.ffmpegHandle
    );

    const frame: CurrentFrame = {
      timestamp,
      frameNumber,
      blobUrl,
    };

    console.log('frame', frame);
    setState((prevState) => ({
      ...prevState,
      frameCache: updateFrameCache([frame], prevState.frameCache),
      currentFrame: frame,
    }));

    cacheSurroundingFrames(videoId, frameNumber).catch((error) =>
      console.error(
        `Failed to cache surrounding frames for ${frameNumber}:`,
        error
      )
    );
  };

  // Add cleanup for worker pool when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup worker pool when component unmounts
      ffmpegWorkerPool.terminate();
    };
  }, []);

  // useEffect to set isSaved to false when project state changes (except isSaved, isLoading, error)
  useEffect(() => {
    // If the ref is true, it means we just saved or loaded. Reset the ref and skip.
    if (justSavedRef.current || justLoadedRef.current) {
      justSavedRef.current = false; // Reset the flag
      justLoadedRef.current = false; // Reset the flag
      return;
    }

    // Only set isSaved to false if any of the main project data changes
    // and the project was previously considered saved.
    if (state.isSaved) {
      console.log('setting isSaved to false due to data change');
      setState((s) => ({ ...s, isSaved: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.metadata,
    state.videos,
    state.bookmarks,
    state.annotations,
    state.analysis,
    state.projectDirectoryHandle,
  ]);

  // Add cleanup function to remove FFmpeg files when project is closed
  const cleanupFFmpegFiles = useCallback(async () => {
    const videos = state.videos;
    for (const video of Object.values(videos)) {
      if (video.ffmpegHandle) {
        try {
          await ffmpeg!.deleteFile(video.ffmpegHandle.filename);
        } catch (error) {
          console.warn(
            `Failed to delete FFmpeg file ${video.ffmpegHandle.filename}:`,
            error
          );
        }
      }
    }
  }, [state.videos, ffmpeg]);

  // Update resetProject to include worker pool cleanup
  const resetProject = useCallback(async () => {
    // Cleanup FFmpeg files
    await cleanupFFmpegFiles();

    // Cleanup worker pool
    await ffmpegWorkerPool.terminate();

    // Reset state
    setState(initialState);

    // Cleanup object URLs
    Object.values(state.videos).forEach((video) => {
      if (video.objectURL) {
        URL.revokeObjectURL(video.objectURL);
      }
    });
  }, [state.videos, cleanupFFmpegFiles]);

  /**
   * Sets the array of shapes for a given video and frame number.
   */
  const setAnnotationsForFrame = useCallback(
    (videoId: string, frameNumber: number, shapes: ShapeData[]) => {
      setState((prev) => {
        const prevVideoAnnotations = prev.annotations[videoId] || {};
        let newVideoAnnotations;
        if (shapes.length === 0) {
          // Remove the key for frameNumber if shapes is empty
          newVideoAnnotations = { ...prevVideoAnnotations };
          delete newVideoAnnotations[frameNumber];
        } else {
          // Set the shapes for the frameNumber
          newVideoAnnotations = {
            ...prevVideoAnnotations,
            [frameNumber]: shapes,
          };
        }
        return {
          ...prev,
          annotations: {
            ...prev.annotations,
            [videoId]: newVideoAnnotations,
          },
          isSaved: false,
        };
      });
    },
    []
  );

  const setVideoApi = useCallback((api: VideoElementApi | null) => {
    setState((s) => ({ ...s, videoApi: api }));
  }, []);

  // Define the setBookmarks function
  const setBookmarks = useCallback(
    (newBookmarks: Record<string, BookmarkEntry[]>) => {
      setState((s) => ({
        ...s,
        bookmarks: newBookmarks,
        isSaved: false, // Changing bookmarks should mark the project as unsaved
      }));
    
  const setTaskStatus = useCallback(
    (videoId: string, taskStatus: TaskStatus) => {
      setState((prev) => {
        const video = prev.videos[videoId];
        if (!video) return prev;
        return {
          ...prev,
          videos: {
            ...prev.videos,
            [videoId]: {
              ...video,
              taskStatus,
            },
          },
          isSaved: false,
        };
      });
    },
    []
  );

  // --- Value Provided to Consumers ---
  // Ensure this matches the ProjectContextType interface
  const contextValue: ProjectContextType = {
    ...state,
    loadProject,
    loadProjectFromHandle,
    saveProject,
    uploadVideo,
    createProject,
    setCurrentVideoId,
    selectProjectLocation,
    resetProject,
    currentFrame: state.currentFrame,
    captureCurrentFrame,
    setAnnotationsForFrame,
    setBookmarks,
    setVideoApi,
    setTaskStatus,
  };

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};

// --- Custom Hook for Consuming Context ---
export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

// Helper function
function getVideoIdFromFilename(filename: string): string {
  return filename.split('/').pop()?.split('.').slice(0, -1).join('.') || '';
}
