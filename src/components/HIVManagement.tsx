import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Textarea } from './ui/textarea';
import { Progress } from './ui/progress';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { hasHIVAccess } from '../utils/permissions';
import {
  HeartPulse,
  Users,
  Pill,
  Activity,
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TestTube,
  Stethoscope,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521`;
const headers = {
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const WHO_STAGES = ['Stage I', 'Stage II', 'Stage III', 'Stage IV'];
const TESTING_MODALITIES = ['VCT', 'PITC', 'HTS', 'Self-Test', 'Index Testing', 'Mobile Testing'];
const ART_REGIMENS = [
  'TDF/3TC/DTG', 'TDF/3TC/EFV', 'AZT/3TC/NVP', 'AZT/3TC/EFV',
  'ABC/3TC/DTG', 'TDF/FTC/DTG', 'TDF/3TC/LPV/r', 'AZT/3TC/ATV/r',
  'ABC/3TC/LPV/r', 'Other',
];
const ART_LINES = ['1st Line', '2nd Line', '3rd Line'];
const ART_STATUSES = ['Active', 'Stopped', 'Switched', 'Transferred Out', 'Deceased'];
const TRACING_OUTCOMES = ['Returned', 'Self-Transfer', 'Stopped ART', 'Deceased', 'Not Found', 'Refused'];
const TB_SCREENING = ['No Signs', 'Presumptive TB', 'TB Confirmed', 'On TB Treatment', 'TB Completed'];

interface HIVManagementProps {
  currentUser: any;
}

export function HIVManagement({ currentUser }: HIVManagementProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [hivProfiles, setHivProfiles] = useState<any[]>([]);
  const [artRecords, setArtRecords] = useState<any[]>([]);
  const [vlRecords, setVlRecords] = useState<any[]>([]);
  const [clinicalVisits, setClinicalVisits] = useState<any[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  // Dialogs
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showArtDialog, setShowArtDialog] = useState(false);
  const [showVlDialog, setShowVlDialog] = useState(false);
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [showAdherenceDialog, setShowAdherenceDialog] = useState(false);

  // Search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Permission check
  if (!hasHIVAccess(currentUser)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-500">You do not have permission to access the HIV Management module. Contact your administrator to request access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [clientsRes, profilesRes, artRes, vlRes, visitsRes, adherenceRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/clients?limit=5000`, { headers }),
        fetch(`${API_BASE}/hiv-profiles`, { headers }),
        fetch(`${API_BASE}/art-records`, { headers }),
        fetch(`${API_BASE}/viral-load`, { headers }),
        fetch(`${API_BASE}/hiv-clinical-visits`, { headers }),
        fetch(`${API_BASE}/adherence-tracking`, { headers }),
        fetch(`${API_BASE}/hiv-metrics`, { headers }),
      ]);

      const [cData, pData, aData, vData, cvData, adData, mData] = await Promise.all([
        clientsRes.json(), profilesRes.json(), artRes.json(), vlRes.json(),
        visitsRes.json(), adherenceRes.json(), metricsRes.json(),
      ]);

      if (cData.success) setClients(cData.clients || []);
      if (pData.success) setHivProfiles(pData.profiles || []);
      if (aData.success) setArtRecords(aData.records || []);
      if (vData.success) setVlRecords(vData.records || []);
      if (cvData.success) setClinicalVisits(cvData.records || []);
      if (adData.success) setAdherenceRecords(adData.records || []);
      if (mData.success) setMetrics(mData.metrics);
    } catch (err) {
      console.error('Error loading HIV data:', err);
      toast.error('Failed to load HIV data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAllData(); }, []);

  // Client lookup map
  const clientMap = useMemo(() => {
    const map: Record<string, any> = {};
    clients.forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  const getClientName = (clientId: string) => {
    const c = clientMap[clientId];
    return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.clientId : clientId;
  };

  // HIV clients = clients with HIV profiles
  const hivClientIds = useMemo(() => new Set(hivProfiles.map(p => p.clientId)), [hivProfiles]);
  const hivClients = useMemo(() => {
    return clients.filter(c => hivClientIds.has(c.id));
  }, [clients, hivClientIds]);

  // Latest VL per client
  const latestVlByClient = useMemo(() => {
    const map: Record<string, any> = {};
    vlRecords.forEach(vl => {
      if (!map[vl.clientId] || new Date(vl.sampleDate) > new Date(map[vl.clientId].sampleDate)) {
        map[vl.clientId] = vl;
      }
    });
    return map;
  }, [vlRecords]);

  // Latest ART per client
  const latestArtByClient = useMemo(() => {
    const map: Record<string, any> = {};
    artRecords.forEach(art => {
      if (!map[art.clientId] || new Date(art.createdAt) > new Date(map[art.clientId].createdAt)) {
        map[art.clientId] = art;
      }
    });
    return map;
  }, [artRecords]);

  // ==================== DASHBOARD TAB ====================
  const renderDashboard = () => {
    if (!metrics) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      );
    }

    const cards = [
      { label: 'Total HIV+', value: metrics.totalHivPositive, icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-50' },
      { label: 'Active on ART', value: metrics.activeOnArt, icon: Pill, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Suppression Rate', value: `${metrics.suppressionRate}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Unsuppressed', value: metrics.unsuppressed, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
      { label: 'Due for VL', value: metrics.dueForVl, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Lost to Follow-up', value: metrics.lostToFollowUp, icon: TrendingDown, color: 'text-gray-600', bg: 'bg-gray-50' },
    ];

    const vlTrendData = metrics.vlTrend || [];
    const artTrendData = metrics.artTrend || [];
    const regimenData = Object.entries(metrics.regimenDist || {}).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Card key={i} className="relative overflow-hidden">
                <CardContent className="pt-4 pb-4">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${card.bg} mb-2`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{card.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Retention Rate */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Retention Rate</span>
              <span className="text-sm font-bold">{metrics.retentionRate}%</span>
            </div>
            <Progress value={metrics.retentionRate} className="h-2" />
            <p className="text-xs text-gray-500 mt-1">{metrics.activeOnArt} active / {metrics.totalInitiated} initiated</p>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* VL Suppression Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Viral Load Suppression Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {vlTrendData.length > 0 ? (
                <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <LineChart data={vlTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="suppressionRate" name="Suppression %" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No viral load data yet</div>
              )}
            </CardContent>
          </Card>

          {/* ART Initiation Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">ART Initiation Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {artTrendData.length > 0 ? (
                <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <BarChart data={artTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="initiated" name="Initiated" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No ART data yet</div>
              )}
            </CardContent>
          </Card>

          {/* Regimen Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Active ART Regimen Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {regimenData.length > 0 ? (
                <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={1}>
                  <PieChart>
                    <Pie data={regimenData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {regimenData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No active regimen data</div>
              )}
            </CardContent>
          </Card>

          {/* Demographics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">HIV+ by Gender & Age</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Gender</h4>
                  {Object.entries(metrics.genderDist || {}).map(([gender, count]) => (
                    <div key={gender} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <span>{gender}</span>
                      <Badge variant="secondary">{count as number}</Badge>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Age Group</h4>
                  {Object.entries(metrics.ageDist || {}).map(([group, count]) => (
                    <div key={group} className="flex justify-between text-sm py-1 border-b border-gray-50">
                      <span>{group}</span>
                      <Badge variant="secondary">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // ==================== HIV CLIENTS TAB ====================
  const renderHIVClients = () => {
    const filtered = hivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search HIV clients..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-9" />
          </div>
          <Button onClick={() => setShowProfileDialog(true)}><Plus className="w-4 h-4 mr-2" />Enroll Client</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Diagnosis Date</TableHead>
                <TableHead>ART Status</TableHead>
                <TableHead>Last VL</TableHead>
                <TableHead>VL Status</TableHead>
                <TableHead>Alerts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No HIV clients enrolled yet</TableCell></TableRow>
              ) : paginated.map(client => {
                const profile = hivProfiles.find(p => p.clientId === client.id);
                const latestArt = latestArtByClient[client.id];
                const latestVl = latestVlByClient[client.id];
                const alerts: string[] = [];

                if (latestVl) {
                  const sixMonthsAgo = new Date();
                  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                  if (new Date(latestVl.sampleDate) < sixMonthsAgo) alerts.push('VL Overdue');
                  if (latestVl.suppressionStatus === 'Unsuppressed') alerts.push('Unsuppressed');
                } else if (profile) {
                  alerts.push('No VL');
                }

                if (latestArt?.adherencePercent !== undefined && latestArt.adherencePercent < 85) {
                  alerts.push('Low Adherence');
                }

                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-mono text-xs">{client.clientId}</TableCell>
                    <TableCell className="font-medium">{client.firstName} {client.lastName}</TableCell>
                    <TableCell>{client.gender || '-'}</TableCell>
                    <TableCell>{profile?.dateOfDiagnosis || '-'}</TableCell>
                    <TableCell>
                      {latestArt ? (
                        <Badge variant={latestArt.currentStatus === 'Active' ? 'default' : 'secondary'} className={latestArt.currentStatus === 'Active' ? 'bg-green-100 text-green-700' : ''}>
                          {latestArt.currentStatus}
                        </Badge>
                      ) : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>{latestVl ? latestVl.viralLoadValue.toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      {latestVl ? (
                        <Badge className={latestVl.suppressionStatus === 'Suppressed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {latestVl.suppressionStatus}
                        </Badge>
                      ) : <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {alerts.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {alerts.map((a, i) => (
                            <Badge key={i} variant="destructive" className="text-[10px] px-1.5">{a}</Badge>
                          ))}
                        </div>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Page {currentPage} of {totalPages} ({filtered.length} clients)</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==================== CLINICAL VISITS TAB ====================
  const renderClinicalVisits = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">HIV Clinical Visits</h3>
          <Button onClick={() => setShowVisitDialog(true)}><Plus className="w-4 h-4 mr-2" />Record Visit</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>WHO Stage</TableHead>
                <TableHead>TB Screening</TableHead>
                <TableHead>OI Present</TableHead>
                <TableHead>MH Screen</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinicalVisits.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No clinical visits recorded</TableCell></TableRow>
              ) : clinicalVisits.slice(0, 50).map(visit => (
                <TableRow key={visit.id}>
                  <TableCell>{visit.visitDate || '-'}</TableCell>
                  <TableCell className="font-medium">{getClientName(visit.clientId)}</TableCell>
                  <TableCell>{visit.weight || '-'}</TableCell>
                  <TableCell>{visit.whoStage || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={visit.tbScreening === 'Presumptive TB' || visit.tbScreening === 'TB Confirmed' ? 'bg-red-100 text-red-700' : ''}>
                      {visit.tbScreening || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>{visit.oiPresent ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}</TableCell>
                  <TableCell>{visit.mentalHealthScreen || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{visit.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  // ==================== ART MANAGEMENT TAB ====================
  const renderARTManagement = () => {
    const filtered = artRecords.filter(r => {
      const clientName = getClientName(r.clientId).toLowerCase();
      const matchSearch = clientName.includes(searchTerm.toLowerCase()) || (r.clientId || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.currentStatus === statusFilter;
      return matchSearch && matchStatus;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search ART records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {ART_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowArtDialog(true)}><Plus className="w-4 h-4 mr-2" />Add ART Record</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Regimen</TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Initiation Date</TableHead>
                <TableHead>Time on ART</TableHead>
                <TableHead>Adherence %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No ART records</TableCell></TableRow>
              ) : filtered.slice(0, 50).map(record => {
                const monthsOnArt = record.initiationDate
                  ? Math.round((Date.now() - new Date(record.initiationDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
                  : null;

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{getClientName(record.clientId)}</TableCell>
                    <TableCell><Badge variant="outline">{record.regimen}</Badge></TableCell>
                    <TableCell>{record.lineOfTreatment || '-'}</TableCell>
                    <TableCell>{record.initiationDate || '-'}</TableCell>
                    <TableCell>{monthsOnArt !== null ? `${monthsOnArt} months` : '-'}</TableCell>
                    <TableCell>
                      {record.adherencePercent !== undefined ? (
                        <span className={record.adherencePercent < 85 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {record.adherencePercent}%
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={record.currentStatus === 'Active' ? 'bg-green-100 text-green-700' : record.currentStatus === 'Stopped' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}>
                        {record.currentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  // ==================== VIRAL LOAD TAB ====================
  const renderViralLoad = () => {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const enriched = vlRecords.map(vl => {
      const isDue = new Date(vl.sampleDate) < sixMonthsAgo;
      const daysOverdue = isDue ? Math.round((now.getTime() - new Date(vl.nextDueDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      return { ...vl, isDue, daysOverdue: Math.max(0, daysOverdue) };
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Viral Load Records</h3>
          <Button onClick={() => setShowVlDialog(true)}><Plus className="w-4 h-4 mr-2" />Add VL Result</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Sample Date</TableHead>
                <TableHead>Viral Load</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Days Overdue</TableHead>
                <TableHead>Lab</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enriched.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No viral load records</TableCell></TableRow>
              ) : enriched.slice(0, 50).map(vl => (
                <TableRow key={vl.id} className={vl.isDue ? 'bg-orange-50/50' : ''}>
                  <TableCell className="font-medium">{getClientName(vl.clientId)}</TableCell>
                  <TableCell>{vl.sampleDate || '-'}</TableCell>
                  <TableCell>
                    <span className={vl.viralLoadValue >= 1000 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
                      {vl.viralLoadValue?.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={vl.suppressionStatus === 'Suppressed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {vl.suppressionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{vl.nextDueDate || '-'}</TableCell>
                  <TableCell>
                    {vl.isDue ? (
                      <Badge variant="destructive" className="text-xs">{vl.daysOverdue} days</Badge>
                    ) : (
                      <span className="text-green-600 text-sm">On track</span>
                    )}
                  </TableCell>
                  <TableCell>{vl.labName || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  // ==================== ADHERENCE TAB ====================
  const renderAdherence = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Adherence & Retention Tracking</h3>
          <Button onClick={() => setShowAdherenceDialog(true)}><Plus className="w-4 h-4 mr-2" />Log Adherence Issue</Button>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Missed Appointments</TableHead>
                <TableHead>Days Late</TableHead>
                <TableHead>Tracing Outcome</TableHead>
                <TableHead>Intervention</TableHead>
                <TableHead>Re-engagement Date</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adherenceRecords.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No adherence records</TableCell></TableRow>
              ) : adherenceRecords.slice(0, 50).map(rec => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{getClientName(rec.clientId)}</TableCell>
                  <TableCell>
                    <Badge variant={rec.missedAppointments >= 2 ? 'destructive' : 'secondary'}>
                      {rec.missedAppointments || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>{rec.daysLate || 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={rec.tracingOutcome === 'Returned' ? 'border-green-300 text-green-700' : rec.tracingOutcome === 'Not Found' ? 'border-red-300 text-red-700' : ''}>
                      {rec.tracingOutcome || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{rec.intervention || '-'}</TableCell>
                  <TableCell>{rec.reengagementDate || '-'}</TableCell>
                  <TableCell className="text-xs text-gray-500">{new Date(rec.createdAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  // ==================== FORM DIALOGS ====================

  // Enroll HIV Profile Dialog
  const EnrollProfileDialog = () => {
    const [form, setForm] = useState({
      clientId: '', dateOfDiagnosis: '', testingModality: '', whoStage: '',
      baselineCD4: '', baselineViralLoad: '', enrollmentDate: '', facility: '',
    });
    const [clientSearch, setClientSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const nonHivClients = clients.filter(c => !hivClientIds.has(c.id));
    const filteredClients = nonHivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(clientSearch.toLowerCase());
    }).slice(0, 20);

    const handleSave = async () => {
      if (!form.clientId) { toast.error('Please select a client'); return; }
      if (!form.dateOfDiagnosis) { toast.error('Diagnosis date is required'); return; }
      if (form.enrollmentDate && new Date(form.enrollmentDate) < new Date(form.dateOfDiagnosis)) {
        toast.error('Enrollment date must be after diagnosis date'); return;
      }
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/hiv-profiles`, {
          method: 'POST', headers,
          body: JSON.stringify({ record: form, userId: currentUser?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('HIV profile created');
          setShowProfileDialog(false);
          loadAllData();
        } else {
          toast.error(data.error || 'Failed to create profile');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error');
      } finally { setSaving(false); }
    };

    return (
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll Client in HIV Program</DialogTitle>
            <DialogDescription>Link an existing client to the HIV management module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Client *</Label>
              <Input placeholder="Search clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="mb-2" />
              {clientSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${form.clientId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, clientId: c.id })); setClientSearch(`${c.firstName} ${c.lastName}`); }}>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-gray-400 ml-2">{c.clientId}</span>
                    </div>
                  ))}
                  {filteredClients.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No matching clients</div>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date of Diagnosis *</Label><Input type="date" value={form.dateOfDiagnosis} onChange={e => setForm(f => ({ ...f, dateOfDiagnosis: e.target.value }))} /></div>
              <div><Label>Enrollment Date</Label><Input type="date" value={form.enrollmentDate} onChange={e => setForm(f => ({ ...f, enrollmentDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Testing Modality</Label>
                <Select value={form.testingModality} onValueChange={v => setForm(f => ({ ...f, testingModality: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{TESTING_MODALITIES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>WHO Stage</Label>
                <Select value={form.whoStage} onValueChange={v => setForm(f => ({ ...f, whoStage: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{WHO_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Baseline CD4</Label><Input type="number" value={form.baselineCD4} onChange={e => setForm(f => ({ ...f, baselineCD4: e.target.value }))} placeholder="cells/mm3" /></div>
              <div><Label>Baseline Viral Load</Label><Input type="number" value={form.baselineViralLoad} onChange={e => setForm(f => ({ ...f, baselineViralLoad: e.target.value }))} placeholder="copies/mL" /></div>
            </div>
            <div><Label>Facility</Label><Input value={form.facility} onChange={e => setForm(f => ({ ...f, facility: e.target.value }))} placeholder="Health facility name" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowProfileDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enroll Client</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Add ART Record Dialog
  const AddArtDialog = () => {
    const [form, setForm] = useState({
      clientId: '', initiationDate: '', regimen: '', lineOfTreatment: '1st Line',
      adherencePercent: '', currentStatus: 'Active', reasonForSwitch: '',
    });
    const [clientSearch, setClientSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredClients = hivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(clientSearch.toLowerCase());
    }).slice(0, 20);

    const handleSave = async () => {
      if (!form.clientId) { toast.error('Please select a client'); return; }
      if (!form.regimen) { toast.error('Regimen is required'); return; }
      if (form.adherencePercent && (Number(form.adherencePercent) < 0 || Number(form.adherencePercent) > 100)) {
        toast.error('Adherence must be 0-100'); return;
      }
      setSaving(true);
      try {
        const payload = { ...form, adherencePercent: form.adherencePercent ? Number(form.adherencePercent) : undefined };
        const res = await fetch(`${API_BASE}/art-records`, {
          method: 'POST', headers,
          body: JSON.stringify({ record: payload, userId: currentUser?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('ART record created');
          setShowArtDialog(false);
          loadAllData();
        } else {
          toast.error(data.error || 'Failed to create ART record');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error');
      } finally { setSaving(false); }
    };

    return (
      <Dialog open={showArtDialog} onOpenChange={setShowArtDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add ART Record</DialogTitle>
            <DialogDescription>Record ART initiation or regimen change for an HIV client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>HIV Client *</Label>
              <Input placeholder="Search HIV clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="mb-2" />
              {clientSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${form.clientId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, clientId: c.id })); setClientSearch(`${c.firstName} ${c.lastName}`); }}>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-gray-400 ml-2">{c.clientId}</span>
                    </div>
                  ))}
                  {filteredClients.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No matching HIV clients</div>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Initiation Date</Label><Input type="date" value={form.initiationDate} onChange={e => setForm(f => ({ ...f, initiationDate: e.target.value }))} /></div>
              <div>
                <Label>Regimen *</Label>
                <Select value={form.regimen} onValueChange={v => setForm(f => ({ ...f, regimen: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select regimen..." /></SelectTrigger>
                  <SelectContent>{ART_REGIMENS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Line of Treatment</Label>
                <Select value={form.lineOfTreatment} onValueChange={v => setForm(f => ({ ...f, lineOfTreatment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ART_LINES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current Status</Label>
                <Select value={form.currentStatus} onValueChange={v => setForm(f => ({ ...f, currentStatus: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ART_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Adherence % (0-100)</Label><Input type="number" min="0" max="100" value={form.adherencePercent} onChange={e => setForm(f => ({ ...f, adherencePercent: e.target.value }))} /></div>
            <div><Label>Reason for Switch/Stop</Label><Input value={form.reasonForSwitch} onChange={e => setForm(f => ({ ...f, reasonForSwitch: e.target.value }))} placeholder="If applicable" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowArtDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save ART Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Add Viral Load Dialog
  const AddVlDialog = () => {
    const [form, setForm] = useState({
      clientId: '', sampleDate: '', viralLoadValue: '', labName: '',
    });
    const [clientSearch, setClientSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredClients = hivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(clientSearch.toLowerCase());
    }).slice(0, 20);

    const handleSave = async () => {
      if (!form.clientId) { toast.error('Please select a client'); return; }
      if (!form.viralLoadValue || isNaN(Number(form.viralLoadValue))) { toast.error('Viral load must be a valid number'); return; }
      if (!form.sampleDate) { toast.error('Sample date is required'); return; }
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/viral-load`, {
          method: 'POST', headers,
          body: JSON.stringify({ record: form, userId: currentUser?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`VL recorded: ${data.record.suppressionStatus}`);
          setShowVlDialog(false);
          loadAllData();
        } else {
          toast.error(data.error || 'Failed to save');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error');
      } finally { setSaving(false); }
    };

    return (
      <Dialog open={showVlDialog} onOpenChange={setShowVlDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Viral Load Result</DialogTitle>
            <DialogDescription>Record a viral load test result. Suppression status is auto-calculated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>HIV Client *</Label>
              <Input placeholder="Search HIV clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="mb-2" />
              {clientSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${form.clientId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, clientId: c.id })); setClientSearch(`${c.firstName} ${c.lastName}`); }}>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-gray-400 ml-2">{c.clientId}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div><Label>Sample Date *</Label><Input type="date" value={form.sampleDate} onChange={e => setForm(f => ({ ...f, sampleDate: e.target.value }))} /></div>
            <div>
              <Label>Viral Load (copies/mL) *</Label>
              <Input type="number" value={form.viralLoadValue} onChange={e => setForm(f => ({ ...f, viralLoadValue: e.target.value }))} placeholder="e.g. 150" />
              {form.viralLoadValue && !isNaN(Number(form.viralLoadValue)) && (
                <p className={`text-xs mt-1 font-medium ${Number(form.viralLoadValue) < 1000 ? 'text-green-600' : 'text-red-600'}`}>
                  {Number(form.viralLoadValue) < 1000 ? 'Suppressed (<1,000)' : 'Unsuppressed (>=1,000)'}
                </p>
              )}
            </div>
            <div><Label>Lab Name</Label><Input value={form.labName} onChange={e => setForm(f => ({ ...f, labName: e.target.value }))} placeholder="Laboratory name" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowVlDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save VL Result</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Add Clinical Visit Dialog
  const AddVisitDialog = () => {
    const [form, setForm] = useState({
      clientId: '', visitDate: '', weight: '', whoStage: '', tbScreening: '',
      oiPresent: false, mentalHealthScreen: '', notes: '',
    });
    const [clientSearch, setClientSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredClients = hivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(clientSearch.toLowerCase());
    }).slice(0, 20);

    const handleSave = async () => {
      if (!form.clientId) { toast.error('Please select a client'); return; }
      if (!form.visitDate) { toast.error('Visit date is required'); return; }
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/hiv-clinical-visits`, {
          method: 'POST', headers,
          body: JSON.stringify({ record: form, userId: currentUser?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Clinical visit recorded');
          setShowVisitDialog(false);
          loadAllData();
        } else {
          toast.error(data.error || 'Failed to save');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error');
      } finally { setSaving(false); }
    };

    return (
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record HIV Clinical Visit</DialogTitle>
            <DialogDescription>Document a clinical visit for an HIV client.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>HIV Client *</Label>
              <Input placeholder="Search HIV clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="mb-2" />
              {clientSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${form.clientId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, clientId: c.id })); setClientSearch(`${c.firstName} ${c.lastName}`); }}>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Visit Date *</Label><Input type="date" value={form.visitDate} onChange={e => setForm(f => ({ ...f, visitDate: e.target.value }))} /></div>
              <div><Label>Weight (kg)</Label><Input type="number" value={form.weight} onChange={e => setForm(f => ({ ...f, weight: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>WHO Stage</Label>
                <Select value={form.whoStage} onValueChange={v => setForm(f => ({ ...f, whoStage: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{WHO_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>TB Screening</Label>
                <Select value={form.tbScreening} onValueChange={v => setForm(f => ({ ...f, tbScreening: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{TB_SCREENING.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>OI Present</Label>
                <Select value={form.oiPresent ? 'yes' : 'no'} onValueChange={v => setForm(f => ({ ...f, oiPresent: v === 'yes' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Mental Health Screen</Label><Input value={form.mentalHealthScreen} onChange={e => setForm(f => ({ ...f, mentalHealthScreen: e.target.value }))} placeholder="e.g. PHQ-9 score" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowVisitDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Visit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Add Adherence Issue Dialog
  const AddAdherenceDialog = () => {
    const [form, setForm] = useState({
      clientId: '', missedAppointments: '', daysLate: '', tracingOutcome: '',
      intervention: '', reengagementDate: '',
    });
    const [clientSearch, setClientSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const filteredClients = hivClients.filter(c => {
      const name = `${c.firstName || ''} ${c.lastName || ''} ${c.clientId || ''}`.toLowerCase();
      return name.includes(clientSearch.toLowerCase());
    }).slice(0, 20);

    const handleSave = async () => {
      if (!form.clientId) { toast.error('Please select a client'); return; }
      setSaving(true);
      try {
        const payload = {
          ...form,
          missedAppointments: form.missedAppointments ? Number(form.missedAppointments) : 0,
          daysLate: form.daysLate ? Number(form.daysLate) : 0,
        };
        const res = await fetch(`${API_BASE}/adherence-tracking`, {
          method: 'POST', headers,
          body: JSON.stringify({ record: payload, userId: currentUser?.id }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Adherence record saved');
          setShowAdherenceDialog(false);
          loadAllData();
        } else {
          toast.error(data.error || 'Failed to save');
        }
      } catch (err) {
        console.error(err);
        toast.error('Network error');
      } finally { setSaving(false); }
    };

    return (
      <Dialog open={showAdherenceDialog} onOpenChange={setShowAdherenceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Adherence Issue</DialogTitle>
            <DialogDescription>Record adherence issues and tracing outcomes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>HIV Client *</Label>
              <Input placeholder="Search HIV clients..." value={clientSearch} onChange={e => setClientSearch(e.target.value)} className="mb-2" />
              {clientSearch && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredClients.map(c => (
                    <div key={c.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm ${form.clientId === c.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                      onClick={() => { setForm(f => ({ ...f, clientId: c.id })); setClientSearch(`${c.firstName} ${c.lastName}`); }}>
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Missed Appointments</Label><Input type="number" min="0" value={form.missedAppointments} onChange={e => setForm(f => ({ ...f, missedAppointments: e.target.value }))} /></div>
              <div><Label>Days Late</Label><Input type="number" min="0" value={form.daysLate} onChange={e => setForm(f => ({ ...f, daysLate: e.target.value }))} /></div>
            </div>
            <div>
              <Label>Tracing Outcome</Label>
              <Select value={form.tracingOutcome} onValueChange={v => setForm(f => ({ ...f, tracingOutcome: v }))}>
                <SelectTrigger><SelectValue placeholder="Select outcome..." /></SelectTrigger>
                <SelectContent>{TRACING_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Intervention</Label><Textarea value={form.intervention} onChange={e => setForm(f => ({ ...f, intervention: e.target.value }))} placeholder="Describe intervention taken..." rows={2} /></div>
            <div><Label>Re-engagement Date</Label><Input type="date" value={form.reengagementDate} onChange={e => setForm(f => ({ ...f, reengagementDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAdherenceDialog(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // ==================== MAIN RENDER ====================
  const tabItems = [
    { id: 'dashboard', label: 'HIV Dashboard', icon: Activity },
    { id: 'clients', label: 'HIV Clients', icon: Users },
    { id: 'visits', label: 'Clinical Visits', icon: Stethoscope },
    { id: 'art', label: 'ART Management', icon: Pill },
    { id: 'viral-load', label: 'Viral Load', icon: TestTube },
    { id: 'adherence', label: 'Adherence & Retention', icon: UserCheck },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">HIV Management</h1>
            <p className="text-xs text-gray-500">Sensitive Module - Access Controlled</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-red-200 text-red-600">
            <Shield className="w-3 h-3 mr-1" />High Sensitivity
          </Badge>
          <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b px-6 shrink-0 overflow-x-auto">
        <div className="flex gap-1">
          {tabItems.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setStatusFilter('all'); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive ? 'border-red-600 text-red-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading && activeTab === 'dashboard' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
            <div className="grid grid-cols-2 gap-4"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'clients' && renderHIVClients()}
            {activeTab === 'visits' && renderClinicalVisits()}
            {activeTab === 'art' && renderARTManagement()}
            {activeTab === 'viral-load' && renderViralLoad()}
            {activeTab === 'adherence' && renderAdherence()}
          </>
        )}
      </div>

      {/* Dialogs */}
      <EnrollProfileDialog />
      <AddArtDialog />
      <AddVlDialog />
      <AddVisitDialog />
      <AddAdherenceDialog />
    </div>
  );
}
