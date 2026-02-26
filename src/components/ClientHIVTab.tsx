import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  HeartPulse,
  Pill,
  TestTube,
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Stethoscope,
  Shield,
  XCircle,
} from 'lucide-react';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521`;
const headers = {
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

interface ClientHIVTabProps {
  clientId: string;
  currentUser: any;
}

export function ClientHIVTab({ clientId, currentUser }: ClientHIVTabProps) {
  const [hivProfile, setHivProfile] = useState<any>(null);
  const [artRecords, setArtRecords] = useState<any[]>([]);
  const [vlRecords, setVlRecords] = useState<any[]>([]);
  const [adherenceRecords, setAdherenceRecords] = useState<any[]>([]);
  const [clinicalVisits, setClinicalVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHIVData();
  }, [clientId]);

  const loadHIVData = async () => {
    setLoading(true);
    try {
      const [profileRes, artRes, vlRes, adherenceRes, visitsRes] = await Promise.all([
        fetch(`${API_BASE}/hiv-profiles?clientId=${clientId}`, { headers }),
        fetch(`${API_BASE}/art-records?clientId=${clientId}`, { headers }),
        fetch(`${API_BASE}/viral-load?clientId=${clientId}`, { headers }),
        fetch(`${API_BASE}/adherence-tracking?clientId=${clientId}`, { headers }),
        fetch(`${API_BASE}/hiv-clinical-visits?clientId=${clientId}`, { headers }),
      ]);

      const [pData, aData, vData, adData, cvData] = await Promise.all([
        profileRes.json(), artRes.json(), vlRes.json(), adherenceRes.json(), visitsRes.json(),
      ]);

      if (pData.success && pData.profiles?.length > 0) setHivProfile(pData.profiles[0]);
      if (aData.success) setArtRecords(aData.records || []);
      if (vData.success) setVlRecords(vData.records || []);
      if (adData.success) setAdherenceRecords(adData.records || []);
      if (cvData.success) setClinicalVisits(cvData.records || []);
    } catch (err) {
      console.error('Error loading HIV data for client:', err);
      toast.error('Failed to load HIV information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-gray-400 text-sm">Loading HIV information...</div>
      </div>
    );
  }

  if (!hivProfile) {
    return (
      <div className="text-center py-16">
        <HeartPulse className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No HIV Profile</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          This client does not have an HIV profile yet. HIV profiles can be created from the HIV Management module.
        </p>
      </div>
    );
  }

  const latestArt = artRecords.find(a => a.currentStatus === 'Active') || artRecords[0];
  const latestVl = vlRecords[0];
  const latestAdherence = adherenceRecords[0];

  // Alert conditions
  const isUnsuppressed = latestVl?.suppressionStatus === 'Unsuppressed';
  const isVlOverdue = latestVl?.nextDueDate && new Date(latestVl.nextDueDate) < new Date();
  const isLowAdherence = latestAdherence?.adherenceScore !== undefined && latestAdherence.adherenceScore < 85;

  // Time on ART
  const timeOnArt = latestArt?.initiationDate
    ? (() => {
        const start = new Date(latestArt.initiationDate);
        const now = new Date();
        const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
        return months >= 12 ? `${Math.floor(months / 12)}y ${months % 12}m` : `${months}m`;
      })()
    : '-';

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {(isUnsuppressed || isVlOverdue || isLowAdherence) && (
        <div className="space-y-2">
          {isUnsuppressed && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700">
                <strong>Unsuppressed Viral Load:</strong> Latest VL is {latestVl?.viralLoadValue?.toLocaleString()} copies/mL (above 1,000 threshold). Enhanced adherence counseling recommended.
              </AlertDescription>
            </Alert>
          )}
          {isVlOverdue && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                <strong>Viral Load Overdue:</strong> Next VL was due on {new Date(latestVl.nextDueDate).toLocaleDateString()}. Please schedule viral load testing.
              </AlertDescription>
            </Alert>
          )}
          {isLowAdherence && (
            <Alert className="border-orange-200 bg-orange-50">
              <TrendingDown className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-700">
                <strong>Low Adherence:</strong> Latest adherence score is {latestAdherence.adherenceScore}% (below 85% threshold). Adherence support intervention needed.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* HIV Profile Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="w-5 h-5 text-red-500" />
              HIV Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">HIV Status</Label>
                <p className="text-sm font-medium">
                  <Badge className="bg-red-100 text-red-700 border-red-200">HIV Positive</Badge>
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">WHO Stage</Label>
                <p className="text-sm font-medium">{hivProfile.whoStage || '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Date of Diagnosis</Label>
                <p className="text-sm">{hivProfile.dateOfDiagnosis ? new Date(hivProfile.dateOfDiagnosis).toLocaleDateString() : '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Enrollment Date</Label>
                <p className="text-sm">{hivProfile.enrollmentDate ? new Date(hivProfile.enrollmentDate).toLocaleDateString() : '-'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-500">Testing Modality</Label>
                <p className="text-sm">{hivProfile.testingModality || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Entry Point</Label>
                <p className="text-sm">{hivProfile.entryPoint || '-'}</p>
              </div>
            </div>
            {hivProfile.tbScreening && (
              <div>
                <Label className="text-xs text-gray-500">TB Screening Status</Label>
                <p className="text-sm">{hivProfile.tbScreening}</p>
              </div>
            )}
            {hivProfile.notes && (
              <div>
                <Label className="text-xs text-gray-500">Notes</Label>
                <p className="text-sm text-gray-600">{hivProfile.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Status Cards */}
        <div className="space-y-4">
          {/* ART Status */}
          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Current ART</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{latestArt?.regimen || 'Not on ART'}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {latestArt && (
                      <>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Started: {latestArt.initiationDate ? new Date(latestArt.initiationDate).toLocaleDateString() : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Time on ART: {timeOnArt}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  {latestArt?.currentStatus === 'Active' ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>
                  ) : latestArt ? (
                    <Badge className="bg-gray-100 text-gray-600 border-gray-200">{latestArt.currentStatus}</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500">No ART</Badge>
                  )}
                </div>
              </div>
              {latestArt && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Line:</span>
                  <Badge variant="outline" className="text-xs">{latestArt.artLine || '-'}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Viral Load Status */}
          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Latest Viral Load</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {latestVl ? `${latestVl.viralLoadValue?.toLocaleString()} copies/mL` : 'No VL recorded'}
                  </p>
                  {latestVl && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tested: {new Date(latestVl.sampleDate).toLocaleDateString()}
                      {latestVl.nextDueDate && ` | Next due: ${new Date(latestVl.nextDueDate).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
                <div>
                  {latestVl?.suppressionStatus === 'Suppressed' ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Suppressed
                    </Badge>
                  ) : latestVl ? (
                    <Badge className="bg-red-100 text-red-700 border-red-200 gap-1">
                      <XCircle className="w-3 h-3" /> Unsuppressed
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adherence */}
          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 font-semibold">Adherence</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {latestAdherence?.adherenceScore !== undefined ? `${latestAdherence.adherenceScore}%` : 'Not assessed'}
                  </p>
                </div>
                {latestAdherence && (
                  <Badge variant="outline" className={
                    latestAdherence.adherenceScore >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
                    latestAdherence.adherenceScore >= 85 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }>
                    {latestAdherence.adherenceScore >= 95 ? 'Good' : latestAdherence.adherenceScore >= 85 ? 'Fair' : 'Poor'}
                  </Badge>
                )}
              </div>
              {latestAdherence?.adherenceScore !== undefined && (
                <Progress value={latestAdherence.adherenceScore} className="h-2" />
              )}
              {latestAdherence && (
                <p className="text-xs text-gray-500 mt-2">
                  Method: {latestAdherence.method || '-'} | Date: {latestAdherence.assessmentDate ? new Date(latestAdherence.assessmentDate).toLocaleDateString() : '-'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Viral Load History */}
      {vlRecords.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TestTube className="w-5 h-5 text-purple-500" />
              Viral Load History
            </CardTitle>
            <CardDescription>{vlRecords.length} result(s) recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample Date</TableHead>
                  <TableHead>VL Value (copies/mL)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vlRecords.map((vl) => (
                  <TableRow key={vl.id}>
                    <TableCell>{new Date(vl.sampleDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono font-medium">{vl.viralLoadValue?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        vl.suppressionStatus === 'Suppressed'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }>
                        {vl.suppressionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {vl.nextDueDate ? new Date(vl.nextDueDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ART History */}
      {artRecords.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="w-5 h-5 text-blue-500" />
              ART History
            </CardTitle>
            <CardDescription>{artRecords.length} record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initiation Date</TableHead>
                  <TableHead>Regimen</TableHead>
                  <TableHead>Line</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adherence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {artRecords.map((art) => (
                  <TableRow key={art.id}>
                    <TableCell>{art.initiationDate ? new Date(art.initiationDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="font-medium">{art.regimen}</TableCell>
                    <TableCell><Badge variant="outline">{art.artLine || '-'}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        art.currentStatus === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600'
                      }>
                        {art.currentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {art.adherencePercent !== undefined ? `${art.adherencePercent}%` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clinical Visits */}
      {clinicalVisits.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="w-5 h-5 text-teal-500" />
              HIV Clinical Visits
            </CardTitle>
            <CardDescription>{clinicalVisits.length} visit(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clinicalVisits.slice(0, 10).map((visit) => (
                <div key={visit.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString() : '-'}
                    </span>
                    <Badge variant="outline" className="text-xs">{visit.visitType || 'Clinical'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                    {visit.weight && <span>Weight: {visit.weight}kg</span>}
                    {visit.functionalStatus && <span>Functional: {visit.functionalStatus}</span>}
                    {visit.tbScreening && <span>TB: {visit.tbScreening}</span>}
                    {visit.oiScreening && <span>OI: {visit.oiScreening}</span>}
                  </div>
                  {visit.notes && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{visit.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Adherence History */}
      {adherenceRecords.length > 0 && (
        <Card className="rounded-2xl shadow-sm border-0 bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-orange-500" />
              Adherence Assessments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Barriers</TableHead>
                  <TableHead>Interventions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adherenceRecords.slice(0, 10).map((rec) => (
                  <TableRow key={rec.id}>
                    <TableCell>{rec.assessmentDate ? new Date(rec.assessmentDate).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        (rec.adherenceScore || 0) >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
                        (rec.adherenceScore || 0) >= 85 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }>
                        {rec.adherenceScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{rec.method || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">{rec.barriers || '-'}</TableCell>
                    <TableCell className="text-sm text-gray-500 max-w-[160px] truncate">{rec.interventions || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-500">
        <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <span>HIV data is access-controlled. Only authorized personnel can view this information. All access is logged in the audit trail.</span>
      </div>
    </div>
  );
}
