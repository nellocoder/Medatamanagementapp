import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { 
  ArrowRight, 
  User, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Phone, 
  Activity, 
  AlertTriangle,
  Clock,
  Download,
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { ReferralDetail } from './ReferralDetail';
import { ReferralForm } from './ReferralForm';

export function ReferralDashboard({ currentUser, onNavigateToClient }: any) {
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReferral, setEditingReferral] = useState<any>(null); // State for Edit mode
  const [referrals, setReferrals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Permissions Logic
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'System Admin';
  const canEdit = currentUser?.role !== 'Viewer';

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReferrals();
    loadClients();
  }, []);

  const loadReferrals = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setReferrals(data.referrals);
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
      try {
          const response = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
              { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );
          const data = await response.json();
          if (data.success) {
              setClients(data.clients);
          }
      } catch (e) {
          console.error('Error loading clients', e);
      }
  };

  const handleDeleteReferral = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this referral? This action cannot be undone.")) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals/${id}`,
        {
          method: 'DELETE',
          headers: { 
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ 
            userId: currentUser.id || currentUser.name, 
            userName: currentUser.name 
          })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success("Referral deleted successfully");
        loadReferrals();
      } else {
        toast.error("Failed to delete: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error("Network error while deleting referral");
    }
  };

  // Filter Logic
  const filteredReferrals = referrals.filter(r => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || r.riskLevel === riskFilter;
      const loc = r.clientLocation || r.location || 'all';
      const matchesLocation = locationFilter === 'all' || loc === locationFilter;
      const matchesService = serviceFilter === 'all' || r.service === serviceFilter;
      const matchesSearch = searchTerm === '' || 
          r.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          r.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesRisk && matchesLocation && matchesService && matchesSearch;
  });

  // --- EXPORT: EXCEL (With Demographics) ---
  const handleExportExcel = () => {
    if (filteredReferrals.length === 0) return toast.error("No data to export");
    const headers = ['Client Name', 'Gender', 'Age', 'Phone', 'Location', 'Program', 'Service', 'Date', 'Risk', 'Status'];
    
    const rows = filteredReferrals.map(r => {
      const client = clients.find(c => c.id === (r.clientId || r.client_id));
      return [
        r.clientName || 'Unknown',
        client?.gender || r.clientGender || 'N/A',
        client?.age || r.clientAge || 'N/A',
        r.clientPhone || 'N/A',
        r.clientLocation || r.location || 'Not Set',
        client?.program || r.clientProgram || 'N/A',
        r.service || 'General',
        new Date(r.createdAt).toLocaleDateString(),
        r.riskLevel,
        r.status
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `MEWA_Detailed_Referrals_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Detailed Excel file generated");
  };

  // --- EXPORT: PDF (with automatic page numbering and reduced bottom margin) ---
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups.");

    const total = filteredReferrals.length;
    const highRisk = filteredReferrals.filter(r => r.riskLevel === 'High').length;
    const linked = filteredReferrals.filter(r => r.status === 'Linked to Care').length;
    
    const logoUrl = "https://media.licdn.com/dms/image/v2/D4D0BAQGThQDf1alOCg/company-logo_100_100/company-logo_100_100/0/1720415139542?e=1773878400&v=beta&t=RAbUWTpfDD9aVw9kyDj8DKHHDXLiP3SzOwKf8804taQ";

    const rowsHtml = filteredReferrals.map(r => {
      const client = clients.find(c => c.id === (r.clientId || r.client_id));
      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">
            <strong>${r.clientName || 'Unknown'}</strong><br/>
            <small style="color:#64748b">${client?.gender || r.clientGender || 'N/A'} | Age: ${client?.age || r.clientAge || 'N/A'}</small>
          </td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">
            ${r.clientLocation || r.location || 'Not Set'}<br/>
            <small style="color:#64748b">${client?.program || r.clientProgram || ''}</small>
          </td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${r.service}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date(r.createdAt).toLocaleDateString()}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight:bold; color:${r.riskLevel === 'High' ? '#ef4444' : '#f59e0b'}">${r.riskLevel}</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">${r.status}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Referral Report - MEWA</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 5mm 15mm 15mm 15mm;
              @bottom-right {
                content: "Page " counter(page);
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-size: 10px;
                color: #64748b;
              }
            }
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 0; color: #1e293b; position: relative; }
            .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; color: rgba(226, 232, 240, 0.15); font-weight: 900; z-index: -1; white-space: nowrap; pointer-events: none; }
            
            .header { 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              text-align: center;
              border-bottom: 3px solid #4f46e5; 
              padding-bottom: 10px; 
              margin-bottom: 20px; 
            }
            .logo-container { margin-bottom: 8px; }
            .logo-container img { max-height: 70px; width: auto; border-radius: 4px; }
            
            .org-name { margin: 0; font-size: 20px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.02em; }
            .report-title { margin: 2px 0; font-size: 24px; font-weight: 400; color: #4f46e5; }
            .gen-info { margin: 0; font-size: 10px; color: #64748b; }

            .summary-container { display: flex; gap: 20px; margin-bottom: 20px; justify-content: center; }
            .summary-box { min-width: 140px; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
            .summary-box h4 { margin: 0; font-size: 10px; color: #64748b; text-transform: uppercase; }
            .summary-box p { margin: 5px 0 0; font-size: 20px; font-weight: bold; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 5px; background: white; }
            th { background: #f1f5f9; text-align: left; padding: 10px; font-size: 11px; border: 1px solid #cbd5e1; text-transform: uppercase; color: #475569; }
            td { font-size: 11px; vertical-align: top; border: 1px solid #e2e8f0; }
            
            /* Footer container - 14mm tall to fit within 15mm bottom margin */
            .footer-container {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 14mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: white;
              font-size: 10px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
              padding: 0 5mm;
              line-height: 1.3;
            }
            .footer-center { text-align: center; flex-grow: 1; }
            .footer-left { width: 150px; }
            .footer-right { width: 150px; text-align: right; font-style: italic; color: #64748b; }

            @media print { 
              .watermark { -webkit-print-color-adjust: exact; }
              .footer-container { position: fixed; bottom: 0; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">CONFIDENTIAL</div>
          
          <div class="header">
            <div class="logo-container">
              <img src="${logoUrl}" crossorigin="anonymous" alt="MEWA Logo" id="pdfLogo" />
            </div>
            <h1 class="org-name">MEWA Health and Harm Reduction</h1>
            <h2 class="report-title">Referral Management Report</h2>
            <p class="gen-info">
              Generated: ${new Date().toLocaleString()} | Prepared By: ${currentUser.name}
            </p>
          </div>

          <div class="summary-container">
            <div class="summary-box"><h4>Total Records</h4><p style="color: #1e293b;">${total}</p></div>
            <div class="summary-box"><h4>High Risk</h4><p style="color: #ef4444;">${highRisk}</p></div>
            <div class="summary-box"><h4>Linked to Care</h4><p style="color: #10b981;">${linked}</p></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Client Details</th>
                <th style="width: 20%;">Location & Program</th>
                <th style="width: 15%;">Service</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 10%;">Risk</th>
                <th style="width: 15%;">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="footer-container">
            <div class="footer-left"></div>
            <div class="footer-center">
              <strong style="color: #1e293b; text-transform: uppercase;">CONFIDENTIAL HEALTHCARE RECORD</strong><br/>
              The document is intended for authorized MEWA personnel only.<br/>
              © 2026 MEWA Health and Harm Reduction
            </div>
            <div class="footer-right">
               <!-- Page number is automatically added in the bottom‑right margin area by @page -->
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // INSTANT PRINT LOGIC (Checks if image is already cached to avoid visible delay)
    const img = printWindow.document.getElementById('pdfLogo') as HTMLImageElement;
    if (img && !img.complete) {
        img.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
        img.onerror = () => printWindow.print();
    } else {
        // If image is already ready, print immediately
        printWindow.focus();
        printWindow.print();
    }
  };

  // Metrics Calculation for Dashboard Cards
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalPending = referrals.filter(r => r.status === 'Pending').length;
  const highRiskCount = referrals.filter(r => r.riskLevel === 'High' && r.status !== 'Linked to Care').length;
  const linkedThisMonth = referrals.filter(r => 
      r.status === 'Linked to Care' && 
      r.linkage?.date && 
      new Date(r.linkage.date) >= firstDayOfMonth
  ).length;

  const totalClosed = referrals.filter(r => ['Linked to Care', 'Failed', 'Referred Elsewhere'].includes(r.status)).length;
  const totalLinked = referrals.filter(r => r.status === 'Linked to Care').length;
  const linkageRate = totalClosed > 0 ? Math.round((totalLinked / totalClosed) * 100) : 0;

  // View: Referral Detail
  if (selectedReferralId) {
      return (
          <ReferralDetail 
             referralId={selectedReferralId} 
             currentUser={currentUser} 
             onBack={() => {
                 setSelectedReferralId(null);
                 loadReferrals(); 
             }} 
          />
      );
  }

  // View: Create or Edit Form
  if (showCreateForm || editingReferral) {
      return (
          <ReferralForm 
            clients={clients}
            currentUser={currentUser}
            initialData={editingReferral} 
            onSuccess={() => {
                setShowCreateForm(false);
                setEditingReferral(null);
                loadReferrals();
            }}
            onCancel={() => {
                setShowCreateForm(false);
                setEditingReferral(null);
            }}
          />
      );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-slate-900">Referral Management</h1>
            <p className="text-slate-600">Track and manage clients requiring linkage to care.</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> New Referral
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         <Card className="border-l-4 border-l-amber-500 shadow-sm"><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm font-medium text-slate-500">Pending Actions</p><h3 className="text-3xl font-bold">{totalPending}</h3></div><Clock className="text-amber-600" /></div></CardContent></Card>
         <Card className="border-l-4 border-l-green-500 shadow-sm"><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm font-medium text-slate-500">Linked This Month</p><h3 className="text-3xl font-bold">{linkedThisMonth}</h3></div><CheckCircle2 className="text-green-600" /></div></CardContent></Card>
         <Card className="border-l-4 border-l-blue-500 shadow-sm"><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm font-medium text-slate-500">Success Rate</p><h3 className="text-3xl font-bold">{linkageRate}%</h3></div><Activity className="text-blue-600" /></div></CardContent></Card>
         <Card className="border-l-4 border-l-red-500 bg-red-50/30 shadow-sm"><CardContent className="pt-6"><div className="flex justify-between"><div><p className="text-sm font-medium text-red-600">High Risk Backlog</p><h3 className="text-3xl font-bold text-red-900">{highRiskCount}</h3></div><AlertTriangle className="text-red-600" /></div></CardContent></Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <CardTitle>Referrals Directory</CardTitle>
                  <CardDescription>Click a name for profile or use icons to manage/edit/delete.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportExcel} className="text-green-700 border-green-200 hover:bg-green-50">
                    <Download className="w-4 h-4 mr-2" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="text-red-700 border-red-200 hover:bg-red-50">
                    <FileText className="w-4 h-4 mr-2" /> PDF Report
                </Button>
              </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
              <Input placeholder="Search client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 col-span-2 md:col-span-1" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Linked to Care">Linked to Care</SelectItem>
                      <SelectItem value="Failed">Failed</SelectItem>
                  </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Risk" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Risks</SelectItem><SelectItem value="High">High Risk</SelectItem><SelectItem value="Medium">Medium Risk</SelectItem><SelectItem value="Low">Low Risk</SelectItem></SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Services</SelectItem><SelectItem value="PrEP">PrEP</SelectItem><SelectItem value="ART">ART</SelectItem><SelectItem value="GBV">GBV</SelectItem><SelectItem value="Mental Health">Mental Health</SelectItem></SelectContent>
              </Select>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Location" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Locations</SelectItem><SelectItem value="Mombasa">Mombasa</SelectItem><SelectItem value="Lamu">Lamu</SelectItem><SelectItem value="Kilifi">Kilifi</SelectItem></SelectContent>
              </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Client</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Referred For</TableHead>
                <TableHead>Referral Date</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500">Loading referrals...</TableCell></TableRow>
              ) : filteredReferrals.length === 0 ? (
                 <TableRow><TableCell colSpan={7} className="text-center py-12 text-slate-500">No referrals found matching your filters.</TableCell></TableRow>
              ) : (
                filteredReferrals.map((referral) => (
                  <TableRow key={referral.id} className="group hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <button onClick={(e) => { e.stopPropagation(); onNavigateToClient(referral.clientId || referral.client_id); }} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5 text-left">
                            <User className="w-3.5 h-3.5" /> {referral.clientName || 'Unknown Client'} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <span className="text-xs text-slate-500 flex items-center gap-2 mt-1 font-medium"><Phone className="w-3 h-3" /> {referral.clientPhone || 'No Phone'}</span>
                      </div>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-2 text-slate-600 text-sm"><MapPin className="w-3 h-3 text-slate-400" />{referral.clientLocation || referral.location || 'Not Set'}</div></TableCell>
                    <TableCell><Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-medium">{referral.service || referral.referredFor || 'General'}</Badge></TableCell>
                    <TableCell><div className="flex items-center gap-2 text-slate-600 text-sm"><Calendar className="w-3 h-3 text-slate-400" />{new Date(referral.createdAt).toLocaleDateString()}</div></TableCell>
                    <TableCell><Badge className={referral.riskLevel === 'High' ? 'bg-red-100 text-red-700 border-red-200' : referral.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>{referral.riskLevel}</Badge></TableCell>
                    <TableCell><Badge className={referral.status === 'Linked to Care' ? 'bg-green-100 text-green-800 border-green-200' : referral.status === 'Pending' ? 'bg-amber-100 text-amber-800 border-amber-200' : referral.status === 'Contacted' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>{referral.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => setSelectedReferralId(referral.id)} title="Manage Workflow">Manage</Button>
                        {canEdit && <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => setEditingReferral(referral)} title="Edit Referral"><Edit className="w-4 h-4" /></Button>}
                        {isAdmin && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteReferral(referral.id)} title="Delete Referral"><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}