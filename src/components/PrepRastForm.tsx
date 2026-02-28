import { useState, useEffect } from 'react';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

interface PrepRastProps {
  onChange: (data: { eligible: boolean; outcome: string; severity: string; answers: Record<string, string> }) => void;
  initialData?: any;
}

const QUESTIONS = [
  { id: 'q3', text: 'Had sex without a condom with a partner of unknown or positive HIV status?' },
  { id: 'q4', text: 'Engaged in sex in exchange for money or other favours?' },
  { id: 'q5', text: 'Been diagnosed with or treated for an STI?' },
  { id: 'q6', text: 'Shared needles while engaging in intravenous drug use?' },
  { id: 'q7', text: 'Been forced to have sex or physically assaulted by a sexual partner?' },
  { id: 'q8', text: 'Used post-exposure prophylaxis (PEP) two or more times?' },
];

export function PrepRastForm({ onChange, initialData }: PrepRastProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialData?.answers || {});

  useEffect(() => {
    if (initialData?.answers) setAnswers(initialData.answers);
  }, []);

  // Derive outcome purely from answers — no separate state needed
  const isHivPositive   = answers['q1'] === 'Positive';
  const partnerRisk     = answers['q2'] === 'Positive' || answers['q2'] === 'Unknown';
  const behavioralRisk  = ['q3','q4','q5','q6','q7','q8'].some(q => answers[q] === 'Yes');
  const allAnswered     = !isHivPositive &&
    ['q1','q2','q3','q4','q5','q6','q7','q8'].every(q => answers[q]);

  let outcome: { eligible: boolean; text: string; severity: string; color: string; Icon: any } = {
    eligible: false,
    text: 'Complete all questions to see outcome',
    severity: 'Pending',
    color: 'gray',
    Icon: Shield,
  };

  if (isHivPositive) {
    outcome = {
      eligible: false,
      text: 'Client is HIV Positive — discontinue assessment. Link to Care & ART immediately.',
      severity: 'HIV Positive',
      color: 'red',
      Icon: XCircle,
    };
  } else if (allAnswered && (partnerRisk || behavioralRisk)) {
    outcome = {
      eligible: true,
      text: 'Screening Positive — refer for full PrEP assessment.',
      severity: 'Refer for PrEP',
      color: 'amber',
      Icon: ShieldAlert,
    };
  } else if (allAnswered) {
    outcome = {
      eligible: false,
      text: 'Screening Negative — reinforce standard HIV prevention methods.',
      severity: 'Standard Prevention',
      color: 'green',
      Icon: ShieldCheck,
    };
  }

  const handleAnswer = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);

    // Recalculate inline for the callback (mirrors logic above)
    const hivPos   = next['q1'] === 'Positive';
    const partRisk = next['q2'] === 'Positive' || next['q2'] === 'Unknown';
    const behRisk  = ['q3','q4','q5','q6','q7','q8'].some(q => next[q] === 'Yes');
    const allDone  = !hivPos && ['q1','q2','q3','q4','q5','q6','q7','q8'].every(q => next[q]);

    let eligible = false, outcomeText = 'Incomplete', severity = 'Pending';
    if (hivPos)                           { eligible = false; outcomeText = 'HIV Positive — link to ART'; severity = 'HIV Positive'; }
    else if (allDone && (partRisk||behRisk)) { eligible = true;  outcomeText = 'Screening Positive — refer for PrEP'; severity = 'Refer for PrEP'; }
    else if (allDone)                     { eligible = false; outcomeText = 'Screening Negative'; severity = 'Standard Prevention'; }

    onChange({ eligible, outcome: outcomeText, severity, answers: next });
  };

  const outcomeStyles: Record<string, string> = {
    red:   'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    gray:  'bg-gray-50 border-gray-200 text-gray-500',
  };

  const badgeStyles: Record<string, string> = {
    red:   'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    gray:  'bg-gray-100 text-gray-500 border-gray-200',
  };

  const q1Options = ['Negative', 'Positive', 'Unknown', 'Unwilling to disclose'];
  const q2Options = ['Negative', 'Positive', 'Unknown'];

  return (
    <div className="space-y-0 rounded-2xl border border-gray-200 overflow-hidden bg-white">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
        <div>
          <p className="text-white font-semibold text-sm">PrEP Rapid Assessment Screening Tool</p>
          <p className="text-indigo-200 text-xs mt-0.5">MOH / NASCOP Standard · RAST</p>
        </div>
        <Badge className={`text-xs font-semibold border ${badgeStyles[outcome.color]} shrink-0`}>
          {outcome.severity}
        </Badge>
      </div>

      <div className="divide-y divide-gray-100">

        {/* Q1 — HIV Status */}
        <QuestionBlock
          number="1"
          question="What is the client's current HIV status?"
          required
        >
          <RadioGroup
            value={answers['q1']}
            onValueChange={val => handleAnswer('q1', val)}
            className="grid grid-cols-2 gap-2 pt-1"
          >
            {q1Options.map(opt => (
              <OptionPill
                key={opt}
                id={`q1-${opt}`}
                value={opt}
                label={opt}
                selected={answers['q1'] === opt}
                danger={opt === 'Positive'}
              />
            ))}
          </RadioGroup>
        </QuestionBlock>

        {/* HIV Positive stop card */}
        {isHivPositive && (
          <div className="px-5 py-4 bg-red-50 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Discontinue Assessment</p>
              <p className="text-xs text-red-700 mt-0.5">
                Client is HIV Positive. Do not continue PrEP screening.
                Link to Care &amp; Treatment immediately.
              </p>
            </div>
          </div>
        )}

        {/* Q2–Q8 — only shown if not HIV positive */}
        {!isHivPositive && (
          <>
            {/* Q2 — Partner status */}
            <QuestionBlock
              number="2"
              question="What is the HIV status of the client's sexual partner(s)?"
              required
            >
              <RadioGroup
                value={answers['q2']}
                onValueChange={val => handleAnswer('q2', val)}
                className="grid grid-cols-3 gap-2 pt-1"
              >
                {q2Options.map(opt => (
                  <OptionPill
                    key={opt}
                    id={`q2-${opt}`}
                    value={opt}
                    label={opt}
                    selected={answers['q2'] === opt}
                    warn={opt === 'Positive' || opt === 'Unknown'}
                  />
                ))}
              </RadioGroup>
            </QuestionBlock>

            {/* Section header */}
            <div className="px-5 py-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                In the past 6 months — answer Yes or No
              </p>
            </div>

            {/* Q3–Q8 */}
            {QUESTIONS.map((q, i) => (
              <QuestionBlock
                key={q.id}
                number={String(i + 3)}
                question={q.text}
                required
              >
                <RadioGroup
                  value={answers[q.id]}
                  onValueChange={val => handleAnswer(q.id, val)}
                  className="flex gap-3 pt-1"
                >
                  {['No', 'Yes'].map(opt => (
                    <OptionPill
                      key={opt}
                      id={`${q.id}-${opt}`}
                      value={opt}
                      label={opt}
                      selected={answers[q.id] === opt}
                      warn={opt === 'Yes'}
                    />
                  ))}
                </RadioGroup>
              </QuestionBlock>
            ))}
          </>
        )}

        {/* Outcome banner */}
        <div className={`px-5 py-4 flex items-start gap-3 border-t-2 ${outcomeStyles[outcome.color]}`}>
          <outcome.Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Outcome: {outcome.severity}</p>
            <p className="text-xs mt-0.5 opacity-80">{outcome.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QuestionBlock({ number, question, required, children }: {
  number: string; question: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center mt-0.5">
          {number}
        </span>
        <p className="text-sm font-medium text-gray-800 leading-relaxed">
          {question}
          {required && <span className="text-red-400 ml-1">*</span>}
        </p>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

function OptionPill({ id, value, label, selected, danger, warn }: {
  id: string; value: string; label: string; selected: boolean;
  danger?: boolean; warn?: boolean;
}) {
  return (
    <div className="flex items-center">
      <RadioGroupItem value={value} id={id} className="sr-only" />
      <label
        htmlFor={id}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium cursor-pointer transition-all select-none ${
          selected
            ? danger
              ? 'border-red-500 bg-red-500 text-white'
              : warn
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-indigo-500 bg-indigo-500 text-white'
            : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50'
        }`}
      >
        {selected && (
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {label}
      </label>
    </div>
  );
}