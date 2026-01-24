import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { StandardForm, FormSection, FormRow } from './ui/standard-form-layout';
import { User, ClipboardList, MapPin, Phone, AlertTriangle, Calendar } from 'lucide-react';
import { useFormPersistence } from '../hooks/use-form-persistence';

interface NewClientFormProps {
  currentUser: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const COUNTIES = {
  'Mombasa': ['Mvita', 'Nyali', 'Changamwe', 'Jomvu', 'Kisauni', 'Likoni'],
  'Kilifi': ['Kilifi North', 'Kilifi South', 'Kaloleni', 'Rabai', 'Ganze', 'Malindi', 'Magarini'],
  'Lamu': ['Lamu East', 'Lamu West']
};

const COUNTY_CODES: Record<string, string> = {
  'Mombasa': '001',
  'Kilifi': '003',
  'Lamu': '005'
};

const GENDER_CODES: Record<string, string> = {
  'Male': 'M',
  'Female': 'F',
  'Other': 'O',
  'Prefer not to say': 'X'
};

export function NewClientForm({ currentUser, onSuccess, onCancel }: NewClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedClientId, setGeneratedClientId] = useState('');
  const [idComponents, setIdComponents] = useState({ prefix: '', sequence: '' });
  
  // Form State
  const [formData, setFormData, clearFormData] = useFormPersistence('new_client_form', {
    program: '',
    clientId: '',
    dateOfFirstContact: '',
    peerEducator: '',
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    age: '',
    phone: '',
    altPhone: '',
    county: '',
    subCounty: '',
    hotspot: '',
    drugStartYear: '',
    otherDrugs: ''
  });

  // Calculate age when DOB changes
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  }, [formData.dob]);

  // Fetch next client ID when program or county changes
  useEffect(() => {
    if (formData.program && formData.county) {
      const fetchNextId = async () => {
        try {
          // Pass both program and county to get the correct scoped sequence
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients/next-id?program=${formData.program}&county=${formData.county}`,
            { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
          );
          const data = await response.json();
          if (data.success) {
            // Store components for dynamic construction
            setIdComponents({
              prefix: data.prefix || 'CL',
              sequence: data.paddedSequence || '0001'
            });
          }
        } catch (error) {
          console.error('Error fetching next ID:', error);
        }
      };
      fetchNextId();
    }
  }, [formData.program, formData.county]);

  // Construct Client ID based on components and form data
  useEffect(() => {
    if (idComponents.prefix && idComponents.sequence) {
      const countyCode = COUNTY_CODES[formData.county] || 'XXX';
      const genderCode = GENDER_CODES[formData.gender] || 'X';
      
      const newId = `${idComponents.prefix}-${countyCode}${genderCode}-${idComponents.sequence}`;
      
      setGeneratedClientId(newId);
      // Only update form data if it changed to avoid loops/redraws
      if (formData.clientId !== newId) {
        setFormData(prev => ({ ...prev, clientId: newId }));
      }
    }
  }, [idComponents, formData.county, formData.gender]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.program) return toast.error('Please select a program');
    if (!formData.dateOfFirstContact) return toast.error('Date of first contact is required');
    if (!formData.peerEducator) return toast.error('Peer Educator name is required');
    if (!formData.firstName || !formData.lastName) return toast.error('Name is required');
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            client: {
              ...formData,
              status: 'Active',
              location: formData.county, // Use county as primary location for compatibility
            },
            userId: currentUser.id
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Client registered successfully');
        clearFormData();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to register client');
      }
    } catch (error) {
      console.error('Error registering client:', error);
      toast.error('Failed to register client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions = (
    <>
      <Button variant="outline" onClick={() => {
        if (window.confirm('Are you sure you want to cancel? All unsaved data will be lost.')) {
          clearFormData();
          onCancel();
        }
      }}>Cancel</Button>
      <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary text-white">
        {isSubmitting ? 'Saving...' : 'Save Client'}
      </Button>
    </>
  );

  return (
    <StandardForm
      title="Client Onboarding"
      description="Register a new client into the program."
      actions={actions}
      className="max-w-[900px]"
    >
      {/* Section 1: Client Classification */}
      <FormSection
        title="Client Classification"
        description="Program assignment and identification"
        icon={<ClipboardList className="w-5 h-5" />}
        required
        defaultOpen={true}
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>Client Type / Program *</Label>
            <Select 
              value={formData.program} 
              onValueChange={(v) => setFormData({...formData, program: v})}
            >
              <SelectTrigger><SelectValue placeholder="Select Program" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="General">General Client</SelectItem>
                <SelectItem value="NSP">NSP (Needle & Syringe)</SelectItem>
                <SelectItem value="MAT">MAT (Methadone)</SelectItem>
                <SelectItem value="Stimulants">Stimulants User</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Client ID (Auto-generated)</Label>
            <Input 
              value={generatedClientId} 
              readOnly 
              className="bg-gray-100 text-gray-500 cursor-not-allowed" 
              placeholder="Select details to generate"
            />
          </div>
        </FormRow>
      </FormSection>

      {/* Section 2: First Contact Information */}
      <FormSection
        title="First Contact Information"
        description="Initial engagement details"
        icon={<Calendar className="w-5 h-5" />}
        required
        defaultOpen={true}
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>Date of First Contact *</Label>
            <Input 
              type="date"
              value={formData.dateOfFirstContact}
              onChange={(e) => setFormData({...formData, dateOfFirstContact: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Peer Educator Name *</Label>
            <Input 
              placeholder="Name of PE who identified client"
              value={formData.peerEducator}
              onChange={(e) => setFormData({...formData, peerEducator: e.target.value})}
            />
          </div>
        </FormRow>
      </FormSection>

      {/* Section 3: Client Personal Details */}
      <FormSection
        title="Client Personal Details"
        description="Basic demographic information"
        icon={<User className="w-5 h-5" />}
        required
        defaultOpen={true}
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            />
          </div>
        </FormRow>
        <FormRow columns={3}>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select 
              value={formData.gender}
              onValueChange={(v) => setFormData({...formData, gender: v})}
            >
              <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input 
              type="date"
              value={formData.dob}
              onChange={(e) => setFormData({...formData, dob: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Age (Auto-calculated)</Label>
            <Input 
              value={formData.age}
              readOnly
              className="bg-gray-50"
              placeholder="-"
            />
          </div>
        </FormRow>
      </FormSection>

      {/* Section 4: Contact Information */}
      <FormSection
        title="Contact Information"
        description="Phone numbers and contact details"
        icon={<Phone className="w-5 h-5" />}
        defaultOpen={true}
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>Primary Phone Number</Label>
            <Input 
              type="tel"
              placeholder="07..."
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
            <p className="text-xs text-gray-500">Omit leading 0 (e.g. 712345678)</p>
          </div>
          <div className="space-y-2">
            <Label>Alternative Contact (Optional)</Label>
            <Input 
              type="tel"
              placeholder="Secondary phone"
              value={formData.altPhone}
              onChange={(e) => setFormData({...formData, altPhone: e.target.value})}
            />
          </div>
        </FormRow>
      </FormSection>

      {/* Section 5: Location Details */}
      <FormSection
        title="Location Details"
        description="Where the client operates or lives"
        icon={<MapPin className="w-5 h-5" />}
        defaultOpen={true}
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>County</Label>
            <Select 
              value={formData.county}
              onValueChange={(v) => setFormData({...formData, county: v, subCounty: ''})}
            >
              <SelectTrigger><SelectValue placeholder="Select County" /></SelectTrigger>
              <SelectContent>
                {Object.keys(COUNTIES).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sub-County</Label>
            <Select 
              value={formData.subCounty}
              onValueChange={(v) => setFormData({...formData, subCounty: v})}
              disabled={!formData.county}
            >
              <SelectTrigger><SelectValue placeholder="Select Sub-County" /></SelectTrigger>
              <SelectContent>
                {formData.county && COUNTIES[formData.county]?.map((sc: string) => (
                  <SelectItem key={sc} value={sc}>{sc}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormRow>
        <FormRow columns={1}>
          <div className="space-y-2">
            <Label>Usual operating / hangout location</Label>
            <Input 
              placeholder="e.g. Maskani near the market"
              value={formData.hotspot}
              onChange={(e) => setFormData({...formData, hotspot: e.target.value})}
            />
          </div>
        </FormRow>
      </FormSection>

      {/* Section 6: Optional Risk Context */}
      <FormSection
        title="Optional Risk Context"
        description="Additional context regarding substance use history"
        icon={<AlertTriangle className="w-5 h-5" />}
        defaultOpen={false} // Collapsed by default
      >
        <FormRow columns={2}>
          <div className="space-y-2">
            <Label>Year started using mugukaa/miraa</Label>
            <Input 
              type="number"
              placeholder="YYYY"
              value={formData.drugStartYear}
              onChange={(e) => setFormData({...formData, drugStartYear: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label>Other drugs used</Label>
            <Input 
              placeholder="Comma separated list"
              value={formData.otherDrugs}
              onChange={(e) => setFormData({...formData, otherDrugs: e.target.value})}
            />
          </div>
        </FormRow>
      </FormSection>
    </StandardForm>
  );
}
