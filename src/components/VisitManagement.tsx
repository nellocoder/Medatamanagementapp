import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  MapPin,
  FileText,
  Activity,
  Download,
  Clock,
  CheckCircle2,
  TestTube,
  Heart,
  Save,
  X
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { VisitDetail } from './VisitDetail';

interface VisitManagementProps {
  currentUser: any;
}

// Available services list
const AVAILABLE_SERVICES = [
  // HIV & SRH
  { category: 'HIV & SRH', name: 'HIV Testing' },
  { category: 'HIV & SRH', name: 'PrEP Linkage' },
  { category: 'HIV & SRH', name: 'ART Linkage' },
  { category: 'HIV & SRH', name: 'STI Screening' },
  { category: 'HIV & SRH', name: 'Condoms Distributed' },
  { category: 'HIV & SRH', name: 'Family Planning' },
  { category: 'HIV & SRH', name: 'Pregnancy Test' },
  
  // Harm Reduction
  { category: 'Harm Reduction', name: 'NSP Distribution' },
  { category: 'Harm Reduction', name: 'Safe Injection Education' },
  { category: 'Harm Reduction', name: 'Overdose Prevention' },
  { category: 'Harm Reduction', name: 'Naloxone Distribution' },
  { category: 'Harm Reduction', name: 'Wound Care' },
  { category: 'Harm Reduction', name: 'Abscess Management' },
  
  // MAT
  { category: 'MAT', name: 'Methadone Dose' },
  { category: 'MAT', name: 'Dose Adjustment' },
  { category: 'MAT', name: 'Take-Home Assessment' },
  { category: 'MAT', name: 'Urine Tox Screen' },
  
  // Mental Health
  { category: 'Mental Health', name: 'CBT Session' },
  { category: 'Mental Health', name: 'Trauma Counselling' },
  { category: 'Mental Health', name: 'Group Therapy' },
  { category: 'Mental Health', name: 'Motivational Interviewing' },
  { category: 'Mental Health', name: 'PHQ-9 Screening' },
  { category: 'Mental Health', name: 'GAD-7 Screening' },
  { category: 'Mental Health', name: 'Crisis Intervention' },
  
  // Clinical
  { category: 'Clinical', name: 'Vitals Check' },
  { category: 'Clinical', name: 'Physical Examination' },
  { category: 'Clinical', name: 'TB Screening' },
  { category: 'Clinical', name: 'Vaccination' },
  { category: 'Clinical', name: 'Medication Review' },
  
  // Case Management
  { category: 'Case Management', name: 'Home Visit' },
  { category: 'Case Management', name: 'Legal Support Referral' },
  { category: 'Case Management', name: 'Food/Nutrition Support' },
  { category: 'Case Management', name: 'Shelter Referral' },
  { category: 'Case Management', name: 'Financial Assistance' },
  { category: 'Case Management', name: 'ID Documentation Support' },
  
  // Education & Vocational
  { category: 'Education', name: 'Skills Assessment' },
  { category: 'Education', name: 'Job Placement Support' },
  { category: 'Education', name: 'Training Enrollment' },
  { category: 'Education', name: 'Educational Support' },
];

export function VisitManagement({ currentUser }: VisitManagementProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [viewingVisit, setViewingVisit] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Dialog states
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isAddInterventionOpen, setIsAddInterventionOpen] = useState(false);

  const canEdit = hasPermission(currentUser?.permissions || [], PERMISSIONS.VISIT_CREATE);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [visits, searchTerm]);

  const loadData = async () => {
    try {
      const [visitsRes, clientsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const [visitsData, clientsData] = await Promise.all([
        visitsRes.json(),
        clientsRes.json(),
      ]);

      console.log('Loaded visits:', visitsData);
      console.log('Loaded clients:', clientsData);

      if (visitsData.success) {
        setVisits(visitsData.visits || []);
      }
      if (clientsData.success) {
        setClients(clientsData.clients || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load visits data');
    } finally {
      setLoading(false);
    }
  };

  const filterVisits = () => {
    let filtered = visits;

    if (searchTerm) {
      filtered = filtered.filter(visit => {
        const client = clients.find(c => c.id === visit.clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}`.toLowerCase() : '';
        return (
          clientName.includes(searchTerm.toLowerCase()) ||
          visit.visitType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visit.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredVisits(filtered);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  };

  const getClientInfo = (clientId: string) => {
    return clients.find(c => c.id === clientId);
  };

  const handleAddVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const visit = {
      clientId: formData.get('clientId'),
      visitDate: formData.get('visitDate'),
      visitType: formData.get('visitType'),
      location: formData.get('location'),
      reason: formData.get('reason'),
      notes: formData.get('notes'),
      servicesProvided: selectedServices.join(', '),
      followUpRequired: formData.get('followUpRequired') === 'true',
      nextAppointment: formData.get('nextAppointment'),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ visit, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Visit added successfully!');
        setIsAddVisitOpen(false);
        setSelectedServices([]);
        loadData();
      } else {
        toast.error(data.error || 'Failed to add visit');
      }
    } catch (error) {
      console.error('Error adding visit:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddClinicalResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const result = {
      clientId: selectedVisit.clientId,
      visitId: selectedVisit.id,
      type: formData.get('resultType'),
      date: formData.get('date'),
      // Vitals
      temperature: formData.get('temperature'),
      bloodPressure: formData.get('bloodPressure'),
      pulse: formData.get('pulse'),
      weight: formData.get('weight'),
      // Lab results
      hivTest: formData.get('hivTest'),
      hepB: formData.get('hepB'),
      hepC: formData.get('hepC'),
      tbScreening: formData.get('tbScreening'),
      // Mental health
      phq9Score: formData.get('phq9Score'),
      gad7Score: formData.get('gad7Score'),
      notes: formData.get('notes'),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ result, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Clinical result added successfully!');
        if (data.flags && data.flags.length > 0) {
          toast.warning(`${data.flags.length} automatic flag(s) added`);
        }
        setIsAddResultOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Failed to add result');
      }
    } catch (error) {
      console.error('Error adding result:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddIntervention = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const intervention = {
      clientId: selectedVisit.clientId,
      visitId: selectedVisit.id,
      category: formData.get('category'),
      type: formData.get('type'),
      date: formData.get('date'),
      provider: currentUser.name,
      notes: formData.get('notes'),
      quantity: formData.get('quantity'),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/interventions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ intervention, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Intervention added successfully!');
        setIsAddInterventionOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Failed to add intervention');
      }
    } catch (error) {
      console.error('Error adding intervention:', error);
      toast.error('Network error. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-8">Loading visits...</div>;
  }

  // Show visit detail view if a visit is selected
  if (viewingVisit) {
    const client = getClientInfo(viewingVisit.clientId);
    if (!client) {
      console.error('Client not found for visit:', viewingVisit);
      return (
        <div className="p-8">
          <Button onClick={() => setViewingVisit(null)} className="mb-4">← Back to Visits</Button>
          <p className="text-red-500">Error: Client not found for this visit.</p>
        </div>
      );
    }
    return (
      <VisitDetail
        visit={viewingVisit}
        client={client}
        onBack={() => setViewingVisit(null)}
        currentUser={currentUser}
        onUpdate={() => {
          loadData();
          setViewingVisit(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">Visit Management</h1>
          <p className="text-gray-600">Record and manage client visits, clinical results, and interventions</p>
        </div>
        {canEdit && (
          <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Record New Visit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Visit</DialogTitle>
                <DialogDescription>Add a new visit record for a client.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddVisit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client *</Label>
                  <Select name="clientId" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName} - {client.clientId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitDate">Visit Date *</Label>
                    <Input id="visitDate" name="visitDate" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visitType">Visit Type *</Label>
                    <Select name="visitType" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Clinical Review">Clinical Review</SelectItem>
                        <SelectItem value="Outreach Visit">Outreach Visit</SelectItem>
                        <SelectItem value="Case Management">Case Management</SelectItem>
                        <SelectItem value="Psychosocial Session">Psychosocial Session</SelectItem>
                        <SelectItem value="Follow-up">Follow-up</SelectItem>
                        <SelectItem value="Emergency">Emergency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Select name="location" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Clinic">Clinic</SelectItem>
                      <SelectItem value="Community">Community</SelectItem>
                      <SelectItem value="Home Visit">Home Visit</SelectItem>
                      <SelectItem value="Outreach">Outreach</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Input id="reason" name="reason" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes & Observations</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label>Services Provided *</Label>
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                    {Object.entries(
                      AVAILABLE_SERVICES.reduce((acc, service) => {
                        if (!acc[service.category]) acc[service.category] = [];
                        acc[service.category].push(service.name);
                        return acc;
                      }, {} as Record<string, string[]>)
                    ).map(([category, services]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
                        <div className="space-y-1.5">
                          {services.map((serviceName) => (
                            <div key={serviceName} className="flex items-center space-x-2">
                              <Checkbox
                                id={serviceName}
                                checked={selectedServices.includes(serviceName)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedServices([...selectedServices, serviceName]);
                                  } else {
                                    setSelectedServices(selectedServices.filter((s) => s !== serviceName));
                                  }
                                }}
                              />
                              <label
                                htmlFor={serviceName}
                                className="text-sm cursor-pointer select-none"
                              >
                                {serviceName}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedServices.map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="followUpRequired">Follow-up Required?</Label>
                    <Select name="followUpRequired">
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextAppointment">Next Appointment</Label>
                    <Input id="nextAppointment" name="nextAppointment" type="date" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setIsAddVisitOpen(false);
                    setSelectedServices([]);
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Save Visit
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="text-2xl mt-1">{visits.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl mt-1">
                  {visits.filter(v => {
                    const visitDate = new Date(v.visitDate);
                    const now = new Date();
                    return visitDate.getMonth() === now.getMonth() && visitDate.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Follow-ups Needed</p>
                <p className="text-2xl mt-1">
                  {visits.filter(v => v.followUpRequired).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl mt-1">
                  {new Set(visits.map(v => v.clientId)).size}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by client name, visit type, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visits Table */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardHeader>
          <CardTitle>All Visits</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredVisits.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No visits found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Visit Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Services Provided</TableHead>
                  <TableHead>Follow-up</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisits.map((visit) => {
                  const client = getClientInfo(visit.clientId);
                  return (
                    <TableRow key={visit.id}>
                      <TableCell>
                        {new Date(visit.visitDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getClientName(visit.clientId)}</p>
                          {client && (
                            <p className="text-xs text-gray-500">{client.clientId}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{visit.visitType}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="w-3 h-3" />
                          {visit.location}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {visit.servicesProvided?.split(', ').slice(0, 2).map((service: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                          {visit.servicesProvided?.split(', ').length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{visit.servicesProvided.split(', ').length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {visit.followUpRequired ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <Clock className="w-3 h-3 mr-1" />
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setViewingVisit(visit);
                            }}
                            title="View full visit details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setIsAddResultOpen(true);
                            }}
                            title="Add clinical result"
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVisit(visit);
                              setIsAddInterventionOpen(true);
                            }}
                            title="Add intervention"
                          >
                            <Heart className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Clinical Result Dialog */}
      <Dialog open={isAddResultOpen} onOpenChange={setIsAddResultOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Clinical Result</DialogTitle>
            <DialogDescription>
              Record clinical results for {selectedVisit && getClientName(selectedVisit.clientId)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClinicalResult} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resultType">Result Type *</Label>
                <Select name="resultType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vitals">Vitals</SelectItem>
                    <SelectItem value="lab">Lab Results</SelectItem>
                    <SelectItem value="mental-health">Mental Health</SelectItem>
                    <SelectItem value="nsp">NSP Specific</SelectItem>
                    <SelectItem value="mat">MAT Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" name="date" type="date" required />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Vitals</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input id="temperature" name="temperature" type="number" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodPressure">BP (mmHg)</Label>
                  <Input id="bloodPressure" name="bloodPressure" placeholder="120/80" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pulse">Pulse (bpm)</Label>
                  <Input id="pulse" name="pulse" type="number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" name="weight" type="number" step="0.1" />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Lab Results</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hivTest">HIV Test</Label>
                  <Select name="hivTest">
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                      <SelectItem value="Indeterminate">Indeterminate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hepB">Hep B</Label>
                  <Select name="hepB">
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hepC">Hep C</Label>
                  <Select name="hepC">
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tbScreening">TB Screening</Label>
                  <Select name="tbScreening">
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Negative">Negative</SelectItem>
                      <SelectItem value="Positive">Positive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Mental Health Screening</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phq9Score">PHQ-9 Score (0-27)</Label>
                  <Input id="phq9Score" name="phq9Score" type="number" min="0" max="27" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gad7Score">GAD-7 Score (0-21)</Label>
                  <Input id="gad7Score" name="gad7Score" type="number" min="0" max="21" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddResultOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Result
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Intervention Dialog */}
      <Dialog open={isAddInterventionOpen} onOpenChange={setIsAddInterventionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Intervention</DialogTitle>
            <DialogDescription>
              Add intervention for {selectedVisit && getClientName(selectedVisit.clientId)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIntervention} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select name="category" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIV & SRH">HIV & SRH</SelectItem>
                    <SelectItem value="Harm Reduction">Harm Reduction</SelectItem>
                    <SelectItem value="Mental Health">Mental Health</SelectItem>
                    <SelectItem value="Case Management">Case Management</SelectItem>
                    <SelectItem value="Education">Education & Vocational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Input id="type" name="type" placeholder="e.g., HIV Testing, NSP Distribution" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (if applicable)</Label>
              <Input id="quantity" name="quantity" placeholder="e.g., 10 syringes" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddInterventionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save Intervention
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}