import { FFmpeg } from '@ffmpeg/ffmpeg';

// Core project metadata structure stored in metadata.json
export interface Metadata {
  name: string;
  projectDescription: string;
  projectCreated: string; // ISO string
  projectUpdated: string; // ISO string
  videos: Record<string, VideoEntryData>; // Video ID to VideoEntryData mapping
  annotationFiles: string[]; // Relative paths to annotation files
  bookmarkFiles: string[]; // Relative paths to bookmark files
  analysisFiles: string[]; // Relative paths to analysis files
}

// Represents the data stored for a video within metadata.json
export interface VideoEntryData {
  path: string; // Relative path within the project (e.g., "videos/my_video.mp4")
  metadata: VideoMetadata;
}

// Represents a video loaded in the application, including runtime properties
export interface VideoEntry extends VideoEntryData {
  objectURL?: string; // Optional: Blob URL for playback (runtime only)
  file?: File; // Optional: Original File object for unsaved uploads (runtime only)
}

// Detailed metadata extracted from a video file using FFmpeg
export interface VideoMetadata {
  filename: string; // Original filename
  duration: number; // In seconds
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  audioCodec?: string;
  sizeBytes: number;
  totalFrames?: number; // Optional: Calculated total frames
  isTranscoded: boolean; // Flags indicating processing status
  isTransmuxed: boolean;
}


// Preliminary types for bookmarks, annotations and analysis
export interface BookmarkData {
  name: string;
  description: string;
  fileHandle?: FileSystemFileHandle;
}

export interface AnnotationData {
  name: string;
  description: string;
  fileHandle?: FileSystemFileHandle;
}

export interface AnalysisData {
  name: string;
  description: string;
  fileHandle?: FileSystemFileHandle;
}

// Represents the overall state managed by the ProjectContext
export interface ProjectState {
  projectDirectoryHandle: FileSystemDirectoryHandle | null;
  metadata: Metadata;
  videos: Record<string, VideoEntry>; // Runtime state, includes object URLs etc.
  bookmarks: Record<string, BookmarkData>;
  annotations: Record<string, AnnotationData>;
  analysis: Record<string, AnalysisData>;
  isLoading: boolean; 
  error: string | null;
  currentVideoId: string | null;
  isSaved: boolean;
}

// Defines the shape of the ProjectContext including state and actions
export interface ProjectContextType extends ProjectState {
  loadProject: () => Promise<void>;
  loadProjectFromHandle: (path: string) => Promise<void>;
  saveProject: () => Promise<Metadata | null>; // Returns updated metadata or null on failure
  uploadVideo: () => Promise<string | undefined>; // Returns videoId or undefined
  createProject: (
    name: string,
    description: string,
    dirHandle: FileSystemDirectoryHandle
  ) => Promise<void>;
  setCurrentVideoId: (videoId: string | null) => void;
  selectProjectLocation: () => Promise<FileSystemDirectoryHandle | null>;
  resetProject: () => void;
}

// --- Result Types for Utility Functions ---

// Data returned by loadProjectLogic
export interface LoadProjectResult {
  metadata: Metadata;
  videos: Record<string, VideoEntry>;
  currentVideoId: string | null;
}

// Data returned by createProjectLogic
export interface CreateProjectResult {
  projectDirectoryHandle: FileSystemDirectoryHandle;
  metadata: Metadata;
}

// Data returned by uploadVideoLogic
export interface UploadVideoResult {
  videoId: string;
  videoEntry: VideoEntry; // Includes runtime props for immediate use
  updatedMetadata: Metadata;
}

// Data returned by saveProjectLogic
export interface SaveProjectResult {
    updatedMetadata: Metadata;
} 