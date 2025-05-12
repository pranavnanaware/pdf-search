'use client'
import React from 'react';
import { GradeDropdown } from '../components/GradeDropdown';
import { SearchBar } from '../components/SearchBar';
import { useEffect, useState } from 'react';
import { SearchResults } from '../components/SearchResults';
import { GoogleSearchResult } from './types/stream';
import { Grade } from '../types';
import { StreamResponse } from './types/stream';

export default function Home() {
  const [selectedGrade, setSelectedGrade] = useState<Grade>(Grade.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ query: string; filter: string }[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  
  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    try {
      const response = await fetch('/api/search/history');
      if (!response.ok) throw new Error('Failed to fetch search history');
      const data = await response.json();      
      setSearchHistory(data);
    } catch (err) {
      console.error('Error fetching search history:', err);
    }
  };

  const handleSearch = async (query: string, filter?: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setProcessingStatus('Searching for PDFs...');
    setSearchResults([]);
    
    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          document_links: [], // We'll get these from the search results
          grade: selectedGrade !== Grade.ALL ? selectedGrade : undefined
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const messages = text.split('\n').filter(Boolean);

        for (const message of messages) {
          const data: StreamResponse = JSON.parse(message);
          
          switch (data.status) {
            case 'processing':
              setProcessingStatus(data.message);
              break;
            case 'completed':
              if (data.data?.searchResults) {
                setSearchResults(data.data.searchResults);
                // Update the request with the document links
                const documentLinks = data.data.searchResults.map(r => r.link);
                // Start processing the documents
                processDocuments(query, documentLinks);
              } else if (data.data?.relevancyReport) {
                // Update the relevancy information for the processed document
                setSearchResults(prev => prev.map(result => 
                  result.link === data.data?.link
                    ? { ...result, relevancyReport: data.data.relevancyReport }
                    : result
                ));
              }
              break;
            case 'error':
              // Remove the document that failed to process
              if (data.data?.link) {
                setSearchResults(prev => prev.filter(result => result.link !== data.data?.link));
                console.log(`Removed failed document: ${data.data.link}`);
              } else {
                // Only show errors for the overall search process, not individual documents
                setError(data.error || 'An error occurred');
              }
              break;
          }
        }
      }

      // Refresh search history after successful search
      fetchSearchHistory();
    } catch (err) {
      setError('Failed to perform search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
      setProcessingStatus(null);
    }
  };

  const processDocuments = async (query: string, documentLinks: string[]) => {
    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          document_links: documentLinks
        }),
      });

      if (!response.ok) {
        throw new Error('Document processing failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const messages = text.split('\n').filter(Boolean);

        for (const message of messages) {
          const data: StreamResponse = JSON.parse(message);
          
          switch (data.status) {
            case 'processing':
              setProcessingStatus(data.message);
              break;
            case 'completed':
              if (data.data?.relevancyReport) {
                // Update the relevancy information for the processed document
                setSearchResults(prev => prev.map(result => 
                  result.link === data.data?.link
                    ? { ...result, relevancyReport: data.data.relevancyReport }
                    : result
                ));
              }
              break;
            case 'error':
              // Remove the document that failed to process
              if (data.data?.link) {
                setSearchResults(prev => prev.filter(result => result.link !== data.data?.link));
                console.log(`Removed failed document: ${data.data.link}`);
              }
              break;
          }
        }
      }
    } catch (err) {
      console.error('Error processing documents:', err);
    }
  };

  const handleHistorySelect = (query: string, filter: string) => {
    setSearchQuery(query);
    setSelectedGrade(filter as Grade);
  };

  return (
    <div className="flex flex-col items-center w-full sm:w-3/4 max-w-full mx-auto pt-6">
      <div className="w-full px-4 relative">
        <h1 className="text-2xl font-semibold mb-4">PDF Search</h1>
        {/* Search bar and grade dropdown container */}
        <div className="flex flex-col gap-2">
          <div className="flex items-stretch">
            <div className="flex-1">
              <SearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                onSearch={handleSearch}
                placeholder="Search for PDFs..."
                history={searchHistory}
                onSelect={handleHistorySelect}
              />
            </div>
            <div className="ml-4 relative z-10 h-12">
              <GradeDropdown value={selectedGrade} onChange={setSelectedGrade} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Search results section */}
      <div className="w-full px-4 my-6">
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">{processingStatus || 'Searching...'}</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-4 text-red-600">
            {error}
          </div>
        )}
        
        {!isLoading && !error && searchResults.length > 0 && (
          <SearchResults results={searchResults} />
        )}
        
        {!isLoading && !error && searchResults.length === 0 && searchQuery && (
          <div className="text-center py-4 text-gray-600">
            No results found. Try a different search term.
          </div>
        )}
      </div>
    </div>
  );
}