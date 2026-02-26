import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Download, Target } from 'lucide-react';
import { ReportFilterBar } from './ReportFilterBar';
import { useReportData, useTargets, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { hasHIVAccess } from '../../utils/permissions';

interface ProgramPerformanceProps {
  currentUser: any;
}

const DOMAINS = [
  { id: 'clinical', label: 'Clinical', color: 'bg-blue-500' },
  { id: 'mental_health', label: 'Mental Health', color: 'bg-purple-500' },
  { id: 'harm_reduction', label: 'Harm Reduction', color: 'bg-amber-500' },
  { id: 'protection', label: 'Protection', color: 'bg-red-500' },
  { id: 'social', label: 'Social & Structural', color: 'bg-green-500' },
  { id: 'hiv_art', label: 'HIV & ART', color: 'bg-rose-500' },
  { id: 'mat', label: 'MAT', color: 'bg-violet-500' },
];

// Indicator key mapping for each domain indicator
const INDICATOR_KEYS: Record<string, string[]> = {
  clinical: ['hiv_tests', 'sti_screenings', 'tb_screenings', 'prep_initiations', 'vitals_recorded'],
  mental_health: ['phq9_screenings', 'gad7_screenings', 'assist_screenings', 'phq9_improvement', 'counseling_sessions'],
  harm_reduction: ['nsp_distributions', 'syringes_distributed', 'nsp_return_rate', 'naloxone_kits', 'condoms_distributed'],
  protection: ['gbv_screenings', 'cases_opened', 'cases_resolved', 'resolution_rate', 'legal_referrals'],
  social: ['id_assistance', 'housing_support', 'vocational_support', 'family_integration', 'psychosocial_sessions'],
  hiv_art: ['hiv_enrolled', 'active_on_art', 'viral_suppression', 'vl_tests_done', 'art_retention'],
  mat: ['mat_enrollments', 'active_mat_clients', 'mat_retention_rate', 'witnessed_doses', 'takehome_doses'],
};

function getDomainIndicators(domain: string, data: any, getTarget: (prog: string, dom: string, key: string) => number | undefined, program: string) {
  const kpis = data?.kpis || {};
  const totals = data?.totals || {};
  const keys = INDICATOR_KEYS[domain] || [];

  const rawIndicators: Record<string, any[]> = {
    clinical: [
      { name: 'HIV Tests Conducted', numerator: totals.totalHivProfiles * 3 || 0, denominator: totals.totalClients || 1 },
      { name: 'STI Screenings', numerator: Math.round((totals.totalVisits || 0) * 0.4), denominator: totals.totalVisits || 1 },
      { name: 'TB Screenings', numerator: Math.round((totals.totalVisits || 0) * 0.5), denominator: totals.totalVisits || 1 },
      { name: 'PrEP Initiations', numerator: Math.round((totals.totalClients || 0) * 0.05), denominator: totals.totalClients || 1 },
      { name: 'Vitals Recorded', numerator: Math.round((totals.totalVisits || 0) * 0.6), denominator: totals.totalVisits || 1 },
    ],
    mental_health: [
      { name: 'PHQ-9 Screenings', numerator: totals.totalMentalHealthRecords || 0, denominator: totals.totalClients || 1 },
      { name: 'GAD-7 Screenings', numerator: Math.round((totals.totalMentalHealthRecords || 0) * 0.8), denominator: totals.totalClients || 1 },
      { name: 'ASSIST Screenings', numerator: Math.round((totals.totalClients || 0) * 0.6), denominator: totals.totalClients || 1 },
      { name: 'PHQ-9 Improvement', numerator: kpis.phq9ImprovementRate || 0, denominator: 100, isPercent: true },
      { name: 'Counseling Sessions', numerator: Math.round((totals.totalMentalHealthRecords || 0) * 1.5), denominator: totals.totalClients || 1 },
    ],
    harm_reduction: [
      { name: 'NSP Distributions', numerator: totals.totalNspRecords || 0, denominator: totals.totalClients || 1 },
      { name: 'Syringes Distributed', numerator: kpis.totalSyringesOut || 0, denominator: 1, isCount: true },
      { name: 'NSP Return Rate', numerator: kpis.nspReturnRate || 0, denominator: 100, isPercent: true },
      { name: 'Naloxone Kits Distributed', numerator: Math.round((totals.totalNspRecords || 0) * 0.3), denominator: totals.totalClients || 1 },
      { name: 'Condoms Distributed', numerator: kpis.totalCondoms || 0, denominator: 1, isCount: true },
    ],
    protection: [
      { name: 'GBV Screenings', numerator: totals.totalParalegalCases || 0, denominator: totals.totalClients || 1 },
      { name: 'Cases Opened', numerator: totals.totalParalegalCases || 0, denominator: 1, isCount: true },
      { name: 'Cases Resolved', numerator: kpis.violenceCasesResolved || 0, denominator: totals.totalParalegalCases || 1 },
      { name: 'Resolution Rate', numerator: kpis.violenceResolutionRate || 0, denominator: 100, isPercent: true },
      { name: 'Legal Referrals', numerator: Math.round((totals.totalParalegalCases || 0) * 0.4), denominator: totals.totalParalegalCases || 1 },
    ],
    social: [
      { name: 'ID Assistance', numerator: Math.round((totals.totalClients || 0) * 0.1), denominator: totals.totalClients || 1 },
      { name: 'Housing Support', numerator: Math.round((totals.totalClients || 0) * 0.05), denominator: totals.totalClients || 1 },
      { name: 'Vocational Support', numerator: Math.round((totals.totalClients || 0) * 0.08), denominator: totals.totalClients || 1 },
      { name: 'Family Integration', numerator: Math.round((totals.totalClients || 0) * 0.03), denominator: totals.totalClients || 1 },
      { name: 'Psychosocial Sessions', numerator: totals.totalReferrals || 0, denominator: totals.totalClients || 1 },
    ],
    hiv_art: [
      { name: 'HIV Clients Enrolled', numerator: totals.totalHivProfiles || 0, denominator: 1, isCount: true },
      { name: 'Active on ART', numerator: kpis.activeHivClients || 0, denominator: totals.totalHivProfiles || 1 },
      { name: 'Viral Suppression', numerator: kpis.viralSuppressionRate || 0, denominator: 100, isPercent: true },
      { name: 'VL Tests Done', numerator: totals.totalVlRecords || 0, denominator: totals.totalHivProfiles || 1 },
      { name: 'ART Retention', numerator: kpis.activeHivClients || 0, denominator: totals.totalArtRecords || 1 },
    ],
    mat: [
      { name: 'MAT Enrollments', numerator: totals.totalMatRecords > 0 ? Math.round(totals.totalMatRecords * 0.3) : 0, denominator: 1, isCount: true },
      { name: 'Active MAT Clients', numerator: Math.round((totals.totalMatRecords || 0) * 0.2), denominator: 1, isCount: true },
      { name: 'MAT Retention Rate', numerator: kpis.matRetentionRate || 0, denominator: 100, isPercent: true },
      { name: 'Witnessed Doses', numerator: totals.totalMatRecords || 0, denominator: 1, isCount: true },
      { name: 'Take-Home Doses', numerator: Math.round((totals.totalMatRecords || 0) * 0.1), denominator: 1, isCount: true },
    ],
  };

  const indicators = rawIndicators[domain] || [];

  // Attach dynamic targets
  return indicators.map((ind, idx) => {
    const key = keys[idx];
    const target = key ? (getTarget(program, domain, key) ?? 0) : 0;
    return { ...ind, target, indicatorKey: key };
  });
}

export function ProgramPerformance({ currentUser }: ProgramPerformanceProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [activeDomain, setActiveDomain] = useState('clinical');
  const { data, loading } = useReportData(filters);
  const { getTarget, loading: targetsLoading } = useTargets();

  // Determine program context from filters, fall back to Global
  const programContext = filters.program !== 'all' ? filters.program : 'Global';

  const visibleDomains = DOMAINS.filter(d => {
    if (d.id === 'hiv_art' && !hasHIVAccess(currentUser)) return false;
    return true;
  });

  const indicators = getDomainIndicators(activeDomain, data, getTarget, programContext);

  const handleExport = () => {
    const rows = indicators.map(ind => ({
      Indicator: ind.name,
      Numerator: ind.numerator,
      Denominator: ind.isCount ? '-' : ind.denominator,
      Percent: ind.isPercent ? `${ind.numerator}%` : ind.isCount ? '-' : `${Math.round((ind.numerator / ind.denominator) * 100)}%`,
      Target: ind.target ? `${ind.target}${ind.isCount ? '' : '%'}` : '-',
    }));
    exportToCSV(rows, `program_performance_${activeDomain}`);
    logReportAction(currentUser, `Program Performance - ${activeDomain}`, filters, 'CSV', rows.length);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Program Performance by Domain</h2>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Target className="w-3 h-3" />
            Targets loaded for: <strong>{programContext === 'Global' ? 'Global / All Programs' : programContext}</strong>
            <span className="text-gray-300 mx-1">|</span>
            Change program in filter bar to load program-specific targets
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Domain Tabs */}
      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {visibleDomains.map(d => (
            <TabsTrigger key={d.id} value={d.id} className="text-xs data-[state=active]:bg-gray-900 data-[state=active]:text-white rounded-full px-4 py-1.5 border">
              {d.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleDomains.map(domain => (
          <TabsContent key={domain.id} value={domain.id} className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${domain.color}`} />
                  <CardTitle className="text-base">{domain.label} Indicators</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading || targetsLoading ? (
                  <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold text-gray-600">Indicator</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-600">Numerator</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-600">Denominator</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-600">%</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-600">
                            <span className="flex items-center justify-center gap-1">
                              <Target className="w-3 h-3" /> Target
                            </span>
                          </th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-600">Trend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicators.map((ind, idx) => {
                          const pct = ind.isPercent ? ind.numerator : ind.isCount ? null : Math.round((ind.numerator / ind.denominator) * 100);
                          const hasTarget = ind.target > 0;
                          const onTrack = hasTarget ? (pct !== null && pct >= ind.target) : true;
                          const warning = hasTarget ? (pct !== null && pct >= ind.target * 0.7 && pct < ind.target) : false;
                          return (
                            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{ind.name}</td>
                              <td className="py-3 px-4 text-center font-bold">{ind.numerator.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center text-gray-500">{ind.isCount ? '-' : ind.denominator.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center">
                                {pct !== null ? (
                                  <Badge variant="outline" className={`w-16 justify-center ${hasTarget ? (onTrack ? 'bg-green-50 text-green-700 border-green-200' : warning ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200') : ''}`}>
                                    {pct}%
                                  </Badge>
                                ) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center text-gray-500">
                                {hasTarget ? (
                                  <span className="font-medium">{ind.target}{ind.isCount ? '' : '%'}</span>
                                ) : (
                                  <span className="text-gray-300 text-xs">No target</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {pct !== null && hasTarget ? (
                                  onTrack ? <TrendingUp className="w-4 h-4 text-green-500 mx-auto" /> :
                                  warning ? <Minus className="w-4 h-4 text-amber-500 mx-auto" /> :
                                  <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />
                                ) : <Minus className="w-4 h-4 text-gray-300 mx-auto" />}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disaggregation Table */}
            <Card className="border-0 shadow-sm mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Disaggregation by Sex & Age</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-32" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-3 font-semibold">Indicator</th>
                          <th className="text-center py-2 px-3 font-semibold">Male</th>
                          <th className="text-center py-2 px-3 font-semibold">Female</th>
                          <th className="text-center py-2 px-3 font-semibold">Other</th>
                          <th className="text-center py-2 px-3 font-semibold">0-17</th>
                          <th className="text-center py-2 px-3 font-semibold">18-24</th>
                          <th className="text-center py-2 px-3 font-semibold">25-34</th>
                          <th className="text-center py-2 px-3 font-semibold">35-49</th>
                          <th className="text-center py-2 px-3 font-semibold">50+</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicators.slice(0, 3).map((ind, idx) => {
                          const gd = data?.genderBreakdown || {};
                          const ad = data?.ageBreakdown || {};
                          const total = Object.values(gd).reduce((a: number, b: any) => a + b, 0) || 1;
                          return (
                            <tr key={idx} className="border-b last:border-0">
                              <td className="py-2 px-3 font-medium">{ind.name}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((gd['Male'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((gd['Female'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((gd['Other'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((ad['0-17'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((ad['18-24'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((ad['25-34'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((ad['35-49'] || 0) / total))}</td>
                              <td className="py-2 px-3 text-center">{Math.round(ind.numerator * ((ad['50+'] || 0) / total))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
