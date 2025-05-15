import { VideoFFmpegHandle } from '@/types/project';
import { WorkerPool } from './workerPool';
import { CaptureFrameTask, ProcessVideoTask, WorkerTask } from '@/types/worker';

export class FFmpegWorkerPool extends WorkerPool {
  constructor() {
    super('./ffmpegWorker.ts');
  }

  private generateTaskId(type: WorkerTask['type']): string {
    return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async captureFrame(
    videoFile: File,
    timestamp: number,
    ffmpegHandle?: VideoFFmpegHandle
  ): Promise<string> {
    const task: CaptureFrameTask = {
      id: this.generateTaskId('captureFrame'),
      type: 'captureFrame',
      videoFile,
      timestamp,
      ffmpegHandle
    };

    const result = await this.executeTask(task);
    if (result.type === 'captureFrame' && result.blobUrl) {
      return result.blobUrl;
    }
    throw new Error('Invalid result type');
  }

  async processVideo(
    videoFile: File,
    options: ProcessVideoTask['options']
  ): Promise<File> {
    const task: ProcessVideoTask = {
      id: this.generateTaskId('processVideo'),
      type: 'processVideo',
      videoFile,
      options
    };

    const result = await this.executeTask(task);
    if (result.type === 'processVideo' && result.outputFile) {
      return result.outputFile;
    }
    throw new Error('Invalid result type');
  }
}

export const ffmpegWorkerPool = new FFmpegWorkerPool(); 