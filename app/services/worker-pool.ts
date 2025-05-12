import { Worker } from 'worker_threads';
import path from 'path';

export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ url: string; query: string; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private activeWorkers = 0;
  private maxWorkers: number;

  constructor(maxWorkers = 4) {
    this.maxWorkers = maxWorkers;
  }

  async processDocument(url: string, query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, query, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.queue.length === 0 || this.activeWorkers >= this.maxWorkers) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;
    const worker = new Worker(path.join(process.cwd(), 'app/workers/worker.js'), {
      workerData: { url: task.url, query: task.query }
    });

    worker.on('message', (result) => {
      if (result.success) {
        task.resolve(result.result);
      } else {
        task.reject(new Error(result.error));
      }
      this.cleanupWorker(worker);
    });

    worker.on('error', (error) => {
      task.reject(error);
      this.cleanupWorker(worker);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        task.reject(new Error(`Worker stopped with exit code ${code}`));
      }
      this.cleanupWorker(worker);
    });
  }

  private cleanupWorker(worker: Worker) {
    this.activeWorkers--;
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      this.workers.splice(index, 1);
    }
    worker.terminate();
    this.processQueue();
  }

  async shutdown() {
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.queue = [];
    this.activeWorkers = 0;
  }
} 