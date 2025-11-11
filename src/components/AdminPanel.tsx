import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Shield,
  Users,
  Settings,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  UserPlus,
  UserCog,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Database,
  FileText,
  Copy,
  Save
} from 'lucide-react';
import { ROLE_DEFINITIONS, PERMISSION_TEMPLATES, PERMISSIONS, LOCATIONS, PROGRAMS, getRolePermissions } from '../utils/permissions';

interface AdminPanelProps {
  currentUser: any;
}

export function AdminPanel({ currentUser }: AdminPanelProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');

  const isAdmin = currentUser?.role === 'System Admin' || currentUser?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes, auditRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/roles`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/audit`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }),
      ]);

      const [usersData, rolesData, auditData] = await Promise.all([
        usersRes.json(),
        rolesRes.json(),
        auditRes.json(),
      ]);

      if (usersData.success) setUsers(usersData.users || []);
      if (rolesData.success) setRoles(rolesData.roles || []);
      if (auditData.success) setAuditLogs((auditData.logs || []).slice(0, 50)); // Last 50 logs
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
      // Set empty arrays so the UI still renders
      setUsers([]);
      setRoles([]);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const user = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      location: formData.get('location'),
      programs: [formData.get('program')],
      status: 'Active',
      twoFactorEnabled: false,
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ user, adminUserId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('User created successfully!');
        setIsAddUserDialogOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.currentTarget);
    
    const updates = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: formData.get('role'),
      location: formData.get('location'),
      programs: [formData.get('program')],
      status: formData.get('status'),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ updates, adminUserId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('User updated successfully!');
        setIsEditUserDialogOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        toast.error(data.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ adminUserId: currentUser.id, permanent: false }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('User deactivated successfully!');
        loadData();
      } else {
        toast.error(data.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    const newPassword = 'TempPassword123!';
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            updates: { password: newPassword, passwordResetRequired: true },
            adminUserId: currentUser.id 
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Password reset to: ${newPassword}`);
      } else {
        toast.error(data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const openPermissionsDialog = (user: any) => {
    setSelectedUser(user);
    const rolePerms = getRolePermissions(user.role);
    const overrides = Array.isArray(user.permissionOverrides) ? user.permissionOverrides : [];
    setCustomPermissions([...rolePerms, ...overrides]);
    setIsPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            updates: { permissionOverrides: customPermissions },
            adminUserId: currentUser.id 
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Permissions updated successfully!');
        setIsPermissionsDialogOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Network error. Please try again.');
    }
  };

  const togglePermission = (permission: string) => {
    if (customPermissions.includes(permission)) {
      setCustomPermissions(customPermissions.filter(p => p !== permission));
    } else {
      setCustomPermissions([...customPermissions, permission]);
    }
  };

  const applyTemplate = (templateName: string) => {
    const template = PERMISSION_TEMPLATES[templateName as keyof typeof PERMISSION_TEMPLATES];
    if (template) {
      setCustomPermissions(template.permissions);
      toast.success(`Applied ${template.name} template`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access the Admin Panel. This feature is only available to System Administrators.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl mb-1">Admin Panel</h1>
          <p className="text-gray-600">Manage users, roles, and system permissions</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl shadow-sm">
          <TabsTrigger value="users" className="rounded-lg">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg">
            <Shield className="w-4 h-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg">
            <Activity className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl mb-1">User Management</h2>
              <p className="text-sm text-gray-600">{users.length} total users</p>
            </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>Add a new user account with role and location assignment.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary Password *</Label>
                    <Input id="password" name="password" type="password" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select name="role" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(ROLE_DEFINITIONS).map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Select name="location" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATIONS.map(loc => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="program">Primary Program *</Label>
                    <Select name="program" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAMS.map(prog => (
                          <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                        ))}
                        <SelectItem value="All">All Programs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create User
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            style={{ 
                              backgroundColor: ROLE_DEFINITIONS[user.role as keyof typeof ROLE_DEFINITIONS]?.color + '20',
                              borderColor: ROLE_DEFINITIONS[user.role as keyof typeof ROLE_DEFINITIONS]?.color,
                              color: ROLE_DEFINITIONS[user.role as keyof typeof ROLE_DEFINITIONS]?.color
                            }}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            <MapPin className="w-3 h-3" />
                            {user.location}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.status === 'Active' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPermissionsDialog(user)}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user.id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            {user.status === 'Active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateUser(user.id)}
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles" className="space-y-6">
          <div>
            <h2 className="text-xl mb-1">Roles & Permissions Matrix</h2>
            <p className="text-sm text-gray-600">View and manage role definitions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLE_DEFINITIONS).map(([roleName, roleData]) => (
              <Card key={roleName} className="rounded-2xl shadow-sm border-0 bg-white">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{roleData.name}</CardTitle>
                      <CardDescription className="mt-1">{roleData.description}</CardDescription>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: roleData.color + '20' }}
                    >
                      <Shield className="w-5 h-5" style={{ color: roleData.color }} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <strong>{roleData.permissions.length}</strong> permissions
                    </p>
                    {roleData.restrictions && (
                      <div className="text-xs text-gray-500">
                        <p>Restrictions:</p>
                        <ul className="list-disc list-inside mt-1">
                          {Object.entries(roleData.restrictions).map(([key, value]) => (
                            <li key={key}>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardHeader>
              <CardTitle>Permission Templates</CardTitle>
              <CardDescription>Pre-configured permission sets for quick assignment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(PERMISSION_TEMPLATES).map(([templateName, template]) => (
                  <div key={templateName} className="p-4 border rounded-xl">
                    <h4 className="font-medium mb-1">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <p className="text-xs text-gray-500">{template.permissions.length} permissions</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl mb-1">Audit Logs</h2>
              <p className="text-sm text-gray-600">Track all system changes and user actions</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Logs
            </Button>
          </div>

          <Card className="rounded-2xl shadow-sm border-0 bg-white">
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No audit logs available
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log, index) => (
                      <TableRow key={log.id || `log-${index}`}>
                        <TableCell className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.userId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>{log.entityType}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {log.entityId ? `${log.entityId.substring(0, 20)}...` : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user profile and role assignment.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input id="edit-name" name="name" defaultValue={selectedUser.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input id="edit-email" name="email" type="email" defaultValue={selectedUser.email} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select name="role" defaultValue={selectedUser.role} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ROLE_DEFINITIONS).map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Select name="location" defaultValue={selectedUser.location} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATIONS.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-program">Program</Label>
                  <Select name="program" defaultValue={selectedUser.programs?.[0]} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROGRAMS.map(prog => (
                        <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                      ))}
                      <SelectItem value="All">All Programs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select name="status" defaultValue={selectedUser.status} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Suspended">Suspended</SelectItem>
                      <SelectItem value="Deactivated">Deactivated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions: {selectedUser?.name}</DialogTitle>
            <DialogDescription>Customize permissions for this user.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <p className="text-sm text-gray-600 w-full mb-2">Quick Apply Template:</p>
              {Object.keys(PERMISSION_TEMPLATES).map(templateName => (
                <Button
                  key={templateName}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(templateName)}
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {PERMISSION_TEMPLATES[templateName as keyof typeof PERMISSION_TEMPLATES].name}
                </Button>
              ))}
            </div>

            <div className="space-y-4">
              <p className="text-sm">
                Selected: <strong>{customPermissions.length}</strong> permissions
              </p>
              
              <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-4 border rounded-xl">
                {Object.entries(PERMISSIONS).map(([key, permission]) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={customPermissions.includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                    />
                    <Label htmlFor={permission} className="text-sm cursor-pointer">
                      {key.replace(/_/g, ' ').toLowerCase()}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePermissions}>
                <Save className="w-4 h-4 mr-2" />
                Save Permissions
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}