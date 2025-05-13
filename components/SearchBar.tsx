import { Search,  } from 'lucide-react';
import React from 'react';
import { useState, useRef } from 'react';
import { SearchHistory } from './SearchHistory';


interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string, filter: string) => void;
  placeholder?: string;
  history?: Array<{ query: string; filter: string }>;
  onSelect: (query: string, filter: string) => void;
  filter?: string;
}

export function SearchBar({ value, onChange, onSearch, placeholder = "Search...", history = [], onSelect }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value, 'ALL');
  };

  const handleHistorySelect = (query: string, filter: string) => {
    onChange(query);
    onSelect(query, filter);
    inputRef.current?.focus();
  };

  return (
    <div className="relative z-50">
      <form onSubmit={handleSubmit} className="flex bg-gray-100 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 focus-within:ring-1 focus-within:ring-gray-400 overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 200);
          }}
          className="flex-1 h-12 pl-4 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          className="h-12 w-12 flex items-center justify-center bg-gray-900 text-white hover:bg-gray-800 transition duration-200"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>
      {isFocused && <SearchHistory history={history} onSelect={handleHistorySelect} />}
    </div>
  );
}
