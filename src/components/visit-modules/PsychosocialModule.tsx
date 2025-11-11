import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Heart, Home, Briefcase, Users, Scale, Calendar, Plus } from 'lucide-react';

interface PsychosocialModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  onUpdate: () => void;
}

export function PsychosocialModule({ visit, client, currentUser, onUpdate }: PsychosocialModuleProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSessionOpen, setIsSessionOpen] = useState(false);

  // Session Form
  const [sessionType, setSessionType] = useState('');
  const [duration, setDuration] = useState('');
  const [issuesAddressed, setIssuesAddressed] = useState<string[]>([]);
  const [housingSupport, setHousingSupport] = useState(false);
  const [housingDetails, setHousingDetails] = useState('');
  const [legalSupport, setLegalSupport] = useState(false);
  const [legalDetails, setLegalDetails] = useState('');
  const [economicSupport, setEconomicSupport] = useState(false);
  const [economicDetails, setEconomicDetails] = useState('');
  const [familySupport, setFamilySupport] = useState(false);
  const [familyDetails, setFamilyDetails] = useState('');
  const [referralsMade, setReferralsMade] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');

  const ISSUE_OPTIONS = [
    'Housing instability',
    'Food insecurity',
    'Employment',
    'Legal issues',
    'Family conflict',
    'Domestic violence',
    'Financial stress',
    'Social isolation',
    'Discrimination',
    'Other',
  ];

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/psychosocial/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading psychosocial records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'psychosocial-session',
      sessionType,
      duration: duration ? parseInt(duration) : null,
      issuesAddressed,
      support: {
        housing: housingSupport ? housingDetails : null,
        legal: legalSupport ? legalDetails : null,
        economic: economicSupport ? economicDetails : null,
        family: familySupport ? familyDetails : null,
      },
      referralsMade,
      followUp: {
        needed: followUpNeeded,
        date: followUpDate || null,
      },
      notes,
      providedBy: currentUser.id,
      providedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/psychosocial`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ record, userId: currentUser.id }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Psychosocial session recorded successfully');
        setIsSessionOpen(false);
        loadRecords();
        onUpdate();
        // Reset form
        setSessionType('');
        setDuration('');
        setIssuesAddressed([]);
        setHousingSupport(false);
        setHousingDetails('');
        setLegalSupport(false);
        setLegalDetails('');
        setEconomicSupport(false);
        setEconomicDetails('');
        setFamilySupport(false);
        setFamilyDetails('');
        setReferralsMade('');
        setFollowUpNeeded(false);
        setFollowUpDate('');
        setNotes('');
      } else {
        toast.error('Failed to record psychosocial session');
      }
    } catch (error) {
      console.error('Error recording psychosocial session:', error);
      toast.error('Failed to record psychosocial session');
    }
  };

  const toggleIssue = (issue: string) => {
    setIssuesAddressed(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  if (loading) {
    return <div className="p-4">Loading psychosocial records...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Record Case Management Session
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Psychosocial Support Session</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSession} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Session Type *</Label>
                <Select value={sessionType} onValueChange={setSessionType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case-management">Case Management</SelectItem>
                    <SelectItem value="crisis-intervention">Crisis Intervention</SelectItem>
                    <SelectItem value="legal-support">Legal Support</SelectItem>
                    <SelectItem value="social-support">Social Support</SelectItem>
                    <SelectItem value="family-counseling">Family Counseling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            {/* Issues Addressed */}
            <div>
              <Label>Issues Addressed</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ISSUE_OPTIONS.map(issue => (
                  <div key={issue} className="flex items-center gap-2">
                    <Checkbox
                      checked={issuesAddressed.includes(issue)}
                      onCheckedChange={() => toggleIssue(issue)}
                      id={`issue-${issue}`}
                    />
                    <Label htmlFor={`issue-${issue}`} className="font-normal">
                      {issue}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Support Services */}
            <div className="space-y-4">
              <h3 className="font-medium">Support Services Provided</h3>
              
              {/* Housing */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={housingSupport}
                    onCheckedChange={(checked) => setHousingSupport(checked as boolean)}
                    id="housing"
                  />
                  <Label htmlFor="housing" className="flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    Housing Support
                  </Label>
                </div>
                {housingSupport && (
                  <Input
                    value={housingDetails}
                    onChange={(e) => setHousingDetails(e.target.value)}
                    placeholder="Details: shelter referral, housing application, etc."
                    className="ml-6"
                  />
                )}
              </div>

              {/* Legal */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={legalSupport}
                    onCheckedChange={(checked) => setLegalSupport(checked as boolean)}
                    id="legal"
                  />
                  <Label htmlFor="legal" className="flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Legal Support
                  </Label>
                </div>
                {legalSupport && (
                  <Input
                    value={legalDetails}
                    onChange={(e) => setLegalDetails(e.target.value)}
                    placeholder="Details: legal aid referral, documentation, etc."
                    className="ml-6"
                  />
                )}
              </div>

              {/* Economic */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={economicSupport}
                    onCheckedChange={(checked) => setEconomicSupport(checked as boolean)}
                    id="economic"
                  />
                  <Label htmlFor="economic" className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    Economic Empowerment
                  </Label>
                </div>
                {economicSupport && (
                  <Input
                    value={economicDetails}
                    onChange={(e) => setEconomicDetails(e.target.value)}
                    placeholder="Details: job training, financial literacy, etc."
                    className="ml-6"
                  />
                )}
              </div>

              {/* Family */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={familySupport}
                    onCheckedChange={(checked) => setFamilySupport(checked as boolean)}
                    id="family"
                  />
                  <Label htmlFor="family" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Family Support
                  </Label>
                </div>
                {familySupport && (
                  <Input
                    value={familyDetails}
                    onChange={(e) => setFamilyDetails(e.target.value)}
                    placeholder="Details: family mediation, reunification, etc."
                    className="ml-6"
                  />
                )}
              </div>
            </div>

            {/* Referrals */}
            <div>
              <Label>External Referrals Made</Label>
              <Textarea
                value={referralsMade}
                onChange={(e) => setReferralsMade(e.target.value)}
                placeholder="List any external referrals to other agencies or services"
                rows={2}
              />
            </div>

            {/* Follow-up */}
            <div className="space-y-4">
              <h3 className="font-medium">Follow-up</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={followUpNeeded}
                  onCheckedChange={(checked) => setFollowUpNeeded(checked as boolean)}
                  id="follow-up"
                />
                <Label htmlFor="follow-up">Follow-up Appointment Needed</Label>
              </div>
              {followUpNeeded && (
                <div>
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label>Session Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detailed session notes, client concerns, action plan..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsSessionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Session</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Display Records */}
      <div className="space-y-4">
        {records.length > 0 ? (
          records.map((record, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-600" />
                    <div>
                      <span className="font-medium">{record.sessionType}</span>
                      {record.duration && (
                        <span className="text-sm text-gray-500 ml-2">({record.duration} min)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(record.providedAt).toLocaleString()}
                  </div>
                </div>

                {/* Issues */}
                {record.issuesAddressed && record.issuesAddressed.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Issues Addressed:</p>
                    <div className="flex flex-wrap gap-2">
                      {record.issuesAddressed.map((issue: string, i: number) => (
                        <Badge key={i} variant="outline">{issue}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Support Services */}
                {record.support && Object.values(record.support).some(v => v) && (
                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-600">Support Services:</p>
                    {record.support.housing && (
                      <div className="flex items-start gap-2 ml-4">
                        <Home className="w-4 h-4 mt-0.5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Housing Support</p>
                          <p className="text-sm text-gray-600">{record.support.housing}</p>
                        </div>
                      </div>
                    )}
                    {record.support.legal && (
                      <div className="flex items-start gap-2 ml-4">
                        <Scale className="w-4 h-4 mt-0.5 text-purple-600" />
                        <div>
                          <p className="text-sm font-medium">Legal Support</p>
                          <p className="text-sm text-gray-600">{record.support.legal}</p>
                        </div>
                      </div>
                    )}
                    {record.support.economic && (
                      <div className="flex items-start gap-2 ml-4">
                        <Briefcase className="w-4 h-4 mt-0.5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Economic Empowerment</p>
                          <p className="text-sm text-gray-600">{record.support.economic}</p>
                        </div>
                      </div>
                    )}
                    {record.support.family && (
                      <div className="flex items-start gap-2 ml-4">
                        <Users className="w-4 h-4 mt-0.5 text-orange-600" />
                        <div>
                          <p className="text-sm font-medium">Family Support</p>
                          <p className="text-sm text-gray-600">{record.support.family}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Referrals */}
                {record.referralsMade && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">External Referrals:</p>
                    <p className="text-sm text-gray-600">{record.referralsMade}</p>
                  </div>
                )}

                {/* Follow-up */}
                {record.followUp?.needed && (
                  <div className="mb-4">
                    <Badge className="bg-amber-100 text-amber-800">
                      Follow-up needed
                      {record.followUp.date && `: ${new Date(record.followUp.date).toLocaleDateString()}`}
                    </Badge>
                  </div>
                )}

                {/* Notes */}
                {record.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-1">Session Notes:</p>
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No psychosocial sessions recorded for this visit yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
