import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card'; // Reduced imports
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useFormPersistence } from '../hooks/use-form-persistence';
import { 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Activity,
  Brain,
  Syringe,
  Shield,
  Users,
  Home,
  User,
  Calendar,
  MapPin,
  Stethoscope,
  ClipboardList
} from 'lucide-react';
import { PHQ9Form, GAD7Form } from './MentalHealthForms';
import { PrepRastForm } from './PrepRastForm';
import { StandardForm, FormSection, FormRow } from './ui/standard-form-layout';

// Local AssistForm definition (Unchanged)
const AssistForm = ({ onChange, initialData }: any) => {
  const [responses, setResponses] = useState<Record<string, any>>(initialData?.responses || {});
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

// Service Categories Definition (Unchanged)
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
  const [visitDetails, setVisitDetails, clearVisitDetails] = useFormPersistence('visit_form_details', {
    clientId: '',
    visitDate: new Date().toISOString().split('T')[0],
    visitType: 'New Clinical Visit',
    location: 'Clinic',
    provider: currentUser.name,
    reason: '',
    notes: '',
    followUpRequired: false,
    nextAppointment: ''
  });

  // 2. Screening State
  const [screenings, setScreenings, clearScreenings] = useFormPersistence('visit_form_screenings', {
    phq9: { completed: false, data: null },
    gad7: { completed: false, data: null },
    assist: { completed: false, data: null },
    prepRast: { completed: false, data: null }
  });
  const [activeScreeningTab, setActiveScreeningTab] = useState('phq9');

  // 3. Services State
  const [selectedServices, setSelectedServices, clearServices] = useFormPersistence<string[]>('visit_form_services', []);
  
  // 4. UI State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure provider is always current user
  useEffect(() => {
    if (currentUser?.name && visitDetails.provider !== currentUser.name) {
      setVisitDetails(prev => ({ ...prev, provider: currentUser.name }));
    }
  }, [currentUser?.name]);

  const clearAllDrafts = () => {
    clearVisitDetails();
    clearScreenings();
    clearServices();
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

    if (!visitDetails.clientId) {
      toast.error("Please select a client.");
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
        // 2. Create Clinical Results
        if (screenings.phq9.data) await createClinicalResult(data.visit.id, 'PHQ-9', screenings.phq9.data);
        if (screenings.gad7.data) await createClinicalResult(data.visit.id, 'GAD-7', screenings.gad7.data);
        if (screenings.assist.data) await createClinicalResult(data.visit.id, 'ASSIST', screenings.assist.data);
        if (screenings.prepRast.data) {
           await createClinicalResult(data.visit.id, 'PrEP RAST', {
             ...screenings.prepRast.data,
             score: screenings.prepRast.data.eligible ? 1 : 0,
             severity: screenings.prepRast.data.severity
           });
        }

        toast.success('Visit recorded successfully!');
        clearAllDrafts();
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

  // ACTIONS FOR FOOTER
  const formActions = (
    <>
      <div className="flex-1 text-sm text-gray-500 hidden md:block">
         <span className={isScreeningComplete ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
           {isScreeningComplete ? "✓ Screenings Complete" : "⚠ Screenings Incomplete"}
         </span>
         <span className="mx-2">|</span>
         <span>{selectedServices.length} Services Selected</span>
      </div>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting || !isScreeningComplete}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        {isSubmitting ? 'Saving...' : 'Complete Visit'}
      </Button>
    </>
  );

  return (
    <StandardForm 
      title="New Visit Record" 
      description="Record details for a client encounter, including mandatory screenings and service delivery."
      actions={formActions}
      className="max-w-none"
    >
      {/* 1. Visit Identification */}
      <FormSection 
        title="Visit Identification" 
        description="Core details about the client and encounter" 
        icon={<User className="w-5 h-5" />}
        required
        defaultOpen={true}
      >
        <FormRow columns={3}>
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
                  <SelectItem value="New Clinical Visit">New Clinical Visit</SelectItem>
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
              <Input 
                value={visitDetails.provider} 
                readOnly 
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
           </div>
        </FormRow>
      </FormSection>

      {/* 2. Mandatory Screenings */}
      <FormSection 
        title="Mandatory Screenings" 
        description="Required assessments for this visit type" 
        icon={<ClipboardList className="w-5 h-5" />}
        required
        status={isScreeningComplete ? 'complete' : 'incomplete'}
        className="border-l-4 border-l-blue-500"
      >
        <div className="flex border-b mb-6 overflow-x-auto">
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeScreeningTab === 'phq9' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('phq9')}
            >
              PHQ-9 Depression {screenings.phq9.completed && '✓'}
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeScreeningTab === 'gad7' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('gad7')}
            >
              GAD-7 Anxiety {screenings.gad7.completed && '✓'}
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${activeScreeningTab === 'assist' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveScreeningTab('assist')}
            >
              ASSIST Substance Use {screenings.assist.completed && '✓'}
            </button>
        </div>

        <div className="min-h-[300px] bg-gray-50/50 p-4 rounded-lg border">
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
      </FormSection>

      {/* 3. Service Delivery */}
      <FormSection 
        title="Service Delivery" 
        description="Select all services provided during this encounter" 
        icon={<Activity className="w-5 h-5" />}
      >
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {SERVICE_GROUPS.map(group => {
              const Icon = group.icon;
              const selectedCount = group.services.filter(s => selectedServices.includes(s)).length;
              return (
                <Card key={group.id} className="border hover:border-indigo-300 transition-colors">
                   <div className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                         <div className={`p-2 rounded-full bg-gray-100 ${group.color}`}>
                            <Icon className="w-4 h-4" />
                         </div>
                         <h4 className="font-semibold text-sm">{group.title}</h4>
                      </div>
                      <div className="space-y-2">
                         {group.services.map(service => (
                           <div key={service} className="flex flex-col">
                             <div className="flex items-start space-x-2">
                               <Checkbox 
                                  id={service} 
                                  checked={selectedServices.includes(service)}
                                  onCheckedChange={() => toggleService(service)}
                                  className="mt-0.5"
                               />
                               <Label htmlFor={service} className="cursor-pointer text-sm font-normal text-gray-700 leading-tight">{service}</Label>
                             </div>
                             
                             {/* Embedded Forms */}
                             {service === 'PrEP screening' && selectedServices.includes('PrEP screening') && (
                                <div className="mt-2 pl-6 pr-2 py-2 bg-indigo-50 rounded border border-indigo-100">
                                   <Label className="text-xs font-semibold text-indigo-700 mb-2 block">PrEP RAST Assessment</Label>
                                   <PrepRastForm 
                                     initialData={screenings.prepRast.data}
                                     onChange={(data: any) => handleScreeningUpdate('prepRast', data)}
                                   />
                                </div>
                             )}
                           </div>
                         ))}
                      </div>
                   </div>
                </Card>
              );
           })}
         </div>
      </FormSection>

      {/* 4. Outcomes & Follow-up */}
      <FormSection 
         title="Outcomes & Follow-up" 
         description="Clinical notes and next steps" 
         icon={<Save className="w-5 h-5" />}
      >
         <FormRow columns={1}>
            <div className="space-y-2">
              <Label>Clinical Notes</Label>
              <Textarea 
                placeholder="Enter clinical observations, client demeanor, and specific concerns..."
                className="min-h-[120px]"
                value={visitDetails.notes}
                onChange={e => setVisitDetails({...visitDetails, notes: e.target.value})}
              />
            </div>
            
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 space-y-4">
               <div className="flex items-center space-x-2">
                 <Checkbox 
                   id="followUp"
                   checked={visitDetails.followUpRequired}
                   onCheckedChange={(checked) => setVisitDetails({...visitDetails, followUpRequired: checked === true})}
                 />
                 <Label htmlFor="followUp" className="font-semibold text-amber-900">Follow-up appointment required</Label>
               </div>
               
               {visitDetails.followUpRequired && (
                 <div className="pl-6 max-w-xs">
                    <Label className="text-xs uppercase text-amber-700 font-bold mb-1 block">Next Appointment Date</Label>
                    <Input 
                      type="date" 
                      value={visitDetails.nextAppointment} 
                      onChange={e => setVisitDetails({...visitDetails, nextAppointment: e.target.value})} 
                      className="bg-white border-amber-200 focus:border-amber-400"
                    />
                 </div>
               )}
            </div>
         </FormRow>
      </FormSection>
    </StandardForm>
  );
}
