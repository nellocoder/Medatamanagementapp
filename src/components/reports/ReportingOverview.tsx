import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Users, Activity, HeartPulse, TestTube, Pill, Syringe, Brain, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ReportFilterBar } from './ReportFilterBar';
import { useReportData, useTargets, DEFAULT_FILTERS, type ReportFilters } from './useReportData';

interface ReportingOverviewProps {
  currentUser: any;
}

// Mapping overview KPI keys to indicator keys in the kpi_overview domain
const KPI_TARGET_KEYS = [
  'unique_clients_served',
  'total_service_contacts',
  'active_hiv_clients',
  'viral_suppression_rate',
  'mat_retention_rate_kpi',
  'nsp_return_rate_kpi',
  'phq9_improvement_rate',
  'violence_cases_resolved',
];

export function ReportingOverview({ currentUser }: ReportingOverviewProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const { data, loading } = useReportData(filters);
  const { getTarget } = useTargets();

  const programContext = filters.program !== 'all' ? filters.program : 'Global';
  const kpis = data?.kpis || {};
  const trends = data?.trends || {};
  const serviceDistribution = data?.serviceDistribution || [];

  // Resolve dynamic targets for each KPI
  const resolveTarget = (idx: number): number | undefined => {
    const key = KPI_TARGET_KEYS[idx];
    if (!key) return undefined;
    const t = getTarget(programContext, 'kpi_overview', key);
    return t && t > 0 ? t : undefined;
  };

  const kpiCards = [
    { label: 'Unique Clients Served', value: kpis.uniqueClientsServed || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Service Contacts', value: kpis.totalServiceContacts || 0, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Active HIV Clients', value: kpis.activeHivClients || 0, icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Viral Suppression Rate', value: `${kpis.viralSuppressionRate || 0}%`, icon: TestTube, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'MAT Retention Rate', value: `${kpis.matRetentionRate || 0}%`, icon: Pill, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'NSP Return Rate', value: `${kpis.nspReturnRate || 0}%`, icon: Syringe, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'PHQ-9 Improvement Rate', value: `${kpis.phq9ImprovementRate || 0}%`, icon: Brain, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Violence Cases Resolved', value: kpis.violenceCasesResolved || 0, icon: Shield, color: 'text-orange-600', bg: 'bg-orange-50' },
  ].map((kpi, idx) => ({ ...kpi, target: resolveTarget(idx) }));

  const getStatusColor = (value: number, target?: number) => {
    if (!target) return '';
    if (value >= target) return 'text-green-600';
    if (value >= target * 0.7) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          const numVal = typeof kpi.value === 'string' ? parseInt(kpi.value) : kpi.value;
          return (
            <Card key={kpi.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                {loading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /></div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">{kpi.label}</p>
                      <p className={`text-2xl font-bold ${kpi.target ? getStatusColor(numVal, kpi.target) : 'text-gray-900'}`}>
                        {kpi.value}
                      </p>
                      {kpi.target && (
                        <div className="flex items-center gap-1 mt-1">
                          {numVal >= kpi.target ? (
                            <TrendingUp className="w-3 h-3 text-green-500" />
                          ) : (
                            <TrendingDown className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-400">Target: {kpi.target}%</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-10 h-10 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Clients Served</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px]" /> : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <BarChart data={trends.monthlyClients || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Unique Clients" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">ART Retention Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px]" /> : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <LineChart data={trends.artRetention || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Active on ART" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Viral Suppression Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px]" /> : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <LineChart data={trends.vlSuppression || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="rate" name="Suppression %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">MAT Active Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px]" /> : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <BarChart data={trends.matActive || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Active Clients" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">NSP Distribution Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-[250px]" /> : (
              <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <BarChart data={trends.nspDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Syringes Distributed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Service Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[300px]" /> : (
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                <BarChart data={serviceDistribution} layout="vertical" margin={{ left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="contacts" name="Total Contacts" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}