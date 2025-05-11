import { WorkerTask, WorkerResult } from '@/types/worker';

export class WorkerPool {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeWorkers: Set<number> = new Set();
  private callbacks: Map<string, (result: WorkerResult) => void> = new Map();
  private workerCount: number;

  constructor(
    workerScript: string,
    workerCount = navigator.hardwareConcurrency || 4
  ) {
    this.workerCount = Math.min(workerCount, 8);
    this.initializeWorkers(workerScript);
  }

  private initializeWorkers(workerScript: string) {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL(workerScript, import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e: MessageEvent<WorkerResult>) => {
        const { id } = e.data;
        const callback = this.callbacks.get(id);
        if (callback) {
          callback(e.data);
          this.callbacks.delete(id);
        }
        this.activeWorkers.delete(this.workers.indexOf(worker));
        this.processNextTask();
      };

      this.workers.push(worker);
    }
  }

  private async processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorkerIndex = this.workers.findIndex(
      (_, index) => !this.activeWorkers.has(index)
    );

    if (availableWorkerIndex === -1) return;

    const task = this.taskQueue.shift()!;
    this.activeWorkers.add(availableWorkerIndex);
    this.workers[availableWorkerIndex]!.postMessage(task);
  }

  async executeTask(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      this.callbacks.set(task.id, (result) => {
        if (result.success) {
          resolve(result);
        } else {
          reject(new Error(result.error || `${task.type} failed`));
        }
      });

      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  async terminate() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.taskQueue = [];
    this.activeWorkers.clear();
    this.callbacks.clear();
  }
} 