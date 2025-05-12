import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { PdfReader } from 'pdfreader';
import axios from 'axios';
import { OpenAIEmbeddings } from '@langchain/openai';
import OpenAI from 'openai';
import { PDFDocument } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import * as dotenv from 'dotenv';
import { getCachedResult, setCachedResult, closeRedisConnection } from '../../lib/redis';

// Load environment variables
dotenv.config();

// Debug log to check environment variables
console.log('Environment variables loaded:', {
  REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'
});

interface ChunkRecord {
  document_id: string;
  page_number: number;
  text: string;
  embedding: number[];
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize embedding & LLM clients
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-3-small'
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// 1) Download PDF into a Buffer
async function fetchPdfBuffer(url: string) {
  const { data } = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  return Buffer.from(data);
}

// 2) Quick page-count check
async function getPdfPageCount(buffer: Buffer) {
  const pdfDoc = await PDFDocument.load(buffer, {ignoreEncryption: true});
  return pdfDoc.getPageCount();
}

// 3) Extract raw text, per page
function extractText(buffer: Buffer) {
  return new Promise<{ pages: { text: string; page: number }[] }>((resolve, reject) => {
    const pages: { text: string; page: number }[] = [];
    let currentPage = 1; // Start from page 1
    let currentText = '';
    
    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) return reject(err);
      
      if (!item) {
        // End of document, add the last page if it has content
        if (currentText.trim()) {
          pages.push({ text: currentText.trim(), page: currentPage });
        }
        return resolve({ pages });
      }
      
      if (item.page) {
        // If we have accumulated text, save it for the previous page
        if (currentText.trim()) {
          pages.push({ text: currentText.trim(), page: currentPage });
        }
        // Start new page
        currentPage = item.page;
        currentText = '';
      }
      
      if (item.text) {
        currentText += item.text + ' ';
      }
    });
  });
}

// 4) Chunk each page into ~900-char docs
async function chunkText(pages: { text: string; page: number }[]) {
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 900, chunkOverlap: 200 });
  const docs: Document[] = [];
  for (const p of pages) {
    const out = await splitter.createDocuments([p.text], [{ page: p.page }]);
    docs.push(...out);
  }
  return docs;
}

// 5) Store chunks in Supabase, return document_id
async function generateEmbeddings(docs: Document[], url: string): Promise<string> {
  console.log('📝 Checking for existing document with URL:', url);
  
  // First, check if document exists
  const { data: existingDoc, error: fetchError } = await supabase
    .from('documents')
    .select('id, title')
    .eq('url', url)
    .single();

  let document_id: string;
  let document_title: string = url.split('/').pop() || 'Untitled';  // Default title from URL

  if (existingDoc) {
    console.log('✅ Found existing document:', existingDoc.id);
    document_id = existingDoc.id;
    document_title = existingDoc.title;

    // Check if chunks exist for this document
    const { count: chunkCount, error: countError } = await supabase
      .from('chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', document_id);

    if (countError) {
      console.error('Error checking chunks:', countError);
      throw countError;
    }

    if (chunkCount && chunkCount > 0) {
      console.log(`✅ Found ${chunkCount} existing chunks, skipping embedding generation`);
      return document_id;
    }
  } else {
    // Create new document record
    console.log('📝 Creating new document record');
    const { data: newDoc, error: insertError } = await supabase
      .from('documents')
      .upsert({ 
        title: document_title, 
        url 
      }, {
        onConflict: 'url'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating document:', insertError);
      throw insertError;
    }

    document_id = newDoc.id;
    console.log('✅ Created new document with ID:', document_id);
  }

  // Generate embeddings only if we don't have existing chunks
  console.log('🧮 Generating embeddings for', docs.length, 'chunks');
  const texts = docs.map(d => d.pageContent);
  const embsArr = await embeddings.embedDocuments(texts);

  // Prepare rows
  const rows: ChunkRecord[] = docs.map((d, i) => ({
    document_id,
    page_number: d.metadata.page as number,
    text: d.pageContent,
    embedding: embsArr[i],
  }));

  // Insert chunks
  console.log('💾 Storing chunks in database...');
  const { error: chunksErr } = await supabase
    .from('chunks')
    .insert(rows);
  if (chunksErr) {
    console.error('Error storing chunks:', chunksErr);
    throw chunksErr;
  }
  console.log('✅ Stored all chunks successfully');

  return document_id;
}

// 6) call your RPC to get top-K for *this* document only
async function similaritySearch(
    query: string,
    documentId: string,
    topK = 10  ): Promise<{ text: string; page: number }[]> {
    // embed the user query
    const queryEmbedding = await embeddings.embedQuery(query);
  
    // ✏️ note: keys must match `p_query_embedding`, `p_document_id`, `p_match_count`
    const { data: matches, error } = await supabase.rpc('match_chunks', {
      p_query_embedding: queryEmbedding,
      p_document_id:     documentId,
      p_match_count:     topK
    });
  
    if (error) {
      console.error('Similarity RPC error:', error);
      throw error;
    }
  
    // just in case the function still mis-behaves, filter again in JS
    const filtered = (matches as any[])
      .filter(m => m.document_id === documentId)
      .slice(0, topK);
  
    // map to your snippet shape
    return filtered.map(m => ({
      text: m.text,
      page: m.page_number
    }));
  }
  
// Define Zod schema for page range
const PageRangeSchema = z.object({
  startPage: z
    .number()
    .describe("First (or only) relevant page"),
  endPage: z
    .number()
    .describe("Last relevant page (same as startPage if only one)"),
});

// Create LangChain parser from schema
const outputParser = StructuredOutputParser.fromZodSchema(PageRangeSchema);
const formatInstructions = outputParser.getFormatInstructions();

// Generate answer with context
async function answerWithContext(
  query: string,
  snippets: { text: string; page: number }[]
): Promise<{ startPage: number; endPage: number }> {
  const system = `
You are a helpful assistant that analyzes text snippets from a PDF document and searches for the most relevant page range for a given query.
For eg - If a query is "2 digit multiplication for grade 2", 
the answer should be a page range that contains information about 2 digit multiplication for grade 2 even if it explicity does not mention it.
You will be given text snippets labeled with their page numbers.
Your task is to identify the CONTIGUOUS range of pages that best answer the query.
IMPORTANT:
- Only use page numbers that are actually present in the snippets
- If the answer spans multiple pages, return the full range
- If the answer is on a single page, set both startPage and endPage to that page
- Do not make up page numbers that aren't in the snippets

${formatInstructions}
  `.trim();

  const user = [
    `Query: ${query}`,
    'Available text snippets:',
    ...snippets.map(s => `Page ${s.page}: ${s.text}`),
    'Based on these snippets, which page range best answers the query?'
  ].join("\n\n");

  const resp = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: 0.3
  });

  const raw = resp.choices[0].message.content;
  if (!raw) throw new Error('No response from OpenAI');
  const parsed = await outputParser.parse(raw);

  // Validate that the returned page numbers exist in our snippets
  const validPages = new Set(snippets.map(s => s.page));
  if (!validPages.has(parsed.startPage) || !validPages.has(parsed.endPage)) {
    throw new Error('LLM returned invalid page numbers');
  }

  return parsed;
}

// Main test function
export async function processPDF(url: string, query: string) {
  console.log('🚀 Starting PDF processing test...');
  console.log('URL:', url);
  console.log('Query:', query);
  console.log('-----------------------------------');

  try {
    // Check Redis cache first
    console.log('🔍 Checking Redis cache...');
    const cachedResult = await getCachedResult(query, url);
    if (cachedResult) {
      console.log('✅ Found cached result:', cachedResult);
      return { success: true, answer: cachedResult.relevancyReport };
    }
    console.log('❌ No cached result found, proceeding with search...');

    // First check if document exists and has chunks
    console.log('🔍 Checking for existing document...');
    const { data: existingDoc, error: fetchError } = await supabase
      .from('documents')
      .select('id, title')
      .eq('url', url)
      .single();

    let document_id: string;
    let document_title: string = url.split('/').pop() || 'Untitled';  // Default title from URL

    if (existingDoc) {
      console.log('✅ Found existing document:', existingDoc.id);
      document_id = existingDoc.id;
      document_title = existingDoc.title;

      // Check if chunks exist
      const { count: chunkCount, error: countError } = await supabase
        .from('chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', document_id);

      if (countError) {
        console.error('Error checking chunks:', countError);
        throw countError;
      }

      if (chunkCount && chunkCount > 0) {
        console.log(`✅ Found ${chunkCount} existing chunks, skipping PDF processing`);
        // Skip to similarity search
        console.log('🔍 Performing similarity search...');
        const snippets = await similaritySearch(query, document_id);
        console.log(`✅ Found ${snippets.length} relevant snippets`);
        console.log('Sample snippet:', snippets[0]);
        console.log('-----------------------------------');

        // Generate answer
        console.log('🤖 Generating answer with context...');
        const answer = await answerWithContext(query, snippets);
        console.log('✅ Answer generated:', answer);
        console.log('-----------------------------------');

        // Cache the result
        await setCachedResult(query, url, {
          documentId: document_id,
          title: document_title,
          relevancyReport: answer
        });

        console.log('🎉 Test completed successfully!');
        return { success: true, answer };
      }
    }

    // If we get here, we need to process the PDF
    console.log('📥 Downloading PDF...');
    const buffer = await fetchPdfBuffer(url);
    console.log('✅ PDF downloaded successfully');
    console.log('-----------------------------------');

    // 2. Check page count
    console.log('📄 Checking page count...');
    const pagesCnt = await getPdfPageCount(buffer);
    console.log(`✅ PDF has ${pagesCnt} pages`);
    if (pagesCnt > 300) {
      throw new Error('PDF too large');
    }
    console.log('-----------------------------------');

    // 3. Extract text
    console.log('📝 Extracting text...');
    const { pages } = await extractText(buffer);
    console.log(`✅ Extracted text from ${pages.length} pages`);
    console.log('Sample of first page:', pages[0]?.text.substring(0, 200) + '...');
    console.log('-----------------------------------');

    // 4. Chunk text
    console.log('✂️ Chunking text...');
    const docs = await chunkText(pages);
    console.log(`✅ Created ${docs.length} chunks`);
    console.log('Sample chunk:', docs[0]?.pageContent.substring(0, 200) + '...');
    console.log('-----------------------------------');

    // 5. Generate embeddings
    console.log('🧮 Generating embeddings...');
    document_id = await generateEmbeddings(docs, url);
    console.log(`✅ Generated embeddings and stored with document ID: ${document_id}`);
    console.log('-----------------------------------');

    // 6. Similarity search
    console.log('🔍 Performing similarity search...');
    const snippets = await similaritySearch(query, document_id);
    console.log(`✅ Found ${snippets.length} relevant snippets`);
    console.log('Sample snippet:', snippets[0]);
    console.log('-----------------------------------');

    // 7. Answer with context
    console.log('🤖 Generating answer with context...');
    const answer = await answerWithContext(query, snippets);
    console.log('✅ Answer generated:', answer);
    console.log('-----------------------------------');

    // After generating answer, cache the result
    await setCachedResult(query, url, {
      documentId: document_id,
      title: document_title,
      relevancyReport: answer
    });

    console.log('🎉 Test completed successfully!');
    return { success: true, answer };

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

