import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Plus, Search, Download, Eye, Database, FileText } from 'lucide-react';
import { DataGeneratorUI } from './DataGeneratorUI';
import { ClientDetail } from './ClientDetail';
import { NewClientForm } from './NewClientForm';

interface ClientManagementProps {
  currentUser: any;
  initialClientId?: string | null;
}

export function ClientManagement({ currentUser, initialClientId }: ClientManagementProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [viewingClientId, setViewingClientId] = useState<string | null>(initialClientId || null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isGeneratorDialogOpen, setIsGeneratorDialogOpen] = useState(false);

  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'M&E Officer' || currentUser?.role === 'Data Entry';
  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (initialClientId) setViewingClientId(initialClientId);
  }, [initialClientId]);

  useEffect(() => {
    loadClients();
    const interval = setInterval(loadClients, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = clients;
    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (locationFilter !== 'all') {
      filtered = filtered.filter(client => client.location === locationFilter);
    }
    setFilteredClients(filtered);
  }, [clients, searchTerm, locationFilter]);

  const loadClients = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) setClients(data.clients);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Client ID', 'Program', 'First Name', 'Last Name', 'Gender', 'Age', 'DOB',
      'County', 'Sub-County', 'Hotspot', 'Peer Educator', 'Phone',
      'First Contact Date', 'Status'
    ];
    const rows = filteredClients.map(c => [
      c.clientId,
      c.program || '-',
      c.firstName,
      c.lastName,
      c.gender,
      c.age,
      c.dob || '-',
      c.location || c.county || '-',
      c.subCounty || '-',
      c.hotspot || '-',
      c.peerEducator || '-',
      c.phone || '-',
      c.dateOfFirstContact || '-',
      c.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully!');
  };

  // --- PDF EXPORT with correct page numbering and additional columns ---
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return toast.error("Pop-up blocked. Please allow pop-ups.");

    const totalCount = filteredClients.length;
    const logoUrl = "https://media.licdn.com/dms/image/v2/D4D0BAQGThQDf1alOCg/company-logo_100_100/company-logo_100_100/0/1720415139542?e=1773878400&v=beta&t=RAbUWTpfDD9aVw9kyDj8DKHHDXLiP3SzOwKf8804taQ";

    const rowsHtml = filteredClients.map(c => `
      <tr>
        <td style="padding: 5px; border: 1px solid #e2e8f0;"><strong>${c.clientId}</strong></td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.firstName} ${c.lastName}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.gender || 'N/A'} (${c.age || 'N/A'})</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.location || c.county || 'N/A'}<br/><small>${c.subCounty || ''}</small></td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.program || 'N/A'}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.hotspot || '-'}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.peerEducator || '-'}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.phone || '-'}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.dateOfFirstContact || '-'}</td>
        <td style="padding: 5px; border: 1px solid #e2e8f0;">${c.status}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Client Directory - MEWA</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm 10mm 35mm 10mm;   /* increased bottom margin for extra clearance */
              @bottom-right {
                content: "Page " counter(page);
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-size: 9px;
                color: #64748b;
              }
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              margin: 0 0 18mm 0;   /* bottom margin exactly matches footer height */
              padding: 0;
              color: #1e293b;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 80px;
              color: rgba(226, 232, 240, 0.15);
              font-weight: 900;
              z-index: -1;
              pointer-events: none;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .logo-container img { max-height: 65px; }
            .org-name { font-size: 22px; font-weight: 800; margin: 6px 0 2px; }
            .report-title { font-size: 24px; color: #4f46e5; margin: 0; }
            .gen-info { font-size: 10px; color: #64748b; }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th {
              background: #f1f5f9;
              padding: 6px 4px;
              font-size: 9px;
              border: 1px solid #cbd5e1;
              text-transform: uppercase;
              color: #475569;
              text-align: left;
            }
            td {
              font-size: 8px;
              padding: 5px 4px;
              border: 1px solid #e2e8f0;
              vertical-align: top;
              word-wrap: break-word;
            }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }

            .total-at-end {
              margin-top: 25px;
              padding-top: 10px;
              border-top: 2px solid #1e293b;
              text-align: right;
              font-weight: bold;
              font-size: 12px;
            }
            .footer-container {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 18mm;
              background: white;
              border-top: 1px solid #e2e8f0;
              font-size: 9px;
              color: #64748b;
              display: flex;
              align-items: center;
              padding: 0 10mm;
            }
            .footer-center { flex: 1; text-align: center; }
            .footer-right { width: 80px; }

            @media print {
              .watermark { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="watermark">CONFIDENTIAL</div>
          
          <div class="header">
            <div class="logo-container"><img src="${logoUrl}" crossorigin="anonymous" alt="MEWA Logo" id="pdfLogo" /></div>
            <h1 class="org-name">MEWA Health and Harm Reduction</h1>
            <h2 class="report-title">Client Cohort</h2>
            <p class="gen-info">
              Generated: ${new Date().toLocaleString()} | Prepared By: ${currentUser.name || 'User'}
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:9%">Client ID</th>
                <th style="width:18%">Full Name</th>
                <th style="width:10%">Gender/Age</th>
                <th style="width:12%">Location</th>
                <th style="width:9%">Program</th>
                <th style="width:9%">Hotspot</th>
                <th style="width:9%">PE</th>
                <th style="width:9%">Phone</th>
                <th style="width:9%">First Contact</th>
                <th style="width:6%">Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="total-at-end">
            Total Clients Registered: ${totalCount}
          </div>

          <div class="footer-container">
            <div class="footer-center">
              <strong style="color:#1e293b">CONFIDENTIAL HEALTHCARE RECORD</strong><br>
              For authorized MEWA personnel only • © 2026 MEWA Health and Harm Reduction
            </div>
            <div class="footer-right"></div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    const img = printWindow.document.getElementById('pdfLogo') as HTMLImageElement;
    const printNow = () => {
      printWindow.focus();
      printWindow.print();
    };

    if (img) {
      if (img.complete) printNow();
      else {
        img.onload = () => setTimeout(printNow, 600);
        img.onerror = printNow;
      }
    } else {
      printNow();
    }
  };

  if (viewingClientId) return <ClientDetail clientId={viewingClientId} onBack={() => setViewingClientId(null)} currentUser={currentUser} />;
  if (showAddForm) return <NewClientForm currentUser={currentUser} onSuccess={() => { setShowAddForm(false); loadClients(); }} onCancel={() => setShowAddForm(false)} />;

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl mb-2 font-bold text-slate-900">Client Management</h1>
          <p className="text-slate-600">Manage client records across all locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}><Download className="w-4 h-4 mr-2" /> CSV</Button>
          <Button variant="outline" onClick={handleExportPDF} className="text-red-700 border-red-200 hover:bg-red-50"><FileText className="w-4 h-4 mr-2" /> PDF Report</Button>
          {canEdit && <Button onClick={() => setShowAddForm(true)}><Plus className="w-4 h-4 mr-2" /> Add Client</Button>}
          {isAdmin && (
            <Dialog open={isGeneratorDialogOpen} onOpenChange={setIsGeneratorDialogOpen}>
              <DialogTrigger asChild><Button><Database className="w-4 h-4 mr-2" /> Generator</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Data Generator</DialogTitle>
                  <DialogDescription>Generate sample client data for testing purposes</DialogDescription>
                </DialogHeader>
                <DataGeneratorUI currentUser={currentUser} onComplete={() => { setIsGeneratorDialogOpen(false); loadClients(); }} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Filter Location" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Kilifi">Kilifi</SelectItem>
                <SelectItem value="Lamu">Lamu</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Clients ({filteredClients.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Client ID</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender (Age)</TableHead>
                  <TableHead>County / Sub-County</TableHead>
                  <TableHead>Hotspot</TableHead>
                  <TableHead>First Contact</TableHead>
                  <TableHead>PE</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-gray-500 py-8">No clients found</TableCell></TableRow>
                ) : (
                  filteredClients.map(client => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.clientId}</TableCell>
                      <TableCell>{client.program || '-'}</TableCell>
                      <TableCell>{client.firstName} {client.lastName}</TableCell>
                      <TableCell>{client.gender ? `${client.gender.charAt(0)}` : '-'} ({client.age || '-'})</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{client.location || client.county}</span>
                          <span className="text-xs text-gray-500">{client.subCounty}</span>
                        </div>
                      </TableCell>
                      <TableCell>{client.hotspot || '-'}</TableCell>
                      <TableCell>{client.dateOfFirstContact || '-'}</TableCell>
                      <TableCell>{client.peerEducator || '-'}</TableCell>
                      <TableCell>{client.phone || '-'}</TableCell>
                      <TableCell><Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>{client.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setViewingClientId(client.id)}><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}