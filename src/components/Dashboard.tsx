import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Users, Activity, TrendingUp, Search, RefreshCw, UserPlus,
  Syringe, Pill, Brain, Zap, MapPin, Wifi, Loader2,
  AlertCircle, X, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner@2.0.3';
import { DailyVisitsTable } from './DailyVisitsTable';

interface DashboardProps {
  currentUser: any;
  onNavigateToVisit: (visitId: string) => void;
  onNavigateToVisits: () => void;
}

const COLORS = {
  primary: '#4f46e5', secondary: '#06b6d4', success: '#10b981',
  warning: '#f59e0b', error: '#ef4444', purple: '#8b5cf6', pink: '#ec4899',
};

function matchProgramCount(programCounts: Record<string, any>, keywords: string[]): number {
  if (!programCounts) return 0;
  return Object.entries(programCounts).reduce((sum, [key, val]) => {
    const lower = key.toLowerCase();
    return keywords.some(kw => lower.includes(kw.toLowerCase()))
      ? sum + (Number(val) || 0)
      : sum;
  }, 0);
}

// ── Date range helpers ───────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function buildMonthOptions(count = 24) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `month:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

function buildQuarterOptions(count = 8) {
  const options = [];
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.ceil((now.getMonth() + 1) / 3);
  for (let i = 0; i < count; i++) {
    const value = `quarter:${year}-Q${quarter}`;
    const label = `Q${quarter} ${year}`;
    options.push({ value, label });
    quarter--;
    if (quarter === 0) { quarter = 4; year--; }
  }
  return options;
}

function buildYearOptions(count = 5) {
  const options = [];
  const year = new Date().getFullYear();
  for (let i = 0; i < count; i++) {
    options.push({ value: `year:${year - i}`, label: `${year - i}` });
  }
  return options;
}

function dateRangeLabel(value: string): string {
  if (value === '7')  return 'Last 7 days';
  if (value === '30') return 'Last 30 days';
  if (value === '90') return 'Last 90 days';
  if (value.startsWith('month:')) {
    const [y, m] = value.replace('month:', '').split('-');
    return `${MONTHS[parseInt(m) - 1]} ${y}`;
  }
  if (value.startsWith('quarter:')) {
    return value.replace('quarter:', '').replace('-', ' ');
  }
  if (value.startsWith('year:')) {
    return `Year ${value.replace('year:', '')}`;
  }
  return value;
}

// ── Date Range Picker component ──────────────────────────────────────────────
function DateRangePicker({
  value, onChange
}: { value: string; onChange: (v: string) => void }) {
  const [tab, setTab] = useState<'quick'|'month'|'quarter'|'year'>('quick');

  const monthOptions   = useMemo(() => buildMonthOptions(24), []);
  const quarterOptions = useMemo(() => buildQuarterOptions(8), []);
  const yearOptions    = useMemo(() => buildYearOptions(5), []);

  const tabClass = (t: string) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
      tab === t
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Tab row */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        <button className={tabClass('quick')}   onClick={() => setTab('quick')}>Quick</button>
        <button className={tabClass('month')}   onClick={() => setTab('month')}>Month</button>
        <button className={tabClass('quarter')} onClick={() => setTab('quarter')}>Quarter</button>
        <button className={tabClass('year')}    onClick={() => setTab('year')}>Year</button>
      </div>

      {/* Quick */}
      {tab === 'quick' && (
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '7',  label: 'Last 7d' },
            { value: '30', label: 'Last 30d' },
            { value: '90', label: 'Last 90d' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                value === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Month */}
      {tab === 'month' && (
        <Select value={value.startsWith('month:') ? value : ''} onValueChange={onChange}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select month…" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Quarter */}
      {tab === 'quarter' && (
        <Select value={value.startsWith('quarter:') ? value : ''} onValueChange={onChange}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select quarter…" />
          </SelectTrigger>
          <SelectContent>
            {quarterOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Year */}
      {tab === 'year' && (
        <Select value={value.startsWith('year:') ? value : ''} onValueChange={onChange}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select year…" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard({ currentUser, onNavigateToVisit, onNavigateToVisits }: DashboardProps) {
  const [metrics, setMetrics]               = useState<any>(null);
  const [recentVisits, setRecentVisits]     = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [filterLoading, setFilterLoading]   = useState(false);
  const [syncStatus, setSyncStatus]         = useState<any>({});
  const [rawProgramCounts, setRawProgramCounts] = useState<Record<string, number>>({});
  const [isInitialLoad, setIsInitialLoad]   = useState(true);

  const [filters, setFilters] = useState({
    location:  'all',
    program:   'all',
    dateRange: '30',
    search:    ''
  });

  useEffect(() => {
    if (isInitialLoad) {
      loadDashboardData(false);
      setIsInitialLoad(false);
    } else {
      loadDashboardData(false, true);
    }
  }, [filters]);

  useEffect(() => {
    const interval = setInterval(() => loadDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, [filters]);

  const loadDashboardData = async (isAutoRefresh = false, isFilterChange = false) => {
    try {
      if (!projectId || !publicAnonKey) {
        setLoading(false);
        return;
      }
      if (isFilterChange) setFilterLoading(true);

      const metricsParams = new URLSearchParams({
        location:  filters.location,
        program:   filters.program,
        dateRange: filters.dateRange,
        ...(filters.search ? { search: filters.search } : {})
      });

      const [metricsRes, visitsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/metrics?${metricsParams}`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits?limit=10`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        )
      ]);

      if (!metricsRes.ok) throw new Error(`Metrics API Error: ${metricsRes.status}`);
      if (!visitsRes.ok)  throw new Error(`Visits API Error: ${visitsRes.status}`);

      const [metricsData, visitsData] = await Promise.all([
        metricsRes.json(), visitsRes.json()
      ]);

      if (metricsData.success) {
        setMetrics(metricsData.metrics);
        setRawProgramCounts(metricsData.metrics?.programCounts || {});
      }
      if (visitsData.success) setRecentVisits(visitsData.visits);

      setSyncStatus({
        'Mombasa': { status: 'synced' },
        'Lamu':    { status: 'synced' },
        'Kilifi':  { status: 'synced' },
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (!isAutoRefresh) {
        toast.error(
          error instanceof TypeError && error.message === 'Failed to fetch'
            ? 'Cannot connect to server.'
            : 'Failed to update dashboard data.'
        );
      }
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ location: 'all', program: 'all', dateRange: '30', search: '' });
  };

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="p-6 bg-white rounded-2xl shadow-sm text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 mb-6">Please check your internet connection and try again.</p>
          <Button onClick={() => loadDashboardData(false)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────
  const nspCount       = matchProgramCount(rawProgramCounts, ['nsp']);
  const matCount       = matchProgramCount(rawProgramCounts, ['mat', 'methadone']);
  const stimulantCount = matchProgramCount(rawProgramCounts, ['stimulant']);

  const locationData = Object.entries(metrics.locationCounts || {}).map(([name, value]) => ({ name, value }));
  const ageData      = Object.entries(metrics.ageGroups    || {}).map(([name, value]) => ({ name, value }));

  const hasActiveFilters =
    filters.location !== 'all' ||
    filters.program  !== 'all' ||
    filters.dateRange !== '30' ||
    filters.search   !== '';

  const activeDateLabel = dateRangeLabel(filters.dateRange);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">M&E Dashboard</h1>
          <p className="text-gray-600 flex items-center gap-2">
            Real-time monitoring across all MEWA locations
            {hasActiveFilters && <span className="text-indigo-600">• Filtered View</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border shadow-sm">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping" />
            </div>
            <span className="text-sm text-gray-700">Live</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadDashboardData(false)} disabled={filterLoading}>
            <RefreshCw className={`w-4 h-4 ${filterLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 transition-opacity duration-200 ${filterLoading ? 'opacity-50 pointer-events-none' : ''}`}>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-xl"><Users className="w-5 h-5 text-indigo-600" /></div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <Calendar className="w-3 h-3 mr-1" />{activeDateLabel}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Total Clients</p>
            <p className="text-3xl">{metrics.totalClients}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="p-2.5 bg-cyan-50 rounded-xl w-fit mb-4"><Syringe className="w-5 h-5 text-cyan-600" /></div>
            <p className="text-sm text-gray-600">NSP Clients</p>
            <p className="text-3xl">{nspCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="p-2.5 bg-purple-50 rounded-xl w-fit mb-4"><Pill className="w-5 h-5 text-purple-600" /></div>
            <p className="text-sm text-gray-600">MAT Clients</p>
            <p className="text-3xl">{matCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="p-2.5 bg-pink-50 rounded-xl w-fit mb-4"><Brain className="w-5 h-5 text-pink-600" /></div>
            <p className="text-sm text-gray-600">Stimulants</p>
            <p className="text-3xl">{stimulantCount}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-green-50 rounded-xl"><UserPlus className="w-5 h-5 text-green-600" /></div>
              <Badge variant="secondary" className="text-xs">{activeDateLabel}</Badge>
            </div>
            <p className="text-sm text-gray-600">New Clients</p>
            <p className="text-3xl">{metrics.recentClients}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="p-2.5 bg-blue-50 rounded-xl w-fit mb-4"><Activity className="w-5 h-5 text-blue-600" /></div>
            <p className="text-sm text-gray-600">Total Visits</p>
            <p className="text-3xl">{metrics.totalVisits}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search clients…"
                className="pl-10 rounded-xl"
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
              />
            </div>

            {/* Location */}
            <Select value={filters.location} onValueChange={v => updateFilter('location', v)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Kilifi">Kilifi</SelectItem>
                <SelectItem value="Lamu">Lamu</SelectItem>
              </SelectContent>
            </Select>

            {/* Program */}
            <Select value={filters.program} onValueChange={v => updateFilter('program', v)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="NSP">NSP</SelectItem>
                <SelectItem value="MAT">MAT</SelectItem>
                <SelectItem value="Stimulants">Stimulants</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset */}
            <Button
              variant={hasActiveFilters ? 'default' : 'outline'}
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="shrink-0"
            >
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>

          {/* Date Range Picker — full width row below */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date Range
            </p>
            <DateRangePicker
              value={filters.dateRange}
              onChange={v => updateFilter('dateRange', v)}
            />
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500 self-center">Active:</span>
              {filters.location !== 'all' && (
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600"
                  onClick={() => updateFilter('location', 'all')}>
                  <MapPin className="w-3 h-3" />{filters.location}<X className="w-3 h-3" />
                </Badge>
              )}
              {filters.program !== 'all' && (
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600"
                  onClick={() => updateFilter('program', 'all')}>
                  <Activity className="w-3 h-3" />{filters.program}<X className="w-3 h-3" />
                </Badge>
              )}
              {filters.dateRange !== '30' && (
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600"
                  onClick={() => updateFilter('dateRange', '30')}>
                  <Calendar className="w-3 h-3" />{activeDateLabel}<X className="w-3 h-3" />
                </Badge>
              )}
              {filters.search && (
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-red-50 hover:text-red-600"
                  onClick={() => updateFilter('search', '')}>
                  <Search className="w-3 h-3" />"{filters.search}"<X className="w-3 h-3" />
                </Badge>
              )}
              {filterLoading && (
                <span className="flex items-center gap-1 text-xs text-indigo-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> Updating…
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-opacity duration-200 ${filterLoading ? 'opacity-50' : ''}`}>

        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader><CardTitle>Clients by Location</CardTitle></CardHeader>
          <CardContent>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">No location data</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader><CardTitle>Age Demographics</CardTitle></CardHeader>
          <CardContent>
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={ageData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {ageData.map((_, index) => (
                      <Cell key={index} fill={COLORS[Object.keys(COLORS)[index % Object.keys(COLORS).length] as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">No age data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Service Delivery + Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Service Delivery Summary
              <span className="text-sm font-normal text-gray-500 ml-1">({activeDateLabel})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.serviceSummary ? (
              <div className="space-y-6">
                {Object.values(metrics.serviceSummary).every((s: any) => s.total === 0) ? (
                  <p className="text-gray-500 text-center py-4">No services in selected period.</p>
                ) : (
                  Object.entries(metrics.serviceSummary).map(([service, stats]: [string, any]) => {
                    if (stats.total === 0) return null;
                    return (
                      <div key={service} className="space-y-2 border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-gray-900">{service}</h4>
                          <span className="font-bold text-lg text-indigo-600">{stats.total}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-gray-600">Male: <strong>{stats.male}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-pink-500" />
                            <span className="text-gray-600">Female: <strong>{stats.female}</strong></span>
                          </div>
                          {stats.notRecorded > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-gray-400" />
                              <span className="text-gray-600">Not recorded: <strong>{stats.notRecorded}</strong></span>
                            </div>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
                          {stats.male > 0 && <div style={{ width: `${(stats.male/stats.total)*100}%` }} className="bg-blue-500 h-full" />}
                          {stats.female > 0 && <div style={{ width: `${(stats.female/stats.total)*100}%` }} className="bg-pink-500 h-full" />}
                          {stats.notRecorded > 0 && <div style={{ width: `${(stats.notRecorded/stats.total)*100}%` }} className="bg-gray-400 h-full" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4" /> Sync Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(syncStatus).map(([loc, status]: [string, any]) => (
                <div key={loc} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium">{loc}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 text-xs">
                    <Wifi className="w-3 h-3" /> Synced
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <DailyVisitsTable
        currentUser={currentUser}
        onNavigateToVisits={onNavigateToVisits}
        onViewVisitDetail={onNavigateToVisit}
      />
    </div>
  );
}