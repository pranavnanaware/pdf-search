import { z } from 'zod';
import { Grade } from './index';

export const SearchRequestSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  grade: z.nativeEnum(Grade).optional(),
  page: z.number().min(1).optional(),
});

export const PDFProcessingRequestSchema = z.object({
  url: z.string().url('Invalid PDF URL'),
  query: z.string().min(1, 'Search query cannot be empty'),
});

export const SearchHistoryRequestSchema = z.object({
  limit: z.number().min(1).max(50).optional(),
  offset: z.number().min(0).optional(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type PDFProcessingRequest = z.infer<typeof PDFProcessingRequestSchema>;
export type SearchHistoryRequest = z.infer<typeof SearchHistoryRequestSchema>; 