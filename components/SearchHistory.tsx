
import { History } from 'lucide-react';


interface SearchHistoryProps {
    history: { query: string; filter: string }[];
    onSelect: (query: string, filter: string) => void;
  }
  
export function SearchHistory({ history, onSelect }: SearchHistoryProps) {
    if (history.length === 0) {
      return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <div className="flex items-center gap-2 text-gray-500">
            <History className="w-4 h-4" />
            <span>No search history</span>
          </div>
        </div>
      );
    }
  
    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        {history.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(item.query, item.filter)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
          >
            <History className="w-4 h-4 text-gray-400" />
            <span>{item.query + " " + item.filter}</span>
          </button>
        ))}
      </div>
    );
  }
  