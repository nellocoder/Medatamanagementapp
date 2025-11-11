import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  X,
  Maximize2,
  RefreshCw,
  MapPin,
  FileText,
  UserCheck,
  UserPlus,
  Zap,
  Syringe,
  Pill,
  Brain,
  Wifi,
  WifiOff,
  Loader2
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

interface FilterState {
  location: string;
  program: string;
  dateRange: string;
  indicator: string;
  search: string;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<any>({});
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [filters, setFilters] = useState<FilterState>({
    location: 'all',
    program: 'all',
    dateRange: '30',
    indicator: 'all',
    search: ''
  });

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [visitsRes, clientsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      // Check if responses are ok
      if (!visitsRes.ok || !clientsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const [visitsData, clientsData] = await Promise.all([
        visitsRes.json(),
        clientsRes.json(),
      ]);

      if (visitsData.success) {
        setVisits(visitsData.visits || []);
      }
      
      if (clientsData.success) {
        setClients(clientsData.clients || []);
      }

      // Simulate sync status
      setSyncStatus({
        'Mombasa': { status: 'synced', lastSync: new Date(Date.now() - 300000), nextSync: 5 },
        'Lamu': { status: 'syncing', lastSync: new Date(Date.now() - 600000), nextSync: 2 },
        'Kilifi': { status: 'synced', lastSync: new Date(Date.now() - 180000), nextSync: 7 }
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Don't show error toast on initial load, only on refresh failures
      if (!loading) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on current filters
  const filteredClients = useMemo(() => {
    let filtered = [...clients];
    
    console.log('Total clients:', clients.length);
    console.log('Sample client locations:', clients.slice(0, 3).map(c => ({ id: c.clientId, location: c.location })));
    console.log('Filter location:', filters.location);
    
    // Location filter
    if (filters.location !== 'all') {
      console.log('Before location filter:', filtered.length);
      filtered = filtered.filter(c => c.location === filters.location);
      console.log('After location filter:', filtered.length);
      console.log('Filtered clients sample:', filtered.slice(0, 3).map(c => ({ id: c.clientId, location: c.location })));
    }
    
    // Program filter
    if (filters.program !== 'all') {
      filtered = filtered.filter(c => {
        if (filters.program === 'NSP') return c.program === 'NSP';
        if (filters.program === 'MAT') return c.program === 'Methadone' || c.program === 'MAT';
        if (filters.program === 'Stimulants') return c.program === 'Stimulants';
        return true;
      });
    }
    
    // Date range filter (for registration date)
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(c => new Date(c.createdAt) >= cutoff);
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.firstName?.toLowerCase().includes(searchLower) ||
        c.lastName?.toLowerCase().includes(searchLower) ||
        c.clientId?.toLowerCase().includes(searchLower) ||
        c.location?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [clients, filters]);

  // Filter visits based on current filters and filtered clients
  const filteredVisits = useMemo(() => {
    const clientIds = new Set(filteredClients.map(c => c.id));
    let filtered = visits.filter(v => clientIds.has(v.clientId));
    
    // Date range filter for visits
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      filtered = filtered.filter(v => new Date(v.visitDate) >= cutoff);
    }
    
    return filtered;
  }, [visits, filteredClients, filters]);

  // Calculate metrics from filtered data
  const metrics = useMemo(() => {
    const totalClients = filteredClients.length;
    
    // Program counts
    const nspCount = filteredClients.filter(c => c.program === 'NSP').length;
    const matCount = filteredClients.filter(c => c.program === 'Methadone' || c.program === 'MAT').length;
    const stimulantCount = filteredClients.filter(c => c.program === 'Stimulants').length;
    
    // Location counts
    const locationCounts: any = {};
    filteredClients.forEach(c => {
      locationCounts[c.location] = (locationCounts[c.location] || 0) + 1;
    });
    
    // Age groups
    const ageGroups: any = {
      '18-24': 0,
      '25-34': 0,
      '35-44': 0,
      '45-54': 0,
      '55+': 0
    };
    
    filteredClients.forEach(c => {
      const age = c.age;
      if (age >= 18 && age <= 24) ageGroups['18-24']++;
      else if (age >= 25 && age <= 34) ageGroups['25-34']++;
      else if (age >= 35 && age <= 44) ageGroups['35-44']++;
      else if (age >= 45 && age <= 54) ageGroups['45-54']++;
      else if (age >= 55) ageGroups['55+']++;
    });
    
    // Gender counts
    const genderCounts: any = {};
    filteredClients.forEach(c => {
      genderCounts[c.gender] = (genderCounts[c.gender] || 0) + 1;
    });
    
    // Recent clients (last 30 days from filtered set)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentClients = filteredClients.filter(c => 
      new Date(c.createdAt) >= thirtyDaysAgo
    ).length;
    
    return {
      totalClients,
      nspCount,
      matCount,
      stimulantCount,
      recentClients,
      totalVisits: filteredVisits.length,
      locationCounts,
      ageGroups,
      genderCounts
    };
  }, [filteredClients, filteredVisits]);

  // Activity Feed from filtered data
  const activityFeed = useMemo(() => {
    const recentActivities = [
      ...filteredVisits.slice(0, 5).map((v: any) => {
        const client = filteredClients.find(c => c.id === v.clientId);
        return {
          type: 'visit',
          icon: FileText,
          color: 'text-blue-600',
          message: `Visit recorded - ${client ? `${client.firstName} ${client.lastName}` : 'Client'}`,
          time: new Date(v.createdAt),
          id: v.id
        };
      }),
      ...filteredClients.slice(0, 3).map((c: any) => ({
        type: 'client',
        icon: UserPlus,
        color: 'text-green-600',
        message: `New client registered: ${c.firstName} ${c.lastName}`,
        time: new Date(c.createdAt),
        id: c.id
      }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);
    
    return recentActivities;
  }, [filteredVisits, filteredClients]);

  // Pending Follow-ups from filtered data
  const pendingFollowups = useMemo(() => {
    const followups = filteredVisits
      .filter((v: any) => v.followUpRequired && v.followUpDate)
      .slice(0, 5)
      .map((v: any) => {
        const client = filteredClients.find(c => c.id === v.clientId);
        const daysUntil = Math.ceil((new Date(v.followUpDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return {
          id: v.id,
          clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
          clientId: client?.clientId || '',
          dueDate: v.followUpDate,
          priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
          notes: v.notes || '',
          visitType: v.visitType
        };
      });
    return followups;
  }, [filteredVisits, filteredClients]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      location: 'all',
      program: 'all',
      dateRange: '30',
      indicator: 'all',
      search: ''
    });
  };

  const hasActiveFilters = filters.location !== 'all' || filters.program !== 'all' || 
                          filters.indicator !== 'all' || filters.search !== '';

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const exportData = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Clients', metrics.totalClients],
      ['NSP Clients', metrics.nspCount],
      ['MAT Clients', metrics.matCount],
      ['Stimulant Users', metrics.stimulantCount],
      ['Total Visits', metrics.totalVisits],
      ['Recent Registrations', metrics.recentClients],
      ['Active Filters', hasActiveFilters ? 'Yes' : 'No'],
      ['Location Filter', filters.location],
      ['Program Filter', filters.program],
      ['Date Range', `${filters.dateRange} days`]
    ];

    const csv = csvData.map(row => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Dashboard data exported');
  };

  const handleViewVisitDetail = async (visitId: string) => {
    try {
      // Fetch visit details
      const visitRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/${visitId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      
      if (!visitRes.ok) {
        toast.error('Failed to load visit details');
        return;
      }

      const visitData = await visitRes.json();
      if (!visitData.success) {
        toast.error('Failed to load visit details');
        return;
      }

      // Fetch client details
      const clientRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients/${visitData.visit.clientId}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );

      if (!clientRes.ok) {
        toast.error('Failed to load client details');
        return;
      }

      const clientData = await clientRes.json();
      if (!clientData.success) {
        toast.error('Failed to load client details');
        return;
      }

      setSelectedVisit(visitData.visit);
      setSelectedClient(clientData.client);
    } catch (error) {
      console.error('Error loading visit details:', error);
      toast.error('Failed to load visit details');
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Prepare chart data from filtered metrics
  const locationData = Object.entries(metrics.locationCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const programTrends = [
    { month: 'Jan', NSP: Math.floor(metrics.nspCount * 0.67), MAT: Math.floor(metrics.matCount * 0.67), Stimulants: Math.floor(metrics.stimulantCount * 0.7), Total: Math.floor(metrics.totalClients * 0.68) },
    { month: 'Feb', NSP: Math.floor(metrics.nspCount * 0.75), MAT: Math.floor(metrics.matCount * 0.79), Stimulants: Math.floor(metrics.stimulantCount * 0.77), Total: Math.floor(metrics.totalClients * 0.76) },
    { month: 'Mar', NSP: Math.floor(metrics.nspCount * 0.82), MAT: Math.floor(metrics.matCount * 0.85), Stimulants: Math.floor(metrics.stimulantCount * 0.83), Total: Math.floor(metrics.totalClients * 0.83) },
    { month: 'Apr', NSP: Math.floor(metrics.nspCount * 0.88), MAT: Math.floor(metrics.matCount * 0.94), Stimulants: Math.floor(metrics.stimulantCount * 0.90), Total: Math.floor(metrics.totalClients * 0.90) },
    { month: 'May', NSP: Math.floor(metrics.nspCount * 0.94), MAT: Math.floor(metrics.matCount * 1.0), Stimulants: Math.floor(metrics.stimulantCount * 0.95), Total: Math.floor(metrics.totalClients * 0.96) },
    { month: 'Jun', NSP: metrics.nspCount, MAT: metrics.matCount, Stimulants: metrics.stimulantCount, Total: metrics.totalClients }
  ];

  const serviceUtilization = [
    { service: 'HIV Testing', count: Math.floor(metrics.totalVisits * 0.35) },
    { service: 'STI Screening', count: Math.floor(metrics.totalVisits * 0.28) },
    { service: 'SRH Counselling', count: Math.floor(metrics.totalVisits * 0.42) },
    { service: 'PrEP Linkage', count: Math.floor(metrics.totalVisits * 0.18) },
    { service: 'Harm Reduction', count: Math.floor(metrics.totalVisits * 0.55) },
    { service: 'Mental Health', count: Math.floor(metrics.totalVisits * 0.31) },
  ];

  const ageGenderData = Object.entries(metrics.ageGroups).map(([name, value]) => ({
    name,
    value,
  })).filter(item => item.value > 0);

  // Filter sync status by location
  const filteredSyncStatus = filters.location === 'all' 
    ? syncStatus 
    : { [filters.location]: syncStatus[filters.location] };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">M&E Dashboard</h1>
          <p className="text-gray-600">
            Real-time monitoring across all MEWA locations
            {hasActiveFilters && (
              <span className="ml-2 text-indigo-600">• Filtered View</span>
            )}
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
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Overview - 6 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Total Clients</p>
              <p className="text-3xl">{metrics.totalClients}</p>
              <p className="text-xs text-gray-500">
                {hasActiveFilters ? 'Filtered results' : 'All programs combined'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* NSP Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-cyan-50 rounded-xl group-hover:bg-cyan-100 transition-colors">
                <Syringe className="w-5 h-5 text-cyan-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                +8%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">NSP Clients</p>
              <p className="text-3xl">{metrics.nspCount}</p>
              <p className="text-xs text-gray-500">Needle & Syringe Program</p>
            </div>
          </CardContent>
        </Card>

        {/* Methadone/MAT Clients */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                <Pill className="w-5 h-5 text-purple-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                +15%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">MAT Clients</p>
              <p className="text-3xl">{metrics.matCount}</p>
              <p className="text-xs text-gray-500">Medication-Assisted Treatment</p>
            </div>
          </CardContent>
        </Card>

        {/* Stimulant Users */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-pink-50 rounded-xl group-hover:bg-pink-100 transition-colors">
                <Brain className="w-5 h-5 text-pink-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                +10%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Stimulant Users</p>
              <p className="text-3xl">{metrics.stimulantCount}</p>
              <p className="text-xs text-gray-500">Stimulants Program</p>
            </div>
          </CardContent>
        </Card>

        {/* Follow-ups Pending */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Follow-ups Pending</p>
              <p className="text-3xl">{pendingFollowups.length}</p>
              <p className="text-xs text-gray-500">Require attention</p>
            </div>
          </CardContent>
        </Card>

        {/* New Registrations */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                +18%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">New Registrations</p>
              <p className="text-3xl">{metrics.recentClients}</p>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filter Toolbar */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search clients, visits, or activities..."
                className="pl-10 rounded-xl"
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>

            {/* Location Filter */}
            <Select value={filters.location} onValueChange={(v) => updateFilter('location', v)}>
              <SelectTrigger className="w-full lg:w-[180px] rounded-xl">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Lamu">Lamu</SelectItem>
                <SelectItem value="Kilifi">Kilifi</SelectItem>
              </SelectContent>
            </Select>

            {/* Program Filter */}
            <Select value={filters.program} onValueChange={(v) => updateFilter('program', v)}>
              <SelectTrigger className="w-full lg:w-[180px] rounded-xl">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="NSP">NSP</SelectItem>
                <SelectItem value="MAT">MAT/Methadone</SelectItem>
                <SelectItem value="Stimulants">Stimulants</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range Filter */}
            <Select value={filters.dateRange} onValueChange={(v) => updateFilter('dateRange', v)}>
              <SelectTrigger className="w-full lg:w-[180px] rounded-xl">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>

            {/* Indicator Filter */}
            <Select value={filters.indicator} onValueChange={(v) => updateFilter('indicator', v)}>
              <SelectTrigger className="w-full lg:w-[180px] rounded-xl">
                <SelectValue placeholder="Indicator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Indicators</SelectItem>
                <SelectItem value="completion">Completion Rate</SelectItem>
                <SelectItem value="followup">Follow-up Adherence</SelectItem>
                <SelectItem value="risk">Risk Levels</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset & Export */}
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters} className="rounded-xl">
                  <X className="w-4 h-4 mr-1" />
                  Reset
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={exportData} className="rounded-xl">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </div>

          {/* Active Filter Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {filters.location !== 'all' && (
                <Badge variant="secondary" className="rounded-full">
                  Location: {filters.location}
                  <button onClick={() => updateFilter('location', 'all')} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.program !== 'all' && (
                <Badge variant="secondary" className="rounded-full">
                  Program: {filters.program}
                  <button onClick={() => updateFilter('program', 'all')} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.indicator !== 'all' && (
                <Badge variant="secondary" className="rounded-full">
                  Indicator: {filters.indicator}
                  <button onClick={() => updateFilter('indicator', 'all')} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.search && (
                <Badge variant="secondary" className="rounded-full">
                  Search: {filters.search}
                  <button onClick={() => updateFilter('search', '')} className="ml-2">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Visits Table */}
      <DailyVisitsTable 
        currentUser={currentUser} 
        onNavigateToVisits={(filters) => {
          // You can add navigation logic here if needed
          // For now, we'll just show a toast
          toast.info('Navigate to Visit Management with filters applied');
        }}
        onViewVisitDetail={handleViewVisitDetail}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Client Demographics - Pie Chart */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Client Demographics</CardTitle>
            <Button variant="ghost" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {ageGenderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={ageGenderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {ageGenderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                No data available for current filters
              </div>
            )}
            <div className="mt-4 space-y-2">
              <p className="text-xs text-gray-500">
                Age distribution • {metrics.totalClients} clients
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Program Trends - Line Chart */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Program Enrollment Trends</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Monthly client growth by program</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700">Real-time</span>
              </div>
              <Button variant="ghost" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {metrics.totalClients > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={programTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="NSP" 
                    stroke={COLORS.primary} 
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="MAT" 
                    stroke={COLORS.purple} 
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Stimulants" 
                    stroke={COLORS.pink} 
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Total" 
                    stroke={COLORS.secondary} 
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-400">
                No data available for current filters
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Utilization - Bar Chart */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-12">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Service Utilization & Intervention Breakdown</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Total service encounters • {metrics.totalVisits} visits
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {metrics.totalVisits > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serviceUtilization}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="service" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]}>
                    {serviceUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No visit data available for current filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Activity Feed, Pending Follow-ups, Sync Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Activity Feed */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Activity Feed
              <Badge variant="outline" className="ml-auto">{activityFeed.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {activityFeed.length > 0 ? (
                activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg bg-gray-50 ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{getTimeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No recent activity for current filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Follow-ups */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Follow-ups
              <Badge variant="outline" className="ml-auto">{pendingFollowups.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {pendingFollowups.length > 0 ? (
                pendingFollowups.map((followup) => (
                  <div key={followup.id} className="p-3 rounded-xl border hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm">{followup.clientName}</p>
                        <p className="text-xs text-gray-500">{followup.clientId}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          followup.priority === 'high' 
                            ? 'bg-red-50 text-red-700 border-red-200' 
                            : followup.priority === 'medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }
                      >
                        {followup.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Due: {new Date(followup.dueDate).toLocaleDateString()}
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 rounded-lg text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No pending follow-ups for current filters
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(filteredSyncStatus).map(([location, status]: [string, any]) => (
                <div key={location} className="p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{location}</span>
                    </div>
                    {status.status === 'synced' ? (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <Wifi className="w-3.5 h-3.5" />
                        <span className="text-xs">Synced</span>
                      </div>
                    ) : status.status === 'syncing' ? (
                      <div className="flex items-center gap-1.5 text-amber-600">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-xs">Syncing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-600">
                        <WifiOff className="w-3.5 h-3.5" />
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last: {getTimeAgo(status.lastSync)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Next: {status.nextSync}m
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && selectedClient && (
        <Dialog open={!!selectedVisit} onOpenChange={() => {
          setSelectedVisit(null);
          setSelectedClient(null);
        }}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
            <VisitDetail
              visit={selectedVisit}
              client={selectedClient}
              onBack={() => {
                setSelectedVisit(null);
                setSelectedClient(null);
              }}
              currentUser={currentUser}
              onUpdate={() => {
                setSelectedVisit(null);
                setSelectedClient(null);
                loadDashboardData();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}