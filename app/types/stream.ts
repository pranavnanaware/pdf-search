export interface StreamRequest {
  document_links: string[];
  query: string;
}

export interface StreamResponse {
  status: 'processing' | 'completed' | 'error';
  message: string;
  data?: {
    searchResults?: GoogleSearchResult[];
    processed?: boolean;
    link?: string;
    relevancyReport?: {
      startPage: number;
      endPage: number;
    };
    totalProcessed?: number;
  };
  error?: string;
}

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  fileSize: string;
  pageCount: string;
  lastModified: string;
  index?: number;
  relevancyReport?: {
    startPage: number;
    endPage: number;
  };
} 