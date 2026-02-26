import { useState, useEffect } from 'react';
// UI Components - Ensure these paths match your project structure
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
// Icons
import { 
  Target, 
  Download, 
  RefreshCw, 
  Save, 
  FileText,
  HeartPulse,
} from 'lucide-react';
// Toast
import { toast } from 'sonner'; 
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521`;
const apiHeaders = {
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

// --- HELPER COMPONENT: TARGET ROW ---
const TargetRow = ({ 
  label, 
  actual, 
  target, 
  onTargetChange
}: { 
  label: string, 
  actual: number, 
  target: number, 
  onTargetChange: (val: number) => void
}) => {
  // Protect against division by zero or undefined
  const safeActual = actual || 0;
  const safeTarget = target || 0;
  const percentage = safeTarget > 0 ? Math.round((safeActual / safeTarget) * 100) : 0;
  
  let statusColor = "bg-gray-100 text-gray-600 border-gray-200";
  
  if (safeTarget > 0) {
    if (percentage >= 90) statusColor = "bg-green-100 text-green-800 border-green-200"; 
    else if (percentage >= 50) statusColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    else statusColor = "bg-red-100 text-red-800 border-red-200";
  }

  return (
    <tr className="hover:bg-gray-50 border-b last:border-0 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-700">{label}</td>
      <td className="px-4 py-3 text-sm text-center font-bold text-indigo-700 bg-indigo-50/30 rounded-md">
        {safeActual.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center w-32 bg-gray-50">
        <Input 
          type="number" 
          value={safeTarget || ''} 
          onChange={(e) => onTargetChange(parseInt(e.target.value) || 0)}
          className="h-8 text-center text-sm border-gray-300 focus:border-indigo-500 bg-white"
          placeholder="Set Target"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
           <Badge variant="outline" className={`${statusColor} w-16 justify-center font-bold`}>
             {safeTarget > 0 ? `${percentage}%` : '-'}
           </Badge>
        </div>
      </td>
    </tr>
  );
};

interface CustomReportBuilderProps {
  currentUser: any;
}

export function CustomReportBuilder({ currentUser }: CustomReportBuilderProps) {
  const [period, setPeriod] = useState('quarter');
  const [program, setProgram] = useState('all'); 
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [actuals, setActuals] = useState<any>(null);
  const [hivMetrics, setHivMetrics] = useState<any>(null);

  useEffect(() => {
    fetchActuals();
    fetchHivMetrics();
  }, [period, program]);

  const fetchHivMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/hiv-metrics`, { headers: apiHeaders });
      const data = await res.json();
      if (data.success) setHivMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching HIV metrics for report builder:', err);
    }
  };

  const fetchActuals = async () => {
    setLoading(true);
    try {
      // MOCK DATA: This simulates the data coming from your services
      // In the next step, we can link this to real Supabase counts
      setTimeout(() => {
        setActuals({
          programmatic: {
            stimulant_users: 120,
            nsp_clients: 450,
            mat_clients: 380,
            needles_dist: 25000,
            mat_retention: 310
          },
          clinical: {
            hiv_tested: 850,
            hiv_positive: 68,
            linked_care: 65,
            started_art: 62,
            prep_new: 45,
            prep_curr: 120,
            sti_screen: 320,
            sti_treat: 45,
            tb_screen: 850,
            tb_treat: 5
          },
          mental: {
            phq9: 410,
            gad7: 380,
            assist: 650,
            treated_dep: 25,
            treated_anx: 18
          },
          social: {
            gbv_cases: 25,
            paralegal: 60,
            id_cards: 15,
            family_integration: 12,
            referrals: 85
          }
        });
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load actual data");
      setLoading(false);
    }
  };

  const handleTargetUpdate = (key: string, value: number) => {
    setTargets(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveTargets = () => {
    toast.success("Targets saved locally (Demo mode)");
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-gray-900">Custom Target Report</h2>
           <p className="text-gray-500 text-sm">
             Compare actual service delivery against manual targets.
           </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={fetchActuals} disabled={loading}>
             <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
             Refresh Data
           </Button>
           <Button onClick={handleSaveTargets}>
             <Save className="w-4 h-4 mr-2" />
             Save Targets
           </Button>
        </div>
      </div>

      {/* FILTERS */}
      <Card className="bg-gray-50/50 border-indigo-100">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
              <Label className="text-xs uppercase text-gray-500 mb-1 block">Reporting Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                 <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="month">Current Month</SelectItem>
                    <SelectItem value="quarter">Current Quarter</SelectItem>
                    <SelectItem value="year">Fiscal Year</SelectItem>
                 </SelectContent>
              </Select>
           </div>
           <div>
              <Label className="text-xs uppercase text-gray-500 mb-1 block">Program Focus</Label>
              <Select value={program} onValueChange={setProgram}>
                 <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                 <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    <SelectItem value="stimulant">Stimulant Program</SelectItem>
                    <SelectItem value="nsp">NSP Program</SelectItem>
                    <SelectItem value="mat">MAT Program</SelectItem>
                 </SelectContent>
              </Select>
           </div>
        </CardContent>
      </Card>

      {/* TABLES */}
      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading data...</div>
      ) : actuals ? (
        <Tabs defaultValue="program" className="w-full">
          <TabsList className="bg-white border w-full justify-start overflow-x-auto h-auto p-1">
             <TabsTrigger value="program" className="py-2">Program Targets</TabsTrigger>
             <TabsTrigger value="clinical" className="py-2">Clinical (HIV/TB)</TabsTrigger>
             <TabsTrigger value="hiv_art" className="py-2">
               <HeartPulse className="w-3.5 h-3.5 mr-1" />
               HIV/ART Cascade
             </TabsTrigger>
             <TabsTrigger value="mental" className="py-2">Mental Health</TabsTrigger>
             <TabsTrigger value="social" className="py-2">Social & Legal</TabsTrigger>
          </TabsList>

          {/* 1. PROGRAM SPECIFIC */}
          <TabsContent value="program" className="mt-4">
            <Card>
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-base">Key Program Indicators</CardTitle>
                 <CardDescription>Targets for Stimulant, NSP, and MAT enrollment</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                      <tr>
                         <th className="px-4 py-3 w-1/2">Indicator</th>
                         <th className="px-4 py-3 text-center">Actual</th>
                         <th className="px-4 py-3 text-center w-32">Target</th>
                         <th className="px-4 py-3 text-center">Achieved</th>
                      </tr>
                   </thead>
                   <tbody>
                      <TargetRow label="Stimulant Users Reached" actual={actuals.programmatic?.stimulant_users} target={targets['prog_stim']} onTargetChange={(v) => handleTargetUpdate('prog_stim', v)} />
                      <TargetRow label="NSP Clients Active" actual={actuals.programmatic?.nsp_clients} target={targets['prog_nsp']} onTargetChange={(v) => handleTargetUpdate('prog_nsp', v)} />
                      <TargetRow label="MAT Clients Enrolled" actual={actuals.programmatic?.mat_clients} target={targets['prog_mat']} onTargetChange={(v) => handleTargetUpdate('prog_mat', v)} />
                      <TargetRow label="Needles/Syringes Distributed" actual={actuals.programmatic?.needles_dist} target={targets['prog_needles']} onTargetChange={(v) => handleTargetUpdate('prog_needles', v)} />
                      <TargetRow label="MAT Retention (6 Months)" actual={actuals.programmatic?.mat_retention} target={targets['prog_retention']} onTargetChange={(v) => handleTargetUpdate('prog_retention', v)} />
                   </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* 2. CLINICAL SERVICES */}
          <TabsContent value="clinical" className="mt-4">
            <Card>
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-base">Clinical Services Cascade</CardTitle>
                 <CardDescription>HIV, PrEP, STI, and TB Services</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                      <tr>
                         <th className="px-4 py-3 w-1/2">Indicator</th>
                         <th className="px-4 py-3 text-center">Actual</th>
                         <th className="px-4 py-3 text-center w-32">Target</th>
                         <th className="px-4 py-3 text-center">Achieved</th>
                      </tr>
                   </thead>
                   <tbody>
                      <TargetRow label="HIV Testing Services (HTS)" actual={actuals.clinical?.hiv_tested} target={targets['hts_tested']} onTargetChange={(v) => handleTargetUpdate('hts_tested', v)} />
                      <TargetRow label="Identified HIV Positive" actual={actuals.clinical?.hiv_positive} target={targets['hts_pos']} onTargetChange={(v) => handleTargetUpdate('hts_pos', v)} />
                      <TargetRow label="Linked to ART Care" actual={actuals.clinical?.started_art} target={targets['art_start']} onTargetChange={(v) => handleTargetUpdate('art_start', v)} />
                      <TargetRow label="New PrEP Initiations" actual={actuals.clinical?.prep_new} target={targets['prep_new']} onTargetChange={(v) => handleTargetUpdate('prep_new', v)} />
                      <TargetRow label="STI Screening" actual={actuals.clinical?.sti_screen} target={targets['sti_screen']} onTargetChange={(v) => handleTargetUpdate('sti_screen', v)} />
                      <TargetRow label="TB Screening" actual={actuals.clinical?.tb_screen} target={targets['tb_screen']} onTargetChange={(v) => handleTargetUpdate('tb_screen', v)} />
                   </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* 3. HIV/ART CASCADE */}
          <TabsContent value="hiv_art" className="mt-4">
            <Card>
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-base flex items-center gap-2">
                   <HeartPulse className="w-4 h-4 text-red-500" />
                   HIV/ART Cascade Indicators
                 </CardTitle>
                 <CardDescription>PEPFAR MER-aligned HIV treatment cascade targets (live data from HIV module)</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                {hivMetrics ? (
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                        <tr>
                           <th className="px-4 py-3 w-1/2">Indicator</th>
                           <th className="px-4 py-3 text-center">Actual</th>
                           <th className="px-4 py-3 text-center w-32">Target</th>
                           <th className="px-4 py-3 text-center">Achieved</th>
                        </tr>
                     </thead>
                     <tbody>
                        <TargetRow label="PLHIV Identified (HIV+)" actual={hivMetrics.totalHivPositive} target={targets['hiv_plhiv']} onTargetChange={(v) => handleTargetUpdate('hiv_plhiv', v)} />
                        <TargetRow label="TX_NEW (ART Initiated)" actual={hivMetrics.totalInitiated} target={targets['hiv_tx_new']} onTargetChange={(v) => handleTargetUpdate('hiv_tx_new', v)} />
                        <TargetRow label="TX_CURR (Currently on ART)" actual={hivMetrics.activeOnArt} target={targets['hiv_tx_curr']} onTargetChange={(v) => handleTargetUpdate('hiv_tx_curr', v)} />
                        <TargetRow label="VL Tested (TX_PVLS Denominator)" actual={hivMetrics.totalTested} target={targets['hiv_vl_tested']} onTargetChange={(v) => handleTargetUpdate('hiv_vl_tested', v)} />
                        <TargetRow label="VL Suppressed (<1,000 c/mL)" actual={hivMetrics.suppressed} target={targets['hiv_vl_supp']} onTargetChange={(v) => handleTargetUpdate('hiv_vl_supp', v)} />
                        <TargetRow label="VL Unsuppressed" actual={hivMetrics.unsuppressed} target={targets['hiv_vl_unsupp']} onTargetChange={(v) => handleTargetUpdate('hiv_vl_unsupp', v)} />
                        <TargetRow label="Due for VL Testing" actual={hivMetrics.dueForVl} target={targets['hiv_vl_due']} onTargetChange={(v) => handleTargetUpdate('hiv_vl_due', v)} />
                        <TargetRow label="Lost to Follow-Up (LTFU)" actual={hivMetrics.lostToFollowUp} target={targets['hiv_ltfu']} onTargetChange={(v) => handleTargetUpdate('hiv_ltfu', v)} />
                        <TargetRow label="HIV Clinical Visits" actual={hivMetrics.totalVisits} target={targets['hiv_visits']} onTargetChange={(v) => handleTargetUpdate('hiv_visits', v)} />
                        <TargetRow label="Adherence Assessments" actual={hivMetrics.totalAdherenceRecords} target={targets['hiv_adherence']} onTargetChange={(v) => handleTargetUpdate('hiv_adherence', v)} />
                     </tbody>
                  </table>
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <HeartPulse className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm">Loading HIV metrics...</p>
                    <p className="text-xs mt-1">Data is fetched from the HIV Management module</p>
                  </div>
                )}
              </div>
              {hivMetrics && (
                <div className="px-4 py-3 border-t bg-gray-50/50">
                  <div className="flex items-center gap-6 text-xs text-gray-500">
                    <span>Suppression Rate: <strong className="text-indigo-700">{hivMetrics.suppressionRate}%</strong></span>
                    <span>Retention Rate: <strong className="text-indigo-700">{hivMetrics.retentionRate}%</strong></span>
                    <span>ART Coverage: <strong className="text-indigo-700">
                      {hivMetrics.totalHivPositive > 0 ? Math.round((hivMetrics.activeOnArt / hivMetrics.totalHivPositive) * 100) : 0}%
                    </strong></span>
                  </div>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* 4. MENTAL HEALTH */}
          <TabsContent value="mental" className="mt-4">
            <Card>
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-base">Mental Health & Psychosocial</CardTitle>
                 <CardDescription>Screenings (PHQ-9, GAD-7, ASSIST) & Treatment</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                      <tr>
                         <th className="px-4 py-3 w-1/2">Indicator</th>
                         <th className="px-4 py-3 text-center">Actual</th>
                         <th className="px-4 py-3 text-center w-32">Target</th>
                         <th className="px-4 py-3 text-center">Achieved</th>
                      </tr>
                   </thead>
                   <tbody>
                      <TargetRow label="Depression Screening (PHQ-9)" actual={actuals.mental?.phq9} target={targets['mh_phq9']} onTargetChange={(v) => handleTargetUpdate('mh_phq9', v)} />
                      <TargetRow label="Anxiety Screening (GAD-7)" actual={actuals.mental?.gad7} target={targets['mh_gad7']} onTargetChange={(v) => handleTargetUpdate('mh_gad7', v)} />
                      <TargetRow label="Substance Use Screening (ASSIST)" actual={actuals.mental?.assist} target={targets['mh_assist']} onTargetChange={(v) => handleTargetUpdate('mh_assist', v)} />
                      <TargetRow label="Depression Treatment Initiated" actual={actuals.mental?.treated_dep} target={targets['mh_tx_dep']} onTargetChange={(v) => handleTargetUpdate('mh_tx_dep', v)} />
                   </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* 5. SOCIAL & LEGAL */}
          <TabsContent value="social" className="mt-4">
             <Card>
              <CardHeader className="pb-2 border-b">
                 <CardTitle className="text-base">Social, Legal & Structural Interventions</CardTitle>
                 <CardDescription>GBV, Paralegal, and Reintegration Services</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold border-b">
                      <tr>
                         <th className="px-4 py-3 w-1/2">Indicator</th>
                         <th className="px-4 py-3 text-center">Actual</th>
                         <th className="px-4 py-3 text-center w-32">Target</th>
                         <th className="px-4 py-3 text-center">Achieved</th>
                      </tr>
                   </thead>
                   <tbody>
                      <TargetRow label="GBV Screening & Support" actual={actuals.social?.gbv_cases} target={targets['soc_gbv']} onTargetChange={(v) => handleTargetUpdate('soc_gbv', v)} />
                      <TargetRow label="Paralegal Cases Handled" actual={actuals.social?.paralegal} target={targets['soc_paralegal']} onTargetChange={(v) => handleTargetUpdate('soc_paralegal', v)} />
                      <TargetRow label="ID Card Registration Support" actual={actuals.social?.id_cards} target={targets['soc_id']} onTargetChange={(v) => handleTargetUpdate('soc_id', v)} />
                      <TargetRow label="Family Integration Sessions" actual={actuals.social?.family_integration} target={targets['soc_family']} onTargetChange={(v) => handleTargetUpdate('soc_family', v)} />
                      <TargetRow label="External Referrals Made" actual={actuals.social?.referrals} target={targets['soc_ref']} onTargetChange={(v) => handleTargetUpdate('soc_ref', v)} />
                   </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}