import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Input } from '../ui/input';
import { 
  Download, 
  FileSpreadsheet, 
  Filter,
  FileText,
  Activity,
  Users,
  Syringe,
  Pill,
  Scale,
  HeartPulse,
  BrainCircuit,
  Target,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ExportPreviewDialog } from './ExportPreviewDialog';

// --- VISUALIZATION COMPONENTS ---

// HIV Cascade Chart
const CascadeChart = ({ data }: { data: any }) => {
  if (!data) return null;
  const maxVal = Math.max(...data.map((d: any) => d.value));
  
  return (
    <Card>
        <CardHeader>
            <CardTitle>HIV Continuum of Care (Cascade)</CardTitle>
            <CardDescription>Performance against 95-95-95 Targets</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-end justify-between h-64 gap-2 md:gap-8 px-4">
                {data.map((item: any, idx: number) => {
                const height = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                // Gradient colors for the cascade steps
                const colors = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-green-500", "bg-emerald-600"];
                const colorClass = colors[idx % colors.length];
                
                return (
                    <div key={item.label} className="flex flex-col items-center w-full group relative h-full justify-end">
                        <div className="mb-2 font-bold text-gray-900 text-lg">{item.value}</div>
                        <div 
                            className={`w-full max-w-[100px] rounded-t-md transition-all duration-700 ${colorClass} opacity-90 group-hover:opacity-100 relative`}
                            style={{ height: `${height}%` }}
                        >
                            {/* Target Marker (Mocking a 95% target line for visualization) */}
                            <div className="absolute top-0 w-full border-t-2 border-white/50 border-dashed"></div>
                        </div>
                        <div className="mt-3 text-xs text-center font-bold text-gray-600 uppercase tracking-tight h-8 flex items-center justify-center">
                            {item.label}
                        </div>
                        
                        {/* Drop-off Tooltip */}
                        {idx > 0 && (
                            <div className="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Conversion: {Math.round((item.value / data[idx-1].value) * 100)}%
                            </div>
                        )}
                    </div>
                );
                })}
            </div>
        </CardContent>
    </Card>
  );
};

// Target vs Actual Table Row
const IndicatorRow = ({ label, actual, target }: { label: string, actual: number, target: number }) => {
    const percentage = target > 0 ? Math.round((actual / target) * 100) : 0;
    let badgeColor = "bg-gray-100 text-gray-800";
    
    if (percentage >= 90) badgeColor = "bg-green-100 text-green-800 border-green-200";
    else if (percentage >= 70) badgeColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    else badgeColor = "bg-red-100 text-red-800 border-red-200";

    return (
        <tr className="hover:bg-gray-50 border-b last:border-0">
            <td className="px-4 py-3 text-sm font-medium text-gray-700">{label}</td>
            <td className="px-4 py-3 text-sm text-center font-bold">{actual}</td>
            <td className="px-4 py-3 text-sm text-center text-gray-500">{target}</td>
            <td className="px-4 py-3 text-sm text-center">
                <Badge variant="outline" className={`${badgeColor} w-16 justify-center`}>
                    {percentage}%
                </Badge>
            </td>
        </tr>
    );
};

interface ProgramReportsProps {
  currentUser: any;
  canAccessClinical: boolean;
  canAccessMentalHealth: boolean;
  canExport: boolean;
}

export function ProgramReports({ currentUser, canAccessClinical, canAccessMentalHealth, canExport }: ProgramReportsProps) {
  // UI State
  const [showFilters, setShowFilters] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');
  const [customTargetMode, setCustomTargetMode] = useState(false);
  
  // Filter State
  const [selectedProgram, setSelectedProgram] = useState('nsp');
  const [dateRange, setDateRange] = useState('month');
  const [location, setLocation] = useState('all');
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // MOCK DATA GENERATOR - REPLACING GENERIC DATA WITH MEWA SPECIFIC SERVICES
  // In production, this matches your Supabase aggregation response structure
  const generateMockData = (program: string) => {
    return {
      cascade: [
        { label: "Reached", value: 1450 },
        { label: "Tested HIV", value: 850 },
        { label: "HIV Positive", value: 68 },
        { label: "Linked to Care", value: 65 },
        { label: "Started ART", value: 62 },
        { label: "Viral Suppression", value: 58 }
      ],
      clinical: {
        hiv: { actual: 850, target: 1000 },
        prep_new: { actual: 45, target: 50 },
        prep_curr: { actual: 120, target: 120 },
        sti_screen: { actual: 320, target: 400 },
        sti_treat: { actual: 45, target: 45 },
        tb_screen: { actual: 850, target: 1000 },
        tb_treat: { actual: 5, target: 5 },
      },
      mental_health: {
        phq9_screen: { actual: 410, target: 500 },
        gad7_screen: { actual: 410, target: 500 },
        assist_screen: { actual: 600, target: 600 },
        depression_treat: { actual: 25, target: 30 },
        anxiety_treat: { actual: 18, target: 20 },
      },
      social_legal: {
        gbv_screen: { actual: 200, target: 300 },
        gbv_response: { actual: 12, target: 12 },
        paralegal: { actual: 45, target: 50 },
        id_cards: { actual: 15, target: 20 },
        family_integration: { actual: 8, target: 10 },
      },
      commodities: {
        needles: { actual: 25000, target: 28000 },
        condoms: { actual: 5000, target: 6000 },
      }
    };
  };
  
  useEffect(() => {
    setLoading(true);
    // Simulating API latency
    setTimeout(() => {
      setReportData(generateMockData(selectedProgram));
      setLoading(false);
    }, 600);
  }, [selectedProgram, dateRange, location]);

  const handleExport = (type: 'pdf' | 'excel') => {
      toast.success(`Exporting ${type.toUpperCase()} report with targets...`);
      // Trigger export logic here
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">M&E Impact Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Program Performance & Target Tracking</span>
            <Badge variant="secondary" className="text-xs">
                {selectedProgram === 'nsp' ? 'NSP Program' : 
                 selectedProgram === 'mat' ? 'MAT Program' : 'Stimulant Program'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
            {/* Target Toggle */}
            <div className="flex items-center gap-2 mr-4 bg-gray-100 p-1 rounded-lg">
                <Button 
                    variant={customTargetMode ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => setCustomTargetMode(!customTargetMode)}
                    className="text-xs h-7"
                >
                    <Target className="w-3 h-3 mr-1" />
                    {customTargetMode ? "Hide Targets" : "Compare Targets"}
                </Button>
            </div>

            <Button onClick={() => setShowPreview(true)} className="bg-indigo-600 text-white shadow-sm">
                Generate Report
            </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Filter Panel */}
        <Card className="border-0 shadow-sm">
            <div 
                className="px-6 py-4 flex items-center justify-between cursor-pointer border-b"
                onClick={() => setShowFilters(!showFilters)}
            >
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                    <Filter className="w-4 h-4" /> Filters & Configuration
                </div>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            
            {showFilters && (
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Program</span>
                        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nsp">NSP Program</SelectItem>
                                <SelectItem value="mat">MAT Program</SelectItem>
                                <SelectItem value="stimulant">Stimulant Users Program</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Location</span>
                        <Select value={location} onValueChange={setLocation}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Locations</SelectItem>
                                <SelectItem value="Mombasa">Mombasa</SelectItem>
                                <SelectItem value="Kilifi">Kilifi</SelectItem>
                                <SelectItem value="Lamu">Lamu</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Period</span>
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="quarter">This Quarter</SelectItem>
                                <SelectItem value="year">FY 2024/2025</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Custom Target Input (Mock) */}
                    {customTargetMode && (
                        <div className="space-y-1">
                             <span className="text-xs font-semibold text-gray-500 uppercase">Set Base Target (Monthly)</span>
                             <div className="flex gap-2">
                                <Input placeholder="1000" className="h-10" />
                                <Button size="icon" variant="outline"><Save className="w-4 h-4" /></Button>
                             </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>

        {/* MAIN REPORT AREA */}
        {reportData && !loading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border p-1 rounded-lg w-full justify-start h-auto flex-wrap">
              <TabsTrigger value="summary" className="gap-2"><Activity className="w-4 h-4" /> Summary & Cascade</TabsTrigger>
              <TabsTrigger value="clinical" className="gap-2"><HeartPulse className="w-4 h-4" /> Clinical Services</TabsTrigger>
              <TabsTrigger value="mental" className="gap-2"><BrainCircuit className="w-4 h-4" /> Mental Health</TabsTrigger>
              <TabsTrigger value="social" className="gap-2"><Scale className="w-4 h-4" /> Social & Legal</TabsTrigger>
            </TabsList>
            
            {/* TAB 1: SUMMARY & CASCADE */}
            <TabsContent value="summary" className="mt-6 space-y-6">
                {/* Cascade Chart */}
                <CascadeChart data={reportData.cascade} />
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Reach</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">1,450</div>
                            <p className="text-xs text-gray-500 mt-1">Clients accessed any service</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-purple-500">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Mental Health Screened</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">410</div>
                            <p className="text-xs text-gray-500 mt-1">PHQ-9 / GAD-7</p>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Viral Suppression</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">94%</div>
                            <p className="text-xs text-green-600 mt-1">Of those on ART</p>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            
            {/* TAB 2: CLINICAL SERVICES */}
            <TabsContent value="clinical" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Clinical Services Performance</CardTitle>
                  <CardDescription>HIV, STI, TB, and PrEP indicators vs Targets</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Indicator</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Actual</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Target</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <IndicatorRow label="HIV Testing Services (HTS)" actual={reportData.clinical.hiv.actual} target={reportData.clinical.hiv.target} />
                            <IndicatorRow label="New on PrEP" actual={reportData.clinical.prep_new.actual} target={reportData.clinical.prep_new.target} />
                            <IndicatorRow label="Current on PrEP" actual={reportData.clinical.prep_curr.actual} target={reportData.clinical.prep_curr.target} />
                            <IndicatorRow label="STI Screening" actual={reportData.clinical.sti_screen.actual} target={reportData.clinical.sti_screen.target} />
                            <IndicatorRow label="STI Treatment" actual={reportData.clinical.sti_treat.actual} target={reportData.clinical.sti_treat.target} />
                            <IndicatorRow label="TB Screening" actual={reportData.clinical.tb_screen.actual} target={reportData.clinical.tb_screen.target} />
                            <IndicatorRow label="TB Treatment Initiation" actual={reportData.clinical.tb_treat.actual} target={reportData.clinical.tb_treat.target} />
                            <IndicatorRow label="Linkage to Care (ART)" actual={65} target={68} />
                        </tbody>
                    </table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 3: MENTAL HEALTH */}
            <TabsContent value="mental" className="mt-6">
               <Card>
                <CardHeader>
                  <CardTitle>Mental Health & Psychosocial Support</CardTitle>
                  <CardDescription>Screenings (PHQ-9, GAD-7, ASSIST) and Treatment</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Indicator</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Actual</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Target</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <IndicatorRow label="Depression Screening (PHQ-9)" actual={reportData.mental_health.phq9_screen.actual} target={reportData.mental_health.phq9_screen.target} />
                            <IndicatorRow label="Anxiety Screening (GAD-7)" actual={reportData.mental_health.gad7_screen.actual} target={reportData.mental_health.gad7_screen.target} />
                            <IndicatorRow label="Substance Use Screening (ASSIST)" actual={reportData.mental_health.assist_screen.actual} target={reportData.mental_health.assist_screen.target} />
                            <IndicatorRow label="Depression Treatment Initiated" actual={reportData.mental_health.depression_treat.actual} target={reportData.mental_health.depression_treat.target} />
                            <IndicatorRow label="Anxiety Treatment Initiated" actual={reportData.mental_health.anxiety_treat.actual} target={reportData.mental_health.anxiety_treat.target} />
                        </tbody>
                    </table>
                </div>
              </Card>
            </TabsContent>

            {/* TAB 4: SOCIAL & LEGAL */}
            <TabsContent value="social" className="mt-6">
               <Card>
                <CardHeader>
                  <CardTitle>Social, Legal & Structural Interventions</CardTitle>
                  <CardDescription>GBV, Paralegal, and Reintegration Services</CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Indicator</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Actual</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Target</th>
                                <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-center w-32">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <IndicatorRow label="GBV Screening" actual={reportData.social_legal.gbv_screen.actual} target={reportData.social_legal.gbv_screen.target} />
                            <IndicatorRow label="GBV Response/Support" actual={reportData.social_legal.gbv_response.actual} target={reportData.social_legal.gbv_response.target} />
                            <IndicatorRow label="Paralegal Services Accessed" actual={reportData.social_legal.paralegal.actual} target={reportData.social_legal.paralegal.target} />
                            <IndicatorRow label="ID Card Registration Support" actual={reportData.social_legal.id_cards.actual} target={reportData.social_legal.id_cards.target} />
                            <IndicatorRow label="Family Integration Sessions" actual={reportData.social_legal.family_integration.actual} target={reportData.social_legal.family_integration.target} />
                        </tbody>
                    </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <ExportPreviewDialog 
        open={showPreview} 
        onOpenChange={setShowPreview}
        data={reportData}
        filters={{ program: selectedProgram, dateRange, location }}
        onExportPDF={() => handleExport('pdf')}
        onExportExcel={() => handleExport('excel')}
        currentUser={currentUser}
      />
    </div>
  );
}