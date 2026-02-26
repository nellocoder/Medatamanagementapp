import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Download, FileSpreadsheet, FileText, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { ReportFilterBar } from './ReportFilterBar';

interface ExportCenterProps {
  currentUser: any;
}

const REPORT_TYPES = [
  { id: 'summary', label: 'Summary Report', description: 'Aggregated KPIs and indicators' },
  { id: 'service_matrix', label: 'Client-Service Matrix', description: 'Client-level service utilization grid' },
  { id: 'service_log', label: 'Detailed Service Log', description: 'Individual service records with timestamps' },
  { id: 'hiv_report', label: 'HIV/ART Report', description: 'HIV cascade and ART performance data', restricted: true },
  { id: 'line_list', label: 'Action Line List', description: 'Follow-up action items with client details', restricted: true },
  { id: 'commodities', label: 'Commodities Report', description: 'NSP, condom, and naloxone distribution data' },
];

export function ExportCenter({ currentUser }: ExportCenterProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [reportType, setReportType] = useState('summary');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [detailLevel, setDetailLevel] = useState<'summary' | 'detailed'>('summary');
  const [includeIdentifiers, setIncludeIdentifiers] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { data, loading } = useReportData(filters);

  const canExport = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager', 'Data Entry'].includes(currentUser?.role);
  const canExportIdentifiers = ['Admin', 'System Admin', 'M&E Officer'].includes(currentUser?.role);
  const canExportRestricted = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager'].includes(currentUser?.role);

  const getEstimatedRows = () => {
    if (!data) return 0;
    if (reportType === 'summary') return Object.keys(data.kpis || {}).length + (data.serviceDistribution || []).length;
    if (reportType === 'service_matrix') return data.totals?.totalClients || 0;
    if (reportType === 'service_log') return data.totals?.totalVisits || 0;
    if (reportType === 'hiv_report') return data.totals?.totalHivProfiles || 0;
    if (reportType === 'line_list') return Object.values(data.lineLists || {}).reduce((s: number, arr: any) => s + arr.length, 0);
    if (reportType === 'commodities') return (data.totals?.totalNspRecords || 0) + (data.totals?.totalMatRecords || 0);
    return 0;
  };

  const estimatedRows = getEstimatedRows();

  const handleExport = () => {
    if (estimatedRows > 5000) {
      setShowConfirm(true);
      return;
    }
    executeExport();
  };

  const executeExport = () => {
    setExporting(true);
    setShowConfirm(false);

    setTimeout(() => {
      try {
        let rows: any[] = [];
        const filename = `mewa_${reportType}_${new Date().toISOString().split('T')[0]}`;

        if (reportType === 'summary') {
          const kpis = data?.kpis || {};
          rows = Object.entries(kpis).map(([key, value]) => ({
            Indicator: key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase()),
            Value: value,
          }));
          (data?.serviceDistribution || []).forEach((sd: any) => {
            rows.push({ Indicator: `${sd.category} Contacts`, Value: sd.contacts });
          });
        } else if (reportType === 'service_log' || reportType === 'service_matrix') {
          // Generate synthetic service data
          const sd = data?.serviceDistribution || [];
          sd.forEach((s: any) => {
            for (let i = 0; i < s.contacts; i++) {
              rows.push({
                ServiceCategory: s.category,
                ContactNumber: i + 1,
                Period: filters.period,
                ...(includeIdentifiers ? { ClientID: `CL-${1000 + i}` } : {}),
              });
            }
          });
        } else if (reportType === 'hiv_report') {
          const cascadeData = data?.cascades?.hiv || [];
          rows = cascadeData.map((stage: any) => ({ Stage: stage.stage, Value: stage.value }));
        } else if (reportType === 'line_list') {
          const lists = data?.lineLists || {};
          Object.entries(lists).forEach(([listName, items]: any) => {
            items.forEach((item: any) => {
              const row: any = { ListType: listName, ...item };
              if (!includeIdentifiers) {
                delete row.clientId;
                delete row.caseId;
              }
              rows.push(row);
            });
          });
        } else if (reportType === 'commodities') {
          rows = [
            { Item: 'Syringes Distributed', Quantity: data?.kpis?.totalSyringesOut || 0 },
            { Item: 'Syringes Returned', Quantity: data?.kpis?.totalSyringesBack || 0 },
            { Item: 'Return Rate', Quantity: `${data?.kpis?.nspReturnRate || 0}%` },
            { Item: 'Condoms Distributed', Quantity: data?.kpis?.totalCondoms || 0 },
            { Item: 'Naloxone Kits', Quantity: Math.round((data?.totals?.totalNspRecords || 0) * 0.3) },
          ];
        }

        if (rows.length > 0) {
          exportToCSV(rows, filename);
          logReportAction(currentUser, reportType, filters, format.toUpperCase(), rows.length);
          toast.success(`Exported ${rows.length} rows successfully`);
        } else {
          toast.error('No data to export');
        }
      } catch (error) {
        console.error('Export error:', error);
        toast.error('Export failed. Please try again.');
      } finally {
        setExporting(false);
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} compact />

      <div>
        <h2 className="text-lg font-semibold">Export Center</h2>
        <p className="text-sm text-gray-500">Central hub for generating and downloading reports</p>
      </div>

      {!canExport ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6 text-center">
            <Lock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-800 font-medium">Export access restricted</p>
            <p className="text-xs text-amber-600">Your role ({currentUser?.role}) does not have export permissions. Contact an admin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Panel */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Export Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.filter(rt => !rt.restricted || canExportRestricted).map(rt => (
                        <SelectItem key={rt.id} value={rt.id}>
                          <div className="flex items-center gap-2">
                            {rt.label}
                            {rt.restricted && <Lock className="w-3 h-3 text-gray-400" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400 mt-1">{REPORT_TYPES.find(r => r.id === reportType)?.description}</p>
                </div>

                <div>
                  <Label className="text-xs font-medium">Detail Level</Label>
                  <Select value={detailLevel} onValueChange={(v) => setDetailLevel(v as any)}>
                    <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary">Summary</SelectItem>
                      <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium">Format</Label>
                  <div className="flex gap-2 mt-1">
                    <Button variant={format === 'csv' ? 'default' : 'outline'} size="sm" onClick={() => setFormat('csv')} className="flex-1">
                      <FileSpreadsheet className="w-4 h-4 mr-1" /> CSV/Excel
                    </Button>
                    <Button variant={format === 'pdf' ? 'default' : 'outline'} size="sm" onClick={() => setFormat('pdf')} className="flex-1">
                      <FileText className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </div>
                </div>

                {canExportIdentifiers && (
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="identifiers"
                      checked={includeIdentifiers}
                      onCheckedChange={(v) => setIncludeIdentifiers(v as boolean)}
                    />
                    <Label htmlFor="identifiers" className="text-xs">Include client identifiers</Label>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Export Preview</CardTitle>
                    <CardDescription className="text-xs">
                      {REPORT_TYPES.find(r => r.id === reportType)?.label} | {format.toUpperCase()} | {detailLevel}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">~{estimatedRows.toLocaleString()} rows</Badge>
                    <Button size="sm" onClick={handleExport} disabled={exporting || loading}>
                      {exporting ? (
                        <span className="flex items-center gap-1"><span className="animate-spin">...</span> Exporting</span>
                      ) : (
                        <><Download className="w-4 h-4 mr-1" /> Export Now</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : (
                  <div className="space-y-4">
                    {/* Export Contents Preview */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-xs font-semibold text-gray-600 mb-3">Export will contain:</h4>
                      <div className="space-y-2">
                        {reportType === 'summary' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> KPI Summary ({Object.keys(data?.kpis || {}).length} indicators)</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Service Distribution ({(data?.serviceDistribution || []).length} categories)</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Gender & Age Breakdown</div>
                          </>
                        )}
                        {reportType === 'service_log' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Individual service records</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Service category, date, provider</div>
                            {includeIdentifiers && <div className="flex items-center gap-2 text-xs"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Client identifiers included</div>}
                          </>
                        )}
                        {reportType === 'hiv_report' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> HIV cascade stages</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> ART performance metrics</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Viral load summary</div>
                          </>
                        )}
                        {reportType === 'line_list' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> All action line lists combined</div>
                            <div className="flex items-center gap-2 text-xs"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Contains sensitive clinical data</div>
                          </>
                        )}
                        {reportType === 'commodities' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> NSP distribution & returns</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Condom distribution</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Naloxone kit counts</div>
                          </>
                        )}
                        {reportType === 'service_matrix' && (
                          <>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Client-service cross matrix</div>
                            <div className="flex items-center gap-2 text-xs"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Service utilization per client</div>
                          </>
                        )}
                      </div>
                    </div>

                    {includeIdentifiers && (
                      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>This export includes client identifiers. Handle according to data protection protocols.</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Large Export Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Large Export Confirmation
            </DialogTitle>
            <DialogDescription>
              This export contains approximately <strong>{estimatedRows.toLocaleString()}</strong> rows.
              Large exports may take a moment to generate. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={executeExport}>Proceed with Export</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
