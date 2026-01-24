import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Plus, Search, Download, Eye, Database, Map } from 'lucide-react';
import { DataGeneratorUI } from './DataGeneratorUI';
import { ClientDetail } from './ClientDetail';
import { NewClientForm } from './NewClientForm';
import { LocationMigrationTool } from './LocationMigrationTool';

interface ClientManagementProps {
  currentUser: any;
}

export function ClientManagement({ currentUser }: ClientManagementProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGeneratorDialogOpen, setIsGeneratorDialogOpen] = useState(false);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
  const [showMigrationTool, setShowMigrationTool] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const canEdit = currentUser?.role === 'Admin' || currentUser?.role === 'M&E Officer' || currentUser?.role === 'Data Entry';
  const isAdmin = currentUser?.role === 'Admin';
  
  const handleMigrateIds = async () => {
    if (!confirm('Are you sure you want to migrate all Client IDs? This will update IDs for all existing clients based on the new format (PREFIX-CountyGender-Sequence). This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/admin/migrate-ids`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: currentUser?.id })
        }
      );
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Successfully migrated ${data.migratedCount} clients!`);
        loadClients();
      } else {
        toast.error(`Migration failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error migrating IDs:', error);
      toast.error('Failed to migrate IDs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
    // Poll for updates every 10 seconds
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
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Client ID', 'Program', 'First Name', 'Last Name', 'Gender', 'Age', 'DOB',
      'Date of First Contact', 'Peer Educator', 
      'County', 'Sub-County', 'Hotspot', 
      'Phone', 'Alt Phone', 
      'Drug Start Year', 'Other Drugs', 
      'Status'
    ];
    
    const rows = filteredClients.map(c => [
      c.clientId,
      c.program || '-',
      c.firstName,
      c.lastName,
      c.gender,
      c.age,
      c.dob || '-',
      c.dateOfFirstContact || '-',
      c.peerEducator || '-',
      c.location || c.county,
      c.subCounty || '-',
      c.hotspot || '-',
      c.phone || '-',
      c.altPhone || '-',
      c.drugStartYear || '-',
      c.otherDrugs || '-',
      c.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('CSV exported successfully!');
  };

  // If viewing a specific client, show the detail view
  if (viewingClientId) {
    return (
      <ClientDetail
        clientId={viewingClientId}
        onBack={() => setViewingClientId(null)}
        currentUser={currentUser}
      />
    );
  }

  // If adding a new client, show the full-page form
  if (showAddForm) {
    return (
      <NewClientForm 
        currentUser={currentUser}
        onSuccess={() => {
          setShowAddForm(false);
          loadClients();
        }}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl mb-2">Client Management</h1>
          <p className="text-gray-600">Manage client records across all locations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          {canEdit && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Button>
          )}
          {isAdmin && (
            <Dialog open={isGeneratorDialogOpen} onOpenChange={setIsGeneratorDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Database className="w-4 h-4 mr-2" />
                  Data Generator
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Data Generator</DialogTitle>
                  <DialogDescription>Generate sample client data for testing.</DialogDescription>
                </DialogHeader>
                <DataGeneratorUI 
                  currentUser={currentUser}
                  onComplete={() => {
                    setIsGeneratorDialogOpen(false);
                    loadClients();
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && (
            <Dialog open={showMigrationTool} onOpenChange={setShowMigrationTool}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Map className="w-4 h-4 mr-2" />
                  Location Migration
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Location Migration Tool</DialogTitle>
                  <DialogDescription>Update client locations from old values to new values.</DialogDescription>
                </DialogHeader>
                <LocationMigrationTool 
                  currentUser={currentUser}
                  onComplete={() => {
                    setShowMigrationTool(false);
                    loadClients();
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && (
            <Button variant="destructive" onClick={handleMigrateIds} title="Migrate all Client IDs to new format">
              <Database className="w-4 h-4 mr-2" />
              Migrate IDs
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or client ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by location" />
              </SelectTrigger>
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

      {/* Clients Table */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
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
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-500 py-8">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.clientId}</TableCell>
                      <TableCell>{client.program || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{client.firstName} {client.lastName}</span>
                        </div>
                      </TableCell>
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
                      <TableCell>
                        <Badge variant={client.status === 'Active' ? 'default' : 'secondary'}>
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingClientId(client.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
            <DialogDescription>View complete client information and history.</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Client ID</Label>
                  <p>{selectedClient.clientId}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Location</Label>
                  <p><Badge variant="outline">{selectedClient.location}</Badge></p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">First Name</Label>
                  <p>{selectedClient.firstName}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Last Name</Label>
                  <p>{selectedClient.lastName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Age</Label>
                  <p>{selectedClient.age || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Gender</Label>
                  <p>{selectedClient.gender || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Phone</Label>
                  <p>{selectedClient.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p>{selectedClient.email || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-gray-500">Address</Label>
                <p>{selectedClient.address || '-'}</p>
              </div>
              <div>
                <Label className="text-gray-500">Status</Label>
                <p><Badge>{selectedClient.status}</Badge></p>
              </div>
              <div className="pt-4 border-t">
                <Label className="text-gray-500">Created</Label>
                <p className="text-sm">{new Date(selectedClient.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
