import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
      // Helper for table rows
      const renderRow = (label: string, data: any, isPercentage = false) => `
        <tr>
          <td>${label}</td>
          <td>${data?.male || 0}${isPercentage ? '%' : ''}</td>
          <td>${data?.female || 0}${isPercentage ? '%' : ''}</td>
          <td>${data?.notRecorded || 0}${isPercentage ? '%' : ''}</td>
          <td><strong>${data?.total || 0}${isPercentage ? '%' : ''}</strong></td>
        </tr>
      `;

      const pdfContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            h3 { color: #666; font-size: 16px; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; color: #374151; }
            .total-row { font-weight: bold; background-color: #f9fafb; }
            .header { margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; }
            .meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">MEWA M&E System</div>
            <h1>${selectedProgramInfo?.name} Report</h1>
          </div>
          
          <div class="meta-info">
            <div><strong>Period:</strong> ${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRanges.find(d => d.value === dateRange)?.label}</div>
            <div><strong>Location:</strong> ${location === 'all' ? 'All Locations' : location}</div>
            <div><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
            <div><strong>Generated by:</strong> ${currentUser.name} (${currentUser.role})</div>
          </div>

          <h2>Service Delivery Summary</h2>
          <table>
            <tr>
              <th>Indicator</th>
              <th>Male</th>
              <th>Female</th>
              <th>Not Recorded</th>
              <th>Total</th>
            </tr>
            ${reportData.serviceDelivery ? `
              ${renderRow('Total Services', reportData.serviceDelivery.totalServices)}
              ${renderRow('Unique Clients', reportData.serviceDelivery.uniqueClients)}
              ${renderRow('Total Visits', reportData.serviceDelivery.totalVisits)}
              ${renderRow('Completion Rate', reportData.serviceDelivery.completionRate, true)}
            ` : ''}
          </table>

          ${selectedProgram === 'nsp' && reportData.nspMetrics?.byGender ? `
            <h2>NSP Specific Indicators</h2>
            <table>
              <tr>
                <th>Indicator</th>
                <th>Male</th>
                <th>Female</th>
                <th>Not Recorded</th>
                <th>Total</th>
              </tr>
              ${renderRow('Needles Distributed', reportData.nspMetrics.byGender.needlesDistributed)}
              ${renderRow('Syringes Distributed', reportData.nspMetrics.byGender.syringesDistributed)}
              ${renderRow('Needles Returned', reportData.nspMetrics.byGender.needlesReturned)}
            </table>
            <p style="margin-top: 10px; font-size: 12px;"><strong>Return Ratio:</strong> ${reportData.nspMetrics.returnRatio}%</p>
          ` : ''}

          ${selectedProgram === 'mat' && reportData.matMetrics?.byGender ? `
            <h2>MAT Specific Indicators</h2>
            <table>
              <tr>
                <th>Status</th>
                <th>Male</th>
                <th>Female</th>
                <th>Not Recorded</th>
                <th>Total</th>
              </tr>
              ${renderRow('Active Clients', reportData.matMetrics.byGender.active)}
              ${renderRow('Defaulted', reportData.matMetrics.byGender.defaulted)}
              ${renderRow('LTFU', reportData.matMetrics.byGender.ltfu)}
            </table>
            <p style="margin-top: 10px; font-size: 12px;"><strong>Average Dose:</strong> ${reportData.matMetrics.avgDose}mg</p>
          ` : ''}

          ${selectedProgram === 'condom' && reportData.condomMetrics?.byGender ? `
            <h2>Condom Distribution Indicators</h2>
            <table>
              <tr>
                <th>Item</th>
                <th>Male</th>
                <th>Female</th>
                <th>Not Recorded</th>
                <th>Total</th>
              </tr>
              ${renderRow('Male Condoms', reportData.condomMetrics.byGender.maleCondoms)}
              ${renderRow('Female Condoms', reportData.condomMetrics.byGender.femaleCondoms)}
              ${renderRow('Lubricant Packs', reportData.condomMetrics.byGender.lubricant)}
            </table>
          ` : ''}

          ${selectedProgram === 'mental-health' && reportData.mentalHealthMetrics ? `
            <h2>Mental Health Screening Indicators</h2>
            <h3>PHQ-9 Severity</h3>
            <table>
              <tr>
                <th>Severity</th>
                <th>Male</th>
                <th>Female</th>
                <th>Not Recorded</th>
                <th>Total</th>
              </tr>
              ${renderRow('Minimal (0-4)', reportData.mentalHealthMetrics.phq9.byGender.minimal)}
              ${renderRow('Mild (5-9)', reportData.mentalHealthMetrics.phq9.byGender.mild)}
              ${renderRow('Moderate (10-14)', reportData.mentalHealthMetrics.phq9.byGender.moderate)}
              ${renderRow('Severe (15+)', reportData.mentalHealthMetrics.phq9.byGender.severe)}
            </table>

            <h3>GAD-7 Severity</h3>
            <table>
              <tr>
                <th>Severity</th>
                <th>Male</th>
                <th>Female</th>
                <th>Not Recorded</th>
                <th>Total</th>
              </tr>
              ${renderRow('Minimal (0-4)', reportData.mentalHealthMetrics.gad7.byGender.minimal)}
              ${renderRow('Mild (5-9)', reportData.mentalHealthMetrics.gad7.byGender.mild)}
              ${renderRow('Moderate (10-14)', reportData.mentalHealthMetrics.gad7.byGender.moderate)}
              ${renderRow('Severe (15+)', reportData.mentalHealthMetrics.gad7.byGender.severe)}
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

          <p style="margin-top: 40px; color: #666; font-size: 10px; border-top: 1px solid #eee; padding-top: 10px;">
            This report was generated by MEWA M&E System on ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `;

      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedProgram}_report_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully! Open the HTML file to print as PDF.');
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
      let csvContent = `Report Name,${selectedProgramInfo?.name} Report\n`;
      csvContent += `Period,${dateRange === 'custom' ? `${startDate} to ${endDate}` : dateRanges.find(d => d.value === dateRange)?.label}\n`;
      csvContent += `Location,${location === 'all' ? 'All Locations' : location}\n`;
      csvContent += `Generated Date,${new Date().toLocaleString()}\n`;
      csvContent += `Generated By,${currentUser.name} (${currentUser.role})\n\n`;
      
      // Service Delivery Summary
      csvContent += `Service Delivery Summary\n`;
      csvContent += `Indicator,Male,Female,Not Recorded,Total\n`;
      
      const addRow = (label: string, data: any, isPercentage = false) => {
        const suffix = isPercentage ? '%' : '';
        return `${label},${data?.male || 0}${suffix},${data?.female || 0}${suffix},${data?.notRecorded || 0}${suffix},${data?.total || 0}${suffix}\n`;
      };

      if (reportData.serviceDelivery) {
        csvContent += addRow('Total Services', reportData.serviceDelivery.totalServices);
        csvContent += addRow('Unique Clients', reportData.serviceDelivery.uniqueClients);
        csvContent += addRow('Total Visits', reportData.serviceDelivery.totalVisits);
        csvContent += addRow('Completion Rate', reportData.serviceDelivery.completionRate, true);
      }
      csvContent += `\n`;

      if (selectedProgram === 'nsp' && reportData.nspMetrics?.byGender) {
        csvContent += `NSP Specific Indicators\n`;
        csvContent += `Indicator,Male,Female,Not Recorded,Total\n`;
        csvContent += addRow('Needles Distributed', reportData.nspMetrics.byGender.needlesDistributed);
        csvContent += addRow('Syringes Distributed', reportData.nspMetrics.byGender.syringesDistributed);
        csvContent += addRow('Needles Returned', reportData.nspMetrics.byGender.needlesReturned);
        csvContent += `Return Ratio,,,,${reportData.nspMetrics.returnRatio}%\n\n`;
      }

      if (selectedProgram === 'mat' && reportData.matMetrics?.byGender) {
        csvContent += `MAT Specific Indicators\n`;
        csvContent += `Status,Male,Female,Not Recorded,Total\n`;
        csvContent += addRow('Active Clients', reportData.matMetrics.byGender.active);
        csvContent += addRow('Defaulted', reportData.matMetrics.byGender.defaulted);
        csvContent += addRow('LTFU', reportData.matMetrics.byGender.ltfu);
        csvContent += `Average Dose,,,,${reportData.matMetrics.avgDose}mg\n\n`;
      }

      if (selectedProgram === 'condom' && reportData.condomMetrics?.byGender) {
        csvContent += `Condom Distribution Indicators\n`;
        csvContent += `Item,Male,Female,Not Recorded,Total\n`;
        csvContent += addRow('Male Condoms', reportData.condomMetrics.byGender.maleCondoms);
        csvContent += addRow('Female Condoms', reportData.condomMetrics.byGender.femaleCondoms);
        csvContent += addRow('Lubricant Packs', reportData.condomMetrics.byGender.lubricant);
        csvContent += `\n`;
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

  // Helper Component for Summary Tables
  const SummaryTable = ({ title, rows, headers = ['Indicator', 'Male', 'Female', 'Not Recorded', 'Total'] }: any) => (
    <div className="border rounded-md overflow-hidden mb-6">
      <div className="bg-gray-50 px-4 py-2 border-b font-medium text-sm text-gray-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
            <tr>
              {headers.map((h: string, i: number) => (
                <th key={i} className="px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
                <td className="px-4 py-3 text-gray-500">{row.male}</td>
                <td className="px-4 py-3 text-gray-500">{row.female}</td>
                <td className="px-4 py-3 text-gray-500">{row.notRecorded}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

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
            {/* Service Delivery Summary */}
            {reportData.serviceDelivery && (
              <SummaryTable 
                title="Service Delivery Summary" 
                rows={[
                  { label: 'Total Services', ...reportData.serviceDelivery.totalServices },
                  { label: 'Unique Clients', ...reportData.serviceDelivery.uniqueClients },
                  { label: 'Total Visits', ...reportData.serviceDelivery.totalVisits },
                  { label: 'Completion Rate (%)', ...reportData.serviceDelivery.completionRate }
                ]}
              />
            )}

            {/* Program-Specific Metrics */}
            {selectedProgram === 'nsp' && reportData.nspMetrics?.byGender && (
              <SummaryTable 
                title="NSP Specific Indicators" 
                rows={[
                  { label: 'Needles Distributed', ...reportData.nspMetrics.byGender.needlesDistributed },
                  { label: 'Syringes Distributed', ...reportData.nspMetrics.byGender.syringesDistributed },
                  { label: 'Needles Returned', ...reportData.nspMetrics.byGender.needlesReturned },
                ]}
              />
            )}

            {selectedProgram === 'mat' && reportData.matMetrics?.byGender && (
              <SummaryTable 
                title="MAT Specific Indicators" 
                headers={['Status', 'Male', 'Female', 'Not Recorded', 'Total']}
                rows={[
                  { label: 'Active Clients', ...reportData.matMetrics.byGender.active },
                  { label: 'Defaulted', ...reportData.matMetrics.byGender.defaulted },
                  { label: 'LTFU', ...reportData.matMetrics.byGender.ltfu },
                ]}
              />
            )}

            {selectedProgram === 'condom' && reportData.condomMetrics?.byGender && (
              <SummaryTable 
                title="Condom Distribution Indicators" 
                headers={['Item', 'Male', 'Female', 'Not Recorded', 'Total']}
                rows={[
                  { label: 'Male Condoms', ...reportData.condomMetrics.byGender.maleCondoms },
                  { label: 'Female Condoms', ...reportData.condomMetrics.byGender.femaleCondoms },
                  { label: 'Lubricant Packs', ...reportData.condomMetrics.byGender.lubricant },
                ]}
              />
            )}

            {selectedProgram === 'mental-health' && canAccessMentalHealth && reportData.mentalHealthMetrics && (
              <>
                <SummaryTable 
                  title="PHQ-9 Severity Distribution" 
                  headers={['Severity', 'Male', 'Female', 'Not Recorded', 'Total']}
                  rows={[
                    { label: 'Minimal (0-4)', ...reportData.mentalHealthMetrics.phq9.byGender.minimal },
                    { label: 'Mild (5-9)', ...reportData.mentalHealthMetrics.phq9.byGender.mild },
                    { label: 'Moderate (10-14)', ...reportData.mentalHealthMetrics.phq9.byGender.moderate },
                    { label: 'Severe (15+)', ...reportData.mentalHealthMetrics.phq9.byGender.severe },
                  ]}
                />
                <SummaryTable 
                  title="GAD-7 Severity Distribution" 
                  headers={['Severity', 'Male', 'Female', 'Not Recorded', 'Total']}
                  rows={[
                    { label: 'Minimal (0-4)', ...reportData.mentalHealthMetrics.gad7.byGender.minimal },
                    { label: 'Mild (5-9)', ...reportData.mentalHealthMetrics.gad7.byGender.mild },
                    { label: 'Moderate (10-14)', ...reportData.mentalHealthMetrics.gad7.byGender.moderate },
                    { label: 'Severe (15+)', ...reportData.mentalHealthMetrics.gad7.byGender.severe },
                  ]}
                />
              </>
            )}

            {/* Detailed Records Table */}
            {reportData.records && reportData.records.length > 0 && (
              <div className="mt-8">
                <h3 className="font-semibold mb-3">Detailed Records (Most Recent 50)</h3>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        {selectedProgram === 'condom' ? (
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Male</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Female</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Lubes</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Service</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.records.map((record: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {new Date(record.date || record.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{record.clientId || 'N/A'}</td>
                            {selectedProgram === 'condom' ? (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap">{record.location || location}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.maleCondoms || 0}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.femaleCondoms || 0}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.lubricant || 0}</td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 whitespace-nowrap">{record.service || selectedProgram.toUpperCase()}</td>
                                <td className="px-4 py-3 whitespace-nowrap">{record.location || location}</td>
                              </>
                            )}
                            <td className="px-4 py-3 whitespace-nowrap">{record.staff || record.createdBy || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
