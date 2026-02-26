import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button, buttonVariants } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { 
  FileText, 
  UserPlus, 
  AlertCircle, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  Siren, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3'; 
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from './ui/dialog';
import { cn } from './ui/utils';

interface ParalegalManagementProps {
  currentUser: any;
}

export function ParalegalManagement({ currentUser }: ParalegalManagementProps) {
  const [activeTab, setActiveTab] = useState('cases');
  const [cases, setCases] = useState<any[]>([]);
  const [literacyActivities, setLiteracyActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [selectedCase, setSelectedCase] = useState<any>(null);
  
  // New Case State
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  
  // Fetch Data
  useEffect(() => {
    fetchCases();
    fetchLiteracyActivities();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients?limit=1000`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
    }
  };

  const fetchCases = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/paralegal-cases`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setCases(data.cases);
      }
    } catch (error) {
      console.error("Failed to fetch cases", error);
      toast.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const fetchLiteracyActivities = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/legal-literacy`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setLiteracyActivities(data.activities);
      }
    } catch (error) {
      console.error("Failed to fetch activities", error);
    }
  };

  const filteredClients = clients.filter(c => {
    const search = clientSearch.toLowerCase();
    const first = c.firstName?.toLowerCase() || '';
    const last = c.lastName?.toLowerCase() || '';
    const id = c.clientId?.toLowerCase() || '';
    const full = `${first} ${last}`;
    
    return search === '' || 
      first.includes(search) || 
      last.includes(search) || 
      id.includes(search) ||
      full.includes(search);
  });

  const getClientName = (id: string) => {
    const client = clients.find(c => c.id === id);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-indigo-600" />
            Paralegal Response
          </h1>
          <p className="text-gray-500">Rapid response, rights monitoring, and legal literacy</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-white border mb-4">
          <TabsTrigger value="cases">Case Management</TabsTrigger>
          <TabsTrigger value="literacy">Legal Literacy</TabsTrigger>
        </TabsList>

        <TabsContent value="cases">
          {view === 'list' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Incidents & Cases</CardTitle>
                  <CardDescription>Manage legal interventions and rights violations</CardDescription>
                </div>
                <Button onClick={() => setView('new')} className="bg-indigo-600">
                  <Plus className="w-4 h-4 mr-2" /> Log New Case
                </Button>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p>No active cases.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cases.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => { setSelectedCase(c); setView('detail'); }}>
                        <div className="flex items-center gap-4">
                           <div className={`p-2 rounded-full ${c.status === 'Open' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                              <Siren className="w-5 h-5" />
                           </div>
                           <div>
                              <h3 className="font-semibold text-gray-900">{c.incidentType}</h3>
                              <p className="text-sm text-gray-500">{getClientName(c.clientId)} • {new Date(c.incidentDate).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge className={c.immediateRisk ? "bg-red-500 hover:bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}>
                            {c.immediateRisk ? 'High Risk' : 'Standard'}
                          </Badge>
                          <Badge variant="outline">{c.status}</Badge>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {view === 'new' && (
            <NewCaseForm 
              clients={filteredClients} 
              clientSearch={clientSearch}
              setClientSearch={setClientSearch}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              currentUser={currentUser}
              onCancel={() => setView('list')}
              onSuccess={() => { setView('list'); fetchCases(); }}
            />
          )}

          {view === 'detail' && selectedCase && (
            <CaseDetail 
              caseData={selectedCase}
              currentUser={currentUser}
              onBack={() => { setView('list'); setSelectedCase(null); }}
              onUpdate={() => { fetchCases(); }}
              clientName={getClientName(selectedCase.clientId)}
            />
          )}
        </TabsContent>

        <TabsContent value="literacy">
          <LegalLiteracyModule 
             activities={literacyActivities} 
             onRefresh={fetchLiteracyActivities}
             currentUser={currentUser}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewCaseForm({ clients, clientSearch, setClientSearch, selectedClientId, setSelectedClientId, currentUser, onCancel, onSuccess }: any) {
  const [formData, setFormData] = useState({
    incidentDate: new Date().toISOString().split('T')[0],
    incidentType: 'Arrest',
    policeStation: '',
    location: '',
    description: '',
    immediateRisk: false,
    status: 'Open'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return toast.error("Please select a client");

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/paralegal-cases`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            record: {
              ...formData,
              clientId: selectedClientId,
            },
            userId: currentUser.id
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success("Case logged successfully");
        onSuccess();
      } else {
        toast.error(data.error || "Failed to save case");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Log New Incident</CardTitle>
        <CardDescription>Report a legal issue or rights violation</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Affected Client</Label>
            
            {selectedClientId ? (
               <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-900">
                  <div className="flex items-center gap-3">
                     <div className="bg-indigo-200 p-2 rounded-full">
                        <CheckCircle className="w-4 h-4 text-indigo-700" />
                     </div>
                     <div>
                        <div className="font-semibold">{clientSearch}</div>
                        <div className="text-xs text-indigo-600 font-medium">Client Linked Successfully</div>
                     </div>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setSelectedClientId(''); setClientSearch(''); }} 
                    className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
                  >
                     Change
                  </Button>
               </div>
            ) : (
               <>
                  <div className="relative">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                     <Input 
                       placeholder="Search client by name or ID..." 
                       className="pl-9"
                       value={clientSearch}
                       onChange={e => setClientSearch(e.target.value)}
                     />
                  </div>
                  {clientSearch.length > 0 && (
                      <div className="border rounded-md max-h-60 overflow-y-auto mt-2 bg-white shadow-sm z-10">
                         {clients.slice(0, 50).map((c: any) => (
                           <div 
                             key={c.id} 
                             className="p-3 text-sm cursor-pointer hover:bg-indigo-50 flex justify-between items-center border-b last:border-0 transition-colors"
                             onClick={() => { setSelectedClientId(c.id); setClientSearch(`${c.firstName} ${c.lastName}`); }}
                           >
                              <div>
                                <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                                <div className="text-xs text-gray-500 flex gap-2">
                                  <span>{c.clientId}</span>
                                  <span>•</span>
                                  <span>{c.age || '?'} yrs</span>
                                  <span>•</span>
                                  <span>{c.gender || '?'}</span>
                                </div>
                              </div>
                              <Plus className="w-4 h-4 text-indigo-600 opacity-0 group-hover:opacity-100" />
                           </div>
                         ))}
                         {clients.length === 0 && (
                           <div className="p-8 text-center text-gray-500">
                             <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                             <p>No clients found matching "{clientSearch}"</p>
                           </div>
                         )}
                      </div>
                  )}
               </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Date of Incident</Label>
                <Input type="date" required value={formData.incidentDate} onChange={e => setFormData({...formData, incidentDate: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label>Incident Type</Label>
                <Select value={formData.incidentType} onValueChange={v => setFormData({...formData, incidentType: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>
                      <SelectItem value="Arrest">Arrest / Detention</SelectItem>
                      <SelectItem value="Harassment">Police Harassment</SelectItem>
                      <SelectItem value="Violence">Physical Violence</SelectItem>
                      <SelectItem value="Confiscation">Confiscation of Meds</SelectItem>
                      <SelectItem value="Extortion">Extortion / Bribe</SelectItem>
                   </SelectContent>
                </Select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Where did it happen?" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label>Police Station (if applicable)</Label>
                <Input placeholder="Station Name" value={formData.policeStation} onChange={e => setFormData({...formData, policeStation: e.target.value})} />
             </div>
          </div>

          <div className="space-y-2">
             <Label>Description</Label>
             <Textarea placeholder="Describe the incident..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <div className="flex items-center space-x-2 border p-4 rounded-lg bg-red-50 border-red-100">
             <input type="checkbox" id="risk" className="w-4 h-4 text-red-600 rounded" checked={formData.immediateRisk} onChange={e => setFormData({...formData, immediateRisk: e.target.checked})} />
             <Label htmlFor="risk" className="text-red-700 font-medium cursor-pointer">Immediate Risk? (Requires Rapid Response)</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
             <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
             <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Log Incident'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CaseDetail({ caseData, currentUser, onBack, onUpdate, clientName }: any) {
   const [activeCase, setActiveCase] = useState(caseData);
   const [newAction, setNewAction] = useState({ type: 'Station Visit', outcome: '', notes: '' });
   const [actionLoading, setActionLoading] = useState(false);
   const [statusLoading, setStatusLoading] = useState(false);

   const handleAddAction = async () => {
      setActionLoading(true);
      const action = {
         id: Date.now().toString(),
         date: new Date().toISOString(),
         by: currentUser.name,
         ...newAction
      };
      
      const updatedActions = [...(activeCase.actions || []), action];
      
      try {
         const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/paralegal-cases/${activeCase.id}`,
            {
               method: 'PUT',
               headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
               body: JSON.stringify({ updates: { actions: updatedActions }, userId: currentUser.id })
            }
         );
         const data = await response.json();
         if(data.success) {
            setActiveCase(data.case);
            setNewAction({ type: 'Station Visit', outcome: '', notes: '' });
            toast.success("Action logged");
            onUpdate();
         }
      } catch (e) {
         toast.error("Failed to add action");
      } finally {
         setActionLoading(false);
      }
   };

   const handleStatusChange = async (newStatus: string) => {
      setStatusLoading(true);
      try {
         const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/paralegal-cases/${activeCase.id}`,
            {
               method: 'PUT',
               headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
               body: JSON.stringify({ updates: { status: newStatus }, userId: currentUser.id })
            }
         );
         const data = await response.json();
         if(data.success) {
            setActiveCase(data.case);
            toast.success(`Case status updated to ${newStatus}`);
            onUpdate();
         }
      } catch (e) {
         toast.error("Failed to update status");
      } finally {
         setStatusLoading(false);
      }
   };

   return (
      <div className="space-y-6">
         <div className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-gray-900" onClick={onBack}>
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Cases
         </div>

         {/* Header Card */}
         <Card className="bg-white border-l-4 border-l-indigo-600">
            <CardContent className="pt-6">
               <div className="flex justify-between items-start">
                  <div>
                     <h2 className="text-2xl font-bold">{clientName}</h2>
                     <p className="text-gray-500">{activeCase.incidentType} • {new Date(activeCase.incidentDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Select value={activeCase.status} onValueChange={handleStatusChange} disabled={statusLoading}>
                        <SelectTrigger className="w-[180px]">
                           <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Open">Open</SelectItem>
                           <SelectItem value="On Bail">On Bail</SelectItem>
                           <SelectItem value="Remand">Remand</SelectItem>
                           <SelectItem value="Charged">Charged</SelectItem>
                           <SelectItem value="Released">Released</SelectItem>
                           <SelectItem value="Court">Court</SelectItem>
                           <SelectItem value="Escalated">Escalated</SelectItem>
                           <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               <div className="mt-4 grid grid-cols-2 gap-6 text-sm">
                  <div>
                     <span className="block text-gray-500">Location</span>
                     <span className="font-medium">{activeCase.location}</span>
                  </div>
                  <div>
                     <span className="block text-gray-500">Police Station</span>
                     <span className="font-medium">{activeCase.policeStation || 'N/A'}</span>
                  </div>
               </div>
               <div className="mt-4 p-3 bg-gray-50 rounded text-gray-700">
                  {activeCase.description}
               </div>
            </CardContent>
         </Card>

         {/* Rapid Response / Actions Log */}
         <Card>
            <CardHeader>
               <CardTitle>Rapid Response Log</CardTitle>
               <CardDescription>Actions taken to resolve this case</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-6">
                  {/* History */}
                  <div className="space-y-4">
                     {activeCase.actions?.map((action: any) => (
                        <div key={action.id} className="flex gap-4 p-3 border rounded bg-gray-50">
                           <div className="mt-1">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2">
                                 <span className="font-semibold">{action.type}</span>
                                 <span className="text-xs text-gray-500">{new Date(action.date).toLocaleString()} by {action.by}</span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1">{action.notes}</p>
                              {action.outcome && <Badge variant="outline" className="mt-2 bg-white">{action.outcome}</Badge>}
                           </div>
                        </div>
                     ))}
                     {(!activeCase.actions || activeCase.actions.length === 0) && (
                        <p className="text-gray-500 italic">No actions recorded yet.</p>
                     )}
                  </div>

                  {/* Add Action Form */}
                  <div className="border-t pt-4">
                     <h4 className="font-medium mb-3">Log Action</h4>
                     <div className="grid grid-cols-2 gap-3 mb-3">
                        <Select value={newAction.type} onValueChange={v => setNewAction({...newAction, type: v})}>
                           <SelectTrigger><SelectValue /></SelectTrigger>
                           <SelectContent>
                              <SelectItem value="Station Visit">Station Visit</SelectItem>
                              <SelectItem value="Call to Officer">Call to Officer</SelectItem>
                              <SelectItem value="Family Contact">Family Contact</SelectItem>
                              <SelectItem value="Bail Process">Bail Process</SelectItem>
                              <SelectItem value="Court Attendance">Court Attendance</SelectItem>
                              <SelectItem value="Medical Referral">Medical Referral</SelectItem>
                           </SelectContent>
                        </Select>
                        <Input placeholder="Outcome (e.g. Released)" value={newAction.outcome} onChange={e => setNewAction({...newAction, outcome: e.target.value})} />
                     </div>
                     <Textarea placeholder="Notes / Details..." className="mb-3" value={newAction.notes} onChange={e => setNewAction({...newAction, notes: e.target.value})} />
                     <Button size="sm" onClick={handleAddAction} disabled={actionLoading}>
                        {actionLoading ? 'Saving...' : 'Add Action Entry'}
                     </Button>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}

function LegalLiteracyModule({ activities, onRefresh, currentUser }: any) {
   const [open, setOpen] = useState(false);
   const [loading, setLoading] = useState(false);
   const [formData, setFormData] = useState({
      date: new Date().toISOString().split('T')[0],
      topic: '',
      location: '',
      attendees: '',
      facilitator: currentUser.name
   });

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
         const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/legal-literacy`,
            {
               method: 'POST',
               headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
               body: JSON.stringify({ record: formData, userId: currentUser.id })
            }
         );
         if((await response.json()).success) {
            toast.success("Activity logged");
            setOpen(false);
            onRefresh();
            setFormData({ ...formData, topic: '', location: '', attendees: '' });
         }
      } catch(e) { toast.error("Error saving"); }
      finally { setLoading(false); }
   };

   return (
      <Card>
         <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle>Legal Literacy Sessions</CardTitle>
               <CardDescription>Track rights education and community sensitization</CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
               <DialogTrigger className={cn(buttonVariants({ variant: "outline" }))}>
                  <Plus className="w-4 h-4 mr-2" /> Log Session
               </DialogTrigger>
               <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Log Literacy Session</DialogTitle>
                    <DialogDescription>Record details of a new legal literacy or rights education session.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                        <div className="space-y-2"><Label>Attendees (Count)</Label><Input type="number" value={formData.attendees} onChange={e => setFormData({...formData, attendees: e.target.value})} /></div>
                     </div>
                     <div className="space-y-2"><Label>Location</Label><Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
                     <div className="space-y-2"><Label>Topic Covered</Label><Input value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} /></div>
                     <Button type="submit" className="w-full" disabled={loading}>Save Session</Button>
                  </form>
               </DialogContent>
            </Dialog>
         </CardHeader>
         <CardContent>
            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                     <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Topic</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Reach</th>
                        <th className="px-4 py-3">Facilitator</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y">
                     {activities.map((a: any) => (
                        <tr key={a.id}>
                           <td className="px-4 py-3">{new Date(a.date).toLocaleDateString()}</td>
                           <td className="px-4 py-3 font-medium">{a.topic}</td>
                           <td className="px-4 py-3">{a.location}</td>
                           <td className="px-4 py-3">{a.attendees} people</td>
                           <td className="px-4 py-3 text-gray-500">{a.facilitator}</td>
                        </tr>
                     ))}
                     {activities.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">No sessions recorded.</td></tr>}
                  </tbody>
               </table>
            </div>
         </CardContent>
      </Card>
   );
}
