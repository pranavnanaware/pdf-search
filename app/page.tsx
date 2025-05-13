'use client'
import React, { useEffect, useState } from 'react';
import { Grade } from '../types';
import { GoogleSearchResult, StreamResponse } from './types/stream';
import { SearchHeader } from '../components/SearchHeader';
import { SearchResultsSection } from '../components/SearchResultsSection';

export default function Home() {
  const [selectedGrade, setSelectedGrade] = useState<Grade>(Grade.ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<{ query: string; filter: string }[]>([]);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
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
    setHasSearched(true);
    
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
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedGrade={selectedGrade}
        setSelectedGrade={setSelectedGrade}
        onSearch={handleSearch}
        searchHistory={searchHistory}
        onHistorySelect={handleHistorySelect}
      />
      
      <SearchResultsSection
        isLoading={isLoading}
        error={error}
        hasSearched={hasSearched}
        searchResults={searchResults}
        processingStatus={processingStatus}
      />
    </div>
  );
}