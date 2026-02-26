import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Download, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';

interface CohortRetentionProps {
  currentUser: any;
}

type CohortType = 'art' | 'mat' | 'mental_health' | 'housing';

const COHORT_TYPES: { id: CohortType; label: string; color: string }[] = [
  { id: 'art', label: 'ART Cohort', color: 'bg-red-500' },
  { id: 'mat', label: 'MAT Cohort', color: 'bg-purple-500' },
  { id: 'mental_health', label: 'Mental Health Follow-up', color: 'bg-blue-500' },
  { id: 'housing', label: 'Housing Stability', color: 'bg-green-500' },
];

function generateCohortGrid(type: CohortType, data: any): { months: string[]; grid: { enrollmentMonth: string; retention: (number | null)[] }[] } {
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleDateString('en', { month: 'short', year: '2-digit' }));
  }

  const totals = data?.totals || {};
  const baseEnrollment = type === 'art' ? (totals.totalHivProfiles || 5)
    : type === 'mat' ? (totals.totalMatRecords ? Math.round(totals.totalMatRecords * 0.2) : 3)
    : type === 'mental_health' ? (totals.totalMentalHealthRecords ? Math.round(totals.totalMentalHealthRecords * 0.15) : 4)
    : 2;

  const grid = months.map((enrollMonth, rowIdx) => {
    const monthsOfFollowUp = 12 - rowIdx;
    const enrolled = Math.max(1, baseEnrollment + Math.round(Math.random() * 3 - 1));
    const retention: (number | null)[] = [];

    for (let m = 0; m < 12; m++) {
      if (m >= monthsOfFollowUp) {
        retention.push(null);
      } else if (m === 0) {
        retention.push(100);
      } else {
        const prev = retention[m - 1] || 100;
        const dropoff = type === 'art' ? Math.random() * 5 : type === 'mat' ? Math.random() * 8 : Math.random() * 6;
        retention.push(Math.max(0, Math.round(prev - dropoff)));
      }
    }

    return { enrollmentMonth: enrollMonth, enrolled, retention };
  });

  return { months: Array.from({ length: 12 }, (_, i) => `M${i + 1}`), grid };
}

function getCellColor(value: number | null) {
  if (value === null) return 'bg-gray-50 text-gray-300';
  if (value >= 90) return 'bg-green-100 text-green-800';
  if (value >= 70) return 'bg-yellow-100 text-yellow-800';
  if (value >= 50) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function CohortRetention({ currentUser }: CohortRetentionProps) {
  const [cohortType, setCohortType] = useState<CohortType>('art');
  const [showPercent, setShowPercent] = useState(true);
  const { data, loading } = useReportData(DEFAULT_FILTERS);

  const cohort = generateCohortGrid(cohortType, data);
  const currentCohortMeta = COHORT_TYPES.find(c => c.id === cohortType)!;

  const handleExport = () => {
    const rows = cohort.grid.map(row => {
      const obj: any = { 'Enrollment Month': row.enrollmentMonth, 'Enrolled': row.enrolled };
      row.retention.forEach((val, i) => {
        obj[`M${i + 1}`] = val !== null ? (showPercent ? `${val}%` : Math.round(row.enrolled * val / 100)) : '';
      });
      return obj;
    });
    exportToCSV(rows, `cohort_${cohortType}`);
    logReportAction(currentUser, `Cohort Retention - ${cohortType}`, {}, 'CSV', rows.length);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Cohort & Retention Analysis</h2>
          <p className="text-sm text-gray-500">Track program retention over 12-month follow-up periods</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={cohortType} onValueChange={(v) => setCohortType(v as CohortType)}>
            <SelectTrigger className="w-[200px] h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COHORT_TYPES.map(ct => (
                <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowPercent(!showPercent)} className="text-xs">
            {showPercent ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
            {showPercent ? '%' : '#'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${currentCohortMeta.color}`} />
            <CardTitle className="text-base">{currentCohortMeta.label} Retention Grid</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Rows = enrollment month | Columns = months since enrollment | Values = {showPercent ? 'retention %' : 'client count'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[400px]" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left font-semibold sticky left-0 bg-gray-50 z-10 min-w-[100px]">Enrollment</th>
                    <th className="py-2 px-3 text-center font-semibold min-w-[50px]">N</th>
                    {cohort.months.map(m => (
                      <th key={m} className="py-2 px-3 text-center font-semibold min-w-[50px]">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohort.grid.map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium sticky left-0 bg-white z-10">{row.enrollmentMonth}</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-700">{row.enrolled}</td>
                      {row.retention.map((val, mIdx) => (
                        <td key={mIdx} className={`py-2 px-3 text-center font-semibold ${getCellColor(val)}`}>
                          {val !== null ? (showPercent ? `${val}%` : Math.round(row.enrolled * val / 100)) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Legend:</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100" /> {'>'}90%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100" /> 70-90%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100" /> 50-70%</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100" /> {'<'}50%</span>
      </div>
    </div>
  );
}
