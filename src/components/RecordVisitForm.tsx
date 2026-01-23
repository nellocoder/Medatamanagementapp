import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  FileText,
  Activity,
  Brain,
  Syringe,
  Shield,
  Users,
  Home,
  User,
  Calendar,
  MapPin,
  Stethoscope
} from 'lucide-react';
import { PHQ9Form, GAD7Form } from './MentalHealthForms';
import { PrepRastForm } from './PrepRastForm';

// Local AssistForm definition
const AssistForm = ({ onChange, initialData }: any) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [score, setScore] = useState(0);

  const ASSIST_SUBSTANCES = [
    'Tobacco products', 'Alcoholic beverages', 'Cannabis', 'Cocaine', 
    'Amphetamine-type stimulants', 'Inhalants', 'Sedatives', 'Hallucinogens', 'Opioids', 'Other'
  ];

  useEffect(() => {
    const total = Object.values(responses).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
    setScore(total);
    
    let severity = 'Low';
    if (total > 26) severity = 'High';
    else if (total > 3) severity = 'Moderate';

    onChange({ score: total, severity, classification: `${severity} Risk`, responses });
  }, [responses]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
        <h3 className="font-semibold">ASSIST Screening (Simplified)</h3>
        <Badge variant={score > 26 ? "destructive" : score > 3 ? "secondary" : "outline"}>Risk: {score}</Badge>
      </div>
      <p className="text-sm text-gray-500">Frequency of use in the past 3 months:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ASSIST_SUBSTANCES.map(sub => (
          <div key={sub} className="flex items-center justify-between border-b pb-2">
            <span className="text-sm">{sub}</span>
            <select 
              className="text-sm border rounded p-1"
              value={responses[sub] || 0}
              onChange={(e) => setResponses({...responses, [sub]: parseInt(e.target.value)})}
            >
              <option value="0">Never</option>
              <option value="2">Once/Twice</option>
              <option value="3">Monthly</option>
              <option value="4">Weekly</option>
              <option value="6">Daily</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

// Service Categories Definition
const SERVICE_GROUPS = [
  {
    id: 'clinical',
    title: 'Clinical Services',
    icon: Stethoscope,
    color: 'text-blue-600',
    services: ['TB screening', 'STI syndromic screening', 'HIV testing', 'PrEP screening', 'MAT review']
  },
  {
    id: 'mental_health',
    title: 'Mental Health & Psychosocial',
    icon: Brain,
    color: 'text-purple-600',
    services: ['CBT intervention', 'Individual counseling', 'Group session', 'Crisis intervention']
  },
  {
    id: 'harm_reduction',
    title: 'Harm Reduction',
    icon: Syringe,
    color: 'text-amber-600',
    services: ['Needle and syringe provision', 'Condoms', 'Naloxone', 'Overdose education']
  },
  {
    id: 'protection',
    title: 'Protection & Violence Response',
    icon: Shield,
    color: 'text-red-600',
    services: ['Violence screening', 'GBV response', 'Legal referral', 'Safety planning']
  },
  {
    id: 'social',
    title: 'Social & Structural Support',
    icon: Home,
    color: 'text-green-600',
    services: ['ID assistance', 'Housing support', 'Employment/vocational support', 'Education reintegration']
  },
  {
    id: 'family',
    title: 'Family Integration',
    icon: Users,
    color: 'text-pink-600',
    services: ['Family contact status', 'Willingness for reintegration', 'Follow up plan']
  }
];

interface RecordVisitFormProps {
  clients: any[];
  currentUser: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordVisitForm({ clients, currentUser, onSuccess, onCancel }: RecordVisitFormProps) {
  // 1. Visit Details State
  const [visitDetails, setVisitDetails] = useState({
    clientId: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'Clinical Review',
    location: 'Clinic',
    provider: currentUser.name,
    reason: '',
    notes: '',
    followUpRequired: false,
    nextAppointment: ''
  });

  // 2. Screening State
  const [screenings, setScreenings] = useState({
    phq9: { completed: false, data: null },
    gad7: { completed: false, data: null },
    assist: { completed: false, data: null },
    prepRast: { completed: false, data: null }
  });
  const [activeScreeningTab, setActiveScreeningTab] = useState('phq9');

  // 3. Services State
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // 4. UI State
  const [showSummary, setShowSummary] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleScreeningUpdate = (type: 'phq9' | 'gad7' | 'assist' | 'prepRast', data: any) => {
    setScreenings(prev => ({
      ...prev,
      [type]: {
        completed: true,
        data
      }
    }));
  };

  // Determine if PrEP RAST is required
  const isPrepRequired = selectedServices.includes('PrEP screening');
  const isPrepComplete = !isPrepRequired || screenings.prepRast.completed;

  const isScreeningComplete = screenings.phq9.completed && screenings.gad7.completed && screenings.assist.completed && isPrepComplete;

  const handleSubmit = async () => {
    if (!isScreeningComplete) {
      toast.error("Please complete all mandatory screenings before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Visit Record
      const visitData = {
        clientId: visitDetails.clientId,
        visitDate: visitDetails.visitDate,
        visitType: visitDetails.visitType,
        location: visitDetails.location,
        reason: visitDetails.reason,
        notes: visitDetails.notes,
        servicesProvided: selectedServices.join(', '),
        followUpRequired: visitDetails.followUpRequired,
        nextAppointment: visitDetails.nextAppointment,
        provider: visitDetails.provider,
        // Store screening summaries in metadata or notes for now if schema is strict
        metadata: {
          screenings: {
            phq9: screenings.phq9.data,
            gad7: screenings.gad7.data,
            assist: screenings.assist.data,
            prepRast: screenings.prepRast.data
          }
        }
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ visit: visitData, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // 2. Create Clinical Results for Screenings (Optional - based on existing schema)
        // If we need to store PHQ9/GAD7 as separate clinical_results rows:
        if (screenings.phq9.data) {
           await createClinicalResult(data.visit.id, 'PHQ-9', screenings.phq9.data);
        }
        if (screenings.gad7.data) {
           await createClinicalResult(data.visit.id, 'GAD-7', screenings.gad7.data);
        }
        if (screenings.assist.data) {
           await createClinicalResult(data.visit.id, 'ASSIST', screenings.assist.data);
        }
        if (screenings.prepRast.data) {
           await createClinicalResult(data.visit.id, 'PrEP RAST', {
             ...screenings.prepRast.data,
             score: screenings.prepRast.data.eligible ? 1 : 0, // Mock score for RAST
             severity: screenings.prepRast.data.severity
           });
        }

        toast.success('Visit recorded successfully!');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to record visit');
      }
    } catch (error) {
      console.error('Error submitting visit:', error);
      toast.error('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const createClinicalResult = async (visitId: string, type: string, data: any) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical-results`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            result: {
              clientId: visitDetails.clientId,
              visitId: visitId,
              type: type,
              date: visitDetails.visitDate,
              notes: `Score: ${data.score}, Severity: ${data.severity}`,
              // Map specific fields if schema supports them
              phq9Score: type === 'PHQ-9' ? data.score : undefined,
              phq9Severity: type === 'PHQ-9' ? data.severity : undefined,
              gad7Score: type === 'GAD-7' ? data.score : undefined,
              gad7Severity: type === 'GAD-7' ? data.severity : undefined,
            }, 
            userId: currentUser.id 
          }),
        }
      );
    } catch (e) {
      console.error(`Failed to save ${type} result`, e);
    }
  };

  // Summary View
  if (showSummary) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold">Visit Summary Review</h2>
          <Button variant="outline" onClick={() => setShowSummary(false)}>Back to Edit</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Visit Details</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Client:</strong> {clients.find(c => c.id === visitDetails.clientId)?.firstName} {clients.find(c => c.id === visitDetails.clientId)?.lastName}</p>
              <p><strong>Date:</strong> {visitDetails.visitDate}</p>
              <p><strong>Type:</strong> {visitDetails.visitType}</p>
              <p><strong>Location:</strong> {visitDetails.location}</p>
              <p><strong>Provider:</strong> {visitDetails.provider}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Screening Results</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>PHQ-9:</span>
                <Badge variant={screenings.phq9.data?.severity === 'Severe' ? 'destructive' : 'outline'}>
                  {screenings.phq9.data?.score} ({screenings.phq9.data?.severity})
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>GAD-7:</span>
                <Badge variant={screenings.gad7.data?.severity === 'Severe' ? 'destructive' : 'outline'}>
                  {screenings.gad7.data?.score} ({screenings.gad7.data?.severity})
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>ASSIST:</span>
                <Badge variant={screenings.assist.data?.severity === 'High' ? 'destructive' : 'outline'}>
                  {screenings.assist.data?.score} ({screenings.assist.data?.severity})
                </Badge>
              </div>
              {screenings.prepRast.data && (
                <div className="flex justify-between">
                  <span>PrEP RAST:</span>
                  <Badge variant={screenings.prepRast.data.eligible ? 'destructive' : 'outline'}>
                    {screenings.prepRast.data.eligible ? 'Refer' : 'Not Referred'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Services & Follow-up</CardTitle></CardHeader>
          <CardContent>
             <h4 className="font-semibold mb-2">Services Provided ({selectedServices.length})</h4>
             <div className="flex flex-wrap gap-2 mb-4">
               {selectedServices.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
             </div>
             {visitDetails.followUpRequired && (
               <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-800">
                 <strong>Follow-up Required</strong>
                 {visitDetails.nextAppointment && <span> on {visitDetails.nextAppointment}</span>}
               </div>
             )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Complete & Save Visit'}
          </Button>
        </div>
      </div>
    );
  }

  // Main Form View
  return (
    <div className="space-y-8 pb-20"> {/* pb-20 for sticky footer */}
      {/* 1. Visit Details Section (Always Visible) */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select 
            value={visitDetails.clientId} 
            onValueChange={(val) => setVisitDetails({...visitDetails, clientId: val})}
          >
            <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={visitDetails.visitDate} onChange={e => setVisitDetails({...visitDetails, visitDate: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Visit Type *</Label>
          <Select 
            value={visitDetails.visitType} 
            onValueChange={(val) => setVisitDetails({...visitDetails, visitType: val})}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Clinical Review">Clinical Review</SelectItem>
              <SelectItem value="Outreach Visit">Outreach Visit</SelectItem>
              <SelectItem value="Case Management">Case Management</SelectItem>
              <SelectItem value="Psychosocial Session">Psychosocial Session</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Location *</Label>
          <Select 
            value={visitDetails.location} 
            onValueChange={(val) => setVisitDetails({...visitDetails, location: val})}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Clinic">Clinic</SelectItem>
              <SelectItem value="Community">Community</SelectItem>
              <SelectItem value="Home Visit">Home Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Provider(s)</Label>
          <Input value={visitDetails.provider} onChange={e => setVisitDetails({...visitDetails, provider: e.target.value})} />
        </div>
      </section>

      {/* 2. Mandatory Screening Block (Pinned) */}
      <section className="border-2 border-blue-100 rounded-lg overflow-hidden shadow-sm">
        <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertCircle className="w-5 h-5" />
            <h3 className="font-bold">Required Screenings – Must Be Completed</h3>
          </div>
          <div className="flex gap-2">
            <Badge variant={screenings.phq9.completed ? "default" : "outline"} className={screenings.phq9.completed ? "bg-green-600" : "border-blue-300 text-blue-700"}>PHQ-9</Badge>
            <Badge variant={screenings.gad7.completed ? "default" : "outline"} className={screenings.gad7.completed ? "bg-green-600" : "border-blue-300 text-blue-700"}>GAD-7</Badge>
            <Badge variant={screenings.assist.completed ? "default" : "outline"} className={screenings.assist.completed ? "bg-green-600" : "border-blue-300 text-blue-700"}>ASSIST</Badge>
          </div>
        </div>
        
        <div className="p-4 bg-white">
          <div className="flex border-b mb-4">
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeScreeningTab === 'phq9' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('phq9')}
            >
              PHQ-9 Depression
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeScreeningTab === 'gad7' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('gad7')}
            >
              GAD-7 Anxiety
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeScreeningTab === 'assist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('assist')}
            >
              ASSIST Substance Use
            </button>
          </div>

          <div className="min-h-[300px]">
            {activeScreeningTab === 'phq9' && (
              <PHQ9Form 
                initialData={screenings.phq9.data} 
                onChange={(data) => handleScreeningUpdate('phq9', data)} 
              />
            )}
            {activeScreeningTab === 'gad7' && (
              <GAD7Form 
                initialData={screenings.gad7.data} 
                onChange={(data) => handleScreeningUpdate('gad7', data)} 
              />
            )}
            {activeScreeningTab === 'assist' && (
              <AssistForm 
                initialData={screenings.assist.data} 
                onChange={(data: any) => handleScreeningUpdate('assist', data)} 
              />
            )}
          </div>
        </div>
      </section>

      {/* 3. Service Categories (Grouped and Collapsible) */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Service Delivery</h3>
        <div className="grid gap-4">
          {SERVICE_GROUPS.map(group => {
            const Icon = group.icon;
            const isExpanded = expandedGroups.includes(group.id);
            const selectedCount = group.services.filter(s => selectedServices.includes(s)).length;

            return (
              <Card key={group.id} className={`transition-all ${isExpanded ? 'ring-1 ring-offset-2 ring-gray-200' : 'hover:bg-gray-50'}`}>
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-gray-100 ${group.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{group.title}</h4>
                      {selectedCount > 0 && (
                        <span className="text-xs text-green-600 font-medium">{selectedCount} services selected</span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
                
                {isExpanded && (
                  <CardContent className="pt-0 pb-4 pl-16">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {group.services.map(service => (
                        <div 
                          key={service} 
                          className={`flex flex-col space-y-2 ${service === 'PrEP screening' && selectedServices.includes('PrEP screening') ? 'md:col-span-2' : ''}`}
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={service} 
                              checked={selectedServices.includes(service)}
                              onCheckedChange={() => toggleService(service)}
                            />
                            <Label htmlFor={service} className="cursor-pointer font-normal">{service}</Label>
                          </div>
                          
                          {/* Service Specific Forms */}
                          {service === 'PrEP screening' && selectedServices.includes('PrEP screening') && (
                             <div className="mt-2 pl-0 pr-0">
                               <PrepRastForm 
                                 initialData={screenings.prepRast.data}
                                 onChange={(data: any) => handleScreeningUpdate('prepRast', data)}
                               />
                             </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 4. Notes & Follow-up */}
      <section className="space-y-4 bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea 
            placeholder="Clinical observations, client demeanor, specific concerns..."
            value={visitDetails.notes}
            onChange={e => setVisitDetails({...visitDetails, notes: e.target.value})}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="followUp"
            checked={visitDetails.followUpRequired}
            onCheckedChange={(checked) => setVisitDetails({...visitDetails, followUpRequired: checked === true})}
          />
          <Label htmlFor="followUp">Follow-up Required</Label>
        </div>
        {visitDetails.followUpRequired && (
          <div className="space-y-2">
             <Label>Next Appointment Date</Label>
             <Input type="date" value={visitDetails.nextAppointment} onChange={e => setVisitDetails({...visitDetails, nextAppointment: e.target.value})} />
          </div>
        )}
      </section>

      {/* 5. Sticky Footer Progress & Actions */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t p-4 shadow-lg z-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className={isScreeningComplete ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
              {isScreeningComplete ? "✓ Screenings Complete" : "⚠ Screenings Incomplete"}
            </span>
            <span className="mx-2 text-gray-300">|</span>
            <span className="text-gray-600">{selectedServices.length} Services Selected</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button 
            variant="secondary" 
            onClick={() => {
                toast.success("Draft saved");
                onCancel();
            }}
          >
            Save Draft
          </Button>
          <Button onClick={() => setShowSummary(true)} disabled={!isScreeningComplete}>
            Review & Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
