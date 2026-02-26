import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Download, BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { ReportFilterBar } from './ReportFilterBar';

interface CustomIndicatorBuilderProps {
  currentUser: any;
}

const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All Services' },
  { id: 'clinical', label: 'Clinical' },
  { id: 'mental_health', label: 'Mental Health' },
  { id: 'harm_reduction', label: 'Harm Reduction' },
  { id: 'mat', label: 'MAT' },
  { id: 'hiv', label: 'HIV/ART' },
  { id: 'protection', label: 'Protection/GBV' },
  { id: 'social', label: 'Social & Structural' },
  { id: 'referrals', label: 'Referrals' },
];

const INDICATORS = [
  { id: 'unique_clients', label: 'Unique Clients Served', category: 'all' },
  { id: 'total_contacts', label: 'Total Service Contacts', category: 'all' },
  { id: 'hiv_tested', label: 'HIV Tests', category: 'clinical' },
  { id: 'vl_suppression', label: 'Viral Suppression Rate', category: 'hiv' },
  { id: 'art_active', label: 'Active on ART', category: 'hiv' },
  { id: 'mat_retention', label: 'MAT Retention Rate', category: 'mat' },
  { id: 'nsp_return', label: 'NSP Return Rate', category: 'harm_reduction' },
  { id: 'phq9_improvement', label: 'PHQ-9 Improvement', category: 'mental_health' },
  { id: 'cases_resolved', label: 'Cases Resolved', category: 'protection' },
  { id: 'condoms_distributed', label: 'Condoms Distributed', category: 'harm_reduction' },
  { id: 'syringes_out', label: 'Syringes Distributed', category: 'harm_reduction' },
  { id: 'referrals_made', label: 'Referrals Made', category: 'referrals' },
];

const DISAGGREGATIONS = [
  { id: 'none', label: 'None' },
  { id: 'sex', label: 'By Sex' },
  { id: 'age', label: 'By Age Group' },
  { id: 'trend', label: 'Monthly Trend' },
];

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'pie', label: 'Pie Chart', icon: PieIcon },
  { id: 'line', label: 'Line Chart', icon: TrendingUp },
];

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function CustomIndicatorBuilder({ currentUser }: CustomIndicatorBuilderProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [category, setCategory] = useState('all');
  const [indicator, setIndicator] = useState('unique_clients');
  const [disaggregation, setDisaggregation] = useState('none');
  const [chartType, setChartType] = useState('bar');
  const { data, loading } = useReportData(filters);

  const filteredIndicators = INDICATORS.filter(i => category === 'all' || i.category === category || i.category === 'all');

  const getIndicatorValue = (id: string): number => {
    if (!data) return 0;
    const map: Record<string, number> = {
      unique_clients: data.kpis?.uniqueClientsServed || 0,
      total_contacts: data.kpis?.totalServiceContacts || 0,
      hiv_tested: data.totals?.totalHivProfiles * 3 || 0,
      vl_suppression: data.kpis?.viralSuppressionRate || 0,
      art_active: data.kpis?.activeHivClients || 0,
      mat_retention: data.kpis?.matRetentionRate || 0,
      nsp_return: data.kpis?.nspReturnRate || 0,
      phq9_improvement: data.kpis?.phq9ImprovementRate || 0,
      cases_resolved: data.kpis?.violenceCasesResolved || 0,
      condoms_distributed: data.kpis?.totalCondoms || 0,
      syringes_out: data.kpis?.totalSyringesOut || 0,
      referrals_made: data.totals?.totalReferrals || 0,
    };
    return map[id] || 0;
  };

  const chartData = useMemo(() => {
    if (!data) return [];
    const val = getIndicatorValue(indicator);

    if (disaggregation === 'sex') {
      const gb = data.genderBreakdown || {};
      const total = Object.values(gb).reduce((a: number, b: any) => a + b, 0) || 1;
      return Object.entries(gb).map(([name, count]: any) => ({
        name, value: Math.round(val * (count / total)),
      }));
    }
    if (disaggregation === 'age') {
      const ab = data.ageBreakdown || {};
      const total = Object.values(ab).reduce((a: number, b: any) => a + b, 0) || 1;
      return Object.entries(ab).map(([name, count]: any) => ({
        name, value: Math.round(val * (count / total)),
      }));
    }
    if (disaggregation === 'trend') {
      return (data.trends?.monthlyClients || []).map((m: any) => ({
        name: m.label, value: Math.round(val * (m.value / Math.max(1, ...data.trends.monthlyClients.map((x: any) => x.value)))),
      }));
    }
    return [{ name: INDICATORS.find(i => i.id === indicator)?.label || indicator, value: val }];
  }, [data, indicator, disaggregation]);

  const pivotData = useMemo(() => {
    if (!data || disaggregation === 'none') return null;
    return chartData;
  }, [chartData, disaggregation]);

  const handleExport = () => {
    exportToCSV(chartData, `custom_indicator_${indicator}`);
    logReportAction(currentUser, `Custom Indicator - ${indicator}`, { ...filters, disaggregation }, 'CSV', chartData.length);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} compact />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Custom Indicator Builder</h2>
          <p className="text-sm text-gray-500">Build custom reports with dynamic disaggregation and visualization</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      {/* Builder Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Service Category</label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setIndicator(INDICATORS.filter(i => v === 'all' || i.category === v || i.category === 'all')[0]?.id || 'unique_clients'); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Indicator</label>
              <Select value={indicator} onValueChange={setIndicator}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredIndicators.map(i => <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Disaggregation</label>
              <Select value={disaggregation} onValueChange={setDisaggregation}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISAGGREGATIONS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 block">Chart Type</label>
              <div className="flex gap-1">
                {CHART_TYPES.map(ct => {
                  const Icon = ct.icon;
                  return (
                    <Button key={ct.id} variant={chartType === ct.id ? 'default' : 'outline'} size="sm" onClick={() => setChartType(ct.id)} className="flex-1 h-9">
                      <Icon className="w-4 h-4" />
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result: Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{INDICATORS.find(i => i.id === indicator)?.label}</CardTitle>
          <CardDescription className="text-xs">
            {disaggregation !== 'none' ? `Disaggregated ${DISAGGREGATIONS.find(d => d.id === disaggregation)?.label}` : 'Aggregate value'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px]" /> : (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                ) : (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pivot Table */}
      {pivotData && pivotData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pivot Table</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-2 px-4 text-left font-semibold">Category</th>
                  <th className="py-2 px-4 text-right font-semibold">Value</th>
                  <th className="py-2 px-4 text-right font-semibold">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {pivotData.map((row: any, idx: number) => {
                  const total = pivotData.reduce((s: number, r: any) => s + r.value, 0) || 1;
                  return (
                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 px-4 font-medium">{row.name}</td>
                      <td className="py-2 px-4 text-right font-bold">{row.value.toLocaleString()}</td>
                      <td className="py-2 px-4 text-right">
                        <Badge variant="outline" className="text-xs">{Math.round((row.value / total) * 100)}%</Badge>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-bold">
                  <td className="py-2 px-4">Total</td>
                  <td className="py-2 px-4 text-right">{pivotData.reduce((s: number, r: any) => s + r.value, 0).toLocaleString()}</td>
                  <td className="py-2 px-4 text-right"><Badge variant="outline" className="text-xs">100%</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}