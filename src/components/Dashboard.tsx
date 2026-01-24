import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  Clock, 
  Search, 
  RefreshCw, 
  UserPlus, 
  Syringe, 
  Pill, 
  Brain, 
  FileText,
  Zap,
  MapPin,
  Wifi,
  Loader2,
  Maximize2,
  AlertCircle,
  Download,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  LineChart, 
  Line, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner@2.0.3';
import { DailyVisitsTable } from './DailyVisitsTable';
import { VisitDetail } from './VisitDetail';

interface DashboardProps {
  currentUser: any;
  onNavigateToVisit: (visitId: string) => void;
  onNavigateToVisits: () => void;
}

const COLORS = {
  primary: '#4f46e5',
  secondary: '#06b6d4',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

const PROGRAM_COLORS = ['#4f46e5', '#06b6d4', '#8b5cf6', '#ec4899'];

export function Dashboard({ currentUser, onNavigateToVisit, onNavigateToVisits }: DashboardProps) {
  // State for Data
  const [metrics, setMetrics] = useState<any>(null);
  const [recentVisits, setRecentVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>({});
  
  // State for Interactions
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [filters, setFilters] = useState({
    location: 'all',
    program: 'all',
    dateRange: '30',
    search: ''
  });

  // Initial Load & Auto-Refresh
  useEffect(() => {
    loadDashboardData(false); // Initial load shows errors
    const interval = setInterval(() => loadDashboardData(true), 30000); // Auto-refresh suppresses errors
    return () => clearInterval(interval);
  }, [filters]); // Reload when filters change

  const loadDashboardData = async (isAutoRefresh = false) => {
    try {
      if (!projectId || !publicAnonKey) {
        setLoading(false);
        return;
      }

      // 1. Fetch Metrics (Server-Side Calculation)
      // Pass filters to the server so it calculates numbers correctly
      const metricsParams = new URLSearchParams({
        location: filters.location,
        program: filters.program,
        dateRange: filters.dateRange
      });

      const metricsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/metrics?${metricsParams}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      // 2. Fetch Recent Visits (Limit 10 for feed)
      const visitsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits?limit=10`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!metricsRes.ok || !visitsRes.ok) {
        throw new Error('Server returned an error');
      }

      const [metricsData, visitsData] = await Promise.all([
        metricsRes.json(),
        visitsRes.json()
      ]);

      if (metricsData.success) setMetrics(metricsData.metrics);
      if (visitsData.success) setRecentVisits(visitsData.visits);

      // Simulate Sync Status (Backend doesn't provide this yet)
      setSyncStatus({
        'Mombasa': { status: 'synced', lastSync: new Date(Date.now() - 300000), nextSync: 5 },
        'Lamu': { status: 'synced', lastSync: new Date(Date.now() - 60000), nextSync: 15 },
        'Kilifi': { status: 'synced', lastSync: new Date(Date.now() - 180000), nextSync: 7 }
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (!isAutoRefresh) {
        toast.error('Failed to update dashboard. Server might be unreachable.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleViewVisitDetail = async (visitId: string) => {
    onNavigateToVisit(visitId);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-4 md:p-8 flex flex-col items-center justify-center min-h-screen bg-gray-50 space-y-4">
        <div className="p-6 bg-white rounded-2xl shadow-sm text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-gray-600 mb-6">There was a problem connecting to the server. Please check your internet connection and try again.</p>
          <Button onClick={() => loadDashboardData(false)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  // --- Data Mapping for UI ---
  
  // Extract counts safely
  const nspCount = metrics.programCounts?.['NSP'] || 0;
  const matCount = (metrics.programCounts?.['MAT'] || 0) + (metrics.programCounts?.['Methadone'] || 0);
  const stimulantCount = metrics.programCounts?.['Stimulants'] || 0;

  // Chart Data
  const locationData = Object.entries(metrics.locationCounts || {}).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(metrics.ageGroups || {}).map(([name, value]) => ({ name, value }));

  // Helper
  const hasActiveFilters = filters.location !== 'all' || filters.program !== 'all' || filters.search !== '';

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">M&E Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring across all MEWA locations
            {hasActiveFilters && <span className="ml-2 text-indigo-600">• Filtered View</span>}
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
          <Button variant="outline" size="sm" onClick={() => loadDashboardData(false)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-xl">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" /> +12%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-3xl">{metrics.totalClients}</p>
            </div>
          </CardContent>
        </Card>

        {/* NSP Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-cyan-50 rounded-xl">
                <Syringe className="w-5 h-5 text-cyan-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">NSP Clients</p>
              <p className="text-3xl">{nspCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* MAT Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Pill className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">MAT Clients</p>
              <p className="text-3xl">{matCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* Stimulant Users */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-pink-50 rounded-xl">
                <Brain className="w-5 h-5 text-pink-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Stimulants</p>
              <p className="text-3xl">{stimulantCount}</p>
            </div>
          </CardContent>
        </Card>

        {/* New Registrations */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <Badge variant="secondary">30 Days</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">New Clients</p>
              <p className="text-3xl">{metrics.recentClients}</p>
            </div>
          </CardContent>
        </Card>

        {/* Total Visits */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-3xl">{metrics.totalVisits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search clients..." 
                className="pl-10 rounded-xl"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            <Select value={filters.location} onValueChange={(v) => updateFilter('location', v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Kilifi">Kilifi</SelectItem>
                <SelectItem value="Lamu">Lamu</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.program} onValueChange={(v) => updateFilter('program', v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="NSP">NSP</SelectItem>
                <SelectItem value="MAT">MAT</SelectItem>
                <SelectItem value="Stimulants">Stimulants</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setFilters({location: 'all', program: 'all', dateRange: '30', search: ''})}>
              <X className="w-4 h-4 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section - FIXED WIDTH ERROR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Clients by Location */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Clients by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={locationData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Age Groups */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Age Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full" style={{ minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={ageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {ageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[Object.keys(COLORS)[index % 5] as keyof typeof COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Service Delivery Summary */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Service Delivery Summary (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.serviceSummary ? (
              <div className="space-y-6">
                 {/* Check if all totals are 0 */}
                 {Object.values(metrics.serviceSummary).every((s: any) => s.total === 0) ? (
                    <p className="text-gray-500 text-center py-4">No services delivered in the last 7 days.</p>
                 ) : (
                    Object.entries(metrics.serviceSummary).map(([service, stats]: [string, any]) => {
                       if (stats.total === 0) return null;
                       
                       return (
                         <div key={service} className="space-y-2 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center mb-1">
                               <h4 className="font-medium text-gray-900">{service}</h4>
                               <div className="text-right">
                                 <span className="text-xs text-gray-500 uppercase tracking-wider mr-2">Total</span>
                                 <span className="font-bold text-lg text-indigo-600">{stats.total}</span>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1.5 min-w-[80px]">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  <span className="text-gray-600">Male:</span>
                                  <span className="font-medium">{stats.male}</span>
                                </div>
                                <div className="w-px h-4 bg-gray-200"></div>
                                <div className="flex items-center gap-1.5 min-w-[80px]">
                                  <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                                  <span className="text-gray-600">Female:</span>
                                  <span className="font-medium">{stats.female}</span>
                                </div>
                                {stats.notRecorded > 0 && (
                                  <>
                                    <div className="w-px h-4 bg-gray-200"></div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                      <span className="text-gray-600">Not recorded:</span>
                                      <span className="font-medium">{stats.notRecorded}</span>
                                    </div>
                                  </>
                                )}
                            </div>
                            
                            {/* Visual Bar */}
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                               {stats.male > 0 && <div style={{ width: `${(stats.male / stats.total) * 100}%` }} className="bg-blue-500 h-full" />}
                               {stats.female > 0 && <div style={{ width: `${(stats.female / stats.total) * 100}%` }} className="bg-pink-500 h-full" />}
                               {stats.notRecorded > 0 && <div style={{ width: `${(stats.notRecorded / stats.total) * 100}%` }} className="bg-gray-400 h-full" />}
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

        {/* Sync Status */}
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
                  {status.status === 'synced' ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <Wifi className="w-3 h-3" /> Synced
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-amber-600 text-xs">
                      <Loader2 className="w-3 h-3 animate-spin" /> Syncing
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <DailyVisitsTable 
        currentUser={currentUser} 
        onNavigateToVisits={onNavigateToVisits} 
        onViewVisitDetail={handleViewVisitDetail} 
      />

    </div>
  );
}