import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Syringe, Package, AlertCircle, Calendar, Plus } from 'lucide-react';

interface NSPModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  onUpdate: () => void;
}

export function NSPModule({ visit, client, currentUser, onUpdate }: NSPModuleProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDistributionOpen, setIsDistributionOpen] = useState(false);

  // Distribution Form
  const [syringesGiven, setSyringesGiven] = useState('');
  const [syringesReturned, setSyringesReturned] = useState('');
  const [needleSize, setNeedleSize] = useState('');
  const [alcoholSwabs, setAlcoholSwabs] = useState('');
  const [cottonFilters, setCottonFilters] = useState('');
  const [cookers, setCookers] = useState('');
  const [tourniquets, setTourniquets] = useState('');
  const [naloxoneGiven, setNaloxoneGiven] = useState(false);
  const [naloxoneKits, setNaloxoneKits] = useState('');
  const [saferInjectionEducation, setSaferInjectionEducation] = useState(false);
  const [overdoseEducation, setOverdoseEducation] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/nsp/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading NSP records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const record = {
      visitId: visit.id,
      clientId: client.id,
      type: 'nsp-distribution',
      syringesGiven: syringesGiven ? parseInt(syringesGiven) : 0,
      syringesReturned: syringesReturned ? parseInt(syringesReturned) : 0,
      needleSize,
      supplies: {
        alcoholSwabs: alcoholSwabs ? parseInt(alcoholSwabs) : 0,
        cottonFilters: cottonFilters ? parseInt(cottonFilters) : 0,
        cookers: cookers ? parseInt(cookers) : 0,
        tourniquets: tourniquets ? parseInt(tourniquets) : 0,
      },
      naloxoneGiven,
      naloxoneKits: naloxoneGiven && naloxoneKits ? parseInt(naloxoneKits) : 0,
      education: {
        saferInjection: saferInjectionEducation,
        overdosePrevention: overdoseEducation,
      },
      notes,
      providedBy: currentUser.id,
      providedAt: new Date().toISOString(),
    };

    console.log('Saving NSP distribution:', record);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/nsp`,
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
      console.log('NSP distribution response:', data);
      
      if (data.success) {
        toast.success('NSP distribution recorded successfully');
        setIsDistributionOpen(false);
        loadRecords();
        onUpdate();
        // Reset form
        setSyringesGiven('');
        setSyringesReturned('');
        setNeedleSize('');
        setAlcoholSwabs('');
        setCottonFilters('');
        setCookers('');
        setTourniquets('');
        setNaloxoneGiven(false);
        setNaloxoneKits('');
        setSaferInjectionEducation(false);
        setOverdoseEducation(false);
        setNotes('');
      } else {
        toast.error('Failed to record NSP distribution');
      }
    } catch (error) {
      console.error('Error recording NSP distribution:', error);
      toast.error('Failed to record NSP distribution');
    }
  };

  if (loading) {
    return <div className="p-4">Loading NSP records...</div>;
  }

  const totalSyringesGiven = records.reduce((sum, r) => sum + (r.syringesGiven || 0), 0);
  const totalSyringesReturned = records.reduce((sum, r) => sum + (r.syringesReturned || 0), 0);
  const totalNaloxoneKits = records.reduce((sum, r) => sum + (r.naloxoneKits || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Syringe className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{totalSyringesGiven}</p>
              <p className="text-sm text-gray-600">Syringes Distributed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold">{totalSyringesReturned}</p>
              <p className="text-sm text-gray-600">Syringes Returned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold">{totalNaloxoneKits}</p>
              <p className="text-sm text-gray-600">Naloxone Kits Given</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Dialog open={isDistributionOpen} onOpenChange={setIsDistributionOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Record Distribution
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>NSP Distribution & Education</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDistribution} className="space-y-6">
            {/* Syringes */}
            <div className="space-y-4">
              <h3 className="font-medium">Syringe Exchange</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Syringes Distributed *</Label>
                  <Input
                    type="number"
                    value={syringesGiven}
                    onChange={(e) => setSyringesGiven(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <Label>Syringes Returned</Label>
                  <Input
                    type="number"
                    value={syringesReturned}
                    onChange={(e) => setSyringesReturned(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Needle Size</Label>
                  <Input
                    value={needleSize}
                    onChange={(e) => setNeedleSize(e.target.value)}
                    placeholder="e.g., 27G, 29G, Mixed"
                  />
                </div>
              </div>
            </div>

            {/* Other Supplies */}
            <div className="space-y-4">
              <h3 className="font-medium">Additional Supplies</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Alcohol Swabs</Label>
                  <Input
                    type="number"
                    value={alcoholSwabs}
                    onChange={(e) => setAlcoholSwabs(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Cotton Filters</Label>
                  <Input
                    type="number"
                    value={cottonFilters}
                    onChange={(e) => setCottonFilters(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Cookers</Label>
                  <Input
                    type="number"
                    value={cookers}
                    onChange={(e) => setCookers(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Tourniquets</Label>
                  <Input
                    type="number"
                    value={tourniquets}
                    onChange={(e) => setTourniquets(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Naloxone */}
            <div className="space-y-4">
              <h3 className="font-medium">Naloxone (Overdose Reversal)</h3>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={naloxoneGiven}
                  onCheckedChange={(checked) => setNaloxoneGiven(checked as boolean)}
                  id="naloxone"
                />
                <Label htmlFor="naloxone">Naloxone Kit(s) Provided</Label>
              </div>
              {naloxoneGiven && (
                <div>
                  <Label>Number of Kits</Label>
                  <Input
                    type="number"
                    value={naloxoneKits}
                    onChange={(e) => setNaloxoneKits(e.target.value)}
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="font-medium">Harm Reduction Education</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={saferInjectionEducation}
                    onCheckedChange={(checked) => setSaferInjectionEducation(checked as boolean)}
                    id="safer-injection"
                  />
                  <Label htmlFor="safer-injection">Safer Injection Practices</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={overdoseEducation}
                    onCheckedChange={(checked) => setOverdoseEducation(checked as boolean)}
                    id="overdose-ed"
                  />
                  <Label htmlFor="overdose-ed">Overdose Prevention & Response</Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, observations, referrals..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDistributionOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Distribution</Button>
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
                    <Syringe className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Distribution #{records.length - idx}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(record.providedAt).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Syringes Given</p>
                    <p className="text-lg font-medium">{record.syringesGiven}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Syringes Returned</p>
                    <p className="text-lg font-medium">{record.syringesReturned}</p>
                  </div>
                  {record.needleSize && (
                    <div>
                      <p className="text-sm text-gray-600">Needle Size</p>
                      <p className="text-lg font-medium">{record.needleSize}</p>
                    </div>
                  )}
                </div>

                {/* Supplies */}
                {record.supplies && (Object.values(record.supplies).some((v: any) => v > 0)) && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Other Supplies</p>
                    <div className="flex flex-wrap gap-2">
                      {record.supplies.alcoholSwabs > 0 && (
                        <Badge variant="secondary">Alcohol Swabs: {record.supplies.alcoholSwabs}</Badge>
                      )}
                      {record.supplies.cottonFilters > 0 && (
                        <Badge variant="secondary">Cotton Filters: {record.supplies.cottonFilters}</Badge>
                      )}
                      {record.supplies.cookers > 0 && (
                        <Badge variant="secondary">Cookers: {record.supplies.cookers}</Badge>
                      )}
                      {record.supplies.tourniquets > 0 && (
                        <Badge variant="secondary">Tourniquets: {record.supplies.tourniquets}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Naloxone */}
                {record.naloxoneGiven && (
                  <div className="mb-4">
                    <Badge className="bg-orange-100 text-orange-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Naloxone Kits: {record.naloxoneKits}
                    </Badge>
                  </div>
                )}

                {/* Education */}
                {record.education && (record.education.saferInjection || record.education.overdosePrevention) && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Education Provided</p>
                    <div className="flex flex-wrap gap-2">
                      {record.education.saferInjection && (
                        <Badge variant="outline">Safer Injection</Badge>
                      )}
                      {record.education.overdosePrevention && (
                        <Badge variant="outline">Overdose Prevention</Badge>
                      )}
                    </div>
                  </div>
                )}

                {record.notes && (
                  <p className="text-sm text-gray-600 border-t pt-3">{record.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No NSP distributions recorded for this visit yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}