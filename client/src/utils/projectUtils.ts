import { FFmpeg } from '@ffmpeg/ffmpeg';
import {
  Metadata,
  VideoEntry,
  VideoEntryData,
  VideoMetadata,
  LoadProjectResult,
  CreateProjectResult,
  UploadVideoResult,
  SaveProjectResult,
  ProjectState,
} from '@/types/project';
import { getMetadata as getFFmpegMetadata } from '@/utils/ffmpegUtils';

/**
 * Extracts a video ID from a filename or path.
 * @param filename - The filename (e.g., "video_01.mp4") or path.
 * @returns The video ID (e.g., "video_01").
 */
function getVideoIdFromFilename(filename: string): string {
  // Get the base name if it's a path, then remove extension
  return filename.split('/').pop()?.split('.').slice(0, -1).join('.') || '';
}

/**
 * Loads project data (metadata, videos, bookmarks) from a directory handle.
 * Assumes standard project structure (metadata.json, videos/, bookmarks/).
 * @param dirHandle - The FileSystemDirectoryHandle for the project root.
 * @param currentVideos - The current map of loaded videos (used to revoke old object URLs).
 * @returns A promise resolving with the loaded project data.
 */
export async function loadProjectLogic(
  dirHandle: FileSystemDirectoryHandle,
  currentVideos: Record<string, VideoEntry> // Pass existing videos to handle URL revocation
): Promise<LoadProjectResult> {
  // 1. Load Core Metadata
  let metadata: Metadata;
  try {
    const metadataFileHandle = await dirHandle.getFileHandle('metadata.json');
    const metadataFile = await metadataFileHandle.getFile();
    const metadataText = await metadataFile.text();
    metadata = JSON.parse(metadataText);
  } catch (e) {
    console.error('Failed to load or parse metadata.json:', e);
    throw new Error(
      'Could not load essential project metadata (metadata.json).'
    );
  }
  const videos: Record<string, VideoEntry> = {};

  // 2. Get Subdirectory Handles
  const videosDirHandle: FileSystemDirectoryHandle =
    await dirHandle.getDirectoryHandle('videos');

  // 3. Load Videos
  for (const videoId in metadata.videos) {
    const videoData = metadata.videos[videoId];
    if (videoData) {
      try {
        // Correct path to filename and remove unnecessary !
        const videoFileHandle = await videosDirHandle.getFileHandle(
          videoData.metadata.filename
        );
        const videoFile = await videoFileHandle.getFile();

        // Revoke old object URL if it exists
        if (currentVideos[videoId]?.objectURL) {
          URL.revokeObjectURL(currentVideos[videoId].objectURL);
        }

        // Create a new object URL for the video file
        const objectURL = URL.createObjectURL(videoFile);

        // Construct the VideoEntry for runtime state
        const videoEntry: VideoEntry = {
          ...videoData, // Spread data from metadata (path, metadata)
          objectURL, // Add runtime object URL
        };

        // Add the video entry to the videos map
        videos[videoId] = videoEntry;
      } catch (e) {
        console.warn(`Failed to load video ${videoData.metadata.filename}:`, e);
        // Optional: Decide if you want to proceed without this video or throw
      }
    }
  }

  // 4. Determine initial video
  const firstVideoId = Object.keys(videos)[0] || null;

  // 5. Return all loaded data
  return { metadata, videos, currentVideoId: firstVideoId };
}

/**
 * Creates a new project structure (directory, metadata file, subdirectories).
 * @param parentDirHandle - The directory handle where the project folder will be created.
 * @param name - The desired name for the project.
 * @param description - A description for the project.
 * @param state - The current project state to be included in the new project.
 * @returns A promise resolving with the handle to the new project directory and its initial metadata.
 */
export async function createProjectLogic(
  parentDirHandle: FileSystemDirectoryHandle,
  name: string,
  description: string,
  state: ProjectState
): Promise<CreateProjectResult> {
  // Sanitize name for directory creation
  const projectDirName = name
    .trim()
    .replace(/[^a-z0-9_.-]/gi, '_')
    .toLowerCase();
  if (projectDirName === '') {
    throw new Error(
      'Project name must contain at least one valid character (a-z, 0-9, _, ., -)'
    );
  }

  // 1. Create Project Root Directory
  let projectSubDirHandle: FileSystemDirectoryHandle;
  try {
    projectSubDirHandle = await parentDirHandle.getDirectoryHandle(
      projectDirName,
      { create: true }
    );
  } catch (e) {
    console.error('Failed to create project subdirectory:', e);
    throw new Error(
      `Could not create project folder "${projectDirName}". It might already exist or permissions are denied.`
    );
  }

  // 2. Create Initial Metadata
  const now = new Date().toISOString();
  const metadata: Metadata = {
    name,
    projectDescription: description || '',
    projectCreated: now,
    projectUpdated: now,
    videos: state.metadata.videos, // Use videos from the current state¨

    // TODO: Update annotationFiles with actual data
    annotationFiles: Object.keys(state.annotations || []), // Get keys as string array
    // TODO: Update bookmarkFiles with actual data
    bookmarkFiles: Object.keys(state.bookmarks || []), // Correct property name and use keys
    // TODO: Update analysisFiles with actual data
    analysisFiles: Object.keys(state.analysis || []), // Correct property name and use keys
  };

  // 3. Create Standard Subdirectories
  try {
    await projectSubDirHandle.getDirectoryHandle('videos', { create: true });
    await projectSubDirHandle.getDirectoryHandle('bookmarks', { create: true });
    await projectSubDirHandle.getDirectoryHandle('annotations', {
      create: true,
    });
    await projectSubDirHandle.getDirectoryHandle('analysis', { create: true });
    await projectSubDirHandle.getFileHandle('metadata.json', { create: true });
  } catch (e) {
    console.error('Failed to create project subdirectories:', e);
    // Attempt to clean up created project directory?
    // await parentDirHandle.removeEntry(projectDirName, { recursive: true });
    throw new Error(
      'Could not create necessary project subdirectories (videos, bookmarks, etc.).'
    );
  }

  // 4. Return handle and metadata
  return { metadata, projectDirectoryHandle: projectSubDirHandle };
}

/**
 * Saves the current project state (metadata, bookmarks) to disk.
 * Updates the 'projectUpdated' timestamp in the metadata.
 * @param dirHandle - The project's root directory handle.
 * @param metadata - The current project metadata object.
 * @param bookmarks - The current project bookmarks object.
 * @returns A promise resolving with the updated metadata object.
 */
export async function saveProjectLogic(
  state: ProjectState
): Promise<SaveProjectResult> {
  // Return updated metadata
  if (!state) {
    throw new Error('Cannot save project: Metadata is missing.');
  }

  // 1. Prepare Metadata for Saving: Just update the timestamp.
  const metadataToSave: Metadata = {
    ...state.metadata,
    projectUpdated: new Date().toISOString(),
  };

  if (!state.projectDirectoryHandle) {
    throw new Error(
      'Cannot save project: Project directory handle is missing.'
    );
  }

  // 2. Save Project Metadata File
  try {
    const metaFileHandle = await state.projectDirectoryHandle.getFileHandle(
      'metadata.json',
      { create: false }
    );
    const metaWritable = await metaFileHandle.createWritable();
    await metaWritable.write(JSON.stringify(metadataToSave, null, 2));
    await metaWritable.close();
  } catch (e) {
    console.error('Failed to save metadata.json:', e);
    throw new Error('Failed to save project metadata file.');
  }

  const videoDirHandle = await state.projectDirectoryHandle.getDirectoryHandle(
    'videos',
    { create: false }
  );
  // 3. Save Videos to Project Filesystem
  for (const [, videoEntry] of Object.entries(state.videos)) {
    const videoFileName = videoEntry.metadata.filename;
    try {
      // Check if the video file already exists in the project directory
      const existingFileHandle = await videoDirHandle
        .getFileHandle(videoFileName)
        .catch(() => null);

      if (!existingFileHandle) {
        // If the file does not exist, create and write the video file
        const videoFileHandle = await videoDirHandle.getFileHandle(
          videoFileName,
          { create: true }
        );
        const videoWritable = await videoFileHandle.createWritable();

        // Use the stored File object if available, otherwise fetch from objectURL
        const videoDataToWrite: Blob = videoEntry.file
          ? videoEntry.file
          : await fetch(videoEntry.objectURL!).then((res) => res.blob());

        await videoWritable.write(videoDataToWrite);
        await videoWritable.close();
      }
    } catch (e) {
      console.error(`Failed to save video file ${videoFileName}:`, e);
      throw new Error(`Failed to save video file ${videoFileName}.`);
    }
  }

  // 4. Return the metadata including the updated timestamp
  return { updatedMetadata: metadataToSave };
}

/**
 * Handles uploading a new video file: extracts metadata, saves the file,
 * updates project metadata, and creates runtime properties (object URL, handle).
 * @param projectDirHandle - The root directory handle of the project.
 * @param file - The video file selected by the user.
 * @param ffmpeg - An initialized FFmpeg instance for metadata extraction.
 * @param currentMetadata - The current metadata state of the project.
 * @returns A promise resolving with the new video ID, the full VideoEntry (with runtime props), and the updated project Metadata.
 */
export async function uploadVideoLogic(
  file: File,
  ffmpeg: FFmpeg,
  currentMetadata: Metadata // Pass current metadata
): Promise<UploadVideoResult> {
  const fileName = file.name;
  const videoId = getVideoIdFromFilename(fileName);
  if (!videoId) {
    throw new Error(
      `Could not extract a valid video ID from filename: ${fileName}`
    );
  }
  const videoFileName = fileName; // Keep original filename for storage
  const relativePath = `videos/${videoFileName}`; // Define standard relative path

  // Define a default metadata structure here
  const defaultMetadata: VideoMetadata = {
    filename: videoFileName,
    duration: 0,
    width: 0,
    height: 0,
    fps: 0,
    videoCodec: 'unknown',
    audioCodec: 'unknown',
    sizeBytes: file.size,
    isTranscoded: false,
    isTransmuxed: false,
  };

  // 1. Fetch Video Metadata using FFmpeg
  let fetchedMetadata: VideoMetadata | null = null;
  try {
    console.log(`Extracting metadata for ${fileName}...`);
    fetchedMetadata = await getFFmpegMetadata(file, ffmpeg);
  } catch (metaError) {
    console.error(`Failed to get FFmpeg metadata for ${fileName}:`, metaError);
  }

  // 3. Create Runtime Properties
  const objectURL = URL.createObjectURL(file);

  // 4. Prepare the VideoEntryData (for metadata storage)
  // Ensure fetchedMetadata is not null here using the default
  const newVideoData: VideoEntryData = {
    path: relativePath,
    metadata: fetchedMetadata ?? defaultMetadata, // Use fetched or default
  };

  // 5. Prepare the full VideoEntry (for immediate state update)
  const newVideoEntry: VideoEntry = {
    ...newVideoData,
    objectURL,
    file: file, // Include the original File object
  };

  // 6. Update the Project Metadata
  const updatedMetadata: Metadata = {
    ...currentMetadata, // Spread the existing metadata
    videos: {
      ...currentMetadata.videos, // Use existing videos
      [videoId]: newVideoData, // Add the new video data
    },
    projectUpdated: new Date().toISOString(), // Always update the timestamp
  };

  // 7. Return results for state update according to UploadVideoResult type
  return {
    videoId,
    videoEntry: newVideoEntry,
    updatedMetadata: updatedMetadata,
  };
}
