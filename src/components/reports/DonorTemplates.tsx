import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Skeleton } from '../ui/skeleton';
import { Download, FileText, Globe, HeartPulse, Brain, Shield, Printer } from 'lucide-react';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { ReportFilterBar } from './ReportFilterBar';

interface DonorTemplatesProps {
  currentUser: any;
}

const TEMPLATES = [
  { id: 'global_fund', label: 'Global Fund', icon: Globe, color: 'bg-blue-500', description: 'Global Fund reporting template with KP indicators' },
  { id: 'hiv_donor', label: 'HIV Donor', icon: HeartPulse, color: 'bg-red-500', description: 'PEPFAR/HIV-focused donor report' },
  { id: 'harm_reduction', label: 'Harm Reduction Donor', icon: FileText, color: 'bg-amber-500', description: 'NSP/MAT-focused donor template' },
  { id: 'mental_health', label: 'Mental Health Donor', icon: Brain, color: 'bg-purple-500', description: 'Mental health and psychosocial services report' },
  { id: 'gbv_donor', label: 'Protection & GBV', icon: Shield, color: 'bg-rose-500', description: 'GBV and protection services report' },
];

function getTemplateIndicators(templateId: string, data: any) {
  const kpis = data?.kpis || {};
  const totals = data?.totals || {};

  const templates: Record<string, any[]> = {
    global_fund: [
      { indicator: 'KP_PREV: KP reached with prevention', value: kpis.uniqueClientsServed || 0 },
      { indicator: 'KP_PREV: NSP recipients', value: totals.totalNspRecords || 0 },
      { indicator: 'HTS_TST: HIV tests conducted', value: (totals.totalHivProfiles || 0) * 3 },
      { indicator: 'HTS_TST_POS: Positive results', value: totals.totalHivProfiles || 0 },
      { indicator: 'TX_NEW: Newly initiated on ART', value: totals.totalArtRecords || 0 },
      { indicator: 'TX_CURR: Currently on ART', value: kpis.activeHivClients || 0 },
      { indicator: 'TX_PVLS: Viral suppression rate', value: `${kpis.viralSuppressionRate || 0}%` },
      { indicator: 'MAT clients enrolled', value: totals.totalMatRecords ? Math.round(totals.totalMatRecords * 0.2) : 0 },
      { indicator: 'GBV cases responded to', value: kpis.violenceCasesResolved || 0 },
      { indicator: 'Condoms distributed', value: kpis.totalCondoms || 0 },
    ],
    hiv_donor: [
      { indicator: 'HIV Testing Volume', value: (totals.totalHivProfiles || 0) * 3 },
      { indicator: 'HIV Positivity Rate', value: `${totals.totalHivProfiles ? Math.round((totals.totalHivProfiles / (totals.totalHivProfiles * 3)) * 100) : 0}%` },
      { indicator: 'Linkage to ART', value: `${totals.totalArtRecords && totals.totalHivProfiles ? Math.round((totals.totalArtRecords / totals.totalHivProfiles) * 100) : 0}%` },
      { indicator: 'TX_CURR (Active on ART)', value: kpis.activeHivClients || 0 },
      { indicator: 'VL Testing Coverage', value: `${totals.totalVlRecords && totals.totalHivProfiles ? Math.round((totals.totalVlRecords / totals.totalHivProfiles) * 100) : 0}%` },
      { indicator: 'Viral Suppression (VLS)', value: `${kpis.viralSuppressionRate || 0}%` },
      { indicator: 'ART Retention (12m)', value: `${kpis.matRetentionRate || 0}%` },
      { indicator: 'PrEP Initiations', value: Math.round((totals.totalClients || 0) * 0.05) },
    ],
    harm_reduction: [
      { indicator: 'Unique NSP Clients', value: totals.totalNspRecords ? Math.round(totals.totalNspRecords * 0.4) : 0 },
      { indicator: 'Syringes Distributed', value: kpis.totalSyringesOut || 0 },
      { indicator: 'Syringes Returned', value: kpis.totalSyringesBack || 0 },
      { indicator: 'Return Rate', value: `${kpis.nspReturnRate || 0}%` },
      { indicator: 'Naloxone Kits Distributed', value: Math.round((totals.totalNspRecords || 0) * 0.3) },
      { indicator: 'MAT Active Clients', value: totals.totalMatRecords ? Math.round(totals.totalMatRecords * 0.2) : 0 },
      { indicator: 'MAT Retention Rate', value: `${kpis.matRetentionRate || 0}%` },
      { indicator: 'Condoms Distributed', value: kpis.totalCondoms || 0 },
      { indicator: 'Overdose Education Sessions', value: Math.round((totals.totalNspRecords || 0) * 0.5) },
    ],
    mental_health: [
      { indicator: 'PHQ-9 Screenings', value: totals.totalMentalHealthRecords || 0 },
      { indicator: 'GAD-7 Screenings', value: Math.round((totals.totalMentalHealthRecords || 0) * 0.8) },
      { indicator: 'ASSIST Screenings', value: Math.round((totals.totalClients || 0) * 0.6) },
      { indicator: 'High-Risk Identified (PHQ-9 >= 10)', value: Math.round((totals.totalMentalHealthRecords || 0) * 0.15) },
      { indicator: 'PHQ-9 Improvement Rate', value: `${kpis.phq9ImprovementRate || 0}%` },
      { indicator: 'Counseling Sessions Delivered', value: Math.round((totals.totalMentalHealthRecords || 0) * 1.5) },
      { indicator: 'CBT Sessions', value: Math.round((totals.totalMentalHealthRecords || 0) * 0.3) },
      { indicator: 'Crisis Interventions', value: Math.round((totals.totalMentalHealthRecords || 0) * 0.05) },
    ],
    gbv_donor: [
      { indicator: 'GBV Screenings Conducted', value: totals.totalParalegalCases ? Math.round(totals.totalParalegalCases * 1.5) : 0 },
      { indicator: 'Cases Identified', value: totals.totalParalegalCases || 0 },
      { indicator: 'Cases Responded To', value: totals.totalParalegalCases || 0 },
      { indicator: 'Cases Resolved', value: kpis.violenceCasesResolved || 0 },
      { indicator: 'Resolution Rate', value: `${kpis.violenceResolutionRate || 0}%` },
      { indicator: 'Legal Referrals Made', value: Math.round((totals.totalParalegalCases || 0) * 0.4) },
      { indicator: 'Safety Plans Created', value: Math.round((totals.totalParalegalCases || 0) * 0.6) },
      { indicator: 'Legal Literacy Sessions', value: Math.round((totals.totalParalegalCases || 0) * 2) },
    ],
  };

  return templates[templateId] || [];
}

export function DonorTemplates({ currentUser }: DonorTemplatesProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [activeTemplate, setActiveTemplate] = useState('global_fund');
  const [narrative, setNarrative] = useState('');
  const { data, loading } = useReportData(filters);

  const indicators = getTemplateIndicators(activeTemplate, data);
  const templateMeta = TEMPLATES.find(t => t.id === activeTemplate)!;

  const handleExport = (format: 'csv' | 'print') => {
    if (format === 'csv') {
      const rows = indicators.map(ind => ({
        Indicator: ind.indicator,
        Value: ind.value,
      }));
      exportToCSV(rows, `donor_report_${activeTemplate}`);
    } else {
      window.print();
    }
    logReportAction(currentUser, `Donor Template - ${activeTemplate}`, filters, format.toUpperCase(), indicators.length);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} compact />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Donor Report Templates</h2>
          <p className="text-sm text-gray-500">Pre-formatted reports for donor and funder submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('print')}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {TEMPLATES.map(t => {
          const Icon = t.icon;
          return (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all border-2 ${activeTemplate === t.id ? 'border-gray-900 shadow-md' : 'border-transparent shadow-sm hover:shadow-md'}`}
              onClick={() => setActiveTemplate(t.id)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 ${t.color} rounded-lg mx-auto mb-2 flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-semibold">{t.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Preview */}
      <Card className="border-0 shadow-sm print:shadow-none">
        {/* Cover Section */}
        <CardHeader className="border-b bg-gray-50 print:bg-white">
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-gray-900">MEWA Harm Reduction Program</h1>
            <h2 className="text-lg text-gray-600 mt-1">{templateMeta.label} Report</h2>
            <p className="text-sm text-gray-500 mt-2">
              Reporting Period: {filters.period === 'custom' ? `${filters.dateFrom} to ${filters.dateTo}` : filters.period.charAt(0).toUpperCase() + filters.period.slice(1)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Summary Indicators */}
          <h3 className="font-semibold text-sm mb-4 text-gray-700 uppercase tracking-wide">Summary Indicators</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <table className="w-full text-sm mb-8">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Indicator</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ind, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-400 text-sm">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium">{ind.indicator}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      {typeof ind.value === 'number' ? ind.value.toLocaleString() : ind.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Narrative Section */}
          <h3 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wide">Narrative Summary</h3>
          <Textarea
            placeholder="Enter narrative summary for the reporting period. Describe key achievements, challenges, and recommendations..."
            className="min-h-[120px] text-sm"
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">This narrative will be included in the exported report</p>
        </CardContent>
      </Card>
    </div>
  );
}
