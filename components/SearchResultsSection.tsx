import React from 'react';
import { SearchResults } from './SearchResults';
import { LoadingSpinner } from './LoadingSpinner';
import { GoogleSearchResult } from '../app/types/stream';

interface SearchResultsSectionProps {
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  searchResults: GoogleSearchResult[];
  processingStatus: string | null;
}

export const SearchResultsSection: React.FC<SearchResultsSectionProps> = ({
  isLoading,
  error,
  hasSearched,
  searchResults,
  processingStatus,
}) => {
  return (
    <div className="w-full px-4 my-6">
      {isLoading && (
        <LoadingSpinner message={processingStatus || 'Searching...'} />
      )}
      
      {error && (
        <div className="text-center py-4 text-red-600">
          {error}
        </div>
      )}
      
      {!isLoading && !error && searchResults.length > 0 && (
        <SearchResults results={searchResults} />
      )}
      
      {!isLoading && !error && hasSearched && searchResults.length === 0 && (
        <div className="text-center py-4 text-gray-600">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
}; 