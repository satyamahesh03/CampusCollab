import { domains, departments, years } from '../utils/helpers';

const FilterBar = ({ filters, setFilters, showDomain = true, showDepartment = true, showYear = true }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 flex-1 min-w-[200px]"
        />

        {/* Domain Filter */}
        {showDomain && (
          <select
            value={filters.domain || ''}
            onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[160px]"
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

