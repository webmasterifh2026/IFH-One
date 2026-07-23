'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { EnterpriseCard } from '@/components/ui/enterprise-card';

export interface FilterBarProps {
  onSearch: (term: string) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  filterOptions: {
    label: string;
    key: string;
    values: Array<{ label: string; value: string }>;
  }[];
  searchPlaceholder?: string;
}

export function FilterBar({
  onSearch,
  onFilterChange,
  filterOptions,
  searchPlaceholder = 'Search by reference number, project, vendor...',
}: FilterBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...activeFilters };

    if (newFilters[key] === value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }

    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    setSearchTerm('');
    setActiveFilters({});
    onSearch('');
    onFilterChange({});
  };

  const activeFilterCount = Object.keys(activeFilters).length;

  return (
    <EnterpriseCard className="mb-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F7B45] focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {filterOptions.map((option) => (
          <div key={option.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">{option.label}</label>
            <select
              value={activeFilters[option.key] || ''}
              onChange={(e) => handleFilterChange(option.key, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0F7B45] focus:border-transparent"
            >
              <option value="">All</option>
              {option.values.map((val) => (
                <option key={val.value} value={val.value}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {activeFilterCount > 0 && (
          <span className="text-sm text-gray-600">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
          </span>
        )}
        {(searchTerm || activeFilterCount > 0) && (
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </EnterpriseCard>
  );
}
