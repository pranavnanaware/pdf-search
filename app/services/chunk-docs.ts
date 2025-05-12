import { Worker } from 'worker_threads';
import { GoogleSearchResult } from "./google-search";
import path from 'path';

const WORKER_POOL_SIZE = 4; // Adjust based on your CPU cores

class WorkerPool {
  private workers: Worker[] = [];
  private queue: { doc: any; query: string; resolve: (value: number) => void }[] = [];
  private activeWorkers = 0;
  private currentIndex = 0;

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(path.join(process.cwd(), `app/workers/doc-worker.js`));
      worker.on('message', (result ) => {
        this.activeWorkers--;
        if (this.queue.length > 0) {
          if (result.success) {
            this.queue[0].resolve(result.length);
          } else {
            console.error(`Error processing document:`, result.error);
            this.queue[0].resolve(0);
          }
          this.queue.shift();
          this.processNext();
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker error:`, error);
        this.activeWorkers--;
        if (this.queue.length > 0) {
          this.queue[0].resolve(0);
          this.queue.shift();
        }
        this.processNext();
      });

      this.workers.push(worker);
    }
  }

  private processNext() {
    if (this.queue.length > 0 && this.activeWorkers < this.workers.length) {
      const { doc, query,  resolve } = this.queue[this.currentIndex % this.queue.length];
      console.log(`Processing document ${doc.index} (${doc.title})`);
      const worker = this.workers[this.activeWorkers];
      worker.postMessage({ doc, query });
      this.activeWorkers++;
      this.currentIndex++;
    }
  }

    async processDoc(doc: any, query: string): Promise<number> {
    return new Promise((resolve) => {
      this.queue.push({ doc, query, resolve });
      this.processNext();
    });
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
  }
}

export async function extractDocText(docs: any[], query: string) { 
    console.log('Starting document extraction with', docs.length, 'documents');
    const startTime = Date.now();
    const pool = new WorkerPool(WORKER_POOL_SIZE);
    
    try {
        const results = await Promise.all(
            docs.map(doc => pool.processDoc(doc, query))
        );
        
        const endTime = Date.now();
        console.log(`Total processing time: ${(endTime - startTime)/1000}s`);
        console.log('Document processing results:', results);
        return results;
    } catch (error: any) {
        console.error('Error processing documents:', error);
        return docs.map(() => 0);
    } finally {
        pool.terminate();
    }
}
