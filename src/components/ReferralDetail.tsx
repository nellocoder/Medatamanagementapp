import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import { 
  ArrowLeft, 
  Calendar, 
  User, 
  MapPin, 
  Phone, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  Activity,
  History,
  ShieldAlert,
  Hospital,
  Stethoscope,
  Send,
  Lock
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ScrollArea } from './ui/scroll-area';

interface ReferralDetailProps {
  referralId: string;
  currentUser: any;
  onBack: () => void;
}

export function ReferralDetail({ referralId, currentUser, onBack }: ReferralDetailProps) {
  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modal States
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showLinkageModal, setShowLinkageModal] = useState(false);
  
  // Follow-up Form State
  const [followUpData, setFollowUpData] = useState({
    actionType: 'Call',
    outcome: 'Successful',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Linkage Form State
  const [linkageData, setLinkageData] = useState({
    facility: '',
    facilityType: 'Public',
    confirmationMethod: 'Provider Confirmation',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadReferral();
  }, [referralId]);

  const loadReferral = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals?id=${referralId}`, // Note: using GET /referrals filtering or just fetch all and find?
        // Actually, routes.tsx GET /referrals returns all. I didn't implement GET /referrals/:id explicitly yet. 
        // Wait, I missed implementing GET /referrals/:id in the previous turn. 
        // I implemented GET /referrals with filters. 
        // I should probably fix that or just use the list endpoint and filter client-side for now since KV reads are fast for small datasets.
        // But for correctness, I'll fetch all and filter.
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        const found = data.referrals.find((r: any) => r.id === referralId);
        if (found) {
            setReferral(found);
        } else {
            toast.error('Referral not found');
            onBack();
        }
      }
    } catch (error) {
      console.error('Error loading referral:', error);
      toast.error('Failed to load referral details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFollowUp = async () => {
    if (!followUpData.notes) {
        toast.error('Please enter notes for the follow-up');
        return;
    }

    try {
        const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals/${referralId}/follow-up`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    followUp: followUpData,
                    userId: currentUser.name // Using name as ID for display simplicity
                })
            }
        );
        const data = await response.json();
        if (data.success) {
            toast.success('Follow-up recorded successfully');
            setReferral(data.referral); // Update local state
            setShowFollowUpModal(false);
            setFollowUpData({ ...followUpData, notes: '' });
            
            // Auto-update status if it was Pending and contact was successful?
            if (referral.status === 'Pending' && followUpData.outcome === 'Successful') {
                 // Optionally prompt user or auto-update to 'Contacted'
                 updateStatus('Contacted', 'Status updated automatically after successful contact');
            }
        } else {
            toast.error('Failed to record follow-up');
        }
    } catch (error) {
        console.error('Error recording follow-up:', error);
        toast.error('Failed to record follow-up');
    }
  };

  const handleLinkage = async () => {
    if (!linkageData.facility) {
        toast.error('Please enter the facility name');
        return;
    }

    try {
        const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals/${referralId}/link`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    linkageDetails: linkageData,
                    userId: currentUser.name
                })
            }
        );
        const data = await response.json();
        if (data.success) {
            toast.success('Referral linked to care successfully');
            setReferral(data.referral);
            setShowLinkageModal(false);
        } else {
            toast.error('Failed to link referral');
        }
    } catch (error) {
        console.error('Error linking referral:', error);
        toast.error('Failed to link referral');
    }
  };

  const updateStatus = async (newStatus: string, reason: string) => {
      try {
        const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/referrals/${referralId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${publicAnonKey}`
                },
                body: JSON.stringify({
                    updates: { status: newStatus },
                    userId: currentUser.name,
                    reason
                })
            }
        );
        const data = await response.json();
        if (data.success) {
            setReferral(data.referral);
            toast.success(`Status updated to ${newStatus}`);
        }
      } catch (error) {
          toast.error('Failed to update status');
      }
  };

  if (loading) return <div className="p-8">Loading referral details...</div>;
  if (!referral) return <div className="p-8">Referral not found</div>;

  const isLinked = referral.status === 'Linked to Care';
  
  // Permissions
  const canEdit = currentUser.role !== 'M&E Officer' && currentUser.role !== 'Data Entry';
  const canLink = ['Clinician', 'Nurse', 'Program Manager', 'Admin', 'System Admin'].includes(currentUser.role);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
           <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2 text-gray-500 hover:text-gray-900">
             <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
           </Button>
           <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
             Referral #{referral.id.split('_')[1] || referral.id.slice(-6)}
             <Badge className={
                 referral.status === 'Linked to Care' ? 'bg-green-100 text-green-800' :
                 referral.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                 referral.status === 'Contacted' ? 'bg-blue-100 text-blue-800' :
                 'bg-gray-100 text-gray-800'
             }>
                 {referral.status}
             </Badge>
           </h1>
           <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
             <span className="flex items-center gap-1"><User className="w-4 h-4" /> {referral.clientName}</span>
             <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {referral.clientLocation}</span>
             <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(referral.createdAt).toLocaleDateString()}</span>
           </div>
        </div>
        
        <div className="flex gap-2">
           {!isLinked && canEdit && (
               <>
                 <Select onValueChange={(v) => updateStatus(v, 'Manual status update')}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Update Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Failed">Failed / LTFU</SelectItem>
                        <SelectItem value="Referred Elsewhere">Referred Elsewhere</SelectItem>
                    </SelectContent>
                 </Select>
                 <Button variant="outline" onClick={() => setShowFollowUpModal(true)}>
                    <Phone className="w-4 h-4 mr-2" /> Add Follow-up
                 </Button>
                 {canLink && (
                     <Button onClick={() => setShowLinkageModal(true)} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Link to Care
                     </Button>
                 )}
               </>
           )}
           {isLinked && (
               <Button variant="outline" disabled className="bg-green-50 text-green-700 border-green-200 opacity-100">
                   <CheckCircle2 className="w-4 h-4 mr-2" /> Successfully Linked
               </Button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Core Info & Risk */}
        <div className="space-y-6 lg:col-span-1">
           {/* Risk Card */}
           <Card className={`border-t-4 ${
               referral.riskLevel === 'High' ? 'border-t-red-500' :
               referral.riskLevel === 'Medium' ? 'border-t-amber-500' :
               'border-t-blue-500'
           }`}>
             <CardHeader>
               <CardTitle className="flex items-center justify-between text-base">
                 Risk Assessment
                 <Badge variant={referral.riskLevel === 'High' ? 'destructive' : 'secondary'}>
                    {referral.riskLevel} Risk
                 </Badge>
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
               <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Trigger Reason</p>
                  <p className="text-sm font-medium mt-1">{referral.triggerReason}</p>
               </div>
               <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Referred Service</p>
                  <div className="flex items-center gap-2 mt-1">
                     <Stethoscope className="w-4 h-4 text-indigo-600" />
                     <span className="font-semibold">{referral.service}</span>
                  </div>
               </div>
               {referral.riskContext && (
                   <div className="bg-gray-50 p-3 rounded-md text-sm">
                      <p className="font-medium mb-1 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Clinical Context
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <span>Source: {referral.riskContext.source}</span>
                          <span>Score: {referral.riskContext.score}</span>
                          <span>Severity: {referral.riskContext.severity}</span>
                          <span>Date: {new Date(referral.riskContext.date).toLocaleDateString()}</span>
                      </div>
                   </div>
               )}
             </CardContent>
           </Card>

           {/* Client Details */}
           <Card>
             <CardHeader>
               <CardTitle className="text-base">Client Information</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-gray-500">Program</span>
                    <span className="text-sm font-medium">{referral.clientProgram}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-gray-500">Phone</span>
                    <span className="text-sm font-medium">{referral.clientPhone || 'N/A'}</span>
                </div>
                <div className="flex justify-between pt-1">
                    <span className="text-sm text-gray-500">Priority</span>
                    <Badge variant="outline">{referral.priority}</Badge>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Middle/Right: Timeline & Actions */}
        <div className="lg:col-span-2 space-y-6">
           <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                 <TabsTrigger value="overview">Overview & Timeline</TabsTrigger>
                 <TabsTrigger value="linkage" disabled={!isLinked && !referral.linkage}>Linkage Details</TabsTrigger>
                 <TabsTrigger value="audit">Audit Log</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                 
                 {/* Linkage Banner if Linked */}
                 {isLinked && (
                     <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-green-900">Linked to Care</h3>
                            <p className="text-sm text-green-700">
                                Client successfully linked to <strong>{referral.linkage?.facility}</strong> on {new Date(referral.linkage?.date).toLocaleDateString()}.
                            </p>
                        </div>
                     </div>
                 )}

                 {/* Timeline */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Activity Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                
                                {/* Creation Event */}
                                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-indigo-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                                        <div className="flex items-center justify-between space-x-2 mb-1">
                                            <div className="font-bold text-slate-900">Referral Created</div>
                                            <time className="font-caveat font-medium text-indigo-500">{new Date(referral.createdAt).toLocaleDateString()}</time>
                                        </div>
                                        <div className="text-slate-500 text-sm">Created by {referral.createdBy}. Status: Pending</div>
                                    </div>
                                </div>

                                {/* Follow Ups */}
                                {referral.followUps?.map((fu: any, idx: number) => (
                                    <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                                            fu.outcome === 'Successful' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                                        }`}>
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-slate-900">{fu.actionType}</div>
                                                <time className="font-caveat font-medium text-indigo-500">{new Date(fu.date).toLocaleDateString()}</time>
                                            </div>
                                            <div className="text-slate-500 text-sm mb-2">
                                                Outcome: <span className="font-medium">{fu.outcome}</span>
                                            </div>
                                            <div className="text-slate-600 text-sm bg-slate-50 p-2 rounded italic">
                                                "{fu.notes}"
                                            </div>
                                            <div className="text-xs text-slate-400 mt-2">Recorded by {fu.recordedBy}</div>
                                        </div>
                                    </div>
                                ))}

                                {/* Linkage Event */}
                                {referral.linkage && (
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-green-600 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                            <Hospital className="w-5 h-5" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-green-200 bg-green-50 shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-green-900">Linked to Care</div>
                                                <time className="font-caveat font-medium text-green-700">{new Date(referral.linkage.date).toLocaleDateString()}</time>
                                            </div>
                                            <div className="text-green-800 text-sm mb-1">
                                                Facility: <strong>{referral.linkage.facility}</strong> ({referral.linkage.facilityType})
                                            </div>
                                            {referral.linkage.notes && (
                                                <div className="text-green-700 text-sm italic">
                                                    "{referral.linkage.notes}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </ScrollArea>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="linkage">
                 <Card>
                    <CardHeader>
                        <CardTitle>Linkage Verification</CardTitle>
                        <CardDescription>Details of successful linkage to care</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Facility Name</Label>
                                <div className="p-2 bg-gray-50 rounded border mt-1">{referral.linkage?.facility}</div>
                            </div>
                            <div>
                                <Label>Facility Type</Label>
                                <div className="p-2 bg-gray-50 rounded border mt-1">{referral.linkage?.facilityType}</div>
                            </div>
                            <div>
                                <Label>Confirmation Method</Label>
                                <div className="p-2 bg-gray-50 rounded border mt-1">{referral.linkage?.confirmationMethod}</div>
                            </div>
                            <div>
                                <Label>Linkage Date</Label>
                                <div className="p-2 bg-gray-50 rounded border mt-1">{new Date(referral.linkage?.date || Date.now()).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div>
                             <Label>Notes</Label>
                             <div className="p-3 bg-gray-50 rounded border mt-1 min-h-[80px]">{referral.linkage?.notes || 'No notes provided'}</div>
                        </div>
                    </CardContent>
                 </Card>
              </TabsContent>

              <TabsContent value="audit">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                              <ShieldAlert className="w-5 h-5" /> Audit History
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="space-y-4">
                              {referral.auditLog?.map((log: any, idx: number) => (
                                  <div key={idx} className="flex justify-between border-b pb-2 last:border-0">
                                      <div>
                                          <p className="font-medium text-sm text-gray-900">{log.action.toUpperCase().replace(/_/g, ' ')}</p>
                                          <p className="text-xs text-gray-500">{log.details}</p>
                                          {log.changes && (
                                              <pre className="text-[10px] bg-gray-100 p-1 mt-1 rounded text-gray-600 overflow-x-auto max-w-xs">
                                                  {JSON.stringify(log.changes, null, 2)}
                                              </pre>
                                          )}
                                      </div>
                                      <div className="text-right">
                                          <p className="text-xs font-medium">{log.user}</p>
                                          <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </CardContent>
                  </Card>
              </TabsContent>
           </Tabs>
        </div>
      </div>

      {/* Follow-up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={setShowFollowUpModal}>
         <DialogContent>
             <DialogHeader>
                 <DialogTitle>Record Follow-up Action</DialogTitle>
                 <DialogDescription>Record details of the outreach attempt.</DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <Label>Action Type</Label>
                         <Select 
                            value={followUpData.actionType} 
                            onValueChange={(v) => setFollowUpData({...followUpData, actionType: v})}
                         >
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="Call">Phone Call</SelectItem>
                                 <SelectItem value="Home Visit">Home Visit</SelectItem>
                                 <SelectItem value="Escort">Client Escort</SelectItem>
                                 <SelectItem value="Facility Meeting">Facility Meeting</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                     <div>
                         <Label>Date</Label>
                         <Input 
                            type="date" 
                            value={followUpData.date}
                            onChange={(e) => setFollowUpData({...followUpData, date: e.target.value})}
                         />
                     </div>
                 </div>
                 <div>
                     <Label>Outcome</Label>
                     <Select 
                        value={followUpData.outcome} 
                        onValueChange={(v) => setFollowUpData({...followUpData, outcome: v})}
                     >
                         <SelectTrigger><SelectValue /></SelectTrigger>
                         <SelectContent>
                             <SelectItem value="Successful">Successful (Client contacted)</SelectItem>
                             <SelectItem value="Unsuccessful">Unsuccessful (Unreachable)</SelectItem>
                             <SelectItem value="Client Refused">Client Refused</SelectItem>
                             <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>
                 <div>
                     <Label>Notes *</Label>
                     <Textarea 
                        placeholder="Describe the interaction..."
                        value={followUpData.notes}
                        onChange={(e) => setFollowUpData({...followUpData, notes: e.target.value})}
                     />
                 </div>
             </div>
             <DialogFooter>
                 <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
                 <Button onClick={handleAddFollowUp}><Send className="w-4 h-4 mr-2" /> Record Follow-up</Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Linkage Modal */}
      <Dialog open={showLinkageModal} onOpenChange={setShowLinkageModal}>
         <DialogContent>
             <DialogHeader>
                 <DialogTitle>Verify Linkage to Care</DialogTitle>
                 <DialogDescription>Confirm that the client has arrived at the referred facility.</DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
                 <div>
                     <Label>Facility Name *</Label>
                     <Input 
                        placeholder="e.g. Coast General Hospital"
                        value={linkageData.facility}
                        onChange={(e) => setLinkageData({...linkageData, facility: e.target.value})}
                     />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <Label>Facility Type</Label>
                         <Select 
                            value={linkageData.facilityType} 
                            onValueChange={(v) => setLinkageData({...linkageData, facilityType: v})}
                         >
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="Public">Public Hospital</SelectItem>
                                 <SelectItem value="Private">Private Clinic</SelectItem>
                                 <SelectItem value="NGO">NGO Facility</SelectItem>
                                 <SelectItem value="Community">Community Center</SelectItem>
                             </SelectContent>
                         </Select>
                     </div>
                     <div>
                         <Label>Linkage Date</Label>
                         <Input 
                            type="date" 
                            value={linkageData.date}
                            onChange={(e) => setLinkageData({...linkageData, date: e.target.value})}
                         />
                     </div>
                 </div>
                 <div>
                     <Label>Confirmation Method</Label>
                     <Select 
                        value={linkageData.confirmationMethod} 
                        onValueChange={(v) => setLinkageData({...linkageData, confirmationMethod: v})}
                     >
                         <SelectTrigger><SelectValue /></SelectTrigger>
                         <SelectContent>
                             <SelectItem value="Provider Confirmation">Provider Confirmation (Call/Email)</SelectItem>
                             <SelectItem value="Referral Slip">Returned Referral Slip</SelectItem>
                             <SelectItem value="Client Report">Client Self-Report</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>
                 <div>
                     <Label>Notes (Optional)</Label>
                     <Textarea 
                        placeholder="Any additional details..."
                        value={linkageData.notes}
                        onChange={(e) => setLinkageData({...linkageData, notes: e.target.value})}
                     />
                 </div>
             </div>
             <DialogFooter>
                 <Button variant="outline" onClick={() => setShowLinkageModal(false)}>Cancel</Button>
                 <Button onClick={handleLinkage} className="bg-green-600 hover:bg-green-700">
                     <CheckCircle2 className="w-4 h-4 mr-2" /> Confirm Linkage
                 </Button>
             </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}