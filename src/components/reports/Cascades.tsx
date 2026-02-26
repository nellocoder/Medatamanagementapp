import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Download, ArrowDown } from 'lucide-react';
import { useReportData, DEFAULT_FILTERS, exportToCSV, logReportAction, type ReportFilters } from './useReportData';
import { ReportFilterBar } from './ReportFilterBar';

interface CascadesProps {
  currentUser: any;
}

const CASCADE_TYPES = [
  { id: 'hiv', label: 'HIV Cascade', colors: ['#3b82f6', '#6366f1', '#8b5cf6', '#10b981', '#059669'] },
  { id: 'mat', label: 'MAT Cascade', colors: ['#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'] },
  { id: 'protection', label: 'Protection Cascade', colors: ['#ef4444', '#f97316', '#f59e0b', '#22c55e'] },
];

function CascadeFunnel({ stages, colors }: { stages: { stage: string; value: number }[]; colors: string[] }) {
  const maxVal = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="space-y-1">
      {stages.map((stage, idx) => {
        const widthPct = Math.max(15, (stage.value / maxVal) * 100);
        const conversionPct = idx > 0 && stages[idx - 1].value > 0
          ? Math.round((stage.value / stages[idx - 1].value) * 100) : null;

        return (
          <div key={stage.stage}>
            {idx > 0 && (
              <div className="flex items-center justify-center py-1">
                <ArrowDown className="w-4 h-4 text-gray-300" />
                {conversionPct !== null && (
                  <Badge variant="outline" className={`ml-2 text-xs ${conversionPct >= 90 ? 'bg-green-50 text-green-700' : conversionPct >= 70 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                    {conversionPct}% conversion
                  </Badge>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-28 text-right text-sm font-medium text-gray-600 shrink-0">
                {stage.stage}
              </div>
              <div className="flex-1 relative">
                <div
                  className="h-12 rounded-lg flex items-center justify-center transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: colors[idx % colors.length],
                    margin: '0 auto',
                    marginLeft: `${(100 - widthPct) / 2}%`,
                  }}
                >
                  <span className="text-white font-bold text-lg relative z-10">{stage.value.toLocaleString()}</span>
                  <div className="absolute inset-0 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Cascades({ currentUser }: CascadesProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_FILTERS);
  const [activeCascade, setActiveCascade] = useState('hiv');
  const { data, loading } = useReportData(filters);

  const cascades = data?.cascades || {};

  const handleExport = () => {
    const stages = cascades[activeCascade] || [];
    const rows = stages.map((s: any, idx: number) => ({
      Stage: s.stage,
      Value: s.value,
      'Conversion %': idx > 0 && stages[idx - 1].value > 0 ? `${Math.round((s.value / stages[idx - 1].value) * 100)}%` : '-',
    }));
    exportToCSV(rows, `cascade_${activeCascade}`);
    logReportAction(currentUser, `Cascade - ${activeCascade}`, filters, 'CSV', rows.length);
  };

  return (
    <div className="space-y-6">
      <ReportFilterBar filters={filters} onChange={setFilters} compact />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Service Cascades</h2>
          <p className="text-sm text-gray-500">Visual cascade analysis with stage-to-stage conversion rates</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
      </div>

      <Tabs value={activeCascade} onValueChange={setActiveCascade}>
        <TabsList className="bg-transparent p-0 gap-1">
          {CASCADE_TYPES.map(ct => (
            <TabsTrigger key={ct.id} value={ct.id} className="text-xs rounded-full px-4 py-1.5 border data-[state=active]:bg-gray-900 data-[state=active]:text-white">
              {ct.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CASCADE_TYPES.map(ct => (
          <TabsContent key={ct.id} value={ct.id} className="mt-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{ct.label}</CardTitle>
                <CardDescription className="text-xs">
                  {ct.id === 'hiv' ? 'HIV Testing → Diagnosis → Enrollment → ART → Viral Suppression' :
                   ct.id === 'mat' ? 'Screening → Enrollment → Active Treatment → 6-Month Retention' :
                   'Screening → Identification → Case Opened → Resolution'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {loading ? <Skeleton className="h-[300px]" /> : (
                  <CascadeFunnel stages={cascades[ct.id] || []} colors={ct.colors} />
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            {!loading && cascades[ct.id] && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {(cascades[ct.id] || []).map((stage: any, idx: number) => {
                  const prev = idx > 0 ? cascades[ct.id][idx - 1] : null;
                  const conv = prev && prev.value > 0 ? Math.round((stage.value / prev.value) * 100) : null;
                  return (
                    <Card key={stage.stage} className="border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-gray-500 mb-1">{stage.stage}</p>
                        <p className="text-2xl font-bold">{stage.value.toLocaleString()}</p>
                        {conv !== null && (
                          <Badge variant="outline" className={`mt-1 text-xs ${conv >= 90 ? 'text-green-600' : conv >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                            {conv}% from prev
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
