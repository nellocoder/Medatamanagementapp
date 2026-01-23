import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface PrepRastProps {
  onChange: (data: { eligible: boolean; outcome: string; answers: Record<string, string> }) => void;
  initialData?: any;
}

export function PrepRastForm({ onChange, initialData }: PrepRastProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<{ eligible: boolean; text: string; severity: 'high' | 'low' | 'neutral' }>({ 
    eligible: false, 
    text: 'Pending completion', 
    severity: 'neutral' 
  });

  useEffect(() => {
    if (initialData) {
      setAnswers(initialData.answers || {});
    }
  }, [initialData]);

  useEffect(() => {
    evaluateAssessment();
  }, [answers]);

  const evaluateAssessment = () => {
    // 1. Check HIV Status
    if (answers['q1'] === 'Positive') {
      const result = {
        eligible: false,
        text: 'Discontinue assessment. Client is HIV Positive. Link to Care/ART immediately.',
        severity: 'high' as const
      };
      setOutcome(result);
      onChange({ eligible: result.eligible, outcome: result.text, answers });
      return;
    }

    // Check for "Refer" conditions
    // Cond 1: HIV status of sexual partner(s) is Positive or Unknown (Q2)
    const partnerRisk = answers['q2'] === 'Positive' || answers['q2'] === 'Unknown';
    
    // Cond 2: Any Yes to screening questions 3-8
    const behavioralRisk = ['q3', 'q4', 'q5', 'q6', 'q7', 'q8'].some(q => answers[q] === 'Yes');

    if (partnerRisk || behavioralRisk) {
      const result = {
        eligible: true,
        text: 'Screening Positive. Refer for further PrEP assessment.',
        severity: 'high' as const
      };
      setOutcome(result);
      onChange({ eligible: result.eligible, outcome: result.text, answers });
    } else {
      // If all questions answered and no risk found
      const allAnswered = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'].every(q => answers[q]);
      if (allAnswered) {
        const result = {
          eligible: false,
          text: 'Screening Negative. Reinforce standard prevention methods.',
          severity: 'low' as const
        };
        setOutcome(result);
        onChange({ eligible: result.eligible, outcome: result.text, answers });
      } else {
         // Incomplete
         setOutcome({ eligible: false, text: 'Assessment Incomplete', severity: 'neutral' });
         onChange({ eligible: false, outcome: 'Incomplete', answers });
      }
    }
  };

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const isHivPositive = answers['q1'] === 'Positive';

  return (
    <div className="space-y-6 bg-white p-4 rounded-md border border-slate-200">
      <div className="flex items-center justify-between border-b pb-4">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-slate-900">PrEP Rapid Assessment Screening Tool (RAST)</h3>
          <p className="text-xs text-slate-500 uppercase tracking-wide">MOH / NASCOP Standard Form</p>
        </div>
        {outcome.text !== 'Pending completion' && outcome.text !== 'Assessment Incomplete' && (
           <Badge variant={outcome.severity === 'high' ? 'destructive' : 'outline'} className={outcome.severity === 'high' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}>
             {outcome.eligible ? 'Refer for PrEP' : 'Standard Prevention'}
           </Badge>
        )}
      </div>

      <div className="space-y-6">
        {/* Q1 */}
        <div className="space-y-3">
          <Label className="font-semibold text-slate-900">1. What is your HIV status?</Label>
          <RadioGroup 
            value={answers['q1']} 
            onValueChange={(val) => handleAnswer('q1', val)}
            className="flex flex-wrap gap-4"
          >
            {['Negative', 'Positive', 'Unknown', 'Unwilling to disclose'].map(opt => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`q1-${opt}`} />
                <Label htmlFor={`q1-${opt}`} className="font-normal">{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {isHivPositive ? (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Discontinue Assessment</AlertTitle>
            <AlertDescription>
              Client is HIV Positive. Do not continue PrEP screening. Link to Care and Treatment immediately.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Q2 */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="font-semibold text-slate-900">2. What is the HIV status of your sexual partner(s)?</Label>
              <RadioGroup 
                value={answers['q2']} 
                onValueChange={(val) => handleAnswer('q2', val)}
                className="flex flex-wrap gap-4"
              >
                {['Negative', 'Positive', 'Unknown'].map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`q2-${opt}`} />
                    <Label htmlFor={`q2-${opt}`} className="font-normal">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold text-slate-500 mb-4 uppercase text-xs tracking-wider">In the past 6 months</h4>
              
              <div className="space-y-6">
                {[
                  { id: 'q3', text: '3. Have you had sex without a condom with a partner(s) of unknown or positive HIV status?' },
                  { id: 'q4', text: '4. Have you engaged in sex in exchange of money or other favors?' },
                  { id: 'q5', text: '5. Have you been diagnosed with or treated for an STI?' },
                  { id: 'q6', text: '6. Have you shared needles while engaging in intravenous drug use?' },
                  { id: 'q7', text: '7. Have you been forced to have sex against your will or physically assaulted including assault by your sexual partner(s)?' },
                  { id: 'q8', text: '8. Have you used post exposure prophylaxis (PEP) two times or more?' }
                ].map((q) => (
                  <div key={q.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start border-b border-slate-50 pb-4 last:border-0">
                    <Label className="md:col-span-2 text-slate-700 font-medium leading-relaxed">{q.text}</Label>
                    <RadioGroup 
                      value={answers[q.id]} 
                      onValueChange={(val) => handleAnswer(q.id, val)}
                      className="flex gap-6"
                    >
                      {['No', 'Yes'].map(opt => (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                          <Label htmlFor={`${q.id}-${opt}`} className="font-normal">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Remarks / Outcome Display */}
        <div className={`p-4 rounded-lg border ${
          outcome.severity === 'high' ? 'bg-amber-50 border-amber-200' : 
          outcome.severity === 'low' ? 'bg-slate-50 border-slate-200' : 
          'bg-slate-50 border-slate-200'
        }`}>
          <h4 className="font-semibold text-sm text-slate-900 mb-1">Assessment Outcome & Remarks</h4>
          <p className={`text-sm ${
             outcome.severity === 'high' ? 'text-amber-800 font-medium' : 
             outcome.severity === 'low' ? 'text-slate-600' : 
             'text-slate-500 italic'
          }`}>
            {outcome.text}
          </p>
        </div>
      </div>
    </div>
  );
}
