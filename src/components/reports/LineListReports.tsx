import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Download, Search, ChevronLeft, ChevronRight, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { ReportFilterBar } from './ReportFilterBar';
import { hasHIVAccess } from '../../utils/permissions';

interface LineListReportsProps {
  currentUser: any;
}

const PRESETS = [
  { id: 'unsuppressedVl', label: 'Unsuppressed Viral Load', icon: '🔴', requiresHIV: true },
  { id: 'overdueVl', label: 'Overdue Viral Load', icon: '🟡', requiresHIV: true },
  { id: 'missedMatDoses', label: 'Missed MAT Doses (30d)', icon: '🟠' },
  { id: 'highPhq9', label: 'High PHQ-9 Scores', icon: '🟣' },
  { id: 'openViolenceCases', label: 'Open Violence Cases', icon: '🔴' },
  { id: 'clientsWithoutId', label: 'Clients Without ID', icon: '⚪' },
];

const PAGE_SIZE = 20;

export function LineListReports({ currentUser }: LineListReportsProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [activePreset, setActivePreset] = useState('unsuppressedVl');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showIdentifiers, setShowIdentifiers] = useState(false);
  const { data, loading } = useReportData(filters);

  const canViewHIV = hasHIVAccess(currentUser);
  const canViewIdentifiers = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager'].includes(currentUser?.role);
  const canExport = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager', 'Data Entry'].includes(currentUser?.role);

  const visiblePresets = PRESETS.filter(p => !p.requiresHIV || canViewHIV);

  const listData = useMemo(() => {
    const raw = data?.lineLists?.[activePreset] || [];
    if (!search) return raw;
    return raw.filter((row: any) =>
      Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
    );
  }, [data, activePreset, search]);

  const totalPages = Math.ceil(listData.length / PAGE_SIZE);
  const paginatedData = listData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = useMemo(() => {
    if (!paginatedData.length) return [];
    const allKeys = Object.keys(paginatedData[0]);
    if (!showIdentifiers) {
      return allKeys.filter(k => !['clientId', 'caseId'].includes(k));
    }
    return allKeys;
  }, [paginatedData, showIdentifiers]);

  const handleExport = () => {
    if (listData.length > 5000) {
      if (!confirm(`This export contains ${listData.length} rows. Are you sure you want to proceed?`)) return;
    }
    const exportData = showIdentifiers ? listData : listData.map((row: any) => {
      const { clientId, caseId, ...rest } = row;
      return rest;
    });
    exportToCSV(exportData, `line_list_${activePreset}`);
    logReportAction(currentUser, `Line List - ${activePreset}`, filters, 'CSV', listData.length);
  };

  const formatHeader = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} compact />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Line Lists & Action Reports</h2>
          <p className="text-sm text-gray-500">Filterable client-level action lists for follow-up</p>
        </div>
        <div className="flex items-center gap-2">
          {canViewIdentifiers && (
            <Button variant="outline" size="sm" onClick={() => setShowIdentifiers(!showIdentifiers)} className="text-xs">
              {showIdentifiers ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {showIdentifiers ? 'Hide IDs' : 'Show IDs'}
            </Button>
          )}
          {canExport && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap gap-2">
        {visiblePresets.map(preset => (
          <Button
            key={preset.id}
            variant={activePreset === preset.id ? 'default' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={() => { setActivePreset(preset.id); setPage(1); setSearch(''); }}
          >
            <span className="mr-1">{preset.icon}</span> {preset.label}
            {!loading && data?.lineLists?.[preset.id] && (
              <Badge variant="secondary" className="ml-2 text-xs">{data.lineLists[preset.id].length}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{PRESETS.find(p => p.id === activePreset)?.label || 'Report'}</CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2 text-gray-400" />
                <Input placeholder="Search..." className="pl-8 h-8 text-xs w-48" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <Badge variant="outline" className="text-xs">{listData.length} records</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : paginatedData.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No records found for this report</p>
              <p className="text-xs">This may indicate good program performance or no matching data</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-2 px-3 text-left font-semibold text-gray-600">#</th>
                      {columns.map(col => (
                        <th key={col} className="py-2 px-3 text-left font-semibold text-gray-600 whitespace-nowrap">{formatHeader(col)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row: any, idx: number) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-400">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                        {columns.map(col => (
                          <td key={col} className="py-2 px-3 whitespace-nowrap">
                            {col.toLowerCase().includes('status') ? (
                              <Badge variant="outline" className={`text-xs ${
                                row[col] === 'Unsuppressed' ? 'bg-red-50 text-red-700' :
                                row[col] === 'Open' ? 'bg-amber-50 text-amber-700' :
                                row[col] === 'Resolved' ? 'bg-green-50 text-green-700' : ''
                              }`}>{row[col]}</Badge>
                            ) : col.toLowerCase().includes('date') ? (
                              <span className="text-gray-600">{row[col] ? new Date(row[col]).toLocaleDateString() : '-'}</span>
                            ) : col.toLowerCase().includes('score') ? (
                              <Badge variant="outline" className={`text-xs ${parseInt(row[col]) >= 15 ? 'bg-red-50 text-red-700' : parseInt(row[col]) >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                                {row[col]}
                              </Badge>
                            ) : (
                              <span>{row[col] ?? '-'}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, listData.length)} of {listData.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs px-3">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
