import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Search, FileText, Download, Clock, User } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ReportAuditLogProps {
  currentUser: any;
}

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521`;
const headers = { 'Authorization': `Bearer ${publicAnonKey}` };

export function ReportAuditLog({ currentUser }: ReportAuditLogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/reports/audit-log`, { headers });
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching report audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !search ||
        (log.userName || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.reportType || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.exportType || '').toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === 'all' || log.exportType === filterType;
      return matchesSearch && matchesType;
    });
  }, [logs, search, filterType]);

  const exportTypes = [...new Set(logs.map(l => l.exportType).filter(Boolean))];

  const getReportTypeColor = (type: string) => {
    if (type?.includes('HIV') || type?.includes('hiv')) return 'bg-red-50 text-red-700 border-red-200';
    if (type?.includes('Cascade') || type?.includes('cascade')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (type?.includes('Donor') || type?.includes('donor')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type?.includes('Line') || type?.includes('line')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (type?.includes('Custom') || type?.includes('custom')) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Report Audit Log</h2>
        <p className="text-sm text-gray-500">Track all report generation and export activities for data governance</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <Input
            placeholder="Search by user, report type, or format..."
            className="pl-9 h-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Export Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {exportTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-gray-500">{filtered.length} audit entries</div>

      {/* Audit Log Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3" />
              <p className="text-sm font-medium">No audit entries yet</p>
              <p className="text-xs">Report export activities will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs">User</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs">Report Type</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs">Filters Applied</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600 text-xs">Format</th>
                    <th className="py-3 px-4 text-center font-semibold text-gray-600 text-xs">Rows</th>
                    <th className="py-3 px-4 text-left font-semibold text-gray-600 text-xs">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-500" />
                          </div>
                          <span className="text-sm font-medium">{log.userName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className={`text-xs ${getReportTypeColor(log.reportType)}`}>
                          {log.reportType || 'Unknown'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {log.filters ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(log.filters || {}).filter(([_, v]) => v && v !== 'all').slice(0, 3).map(([k, v]: any) => (
                              <Badge key={k} variant="secondary" className="text-xs">{k}: {v}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No filters</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className="text-xs">
                          {log.exportType === 'CSV' ? <><Download className="w-3 h-3 mr-1 inline" />CSV</> :
                           log.exportType === 'PDF' ? <><FileText className="w-3 h-3 mr-1 inline" />PDF</> :
                           log.exportType === 'PRINT' ? 'Print' : log.exportType || '-'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        {log.rowCount ? log.rowCount.toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
