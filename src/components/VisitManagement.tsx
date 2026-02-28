import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Plus,
  Search,
  Eye,
  Calendar,
  User,
  MapPin,
  FileText,
  Activity,
  Download,
  Clock,
  CheckCircle2,
  TestTube,
  Heart,
  Save,
  Edit2,
  Trash2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { VisitDetail } from './VisitDetail';
import { RecordVisitForm } from './RecordVisitForm';
import { PHQ9Form, GAD7Form } from './MentalHealthForms';

interface VisitManagementProps {
  currentUser: any;
  initialVisitId?: string | null;
}

const AVAILABLE_SERVICES = [
  { category: 'HIV & SRH', name: 'HIV Testing' },
  { category: 'HIV & SRH', name: 'PrEP Linkage' },
  { category: 'HIV & SRH', name: 'ART Linkage' },
  { category: 'HIV & SRH', name: 'STI Screening' },
  { category: 'HIV & SRH', name: 'Condoms Distributed' },
  { category: 'HIV & SRH', name: 'Family Planning' },
  { category: 'HIV & SRH', name: 'Pregnancy Test' },
  { category: 'Harm Reduction', name: 'NSP Distribution' },
  { category: 'Harm Reduction', name: 'Safe Injection Education' },
  { category: 'Harm Reduction', name: 'Overdose Prevention' },
  { category: 'Harm Reduction', name: 'Naloxone Distribution' },
  { category: 'Harm Reduction', name: 'Wound Care' },
  { category: 'Harm Reduction', name: 'Abscess Management' },
  { category: 'MAT', name: 'Methadone Dose' },
  { category: 'MAT', name: 'Dose Adjustment' },
  { category: 'MAT', name: 'Take-Home Assessment' },
  { category: 'MAT', name: 'Urine Tox Screen' },
  { category: 'Mental Health', name: 'CBT Session' },
  { category: 'Mental Health', name: 'Trauma Counselling' },
  { category: 'Mental Health', name: 'Group Therapy' },
  { category: 'Mental Health', name: 'Motivational Interviewing' },
  { category: 'Mental Health', name: 'PHQ-9 Screening' },
  { category: 'Mental Health', name: 'GAD-7 Screening' },
  { category: 'Mental Health', name: 'Crisis Intervention' },
  { category: 'Clinical', name: 'Vitals Check' },
  { category: 'Clinical', name: 'Physical Examination' },
  { category: 'Clinical', name: 'TB Screening' },
  { category: 'Clinical', name: 'Vaccination' },
  { category: 'Clinical', name: 'Medication Review' },
  { category: 'Case Management', name: 'Home Visit' },
  { category: 'Case Management', name: 'Legal Support Referral' },
  { category: 'Case Management', name: 'Food/Nutrition Support' },
  { category: 'Case Management', name: 'Shelter Referral' },
  { category: 'Case Management', name: 'Financial Assistance' },
  { category: 'Case Management', name: 'ID Documentation Support' },
  { category: 'Education', name: 'Skills Assessment' },
  { category: 'Education', name: 'Job Placement Support' },
  { category: 'Education', name: 'Training Enrollment' },
  { category: 'Education', name: 'Educational Support' },
];

const ALL_SERVICE_NAMES = AVAILABLE_SERVICES.map(s => s.name);

const SERVICE_CATEGORY_COLORS: Record<string, string> = {
  'HIV & SRH': 'bg-rose-50 text-rose-700 border-rose-200',
  'Harm Reduction': 'bg-orange-50 text-orange-700 border-orange-200',
  'MAT': 'bg-blue-50 text-blue-700 border-blue-200',
  'Mental Health': 'bg-purple-50 text-purple-700 border-purple-200',
  'Clinical': 'bg-teal-50 text-teal-700 border-teal-200',
  'Case Management': 'bg-amber-50 text-amber-700 border-amber-200',
  'Education': 'bg-green-50 text-green-700 border-green-200',
};

function getServiceColor(serviceName: string): string {
  const svc = AVAILABLE_SERVICES.find(s => s.name === serviceName);
  return svc ? (SERVICE_CATEGORY_COLORS[svc.category] || 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700';
}

export function VisitManagement({ currentUser, initialVisitId }: VisitManagementProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [viewingVisit, setViewingVisit] = useState<any>(null);
  const [processedInitialId, setProcessedInitialId] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [isAddVisitOpen, setIsAddVisitOpen] = useState(false);
  const [isEditVisitOpen, setIsEditVisitOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [isAddResultOpen, setIsAddResultOpen] = useState(false);
  const [isAddInterventionOpen, setIsAddInterventionOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingVisit, setDeletingVisit] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [phq9Data, setPhq9Data] = useState<any>(null);
  const [gad7Data, setGad7Data] = useState<any>(null);
  const [showPHQ9, setShowPHQ9] = useState(false);
  const [showGAD7, setShowGAD7] = useState(false);

  const isAdmin = currentUser?.role === 'Admin';
  const canEdit = hasPermission(currentUser?.permissions || [], PERMISSIONS.VISIT_CREATE);

  // Memoized client lookup maps for O(1) access
  const clientMap = useCallback(() => {
    const map: Record<string, any> = {};
    clients.forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => { filterVisits(); }, [visits, searchTerm, locationFilter, clients]);

  useEffect(() => {
    if (initialVisitId && initialVisitId !== processedInitialId) {
      const visit = visits.find(v => v.id === initialVisitId);
      if (visit) {
        setViewingVisit(visit);
        setProcessedInitialId(initialVisitId);
      } else if (!loading) {
        fetchSingleVisit(initialVisitId);
      }
    }
  }, [initialVisitId, visits, loading, processedInitialId]);

  const fetchSingleVisit = async (id: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/${id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success && data.visit) {
        setViewingVisit(data.visit);
        setProcessedInitialId(id);
      } else {
        toast.error('Could not find the requested visit');
      }
    } catch (error) {
      console.error('Error fetching single visit:', error);
    }
  };

  const loadData = async () => {
    try {
      // Parallel fetch for speed
      const [visitsRes, clientsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);
      const [visitsData, clientsData] = await Promise.all([
        visitsRes.json(),
        clientsRes.json(),
      ]);
      if (visitsData.success) setVisits(visitsData.visits || []);
      if (clientsData.success) setClients(clientsData.clients || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load visits data');
    } finally {
      setLoading(false);
    }
  };

  const filterVisits = () => {
    const map = clientMap();
    let filtered = visits;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(visit => {
        const client = map[visit.clientId];
        const clientName = client ? `${client.firstName} ${client.lastName}`.toLowerCase() : '';
        return (
          clientName.includes(term) ||
          visit.visitType?.toLowerCase().includes(term) ||
          visit.location?.toLowerCase().includes(term)
        );
      });
    }
    if (locationFilter !== 'all') {
      filtered = filtered.filter(visit => visit.location === locationFilter);
    }
    setFilteredVisits(filtered);
  };

  const getClientName = (clientId: string) => {
    const map = clientMap();
    const client = map[clientId];
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  };

  const getClientInfo = (clientId: string) => clientMap()[clientId];

  // Fixed delete function – matches successful pattern from handleDeleteReferral
  const handleDeleteVisit = async () => {
    if (!deletingVisit) return;
    setDeleteLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/${deletingVisit.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId: currentUser.id, 
            userName: currentUser.name 
          }),
        }
      );

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', response.status, errorText);
        toast.error(`Server error (${response.status}): ${errorText || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Optimistic update – remove from UI immediately
        setVisits(prev => prev.filter(v => v.id !== deletingVisit.id));
        toast.success('Visit deleted successfully');
        setIsDeleteConfirmOpen(false);
        setDeletingVisit(null);
      } else {
        toast.error(data.error || 'Failed to delete visit');
      }
    } catch (error) {
      console.error('Error deleting visit:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportToCSV = () => {
    if (filteredVisits.length === 0) return toast.error("No data to export");
    const baseHeaders = [
      'Visit Date', 'Client ID', 'Client Name', 'Gender', 'Age',
      'Visit Type', 'Location', 'Reason', 'Notes', 'Follow-up Required', 'Next Appointment'
    ];
    const headers = [...baseHeaders, ...ALL_SERVICE_NAMES];
    const rows = filteredVisits.map(visit => {
      const client = getClientInfo(visit.clientId);
      const servicesProvided = visit.servicesProvided ? visit.servicesProvided.split(', ') : [];
      const baseRow = [
        new Date(visit.visitDate).toLocaleDateString(),
        client?.clientId || '',
        getClientName(visit.clientId),
        client?.gender || 'N/A',
        client?.age || 'N/A',
        visit.visitType || '',
        visit.location || '',
        visit.reason || '',
        visit.notes || '',
        visit.followUpRequired ? 'Yes' : 'No',
        visit.nextAppointment ? new Date(visit.nextAppointment).toLocaleDateString() : ''
      ];
      const serviceRow = ALL_SERVICE_NAMES.map(serviceName =>
        servicesProvided.includes(serviceName) ? 'Yes' : 'No'
      );
      return [...baseRow, ...serviceRow];
    });
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MEWA_Visits_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Visits exported to CSV");
  };

  const handleExportPDF = async () => {
    const logoUrl = "https://media.licdn.com/dms/image/v2/D4D0BAQGThQDf1alOCg/company-logo_100_100/company-logo_100_100/0/1720415139542?e=1773878400&v=beta&t=RAbUWTpfDD9aVw9kyDj8DKHHDXLiP3SzOwKf8804taQ";
    // Fetch logo as base64 to avoid CORS blocks in print windows
    let logoSrc = '';
    try {
      const res = await fetch(logoUrl);
      const blob = await res.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      logoSrc = '';
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups.");
    const total = filteredVisits.length;
    const thisMonth = filteredVisits.filter(v => {
      const d = new Date(v.visitDate);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const followUps = filteredVisits.filter(v => v.followUpRequired).length;
    const activeClients = new Set(filteredVisits.map(v => v.clientId)).size;
    const rowsHtml = filteredVisits.map((visit, i) => {
      const client = getClientInfo(visit.clientId);
      const clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown';
      const services = visit.servicesProvided ? visit.servicesProvided.split(', ').slice(0, 3).join(', ') + (visit.servicesProvided.split(', ').length > 3 ? ` +${visit.servicesProvided.split(', ').length - 3} more` : '') : '—';
      return `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td>${new Date(visit.visitDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</td>
          <td><strong>${clientName}</strong><br/><span style="color:#64748b;font-size:9px">${client?.clientId || ''}</span></td>
          <td>${client?.gender || '—'}</td>
          <td style="text-align:center">${client?.age || '—'}</td>
          <td><span style="background:#eff6ff;color:#1d4ed8;padding:2px 6px;border-radius:4px;font-size:9px">${visit.visitType || '—'}</span></td>
          <td>${visit.location || '—'}</td>
          <td style="font-size:9px;color:#475569">${services || '—'}</td>
          <td style="text-align:center">${visit.followUpRequired ? '<span style="color:#d97706;font-weight:600">●</span>' : '<span style="color:#16a34a">✓</span>'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Visit Report — MEWA Health</title>
          <style>
            @page { size: A4 landscape; margin: 12mm 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; font-size: 10px; background: #fff; }
            
            .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12px; border-bottom: 2px solid #0f172a; margin-bottom: 16px; }
            .header-left { display: flex; align-items: center; gap: 12px; }
            .header-logo img { height: 48px; border-radius: 6px; }
            .org-name { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
            .report-title { font-size: 11px; color: #4f46e5; font-weight: 500; margin-top: 2px; }
            .header-right { text-align: right; font-size: 9px; color: #64748b; line-height: 1.6; }
            .header-right strong { color: #0f172a; font-size: 10px; }
            
            .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
            .kpi-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; font-weight: 600; }
            .kpi-value { font-size: 24px; font-weight: 800; margin-top: 2px; line-height: 1; }
            .kpi-total .kpi-value { color: #1e40af; }
            .kpi-month .kpi-value { color: #059669; }
            .kpi-followup .kpi-value { color: #d97706; }
            .kpi-clients .kpi-value { color: #7c3aed; }
            
            table { width: 100%; border-collapse: collapse; }
            thead tr { background: #0f172a; }
            thead th { color: #fff; padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            tbody td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; line-height: 1.4; }
            
            .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #94a3b8; }
            .footer-center { text-align: center; flex: 1; }
            .confidential { background: #fef2f2; color: #991b1b; padding: 2px 10px; border-radius: 4px; font-weight: 700; font-size: 8px; border: 1px solid #fecaca; }
            
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <div class="header-logo">${logoSrc ? `<img src="${logoSrc}" alt="MEWA" style="max-height:48px;border-radius:4px;"/>` : ""}</div>
              <div>
                <div class="org-name">MEWA Health and Harm Reduction</div>
                <div class="report-title">Visit Management Report</div>
              </div>
            </div>
            <div class="header-right">
              <strong>CONFIDENTIAL</strong><br/>
              Generated: ${new Date().toLocaleString()}<br/>
              Prepared by: ${currentUser.name}<br/>
              Records: ${total}
            </div>
          </div>
          
          <div class="kpi-row">
            <div class="kpi kpi-total"><div class="kpi-label">Total Visits</div><div class="kpi-value">${total}</div></div>
            <div class="kpi kpi-month"><div class="kpi-label">This Month</div><div class="kpi-value">${thisMonth}</div></div>
            <div class="kpi kpi-followup"><div class="kpi-label">Follow-ups Needed</div><div class="kpi-value">${followUps}</div></div>
            <div class="kpi kpi-clients"><div class="kpi-label">Active Clients</div><div class="kpi-value">${activeClients}</div></div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width:10%">Date</th>
                <th style="width:16%">Client</th>
                <th style="width:7%">Gender</th>
                <th style="width:5%">Age</th>
                <th style="width:13%">Visit Type</th>
                <th style="width:10%">Location</th>
                <th style="width:30%">Services Provided</th>
                <th style="width:7%;text-align:center">Follow-up</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          
          <div class="footer">
            <span>${new Date().toLocaleDateString('en-GB', { year:'numeric', month:'long', day:'numeric' })}</span>
            <div class="footer-center">
              <span class="confidential">CONFIDENTIAL HEALTHCARE RECORD</span>
              <span style="display:block;margin-top:4px">This document contains sensitive health information for authorized MEWA personnel only. Unauthorized disclosure is prohibited.</span>
            </div>
            <span>© ${new Date().getFullYear()} MEWA Health and Harm Reduction</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    // Logo is base64-embedded — print immediately
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 300);
  };

  const handleEditVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingVisit) return;
    const formData = new FormData(e.currentTarget);
    const visitUpdates = {
      visitDate: formData.get('visitDate'),
      visitType: formData.get('visitType'),
      location: formData.get('location'),
      reason: formData.get('reason'),
      notes: formData.get('notes'),
      servicesProvided: selectedServices.join(', '),
      followUpRequired: formData.get('followUpRequired') === 'true',
      nextAppointment: formData.get('nextAppointment'),
    };
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits/${editingVisit.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ updates: visitUpdates, userId: currentUser.id }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success('Visit updated successfully!');
        // Optimistic update — no full reload needed
        setVisits(prev => prev.map(v => v.id === editingVisit.id ? { ...v, ...visitUpdates } : v));
        setIsEditVisitOpen(false);
        setEditingVisit(null);
        setSelectedServices([]);
      } else {
        toast.error(data.error || 'Failed to update visit');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const visit = {
      clientId: formData.get('clientId'),
      visitDate: formData.get('visitDate'),
      visitType: formData.get('visitType'),
      location: formData.get('location'),
      reason: formData.get('reason'),
      notes: formData.get('notes'),
      servicesProvided: selectedServices.join(', '),
      followUpRequired: formData.get('followUpRequired') === 'true',
      nextAppointment: formData.get('nextAppointment'),
    };
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/visits`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ visit, userId: currentUser.id }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success('Visit added successfully!');
        setIsAddVisitOpen(false);
        setSelectedServices([]);
        loadData();
      } else {
        toast.error(data.error || 'Failed to add visit');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddClinicalResult = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = {
      clientId: selectedVisit.clientId,
      visitId: selectedVisit.id,
      type: formData.get('resultType'),
      date: formData.get('date'),
      temperature: formData.get('temperature'),
      bloodPressure: formData.get('bloodPressure'),
      pulse: formData.get('pulse'),
      weight: formData.get('weight'),
      hivTest: formData.get('hivTest'),
      hepB: formData.get('hepB'),
      hepC: formData.get('hepC'),
      tbScreening: formData.get('tbScreening'),
      phq9Score: phq9Data?.score,
      phq9Severity: phq9Data?.severity,
      phq9Classification: phq9Data?.classification,
      phq9Responses: phq9Data?.responses,
      gad7Score: gad7Data?.score,
      gad7Severity: gad7Data?.severity,
      gad7Classification: gad7Data?.classification,
      gad7Responses: gad7Data?.responses,
      notes: formData.get('notes'),
    };
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clinical-results`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ result, userId: currentUser.id }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success('Clinical result saved! You can continue adding more results.');
        if (data.flags && data.flags.length > 0) {
          toast.warning(`${data.flags.length} automatic flag(s) added`);
        }
        // ✅ STAY on dialog — reset form fields but keep dialog open
        setPhq9Data(null);
        setGad7Data(null);
        setShowPHQ9(false);
        setShowGAD7(false);
        // Reset the form fields without closing the dialog
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(data.error || 'Failed to add result');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const handleAddIntervention = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const intervention = {
      clientId: selectedVisit.clientId,
      visitId: selectedVisit.id,
      category: formData.get('category'),
      type: formData.get('type'),
      date: formData.get('date'),
      provider: currentUser.name,
      notes: formData.get('notes'),
      quantity: formData.get('quantity'),
    };
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/interventions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ intervention, userId: currentUser.id }),
        }
      );
      const data = await response.json();
      if (data.success) {
        toast.success('Intervention saved! You can continue adding more interventions.');
        // ✅ STAY on dialog — reset form but don't close
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(data.error || 'Failed to add intervention');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading visits...</p>
        </div>
      </div>
    );
  }

  if (viewingVisit) {
    const client = getClientInfo(viewingVisit.clientId);
    if (!client) {
      return (
        <div className="p-8">
          <Button onClick={() => setViewingVisit(null)} className="mb-4">← Back to Visits</Button>
          <p className="text-red-500">Error: Client not found for this visit.</p>
        </div>
      );
    }
    return (
      <VisitDetail
        visit={viewingVisit}
        client={client}
        onBack={() => setViewingVisit(null)}
        currentUser={currentUser}
        onUpdate={() => {
          // ✅ Don't go back to table — just refresh data and stay on detail view
          loadData();
        }}
      />
    );
  }

  const thisMonthCount = visits.filter(v => {
    const d = new Date(v.visitDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record and track client visits, clinical results, and interventions</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 bg-white">
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-red-700 border-red-200 hover:bg-red-50 bg-white">
            <FileText className="w-4 h-4 mr-1.5" /> Export PDF
          </Button>
          {canEdit && (
            <Dialog open={isAddVisitOpen} onOpenChange={setIsAddVisitOpen}>
              <button
                onClick={() => setIsAddVisitOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Record Visit
              </button>
              <DialogContent className="max-w-[98vw] sm:max-w-[98vw] w-full h-[98vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 pb-2 border-b bg-white z-10">
                  <DialogTitle>Record New Visit</DialogTitle>
                  <DialogDescription>Add a new visit record with mandatory screenings.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6">
                  <RecordVisitForm
                    clients={clients}
                    currentUser={currentUser}
                    onSuccess={() => { setIsAddVisitOpen(false); loadData(); }}
                    onCancel={() => setIsAddVisitOpen(false)}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Visits', value: visits.length, icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'This Month', value: thisMonthCount, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Follow-ups', value: visits.filter(v => v.followUpRequired).length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active Clients', value: new Set(visits.map(v => v.clientId)).size, icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm bg-white">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filter */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by client name, visit type or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 border-gray-200 focus:border-indigo-400"
              />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-44 border-gray-200">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Lamu">Lamu</SelectItem>
                <SelectItem value="Kilifi">Kilifi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {searchTerm || locationFilter !== 'all' ? (
            <p className="text-xs text-gray-400 mt-2">{filteredVisits.length} result{filteredVisits.length !== 1 ? 's' : ''} found</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Visits Table */}
      <Card className="border-0 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            All Visits
            <span className="ml-2 text-sm font-normal text-gray-400">({filteredVisits.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredVisits.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">No visits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Demographics</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Visit Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Follow-up</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredVisits.map((visit) => {
                    const client = getClientInfo(visit.clientId);
                    const services = visit.servicesProvided ? visit.servicesProvided.split(', ') : [];
                    const initials = client ? `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}` : '?';
                    return (
                      <tr key={visit.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-900 font-medium">
                            {new Date(visit.visitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {new Date(visit.visitDate).getFullYear()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 whitespace-nowrap">{getClientName(visit.clientId)}</div>
                              <div className="text-xs text-gray-400">{client?.clientId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-gray-700">{client?.gender || '—'}</div>
                          <div className="text-xs text-gray-400">Age {client?.age || '—'}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {visit.visitType}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 text-gray-600 text-xs">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {visit.location}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <div className="flex flex-wrap gap-1">
                            {services.slice(0, 2).map((service: string, idx: number) => (
                              <span key={idx} className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs border ${getServiceColor(service)}`}>
                                {service}
                              </span>
                            ))}
                            {services.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500 border border-gray-200">
                                +{services.length - 2}
                              </span>
                            )}
                            {services.length === 0 && <span className="text-gray-300 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {visit.followUpRequired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                              <Clock className="w-3 h-3" /> Needed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <CheckCircle2 className="w-3 h-3" /> Complete
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setViewingVisit(visit)}
                              title="View details"
                              className="p-1.5 rounded-md hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedVisit(visit);
                                setIsAddResultOpen(true);
                                setPhq9Data(null); setGad7Data(null);
                                setShowPHQ9(false); setShowGAD7(false);
                              }}
                              title="Add clinical result"
                              className="p-1.5 rounded-md hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors"
                            >
                              <TestTube className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedVisit(visit); setIsAddInterventionOpen(true); }}
                              title="Add intervention"
                              className="p-1.5 rounded-md hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setEditingVisit(visit);
                                  setSelectedServices(visit.servicesProvided ? visit.servicesProvided.split(', ') : []);
                                  setIsEditVisitOpen(true);
                                }}
                                title="Edit visit"
                                className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {/* Admin-only delete */}
                            {isAdmin && (
                              <button
                                onClick={() => { setDeletingVisit(visit); setIsDeleteConfirmOpen(true); }}
                                title="Delete visit (Admin only)"
                                className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Delete Visit Record
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The visit record for{' '}
              <strong>{deletingVisit && getClientName(deletingVisit.clientId)}</strong> on{' '}
              <strong>{deletingVisit && new Date(deletingVisit.visitDate).toLocaleDateString()}</strong> will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteVisit}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Visit'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Visit Dialog */}
      <Dialog open={isEditVisitOpen} onOpenChange={(open) => {
        setIsEditVisitOpen(open);
        if (!open) { setEditingVisit(null); setSelectedServices([]); }
      }}>
        <DialogContent className="max-w-[98vw] sm:max-w-2xl w-full h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Visit</DialogTitle>
            <DialogDescription>
              Update visit for {editingVisit && getClientName(editingVisit.clientId)}
            </DialogDescription>
          </DialogHeader>
          {editingVisit && (
            <form onSubmit={handleEditVisit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Visit Date *</Label>
                  <Input name="visitDate" type="date" defaultValue={editingVisit.visitDate ? new Date(editingVisit.visitDate).toISOString().split('T')[0] : ''} required />
                </div>
                <div className="space-y-2">
                  <Label>Visit Type *</Label>
                  <Select name="visitType" defaultValue={editingVisit.visitType} required>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {['Clinical Review','Outreach Visit','Case Management','Psychosocial Session','Follow-up','Emergency'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Select name="location" defaultValue={editingVisit.location} required>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {['Mombasa','Lamu','Kilifi'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <Input name="reason" defaultValue={editingVisit.reason || ''} />
              </div>
              <div className="space-y-2">
                <Label>Notes & Observations</Label>
                <Textarea name="notes" rows={3} defaultValue={editingVisit.notes || ''} />
              </div>
              <div className="space-y-2">
                <Label>Services Provided</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-3">
                  {Object.entries(
                    AVAILABLE_SERVICES.reduce((acc, s) => {
                      if (!acc[s.category]) acc[s.category] = [];
                      acc[s.category].push(s.name);
                      return acc;
                    }, {} as Record<string, string[]>)
                  ).map(([category, services]) => (
                    <div key={category}>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{category}</h4>
                      <div className="space-y-1.5">
                        {services.map((svc) => (
                          <div key={svc} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-${svc}`}
                              checked={selectedServices.includes(svc)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedServices([...selectedServices, svc]);
                                else setSelectedServices(selectedServices.filter(s => s !== svc));
                              }}
                            />
                            <label htmlFor={`edit-${svc}`} className="text-sm cursor-pointer">{svc}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedServices.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Follow-up Required?</Label>
                  <Select name="followUpRequired" defaultValue={editingVisit.followUpRequired ? 'true' : 'false'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Yes</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Next Appointment</Label>
                  <Input name="nextAppointment" type="date" defaultValue={editingVisit.nextAppointment ? new Date(editingVisit.nextAppointment).toISOString().split('T')[0] : ''} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditVisitOpen(false)}>Cancel</Button>
                <Button type="submit"><Save className="w-4 h-4 mr-2" />Update Visit</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Clinical Result Dialog — stays open after save */}
      <Dialog open={isAddResultOpen} onOpenChange={setIsAddResultOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Clinical Result</DialogTitle>
            <DialogDescription>
              Recording results for <strong>{selectedVisit && getClientName(selectedVisit.clientId)}</strong>.
              The dialog stays open so you can continue adding results.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClinicalResult} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Result Type *</Label>
                <Select name="resultType" required>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vitals">Vitals</SelectItem>
                    <SelectItem value="lab">Lab Results</SelectItem>
                    <SelectItem value="mental-health">Mental Health</SelectItem>
                    <SelectItem value="nsp">NSP Specific</SelectItem>
                    <SelectItem value="mat">MAT Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input name="date" type="date" required />
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-gray-700">Vitals</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2"><Label className="text-xs">Temp (°C)</Label><Input name="temperature" type="number" step="0.1" /></div>
                <div className="space-y-2"><Label className="text-xs">BP (mmHg)</Label><Input name="bloodPressure" placeholder="120/80" /></div>
                <div className="space-y-2"><Label className="text-xs">Pulse (bpm)</Label><Input name="pulse" type="number" /></div>
                <div className="space-y-2"><Label className="text-xs">Weight (kg)</Label><Input name="weight" type="number" step="0.1" /></div>
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-gray-700">Lab Results</h4>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'HIV Test', name: 'hivTest', options: ['Negative','Positive','Indeterminate'] },
                  { label: 'Hep B', name: 'hepB', options: ['Negative','Positive'] },
                  { label: 'Hep C', name: 'hepC', options: ['Negative','Positive'] },
                  { label: 'TB Screening', name: 'tbScreening', options: ['Negative','Positive'] },
                ].map(field => (
                  <div key={field.name} className="space-y-2">
                    <Label className="text-xs">{field.label}</Label>
                    <Select name={field.name}>
                      <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                      <SelectContent>{field.options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-gray-700">Mental Health Screening</h4>
              <div className="space-y-4">
                {[
                  { label: 'PHQ-9 Depression', show: showPHQ9, setShow: setShowPHQ9, data: phq9Data, Form: PHQ9Form, setData: setPhq9Data, colorFn: (s: number) => s <= 4 ? 'bg-green-100 text-green-800' : s <= 9 ? 'bg-blue-100 text-blue-800' : s <= 14 ? 'bg-yellow-100 text-yellow-800' : s <= 19 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800' },
                  { label: 'GAD-7 Anxiety', show: showGAD7, setShow: setShowGAD7, data: gad7Data, Form: GAD7Form, setData: setGad7Data, colorFn: (s: number) => s <= 4 ? 'bg-green-100 text-green-800' : s <= 9 ? 'bg-blue-100 text-blue-800' : s <= 14 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800' },
                ].map(item => (
                  <div key={item.label} className="bg-gray-50 p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="font-medium text-sm">{item.label} Assessment</Label>
                      <Button type="button" variant={item.show ? "secondary" : "outline"} size="sm" onClick={() => item.setShow(!item.show)}>
                        {item.show ? 'Hide' : item.data ? 'Edit' : 'Start Assessment'}
                      </Button>
                    </div>
                    {item.show ? (
                      <item.Form onChange={item.setData} initialData={item.data} />
                    ) : item.data ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge className={item.colorFn(item.data.score)}>Score: {item.data.score}</Badge>
                        <span className="font-medium">{item.data.classification}</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No assessment recorded</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAddResultOpen(false)}>
                Close
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Intervention Dialog — stays open after save */}
      <Dialog open={isAddInterventionOpen} onOpenChange={setIsAddInterventionOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Intervention</DialogTitle>
            <DialogDescription>
              Adding intervention for <strong>{selectedVisit && getClientName(selectedVisit.clientId)}</strong>.
              The dialog stays open so you can continue adding interventions.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddIntervention} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select name="category" required>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {['HIV & SRH','Harm Reduction','Mental Health','Case Management','Education'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Input name="type" placeholder="e.g., HIV Testing, NSP Distribution" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input name="date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>Quantity (if applicable)</Label>
              <Input name="quantity" placeholder="e.g., 10 syringes" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={3} />
            </div>
            <div className="flex justify-between gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsAddInterventionOpen(false)}>
                Close
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}