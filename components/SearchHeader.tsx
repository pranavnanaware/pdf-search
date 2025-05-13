import React from 'react';
import { SearchBar } from './SearchBar';
import { GradeDropdown } from './GradeDropdown';
import { Grade } from '../types';
import { GoogleSearchResult } from '../app/types/stream';

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  onSearch: (query: string, filter?: string) => void;
  searchHistory: { query: string; filter: string }[];
  onHistorySelect: (query: string, filter: string) => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedGrade,
  setSelectedGrade,
  onSearch,
  searchHistory,
  onHistorySelect,
}) => {
  return (
    <div className="w-full px-4 relative">
      <h1 className="text-2xl font-semibold mb-4">PDF Search</h1>
      <div className="flex flex-col gap-2">
        <div className="flex items-stretch">
          <div className="flex-1">
            <SearchBar 
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={onSearch}
              placeholder="Search for PDFs..."
              history={searchHistory}
              onSelect={onHistorySelect}
            />
          </div>
          <div className="ml-4 relative z-10 h-12">
            <GradeDropdown value={selectedGrade} onChange={setSelectedGrade} />
          </div>
        </div>
      </div>
    </div>
  );
}; 