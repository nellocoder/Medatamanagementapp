import { useState, useEffect, useCallback, useRef } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521`;
const headers = { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

export interface ReportFilters {
  period: string;
  dateFrom: string;
  dateTo: string;
  county: string;
  subCounty: string;
  program: string;
  serviceCategory: string;
  sex: string;
  ageGroup: string;
}

export const DEFAULT_FILTERS: ReportFilters = {
  period: 'month',
  dateFrom: '',
  dateTo: '',
  county: 'all',
  subCounty: 'all',
  program: 'all',
  serviceCategory: 'all',
  sex: 'all',
  ageGroup: 'all',
};

export function getDateRange(period: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().split('T')[0];
  let dateFrom = '';
  
  switch (period) {
    case 'today':
      dateFrom = dateTo;
      break;
    case 'week':
      const w = new Date(now); w.setDate(w.getDate() - 7);
      dateFrom = w.toISOString().split('T')[0];
      break;
    case 'month':
      const m = new Date(now); m.setMonth(m.getMonth() - 1);
      dateFrom = m.toISOString().split('T')[0];
      break;
    case 'quarter':
      const q = new Date(now); q.setMonth(q.getMonth() - 3);
      dateFrom = q.toISOString().split('T')[0];
      break;
    case 'year':
      const y = new Date(now); y.setFullYear(y.getFullYear() - 1);
      dateFrom = y.toISOString().split('T')[0];
      break;
    case 'custom':
      return { dateFrom: '', dateTo: '' };
    default:
      dateFrom = '';
  }
  return { dateFrom, dateTo };
}

// Cache for report data
const dataCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 60000; // 1 minute

export function useReportData(filters: ReportFilters) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Abort previous request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const { dateFrom, dateTo } = filters.period === 'custom'
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : getDateRange(filters.period);

    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (filters.county !== 'all') params.set('county', filters.county);
    if (filters.subCounty !== 'all') params.set('subCounty', filters.subCounty);
    if (filters.program !== 'all') params.set('program', filters.program);
    if (filters.sex !== 'all') params.set('sex', filters.sex);
    if (filters.ageGroup !== 'all') params.set('ageGroup', filters.ageGroup);

    const cacheKey = params.toString();
    const cached = dataCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/reports/comprehensive-metrics?${params.toString()}`,
        { headers, signal: controller.signal }
      );
      const result = await response.json();
      if (result.success) {
        dataCache[cacheKey] = { data: result.data, timestamp: Date.now() };
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load report data');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Report data fetch error:', err);
        setError('Failed to connect to reporting service');
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function logReportAction(currentUser: any, reportType: string, filters: any, exportType?: string, rowCount?: number) {
  fetch(`${API_BASE}/reports/audit-log`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      userId: currentUser?.id,
      userName: currentUser?.name || currentUser?.email,
      reportType,
      filters,
      exportType,
      rowCount,
    }),
  }).catch(err => console.error('Failed to log report action:', err));
}

export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(','),
    ...data.map(row => keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== TARGET MANAGEMENT ====================

export interface ProgramTarget {
  program: string;
  domain: string;
  targets: Record<string, number>; // indicatorKey -> target value
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

// All programs that can have targets
export const TARGET_PROGRAMS = [
  { id: 'NSP', label: 'NSP Program' },
  { id: 'MAT', label: 'MAT / Methadone Program' },
  { id: 'Stimulants', label: 'Stimulants Program' },
  { id: 'Global', label: 'Global / All Programs' },
];

// All domains with their indicators
export const TARGET_DOMAINS: { id: string; label: string; indicators: { key: string; label: string; unit: 'percent' | 'count'; defaultTarget: number }[] }[] = [
  {
    id: 'clinical', label: 'Clinical',
    indicators: [
      { key: 'hiv_tests', label: 'HIV Tests Conducted', unit: 'percent', defaultTarget: 90 },
      { key: 'sti_screenings', label: 'STI Screenings', unit: 'percent', defaultTarget: 80 },
      { key: 'tb_screenings', label: 'TB Screenings', unit: 'percent', defaultTarget: 85 },
      { key: 'prep_initiations', label: 'PrEP Initiations', unit: 'percent', defaultTarget: 10 },
      { key: 'vitals_recorded', label: 'Vitals Recorded', unit: 'percent', defaultTarget: 75 },
    ],
  },
  {
    id: 'mental_health', label: 'Mental Health',
    indicators: [
      { key: 'phq9_screenings', label: 'PHQ-9 Screenings', unit: 'percent', defaultTarget: 50 },
      { key: 'gad7_screenings', label: 'GAD-7 Screenings', unit: 'percent', defaultTarget: 50 },
      { key: 'assist_screenings', label: 'ASSIST Screenings', unit: 'percent', defaultTarget: 60 },
      { key: 'phq9_improvement', label: 'PHQ-9 Improvement Rate', unit: 'percent', defaultTarget: 60 },
      { key: 'counseling_sessions', label: 'Counseling Sessions', unit: 'percent', defaultTarget: 40 },
    ],
  },
  {
    id: 'harm_reduction', label: 'Harm Reduction',
    indicators: [
      { key: 'nsp_distributions', label: 'NSP Distributions', unit: 'percent', defaultTarget: 80 },
      { key: 'syringes_distributed', label: 'Syringes Distributed', unit: 'count', defaultTarget: 25000 },
      { key: 'nsp_return_rate', label: 'NSP Return Rate', unit: 'percent', defaultTarget: 50 },
      { key: 'naloxone_kits', label: 'Naloxone Kits Distributed', unit: 'percent', defaultTarget: 20 },
      { key: 'condoms_distributed', label: 'Condoms Distributed', unit: 'count', defaultTarget: 5000 },
    ],
  },
  {
    id: 'protection', label: 'Protection / GBV',
    indicators: [
      { key: 'gbv_screenings', label: 'GBV Screenings', unit: 'percent', defaultTarget: 30 },
      { key: 'cases_opened', label: 'Cases Opened', unit: 'count', defaultTarget: 0 },
      { key: 'cases_resolved', label: 'Cases Resolved', unit: 'percent', defaultTarget: 70 },
      { key: 'resolution_rate', label: 'Resolution Rate', unit: 'percent', defaultTarget: 70 },
      { key: 'legal_referrals', label: 'Legal Referrals', unit: 'percent', defaultTarget: 50 },
    ],
  },
  {
    id: 'social', label: 'Social & Structural',
    indicators: [
      { key: 'id_assistance', label: 'ID Assistance', unit: 'percent', defaultTarget: 15 },
      { key: 'housing_support', label: 'Housing Support', unit: 'percent', defaultTarget: 10 },
      { key: 'vocational_support', label: 'Vocational Support', unit: 'percent', defaultTarget: 10 },
      { key: 'family_integration', label: 'Family Integration', unit: 'percent', defaultTarget: 5 },
      { key: 'psychosocial_sessions', label: 'Psychosocial Sessions', unit: 'percent', defaultTarget: 30 },
    ],
  },
  {
    id: 'hiv_art', label: 'HIV & ART',
    indicators: [
      { key: 'hiv_enrolled', label: 'HIV Clients Enrolled', unit: 'count', defaultTarget: 0 },
      { key: 'active_on_art', label: 'Active on ART', unit: 'percent', defaultTarget: 90 },
      { key: 'viral_suppression', label: 'Viral Suppression Rate', unit: 'percent', defaultTarget: 95 },
      { key: 'vl_tests_done', label: 'VL Tests Done', unit: 'percent', defaultTarget: 80 },
      { key: 'art_retention', label: 'ART Retention', unit: 'percent', defaultTarget: 85 },
    ],
  },
  {
    id: 'mat', label: 'MAT',
    indicators: [
      { key: 'mat_enrollments', label: 'MAT Enrollments', unit: 'count', defaultTarget: 0 },
      { key: 'active_mat_clients', label: 'Active MAT Clients', unit: 'count', defaultTarget: 0 },
      { key: 'mat_retention_rate', label: 'MAT Retention Rate', unit: 'percent', defaultTarget: 80 },
      { key: 'witnessed_doses', label: 'Witnessed Doses', unit: 'count', defaultTarget: 0 },
      { key: 'takehome_doses', label: 'Take-Home Doses', unit: 'count', defaultTarget: 0 },
    ],
  },
  {
    id: 'kpi_overview', label: 'Overview KPIs',
    indicators: [
      { key: 'unique_clients_served', label: 'Unique Clients Served', unit: 'count', defaultTarget: 0 },
      { key: 'total_service_contacts', label: 'Total Service Contacts', unit: 'count', defaultTarget: 0 },
      { key: 'active_hiv_clients', label: 'Active HIV Clients', unit: 'count', defaultTarget: 0 },
      { key: 'viral_suppression_rate', label: 'Viral Suppression Rate', unit: 'percent', defaultTarget: 95 },
      { key: 'mat_retention_rate_kpi', label: 'MAT Retention Rate', unit: 'percent', defaultTarget: 80 },
      { key: 'nsp_return_rate_kpi', label: 'NSP Return Rate', unit: 'percent', defaultTarget: 50 },
      { key: 'phq9_improvement_rate', label: 'PHQ-9 Improvement Rate', unit: 'percent', defaultTarget: 60 },
      { key: 'violence_cases_resolved', label: 'Violence Cases Resolved', unit: 'count', defaultTarget: 0 },
    ],
  },
];

// Cache for targets
let targetCache: { data: Record<string, any>; timestamp: number } | null = null;
const TARGET_CACHE_TTL = 30000; // 30 seconds

export function useTargets(program?: string) {
  const [targets, setTargets] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTargets = useCallback(async () => {
    if (targetCache && Date.now() - targetCache.timestamp < TARGET_CACHE_TTL) {
      setTargets(targetCache.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = program && program !== 'all' ? `?program=${encodeURIComponent(program)}` : '';
      const response = await fetch(`${API_BASE}/reports/targets${params}`, { headers });
      const result = await response.json();
      if (result.success) {
        targetCache = { data: result.targets || {}, timestamp: Date.now() };
        setTargets(result.targets || {});
      }
    } catch (err) {
      console.error('Error fetching targets:', err);
    } finally {
      setLoading(false);
    }
  }, [program]);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  const saveTargets = async (prog: string, domain: string, targetValues: Record<string, number>, currentUser: any) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/reports/targets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          program: prog,
          domain,
          targets: targetValues,
          userId: currentUser?.id,
          userName: currentUser?.name || currentUser?.email,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Invalidate cache and refetch
        targetCache = null;
        await fetchTargets();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving targets:', err);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteTargets = async (prog: string, domain: string, currentUser: any) => {
    try {
      await fetch(`${API_BASE}/reports/targets`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ program: prog, domain, userId: currentUser?.id }),
      });
      targetCache = null;
      await fetchTargets();
    } catch (err) {
      console.error('Error deleting targets:', err);
    }
  };

  // Helper: get the target value for a specific program + domain + indicator
  const getTarget = (prog: string, domain: string, indicatorKey: string): number | undefined => {
    // First check program-specific target
    const programTarget = targets[`${prog}:${domain}`];
    if (programTarget?.targets?.[indicatorKey] !== undefined) {
      return programTarget.targets[indicatorKey];
    }
    // Fall back to Global target
    const globalTarget = targets[`Global:${domain}`];
    if (globalTarget?.targets?.[indicatorKey] !== undefined) {
      return globalTarget.targets[indicatorKey];
    }
    // Fall back to default
    const domainDef = TARGET_DOMAINS.find(d => d.id === domain);
    const indDef = domainDef?.indicators.find(i => i.key === indicatorKey);
    return indDef?.defaultTarget;
  };

  return { targets, loading, saving, saveTargets, deleteTargets, getTarget, refetch: fetchTargets };
}