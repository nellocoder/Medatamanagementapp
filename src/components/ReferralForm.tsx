import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useFormPersistence } from '../hooks/use-form-persistence';
import { StandardForm, FormSection, FormRow } from './ui/standard-form-layout';
import { User, ClipboardList, AlertTriangle } from 'lucide-react';

interface ReferralFormProps {
  clients: any[];
  currentUser: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReferralForm({ clients, currentUser, onSuccess, onCancel }: ReferralFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData, clearFormData] = useFormPersistence('referral_form_data', {
    clientId: '',
    source: 'Outreach',
    triggerReason: '',
    service: 'PrEP',
    riskLevel: 'Medium',
    priority: 'Routine',
    assignedTo: '',
    notes: ''
  });

  // Fetch users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/users`,
          { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
        );
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const getAssignableRoles = (serviceType: string): string[] => {
    const alwaysInclude = ['System Admin', 'Admin', 'Program Manager', 'Program Coordinator'];
    const map: Record<string, string[]> = {
      'PrEP': ['Nurse', 'Clinician', 'HTS Counsellor'],
      'ART': ['Nurse', 'Clinician'],
      'Mental Health': ['Counsellor', 'Psychologist'],
      'TB': ['Nurse', 'Clinician'],
      'GBV': ['Paralegal', 'Social Worker', 'Counsellor', 'Psychologist'],
      'Legal': ['Paralegal'],
    };
    const specificRoles = map[serviceType] || [];
    // If no specific roles (e.g. 'Other'), include a broader set
    if (specificRoles.length === 0) {
        return [...alwaysInclude, 'Social Worker', 'Clinician', 'Nurse', 'Counsellor', 'Paralegal', 'Psychologist', 'Outreach Worker'];
    }
    return [...new Set([...alwaysInclude, ...specificRoles])];
  };

  const assignableUsers = users.filter(u => {
    if (!u.role) return false;
    const allowedRoles = getAssignableRoles(formData.service);
    return allowedRoles.includes(u.role);
  });

  const handleSubmit = async () => {
    if (!formData.clientId) {
        toast.error('Please select a client');
        return;
    }
    if (!formData.triggerReason) {
        toast.error('Please enter a trigger reason');
        return;
    }

    setIsSubmitting(true);
    try {
        const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    referral: {
                        ...formData,
                        clientName: clients.find(c => c.id === formData.clientId)?.firstName || 'Unknown', // Denormalize for convenience if needed by backend, though backend fetches it
                    },
                    userId: currentUser.name
                })
            }
        );
        
        const data = await response.json();
        if (data.success) {
            toast.success('Referral created successfully');
            clearFormData();
            onSuccess();
        } else {
            toast.error(data.error || 'Failed to create referral');
        }
    } catch (error) {
        console.error('Error creating referral:', error);
        toast.error('Failed to create referral');
    } finally {
        setIsSubmitting(false);
    }
  };

  const actions = (
      <>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Referral'}
        </Button>
      </>
  );

  return (
    <StandardForm
        title="New Referral"
        description="Create a new service referral for a client."
        actions={actions}
    >
        <FormSection 
            title="Client & Context" 
            description="Who is being referred and why?"
            icon={<User className="w-5 h-5" />}
            required
            defaultOpen={true}
        >
            <FormRow columns={2}>
                <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select 
                        value={formData.clientId} 
                        onValueChange={(v) => setFormData({...formData, clientId: v})}
                    >
                        <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                        <SelectContent>
                            {clients.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Referral Source *</Label>
                    <Select 
                        value={formData.source} 
                        onValueChange={(v) => setFormData({...formData, source: v})}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Clinical">Clinical Assessment</SelectItem>
                            <SelectItem value="Mental Health">Mental Health Screening</SelectItem>
                            <SelectItem value="Outreach">Outreach / Field</SelectItem>
                            <SelectItem value="Self">Client Self-Referral</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Trigger Reason *</Label>
                    <Input 
                        placeholder="e.g. High risk sexual behavior reported during outreach"
                        value={formData.triggerReason}
                        onChange={(e) => setFormData({...formData, triggerReason: e.target.value})}
                    />
                </div>
            </FormRow>
        </FormSection>

        <FormSection
            title="Referral Details"
            description="Service required and urgency level"
            icon={<ClipboardList className="w-5 h-5" />}
            required
            defaultOpen={true}
        >
            <FormRow columns={2}>
                <div className="space-y-2">
                    <Label>Referred Service *</Label>
                    <Select 
                        value={formData.service} 
                        onValueChange={(v) => setFormData({...formData, service: v})}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PrEP">PrEP Services</SelectItem>
                            <SelectItem value="ART">ART / HIV Care</SelectItem>
                            <SelectItem value="Mental Health">Mental Health / Counseling</SelectItem>
                            <SelectItem value="TB">TB Treatment</SelectItem>
                            <SelectItem value="GBV">GBV Support</SelectItem>
                            <SelectItem value="Legal">Legal Aid</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Risk Level *</Label>
                    <Select 
                        value={formData.riskLevel} 
                        onValueChange={(v) => setFormData({...formData, riskLevel: v})}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Priority *</Label>
                    <Select 
                        value={formData.priority} 
                        onValueChange={(v) => setFormData({...formData, priority: v})}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Routine">Routine</SelectItem>
                            <SelectItem value="Urgent">Urgent</SelectItem>
                            <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <Select 
                        value={formData.assignedTo} 
                        onValueChange={(v) => setFormData({...formData, assignedTo: v})}
                    >
                        <SelectTrigger><SelectValue placeholder="Select Staff" /></SelectTrigger>
                        <SelectContent>
                            {assignableUsers.length === 0 ? (
                                <SelectItem value="none" disabled>No matching staff found</SelectItem>
                            ) : (
                                assignableUsers.map(u => (
                                    <SelectItem key={u.id} value={u.name}>
                                        {u.name} ({u.role})
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </FormRow>
        </FormSection>

        <FormSection
            title="Additional Notes"
            icon={<AlertTriangle className="w-5 h-5" />}
        >
            <div className="space-y-2">
                <Label>Clinical/Case Notes</Label>
                <Textarea 
                    placeholder="Any specific instructions or context for the receiving provider..."
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[100px]"
                />
            </div>
        </FormSection>
    </StandardForm>
  );
}
