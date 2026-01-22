import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Brain, Plus, AlertTriangle, Activity } from 'lucide-react';

interface MentalHealthModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  canEdit: boolean;
  onUpdate: () => void;
}

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself",
];

const GAD7_QUESTIONS = [
  "Feeling nervous, anxious, or on edge",
  "Not being able to stop or control worrying",
  "Worrying too much about different things",
  "Trouble relaxing",
  "Being so restless that it is hard to sit still",
  "Becoming easily annoyed or irritable",
  "Feeling afraid, as if something awful might happen",
];

export function MentalHealthModule({ visit, client, currentUser, canEdit, onUpdate }: MentalHealthModuleProps) {
  const [isPHQ9Open, setIsPHQ9Open] = useState(false);
  const [isGAD7Open, setIsGAD7Open] = useState(false);
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  
  const [phq9Scores, setPHQ9Scores] = useState<number[]>(Array(9).fill(0));
  const [gad7Scores, setGAD7Scores] = useState<number[]>(Array(7).fill(0));

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mental-health/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading mental health records:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePHQ9 = () => {
    const total = phq9Scores.reduce((a, b) => a + b, 0);
    let severity = '';
    if (total <= 4) severity = 'Minimal';
    else if (total <= 9) severity = 'Mild';
    else if (total <= 14) severity = 'Moderate';
    else if (total <= 19) severity = 'Moderately Severe';
    else severity = 'Severe';
    
    const suicidalThought = phq9Scores[8] > 0;
    
    return { total, severity, suicidalThought };
  };

  const calculateGAD7 = () => {
    const total = gad7Scores.reduce((a, b) => a + b, 0);
    let severity = '';
    if (total <= 4) severity = 'Minimal';
    else if (total <= 9) severity = 'Mild';
    else if (total <= 14) severity = 'Moderate';
    else severity = 'Severe';
    
    return { total, severity };
  };

  const handleSavePHQ9 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { total, severity, suicidalThought } = calculatePHQ9();

    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'PHQ-9 Depression Screening',
      phq9Score: total,
      phq9Severity: severity,
      phq9Responses: phq9Scores,
      suicidalThought,
      notes: formData.get('notes'),
      provider: currentUser.name,
      date: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mental-health`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ record, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('PHQ-9 screening saved successfully');
        if (severity === 'Severe' || severity === 'Moderately Severe' || suicidalThought) {
          toast.warning('High risk flag triggered!', {
            description: suicidalThought 
              ? 'Suicidal thoughts detected - immediate follow-up required'
              : 'Severe depression detected - follow-up recommended',
          });
        }
        setIsPHQ9Open(false);
        setPHQ9Scores(Array(9).fill(0));
        loadRecords();
        onUpdate();
      } else {
        toast.error(data.error || 'Failed to save PHQ-9');
      }
    } catch (error) {
      console.error('Error saving PHQ-9:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleSaveGAD7 = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { total, severity } = calculateGAD7();

    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'GAD-7 Anxiety Screening',
      gad7Score: total,
      gad7Severity: severity,
      gad7Responses: gad7Scores,
      notes: formData.get('notes'),
      provider: currentUser.name,
      date: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mental-health`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ record, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('GAD-7 screening saved successfully');
        if (severity === 'Severe') {
          toast.warning('High risk flag triggered!', {
            description: 'Severe anxiety detected - follow-up recommended',
          });
        }
        setIsGAD7Open(false);
        setGAD7Scores(Array(7).fill(0));
        loadRecords();
        onUpdate();
      } else {
        toast.error(data.error || 'Failed to save GAD-7');
      }
    } catch (error) {
      console.error('Error saving GAD-7:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleSaveOther = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: formData.get('type'),
      notes: formData.get('notes'),
      provider: currentUser.name,
      date: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/mental-health`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ record, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Mental health record saved successfully');
        setIsOtherOpen(false);
        loadRecords();
        onUpdate();
      } else {
        toast.error(data.error || 'Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const phq9Result = calculatePHQ9();
  const gad7Result = calculateGAD7();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-medium flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Mental Health Services
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Mental health screening, counseling, and therapy sessions
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Dialog open={isPHQ9Open} onOpenChange={setIsPHQ9Open}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  PHQ-9
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>PHQ-9 Depression Screening</DialogTitle>
                  <DialogDescription>
                    Patient Health Questionnaire - 9 items. Over the last 2 weeks, how often have you been bothered by the following problems?
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSavePHQ9} className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium">Current Score: {phq9Result.total}</p>
                    <Badge variant="outline" className="mt-2">{phq9Result.severity}</Badge>
                    {phq9Result.suicidalThought && (
                      <Badge variant="outline" className="mt-2 ml-2 bg-red-100 text-red-700 border-red-300">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Suicidal Thought Detected
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-6">
                    {PHQ9_QUESTIONS.map((question, idx) => (
                      <div key={idx} className={`p-4 rounded-lg ${idx === 8 ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                        <p className="text-sm font-medium mb-3">
                          {idx + 1}. {question}
                          {idx === 8 && (
                            <span className="text-red-600 ml-2">(Critical Item)</span>
                          )}
                        </p>
                        <RadioGroup
                          value={phq9Scores[idx].toString()}
                          onValueChange={(value) => {
                            const newScores = [...phq9Scores];
                            newScores[idx] = parseInt(value);
                            setPHQ9Scores(newScores);
                          }}
                        >
                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="0" id={`phq9-${idx}-0`} />
                              <Label htmlFor={`phq9-${idx}-0`} className="text-sm cursor-pointer">
                                Not at all (0)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="1" id={`phq9-${idx}-1`} />
                              <Label htmlFor={`phq9-${idx}-1`} className="text-sm cursor-pointer">
                                Several days (1)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="2" id={`phq9-${idx}-2`} />
                              <Label htmlFor={`phq9-${idx}-2`} className="text-sm cursor-pointer">
                                More than half the days (2)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="3" id={`phq9-${idx}-3`} />
                              <Label htmlFor={`phq9-${idx}-3`} className="text-sm cursor-pointer">
                                Nearly every day (3)
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Clinical Notes</Label>
                    <Textarea id="notes" name="notes" rows={3} placeholder="Add any additional observations or recommendations..." />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsPHQ9Open(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save PHQ-9 Screening</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isGAD7Open} onOpenChange={setIsGAD7Open}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  GAD-7
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>GAD-7 Anxiety Screening</DialogTitle>
                  <DialogDescription>
                    Generalized Anxiety Disorder - 7 items. Over the last 2 weeks, how often have you been bothered by the following problems?
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveGAD7} className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium">Current Score: {gad7Result.total}</p>
                    <Badge variant="outline" className="mt-2">{gad7Result.severity}</Badge>
                  </div>

                  <div className="space-y-6">
                    {GAD7_QUESTIONS.map((question, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium mb-3">
                          {idx + 1}. {question}
                        </p>
                        <RadioGroup
                          value={gad7Scores[idx].toString()}
                          onValueChange={(value) => {
                            const newScores = [...gad7Scores];
                            newScores[idx] = parseInt(value);
                            setGAD7Scores(newScores);
                          }}
                        >
                          <div className="grid grid-cols-4 gap-2">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="0" id={`gad7-${idx}-0`} />
                              <Label htmlFor={`gad7-${idx}-0`} className="text-sm cursor-pointer">
                                Not at all (0)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="1" id={`gad7-${idx}-1`} />
                              <Label htmlFor={`gad7-${idx}-1`} className="text-sm cursor-pointer">
                                Several days (1)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="2" id={`gad7-${idx}-2`} />
                              <Label htmlFor={`gad7-${idx}-2`} className="text-sm cursor-pointer">
                                More than half the days (2)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="3" id={`gad7-${idx}-3`} />
                              <Label htmlFor={`gad7-${idx}-3`} className="text-sm cursor-pointer">
                                Nearly every day (3)
                              </Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Clinical Notes</Label>
                    <Textarea id="notes" name="notes" rows={3} placeholder="Add any additional observations or recommendations..." />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsGAD7Open(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save GAD-7 Screening</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isOtherOpen} onOpenChange={setIsOtherOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Other Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Mental Health Service</DialogTitle>
                  <DialogDescription>
                    Add counseling session, CBT, trauma therapy, or other mental health service
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveOther} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Service Type *</Label>
                    <Input 
                      id="type" 
                      name="type" 
                      placeholder="e.g., CBT Session, Trauma Counseling, Suicide Risk Screening"
                      required 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Session Notes *</Label>
                    <Textarea 
                      id="notes" 
                      name="notes" 
                      rows={5}
                      placeholder="Document session content, interventions used, client progress, and follow-up plan..."
                      required 
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOtherOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Service</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="space-y-4 mt-6">
        {records.length > 0 ? (
          records.map((record, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg">{record.type}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {record.phq9Score !== undefined && (
                        <Badge className={
                          record.phq9Severity === 'Severe' || record.phq9Severity === 'Moderately Severe' ? 'bg-red-100 text-red-800' :
                          record.phq9Severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          PHQ-9 Score: {record.phq9Score} ({record.phq9Severity})
                        </Badge>
                      )}
                      {record.gad7Score !== undefined && (
                        <Badge className={
                          record.gad7Severity === 'Severe' ? 'bg-red-100 text-red-800' :
                          record.gad7Severity === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          GAD-7 Score: {record.gad7Score} ({record.gad7Severity})
                        </Badge>
                      )}
                    </div>
                    {record.suicidalThought && (
                      <div className="mt-2 flex items-center text-red-600 text-sm font-medium">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Suicidal thoughts reported
                      </div>
                    )}
                    {record.notes && (
                      <p className="mt-2 text-gray-600 text-sm bg-gray-50 p-2 rounded">
                        {record.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Recorded by {record.provider} on {new Date(record.date || record.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {/* Edit button could go here */}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No mental health services recorded for this visit yet.</p>
              {canEdit && (
                <p className="text-sm mt-2">Use the buttons above to add PHQ-9, GAD-7, or other mental health services.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
