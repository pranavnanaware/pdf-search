import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pdfUrl = searchParams.get('url');

    if (!pdfUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
        'Cache-Control': 'no-cache'
      }
    });

    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': response.headers['content-length'],
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error: any) {
    console.error('Error fetching PDF:', error.message);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
} 