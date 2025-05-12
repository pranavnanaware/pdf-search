import { GoogleSearchResult } from '../app/types/stream';
import { FileText } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import React from 'react';
import { useEffect, useState } from 'react';

// PagesPill component
const PagesPill = ({ totalPages }: { totalPages: number }) => {
  return (
    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
      {totalPages} pages
    </div>
  );
};

// RelevancyInfo component
const RelevancyInfo = ({ totalPages, relevantPages }: { totalPages: number; relevantPages?: { startPage: number; endPage: number } }) => {
  if (!relevantPages) {
    return (
      <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span>Checking relevancy</span>
      </div>
    );
  }

  const range = relevantPages.endPage - relevantPages.startPage + 1;
  if (range === totalPages) {
    return (
      <div className="text-sm text-gray-800 mt-2">
        All pages are relevant
      </div>
    );
  }

  return (
    <div className="text-sm text-gray-800 mt-2">
      {range == 1 ? `Page ${relevantPages.startPage} is relevant` : `Pages ${relevantPages.startPage} - ${relevantPages.endPage} are relevant`}
    </div>
  );
};

// Individual search result component
const SearchResult = ({ link, title, snippet, relevancyReport }: GoogleSearchResult) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);

  async function generatePreview() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch the PDF through our proxy
      const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(link)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const pdfBytes = await response.arrayBuffer();
      

      // Load the PDF
      const pdfDoc = await PDFDocument.load(pdfBytes, {ignoreEncryption: true});
      // Create a new PDF with just the first page
      const previewDoc = await PDFDocument.create();
      const [firstPage] = await previewDoc.copyPages(pdfDoc, [0]);
      previewDoc.addPage(firstPage);

      // Convert to blob and create URL
      const previewBytes = await previewDoc.save();
      const blob = new Blob([previewBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPageCount(pdfDoc.getPageCount());
      setPreviewUrl(url);
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Preview not available');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    generatePreview();
    // Cleanup
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [link]);

  return (
    <div className="flex flex-col sm:flex-row border rounded-lg overflow-hidden mb-4 bg-white hover:shadow-md transition-shadow">
      {/* PDF Preview Section */}
      <div className="w-full sm:w-48 h-48 bg-gray-100 relative">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-xs text-gray-500 block">Loading preview...</span>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-4">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <span className="text-xs text-gray-500 block">{error}</span>
            </div>
          </div>
        ) : (
          <object
            data={previewUrl || undefined}
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-4">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-xs text-gray-500 block">Preview not available</span>
              </div>
            </div>
          </object>
        )}
        <PagesPill totalPages={pageCount || 0} />
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4">
        <a 
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium text-lg mb-2 block"
        >
          {title}
        </a>
        {snippet && snippet !== 'No description available' && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{snippet}</p>
        )}

        {pageCount && <RelevancyInfo totalPages={pageCount} relevantPages={relevancyReport} />}
      </div>
    </div>
  );
};

// Search results container component
export const SearchResults = ({ results }: { results: GoogleSearchResult[] }) => {
  return (
    <div>
      <h2 className="text-xl font-medium mb-4">Results ({results.length})</h2>
      <div>
        {results.map((result, index) => (
          <SearchResult
            key={index}
            {...result}
          />
        ))}
      </div>
    </div>
  );
};
