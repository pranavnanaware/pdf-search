import { NextRequest } from 'next/server';
import { StreamRequest, StreamResponse } from '@/app/types/stream';

export async function POST(req: NextRequest) {
  try {
    const body: StreamRequest = await req.json();
    const { document_links } = body;

    if (!document_links || !Array.isArray(document_links)) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid request: document_links must be an array',
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
        for (const link of document_links) {
          // Send processing status for each document
          const processingResponse: StreamResponse = {
            status: 'processing',
            message: `Processing document: ${link}`,
          };
          await writer.write(encoder.encode(JSON.stringify(processingResponse) + '\n'));

          // Simulate processing time (replace this with actual document processing)
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Send completion status for each document
          const completionResponse: StreamResponse = {
            status: 'completed',
            message: `Completed processing: ${link}`,
            data: { processed: true, link }
          };
          await writer.write(encoder.encode(JSON.stringify(completionResponse) + '\n'));
        }

        // Send final completion message
        const finalResponse: StreamResponse = {
          status: 'completed',
          message: 'All documents processed successfully',
          data: { totalProcessed: document_links.length }
        };
        await writer.write(encoder.encode(JSON.stringify(finalResponse) + '\n'));
      } catch (error) {
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
    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Invalid request body',
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 400 }
    );
  }
} 