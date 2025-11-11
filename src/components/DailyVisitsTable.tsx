import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
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
  }>;
  hasRiskFlags?: boolean;
}

export function DailyVisitsTable({ currentUser, onNavigateToVisits, onViewVisitDetail }: DailyVisitsTableProps) {
  const [visits, setVisits] = useState<VisitWithServices[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);

  // Role-based access control
  const canViewFullDetails = ['Admin', 'Clinician', 'HTS Counselor', 'Psychologist', 'Counselor', 
    'Nurse', 'Program Manager', 'Program Coordinator', 'M&E Officer', 'Data Entry'].includes(currentUser.role);
  
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
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadVisits = async () => {
    setLoading(true);
    try {
      // Fetch all visits
      const visitsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const visitsData = await visitsResponse.json();
      
      if (!visitsData.success) {
        throw new Error('Failed to load visits');
      }

      // Fetch all clients
      const clientsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const clientsData = await clientsResponse.json();
      const clientsMap = new Map(clientsData.clients.map((c: any) => [c.id, c]));

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
                  services.push({
                    type: 'clinical',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.providedAt || record.createdAt,
                  });
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
                    type: 'mat',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.dosingDate || record.createdAt,
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
                    type: 'nsp',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.providedBy || record.createdBy,
                    time: record.distributionDate || record.createdAt,
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
                  services.push({
                    type: 'mental-health',
                    provider: provider ? provider.name : 'Unknown',
                    providerId: record.assessedBy || record.createdBy,
                    time: record.assessmentDate || record.createdAt,
                  });
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
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {visit.services.length === 0 ? (
                          <Badge variant="outline" className="text-xs">
                            No services
                          </Badge>
                        ) : (
                          visit.services.map((service, idx) => {
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
    </Card>
  );
}