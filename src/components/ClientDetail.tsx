import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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
  ArrowLeft,
  Edit,
  Save,
  Plus,
  FileText,
  Activity,
  AlertTriangle,
  Calendar,
  User,
  MapPin,
  Phone,
  Briefcase,
  Heart,
  Syringe,
  Pill,
  Brain,
  TestTube,
  CheckCircle2,
  Clock,
  Download,
  History,
  X,
  Upload
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

interface ClientDetailProps {
  clientId: string;
  onBack: () => void;
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

export function ClientDetail({ clientId, onBack, currentUser }: ClientDetailProps) {
  const [client, setClient] = useState<any>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [clinicalResults, setClinicalResults] = useState<any[]>([]);
  const [interventions, setInterventions] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedClient, setEditedClient] = useState<any>(null);
  
  // Dialog states
  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isAddInterventionOpen, setIsAddInterventionOpen] = useState(false);
  
  // Selected services for visit
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    loadClientData();
  }, [clientId]);

  const loadClientData = async () => {
    try {
      const [clientRes, visitsRes, resultsRes, interventionsRes, timelineRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients/${clientId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/client/${clientId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical-results/client/${clientId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/interventions/client/${clientId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/timeline/${clientId}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const [clientData, visitsData, resultsData, interventionsData, timelineData] = await Promise.all([
        clientRes.json(),
        visitsRes.json(),
        resultsRes.json(),
        interventionsRes.json(),
        timelineRes.json(),
      ]);

      if (clientData.success) {
        setClient(clientData.client);
        setEditedClient(clientData.client);
      }
      if (visitsData.success) setVisits(visitsData.visits || []);
      if (resultsData.success) setClinicalResults(resultsData.results || []);
      if (interventionsData.success) setInterventions(interventionsData.interventions || []);
      if (timelineData.success) setTimeline(timelineData.timeline || []);
    } catch (error) {
      console.error('Error loading client data:', error);
      toast.error('Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClient = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients/${clientId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            updates: editedClient,
            userId: currentUser.id 
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setClient(data.client);
        setIsEditing(false);
        toast.success('Client updated successfully!');
        loadClientData();
      } else {
        toast.error(data.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const visit = {
      clientId,
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
        setSelectedServices([]); // Reset selected services
        loadClientData();
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
      clientId,
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
        loadClientData();
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
      clientId,
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
        loadClientData();
      } else {
        toast.error(data.error || 'Failed to add intervention');
      }
    } catch (error) {
      console.error('Error adding intervention:', error);
      toast.error('Network error. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-8">Loading client data...</div>;
  }

  if (!client) {
    return <div className="p-8">Client not found</div>;
  }

  const canEdit = hasPermission(currentUser?.permissions || [], PERMISSIONS.CLIENT_EDIT);
  const canViewSensitive = hasPermission(currentUser?.permissions || [], PERMISSIONS.CLIENT_VIEW_SENSITIVE);

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl mb-1">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{client.clientId}</Badge>
              <Badge variant="outline" className="gap-1">
                <MapPin className="w-3 h-3" />
                {client.location}
              </Badge>
              <Badge 
                variant="outline" 
                className={client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50'}
              >
                {client.status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setEditedClient(client);
              }}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveClient}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {canEdit && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Flags/Alerts */}
      {client.flags && Array.isArray(client.flags) && client.flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {client.flags.map((flag: any, idx: number) => (
            <Badge 
              key={idx} 
              variant="outline" 
              className={
                flag.severity === 'high' 
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : flag.severity === 'medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {flag.type.replace(/-/g, ' ').toUpperCase()}
            </Badge>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="visits">
            Visits
            <Badge variant="secondary" className="ml-2">{visits.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="clinical">Clinical Results</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Demographics */}
            <Card className="rounded-2xl shadow-sm border-0 bg-white lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Demographics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Input 
                          value={editedClient.firstName} 
                          onChange={(e) => setEditedClient({...editedClient, firstName: e.target.value})}
                        />
                        <Input 
                          value={editedClient.lastName} 
                          onChange={(e) => setEditedClient({...editedClient, lastName: e.target.value})}
                        />
                      </div>
                    ) : (
                      <p className="text-sm">{client.firstName} {client.lastName}</p>
                    )}
                  </div>
                  <div>
                    <Label>Nickname/Alias</Label>
                    {isEditing ? (
                      <Input 
                        value={editedClient.nickname || ''} 
                        onChange={(e) => setEditedClient({...editedClient, nickname: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm">{client.nickname || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <p className="text-sm">{client.gender}</p>
                  </div>
                  <div>
                    <Label>Age</Label>
                    <p className="text-sm">{client.age} years</p>
                  </div>
                  <div>
                    <Label>Date of Birth</Label>
                    <p className="text-sm">{client.dateOfBirth ? new Date(client.dateOfBirth).toLocaleDateString() : '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone Number
                    </Label>
                    {isEditing ? (
                      <Input 
                        value={editedClient.phone || ''} 
                        onChange={(e) => setEditedClient({...editedClient, phone: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm">{client.phone || '-'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Emergency Contact</Label>
                    {isEditing ? (
                      <Input 
                        value={editedClient.emergencyContact || ''} 
                        onChange={(e) => setEditedClient({...editedClient, emergencyContact: e.target.value})}
                      />
                    ) : (
                      <p className="text-sm">{client.emergencyContact || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Education Level</Label>
                    <p className="text-sm">{client.educationLevel || '-'}</p>
                  </div>
                  <div>
                    <Label>Employment Status</Label>
                    <p className="text-sm">{client.employmentStatus || '-'}</p>
                  </div>
                </div>

                <div>
                  <Label>Marital Status</Label>
                  <p className="text-sm">{client.maritalStatus || '-'}</p>
                </div>

                {client.vulnerabilities && Array.isArray(client.vulnerabilities) && client.vulnerabilities.length > 0 && (
                  <div>
                    <Label>Vulnerability Flags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {client.vulnerabilities.map((v: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Program Enrollment */}
            <Card className="rounded-2xl shadow-sm border-0 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Program Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.program && (
                  <div>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {client.program}
                    </Badge>
                  </div>
                )}
                
                <div>
                  <Label>Enrollment Date</Label>
                  <p className="text-sm">
                    {client.enrollmentDate ? new Date(client.enrollmentDate).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div>
                  <Label>Assigned Outreach Worker</Label>
                  <p className="text-sm">{client.assignedOutreachWorker || 'Not assigned'}</p>
                </div>

                <div>
                  <Label>Assigned Clinician</Label>
                  <p className="text-sm">{client.assignedClinician || 'Not assigned'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl">Visit Records</h2>
            <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Visit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Record New Visit</DialogTitle>
                  <DialogDescription>Add a new visit record for this client.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddVisit} className="space-y-4">
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
                    <Button type="button" variant="outline" onClick={() => setIsAddVisitOpen(false)}>
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
          </div>

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              {visits.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No visits recorded</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Follow-up</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>{new Date(visit.visitDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{visit.visitType}</Badge>
                        </TableCell>
                        <TableCell>{visit.location}</TableCell>
                        <TableCell className="max-w-xs truncate">{visit.reason || '-'}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Results Tab */}
        <TabsContent value="clinical" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl">Clinical Results</h2>
            <Dialog open={isAddResultOpen} onOpenChange={setIsAddResultOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Result
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Clinical Result</DialogTitle>
                  <DialogDescription>Record new clinical results for this client.</DialogDescription>
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
          </div>

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              {clinicalResults.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No clinical results recorded</div>
              ) : (
                <div className="space-y-4">
                  {clinicalResults.map((result) => (
                    <div key={result.id} className="p-4 border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{result.type}</Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(result.date || result.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {result.temperature && <div><strong>Temp:</strong> {result.temperature}°C</div>}
                        {result.bloodPressure && <div><strong>BP:</strong> {result.bloodPressure}</div>}
                        {result.pulse && <div><strong>Pulse:</strong> {result.pulse} bpm</div>}
                        {result.weight && <div><strong>Weight:</strong> {result.weight} kg</div>}
                        {result.hivTest && <div><strong>HIV:</strong> {result.hivTest}</div>}
                        {result.hepC && <div><strong>Hep C:</strong> {result.hepC}</div>}
                        {result.phq9Score !== undefined && <div><strong>PHQ-9:</strong> {result.phq9Score}</div>}
                        {result.gad7Score !== undefined && <div><strong>GAD-7:</strong> {result.gad7Score}</div>}
                      </div>
                      {result.notes && (
                        <p className="text-sm text-gray-600 mt-2">{result.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl">Interventions & Services</h2>
            <Dialog open={isAddInterventionOpen} onOpenChange={setIsAddInterventionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Intervention
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Record Intervention</DialogTitle>
                  <DialogDescription>Add a new intervention or service delivered to this client.</DialogDescription>
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

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              {interventions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No interventions recorded</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interventions.map((intervention) => (
                      <TableRow key={intervention.id}>
                        <TableCell>{new Date(intervention.date || intervention.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{intervention.category}</Badge>
                        </TableCell>
                        <TableCell>{intervention.type}</TableCell>
                        <TableCell>{intervention.provider}</TableCell>
                        <TableCell>{intervention.quantity || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <h2 className="text-xl">Client Timeline</h2>
          
          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              {timeline.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No timeline events</div>
              ) : (
                <div className="space-y-6">
                  {timeline.map((event, idx) => (
                    <div key={event.id || idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          event.type === 'visit' ? 'bg-blue-100' :
                          event.type === 'clinical-result' ? 'bg-green-100' :
                          event.type === 'intervention' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          {event.type === 'visit' && <FileText className="w-5 h-5 text-blue-600" />}
                          {event.type === 'clinical-result' && <TestTube className="w-5 h-5 text-green-600" />}
                          {event.type === 'intervention' && <Heart className="w-5 h-5 text-purple-600" />}
                          {event.type === 'audit' && <History className="w-5 h-5 text-gray-600" />}
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">
                            {event.type === 'visit' && event.visitType}
                            {event.type === 'clinical-result' && `Clinical Result - ${event.type}`}
                            {event.type === 'intervention' && event.category}
                            {event.type === 'audit' && `${event.action} (${event.entityType})`}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {new Date(event.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {event.notes || event.reason || 'No additional details'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}