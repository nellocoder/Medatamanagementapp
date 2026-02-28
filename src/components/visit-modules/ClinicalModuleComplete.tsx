import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Activity, TestTube, Heart, Calendar, Edit2 } from 'lucide-react';

interface ClinicalModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  canEdit: boolean;
  onUpdate: () => void;
}

export function ClinicalModule({ visit, client, currentUser, canEdit, onUpdate }: ClinicalModuleProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHIVTestOpen, setIsHIVTestOpen] = useState(false);
  const [isVitalsOpen, setIsVitalsOpen] = useState(false);
  const [isSTIScreenOpen, setIsSTIScreenOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // HIV Test Form
  const [hivTestType, setHivTestType] = useState('rapid');
  const [hivResult, setHivResult] = useState('');
  const [hivNotes, setHivNotes] = useState('');

  // Vitals Form
  const [bloodPressure, setBloodPressure] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [vitalsNotes, setVitalsNotes] = useState('');

  // STI Screen Form
  const [stiType, setStiType] = useState('');
  const [stiResult, setStiResult] = useState('');
  const [stiTreatment, setStiTreatment] = useState('');
  const [stiNotes, setStiNotes] = useState('');

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading clinical records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditHIVTest = (record: any) => {
    setEditingRecord(record);
    setHivTestType(record.testType || 'rapid');
    setHivResult(record.result || '');
    setHivNotes(record.notes || '');
    setIsHIVTestOpen(true);
  };

  const handleEditVitals = (record: any) => {
    setEditingRecord(record);
    setBloodPressure(record.bloodPressure || '');
    setHeartRate(record.heartRate?.toString() || '');
    setTemperature(record.temperature?.toString() || '');
    setWeight(record.weight?.toString() || '');
    setHeight(record.height?.toString() || '');
    setVitalsNotes(record.notes || '');
    setIsVitalsOpen(true);
  };

  const handleEditSTIScreen = (record: any) => {
    setEditingRecord(record);
    setStiType(record.stiType || '');
    setStiResult(record.result || '');
    setStiTreatment(record.treatment || '');
    setStiNotes(record.notes || '');
    setIsSTIScreenOpen(true);
  };

  const handleHIVTest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'hiv-test',
      testType: hivTestType,
      result: hivResult,
      notes: hivNotes,
      performedBy: currentUser.id,
      performedAt: new Date().toISOString(),
    };

    try {
      const url = editingRecord 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${editingRecord.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical`;
      
      const response = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: editingRecord ? { ...editingRecord, ...record } : record, userId: currentUser.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingRecord ? 'HIV test updated successfully' : 'HIV test recorded successfully');
        setIsHIVTestOpen(false);
        setEditingRecord(null);
        loadRecords();
        onUpdate();
        setHivTestType('rapid');
        setHivResult('');
        setHivNotes('');
      } else {
        toast.error('Failed to save HIV test');
      }
    } catch (error) {
      console.error('Error saving HIV test:', error);
      toast.error('Failed to save HIV test');
    }
  };

  const handleVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const bmi = weight && height ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1) : null;

    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'vitals',
      bloodPressure,
      heartRate: heartRate ? parseInt(heartRate) : null,
      temperature: temperature ? parseFloat(temperature) : null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      bmi,
      notes: vitalsNotes,
      takenBy: currentUser.id,
      takenAt: new Date().toISOString(),
    };

    try {
      const url = editingRecord 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${editingRecord.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical`;
      
      const response = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: editingRecord ? { ...editingRecord, ...record } : record, userId: currentUser.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingRecord ? 'Vital signs updated successfully' : 'Vital signs recorded successfully');
        setIsVitalsOpen(false);
        setEditingRecord(null);
        loadRecords();
        onUpdate();
        setBloodPressure('');
        setHeartRate('');
        setTemperature('');
        setWeight('');
        setHeight('');
        setVitalsNotes('');
      } else {
        toast.error('Failed to save vital signs');
      }
    } catch (error) {
      console.error('Error saving vital signs:', error);
      toast.error('Failed to save vital signs');
    }
  };

  const handleSTIScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'sti-screen',
      stiType,
      result: stiResult,
      treatment: stiTreatment,
      notes: stiNotes,
      performedBy: currentUser.id,
      performedAt: new Date().toISOString(),
    };

    try {
      const url = editingRecord 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical/${editingRecord.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical`;
      
      const response = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: editingRecord ? { ...editingRecord, ...record } : record, userId: currentUser.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingRecord ? 'STI screening updated successfully' : 'STI screening recorded successfully');
        setIsSTIScreenOpen(false);
        setEditingRecord(null);
        loadRecords();
        onUpdate();
        setStiType('');
        setStiResult('');
        setStiTreatment('');
        setStiNotes('');
      } else {
        toast.error('Failed to save STI screening');
      }
    } catch (error) {
      console.error('Error saving STI screening:', error);
      toast.error('Failed to save STI screening');
    }
  };

  if (loading) {
    return <div className="p-4">Loading clinical records...</div>;
  }

  const hivTests = records.filter(r => r.type === 'hiv-test');
  const vitals = records.filter(r => r.type === 'vitals');
  const stiScreens = records.filter(r => r.type === 'sti-screen');

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      {canEdit && (
        <div className="flex gap-3">
          <Dialog open={isHIVTestOpen} onOpenChange={(open) => {
            setIsHIVTestOpen(open);
            if (!open) {
              setEditingRecord(null);
              setHivTestType('rapid');
              setHivResult('');
              setHivNotes('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <TestTube className="w-4 h-4 mr-2" />
                HIV Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit HIV Test' : 'Record HIV Test'}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the details of the HIV test.' : 'Enter the details of the HIV test.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleHIVTest} className="space-y-4">
                <div>
                  <Label>Test Type</Label>
                  <Select value={hivTestType} onValueChange={setHivTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rapid">Rapid Test</SelectItem>
                      <SelectItem value="confirmatory">Confirmatory Test</SelectItem>
                      <SelectItem value="viral-load">Viral Load</SelectItem>
                      <SelectItem value="cd4">CD4 Count</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Result *</Label>
                  <Select value={hivResult} onValueChange={setHivResult} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="indeterminate">Indeterminate</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={hivNotes}
                    onChange={(e) => setHivNotes(e.target.value)}
                    placeholder="Additional notes, referrals, etc."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsHIVTestOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingRecord ? 'Update' : 'Save'} HIV Test</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isVitalsOpen} onOpenChange={(open) => {
            setIsVitalsOpen(open);
            if (!open) {
              setEditingRecord(null);
              setBloodPressure('');
              setHeartRate('');
              setTemperature('');
              setWeight('');
              setHeight('');
              setVitalsNotes('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Heart className="w-4 h-4 mr-2" />
                Vital Signs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit Vital Signs' : 'Record Vital Signs'}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the vital signs.' : 'Enter the vital signs.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleVitals} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Blood Pressure (mmHg)</Label>
                    <Input
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="120/80"
                    />
                  </div>
                  <div>
                    <Label>Heart Rate (bpm)</Label>
                    <Input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      placeholder="72"
                    />
                  </div>
                  <div>
                    <Label>Temperature (°C)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="37.0"
                    />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="70"
                    />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="170"
                    />
                  </div>
                  {weight && height && (
                    <div>
                      <Label>BMI (calculated)</Label>
                      <Input
                        value={(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
                        disabled
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={vitalsNotes}
                    onChange={(e) => setVitalsNotes(e.target.value)}
                    placeholder="Additional observations"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsVitalsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingRecord ? 'Update' : 'Save'} Vitals</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isSTIScreenOpen} onOpenChange={(open) => {
            setIsSTIScreenOpen(open);
            if (!open) {
              setEditingRecord(null);
              setStiType('');
              setStiResult('');
              setStiTreatment('');
              setStiNotes('');
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                STI Screening
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Edit STI Screening' : 'Record STI Screening'}</DialogTitle>
                <DialogDescription>
                  {editingRecord ? 'Update the details of the STI screening.' : 'Enter the details of the STI screening.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSTIScreen} className="space-y-4">
                <div>
                  <Label>STI Type *</Label>
                  <Select value={stiType} onValueChange={setStiType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select STI type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="syphilis">Syphilis</SelectItem>
                      <SelectItem value="gonorrhea">Gonorrhea</SelectItem>
                      <SelectItem value="chlamydia">Chlamydia</SelectItem>
                      <SelectItem value="hepatitis-b">Hepatitis B</SelectItem>
                      <SelectItem value="hepatitis-c">Hepatitis C</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Result *</Label>
                  <Select value={stiResult} onValueChange={setStiResult} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select result" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Treatment Provided</Label>
                  <Input
                    value={stiTreatment}
                    onChange={(e) => setStiTreatment(e.target.value)}
                    placeholder="e.g., Azithromycin 1g single dose"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={stiNotes}
                    onChange={(e) => setStiNotes(e.target.value)}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsSTIScreenOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingRecord ? 'Update' : 'Save'} STI Screening</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Display Records */}
      <div className="space-y-4">
        {/* HIV Tests */}
        {hivTests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                HIV Tests ({hivTests.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hivTests.map((test, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{test.testType}</Badge>
                        <Badge className={
                          test.result === 'positive' ? 'bg-red-100 text-red-800' :
                          test.result === 'negative' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {test.result}
                        </Badge>
                      </div>
                      {test.notes && <p className="text-sm text-gray-600">{test.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500 text-right">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(test.performedAt).toLocaleDateString()}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditHIVTest(test)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Vital Signs */}
        {vitals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Vital Signs ({vitals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {vitals.map((vital, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="grid grid-cols-3 gap-4 flex-1">
                      {vital.bloodPressure && (
                        <div>
                          <p className="text-xs text-gray-500">Blood Pressure</p>
                          <p className="font-medium">{vital.bloodPressure} mmHg</p>
                        </div>
                      )}
                      {vital.heartRate && (
                        <div>
                          <p className="text-xs text-gray-500">Heart Rate</p>
                          <p className="font-medium">{vital.heartRate} bpm</p>
                        </div>
                      )}
                      {vital.temperature && (
                        <div>
                          <p className="text-xs text-gray-500">Temperature</p>
                          <p className="font-medium">{vital.temperature}°C</p>
                        </div>
                      )}
                      {vital.weight && (
                        <div>
                          <p className="text-xs text-gray-500">Weight</p>
                          <p className="font-medium">{vital.weight} kg</p>
                        </div>
                      )}
                      {vital.height && (
                        <div>
                          <p className="text-xs text-gray-500">Height</p>
                          <p className="font-medium">{vital.height} cm</p>
                        </div>
                      )}
                      {vital.bmi && (
                        <div>
                          <p className="text-xs text-gray-500">BMI</p>
                          <p className="font-medium">{vital.bmi}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(vital.takenAt).toLocaleDateString()}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVitals(vital)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {vital.notes && <p className="text-sm text-gray-600">{vital.notes}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* STI Screenings */}
        {stiScreens.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                STI Screenings ({stiScreens.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stiScreens.map((screen, idx) => (
                <div key={idx} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{screen.stiType}</Badge>
                        <Badge className={
                          screen.result === 'positive' ? 'bg-red-100 text-red-800' :
                          screen.result === 'negative' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {screen.result}
                        </Badge>
                      </div>
                      {screen.treatment && (
                        <p className="text-sm mb-1"><strong>Treatment:</strong> {screen.treatment}</p>
                      )}
                      {screen.notes && <p className="text-sm text-gray-600">{screen.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500 text-right">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {new Date(screen.performedAt).toLocaleDateString()}
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditSTIScreen(screen)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {records.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No clinical records for this visit yet.
              {canEdit && " Click the buttons above to add services."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}