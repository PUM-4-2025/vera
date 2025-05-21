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

export interface VideoFFmpegHandle {
  filename: string;
  file: File;
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
  ffmpegHandle?: VideoFFmpegHandle; // Add this
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

// --- Annotation Shape Types ---
// Discriminated union for different shape types, storing VIDEO coordinates
export type RectShape = {
  id: string; // Unique ID for the shape instance
  type: 'rect';
  x: number; // Video coordinate (top-left)
  y: number; // Video coordinate (top-left)
  width: number; // Video dimension
  height: number; // Video dimension
  stroke: string;
  strokeWidth: number;
};

export type CircleShape = {
  id: string;
  type: 'circle';
  x: number; // Video coordinate (center)
  y: number; // Video coordinate (center)
  radiusX: number; // Video dimension
  radiusY: number; // Video dimension
  stroke: string;
  strokeWidth: number;
};

export type ArrowShape = {
  id: string;
  type: 'arrow';
  points: [number, number, number, number]; // Video coordinates [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
};

export type ShapeData = RectShape | CircleShape | ArrowShape;

// Structure for storing annotations per video, keyed by frame number
// e.g., { 37: [ShapeData, ShapeData], 150: [ShapeData] }
export type VideoAnnotationData = Record<number, ShapeData[]>;

// Preliminary types for bookmarks, annotations and analysis
export interface BookmarkEntryData {
  path: string;
  description: string;
  timestamp: number;
}

export interface BookmarkEntry extends BookmarkEntryData {
  blobUrl?: string;
}

export interface AnalysisData {
  name: string;
  description: string;
  fileHandle?: FileSystemFileHandle;
}

// Add these types
export interface FrameCache {
  frames: Map<number, CurrentFrame>; // frameNumber -> frame data
  maxSize: number; // maximum number of frames to cache
  recentlyUsed: number[]; // list of recently used frame numbers
}

// Represents the overall state managed by the ProjectContext
export interface ProjectState {
  projectDirectoryHandle: FileSystemDirectoryHandle | null;
  metadata: Metadata;
  videos: Record<string, VideoEntry>; // Runtime state, includes object URLs etc.
  bookmarks: Record<string, BookmarkEntry[]>;
  annotations: Record<string, VideoAnnotationData>;
  analysis: Record<string, AnalysisData>;
  isLoading: boolean;
  error: string | null;
  currentVideoId: string | null;
  isSaved: boolean;
  currentFrame: CurrentFrame | null;
  frameCache: FrameCache;
  videoApi: VideoElementApi | null;
}

export interface VideoElementApi {
  seek(time: number): Promise<void>;
  play(): void;
  pause(): void;
  getCurrentTime: () => number;
  getCurrentFrameNumber: () => number;
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
  currentFrame: CurrentFrame | null;
  captureCurrentFrame: (videoId: string, frameNumber: number) => Promise<void>;
  setAnnotationsForFrame: (
    videoId: string,
    frameNumber: number,
    shapes: ShapeData[]
  ) => void;
  setVideoApi: (api: VideoElementApi | null) => void;
  setBookmarks: (bookmarks: Record<string, BookmarkEntry[]>) => void;
}

// --- Result Types for Utility Functions ---

// Data returned by loadProjectLogic
export interface LoadProjectResult {
  metadata: Metadata;
  videos: Record<string, VideoEntry>;
  annotations: Record<string, VideoAnnotationData>;
  bookmarks: Record<string, BookmarkEntry[]>;
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

export interface CurrentFrame {
  timestamp: number;
  frameNumber: number;
  blobUrl: string;
}
