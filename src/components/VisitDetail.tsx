import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import {
  ArrowLeft, Calendar, User, MapPin, FileText, Download,
  AlertTriangle, Activity, Heart, Brain, Syringe, Shield, ClipboardList
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { ClinicalModule } from './visit-modules/ClinicalModule';
import { MentalHealthModule } from './visit-modules/MentalHealthModule';
import { PsychosocialModule } from './visit-modules/PsychosocialModule';
import { NSPModule } from './visit-modules/NSPModule';
import { CondomModule } from './visit-modules/CondomModule';
import { MATModule } from './visit-modules/MATModule';
import { VisitSummary } from './visit-modules/VisitSummary';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface VisitDetailProps {
  visit: any;
  client: any;
  onBack: () => void;
  currentUser: any;
  onUpdate: () => void;
}

export function VisitDetail({ visit: initialVisit, client, onBack, currentUser, onUpdate }: VisitDetailProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [flags, setFlags] = useState<any[]>([]);
  const [fullVisit, setFullVisit] = useState<any>(initialVisit);
  const [loading, setLoading] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFlags();
    fetchFullVisit();
  }, [initialVisit.id]);

  const fetchFullVisit = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/${initialVisit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.visit) {
        setFullVisit(data.visit);
      } else {
        setFullVisit(initialVisit);
      }
    } catch (error) {
      console.error('Error fetching visit:', error);
      setFullVisit(initialVisit);
    } finally {
      setLoading(false);
    }
  };

  const loadFlags = async () => {
    if (client.flags && Array.isArray(client.flags)) {
      setFlags(client.flags);
    }
  };

  const prepRastData = fullVisit.metadata?.screenings?.prepRast;
  const showPrepRastSummary = prepRastData && (prepRastData.eligible || prepRastData.severity === 'high');

  const getRiskDescription = (qid: string, answer: string) => {
    if (answer !== 'Yes' && answer !== 'Positive' && answer !== 'Unknown') return null;
    if (qid === 'q1' && answer === 'Positive') return 'Self-reported HIV Positive Status';
    if (qid === 'q2' && (answer === 'Positive' || answer === 'Unknown')) return 'Partner HIV Status (Positive/Unknown)';
    const descriptions: Record<string, string> = {
      'q3': 'Unprotected sex with partner of unknown/positive status',
      'q4': 'Engagement in transactional sex',
      'q5': 'Recent STI diagnosis/treatment',
      'q6': 'Sharing of needles/injection equipment',
      'q7': 'History of sexual violence or coercion',
      'q8': 'Recurrent use of PEP (2+ times)',
    };
    return descriptions[qid];
  };

  const riskFactors = showPrepRastSummary && prepRastData.answers
    ? Object.entries(prepRastData.answers)
        .map(([k, v]) => ({ id: k, desc: getRiskDescription(k, v as string) }))
        .filter(item => item.desc)
    : [];

  const isAdmin = currentUser?.role === 'Admin';

  const canViewClinical = isAdmin ||
    hasPermission(currentUser?.permissions || [], PERMISSIONS.CLINICAL_VIEW) ||
    currentUser?.role === 'Clinician' || currentUser?.role === 'Nurse';

  const canEditClinical = isAdmin ||
    hasPermission(currentUser?.permissions || [], PERMISSIONS.CLINICAL_EDIT) ||
    currentUser?.role === 'Clinician';

  const canViewMentalHealth = isAdmin ||
    hasPermission(currentUser?.permissions || [], PERMISSIONS.VISIT_VIEW) ||
    currentUser?.role === 'Psychologist' || currentUser?.role === 'Counselor';

  const canEditMentalHealth = isAdmin ||
    currentUser?.role === 'Psychologist' || currentUser?.role === 'Counselor';

  const canViewPsychosocial = isAdmin ||
    currentUser?.role === 'Social Worker' || currentUser?.role === 'Paralegal' ||
    currentUser?.role === 'Counselor' || currentUser?.role === 'Program Manager';

  const canViewNSP = isAdmin ||
    currentUser?.role === 'Outreach Worker' || currentUser?.role === 'NSP Staff' ||
    currentUser?.role === 'Clinician';

  const canViewCondom = isAdmin ||
    currentUser?.role === 'Outreach Worker' || currentUser?.role === 'HTS Counselor' ||
    currentUser?.role === 'Counselor';

  const canViewMAT = isAdmin ||
    currentUser?.role === 'Clinician' || currentUser?.role === 'Nurse' ||
    currentUser?.role === 'MAT Staff';

  const canEditMAT = isAdmin ||
    currentUser?.role === 'Clinician' || currentUser?.role === 'MAT Staff';

  // ── PDF: clones the live rendered summary HTML into a professional print window ──
  const handleExportPDF = async () => {
    const summaryEl = summaryRef.current;
    if (!summaryEl) {
      toast.error("Summary not loaded yet — please wait a moment and try again.");
      return;
    }
    const fmtDate = (d: string) => d
      ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—';

    // Fetch logo and convert to base64 so it embeds directly — avoids CORS blocks in print windows
    let logoSrc = '';
    try {
      const logoUrl = "https://media.licdn.com/dms/image/v2/D4D0BAQGThQDf1alOCg/company-logo_100_100/company-logo_100_100/0/1720415139542?e=1773878400&v=beta&t=RAbUWTpfDD9aVw9kyDj8DKHHDXLiP3SzOwKf8804taQ";
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      logoSrc = ''; // Logo unavailable — print continues without it
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups.");

    // Clone the exact rendered HTML of the summary tab
    const summaryHTML = summaryEl.innerHTML;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Visit Report — ${client.firstName} ${client.lastName}</title>
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm 22mm 10mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 10px; color: #0f172a; line-height: 1.5;
      background: #fff;
    }

    /* Watermark */
    .pdf-watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px; font-weight: 900; letter-spacing: 10px;
      color: rgba(15,23,42,0.04); z-index: -1; pointer-events: none;
    }

    /* Header */
    .pdf-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding-bottom: 10px; border-bottom: 2.5px solid #0f172a; margin-bottom: 12px;
    }
    .pdf-logo-row { display: flex; align-items: center; gap: 10px; }
    .pdf-logo-row img { height: 46px; border-radius: 6px; }
    .pdf-org { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; }
    .pdf-subtitle { font-size: 10px; color: #4f46e5; font-weight: 600; margin-top: 2px; }
    .pdf-meta { text-align: right; font-size: 8px; color: #64748b; line-height: 1.8; }
    .pdf-meta strong { color: #0f172a; font-size: 9px; }
    .pdf-conf-pill {
      display: inline-block; background: #fef2f2; color: #991b1b;
      border: 1px solid #fca5a5; border-radius: 3px;
      padding: 1px 7px; font-size: 7.5px; font-weight: 700;
      letter-spacing: 0.5px; margin-bottom: 3px;
    }

    /* Client bar */
    .pdf-client-bar {
      background: #1e293b; color: white; border-radius: 6px 6px 0 0;
      padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
    }
    .pdf-client-name { font-size: 13px; font-weight: 700; }
    .pdf-client-id { font-size: 8px; color: #94a3b8; margin-top: 1px; }
    .pdf-client-prog { font-size: 8px; color: #94a3b8; text-align: right; }
    .pdf-client-grid {
      background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;
      border-radius: 0 0 6px 6px; padding: 8px 12px; margin-bottom: 14px;
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    }
    .pdf-ci-label { font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; font-weight: 600; }
    .pdf-ci-val { font-size: 9px; font-weight: 500; color: #1e293b; margin-top: 2px; }

    /* Section divider */
    .pdf-section-title {
      font-size: 10px; font-weight: 800; color: #0f172a; text-transform: uppercase;
      letter-spacing: 0.6px; border-bottom: 2px solid #e2e8f0;
      padding-bottom: 4px; margin: 0 0 12px;
    }

    /* Footer */
    .pdf-footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: white; border-top: 1.5px solid #e2e8f0;
      padding: 5px 10mm; display: flex; justify-content: space-between;
      align-items: center; font-size: 7.5px; color: #94a3b8;
    }
    .pdf-footer-c { text-align: center; flex: 1; }
    .pdf-footer-b { color: #0f172a; font-weight: 700; font-size: 8px; }

    /* ── Tailwind utility classes (inline so cloned HTML renders correctly) ── */
    .grid { display: grid; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .justify-between { justify-content: space-between; }
    .justify-end { justify-content: flex-end; }
    .gap-1 { gap: 4px; } .gap-1\\.5 { gap: 6px; } .gap-2 { gap: 8px; }
    .gap-3 { gap: 12px; } .gap-4 { gap: 16px; } .gap-6 { gap: 24px; }
    .space-y-1 > * + * { margin-top: 4px; }
    .space-y-2 > * + * { margin-top: 8px; }
    .space-y-3 > * + * { margin-top: 12px; }
    .space-y-4 > * + * { margin-top: 16px; }
    .space-y-6 > * + * { margin-top: 24px; }
    .p-1 { padding: 4px; } .p-2 { padding: 8px; } .p-3 { padding: 12px; } .p-4 { padding: 16px; }
    .px-2 { padding-left: 8px; padding-right: 8px; }
    .px-2\\.5 { padding-left: 10px; padding-right: 10px; }
    .px-3 { padding-left: 12px; padding-right: 12px; }
    .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; }
    .py-1 { padding-top: 4px; padding-bottom: 4px; }
    .py-1\\.5 { padding-top: 6px; padding-bottom: 6px; }
    .py-2 { padding-top: 8px; padding-bottom: 8px; }
    .pt-2 { padding-top: 8px; } .pt-3 { padding-top: 12px; } .pt-4 { padding-top: 16px; }
    .pb-2 { padding-bottom: 8px; } .pb-3 { padding-bottom: 12px; }
    .pl-4 { padding-left: 16px; } .pl-5 { padding-left: 20px; }
    .mb-1 { margin-bottom: 4px; } .mb-2 { margin-bottom: 8px; }
    .mb-3 { margin-bottom: 12px; } .mb-4 { margin-bottom: 16px; }
    .mt-0\\.5 { margin-top: 2px; } .mt-1 { margin-top: 4px; } .mt-1\\.5 { margin-top: 6px; }
    .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; }
    .mr-1 { margin-right: 4px; } .mr-1\\.5 { margin-right: 6px; } .mr-2 { margin-right: 8px; }
    .ml-1 { margin-left: 4px; }
    .text-xs { font-size: 10px; line-height: 1.4; }
    .text-sm { font-size: 11px; line-height: 1.4; }
    .text-base { font-size: 13px; }
    .text-lg { font-size: 15px; }
    .text-xl { font-size: 17px; }
    .text-2xl { font-size: 19px; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .capitalize { text-transform: capitalize; }
    .tracking-wide { letter-spacing: 0.025em; }
    .tracking-wider { letter-spacing: 0.05em; }
    .leading-tight { line-height: 1.25; }
    .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .whitespace-nowrap { white-space: nowrap; }
    .break-words { word-break: break-word; }
    /* Colors */
    .text-white { color: #fff; }
    .text-gray-300 { color: #d1d5db; } .text-gray-400 { color: #9ca3af; }
    .text-gray-500 { color: #6b7280; } .text-gray-600 { color: #4b5563; }
    .text-gray-700 { color: #374151; } .text-gray-800 { color: #1f2937; }
    .text-gray-900 { color: #111827; }
    .text-slate-400 { color: #94a3b8; } .text-slate-500 { color: #64748b; }
    .text-slate-600 { color: #475569; } .text-slate-700 { color: #334155; }
    .text-indigo-600 { color: #4f46e5; } .text-indigo-700 { color: #4338ca; }
    .text-blue-600 { color: #2563eb; } .text-blue-700 { color: #1d4ed8; }
    .text-blue-800 { color: #1e40af; }
    .text-green-600 { color: #16a34a; } .text-green-700 { color: #15803d; }
    .text-green-800 { color: #166534; }
    .text-red-500 { color: #ef4444; } .text-red-600 { color: #dc2626; }
    .text-red-700 { color: #b91c1c; } .text-red-800 { color: #991b1b; }
    .text-amber-600 { color: #d97706; } .text-amber-700 { color: #b45309; }
    .text-amber-800 { color: #92400e; } .text-amber-900 { color: #78350f; }
    .text-yellow-600 { color: #ca8a04; } .text-yellow-700 { color: #a16207; }
    .text-orange-700 { color: #c2410c; }
    .text-purple-600 { color: #9333ea; } .text-purple-700 { color: #7e22ce; }
    .text-pink-700 { color: #be185d; }
    .text-teal-600 { color: #0d9488; } .text-teal-700 { color: #0f766e; }
    .text-rose-600 { color: #e11d48; } .text-rose-700 { color: #be123c; }
    .text-cyan-700 { color: #0e7490; }
    /* Backgrounds */
    .bg-white { background: #fff; }
    .bg-gray-50 { background: #f9fafb; } .bg-gray-100 { background: #f3f4f6; }
    .bg-gray-200 { background: #e5e7eb; }
    .bg-slate-50 { background: #f8fafc; } .bg-slate-100 { background: #f1f5f9; }
    .bg-indigo-50 { background: #eef2ff; } .bg-indigo-100 { background: #e0e7ff; }
    .bg-blue-50 { background: #eff6ff; } .bg-blue-100 { background: #dbeafe; }
    .bg-green-50 { background: #f0fdf4; } .bg-green-100 { background: #dcfce7; }
    .bg-red-50 { background: #fef2f2; } .bg-red-100 { background: #fee2e2; }
    .bg-amber-50 { background: #fffbeb; } .bg-amber-100 { background: #fef3c7; }
    .bg-yellow-50 { background: #fefce8; } .bg-yellow-100 { background: #fef9c3; }
    .bg-orange-50 { background: #fff7ed; } .bg-orange-100 { background: #ffedd5; }
    .bg-purple-50 { background: #faf5ff; } .bg-purple-100 { background: #ede9fe; }
    .bg-pink-50 { background: #fdf2f8; }
    .bg-teal-50 { background: #f0fdfa; } .bg-teal-100 { background: #ccfbf1; }
    .bg-rose-50 { background: #fff1f2; } .bg-rose-100 { background: #ffe4e6; }
    .bg-cyan-50 { background: #ecfeff; }
    /* Borders */
    .border { border: 1px solid #e5e7eb; }
    .border-0 { border: none; }
    .border-b { border-bottom: 1px solid #e5e7eb; }
    .border-t { border-top: 1px solid #e5e7eb; }
    .border-l { border-left: 1px solid #e5e7eb; }
    .border-l-2 { border-left-width: 2px; }
    .border-l-4 { border-left-width: 4px; }
    .border-gray-100 { border-color: #f3f4f6; }
    .border-gray-200 { border-color: #e5e7eb; }
    .border-slate-200 { border-color: #e2e8f0; }
    .border-indigo-100 { border-color: #e0e7ff; } .border-indigo-200 { border-color: #c7d2fe; }
    .border-blue-100 { border-color: #dbeafe; } .border-blue-200 { border-color: #bfdbfe; }
    .border-green-100 { border-color: #dcfce7; } .border-green-200 { border-color: #bbf7d0; }
    .border-red-200 { border-color: #fecaca; } .border-red-300 { border-color: #fca5a5; }
    .border-amber-100 { border-color: #fde68a; } .border-amber-200 { border-color: #fcd34d; }
    .border-amber-300 { border-color: #fbbf24; }
    .border-purple-100 { border-color: #ede9fe; } .border-purple-200 { border-color: #ddd6fe; }
    .border-teal-100 { border-color: #ccfbf1; }
    .border-orange-100 { border-color: #ffedd5; }
    .border-rose-100 { border-color: #ffe4e6; } .border-rose-200 { border-color: #fecdd3; }
    /* Border radius */
    .rounded { border-radius: 4px; } .rounded-md { border-radius: 6px; }
    .rounded-lg { border-radius: 8px; } .rounded-xl { border-radius: 12px; }
    .rounded-full { border-radius: 9999px; }
    .rounded-t-lg { border-top-left-radius: 8px; border-top-right-radius: 8px; }
    /* Shadows */
    .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    /* Sizing */
    .w-full { width: 100%; } .h-full { height: 100%; }
    .w-2 { width: 8px; } .h-2 { height: 8px; }
    .w-3 { width: 12px; } .h-3 { height: 12px; }
    .w-4 { width: 16px; } .h-4 { height: 16px; }
    .w-5 { width: 20px; } .h-5 { height: 20px; }
    .w-6 { width: 24px; } .h-6 { height: 24px; }
    .w-8 { width: 32px; } .h-8 { height: 32px; }
    .min-w-0 { min-width: 0; }
    .shrink-0 { flex-shrink: 0; }
    .flex-1 { flex: 1; }
    .overflow-hidden { overflow: hidden; }
    /* Grid columns */
    .grid-cols-1 { grid-template-columns: 1fr; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    .md\\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .md\\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .md\\:grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    .col-span-2 { grid-column: span 2; }
    .col-span-full { grid-column: 1 / -1; }
    /* Misc */
    .list-disc { list-style-type: disc; }
    .list-inside { list-style-position: inside; }
    .opacity-50 { opacity: 0.5; }
    .opacity-75 { opacity: 0.75; }
    .divide-y > * + * { border-top: 1px solid #e5e7eb; }
    .divide-gray-100 > * + * { border-color: #f3f4f6; }
    /* Inline SVG icons */
    svg { display: inline-block; vertical-align: middle; }
    /* Hide interactive/navigation elements */
    button, [role="button"], [data-radix-collection-item],
    .no-print, input, select, textarea { display: none !important; }
    /* Page breaks */
    .page-break-inside-avoid { page-break-inside: avoid; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="pdf-watermark">CONFIDENTIAL</div>

  <div class="pdf-header">
    <div class="pdf-logo-row">
      ${logoSrc ? `<img src="${logoSrc}" alt="MEWA Logo" style="height:46px;border-radius:6px;"/>` : `<div style="height:46px;width:46px;background:#1e293b;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:14px">M</div>`}
      <div>
        <div class="pdf-org">MEWA Health and Harm Reduction</div>
        <div class="pdf-subtitle">Visit Detail Report</div>
      </div>
    </div>
    <div class="pdf-meta">
      <div class="pdf-conf-pill">CONFIDENTIAL</div><br/>
      Generated: ${new Date().toLocaleString()}<br/>
      Prepared by: <strong>${currentUser.name || 'Unknown'}</strong><br/>
      Role: ${currentUser.role || 'Staff'}
    </div>
  </div>

  <div class="pdf-client-bar">
    <div>
      <div class="pdf-client-name">${client.firstName} ${client.lastName}</div>
      <div class="pdf-client-id">Client ID: ${client.clientId || '—'}</div>
    </div>
    <div class="pdf-client-prog">${client.programs?.join(' · ') || '—'}</div>
  </div>
  <div class="pdf-client-grid">
    <div><div class="pdf-ci-label">Gender</div><div class="pdf-ci-val">${client.gender || '—'}</div></div>
    <div><div class="pdf-ci-label">Age</div><div class="pdf-ci-val">${client.age || '—'}</div></div>
    <div><div class="pdf-ci-label">Location</div><div class="pdf-ci-val">${client.location || client.county || '—'}</div></div>
    <div><div class="pdf-ci-label">Phone</div><div class="pdf-ci-val">${client.phone || '—'}</div></div>
  </div>

  <div class="pdf-section-title">Visit Summary</div>
  <div id="summary-content">
    ${summaryHTML}
  </div>

  <div class="pdf-footer">
    <span>${fmtDate(fullVisit.visitDate)}</span>
    <div class="pdf-footer-c">
      <span class="pdf-footer-b">CONFIDENTIAL HEALTHCARE RECORD</span><br/>
      Authorized MEWA personnel only — Unauthorized disclosure is strictly prohibited.
    </div>
    <span>&copy; ${new Date().getFullYear()} MEWA</span>
  </div>
</body>
</html>`);

    printWindow.document.close();
    // Image is embedded as base64 — no need to wait for external load
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading visit details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={onBack} className="bg-white">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visit Details</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(fullVisit.visitDate).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />{client.firstName} {client.lastName}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />{fullVisit.location}
              </span>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="bg-white">
          <Download className="w-4 h-4 mr-2" />Export PDF
        </Button>
      </div>

      {/* Risk Flags */}
      {flags.length > 0 && (
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700 text-base">
              <AlertTriangle className="w-5 h-5" />Active Risk Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {flags.map((flag, idx) => (
                <Badge key={idx} className={
                  flag.severity === 'high' ? 'bg-red-100 text-red-800 border-red-300' :
                  flag.severity === 'medium' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-blue-100 text-blue-800 border-blue-300'
                }>
                  {(flag.type?.replace(/-/g, ' ') || 'Unknown Risk').toUpperCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PrEP Risk Summary */}
      {showPrepRastSummary && riskFactors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
              <Activity className="w-5 h-5" />PrEP Risk Assessment Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-900 font-medium mb-3">
              Client screened eligible for PrEP based on the following reported risk factors:
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {riskFactors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-amber-800 bg-white/50 p-2 rounded border border-amber-100">
                  <span className="mt-1.5 min-w-[6px] min-h-[6px] rounded-full bg-amber-500 shrink-0" />
                  {factor.desc}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-amber-200">
              <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Assessment Outcome</span>
              <Badge className="bg-amber-600 text-white hover:bg-amber-700">Refer for PrEP Services</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visit Overview */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Visit Type</p>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">{fullVisit.visitType}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Client ID</p>
              <p className="text-sm font-medium text-gray-800">{client.clientId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Programs</p>
              <div className="flex flex-wrap gap-1">
                {client.programs?.map((p: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Base Location</p>
              <p className="text-sm font-medium text-gray-800">{client.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module Tabs */}
      <Card className="border-0 shadow-sm bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="grid grid-cols-7 w-full h-auto p-1 bg-gray-100 rounded-xl">
              {[
                { value: 'summary', label: 'Summary', icon: FileText, show: true },
                { value: 'clinical', label: 'Clinical', icon: Activity, show: canViewClinical },
                { value: 'mental-health', label: 'Mental', icon: Brain, show: canViewMentalHealth },
                { value: 'psychosocial', label: 'Psychosocial', icon: Heart, show: canViewPsychosocial },
                { value: 'nsp', label: 'NSP', icon: Syringe, show: canViewNSP },
                { value: 'condom', label: 'Condom', icon: Shield, show: canViewCondom },
                { value: 'mat', label: 'MAT', icon: ClipboardList, show: canViewMAT },
              ].filter(t => t.show).map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.value
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="summary">
              <div ref={summaryRef}>
                <VisitSummary visit={fullVisit} client={client} currentUser={currentUser} />
              </div>
            </TabsContent>

            {canViewClinical && (
              <TabsContent value="clinical">
                <ClinicalModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  canEdit={canEditClinical}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
            {canViewMentalHealth && (
              <TabsContent value="mental-health">
                <MentalHealthModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  canEdit={canEditMentalHealth}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
            {canViewPsychosocial && (
              <TabsContent value="psychosocial">
                <PsychosocialModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
            {canViewNSP && (
              <TabsContent value="nsp">
                <NSPModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
            {canViewCondom && (
              <TabsContent value="condom">
                <CondomModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
            {canViewMAT && (
              <TabsContent value="mat">
                <MATModule
                  visit={fullVisit} client={client} currentUser={currentUser}
                  canEdit={canEditMAT}
                  onUpdate={() => { fetchFullVisit(); onUpdate(); }}
                />
              </TabsContent>
            )}
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}