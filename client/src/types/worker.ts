import { VideoFFmpegHandle } from "./project";

export type WorkerTaskType = 'captureFrame' | 'processVideo' /* lägg till fler */;

export interface BaseWorkerTask {
  id: string;
  type: WorkerTaskType;
}

export interface CaptureFrameTask extends BaseWorkerTask {
  type: 'captureFrame';
  videoFile: File;
  timestamp: number;
  ffmpegHandle?: VideoFFmpegHandle;
}

// Only to show how to add more tasks
export interface ProcessVideoTask extends BaseWorkerTask {
  type: 'processVideo';
  videoFile: File;
  options: {
    format?: string;
    quality?: number;
  };
}

export type WorkerTask = CaptureFrameTask | ProcessVideoTask;

export interface BaseWorkerResult {
  id: string;
  type: WorkerTaskType;
  success: boolean;
  error?: string;
}

export interface CaptureFrameResult extends BaseWorkerResult {
  type: 'captureFrame';
  frameData?: string;
}

export interface ProcessVideoResult extends BaseWorkerResult {
  type: 'processVideo';
  outputFile?: File;
}

export type WorkerResult = CaptureFrameResult | ProcessVideoResult; 