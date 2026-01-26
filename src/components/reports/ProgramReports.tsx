import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Download, 
  FileSpreadsheet, 
  Filter,
  Save,
  Trash2,
  FolderOpen,
  Syringe,
  Pill,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Users,
  AlertTriangle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ExportPreviewDialog } from './ExportPreviewDialog';

interface ProgramReportsProps {
  currentUser: any;
  canAccessClinical: boolean;
  canAccessMentalHealth: boolean;
  canExport: boolean;
}

export function ProgramReports({ currentUser, canAccessClinical, canAccessMentalHealth, canExport }: ProgramReportsProps) {
  // UI State
  const [showFilters, setShowFilters] = useState(true);
  const [showSummaryCharts, setShowSummaryCharts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('service-type');
  
  // Filter State
  const [selectedProgram, setSelectedProgram] = useState('nsp');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('all');
  const [staff, setStaff] = useState('all');
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  
  useEffect(() => {
    loadReportData();
    // In a real app, loadSavedViews() would be called here too
  }, [selectedProgram, dateRange, location, staff]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        program: selectedProgram,
        dateRange,
        location,
        staff,
      });

      if (dateRange === 'custom') {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/reports/program?${params}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      const data = await response.json();
      if (data.success) {
        setReportData(data.report);
      } else {
        toast.error('Failed to load report data');
      }
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // Render Helpers
  // ------------------------------------------------------------------

  const getStatusBadge = (value: number, type: 'completion' | 'return') => {
    if (type === 'completion') {
      if (value >= 90) return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><ArrowUp className="w-3 h-3 mr-1"/>{value}%</Badge>;
      if (value < 60) return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"><ArrowDown className="w-3 h-3 mr-1"/>{value}%</Badge>;
      return <Badge variant="outline">{value}%</Badge>;
    }
    if (type === 'return') {
      if (value >= 80) return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><ArrowUp className="w-3 h-3 mr-1"/>{value}%</Badge>;
      if (value < 60) return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200"><AlertTriangle className="w-3 h-3 mr-1"/>{value}%</Badge>;
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200">{value}%</Badge>;
    }
    return <span>{value}%</span>;
  };

  const TableRow = ({ label, data, isHeader = false, isTotal = false, percentType = null }: any) => {
    const baseClass = "px-4 py-3 text-sm border-b border-gray-100";
    const cellClass = isHeader 
      ? "font-semibold text-gray-500 bg-gray-50 uppercase text-xs tracking-wider" 
      : isTotal ? "font-bold bg-gray-50 text-gray-900" : "text-gray-700";
    
    if (isHeader) {
      return (
        <div className="grid grid-cols-12 gap-0 sticky top-0 z-10">
          <div className={`${baseClass} ${cellClass} col-span-4`}>Indicator</div>
          <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>Male</div>
          <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>Female</div>
          <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>Not Recorded</div>
          <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>Total</div>
        </div>
      );
    }

    return (
      <div className={`grid grid-cols-12 gap-0 hover:bg-blue-50/50 transition-colors ${isTotal ? 'bg-gray-50' : ''}`}>
        <div className={`${baseClass} ${cellClass} col-span-4 font-medium flex items-center gap-2`}>
          {label}
        </div>
        <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>{data?.male || 0}</div>
        <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>{data?.female || 0}</div>
        <div className={`${baseClass} ${cellClass} col-span-2 text-right`}>{data?.notRecorded || 0}</div>
        <div className={`${baseClass} ${cellClass} col-span-2 text-right font-bold`}>
          {percentType ? getStatusBadge(data?.total || 0, percentType) : (data?.total || 0)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Comprehensive reporting for MEWA M&E data</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-xs">
            {currentUser.role}
          </Badge>
          <div className="h-6 w-px bg-gray-200 mx-1" />
          <Button 
            onClick={() => setShowPreview(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            Generate Report
          </Button>
          <Button variant="outline" size="icon" onClick={() => toast.info('Exporting PDF...')}>
            <FileText className="w-4 h-4 text-gray-600" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => toast.info('Exporting Excel...')}>
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Collapsible Filter Panel */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div 
            className="px-6 py-4 bg-gray-50/50 border-b flex items-center justify-between cursor-pointer"
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900">Report Filters</span>
            </div>
            {showFilters ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
          
          {showFilters && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-semibold uppercase">Program</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nsp"><div className="flex items-center gap-2"><Syringe className="w-4 h-4"/> NSP</div></SelectItem>
                    <SelectItem value="mat"><div className="flex items-center gap-2"><Pill className="w-4 h-4"/> MAT</div></SelectItem>
                    <SelectItem value="condom"><div className="flex items-center gap-2"><Shield className="w-4 h-4"/> Condoms</div></SelectItem>
                    <SelectItem value="outreach"><div className="flex items-center gap-2"><Activity className="w-4 h-4"/> Outreach</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-semibold uppercase">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-semibold uppercase">Location</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="bg-gray-50/50 border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="Mombasa">Mombasa</SelectItem>
                    <SelectItem value="Kilifi">Kilifi</SelectItem>
                    <SelectItem value="Lamu">Lamu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 font-semibold uppercase">Options</Label>
                <div className="flex items-center gap-2 pt-2">
                   <Button 
                      variant="outline" 
                      size="sm" 
                      className={showSummaryCharts ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
                      onClick={() => setShowSummaryCharts(!showSummaryCharts)}
                   >
                     {showSummaryCharts ? 'Hide Charts' : 'Show Charts'}
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => {
                     setSelectedProgram('nsp');
                     setDateRange('month');
                     setLocation('all');
                   }}>
                     Reset
                   </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Card */}
        {reportData && (
          <Card className="rounded-xl shadow-sm border-0 overflow-hidden">
            <CardHeader className="border-b bg-white pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {selectedProgram.toUpperCase()} Report
                    <span className="text-gray-300 font-light">|</span>
                    <span className="text-sm font-normal text-gray-500">
                      {dateRange === 'custom' ? 'Custom Range' : dateRange.charAt(0).toUpperCase() + dateRange.slice(1)} • {location}
                    </span>
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {/* Primary Summary Table */}
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <TableRow isHeader />
                  
                  {reportData.serviceDelivery && (
                    <>
                      <TableRow label="Total Services" data={reportData.serviceDelivery.totalServices} isTotal />
                      <TableRow label="Unique Clients" data={reportData.serviceDelivery.uniqueClients} />
                      <TableRow label="Total Visits" data={reportData.serviceDelivery.totalVisits} />
                      <TableRow 
                        label="Completion Rate" 
                        data={reportData.serviceDelivery.completionRate} 
                        percentType="completion" 
                      />
                    </>
                  )}

                  {/* Mock Extra Rows for Demo */}
                  <TableRow label="Age 15-24" data={{ male: 12, female: 18, notRecorded: 0, total: 30 }} />
                  <TableRow label="PWID Clients" data={{ male: 45, female: 20, notRecorded: 1, total: 66 }} />
                  <TableRow label="Referrals Issued" data={{ male: 10, female: 15, notRecorded: 0, total: 25 }} />
                </div>
              </div>

              {/* NSP Sub Table */}
              {selectedProgram === 'nsp' && reportData.nspMetrics?.byGender && (
                 <div className="border-t border-gray-200 bg-gray-50/30 p-6">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Syringe className="w-4 h-4 text-blue-500" />
                      NSP Specific Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                       <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Needles Dist.</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.nspMetrics.byGender.needlesDistributed.total}</p>
                       </div>
                       <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Syringes Dist.</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.nspMetrics.byGender.syringesDistributed.total}</p>
                       </div>
                       <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Needles Returned</p>
                          <p className="text-2xl font-bold text-gray-900">{reportData.nspMetrics.byGender.needlesReturned.total}</p>
                       </div>
                       <div className="bg-white p-4 rounded-lg border shadow-sm">
                          <p className="text-xs text-gray-500 uppercase">Return Rate</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-gray-900">{reportData.nspMetrics.returnRatio}%</p>
                            {getStatusBadge(reportData.nspMetrics.returnRatio, 'return')}
                          </div>
                       </div>
                    </div>
                 </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Secondary Detailed Tabs */}
        {reportData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border p-1 rounded-lg w-full justify-start h-auto flex-wrap">
              <TabsTrigger value="service-type" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                Service Breakdown
              </TabsTrigger>
              <TabsTrigger value="referrals" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                Referrals Summary
              </TabsTrigger>
              <TabsTrigger value="commodities" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                Commodities & Stock
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="service-type" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Detailed Service Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Detailed service rows would appear here (HIV Testing, PrEP, ART, etc.)
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="referrals" className="mt-4">
               <Card>
                <CardHeader><CardTitle className="text-base">Referrals Tracker</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Referral source and destination breakdown would appear here.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commodities" className="mt-4">
               <Card>
                <CardHeader><CardTitle className="text-base">Stock Status</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <Syringe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Real-time stock levels and reorder alerts would appear here.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Export Preview Modal */}
      <ExportPreviewDialog 
        open={showPreview} 
        onOpenChange={setShowPreview}
        data={reportData}
        filters={{ program: selectedProgram, dateRange, location, staff, startDate, endDate }}
        onExportPDF={() => { toast.success('Downloading PDF...'); setShowPreview(false); }}
        onExportExcel={() => { toast.success('Downloading Excel...'); setShowPreview(false); }}
        currentUser={currentUser}
      />
    </div>
  );
}
