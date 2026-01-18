import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Download, 
  FileSpreadsheet, 
  Calendar,
  Syringe,
  Pill,
  Shield,
  Brain,
  Heart,
  Users,
  Activity,
  TrendingUp,
  Filter
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface ProgramReportsProps {
  currentUser: any;
  canAccessClinical: boolean;
  canAccessMentalHealth: boolean;
  canExport: boolean;
}

export function ProgramReports({ currentUser, canAccessClinical, canAccessMentalHealth, canExport }: ProgramReportsProps) {
  const [selectedProgram, setSelectedProgram] = useState('nsp');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('all');
  const [staff, setStaff] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const programs = [
    { id: 'nsp', name: 'NSP (Needle & Syringe)', icon: Syringe, color: 'text-blue-600' },
    { id: 'mat', name: 'MAT (Methadone)', icon: Pill, color: 'text-green-600' },
    { id: 'condom', name: 'Condom Distribution', icon: Shield, color: 'text-purple-600' },
    ...(canAccessMentalHealth ? [
      { id: 'mental-health', name: 'Mental Health Services', icon: Brain, color: 'text-pink-600' },
      { id: 'psychosocial', name: 'Psychosocial Support', icon: Heart, color: 'text-red-600' }
    ] : []),
    ...(canAccessClinical ? [
      { id: 'clinical', name: 'Clinical Services', icon: Activity, color: 'text-indigo-600' }
    ] : []),
    { id: 'outreach', name: 'Outreach Activities', icon: Users, color: 'text-amber-600' },
  ];

  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'Mombasa', label: 'Mombasa' },
    { value: 'Lamu', label: 'Lamu' },
    { value: 'Kilifi', label: 'Kilifi' },
  ];

  useEffect(() => {
    loadReportData();
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
        // Always use real data from the backend
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

  const handleExportPDF = async () => {
    if (!canExport) {
      toast.error('You do not have export permissions');
      return;
    }
    
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    try {
      // Create PDF content as HTML
      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #4f46e5; color: white; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; }
            .metric-label { color: #666; font-size: 14px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #333; }
            .header { margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">MEWA M&E System</div>
            <h1>${selectedProgramInfo?.name} Report</h1>
            <p><strong>Period:</strong> ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRanges.find(d => d.value === dateRange)?.label}</p>
            <p><strong>Location:</strong> ${location === 'all' ? 'All Locations' : location}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Generated by:</strong> ${currentUser.name} (${currentUser.role})</p>
          </div>

          <h2>Summary Statistics</h2>
          <div class="metric">
            <div class="metric-label">Total Services</div>
            <div class="metric-value">${reportData.totalServices || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Unique Clients</div>
            <div class="metric-value">${reportData.uniqueClients || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Visits</div>
            <div class="metric-value">${reportData.totalVisits || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Completion Rate</div>
            <div class="metric-value">${reportData.completionRate || 0}%</div>
          </div>

          ${selectedProgram === 'nsp' && reportData.nspMetrics ? `
            <h2>NSP Specific Metrics</h2>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Needles Distributed</td><td>${reportData.nspMetrics.needlesDistributed}</td></tr>
              <tr><td>Syringes Distributed</td><td>${reportData.nspMetrics.syringesDistributed}</td></tr>
              <tr><td>Return Ratio</td><td>${reportData.nspMetrics.returnRatio}%</td></tr>
            </table>
          ` : ''}

          ${selectedProgram === 'mat' && reportData.matMetrics ? `
            <h2>MAT Specific Metrics</h2>
            <table>
              <tr><th>Status</th><th>Count</th></tr>
              <tr><td>Active Clients</td><td>${reportData.matMetrics.active}</td></tr>
              <tr><td>Defaulted</td><td>${reportData.matMetrics.defaulted}</td></tr>
              <tr><td>LTFU</td><td>${reportData.matMetrics.ltfu}</td></tr>
              <tr><td>Average Dose</td><td>${reportData.matMetrics.avgDose}mg</td></tr>
            </table>
          ` : ''}

          ${selectedProgram === 'condom' && reportData.condomMetrics ? `
            <h2>Condom Distribution Metrics</h2>
            <table>
              <tr><th>Item</th><th>Quantity</th></tr>
              <tr><td>Male Condoms</td><td>${reportData.condomMetrics.maleCondoms}</td></tr>
              <tr><td>Female Condoms</td><td>${reportData.condomMetrics.femaleCondoms}</td></tr>
              <tr><td>Lubricant Packs</td><td>${reportData.condomMetrics.lubricant}</td></tr>
            </table>
          ` : ''}

          ${reportData.records && reportData.records.length > 0 ? `
            <h2>Detailed Records (First 50)</h2>
            <table>
              <tr>
                <th>Date</th>
                <th>Client ID</th>
                ${selectedProgram === 'condom' ? `
                  <th>Location</th>
                  <th>Male</th>
                  <th>Female</th>
                  <th>Lubricants</th>
                ` : `
                  <th>Service</th>
                  <th>Location</th>
                `}
                <th>Staff</th>
              </tr>
              ${reportData.records.slice(0, 50).map((record: any) => `
                <tr>
                  <td>${new Date(record.date || record.createdAt).toLocaleDateString()}</td>
                  <td>${record.clientId || 'N/A'}</td>
                  ${selectedProgram === 'condom' ? `
                    <td>${record.location || location}</td>
                    <td>${record.maleCondoms || 0}</td>
                    <td>${record.femaleCondoms || 0}</td>
                    <td>${record.lubricant || 0}</td>
                  ` : `
                    <td>${record.service || selectedProgram.toUpperCase()}</td>
                    <td>${record.location || location}</td>
                  `}
                  <td>${record.staff || record.createdBy || 'N/A'}</td>
                </tr>
              `).join('')}
            </table>
          ` : ''}

          <p style="margin-top: 40px; color: #666; font-size: 12px;">
            This report was generated by MEWA M&E System on ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `;

      // Create a blob and download
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProgram}_report_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully! Open the HTML file and use your browser to print as PDF.');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export report');
    }
  };

  const handleExportExcel = async () => {
    if (!canExport) {
      toast.error('You do not have export permissions');
      return;
    }
    
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    try {
      // Create CSV content
      let csvContent = `${selectedProgramInfo?.name} Report\n`;
      csvContent += `Period,${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRanges.find(d => d.value === dateRange)?.label}\n`;
      csvContent += `Location,${location === 'all' ? 'All Locations' : location}\n`;
      csvContent += `Generated,${new Date().toLocaleString()}\n`;
      csvContent += `Generated by,${currentUser.name} (${currentUser.role})\n\n`;
      
      csvContent += `Summary Statistics\n`;
      csvContent += `Metric,Value\n`;
      csvContent += `Total Services,${reportData.totalServices || 0}\n`;
      csvContent += `Unique Clients,${reportData.uniqueClients || 0}\n`;
      csvContent += `Total Visits,${reportData.totalVisits || 0}\n`;
      csvContent += `Completion Rate,${reportData.completionRate || 0}%\n\n`;

      if (selectedProgram === 'nsp' && reportData.nspMetrics) {
        csvContent += `NSP Metrics\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Needles Distributed,${reportData.nspMetrics.needlesDistributed}\n`;
        csvContent += `Syringes Distributed,${reportData.nspMetrics.syringesDistributed}\n`;
        csvContent += `Return Ratio,${reportData.nspMetrics.returnRatio}%\n\n`;
      }

      if (selectedProgram === 'mat' && reportData.matMetrics) {
        csvContent += `MAT Metrics\n`;
        csvContent += `Status,Count\n`;
        csvContent += `Active,${reportData.matMetrics.active}\n`;
        csvContent += `Defaulted,${reportData.matMetrics.defaulted}\n`;
        csvContent += `LTFU,${reportData.matMetrics.ltfu}\n`;
        csvContent += `Average Dose,${reportData.matMetrics.avgDose}mg\n\n`;
      }

      if (selectedProgram === 'condom' && reportData.condomMetrics) {
        csvContent += `Condom Distribution\n`;
        csvContent += `Item,Quantity\n`;
        csvContent += `Male Condoms,${reportData.condomMetrics.maleCondoms}\n`;
        csvContent += `Female Condoms,${reportData.condomMetrics.femaleCondoms}\n`;
        csvContent += `Lubricant Packs,${reportData.condomMetrics.lubricant}\n\n`;
      }

      if (reportData.records && reportData.records.length > 0) {
        csvContent += `Detailed Records\n`;
        if (selectedProgram === 'condom') {
          csvContent += `Date,Client ID,Location,Male Condoms,Female Condoms,Lubricants,Staff\n`;
          reportData.records.forEach((record: any) => {
            csvContent += `${new Date(record.date || record.createdAt).toLocaleDateString()},${record.clientId || 'N/A'},${record.location || location},${record.maleCondoms || 0},${record.femaleCondoms || 0},${record.lubricant || 0},${record.staff || record.createdBy || 'N/A'}\n`;
          });
        } else {
          csvContent += `Date,Client ID,Service,Location,Staff\n`;
          reportData.records.forEach((record: any) => {
            csvContent += `${new Date(record.date || record.createdAt).toLocaleDateString()},${record.clientId || 'N/A'},${record.service || selectedProgram.toUpperCase()},${record.location || location},${record.staff || record.createdBy || 'N/A'}\n`;
          });
        }
      }

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProgram}_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Excel/CSV report exported successfully!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export report');
    }
  };

  const selectedProgramInfo = programs.find(p => p.id === selectedProgram);
  const Icon = selectedProgramInfo?.icon || Activity;

  return (
    <div className="space-y-6">
      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Program Selection */}
            <div>
              <Label>Program</Label>
              <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(prog => {
                    const ProgIcon = prog.icon;
                    return (
                      <SelectItem key={prog.id} value={prog.id}>
                        <div className="flex items-center gap-2">
                          <ProgIcon className={`w-4 h-4 ${prog.color}`} />
                          {prog.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRanges.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label>Location</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map(loc => (
                    <SelectItem key={loc.value} value={loc.value}>
                      {loc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Staff Filter */}
            <div>
              <Label>Staff Member</Label>
              <Select value={staff} onValueChange={setStaff}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  <SelectItem value="current">My Records Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Button onClick={loadReportData} disabled={loading || (dateRange === 'custom' && (!startDate || !endDate))}>
              <TrendingUp className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
            {canExport && reportData && (
              <>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handleExportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className={`w-6 h-6 ${selectedProgramInfo?.color}`} />
              {selectedProgramInfo?.name} Report
            </CardTitle>
            <p className="text-sm text-gray-500">
              Period: {dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRanges.find(d => d.value === dateRange)?.label}
              {location !== 'all' && ` | Location: ${location}`}
            </p>
          </CardHeader>
          <CardContent>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Services</p>
                <p className="text-2xl font-semibold">{reportData.totalServices || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Unique Clients</p>
                <p className="text-2xl font-semibold">{reportData.uniqueClients || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Total Visits</p>
                <p className="text-2xl font-semibold">{reportData.totalVisits || 0}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Completion Rate</p>
                <p className="text-2xl font-semibold">{reportData.completionRate || 0}%</p>
              </div>
            </div>

            {/* Program-Specific Metrics */}
            {selectedProgram === 'nsp' && reportData.nspMetrics && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">NSP Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Needles Distributed</p>
                    <p className="text-xl font-semibold">{reportData.nspMetrics.needlesDistributed}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Syringes Distributed</p>
                    <p className="text-xl font-semibold">{reportData.nspMetrics.syringesDistributed}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Return Ratio</p>
                    <p className="text-xl font-semibold">{reportData.nspMetrics.returnRatio}%</p>
                  </div>
                </div>
              </div>
            )}

            {selectedProgram === 'mat' && reportData.matMetrics && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">MAT Metrics</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Active Clients</p>
                    <p className="text-xl font-semibold text-green-600">{reportData.matMetrics.active}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Defaulted</p>
                    <p className="text-xl font-semibold text-amber-600">{reportData.matMetrics.defaulted}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">LTFU</p>
                    <p className="text-xl font-semibold text-red-600">{reportData.matMetrics.ltfu}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Average Dose</p>
                    <p className="text-xl font-semibold">{reportData.matMetrics.avgDose}mg</p>
                  </div>
                </div>
              </div>
            )}

            {selectedProgram === 'condom' && reportData.condomMetrics && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">Condom Distribution Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Male Condoms</p>
                    <p className="text-xl font-semibold">{reportData.condomMetrics.maleCondoms}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Female Condoms</p>
                    <p className="text-xl font-semibold">{reportData.condomMetrics.femaleCondoms}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Lubricant Packs</p>
                    <p className="text-xl font-semibold">{reportData.condomMetrics.lubricant}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedProgram === 'mental-health' && canAccessMentalHealth && reportData.mentalHealthMetrics && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-3">Mental Health Screening Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">PHQ-9 Severity Distribution</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Minimal:</span>
                        <Badge variant="outline">{reportData.mentalHealthMetrics.phq9.minimal}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mild:</span>
                        <Badge variant="outline">{reportData.mentalHealthMetrics.phq9.mild}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Moderate:</span>
                        <Badge className="bg-amber-100 text-amber-800">{reportData.mentalHealthMetrics.phq9.moderate}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Severe:</span>
                        <Badge className="bg-red-100 text-red-800">{reportData.mentalHealthMetrics.phq9.severe}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">GAD-7 Severity Distribution</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Minimal:</span>
                        <Badge variant="outline">{reportData.mentalHealthMetrics.gad7.minimal}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mild:</span>
                        <Badge variant="outline">{reportData.mentalHealthMetrics.gad7.mild}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Moderate:</span>
                        <Badge className="bg-amber-100 text-amber-800">{reportData.mentalHealthMetrics.gad7.moderate}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Severe:</span>
                        <Badge className="bg-red-100 text-red-800">{reportData.mentalHealthMetrics.gad7.severe}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Generic table for other data */}
            {reportData.records && reportData.records.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Detailed Records</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        {selectedProgram === 'condom' ? (
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Male Condoms</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Female Condoms</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lubricants</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.records.map((record: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {selectedProgram === 'condom' ? (
                              <>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {new Date(record.date || record.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.clientId || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.location || location}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.maleCondoms || 0}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.femaleCondoms || 0}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.lubricant || 0}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.staff || record.createdBy || 'N/A'}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                  {new Date(record.date || record.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.clientId || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.service || selectedProgram.toUpperCase()}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.location || location}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.staff || record.createdBy || 'N/A'}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Showing {reportData.records.length} records
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!loading && !reportData && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Select filters and click "Generate Report" to view data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}