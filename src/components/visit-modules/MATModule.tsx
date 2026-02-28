import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { ClipboardList, Pill, AlertTriangle, TrendingUp, Calendar, Plus } from 'lucide-react';

interface MATModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  canEdit: boolean;
  onUpdate: () => void;
}

export function MATModule({ visit, client, currentUser, canEdit, onUpdate }: MATModuleProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDosingOpen, setIsDosingOpen] = useState(false);

  // Dosing Form
  const [medicationType, setMedicationType] = useState('methadone');
  const [dose, setDose] = useState('');
  const [witnessed, setWitnessed] = useState(true);
  const [takeHome, setTakeHome] = useState(false);
  const [takeHomeDays, setTakeHomeDays] = useState('');
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [otherSideEffect, setOtherSideEffect] = useState('');
  const [withdrawalSymptoms, setWithdrawalSymptoms] = useState<string[]>([]);
  const [cravingLevel, setCravingLevel] = useState('');
  const [adherenceIssues, setAdherenceIssues] = useState(false);
  const [adherenceDetails, setAdherenceDetails] = useState('');
  const [doseAdjustment, setDoseAdjustment] = useState(false);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [urineScreen, setUrineScreen] = useState(false);
  const [urineScreenResults, setUrineScreenResults] = useState('');
  const [notes, setNotes] = useState('');

  const SIDE_EFFECTS = [
    'Nausea',
    'Constipation',
    'Drowsiness',
    'Sweating',
    'Dizziness',
    'Headache',
    'None',
    'Other',
  ];

  const WITHDRAWAL_SYMPTOMS = [
    'Muscle aches',
    'Anxiety',
    'Sweating',
    'Insomnia',
    'Nausea',
    'Diarrhea',
    'None',
  ];

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mat/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading MAT records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDosing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sideEffectsList = [...sideEffects];
    if (sideEffects.includes('Other') && otherSideEffect) {
      sideEffectsList.push(otherSideEffect);
    }

    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'mat-dosing',
      medication: medicationType,
      dose: dose ? parseFloat(dose) : 0,
      witnessed,
      takeHome: {
        allowed: takeHome,
        days: takeHome && takeHomeDays ? parseInt(takeHomeDays) : 0,
      },
      assessment: {
        sideEffects: sideEffectsList,
        withdrawalSymptoms,
        cravingLevel: cravingLevel ? parseInt(cravingLevel) : null,
      },
      adherence: {
        issues: adherenceIssues,
        details: adherenceDetails || null,
      },
      doseAdjustment: {
        made: doseAdjustment,
        reason: adjustmentReason || null,
      },
      urineScreen: {
        performed: urineScreen,
        results: urineScreenResults || null,
      },
      notes,
      providedBy: currentUser.id,
      providedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ record, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('MAT dosing recorded successfully');
        setIsDosingOpen(false);
        loadRecords();
        onUpdate();
        // Reset form
        setMedicationType('methadone');
        setDose('');
        setWitnessed(true);
        setTakeHome(false);
        setTakeHomeDays('');
        setSideEffects([]);
        setOtherSideEffect('');
        setWithdrawalSymptoms([]);
        setCravingLevel('');
        setAdherenceIssues(false);
        setAdherenceDetails('');
        setDoseAdjustment(false);
        setAdjustmentReason('');
        setUrineScreen(false);
        setUrineScreenResults('');
        setNotes('');
      } else {
        toast.error('Failed to record MAT dosing');
      }
    } catch (error) {
      console.error('Error recording MAT dosing:', error);
      toast.error('Failed to record MAT dosing');
    }
  };

  const toggleSideEffect = (effect: string) => {
    setSideEffects((prev) =>
      prev.includes(effect)
        ? prev.filter((e) => e !== effect)
        : [...prev, effect]
    );
  };

  const toggleWithdrawalSymptom = (symptom: string) => {
    setWithdrawalSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom]
    );
  };

  if (loading) {
    return <div className="p-4">Loading MAT records...</div>;
  }

  const latestDose = records.length > 0 ? records[0].dose : null;
  const averageDose = records.length > 0
    ? (records.reduce((sum, r) => sum + (r.dose || 0), 0) / records.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Pill className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{latestDose} mg</p>
                <p className="text-sm text-gray-600">Current Dose</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{averageDose} mg</p>
                <p className="text-sm text-gray-600">Average Dose</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{records.length}</p>
                <p className="text-sm text-gray-600">Total Visits</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Button */}
      {canEdit && (
        <Dialog open={isDosingOpen} onOpenChange={setIsDosingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Record Dosing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>MAT Dosing & Assessment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleDosing} className="space-y-6">
              {/* Medication & Dose */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Medication *</Label>
                  <Select value={medicationType} onValueChange={setMedicationType} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="methadone">Methadone</SelectItem>
                      <SelectItem value="buprenorphine">Buprenorphine</SelectItem>
                      <SelectItem value="naltrexone">Naltrexone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dose (mg) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={dose}
                    onChange={(e) => setDose(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Administration */}
              <div className="space-y-4">
                <h3 className="font-medium">Administration</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={witnessed}
                    onCheckedChange={(checked) => setWitnessed(checked as boolean)}
                    id="witnessed"
                  />
                  <Label htmlFor="witnessed">Witnessed Dosing</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={takeHome}
                    onCheckedChange={(checked) => setTakeHome(checked as boolean)}
                    id="take-home"
                  />
                  <Label htmlFor="take-home">Take-home Doses Provided</Label>
                </div>
                {takeHome && (
                  <div className="ml-6">
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      value={takeHomeDays}
                      onChange={(e) => setTakeHomeDays(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              {/* Side Effects */}
              <div>
                <Label>Side Effects</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SIDE_EFFECTS.map(effect => (
                    <div key={effect} className="flex items-center gap-2">
                      <Checkbox
                        checked={sideEffects.includes(effect)}
                        onCheckedChange={() => toggleSideEffect(effect)}
                        id={`side-${effect}`}
                      />
                      <Label htmlFor={`side-${effect}`} className="font-normal">
                        {effect}
                      </Label>
                    </div>
                  ))}
                </div>
                {sideEffects.includes('Other') && (
                  <Input
                    value={otherSideEffect}
                    onChange={(e) => setOtherSideEffect(e.target.value)}
                    placeholder="Specify other side effects"
                    className="mt-2"
                  />
                )}
              </div>

              {/* Withdrawal Symptoms */}
              <div>
                <Label>Withdrawal Symptoms</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WITHDRAWAL_SYMPTOMS.map(symptom => (
                    <div key={symptom} className="flex items-center gap-2">
                      <Checkbox
                        checked={withdrawalSymptoms.includes(symptom)}
                        onCheckedChange={() => toggleWithdrawalSymptom(symptom)}
                        id={`withdrawal-${symptom}`}
                      />
                      <Label htmlFor={`withdrawal-${symptom}`} className="font-normal">
                        {symptom}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Craving Level */}
              <div>
                <Label>Craving Level (0-10)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={cravingLevel}
                  onChange={(e) => setCravingLevel(e.target.value)}
                  placeholder="0 = None, 10 = Severe"
                />
              </div>

              {/* Adherence */}
              <div className="space-y-4">
                <h3 className="font-medium">Treatment Adherence</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={adherenceIssues}
                    onCheckedChange={(checked) => setAdherenceIssues(checked as boolean)}
                    id="adherence"
                  />
                  <Label htmlFor="adherence">Adherence Issues Identified</Label>
                </div>
                {adherenceIssues && (
                  <Textarea
                    value={adherenceDetails}
                    onChange={(e) => setAdherenceDetails(e.target.value)}
                    placeholder="Describe adherence issues and interventions"
                    rows={2}
                  />
                )}
              </div>

              {/* Dose Adjustment */}
              <div className="space-y-4">
                <h3 className="font-medium">Dose Adjustment</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={doseAdjustment}
                    onCheckedChange={(checked) => setDoseAdjustment(checked as boolean)}
                    id="dose-adjust"
                  />
                  <Label htmlFor="dose-adjust">Dose Adjusted This Visit</Label>
                </div>
                {doseAdjustment && (
                  <Textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Reason for dose adjustment"
                    rows={2}
                  />
                )}
              </div>

              {/* Urine Screen */}
              <div className="space-y-4">
                <h3 className="font-medium">Urine Drug Screen</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={urineScreen}
                    onCheckedChange={(checked) => setUrineScreen(checked as boolean)}
                    id="urine-screen"
                  />
                  <Label htmlFor="urine-screen">Urine Screen Performed</Label>
                </div>
                {urineScreen && (
                  <Textarea
                    value={urineScreenResults}
                    onChange={(e) => setUrineScreenResults(e.target.value)}
                    placeholder="Results: substances detected/not detected"
                    rows={2}
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <Label>Clinical Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Overall assessment, treatment plan, referrals..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDosingOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Dosing Record</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Display Records */}
      <div className="space-y-4">
        {records.length > 0 ? (
          records.map((record, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Pill className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="font-medium">{record.medication}</p>
                      <p className="text-2xl font-bold">{record.dose} mg</p>
                    </div>
                    {record.witnessed && (
                      <Badge variant="outline">Witnessed</Badge>
                    )}
                    {record.takeHome?.allowed && (
                      <Badge className="bg-green-100 text-green-800">
                        Take-home: {record.takeHome.days} days
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(record.providedAt).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Assessment */}
                  {record.assessment && (
                    <>
                      {record.assessment.cravingLevel !== null && (
                        <div>
                          <p className="text-sm text-gray-600">Craving Level</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 h-2 rounded-full">
                              <div
                                className={`h-2 rounded-full ${
                                  record.assessment.cravingLevel <= 3 ? 'bg-green-500' :
                                  record.assessment.cravingLevel <= 6 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${record.assessment.cravingLevel * 10}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{record.assessment.cravingLevel}/10</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Side Effects */}
                {record.assessment?.sideEffects && record.assessment.sideEffects.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Side Effects:</p>
                    <div className="flex flex-wrap gap-2">
                      {record.assessment.sideEffects.map((effect: string, i: number) => (
                        <Badge key={i} variant="secondary">{effect}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Withdrawal Symptoms */}
                {record.assessment?.withdrawalSymptoms && record.assessment.withdrawalSymptoms.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Withdrawal Symptoms:</p>
                    <div className="flex flex-wrap gap-2">
                      {record.assessment.withdrawalSymptoms.map((symptom: string, i: number) => (
                        <Badge key={i} variant="outline">{symptom}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adherence Issues */}
                {record.adherence?.issues && (
                  <div className="mb-4">
                    <Badge className="bg-amber-100 text-amber-800 mb-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Adherence Issues
                    </Badge>
                    {record.adherence.details && (
                      <p className="text-sm text-gray-600">{record.adherence.details}</p>
                    )}
                  </div>
                )}

                {/* Dose Adjustment */}
                {record.doseAdjustment?.made && (
                  <div className="mb-4">
                    <Badge className="bg-blue-100 text-blue-800 mb-2">
                      Dose Adjusted
                    </Badge>
                    {record.doseAdjustment.reason && (
                      <p className="text-sm text-gray-600">{record.doseAdjustment.reason}</p>
                    )}
                  </div>
                )}

                {/* Urine Screen */}
                {record.urineScreen?.performed && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Urine Drug Screen:</p>
                    <p className="text-sm text-gray-600">{record.urineScreen.results || 'Results pending'}</p>
                  </div>
                )}

                {/* Notes */}
                {record.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-1">Clinical Notes:</p>
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No MAT dosing records for this visit yet.
              {canEdit && " Click the button above to record dosing."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}