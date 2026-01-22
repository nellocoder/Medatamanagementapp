import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Calendar,
  MapPin,
  ChevronRight,
  Stethoscope,
  Syringe,
  Pill,
  Shield,
  Brain,
  Heart,
  Activity,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Loader
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DailyVisitsTableProps {
  currentUser: any;
  onNavigateToVisits?: (filters?: any) => void;
  onViewVisitDetail?: (visitId: string) => void;
}

interface VisitWithServices {
  id: string;
  clientId: string;
  clientName: string;
  visitDate: string;
  visitType: string;
  location: string;
  status: string;
  services: Array<{
    type: string;
    provider: string;
    providerId: string;
    time: string;
    // New fields for details
    result?: string;
    severity?: string;
    score?: string;
    classification?: string;
    isSensitive?: boolean;
    hidden?: boolean;
  }>;
  hasRiskFlags?: boolean;
}

export function DailyVisitsTable({ currentUser, onNavigateToVisits, onViewVisitDetail }: DailyVisitsTableProps) {
  const [visits, setVisits] = useState<VisitWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [viewingServicesVisit, setViewingServicesVisit] = useState<VisitWithServices | null>(null);

  // Role-based access control
  const canViewFullDetails = ['Admin', 'Clinician', 'HTS Counsellor', 'Psychologist', 'Counselor', 
    'Nurse', 'Program Manager', 'Program Coordinator', 'M&E Officer', 'Data Entry'].includes(currentUser.role);
    
  // Sensitive Data Access (HIV, etc.)
  const canViewSensitiveResults = ['Admin', 'Clinician', 'HTS Counsellor', 'Counselor', 'Nurse', 'Program Manager'].includes(currentUser.role);
  
  const isOutreachWorker = currentUser.role === 'Outreach Worker';
  const isParalegal = currentUser.role === 'Paralegal';
  const isSocialWorker = currentUser.role === 'Social Worker';

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'Mombasa', label: 'Mombasa' },
    { value: 'Lamu', label: 'Lamu' },
    { value: 'Kilifi', label: 'Kilifi' },
  ];

  const serviceIcons: { [key: string]: any } = {
    'clinical': Stethoscope,
    'hts': Activity,
    'mat': Pill,
    'mental-health': Brain,
    'psychosocial': Heart,
    'nsp': Syringe,
    'condom': Shield,
    'outreach': Users,
  };

  const serviceColors: { [key: string]: string } = {
    'clinical': 'bg-blue-100 text-blue-700',
    'hts': 'bg-green-100 text-green-700',
    'mat': 'bg-purple-100 text-purple-700',
    'mental-health': 'bg-pink-100 text-pink-700',
    'psychosocial': 'bg-red-100 text-red-700',
    'nsp': 'bg-indigo-100 text-indigo-700',
    'condom': 'bg-teal-100 text-teal-700',
    'outreach': 'bg-amber-100 text-amber-700',
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      loadVisits();
    }
  }, [selectedDate, selectedLocation, users]);

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      
      if (!response.ok) {
        console.warn('Could not fetch users');
        setUsers([]);
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadVisits = async () => {
    setLoading(true);
    try {
      // Check if Supabase is configured
      if (!projectId || !publicAnonKey) {
        console.warn('Supabase not configured');
        setVisits([]);
        setLoading(false);
        return;
      }

      // Fetch all visits
      const visitsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      ).catch(err => {
        console.warn('Failed to fetch visits:', err);
        return { ok: false, json: async () => ({ success: false, visits: [] }) };
      });
      
      const visitsData = await visitsResponse.json().catch(() => ({ success: false, visits: [] }));
      
      if (!visitsData.success) {
        setVisits([]);
        setLoading(false);
        return;
      }

      // Fetch all clients
      const clientsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      ).catch(err => {
        console.warn('Failed to fetch clients:', err);
        return { ok: false, json: async () => ({ success: false, clients: [] }) };
      });
      
      const clientsData = await clientsResponse.json().catch(() => ({ success: false, clients: [] }));
      const clientsMap = new Map((clientsData.clients || []).map((c: any) => [c.id, c]));

      // Filter visits by date and location
      let filteredVisits = visitsData.visits.filter((visit: any) => {
        const visitDate = new Date(visit.visitDate || visit.date || visit.createdAt);
        const selectedDateObj = new Date(selectedDate);
        const dateMatch = visitDate.toDateString() === selectedDateObj.toDateString();
        const locationMatch = selectedLocation === 'all' || visit.location === selectedLocation;
        return dateMatch && locationMatch;
      });

      // Sort by most recent first
      filteredVisits.sort((a: any, b: any) => {
        const dateA = new Date(a.visitDate || a.date || a.createdAt);
        const dateB = new Date(b.visitDate || b.date || b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      // Deduplicate by clientId - keep only the most recent visit per client
      const clientVisitMap = new Map();
      filteredVisits.forEach((visit: any) => {
        if (!clientVisitMap.has(visit.clientId)) {
          clientVisitMap.set(visit.clientId, visit);
        }
      });
      filteredVisits = Array.from(clientVisitMap.values());

      // Take only the first 5
      filteredVisits = filteredVisits.slice(0, 5);

      // Fetch service records for each visit
      const enrichedVisits = await Promise.all(
        filteredVisits.map(async (visit: any) => {
          const client = clientsMap.get(visit.clientId);
          const services: Array<{ type: string; provider: string; providerId: string; time: string }> = [];

          // Fetch all service types for this visit
          try {
            // Clinical services
            const clinicalResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (clinicalResponse.ok) {
              const clinicalData = await clinicalResponse.json();
              if (clinicalData.success && clinicalData.records.length > 0) {
                clinicalData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.providedBy || u.id === record.createdBy);
                  
                  if (record.type === 'vitals') {
                     services.push({
                      type: 'Vitals Check',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.providedBy || record.createdBy,
                      time: record.providedAt || record.createdAt,
                      result: `BP: ${record.bloodPressure || '-'}, Temp: ${record.temperature || '-'}`,
                    });
                  } else if (record.type === 'lab' && record.hivTest) {
                     services.push({
                      type: 'HIV Testing',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.providedBy || record.createdBy,
                      time: record.providedAt || record.createdAt,
                      result: record.hivTest,
                      isSensitive: true,
                    });
                  } else {
                     services.push({
                      type: record.type === 'lab' ? 'Lab Results' : 'Clinical Care',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.providedBy || record.createdBy,
                      time: record.providedAt || record.createdAt,
                    });
                  }
                });
              }
            }

            // MAT services
            const matResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mat/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (matResponse.ok) {
              const matData = await matResponse.json();
              if (matData.success && matData.records.length > 0) {
                matData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.providedBy || u.id === record.createdBy);
                  services.push({
                    type: 'Methadone Dose',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.dosingDate || record.createdAt,
                    result: record.dose ? `${record.dose} mg` : undefined
                  });
                });
              }
            }

            // NSP services
            const nspResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/nsp/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (nspResponse.ok) {
              const nspData = await nspResponse.json();
              if (nspData.success && nspData.records.length > 0) {
                nspData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.providedBy || u.id === record.createdBy);
                  services.push({
                    type: 'NSP Distribution',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.distributionDate || record.createdAt,
                    result: record.items ? Object.entries(record.items).map(([k,v]) => `${k}: ${v}`).join(', ') : undefined
                  });
                });
              }
            }

            // Mental Health services
            const mhResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mentalhealth/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (mhResponse.ok) {
              const mhData = await mhResponse.json();
              if (mhData.success && mhData.records.length > 0) {
                mhData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.assessedBy || u.id === record.createdBy);
                  
                  // Add PHQ-9 if present
                  if (record.phq9Score !== undefined && record.phq9Score !== null) {
                    services.push({
                      type: 'PHQ-9 Screening',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.assessedBy || record.createdBy,
                      time: record.assessmentDate || record.createdAt,
                      score: record.phq9Score,
                      severity: record.phq9Severity,
                      classification: record.phq9Classification,
                    });
                  }
                  
                  // Add GAD-7 if present
                  if (record.gad7Score !== undefined && record.gad7Score !== null) {
                    services.push({
                      type: 'GAD-7 Screening',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.assessedBy || record.createdBy,
                      time: record.assessmentDate || record.createdAt,
                      score: record.gad7Score,
                      severity: record.gad7Severity,
                      classification: record.gad7Classification,
                    });
                  }
                  
                  // Fallback if neither specific score is found but record exists
                  if (!record.phq9Score && !record.gad7Score) {
                     services.push({
                      type: 'Mental Health Assessment',
                      provider: provider ? provider.name : 'Unknown',
                      providerId: record.assessedBy || record.createdBy,
                      time: record.assessmentDate || record.createdAt,
                    });
                  }
                });
              }
            }

            // Psychosocial services
            const psychoResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/psychosocial/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (psychoResponse.ok) {
              const psychoData = await psychoResponse.json();
              if (psychoData.success && psychoData.records.length > 0) {
                psychoData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.providedBy || u.id === record.createdBy);
                  services.push({
                    type: 'psychosocial',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.sessionDate || record.createdAt,
                  });
                });
              }
            }

            // Condom services
            const condomResponse = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/condom/${visit.id}`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
            );
            if (condomResponse.ok) {
              const condomData = await condomResponse.json();
              if (condomData.success && condomData.records.length > 0) {
                condomData.records.forEach((record: any) => {
                  const provider = users.find(u => u.id === record.providedBy || u.id === record.createdBy);
                  services.push({
                    type: 'condom',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.providedAt || record.createdAt,
                  });
                });
              }
            }
          } catch (error) {
            console.error('Error fetching services for visit:', visit.id, error);
          }

          // Check for services in the visit.servicesProvided string (comma separated)
          if (visit.servicesProvided) {
            const stringServices = visit.servicesProvided.split(', ').filter((s: string) => s.trim().length > 0);
            stringServices.forEach((serviceName: string) => {
              // Normalize service name for comparison
              const normalizedName = serviceName.toLowerCase().replace(/[\s-]/g, '');
              
              // Check if this service is already represented by an API record
              const alreadyExists = services.some(s => {
                const sName = s.type.toLowerCase().replace(/[\s-]/g, '');
                return sName.includes(normalizedName) || normalizedName.includes(sName);
              });
              
              if (!alreadyExists) {
                services.push({
                  type: serviceName,
                  provider: users.find(u => u.id === visit.userId)?.name || 'Unknown', // Fallback to visit creator
                  providerId: visit.userId,
                  time: visit.visitDate || visit.createdAt,
                });
              }
            });
          }

          // Determine visit status
          let status = 'Completed';
          if (visit.status) {
            status = visit.status;
          } else if (services.length === 0) {
            status = 'In Progress';
          }

          // Check for risk flags
          const hasRiskFlags = client?.riskLevel === 'High' || client?.activeFlags?.length > 0;

          // Apply name restrictions based on role
          let clientName = 'Unknown Client';
          if (client) {
            if (canViewFullDetails) {
              clientName = `${client.firstName} ${client.lastName}`;
            } else if (isOutreachWorker) {
              // Show initials only
              clientName = `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`;
            } else {
              clientName = `${client.firstName} ${client.lastName?.[0]}.`;
            }
          }

          return {
            id: visit.id,
            clientId: client?.clientId || visit.clientId, // Use client's original clientId
            clientName,
            visitDate: visit.visitDate || visit.date || visit.createdAt,
            visitType: visit.visitType || 'General',
            location: visit.location,
            status,
            services,
            hasRiskFlags,
          };
        })
      );

      setVisits(enrichedVisits);
    } catch (error) {
      console.error('Error loading visits:', error);
      toast.error('Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleSeeMore = () => {
    if (onNavigateToVisits) {
      onNavigateToVisits({
        date: selectedDate,
        location: selectedLocation,
      });
    }
  };

  const handleRowClick = (visit: VisitWithServices) => {
    if (canViewFullDetails && onViewVisitDetail) {
      onViewVisitDetail(visit.id);
    } else if (!canViewFullDetails) {
      toast.error('You do not have permission to view visit details');
    }
  };

  const handleServiceClick = (e: React.MouseEvent, visit: VisitWithServices) => {
    e.stopPropagation(); // Prevent row click
    setViewingServicesVisit(visit);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'in progress':
        return <Loader className="w-4 h-4 text-amber-600" />;
      case 'cancelled':
      case 'missed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'in progress':
        return 'bg-amber-100 text-amber-700';
      case 'cancelled':
      case 'missed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Today's Client Visits
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Clients seen on {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSeeMore}>
            See Full Visit List
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map(loc => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading visits...</span>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No visits recorded for this date</p>
            <p className="text-sm mt-1">Try selecting a different date or location</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Client</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Client ID</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Services</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Assigned Provider(s)</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Visit Time</th>
                  <th className="text-left py-3 px-4 text-xs text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr
                    key={visit.id}
                    onClick={() => handleRowClick(visit)}
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      canViewFullDetails ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {/* Client Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{visit.clientName}</span>
                        {visit.hasRiskFlags && (
                          <AlertTriangle className="w-4 h-4 text-red-500" title="Risk flags present" />
                        )}
                      </div>
                    </td>

                    {/* Client ID */}
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{visit.clientId}</span>
                    </td>

                    {/* Services */}
                    <td className="py-3 px-4" onClick={(e) => handleServiceClick(e, visit)}>
                      <div className="flex flex-wrap gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded -ml-1 transition-colors">
                        {visit.services.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            No services
                          </Badge>
                        ) : (
                          visit.services.slice(0, 3).map((service, idx) => {
                            const Icon = serviceIcons[service.type] || Activity;
                            const colorClass = serviceColors[service.type] || 'bg-gray-100 text-gray-700';
                            
                            // Apply permission filters
                            let showService = true;
                            if (isParalegal && !['psychosocial', 'gbv'].includes(service.type)) {
                              showService = false;
                            }
                            
                            if (!showService) return null;

                            return (
                              <Badge key={idx} className={`${colorClass} text-xs flex items-center gap-1`}>
                                <Icon className="w-3 h-3" />
                                {service.type.replace('-', ' ').toUpperCase()}
                              </Badge>
                            );
                          })
                        )}
                        {visit.services.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{visit.services.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Assigned Providers */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {visit.services.length === 0 ? (
                          <span className="text-sm text-gray-400">Not assigned</span>
                        ) : (
                          // Show unique providers
                          [...new Set(visit.services.map(s => s.provider))].map((provider, idx) => (
                            <div key={idx} className="text-sm text-gray-700">
                              {provider}
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Visit Time */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-3 h-3" />
                        {formatTime(visit.visitDate)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <Badge className={`${getStatusColor(visit.status)} flex items-center gap-1 w-fit`}>
                        {getStatusIcon(visit.status)}
                        {visit.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {visits.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {visits.length} of {visits.length} visits
            </p>
            <Button variant="ghost" size="sm" onClick={handleSeeMore} className="text-blue-600 hover:text-blue-700">
              View all visits
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>

      {/* Services Detail Dialog */}
      <Dialog open={!!viewingServicesVisit} onOpenChange={(open) => !open && setViewingServicesVisit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Services Provided</DialogTitle>
            <DialogDescription>
              Detailed list of services for {viewingServicesVisit?.clientName} on {viewingServicesVisit && new Date(viewingServicesVisit.visitDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {viewingServicesVisit?.services && viewingServicesVisit.services.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Time</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Provider</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Details/Result</th>
                      <th className="text-left py-2 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewingServicesVisit.services.map((service, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm font-medium">
                          {service.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">
                          {service.type === 'Clinical Care' || service.type === 'Vitals Check' || service.type === 'Lab Results' || service.type === 'HIV Testing' ? 'Clinical Care' :
                           service.type === 'Methadone Dose' ? 'MAT Program' :
                           service.type === 'NSP Distribution' ? 'Harm Reduction' :
                           service.type === 'PHQ-9 Screening' || service.type === 'GAD-7 Screening' || service.type === 'Mental Health Assessment' ? 'Mental Health' :
                           service.type === 'psychosocial' ? 'Psychosocial Support' :
                           'General Support'}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">
                          {formatTime(service.time)}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">
                          {service.provider}
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-700">
                          {service.isSensitive && !canViewSensitiveResults ? (
                            <span className="text-gray-400 italic flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Confidential
                            </span>
                          ) : service.classification ? (
                            <div className="flex flex-col">
                              <span className="font-medium">{service.classification}</span>
                              {service.score && <span className="text-xs text-gray-500">Score: {service.score}</span>}
                            </div>
                          ) : service.result ? (
                             <span>{service.result}</span>
                          ) : (
                             <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                            Completed
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No services recorded for this visit.</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end mt-4">
            <Button onClick={() => setViewingServicesVisit(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}