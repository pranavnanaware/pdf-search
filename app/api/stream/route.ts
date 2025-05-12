import { NextRequest } from 'next/server';
import { StreamRequest, StreamResponse } from '@/app/types/stream';
import { searchPDFs, GoogleSearchResult } from '@/app/services/google-search';
import { WorkerPool } from '@/app/services/worker-pool';

// Create a singleton worker pool
const workerPool = new WorkerPool(4);

export async function POST(req: NextRequest) {
  try {
    const body: StreamRequest = await req.json();
    const { document_links, query } = body;

    if (!document_links || !Array.isArray(document_links) || !query) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid request: document_links must be an array and query must be provided',
        }),
        { status: 400 }
      );
    }

    // Create a new TransformStream for streaming the response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Process documents in the background
    (async () => {
      try {
        // First, get Google search results
        const searchResponse: StreamResponse = {
          status: 'processing',
          message: 'Searching for PDFs...',
        };
        await writer.write(encoder.encode(JSON.stringify(searchResponse) + '\n'));

        const searchResults = await searchPDFs(query);
        
        // Send search results
        const searchResultsResponse: StreamResponse = {
          status: 'completed',
          message: 'Search results found',
          data: { searchResults }
        };
        await writer.write(encoder.encode(JSON.stringify(searchResultsResponse) + '\n'));

        // Process documents in parallel using worker pool
        const processingPromises = document_links.map(async (link) => {
          try {
            // Send processing status for each document
            const processingResponse: StreamResponse = {
              status: 'processing',
              message: `Processing document: ${link}`,
            };
            await writer.write(encoder.encode(JSON.stringify(processingResponse) + '\n'));

            // Process the PDF using worker pool
            const result = await workerPool.processDocument(link, query);
            
            if (result.success) {
              // Send completion status with relevancy information
              const completionResponse: StreamResponse = {
                status: 'completed',
                message: `Completed processing: ${link}`,
                data: { 
                  processed: true, 
                  link,
                  relevancyReport: result.answer
                }
              };
              await writer.write(encoder.encode(JSON.stringify(completionResponse) + '\n'));
            } else {
              // Send error response for failed document processing
              const errorResponse: StreamResponse = {
                status: 'error',
                message: `Failed to process document: ${link}`,
                data: { link },
                error: result.error || 'Unknown error'
              };
              await writer.write(encoder.encode(JSON.stringify(errorResponse) + '\n'));
            }
          } catch (error) {
            // Send error response for caught exceptions
            const errorResponse: StreamResponse = {
              status: 'error',
              message: `Error processing document: ${link}`,
              data: { link },
              error: error instanceof Error ? error.message : 'Unknown error'
            };
            await writer.write(encoder.encode(JSON.stringify(errorResponse) + '\n'));
            console.error(`Error processing document ${link}:`, error);
          }
        });

        // Wait for all processing to complete
        await Promise.all(processingPromises);

        // Send final completion message
        const finalResponse: StreamResponse = {
          status: 'completed',
          message: 'All documents processed successfully',
          data: { totalProcessed: document_links.length }
        };
        await writer.write(encoder.encode(JSON.stringify(finalResponse) + '\n'));
      } catch (error) {
        console.error('Error in stream processing:', error);
        const errorResponse: StreamResponse = {
          status: 'error',
          message: 'Error processing documents',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        await writer.write(encoder.encode(JSON.stringify(errorResponse) + '\n'));
      } finally {
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in stream route:', error);
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
} 