import { FFmpeg } from '@ffmpeg/ffmpeg';
import { WorkerTask, WorkerResult, CaptureFrameTask, ProcessVideoTask } from '@/types/worker';
import { captureFrame } from './ffmpegUtils';

let ffmpeg: FFmpeg | null = null;

// Initialize FFmpeg immediately when worker is created
async function initializeFFmpeg() {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
}

// Start initialization immediately
initializeFFmpeg().catch(error => {
  console.error(`Worker ${self.name}: Failed to initialize FFmpeg:`, error);
});

async function handleCaptureFrameTask(
  task: CaptureFrameTask,
  ffmpeg: FFmpeg
): Promise<WorkerResult> {
  const { videoFile, timestamp, ffmpegHandle } = task;
  
  try {
    const frameData = await captureFrame(
      videoFile,
      ffmpeg,
      timestamp,
      ffmpegHandle
    );

    return {
      id: task.id,
      type: 'captureFrame',
      success: true,
      frameData
    };
  } catch (error) {
    return {
      id: task.id,
      type: 'captureFrame',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function handleProcessVideoTask(
  task: ProcessVideoTask,
  ffmpeg: FFmpeg
): Promise<WorkerResult> {
  // Denna gör inget, bara för att visa hur man lägger till fler tasks
  return {
    id: task.id,
    type: 'processVideo',
    success: false,
    error: 'Not implemented'
  };
}

type TaskHandler = (task: WorkerTask, ffmpeg: FFmpeg) => Promise<WorkerResult>;

const taskHandlers: Record<WorkerTask['type'], TaskHandler> = {
  captureFrame: handleCaptureFrameTask as TaskHandler,
  processVideo: handleProcessVideoTask as TaskHandler
};

self.onmessage = async (e: MessageEvent<WorkerTask>) => {
  const task = e.data;
  
  try {
    if (!ffmpeg) {
      ffmpeg = await initializeFFmpeg();
    }

    const handler = taskHandlers[task.type];
    if (!handler) {
      throw new Error(`Unknown task type: ${task.type}`);
    }

    const result = await handler(task, ffmpeg);
    self.postMessage(result);
  } catch (error) {
    self.postMessage({
      id: task.id,
      type: task.type,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};