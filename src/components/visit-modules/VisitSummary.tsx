import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Activity, Brain, Heart, Syringe, Shield, Pill, Clock, User } from 'lucide-react';

interface VisitSummaryProps {
  visit: any;
  client: any;
  currentUser: any;
}

export function VisitSummary({ visit, client, currentUser }: VisitSummaryProps) {
  const [allServices, setAllServices] = useState<any>({
    clinical: [],
    mentalHealth: [],
    psychosocial: [],
    nsp: [],
    condom: [],
    mat: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllServices();
  }, [visit.id]);

  const loadAllServices = async () => {
    try {
      // Load all services for this visit
      const [clinicalRes, mentalHealthRes, psychosocialRes, nspRes, condomRes, matRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mental-health/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/psychosocial/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/nsp/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/condom/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mat/${visit.id}`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }).catch(() => ({ json: () => Promise.resolve({ success: false, records: [] }) })),
      ]);

      const [clinicalData, mentalHealthData, psychosocialData, nspData, condomData, matData] = await Promise.all([
        clinicalRes.json(),
        mentalHealthRes.json(),
        psychosocialRes.json(),
        nspRes.json(),
        condomRes.json(),
        matRes.json(),
      ]);

      setAllServices({
        clinical: clinicalData.records || [],
        mentalHealth: mentalHealthData.records || [],
        psychosocial: psychosocialData.records || [],
        nsp: nspData.records || [],
        condom: condomData.records || [],
        mat: matData.records || [],
      });
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Loading visit summary...</div>;
  }

  const hasAnything = 
    allServices.clinical.length > 0 ||
    allServices.mentalHealth.length > 0 ||
    allServices.psychosocial.length > 0 ||
    allServices.nsp.length > 0 ||
    allServices.condom.length > 0 ||
    allServices.mat.length > 0 ||
    visit.servicesProvided;

  return (
    <div className="space-y-6">
      {/* Visit Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visit Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Visit Type</p>
              <Badge variant="outline" className="mt-1">{visit.visitType}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="mt-1">{visit.location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="mt-1">{new Date(visit.visitDate).toLocaleDateString()}</p>
            </div>
          </div>
          
          {visit.reason && (
            <div>
              <p className="text-sm text-gray-600">Reason for Visit</p>
              <p className="mt-1">{visit.reason}</p>
            </div>
          )}
          
          {visit.notes && (
            <div>
              <p className="text-sm text-gray-600">Notes & Observations</p>
              <p className="mt-1 bg-gray-50 p-3 rounded-lg text-sm">{visit.notes}</p>
            </div>
          )}

          {visit.servicesProvided && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Services Provided</p>
              <div className="flex flex-wrap gap-2">
                {visit.servicesProvided.split(', ').map((service: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{service}</Badge>
                ))}
              </div>
            </div>
          )}

          {visit.followUpRequired && (
            <div>
              <p className="text-sm text-gray-600">Follow-up</p>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 mt-1">
                <Clock className="w-3 h-3 mr-1" />
                Follow-up Required
              </Badge>
              {visit.nextAppointment && (
                <p className="text-sm mt-1">Next appointment: {new Date(visit.nextAppointment).toLocaleDateString()}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services Summary by Module */}
      {!hasAnything && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No module-specific services recorded for this visit yet.</p>
            <p className="text-sm mt-2">Use the module tabs above to add clinical, mental health, or other services.</p>
          </CardContent>
        </Card>
      )}

      {/* Clinical Services */}
      {allServices.clinical.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Clinical Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.clinical.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {record.type === 'hiv-test' && '🧪 HIV Test'}
                      {record.type === 'vitals' && '❤️ Vital Signs'}
                      {record.type === 'sti-screen' && '🔬 STI Screening'}
                      {!['hiv-test', 'vitals', 'sti-screen'].includes(record.type) && record.type}
                    </p>
                    {record.result && (
                      <Badge className={
                        record.result === 'positive' ? 'bg-red-100 text-red-800' :
                        record.result === 'negative' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {record.result}
                      </Badge>
                    )}
                  </div>
                  
                  {/* HIV Test details */}
                  {record.type === 'hiv-test' && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">Test Type: {record.testType}</p>
                    </div>
                  )}
                  
                  {/* Vital Signs details */}
                  {record.type === 'vitals' && (
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      {record.bloodPressure && <p className="text-gray-600">BP: {record.bloodPressure}</p>}
                      {record.heartRate && <p className="text-gray-600">HR: {record.heartRate} bpm</p>}
                      {record.temperature && <p className="text-gray-600">Temp: {record.temperature}°C</p>}
                      {record.weight && <p className="text-gray-600">Weight: {record.weight} kg</p>}
                      {record.bmi && <p className="text-gray-600">BMI: {record.bmi}</p>}
                    </div>
                  )}
                  
                  {/* STI Screening details */}
                  {record.type === 'sti-screen' && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">Type: {record.stiType}</p>
                      {record.treatment && <p className="text-gray-600">Treatment: {record.treatment}</p>}
                    </div>
                  )}
                  
                  {record.notes && <p className="text-sm text-gray-600 mt-1">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.performedAt || record.takenAt || record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mental Health Services */}
      {allServices.mentalHealth.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" />
              Mental Health Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.mentalHealth.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                  <p className="font-medium">{record.type || 'Mental Health Assessment'}</p>
                  {record.phq9Score && (
                    <Badge variant="outline" className="mt-1">
                      PHQ-9: {record.phq9Score} - {record.phq9Severity}
                    </Badge>
                  )}
                  {record.gad7Score && (
                    <Badge variant="outline" className="mt-1 ml-2">
                      GAD-7: {record.gad7Score} - {record.gad7Severity}
                    </Badge>
                  )}
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Recorded by {record.provider} on {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Psychosocial Services */}
      {allServices.psychosocial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Psychosocial Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.psychosocial.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-pink-500 pl-4 py-2">
                  <p className="font-medium">{record.sessionType || 'Psychosocial Support'}</p>
                  {record.duration && <Badge variant="secondary" className="mt-1">{record.duration} min</Badge>}
                  
                  {/* Issues Addressed */}
                  {record.issuesAddressed && record.issuesAddressed.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">Issues:</p>
                      <div className="flex flex-wrap gap-1">
                        {record.issuesAddressed.slice(0, 3).map((issue: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{issue}</Badge>
                        ))}
                        {record.issuesAddressed.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{record.issuesAddressed.length - 3} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Support Services */}
                  {record.support && Object.values(record.support).some(v => v) && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Support provided: Housing, Legal, Economic, or Family</p>
                    </div>
                  )}
                  
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.providedAt || record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NSP Services */}
      {allServices.nsp.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Syringe className="w-5 h-5 text-green-500" />
              NSP Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.nsp.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-medium">💉 Syringe Exchange</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">Distributed</p>
                      <p className="text-lg font-medium">{record.syringesGiven || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Returned</p>
                      <p className="text-lg font-medium">{record.syringesReturned || 0}</p>
                    </div>
                    {record.naloxoneGiven && record.naloxoneKits > 0 && (
                      <div>
                        <Badge className="bg-orange-100 text-orange-800">
                          Naloxone: {record.naloxoneKits} kits
                        </Badge>
                      </div>
                    )}
                  </div>
                  {record.supplies && Object.values(record.supplies).some((v: any) => v > 0) && (
                    <p className="text-xs text-gray-600 mt-2">+ Harm reduction supplies provided</p>
                  )}
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.providedAt || record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condom Distribution */}
      {allServices.condom.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" />
              Condom Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.condom.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-teal-500 pl-4 py-2">
                  <p className="font-medium">🛡️ Safe Sex Supplies</p>
                  <div className="flex gap-4 mt-2 text-sm">
                    {(record.maleCondoms && record.maleCondoms > 0) && (
                      <div>
                        <p className="text-xs text-gray-600">Male Condoms</p>
                        <p className="text-lg font-medium">{record.maleCondoms}</p>
                      </div>
                    )}
                    {(record.femaleCondoms && record.femaleCondoms > 0) && (
                      <div>
                        <p className="text-xs text-gray-600">Female Condoms</p>
                        <p className="text-lg font-medium">{record.femaleCondoms}</p>
                      </div>
                    )}
                    {(record.lubricant && record.lubricant > 0) && (
                      <div>
                        <Badge variant="secondary">Lubricant: {record.lubricant}</Badge>
                      </div>
                    )}
                  </div>
                  {record.education && (record.education.safeSex || record.education.demonstration) && (
                    <p className="text-xs text-gray-600 mt-2">✓ Safe sex education provided</p>
                  )}
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.providedAt || record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAT Services */}
      {allServices.mat.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pill className="w-5 h-5 text-indigo-500" />
              MAT Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {allServices.mat.map((record: any, idx: number) => (
                <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
                  <div className="flex items-center gap-3">
                    <p className="font-medium">💊 {record.medication || 'MAT Dosing'}</p>
                    {record.dose && (
                      <Badge variant="secondary">{record.dose} mg</Badge>
                    )}
                    {record.witnessed && (
                      <Badge variant="outline" className="text-xs">Witnessed</Badge>
                    )}
                  </div>
                  
                  {record.assessment && record.assessment.cravingLevel !== null && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Craving Level: {record.assessment.cravingLevel}/10</p>
                    </div>
                  )}
                  
                  {record.takeHome?.allowed && (
                    <p className="text-xs text-gray-600 mt-1">
                      Take-home: {record.takeHome.days} days
                    </p>
                  )}
                  
                  {record.doseAdjustment?.made && (
                    <Badge className="bg-blue-100 text-blue-800 mt-2">Dose Adjusted</Badge>
                  )}
                  
                  {record.notes && <p className="text-sm text-gray-600 mt-2">{record.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(record.providedAt || record.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}