import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
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
  CheckCircle2, AlertCircle, Save, Activity, Brain, Syringe,
  Shield, Users, Home, User, Stethoscope, ClipboardList,
  ChevronRight, ChevronLeft, Check, FileText, Clock, Loader2,
  FlaskConical, Search, X
} from 'lucide-react';
import { PHQ9Form, GAD7Form } from './MentalHealthForms';
import { PrepRastForm } from './PrepRastForm';

// ── ASSIST Form ───────────────────────────────────────────────────────────────
const AssistForm = ({ onChange, initialData }: any) => {
  const [responses, setResponses] = useState<Record<string, any>>(initialData?.responses || {});
  const [score, setScore] = useState(0);

  const ASSIST_SUBSTANCES = [
    'Tobacco products', 'Alcoholic beverages', 'Cannabis', 'Cocaine',
    'Amphetamine-type stimulants', 'Inhalants', 'Sedatives',
    'Hallucinogens', 'Opioids', 'Other'
  ];

  useEffect(() => {
    const total = Object.values(responses).reduce(
      (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0
    );
    setScore(total);
    let severity = 'Low';
    if (total > 26) severity = 'High';
    else if (total > 3) severity = 'Moderate';
    onChange({ score: total, severity, classification: `${severity} Risk`, responses });
  }, [responses]);

  const riskColor = score > 26
    ? 'text-red-600 bg-red-50 border-red-200'
    : score > 3
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-emerald-600 bg-emerald-50 border-emerald-200';

  const riskLabel = score > 26 ? 'High Risk' : score > 3 ? 'Moderate Risk' : 'Low Risk';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Rate frequency of use in the past 3 months</p>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${riskColor}`}>
          <span>Score: {score}</span>
          <span>·</span>
          <span>{riskLabel}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ASSIST_SUBSTANCES.map(sub => (
          <div key={sub} className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors">
            <span className="text-sm text-gray-700 font-medium">{sub}</span>
            <select
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 cursor-pointer"
              value={responses[sub] || 0}
              onChange={e => setResponses({ ...responses, [sub]: parseInt(e.target.value) })}
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

// ── Client Search Select ──────────────────────────────────────────────────────
function ClientSearchSelect({
  clients,
  value,
  onChange,
}: {
  clients: any[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = clients.find(c => c.id === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      (c.clientId || '').toLowerCase().includes(q)
    );
  }, [clients, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between bg-white/20 border border-white/30 rounded-lg px-3 h-10 text-sm font-semibold text-white hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <span className={selected ? 'text-white' : 'text-white/60'}>
          {selected
            ? `${selected.firstName} ${selected.lastName} (${selected.clientId})`
            : 'Search and select a client…'}
        </span>
        <Search className="w-4 h-4 text-white/70 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type name or client ID…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 text-sm text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No clients found</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onChange(c.id); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${c.id === value ? 'bg-gray-50' : ''}`}
                >
                  <span className="font-medium text-gray-900">{c.firstName} {c.lastName}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{c.clientId}</span>
                    {c.id === value && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400">{filtered.length} of {clients.length} clients</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Service Categories ────────────────────────────────────────────────────────
const SERVICE_GROUPS = [
  {
    id: 'clinical', title: 'Clinical Services', icon: Stethoscope,
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    services: ['TB screening', 'STI syndromic screening', 'HIV testing', 'PrEP screening', 'MAT review']
  },
  {
    id: 'mental_health', title: 'Mental Health', icon: Brain,
    color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200',
    services: ['CBT intervention', 'Individual counseling', 'Group session', 'Crisis intervention']
  },
  {
    id: 'harm_reduction', title: 'Harm Reduction', icon: Syringe,
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    services: ['Needle and syringe provision', 'Condoms', 'Naloxone', 'Overdose education']
  },
  {
    id: 'protection', title: 'Protection & GBV', icon: Shield,
    color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
    services: ['Violence screening', 'GBV response', 'Legal referral', 'Safety planning']
  },
  {
    id: 'social', title: 'Social Support', icon: Home,
    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
    services: ['ID assistance', 'Housing support', 'Employment/vocational support', 'Education reintegration']
  },
  {
    id: 'family', title: 'Family Integration', icon: Users,
    color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200',
    services: ['Family contact status', 'Willingness for reintegration', 'Follow up plan']
  }
];

// ── Base steps (PrEP injected dynamically) ───────────────────────────────────
const BASE_STEPS = [
  { id: 'info',     label: 'Visit Info',  icon: User,          short: 'Info'      },
  { id: 'screen',   label: 'Screenings',  icon: ClipboardList, short: 'Screen'    },
  { id: 'services', label: 'Services',    icon: Activity,      short: 'Services'  },
  { id: 'followup', label: 'Follow-up',   icon: FileText,      short: 'Follow-up' },
];
const PREP_STEP = { id: 'prep', label: 'PrEP RAST', icon: FlaskConical, short: 'PrEP' };

interface RecordVisitFormProps {
  clients: any[];
  currentUser: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function RecordVisitForm({ clients, currentUser, onSuccess, onCancel }: RecordVisitFormProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const [visitDetails, setVisitDetails, clearVisitDetails] = useFormPersistence('visit_form_details', {
    clientId: '', visitDate: new Date().toISOString().split('T')[0],
    visitType: 'New Clinical Visit', location: '',
    offeredAt: 'Clinic (DICE)', provider: currentUser.name,
    reason: '', notes: '', followUpRequired: false, nextAppointment: ''
  });

  const [screenings, setScreenings, clearScreenings] = useFormPersistence('visit_form_screenings', {
    phq9:     { completed: false, data: null },
    gad7:     { completed: false, data: null },
    assist:   { completed: false, data: null },
    prepRast: { completed: false, data: null }
  });

  const [activeScreeningTab, setActiveScreeningTab] = useState('phq9');
  const [selectedServices, setSelectedServices, clearServices] = useFormPersistence<string[]>('visit_form_services', []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // PrEP is only required when the service is selected
  const isPrepServiceSelected = selectedServices.includes('PrEP screening');
  const isPrepComplete = !isPrepServiceSelected || screenings.prepRast.completed;

  // Dynamically insert PrEP step between Services and Follow-up when needed
  const STEPS = useMemo(() => {
    if (!isPrepServiceSelected) return BASE_STEPS;
    const s = [...BASE_STEPS];
    s.splice(3, 0, PREP_STEP); // insert before Follow-up
    return s;
  }, [isPrepServiceSelected]);

  const currentStepId = STEPS[currentStep]?.id ?? 'info';

  // Clamp step index if PrEP step is removed while user is on it
  useEffect(() => {
    if (currentStep >= STEPS.length) setCurrentStep(STEPS.length - 1);
  }, [STEPS.length]);

  // Auto-detect location
  useEffect(() => {
    if (visitDetails.clientId) {
      const client = clients.find(c => c.id === visitDetails.clientId);
      if (client?.location && ['Mombasa', 'Lamu', 'Kilifi'].includes(client.location)) {
        setVisitDetails(prev => ({ ...prev, location: client.location }));
      }
    }
  }, [visitDetails.clientId]);

  useEffect(() => {
    if (currentUser?.name && visitDetails.provider !== currentUser.name) {
      setVisitDetails(prev => ({ ...prev, provider: currentUser.name }));
    }
  }, [currentUser?.name]);

  const clearAllDrafts = () => { clearVisitDetails(); clearScreenings(); clearServices(); };

  const toggleService = (service: string) => {
    setSelectedServices(prev =>
      prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
    );
  };

  const handleScreeningUpdate = (type: 'phq9' | 'gad7' | 'assist' | 'prepRast', data: any) => {
    setScreenings(prev => ({ ...prev, [type]: { completed: true, data } }));
  };

  const isCoreScreeningComplete =
    screenings.phq9.completed && screenings.gad7.completed && screenings.assist.completed;

  const isAllComplete = isCoreScreeningComplete && isPrepComplete;

  const getStepValid = (stepId: string): boolean => {
    if (stepId === 'info')     return !!(visitDetails.clientId && visitDetails.location && visitDetails.visitDate);
    if (stepId === 'screen')   return isCoreScreeningComplete;
    if (stepId === 'services') return true;
    if (stepId === 'prep')     return screenings.prepRast.completed;
    if (stepId === 'followup') return true;
    return true;
  };

  const selectedClient = clients.find(c => c.id === visitDetails.clientId);

  const handleSubmit = async () => {
    if (!isCoreScreeningComplete) { toast.error('Please complete all mandatory screenings.'); return; }
    if (isPrepServiceSelected && !screenings.prepRast.completed) {
      toast.error('PrEP screening was selected — please complete the PrEP RAST assessment.'); return;
    }
    if (!visitDetails.clientId || !visitDetails.location) {
      toast.error('Client and location are required.'); return;
    }
    setIsSubmitting(true);
    try {
      const visitData = {
        clientId: visitDetails.clientId, visitDate: visitDetails.visitDate,
        visitType: visitDetails.visitType, location: visitDetails.location,
        offeredAt: visitDetails.offeredAt, reason: visitDetails.reason,
        notes: visitDetails.notes, servicesProvided: selectedServices.join(', '),
        followUpRequired: visitDetails.followUpRequired,
        nextAppointment: visitDetails.nextAppointment, provider: visitDetails.provider,
        metadata: { screenings: { phq9: screenings.phq9.data, gad7: screenings.gad7.data, assist: screenings.assist.data, prepRast: screenings.prepRast.data } }
      };
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` }, body: JSON.stringify({ visit: visitData, userId: currentUser.id }) }
      );
      const data = await res.json();
      if (data.success) {
        if (screenings.phq9.data)    await createClinicalResult(data.visit.id, 'PHQ-9', screenings.phq9.data);
        if (screenings.gad7.data)    await createClinicalResult(data.visit.id, 'GAD-7', screenings.gad7.data);
        if (screenings.assist.data)  await createClinicalResult(data.visit.id, 'ASSIST', screenings.assist.data);
        if (screenings.prepRast.data) await createClinicalResult(data.visit.id, 'PrEP RAST', { ...screenings.prepRast.data, score: screenings.prepRast.data.eligible ? 1 : 0 });
        toast.success('Visit recorded successfully!');
        clearAllDrafts();
        onSuccess();
      } else { toast.error(data.error || 'Failed to record visit'); }
    } catch (e) { console.error(e); toast.error('Network error occurred'); }
    finally { setIsSubmitting(false); }
  };

  const createClinicalResult = async (visitId: string, type: string, data: any) => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          result: {
            clientId: visitDetails.clientId, visitId, type, date: visitDetails.visitDate,
            notes: `Score: ${data.score ?? 'N/A'}, Severity: ${data.severity ?? 'N/A'}`,
            phq9Score:    type === 'PHQ-9'     ? data.score    : undefined,
            phq9Severity: type === 'PHQ-9'     ? data.severity : undefined,
            gad7Score:    type === 'GAD-7'     ? data.score    : undefined,
            gad7Severity: type === 'GAD-7'     ? data.severity : undefined,
            prepEligible: type === 'PrEP RAST' ? data.eligible : undefined,
            prepOutcome:  type === 'PrEP RAST' ? data.outcome  : undefined,
            prepSeverity: type === 'PrEP RAST' ? data.severity : undefined,
          },
          userId: currentUser.id
        }),
      });
    } catch (e) { console.error(`Failed to save ${type}`, e); }
  };

  const screeningTabs = [
    { key: 'phq9',   label: 'PHQ-9',  sublabel: 'Depression',    done: screenings.phq9.completed,   score: screenings.phq9.data?.score },
    { key: 'gad7',   label: 'GAD-7',  sublabel: 'Anxiety',       done: screenings.gad7.completed,   score: screenings.gad7.data?.score },
    { key: 'assist', label: 'ASSIST', sublabel: 'Substance Use', done: screenings.assist.completed, score: screenings.assist.data?.score },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100/60">

      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">

            {/* Left */}
            <div className="flex items-center gap-3">
              <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base font-semibold text-gray-900">New Visit Record</h1>
                {selectedClient && (
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedClient.firstName} {selectedClient.lastName} · {selectedClient.clientId}
                  </p>
                )}
              </div>
            </div>

            {/* Centre: step pills — desktop */}
            <div className="hidden md:flex items-center gap-1">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = currentStep === i;
                const isDone   = i < currentStep;
                return (
                  <button
                    key={`${step.id}-${i}`}
                    onClick={() => (isDone || isActive) ? setCurrentStep(i) : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? 'bg-gray-900 text-white shadow-sm'
                      : isDone  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                    }`}
                  >
                    {isDone
                      ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                      : <Icon className="w-3.5 h-3.5" />
                    }
                    <span>{step.short}</span>
                    {isActive && !getStepValid(step.id) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-xs text-gray-400">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isAllComplete || !visitDetails.clientId}
                className="bg-gray-900 hover:bg-gray-800 text-white text-sm h-9 px-4"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</>
                  : <><Save className="w-4 h-4 mr-1.5" />Save Visit</>
                }
              </Button>
            </div>
          </div>

          {/* Mobile step pills */}
          <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
            {STEPS.map((step, i) => {
              const isActive = currentStep === i;
              const isDone   = i < currentStep;
              return (
                <button
                  key={`${step.id}-m-${i}`}
                  onClick={() => (isDone || isActive) && setCurrentStep(i)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive ? 'bg-gray-900 text-white'
                    : isDone  ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone && <Check className="w-3 h-3" />}
                  {step.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ════ STEP: Visit Info ════════════════════════════════════════════ */}
        {currentStepId === 'info' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader
              icon={<User className="w-5 h-5 text-gray-700" />}
              title="Visit Information"
              subtitle="Core details about this encounter"
            />

            {/* Client selector */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-6 py-4">
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider mb-1">Client *</p>
                <ClientSearchSelect
                  clients={clients}
                  value={visitDetails.clientId}
                  onChange={val => setVisitDetails({ ...visitDetails, clientId: val })}
                />
              </div>
              {selectedClient && (
                <div className="px-6 py-3 bg-gray-50 flex flex-wrap gap-4 text-xs border-t border-gray-100">
                  <span className="text-gray-600"><span className="font-semibold text-gray-800">Program:</span> {selectedClient.program || '—'}</span>
                  <span className="text-gray-600"><span className="font-semibold text-gray-800">Location:</span> {selectedClient.location || '—'}</span>
                  <span className="text-gray-600"><span className="font-semibold text-gray-800">Gender:</span> {selectedClient.gender || '—'}</span>
                </div>
              )}
            </Card>

            {/* Fields grid */}
            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <FieldGroup label="Visit Date" required>
                  <Input type="date" value={visitDetails.visitDate}
                    onChange={e => setVisitDetails({ ...visitDetails, visitDate: e.target.value })}
                    className="rounded-xl" />
                </FieldGroup>

                <FieldGroup label="Visit Type" required>
                  <Select value={visitDetails.visitType} onValueChange={val => setVisitDetails({ ...visitDetails, visitType: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['New Clinical Visit','Clinical Review','Outreach Visit','Case Management','Psychosocial Session'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="County / Location" required
                  hint={visitDetails.location ? 'Auto-filled from client record' : 'Select client to auto-fill'}>
                  <Select value={visitDetails.location} onValueChange={val => setVisitDetails({ ...visitDetails, location: val })}>
                    <SelectTrigger className={`rounded-xl ${!visitDetails.location ? 'border-amber-300 bg-amber-50/50' : ''}`}>
                      <SelectValue placeholder="Select county…" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Mombasa','Lamu','Kilifi'].map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Service Setting" required>
                  <Select value={visitDetails.offeredAt} onValueChange={val => setVisitDetails({ ...visitDetails, offeredAt: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Clinic (DICE)','Mobile Outreach','Home Visit','Hotspot','Partner Facility'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Provider">
                  <Input value={visitDetails.provider} readOnly
                    className="rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed" />
                </FieldGroup>

                <FieldGroup label="Reason for Visit">
                  <Input placeholder="Brief reason or referral source…" value={visitDetails.reason}
                    onChange={e => setVisitDetails({ ...visitDetails, reason: e.target.value })}
                    className="rounded-xl" />
                </FieldGroup>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════ STEP: Screenings ═══════════════════════════════════════════ */}
        {currentStepId === 'screen' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader
              icon={<ClipboardList className="w-5 h-5 text-gray-700" />}
              title="Mandatory Screenings"
              subtitle="Complete all three assessments before proceeding"
              badge={
                isCoreScreeningComplete
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1"><Check className="w-3 h-3" />All Complete</Badge>
                  : <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1"><AlertCircle className="w-3 h-3" />Incomplete</Badge>
              }
            />

            <div className="grid grid-cols-3 gap-3">
              {screeningTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveScreeningTab(tab.key)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                    activeScreeningTab === tab.key
                      ? 'border-gray-800 bg-gray-50 shadow-sm'
                      : tab.done
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  {tab.done && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="font-semibold text-sm text-gray-900">{tab.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tab.sublabel}</p>
                  {tab.done && tab.score !== undefined
                    ? <p className="text-xs font-semibold text-emerald-600 mt-1.5">Score: {tab.score}</p>
                    : <p className="text-xs text-amber-600 mt-1.5 font-medium">Required</p>
                  }
                </button>
              ))}
            </div>

            <Card className="border-0 shadow-sm rounded-2xl">
              <div className="flex items-center gap-2 px-6 pt-5 pb-4 border-b border-gray-100">
                <div className={`w-2 h-2 rounded-full ${
                  screenings[activeScreeningTab as keyof typeof screenings]?.completed
                    ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                }`} />
                <span className="font-semibold text-gray-800 text-sm">
                  {screeningTabs.find(t => t.key === activeScreeningTab)?.label}
                  {' · '}
                  <span className="font-normal text-gray-500">
                    {screeningTabs.find(t => t.key === activeScreeningTab)?.sublabel}
                  </span>
                </span>
              </div>
              <CardContent className="p-6">
                {activeScreeningTab === 'phq9' && (
                  <PHQ9Form initialData={screenings.phq9.data} onChange={d => handleScreeningUpdate('phq9', d)} />
                )}
                {activeScreeningTab === 'gad7' && (
                  <GAD7Form initialData={screenings.gad7.data} onChange={d => handleScreeningUpdate('gad7', d)} />
                )}
                {activeScreeningTab === 'assist' && (
                  <AssistForm initialData={screenings.assist.data} onChange={(d: any) => handleScreeningUpdate('assist', d)} />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════ STEP: Services ════════════════════════════════════════════ */}
        {currentStepId === 'services' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader
              icon={<Activity className="w-5 h-5 text-gray-700" />}
              title="Service Delivery"
              subtitle="Select all services provided during this encounter"
              badge={
                selectedServices.length > 0
                  ? <Badge className="bg-gray-100 text-gray-700 border-gray-300">{selectedServices.length} selected</Badge>
                  : undefined
              }
            />

            {/* PrEP notice — appears when PrEP is checked */}
            {isPrepServiceSelected && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <FlaskConical className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <span className="font-semibold">PrEP RAST required</span> — a PrEP assessment step will appear after this.
                  {screenings.prepRast.completed && (
                    <span className="ml-2 text-emerald-700 font-medium">✓ Already completed</span>
                  )}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SERVICE_GROUPS.map(group => {
                const Icon = group.icon;
                const selectedCount = group.services.filter(s => selectedServices.includes(s)).length;
                return (
                  <Card key={group.id} className={`border-0 shadow-sm rounded-2xl overflow-hidden transition-all ${selectedCount > 0 ? 'ring-2 ring-gray-300' : ''}`}>
                    <div className={`flex items-center gap-3 px-4 py-3 ${group.bg} border-b ${group.border}`}>
                      <div className={`p-1.5 rounded-lg bg-white shadow-sm ${group.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`font-semibold text-sm ${group.color}`}>{group.title}</span>
                      {selectedCount > 0 && (
                        <Badge className={`ml-auto text-xs ${group.bg} ${group.color} border ${group.border}`}>
                          {selectedCount}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2.5">
                      {group.services.map(service => {
                        const isPrepRow = service === 'PrEP screening';
                        return (
                          <label
                            key={service}
                            htmlFor={`svc-${service}`}
                            className={`flex items-start gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                              selectedServices.includes(service) ? 'bg-gray-100' : 'hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              id={`svc-${service}`}
                              checked={selectedServices.includes(service)}
                              onCheckedChange={() => toggleService(service)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-700 leading-tight">{service}</span>
                              {isPrepRow && selectedServices.includes(service) && (
                                <span className={`block text-xs mt-0.5 font-medium ${screenings.prepRast.completed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                  {screenings.prepRast.completed ? '✓ RAST completed' : 'RAST assessment required — next step'}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ════ STEP: PrEP RAST (conditional) ════════════════════════════ */}
        {currentStepId === 'prep' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader
              icon={<FlaskConical className="w-5 h-5 text-gray-700" />}
              title="PrEP Rapid Assessment Screening Tool"
              subtitle="Required because PrEP screening was selected as a service"
              badge={
                screenings.prepRast.completed
                  ? <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                      <Check className="w-3 h-3" />{screenings.prepRast.data?.severity ?? 'Complete'}
                    </Badge>
                  : <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
                      <AlertCircle className="w-3 h-3" />Required
                    </Badge>
              }
            />
            <PrepRastForm
              initialData={screenings.prepRast.data}
              onChange={(d: any) => handleScreeningUpdate('prepRast', d)}
            />
          </div>
        )}

        {/* ════ STEP: Follow-up ══════════════════════════════════════════ */}
        {currentStepId === 'followup' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeader
              icon={<FileText className="w-5 h-5 text-gray-700" />}
              title="Outcomes & Follow-up"
              subtitle="Clinical notes and next steps for this client"
            />

            <Card className="border-0 shadow-sm rounded-2xl">
              <CardContent className="p-6 space-y-6">
                <FieldGroup label="Clinical Notes">
                  <Textarea
                    placeholder="Enter clinical observations, client demeanor, and specific concerns…"
                    className="min-h-[140px] rounded-xl resize-none"
                    value={visitDetails.notes}
                    onChange={e => setVisitDetails({ ...visitDetails, notes: e.target.value })}
                  />
                </FieldGroup>

                <div className={`rounded-2xl border-2 p-4 transition-all ${
                  visitDetails.followUpRequired ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <label htmlFor="followUp" className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      id="followUp"
                      checked={visitDetails.followUpRequired}
                      onCheckedChange={checked => setVisitDetails({ ...visitDetails, followUpRequired: checked === true })}
                    />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">Schedule follow-up appointment</p>
                      <p className="text-xs text-gray-500 mt-0.5">Check if a follow-up is needed</p>
                    </div>
                    {visitDetails.followUpRequired && (
                      <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 gap-1">
                        <Clock className="w-3 h-3" /> Required
                      </Badge>
                    )}
                  </label>
                  {visitDetails.followUpRequired && (
                    <div className="mt-4 pl-7">
                      <FieldGroup label="Next Appointment Date">
                        <Input
                          type="date"
                          value={visitDetails.nextAppointment}
                          onChange={e => setVisitDetails({ ...visitDetails, nextAppointment: e.target.value })}
                          className="rounded-xl max-w-xs bg-white border-amber-200 focus:border-amber-400"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FieldGroup>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Visit Summary */}
            <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Visit Summary</p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-5 border-b border-gray-100">
                  <SummaryItem label="Client" value={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : '—'} />
                  <SummaryItem label="Date"     value={visitDetails.visitDate} />
                  <SummaryItem label="Type"     value={visitDetails.visitType} />
                  <SummaryItem label="Location" value={visitDetails.location || '—'} />
                  <SummaryItem label="Setting"  value={visitDetails.offeredAt} />
                  <SummaryItem label="Services" value={selectedServices.length > 0 ? `${selectedServices.length} selected` : 'None'} />
                </div>

                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-3">Screening Results</p>
                <div className={`grid gap-4 ${isPrepServiceSelected ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                  <SummaryItem
                    label="PHQ-9"
                    value={screenings.phq9.data ? `Score ${screenings.phq9.data.score} · ${screenings.phq9.data.severity ?? '—'}` : '—'}
                    ok={screenings.phq9.completed}
                  />
                  <SummaryItem
                    label="GAD-7"
                    value={screenings.gad7.data ? `Score ${screenings.gad7.data.score} · ${screenings.gad7.data.severity ?? '—'}` : '—'}
                    ok={screenings.gad7.completed}
                  />
                  <SummaryItem
                    label="ASSIST"
                    value={screenings.assist.data ? `Score ${screenings.assist.data.score} · ${screenings.assist.data.severity ?? '—'}` : '—'}
                    ok={screenings.assist.completed}
                  />
                  {isPrepServiceSelected && (
                    <SummaryItem
                      label="PrEP RAST"
                      value={screenings.prepRast.data
                        ? `${screenings.prepRast.data.eligible ? 'Eligible' : 'Not Eligible'} · ${screenings.prepRast.data.severity ?? 'Assessed'}`
                        : 'Pending'}
                      ok={screenings.prepRast.completed}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => currentStep > 0 ? setCurrentStep(currentStep - 1) : onCancel()}
            className="rounded-xl gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-6 h-2 bg-gray-900'
                  : i < currentStep  ? 'w-2 h-2 bg-emerald-500'
                  : 'w-2 h-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {currentStep < STEPS.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!getStepValid(currentStepId)}
              className="rounded-xl gap-2 bg-gray-900 hover:bg-gray-800 text-white"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !isAllComplete || !visitDetails.clientId}
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : <><CheckCircle2 className="w-4 h-4" /> Complete Visit</>
              }
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function StepHeader({ icon, title, subtitle, badge }: {
  icon: React.ReactNode; title: string; subtitle: string; badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-200">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>
      {badge && <div className="shrink-0 mt-0.5">{badge}</div>}
    </div>
  );
}

function FieldGroup({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-gray-400 italic">{hint}</p>}
    </div>
  );
}

function SummaryItem({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-semibold ${
        ok === true  ? 'text-emerald-600'
        : ok === false ? 'text-amber-600'
        : 'text-gray-800'
      }`}>
        {value}
      </p>
    </div>
  );
}
