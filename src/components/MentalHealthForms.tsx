import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface AssessmentProps {
  onChange: (data: { score: number; severity: string; classification: string; responses: Record<string, number> }) => void;
  initialData?: any;
}

const PHQ9_QUESTIONS = [
  { id: 'q1', text: 'Little interest or pleasure in doing things' },
  { id: 'q2', text: 'Feeling down, depressed, or hopeless' },
  { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much' },
  { id: 'q4', text: 'Feeling tired or having little energy' },
  { id: 'q5', text: 'Poor appetite or overeating' },
  { id: 'q6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down' },
  { id: 'q7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
  { id: 'q8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual' },
  { id: 'q9', text: 'Thoughts that you would be better off dead or of hurting yourself in some way' },
];

const GAD7_QUESTIONS = [
  { id: 'q1', text: 'Feeling nervous, anxious, or on edge' },
  { id: 'q2', text: 'Not being able to stop or control worrying' },
  { id: 'q3', text: 'Worrying too much about different things' },
  { id: 'q4', text: 'Trouble relaxing' },
  { id: 'q5', text: 'Being so restless that it is hard to sit still' },
  { id: 'q6', text: 'Becoming easily annoyed or irritable' },
  { id: 'q7', text: 'Feeling afraid, as if something awful might happen' },
];

const RESPONSE_OPTIONS = [
  { value: 0, label: 'Not at all' },
  { value: 1, label: 'Several days' },
  { value: 2, label: 'More than half the days' },
  { value: 3, label: 'Nearly every day' },
];

export function PHQ9Form({ onChange, initialData }: AssessmentProps) {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (initialData) {
      setResponses(initialData.responses || {});
    }
  }, [initialData]);

  useEffect(() => {
    // Calculate score
    const total = Object.values(responses).reduce((sum, val) => sum + val, 0);
    setScore(total);

    // Determine severity and classification
    let severity = '';
    let classification = '';
    let recommendation = '';

    if (total <= 4) {
      severity = 'Minimal';
      classification = 'Minimal depression';
      recommendation = 'Psychoeducation, monitoring';
    } else if (total <= 9) {
      severity = 'Mild';
      classification = 'Mild depression';
      recommendation = 'Psychoeducation, monitoring';
    } else if (total <= 14) {
      severity = 'Moderate';
      classification = 'Moderate depression';
      recommendation = 'Brief CBT or counseling referral';
    } else if (total <= 19) {
      severity = 'Moderately Severe';
      classification = 'Moderately severe depression';
      recommendation = 'Mental health specialist referral and safety assessment';
    } else {
      severity = 'Severe';
      classification = 'Severe depression';
      recommendation = 'Mental health specialist referral and safety assessment';
    }

    onChange({
      score: total,
      severity,
      classification: `${classification} (${recommendation})`,
      responses
    });
  }, [responses]);

  const handleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const getSeverityColor = (s: number) => {
    if (s <= 4) return 'bg-green-100 text-green-800';
    if (s <= 9) return 'bg-blue-100 text-blue-800';
    if (s <= 14) return 'bg-yellow-100 text-yellow-800';
    if (s <= 19) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 p-2 border-b">
        <h3 className="font-semibold text-lg">PHQ-9 Assessment</h3>
        <Badge className={`${getSeverityColor(score)} text-sm px-3 py-1`}>
          Score: {score} / 27
        </Badge>
      </div>

      <div className="space-y-6">
        {PHQ9_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3 pb-4 border-b last:border-0">
            <Label className="text-base font-medium text-gray-900">{q.text}</Label>
            <RadioGroup
              onValueChange={(val) => handleResponse(q.id, val)}
              value={responses[q.id]?.toString()}
              className="flex flex-col sm:flex-row gap-2 sm:gap-6"
            >
              {RESPONSE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value.toString()} id={`${q.id}-${opt.value}`} />
                  <Label htmlFor={`${q.id}-${opt.value}`} className="font-normal text-gray-600">
                    {opt.label} <span className="text-xs text-gray-400">({opt.value})</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GAD7Form({ onChange, initialData }: AssessmentProps) {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (initialData) {
      setResponses(initialData.responses || {});
    }
  }, [initialData]);

  useEffect(() => {
    const total = Object.values(responses).reduce((sum, val) => sum + val, 0);
    setScore(total);

    let severity = '';
    let classification = '';
    let recommendation = '';

    if (total <= 4) {
      severity = 'Minimal';
      classification = 'Minimal anxiety';
      recommendation = 'None';
    } else if (total <= 9) {
      severity = 'Mild';
      classification = 'Mild anxiety';
      recommendation = 'Psychoeducation, stress management';
    } else if (total <= 14) {
      severity = 'Moderate';
      classification = 'Moderate anxiety';
      recommendation = 'CBT-based intervention';
    } else {
      severity = 'Severe';
      classification = 'Severe anxiety';
      recommendation = 'Specialist referral';
    }

    onChange({
      score: total,
      severity,
      classification: `${classification} (${recommendation})`,
      responses
    });
  }, [responses]);

  const handleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const getSeverityColor = (s: number) => {
    if (s <= 4) return 'bg-green-100 text-green-800';
    if (s <= 9) return 'bg-blue-100 text-blue-800';
    if (s <= 14) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 p-2 border-b">
        <h3 className="font-semibold text-lg">GAD-7 Assessment</h3>
        <Badge className={`${getSeverityColor(score)} text-sm px-3 py-1`}>
          Score: {score} / 21
        </Badge>
      </div>

      <div className="space-y-6">
        {GAD7_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-3 pb-4 border-b last:border-0">
            <Label className="text-base font-medium text-gray-900">{q.text}</Label>
            <RadioGroup
              onValueChange={(val) => handleResponse(q.id, val)}
              value={responses[q.id]?.toString()}
              className="flex flex-col sm:flex-row gap-2 sm:gap-6"
            >
              {RESPONSE_OPTIONS.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt.value.toString()} id={`${q.id}-${opt.value}`} />
                  <Label htmlFor={`${q.id}-${opt.value}`} className="font-normal text-gray-600">
                    {opt.label} <span className="text-xs text-gray-400">({opt.value})</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}
      </div>
    </div>
  );
}