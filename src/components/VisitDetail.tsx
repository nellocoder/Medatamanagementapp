import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { ArrowLeft, Calendar, User, MapPin, FileText, Download, AlertTriangle, Activity, Heart, Brain, Syringe, Shield, ClipboardList } from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { ClinicalModule } from './visit-modules/ClinicalModule';
import { MentalHealthModule } from './visit-modules/MentalHealthModule';
import { PsychosocialModule } from './visit-modules/PsychosocialModule';
import { NSPModule } from './visit-modules/NSPModule';
import { CondomModule } from './visit-modules/CondomModule';
import { MATModule } from './visit-modules/MATModule';
import { VisitSummary } from './visit-modules/VisitSummary';

interface VisitDetailProps {
  visit: any;
  client: any;
  onBack: () => void;
  currentUser: any;
  onUpdate: () => void;
}

export function VisitDetail({ visit, client, onBack, currentUser, onUpdate }: VisitDetailProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [flags, setFlags] = useState<any[]>([]);

  // Debug logging
  console.log('VisitDetail - Current User:', currentUser);
  console.log('VisitDetail - User Role:', currentUser?.role);
  console.log('VisitDetail - User Permissions:', currentUser?.permissions);

  useEffect(() => {
    loadFlags();
  }, [visit.id]);

  const loadFlags = async () => {
    // Load risk flags for this visit
    if (client.flags && Array.isArray(client.flags)) {
      setFlags(client.flags);
    }
  };

  // PrEP RAST Summary Logic
  const prepRastData = visit.metadata?.screenings?.prepRast;
  const showPrepRastSummary = prepRastData && (prepRastData.eligible || prepRastData.severity === 'high');

  const getRiskDescription = (qid: string, answer: string) => {
      // Only show risk factors
      if (answer !== 'Yes' && answer !== 'Positive' && answer !== 'Unknown') return null;
      if (qid === 'q1' && answer === 'Positive') return 'Self-reported HIV Positive Status';
      if (qid === 'q2' && (answer === 'Positive' || answer === 'Unknown')) return 'Partner HIV Status (Positive/Unknown)';
      
      const descriptions: Record<string, string> = {
          'q3': 'Unprotected sex with partner of unknown/positive status',
          'q4': 'Engagement in transactional sex',
          'q5': 'Recent STI diagnosis/treatment',
          'q6': 'Sharing of needles/injection equipment',
          'q7': 'History of sexual violence or coercion',
          'q8': 'Recurrent use of PEP (2+ times)'
      };
      return descriptions[qid];
  };

  const riskFactors = showPrepRastSummary && prepRastData.answers ? 
      Object.entries(prepRastData.answers)
          .map(([k, v]) => ({ id: k, desc: getRiskDescription(k, v as string) }))
          .filter(item => item.desc) 
      : [];

  // Role-based module access
  const isAdmin = currentUser?.role === 'Admin';
  
  const canViewClinical = isAdmin || 
                          hasPermission(currentUser?.permissions || [], PERMISSIONS.CLINICAL_VIEW) || 
                          currentUser?.role === 'Clinician' || 
                          currentUser?.role === 'Nurse';
  
  const canEditClinical = isAdmin ||
                          hasPermission(currentUser?.permissions || [], PERMISSIONS.CLINICAL_EDIT) ||
                          currentUser?.role === 'Clinician';
  
  const canViewMentalHealth = isAdmin ||
                              hasPermission(currentUser?.permissions || [], PERMISSIONS.VISIT_VIEW) ||
                              currentUser?.role === 'Psychologist' ||
                              currentUser?.role === 'Counselor';
  
  const canEditMentalHealth = isAdmin ||
                              currentUser?.role === 'Psychologist' ||
                              currentUser?.role === 'Counselor';
  
  const canViewPsychosocial = isAdmin ||
                              currentUser?.role === 'Social Worker' ||
                              currentUser?.role === 'Paralegal' ||
                              currentUser?.role === 'Counselor' ||
                              currentUser?.role === 'Program Manager';
  
  const canViewNSP = isAdmin ||
                     currentUser?.role === 'Outreach Worker' ||
                     currentUser?.role === 'NSP Staff' ||
                     currentUser?.role === 'Clinician';
  
  const canViewCondom = isAdmin ||
                        currentUser?.role === 'Outreach Worker' ||
                        currentUser?.role === 'HTS Counselor' ||
                        currentUser?.role === 'Counselor';
  
  const canViewMAT = isAdmin ||
                     currentUser?.role === 'Clinician' ||
                     currentUser?.role === 'Nurse' ||
                     currentUser?.role === 'MAT Staff';
  
  const canEditMAT = isAdmin ||
                     currentUser?.role === 'Clinician' ||
                     currentUser?.role === 'MAT Staff';

  console.log('Permission Checks:', {
    isAdmin,
    canViewClinical,
    canViewMentalHealth,
    canViewPsychosocial,
    canViewNSP,
    canViewCondom,
    canViewMAT
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Visits
          </Button>
          <div>
            <h1 className="text-3xl mb-1">Visit Details</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(visit.visitDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {client.firstName} {client.lastName}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {visit.location}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Risk Flags */}
      {flags.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Active Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, idx) => (
                <Badge 
                  key={idx}
                  className={
                    flag.severity === 'high'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : flag.severity === 'medium'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }
                >
                  {(flag.type?.replace(/-/g, ' ') || 'Unknown Risk').toUpperCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PrEP Risk Factor Summary */}
      {showPrepRastSummary && riskFactors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Activity className="w-5 h-5" />
              PrEP Risk Assessment Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-amber-900 font-medium">
                Client screened eligible for PrEP based on the following reported risk factors:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {riskFactors.map((factor, idx) => (
                   <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 bg-white/50 p-2 rounded border border-amber-100">
                     <span className="mt-0.5 min-w-[6px] min-h-[6px] rounded-full bg-amber-500" />
                     {factor.desc}
                   </li>
                ))}
              </ul>
              <div className="mt-4 pt-3 border-t border-amber-200 flex items-center justify-between">
                 <span className="text-xs text-amber-700 font-medium uppercase tracking-wider">Assessment Outcome</span>
                 <Badge className="bg-amber-600 hover:bg-amber-700 text-white border-transparent">
                    Refer for PrEP Services
                 </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visit Overview Card */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600">Visit Type</p>
              <Badge variant="outline" className="mt-1">{visit.visitType}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Client ID</p>
              <p className="mt-1">{client.clientId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Programs</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {client.programs?.map((program: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {program}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="mt-1">{client.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Tabs */}
      <Card className="rounded-2xl shadow-sm border-0 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="summary">
                <FileText className="w-4 h-4 mr-2" />
                Summary
              </TabsTrigger>
              {canViewClinical && (
                <TabsTrigger value="clinical">
                  <Activity className="w-4 h-4 mr-2" />
                  Clinical
                </TabsTrigger>
              )}
              {canViewMentalHealth && (
                <TabsTrigger value="mental-health">
                  <Brain className="w-4 h-4 mr-2" />
                  Mental Health
                </TabsTrigger>
              )}
              {canViewPsychosocial && (
                <TabsTrigger value="psychosocial">
                  <Heart className="w-4 h-4 mr-2" />
                  Psychosocial
                </TabsTrigger>
              )}
              {canViewNSP && (
                <TabsTrigger value="nsp">
                  <Syringe className="w-4 h-4 mr-2" />
                  NSP
                </TabsTrigger>
              )}
              {canViewCondom && (
                <TabsTrigger value="condom">
                  <Shield className="w-4 h-4 mr-2" />
                  Condom
                </TabsTrigger>
              )}
              {canViewMAT && (
                <TabsTrigger value="mat">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  MAT
                </TabsTrigger>
              )}
            </TabsList>
          </CardHeader>

          <CardContent>
            <TabsContent value="summary">
              <VisitSummary 
                visit={visit} 
                client={client} 
                currentUser={currentUser}
              />
            </TabsContent>

            {canViewClinical && (
              <TabsContent value="clinical">
                <ClinicalModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  canEdit={canEditClinical}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}

            {canViewMentalHealth && (
              <TabsContent value="mental-health">
                <MentalHealthModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  canEdit={canEditMentalHealth}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}

            {canViewPsychosocial && (
              <TabsContent value="psychosocial">
                <PsychosocialModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}

            {canViewNSP && (
              <TabsContent value="nsp">
                <NSPModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}

            {canViewCondom && (
              <TabsContent value="condom">
                <CondomModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}

            {canViewMAT && (
              <TabsContent value="mat">
                <MATModule
                  visit={visit}
                  client={client}
                  currentUser={currentUser}
                  canEdit={canEditMAT}
                  onUpdate={onUpdate}
                />
              </TabsContent>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}