// worker.ts
import { parentPort } from 'worker_threads';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PdfReader } from 'pdfreader';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai'
import { v4 as uuid } from 'uuid';
import { PDFDocument } from 'pdf-lib';


const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const indexName = 'docsearch';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const index = pc.Index(indexName);


type DocLinkType = { link: string };

type PageText = {
  text: string;
  page: number;
};

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  try {
    // Validate URL
    new URL(url);
    const { data } = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
    return Buffer.from(data);
  } catch (err) {
    throw new Error(`Invalid URL: ${url}`);
  }
}

async function getPdfPageCount(buffer: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(buffer);
  return pdfDoc.getPageCount();
}

function extractText(buffer: Buffer, url: string): Promise<{pages: PageText[], url: string}> {
  return new Promise((resolve, reject) => {
    const pages: PageText[] = [];
    let currentPage = 0;
    let currentPageText = '';
    let done = false;

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) return reject(err);
      if (!item) {
        // Add the last page if it has content
        if (currentPageText.trim()) {
          pages.push({ text: currentPageText.trim(), page: currentPage });
        }
        done = true;
        return resolve({ pages, url });
      }
      if (item.page) {
        // If we're moving to a new page, save the current page's text
        if (currentPageText.trim()) {
          pages.push({ text: currentPageText.trim(), page: currentPage });
          currentPageText = '';
        }
        currentPage = item.page;
      }
      if (item.text) {
        currentPageText += item.text + ' ';
      }
    });

    // fallback timeout
    setTimeout(() => {
      if (!done) {
        // Add the last page if it has content
        if (currentPageText.trim()) {
          pages.push({ text: currentPageText.trim(), page: currentPage });
        }
        resolve({ pages, url });
      }
    }, 30_000);
  });
}

async function chunkText(pages: PageText[], url: string): Promise<Document[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 900,      
    chunkOverlap: 200     
  });
  
  const allDocs: Document[] = [];
  for (const page of pages) {
    const docs = await splitter.createDocuments([page.text], [{
      page: page.page,
      url: url,
    }]);
    allDocs.push(...docs);
  }
  
  return allDocs;
}

async function generateEmbeddings(data: Document[]) {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });

    // Generate embeddings for all texts
    const texts = data.map(doc => doc.pageContent);
    const embeddingResults = await embeddings.embedDocuments(texts);

    // Format vectors for Pinecone with sanitized metadata
    const vectors = data.map((doc, i) => ({
      id: uuid(),
      values: embeddingResults[i],
      metadata: {
        source: doc.metadata.url || '',
        page: doc.metadata.page || 0,
        text: doc.pageContent
      }
    }));
    const vector_store_ids = vectors.map(v => v.id);
    console.log('Upserting vectors to Pinecone...');
    await index.namespace('docsearch').upsert(vectors);
    return vector_store_ids;
  } catch (err: any) {
    console.error('Error generating embeddings:', err.message);
    if (parentPort) {
      parentPort.postMessage({ success: false, error: err.message });
    }
  }
}





if (parentPort) {
  parentPort.on('message', async (msg: { doc: DocLinkType, query: string }) => {
    try {      
      const start = Date.now();
      const pdfBuffer = await fetchPdfBuffer(msg.doc.link);
      const pageCount = await getPdfPageCount(pdfBuffer);
      if (pageCount > 100) {
        console.log(`Skipping PDF with more than 100 pages: ${msg.doc.link}`);
        return;
      }
      const fetchTime = (Date.now() - start)/1000;
      console.log(`Fetch time: ${fetchTime.toFixed(2)}s`);

      const t0 = Date.now();
      const { pages } = await extractText(pdfBuffer, msg.doc.link);
      const extractTime = (Date.now() - t0)/1000;
      console.log(`Extract time: ${extractTime.toFixed(2)}s`);

      const t1 = Date.now();
      const docs = await chunkText(pages, msg.doc.link);
      const chunkTime = (Date.now() - t1)/1000;
      console.log(`Chunk time: ${chunkTime.toFixed(2)}s`);

      const vector_store_ids = await generateEmbeddings(docs);
      //const response = await gptResult(msg.query, vector_store_ids!);
      //console.log(response);
      
      if (parentPort) {
        parentPort.postMessage({ success: true, chunks: docs });
      }
    } catch (err: any) {
      console.error(`Error:`, err.message);
      if (parentPort) {
        parentPort.postMessage({ success: false, error: err.message });
      }
    }
  });
}