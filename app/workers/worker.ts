import { parentPort, workerData } from 'worker_threads';
import { processPDF } from '../services/chunk-docs';

if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

async function processDocument() {
  try {
    const { url, query } = workerData;
    const result = await processPDF(url, query);
    parentPort?.postMessage({ success: true, result });
  } catch (error) {
    parentPort?.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

processDocument(); 