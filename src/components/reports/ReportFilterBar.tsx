import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Filter, RotateCcw, Calendar } from 'lucide-react';
import { type ReportFilters, DEFAULT_FILTERS } from './useReportData';

interface ReportFilterBarProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  compact?: boolean;
}

export function ReportFilterBar({ filters, onChange, compact }: ReportFilterBarProps) {
  const update = (key: keyof ReportFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([k, v]) => k !== 'period' && k !== 'dateFrom' && k !== 'dateTo' && v !== 'all' && v !== ''
  ).length;

  return (
    <div className={`bg-white border rounded-xl p-4 ${compact ? 'p-3' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-700">Filters</span>
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="text-xs">{activeFilterCount} active</Badge>
        )}
        <Button variant="ghost" size="sm" className="ml-auto text-xs" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
      </div>
      <div className={`grid gap-3 ${compact ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'}`}>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Period</label>
          <Select value={filters.period} onValueChange={(v) => update('period', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filters.period === 'custom' && (
          <>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">From</label>
              <Input type="date" className="h-8 text-xs" value={filters.dateFrom} onChange={e => update('dateFrom', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">To</label>
              <Input type="date" className="h-8 text-xs" value={filters.dateTo} onChange={e => update('dateTo', e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label className="text-xs text-gray-500 mb-1 block">County</label>
          <Select value={filters.county} onValueChange={(v) => update('county', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Counties</SelectItem>
              <SelectItem value="Mombasa">Mombasa</SelectItem>
              <SelectItem value="Kilifi">Kilifi</SelectItem>
              <SelectItem value="Lamu">Lamu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Program</label>
          <Select value={filters.program} onValueChange={(v) => update('program', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="NSP">NSP</SelectItem>
              <SelectItem value="MAT">MAT</SelectItem>
              <SelectItem value="Methadone">Methadone</SelectItem>
              <SelectItem value="Stimulants">Stimulants</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Sex</label>
          <Select value={filters.sex} onValueChange={(v) => update('sex', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Age Group</label>
          <Select value={filters.ageGroup} onValueChange={(v) => update('ageGroup', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="0-17">0-17</SelectItem>
              <SelectItem value="18-24">18-24</SelectItem>
              <SelectItem value="25-34">25-34</SelectItem>
              <SelectItem value="35-49">35-49</SelectItem>
              <SelectItem value="50+">50+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
