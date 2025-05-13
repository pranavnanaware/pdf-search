import { NextResponse } from 'next/server';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    console.log(searchParams)
    const pdfUrl = searchParams.get('url');
    const startPage = searchParams.get('startPage');
    const endPage = searchParams.get('endPage');
    if (!pdfUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Fetch the PDF
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
        'Cache-Control': 'no-cache'
      }
    });

    // If no page range specified, return the full PDF
    if (!startPage || !endPage) {
      return new NextResponse(response.data, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': response.headers['content-length'],
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // Create a new PDF with only the specified pages
    const pdfDoc = await PDFDocument.load(response.data);
    const newPdf = await PDFDocument.create();
    
    const start = parseInt(startPage);
    const end = parseInt(endPage);
    
    // Copy specified pages
    const pages = await newPdf.copyPages(pdfDoc, Array.from(
      { length: end - start + 1 },
      (_, i) => start + i - 1
    ));
    
    // Add pages to new PDF
    pages.forEach(page => newPdf.addPage(page));
    
    // Save the new PDF
    const pdfBytes = await newPdf.save();

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBytes.length.toString(),
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error: any) {
    console.error('Error fetching PDF:', error.message);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
} 