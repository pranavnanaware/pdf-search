import {  testPdfProcessing } from "./chunk-docs";

export interface GoogleSearchResult {
  title: string;
  link: string;
  snippet: string;
  fileSize: string;
  pageCount: string;
  lastModified: string;
  index?: number;
}

const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) {
  throw new Error('Missing Google Search API credentials');
}

export async function searchPDFs(query: string, grade?: string): Promise<GoogleSearchResult[]> {
  // Build the search query with grade if provided
  let searchQuery = query;
  if (grade && grade !== 'ALL') {
    searchQuery = `${query} grade ${grade}`;
  }
  searchQuery = `${searchQuery} filetype:pdf`;
  
  console.log('Final search query:', searchQuery);
  
  const resultsPerPage = 10; // Google's default and maximum per request
  const totalResults = 20; // Total results we want
  const numPages = Math.ceil(totalResults / resultsPerPage);
  
  let allResults: GoogleSearchResult[] = [];

  try {
    // Fetch results page by page
    for (let page = 0; page < numPages; page++) {
      const startIndex = page * resultsPerPage + 1;
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      
      url.searchParams.append('key', GOOGLE_SEARCH_API_KEY as string);
      url.searchParams.append('cx', GOOGLE_SEARCH_ENGINE_ID as string);
      url.searchParams.append('q', searchQuery);
      url.searchParams.append('num', resultsPerPage.toString());
      url.searchParams.append('start', startIndex.toString());

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Google Search API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items) {
        break; // No more results
      }

      const pageResults = data.items.map((item: any) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        snippet: item.snippet || item.pagemap?.metatags?.[0]?.['og:description'] || 'No description available',
        fileSize: item.pagemap?.metatags?.[0]?.['pdf:filesize'] || 'Unknown',
        pageCount: item.pagemap?.metatags?.[0]?.['pdf:pagecount'] || 'Unknown',
        lastModified: item.pagemap?.metatags?.[0]?.['pdf:lastmodified'] || 'Unknown',
      }));

      allResults = [...allResults, ...pageResults];

      // If we got fewer results than requested, we've reached the end
      if (data.items.length < resultsPerPage) {
        break;
      }
    }

    // Add indices to results
    allResults = allResults.map((result, index) => ({
      ...result,
      index
    }));
  
    return allResults;
  } catch (error) {
    console.error('Error searching PDFs:', error);
    throw error;
  }
} 