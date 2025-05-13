import { GoogleSearchResult } from '../app/types/stream';
import { FileText, Printer, X } from 'lucide-react';
import React from 'react';
import { useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';

// PagesPill component
const PagesPill = ({ totalPages }: { totalPages: number }) => {
  return (
    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
      {totalPages} {totalPages === 1 ? 'page' : 'pages'} total
    </div>
  );
};

// RelevancyInfo component
const RelevancyInfo = ({ totalPages, relevantPages }: { totalPages: number; relevantPages?: { startPage: number; endPage: number } }) => {
    const [startPage, setStartPage] = useState<number>(0);
    const [endPage, setEndPage] = useState<number>(0);

    useEffect(() => {
        if (relevantPages) {
            setStartPage(relevantPages.startPage);
            setEndPage(relevantPages.endPage);
        }
    }, [relevantPages]);

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

// Modal component
const Modal = ({ isOpen, onClose, children, title }: { isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-medium">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="h-[calc(90vh-4rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

const SearchResult = ({ link, title, snippet, relevancyReport, pageCount }: GoogleSearchResult) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totalPages, setTotalPages] = useState<number>(0);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // First fetch the PDF to get total pages
        const response = await fetch(`/api/pdf-proxy?url=${encodeURIComponent(link)}`);
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const pdfBytes = await response.arrayBuffer();
        
        // Load the PDF to get page count
        const pdfDoc = await PDFDocument.load(pdfBytes);
        setTotalPages(pdfDoc.getPageCount());
        
        // If we have relevancy info, only show those pages
        if (relevancyReport) {
          const previewUrl = `/api/pdf-proxy?url=${encodeURIComponent(link)}&startPage=${relevancyReport.startPage}&endPage=${relevancyReport.endPage}`;
          setPreviewUrl(previewUrl);
        } else {
          // Otherwise show first page
          const previewUrl = `/api/pdf-proxy?url=${encodeURIComponent(link)}&startPage=1&endPage=1`;
          setPreviewUrl(previewUrl);
        }
      } catch (err) {
        setError('Failed to load preview');
        console.error('Error loading preview:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [link, relevancyReport]);

  const handlePrint = async () => {
    if (!relevancyReport) return;
    
    try {
      const printUrl = `/api/pdf-proxy?url=${encodeURIComponent(link)}&startPage=${relevancyReport.startPage}&endPage=${relevancyReport.endPage}`;
      const response = await fetch(printUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (err) {
      console.error('Error printing:', err);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row border rounded-lg overflow-hidden mb-4 bg-white hover:shadow-md transition-shadow">
      {/* PDF Preview Section */}
      <div 
        className="w-full sm:w-48 h-48 bg-gray-100 relative cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="absolute inset-0 z-10" onClick={() => setIsModalOpen(true)} />
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
        <PagesPill totalPages={totalPages} />
      </div>

      {/* Content Section */}
      <div className="flex-1 p-4">
        <div className="flex justify-between items-start">
          <a 
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium text-lg mb-2 block"
          >
            {title}
          </a>
          {relevancyReport && (
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Print relevant pages"
            >
              <Printer className="w-5 h-5" />
            </button>
          )}
        </div>
        {snippet && snippet !== 'No description available' && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{snippet}</p>
        )}

        {totalPages > 0 && <RelevancyInfo totalPages={totalPages} relevantPages={relevancyReport} />}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={title}
      >
        {previewUrl && (
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-full"
          >
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-4">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-sm text-gray-500 block">Preview not available</span>
              </div>
            </div>
          </object>
        )}
      </Modal>
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
