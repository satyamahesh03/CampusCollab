import { useState, useRef, useEffect } from 'react';
import { domains as defaultDomains, departments as defaultDepartments, years as defaultYears } from '../utils/helpers';
import { FaSearch } from 'react-icons/fa';

const FilterBar = ({ 
  filters, 
  setFilters, 
  showDomain = true, 
  showDepartment = true, 
  showYear = true,
  domains: customDomains = null,
  departments: customDepartments = null,
  years: customYears = null
}) => {
  // Use custom values if provided, otherwise fall back to defaults
  const domains = customDomains || defaultDomains;
  const departments = customDepartments || defaultDepartments;
  const years = customYears || defaultYears;
  const [showSearchInput, setShowSearchInput] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Keep search open if it has a value
  useEffect(() => {
    if (filters.search && !showSearchInput) {
      setShowSearchInput(true);
    }
  }, [filters.search]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target) &&
        !filters.search
      ) {
        setShowSearchInput(false);
      }
    };

    if (showSearchInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSearchInput, filters.search]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  return (
    <div className="bg-transparent p-3 rounded-lg mb-4 max-w-full">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search Icon - Clickable */}
        <div className="relative" ref={searchContainerRef}>
          <button
            onClick={() => setShowSearchInput(!showSearchInput)}
            className={`p-2 border rounded-lg transition-colors flex items-center justify-center ${
              showSearchInput || filters.search
                ? 'border-amber-500 bg-amber-50 text-amber-600'
                : 'border-amber-200/50 hover:bg-amber-50/50 text-gray-600'
            }`}
            title="Search"
          >
            <FaSearch className="text-lg" />
          </button>
          
          {/* Search Input - Shows below icon when clicked */}
          {showSearchInput && (
            <div className="absolute top-full left-0 mt-2 z-20 w-64 sm:w-80">
              <div className="relative bg-white/60 backdrop-blur-sm border border-amber-200/50 rounded-lg shadow-lg">
                <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Domain Filter */}
        {showDomain && (
          <select
            value={filters.domain || ''}
            onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
            className="px-3 py-1.5 text-sm border border-amber-200/50 rounded-lg bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[140px] max-w-[200px]"
          >
            <option value="">All Domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        )}

        {/* Department Filter */}
        {showDepartment && (
          <select
            value={filters.department || ''}
            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            className="px-3 py-1.5 text-sm border border-amber-200/50 rounded-lg bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[140px] max-w-[200px]"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}

        {/* Year Filter */}
        {showYear && (
          <select
            value={filters.year || ''}
            onChange={(e) => setFilters({ ...filters, year: e.target.value })}
            className="px-3 py-1.5 text-sm border border-amber-200/50 rounded-lg bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-w-[120px] max-w-[180px]"
          >
            <option value="">All Years</option>
            {years.map((year) => (
              <option key={year} value={year}>
                Year {year}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};

export default FilterBar;

