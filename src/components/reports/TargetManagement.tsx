import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Skeleton } from '../ui/skeleton';
import { Save, RotateCcw, Target, Check, Clock, User, Trash2, Info, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { useTargets, TARGET_PROGRAMS, TARGET_DOMAINS } from './useReportData';

interface TargetManagementProps {
  currentUser: any;
}

export function TargetManagement({ currentUser }: TargetManagementProps) {
  const [selectedProgram, setSelectedProgram] = useState('Global');
  const [activeDomain, setActiveDomain] = useState('clinical');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager'].includes(currentUser?.role);
  const { targets, loading, saving, saveTargets, deleteTargets, getTarget, refetch } = useTargets();

  // Load current target values into the edit form when program/domain changes
  useEffect(() => {
    const domainDef = TARGET_DOMAINS.find(d => d.id === activeDomain);
    if (!domainDef) return;

    const values: Record<string, string> = {};
    domainDef.indicators.forEach(ind => {
      const currentTarget = getTarget(selectedProgram, activeDomain, ind.key);
      values[ind.key] = currentTarget !== undefined ? String(currentTarget) : '';
    });
    setEditValues(values);
    setHasChanges(false);
  }, [selectedProgram, activeDomain, targets]);

  const handleValueChange = (key: string, value: string) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const targetValues: Record<string, number> = {};
    Object.entries(editValues).forEach(([key, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        targetValues[key] = num;
      }
    });

    const success = await saveTargets(selectedProgram, activeDomain, targetValues, currentUser);
    if (success) {
      toast.success(`Targets saved for ${TARGET_PROGRAMS.find(p => p.id === selectedProgram)?.label || selectedProgram} - ${TARGET_DOMAINS.find(d => d.id === activeDomain)?.label}`);
      setHasChanges(false);
    } else {
      toast.error('Failed to save targets. Please try again.');
    }
  };

  const handleReset = () => {
    const domainDef = TARGET_DOMAINS.find(d => d.id === activeDomain);
    if (!domainDef) return;
    const values: Record<string, string> = {};
    domainDef.indicators.forEach(ind => {
      values[ind.key] = String(ind.defaultTarget);
    });
    setEditValues(values);
    setHasChanges(true);
  };

  const handleDelete = async () => {
    if (!confirm(`Remove all custom targets for ${TARGET_PROGRAMS.find(p => p.id === selectedProgram)?.label} - ${TARGET_DOMAINS.find(d => d.id === activeDomain)?.label}? Defaults will be used instead.`)) return;
    await deleteTargets(selectedProgram, activeDomain, currentUser);
    toast.success('Custom targets removed. Defaults will be used.');
  };

  const activeDomainDef = TARGET_DOMAINS.find(d => d.id === activeDomain);
  const existingRecord = targets[`${selectedProgram}:${activeDomain}`];

  // Summary: how many domains have custom targets per program
  const programSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    TARGET_PROGRAMS.forEach(p => {
      let count = 0;
      TARGET_DOMAINS.forEach(d => {
        if (targets[`${p.id}:${d.id}`]) count++;
      });
      summary[p.id] = count;
    });
    return summary;
  }, [targets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Program Target Management
          </h2>
          <p className="text-sm text-gray-500">
            Set performance targets per program and domain. Targets flow into all reporting dashboards.
          </p>
        </div>
        {!canEdit && (
          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> View only
          </Badge>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How target resolution works:</p>
              <ol className="list-decimal pl-4 space-y-0.5 text-xs">
                <li><strong>Program-specific target</strong> is checked first (e.g. NSP Program &rarr; Harm Reduction &rarr; NSP Return Rate)</li>
                <li>If not set, <strong>Global / All Programs</strong> target is used as fallback</li>
                <li>If neither exists, the <strong>system default</strong> is used</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Program Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TARGET_PROGRAMS.map(prog => (
          <Card
            key={prog.id}
            className={`cursor-pointer transition-all border-2 ${selectedProgram === prog.id ? 'border-indigo-500 shadow-md bg-indigo-50/30' : 'border-transparent shadow-sm hover:shadow-md'}`}
            onClick={() => setSelectedProgram(prog.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{prog.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {programSummary[prog.id] || 0} of {TARGET_DOMAINS.length} domains configured
                  </p>
                </div>
                {selectedProgram === prog.id && (
                  <Check className="w-5 h-5 text-indigo-600" />
                )}
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${((programSummary[prog.id] || 0) / TARGET_DOMAINS.length) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Domain Tabs + Target Editor */}
      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {TARGET_DOMAINS.map(d => {
            const hasCustom = !!targets[`${selectedProgram}:${d.id}`];
            return (
              <TabsTrigger
                key={d.id}
                value={d.id}
                className="text-xs rounded-full px-4 py-1.5 border data-[state=active]:bg-gray-900 data-[state=active]:text-white relative"
              >
                {d.label}
                {hasCustom && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-500 rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TARGET_DOMAINS.map(domain => (
          <TabsContent key={domain.id} value={domain.id} className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{domain.label} Targets</CardTitle>
                    <CardDescription className="text-xs">
                      Program: <strong>{TARGET_PROGRAMS.find(p => p.id === selectedProgram)?.label}</strong>
                      {existingRecord && (
                        <span className="ml-3 text-gray-400">
                          Last updated: {new Date(existingRecord.updatedAt).toLocaleDateString()} by {existingRecord.updatedByName || 'Unknown'}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      {existingRecord && (
                        <Button variant="ghost" size="sm" onClick={handleDelete} className="text-xs text-red-500 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Custom
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Defaults
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving} className="text-xs">
                        {saving ? (
                          <span className="animate-pulse">Saving...</span>
                        ) : (
                          <><Save className="w-3.5 h-3.5 mr-1" /> Save Targets</>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-500">
                      <div className="col-span-4">Indicator</div>
                      <div className="col-span-2 text-center">Unit</div>
                      <div className="col-span-2 text-center">Default</div>
                      <div className="col-span-2 text-center">Current Target</div>
                      <div className="col-span-2 text-center">Status</div>
                    </div>

                    {domain.indicators.map(ind => {
                      const currentVal = editValues[ind.key] || '';
                      const numVal = parseFloat(currentVal);
                      const defaultVal = ind.defaultTarget;
                      const isCustomized = !isNaN(numVal) && numVal !== defaultVal;
                      const isZeroTarget = numVal === 0 && ind.unit === 'count';

                      return (
                        <div
                          key={ind.key}
                          className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg items-center transition-colors ${isCustomized ? 'bg-indigo-50/50 border border-indigo-100' : 'hover:bg-gray-50'}`}
                        >
                          <div className="col-span-4">
                            <p className="text-sm font-medium text-gray-800">{ind.label}</p>
                            <p className="text-xs text-gray-400">{ind.key}</p>
                          </div>
                          <div className="col-span-2 text-center">
                            <Badge variant="outline" className="text-xs">
                              {ind.unit === 'percent' ? '%' : '#'}
                            </Badge>
                          </div>
                          <div className="col-span-2 text-center text-sm text-gray-400">
                            {defaultVal}{ind.unit === 'percent' ? '%' : ''}
                          </div>
                          <div className="col-span-2 text-center">
                            {canEdit ? (
                              <div className="relative">
                                <Input
                                  type="number"
                                  className="h-8 text-sm text-center w-24 mx-auto"
                                  value={currentVal}
                                  onChange={e => handleValueChange(ind.key, e.target.value)}
                                  min={0}
                                  max={ind.unit === 'percent' ? 100 : undefined}
                                  step={ind.unit === 'percent' ? 1 : 100}
                                />
                              </div>
                            ) : (
                              <span className="text-sm font-bold">
                                {currentVal}{ind.unit === 'percent' ? '%' : ''}
                              </span>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {isCustomized ? (
                              <Badge className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                Customized
                              </Badge>
                            ) : isZeroTarget ? (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                No target
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Unsaved Changes Warning */}
                {hasChanges && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>You have unsaved changes. Click <strong>Save Targets</strong> to apply.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Target Overview Grid */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Target Configuration Overview</CardTitle>
          <CardDescription className="text-xs">Summary of configured targets across all programs and domains</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="py-2 px-3 text-left font-semibold">Domain</th>
                  {TARGET_PROGRAMS.map(p => (
                    <th key={p.id} className="py-2 px-3 text-center font-semibold">{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TARGET_DOMAINS.filter(d => d.id !== 'kpi_overview').map(domain => (
                  <tr key={domain.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{domain.label}</td>
                    {TARGET_PROGRAMS.map(prog => {
                      const record = targets[`${prog.id}:${domain.id}`];
                      const customCount = record ? Object.keys(record.targets || {}).length : 0;
                      return (
                        <td key={prog.id} className="py-2 px-3 text-center">
                          {record ? (
                            <Badge className="text-xs bg-green-50 text-green-700 hover:bg-green-50 border border-green-200">
                              {customCount} set
                            </Badge>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
