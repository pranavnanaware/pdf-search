export interface StreamRequest {
  document_links: string[];
}

export interface StreamResponse {
  status: 'processing' | 'completed' | 'error';
  message: string;
  data?: any;
  error?: string;
} 