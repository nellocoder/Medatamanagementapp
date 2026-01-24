import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  ArrowRight, 
  User, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  Activity, 
  AlertTriangle,
  Clock,
  Download,
  Plus
} from 'lucide-react';
import { ReferralDetail } from './ReferralDetail';
import { ReferralForm } from './ReferralForm';

export function ReferralDashboard({ currentUser, onNavigateToClient }: any) {
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReferrals();
    loadClients();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setReferrals(data.referrals);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
      try {
          const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );
          const data = await response.json();
          if (data.success) {
              setClients(data.clients);
          }
      } catch (e) {
          console.error('Error loading clients', e);
      }
  };

  // Filter Logic
  const filteredReferrals = referrals.filter(r => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || r.riskLevel === riskFilter;
      const matchesLocation = locationFilter === 'all' || r.clientLocation === locationFilter;
      const matchesService = serviceFilter === 'all' || r.service === serviceFilter;
      const matchesSearch = searchTerm === '' || 
          r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          r.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesRisk && matchesLocation && matchesService && matchesSearch;
  });

  // Metrics Calculation
  const totalPending = referrals.filter(r => r.status === 'Pending').length;
  const highRiskCount = referrals.filter(r => r.riskLevel === 'High' && r.status !== 'Linked to Care').length;
  
  // Linked this month
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const linkedThisMonth = referrals.filter(r => 
      r.status === 'Linked to Care' && 
      r.linkage?.date && 
      new Date(r.linkage.date) >= firstDayOfMonth
  ).length;

  // Linkage Rate (Linked / Total Non-Pending) - Approximation
  const totalClosed = referrals.filter(r => ['Linked to Care', 'Failed', 'Referred Elsewhere'].includes(r.status)).length;
  const totalLinked = referrals.filter(r => r.status === 'Linked to Care').length;
  const linkageRate = totalClosed > 0 ? Math.round((totalLinked / totalClosed) * 100) : 0;

  if (selectedReferralId) {
      return (
          <ReferralDetail 
             referralId={selectedReferralId} 
             currentUser={currentUser} 
             onBack={() => {
                 setSelectedReferralId(null);
                 loadReferrals(); // Reload to get updates
             }} 
          />
      );
  }

  if (showCreateForm) {
      return (
          <ReferralForm 
            clients={clients}
            currentUser={currentUser}
            onSuccess={() => {
                setShowCreateForm(false);
                loadReferrals();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
      );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-900">Referral Management</h1>
            <p className="text-slate-600">Track and manage clients flagged for PrEP and other services who require linkage to care.</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> New Referral
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Pending Actions</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalPending}</h3>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                </div>
            </CardContent>
         </Card>
         <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Linked This Month</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{linkedThisMonth}</h3>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                </div>
            </CardContent>
         </Card>
         <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Linkage Success Rate</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-2">{linkageRate}%</h3>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                        <Activity className="w-6 h-6 text-blue-600" />
                    </div>
                </div>
            </CardContent>
         </Card>
         <Card className="border-l-4 border-l-red-500 bg-red-50/50">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-red-600">High Risk Backlog</p>
                        <h3 className="text-3xl font-bold text-red-900 mt-2">{highRiskCount}</h3>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                </div>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <CardTitle>Referrals Directory</CardTitle>
                  <CardDescription>Manage active referrals and track outcomes</CardDescription>
              </div>
              <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" /> Export List
              </Button>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
              <div className="col-span-2 md:col-span-1">
                  <Input 
                      placeholder="Search client..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                  />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Linked to Care">Linked to Care</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger><SelectValue placeholder="Risk Level" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      <SelectItem value="High">High Risk</SelectItem>
                      <SelectItem value="Medium">Medium Risk</SelectItem>
                      <SelectItem value="Low">Low Risk</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Services</SelectItem>
                      <SelectItem value="PrEP">PrEP</SelectItem>
                      <SelectItem value="ART">ART</SelectItem>
                      <SelectItem value="Mental Health">Mental Health</SelectItem>
                      <SelectItem value="GBV">GBV</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      <SelectItem value="Mombasa">Mombasa</SelectItem>
                      <SelectItem value="Lamu">Lamu</SelectItem>
                      <SelectItem value="Kilifi">Kilifi</SelectItem>
                  </SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Referred For</TableHead>
                <TableHead>Referral Date</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading referrals...</TableCell>
                 </TableRow>
              ) : filteredReferrals.length === 0 ? (
                 <TableRow>
                     <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                         No referrals found matching your filters.
                     </TableCell>
                 </TableRow>
              ) : (
                filteredReferrals.map((referral) => (
                  <TableRow key={referral.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedReferralId(referral.id)}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                            <User className="w-3 h-3 text-slate-400" />
                            {referral.clientName}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <Phone className="w-3 h-3" /> {referral.clientPhone || 'No Phone'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2 text-slate-600">
                           <MapPin className="w-3 h-3" />
                           {referral.clientLocation}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline">{referral.service}</Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2 text-slate-600">
                           <Calendar className="w-3 h-3" />
                           {new Date(referral.createdAt).toLocaleDateString()}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge className={
                            referral.riskLevel === 'High' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' :
                            referral.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' :
                            'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
                        }>
                            {referral.riskLevel}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <Badge className={
                             referral.status === 'Linked to Care' ? 'bg-green-100 text-green-800 border-green-200' :
                             referral.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                             referral.status === 'Contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                             'bg-gray-100 text-gray-800 border-gray-200'
                        }>
                            {referral.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReferralId(referral.id);
                      }}>
                          Manage <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}