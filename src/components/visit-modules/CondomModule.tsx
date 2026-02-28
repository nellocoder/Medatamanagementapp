import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Shield, Package, Calendar, Plus, Edit2 } from 'lucide-react';

interface CondomModuleProps {
  visit: any;
  client: any;
  currentUser: any;
  onUpdate: () => void;
}

export function CondomModule({ visit, client, currentUser, onUpdate }: CondomModuleProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // Distribution Form
  const [maleCondoms, setMaleCondoms] = useState('');
  const [femaleCondoms, setFemaleCondoms] = useState('');
  const [lubricant, setLubricant] = useState('');
  const [lubricantType, setLubricantType] = useState('water-based');
  const [safeSexEducation, setSafeSexEducation] = useState(false);
  const [demonstrationProvided, setDemonstrationProvided] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadRecords();
  }, [visit.id]);

  const loadRecords = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/condom/${visit.id}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const data = await response.json();
      if (data.success) {
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error('Error loading condom records:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMaleCondoms('');
    setFemaleCondoms('');
    setLubricant('');
    setLubricantType('water-based');
    setSafeSexEducation(false);
    setDemonstrationProvided(false);
    setNotes('');
    setEditingRecord(null);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setMaleCondoms(record.maleCondoms?.toString() || '');
    setFemaleCondoms(record.femaleCondoms?.toString() || '');
    setLubricant(record.lubricant?.toString() || '');
    setLubricantType(record.lubricantType || 'water-based');
    setSafeSexEducation(record.education?.safeSex || false);
    setDemonstrationProvided(record.education?.demonstration || false);
    setNotes(record.notes || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const recordData = {
      visitId: visit.id,
      clientId: client.id,
      type: 'condom-distribution',
      maleCondoms: maleCondoms ? parseInt(maleCondoms) : 0,
      femaleCondoms: femaleCondoms ? parseInt(femaleCondoms) : 0,
      lubricant: lubricant ? parseInt(lubricant) : 0,
      lubricantType,
      education: {
        safeSex: safeSexEducation,
        demonstration: demonstrationProvided,
      },
      notes,
      providedBy: currentUser.id,
      providedAt: editingRecord?.providedAt || new Date().toISOString(),
    };

    try {
      const url = editingRecord
        ? `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/condom/${editingRecord.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/condom`;
      
      const response = await fetch(url, {
        method: editingRecord ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ record: recordData, userId: currentUser.id }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingRecord ? 'Record updated successfully' : 'Record created successfully');
        setIsDialogOpen(false);
        resetForm();
        loadRecords();
        onUpdate();
      } else {
        toast.error(data.error || 'Failed to save record');
      }
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record');
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="p-4">Loading condom distribution records...</div>;
  }

  const totalMaleCondoms = records.reduce((sum, r) => sum + (r.maleCondoms || 0), 0);
  const totalFemaleCondoms = records.reduce((sum, r) => sum + (r.femaleCondoms || 0), 0);
  const totalLubricant = records.reduce((sum, r) => sum + (r.lubricant || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{totalMaleCondoms}</p>
              <p className="text-sm text-gray-600">Male Condoms</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-pink-600" />
              <p className="text-2xl font-bold">{totalFemaleCondoms}</p>
              <p className="text-sm text-gray-600">Female Condoms</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold">{totalLubricant}</p>
              <p className="text-sm text-gray-600">Lubricant Packets</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button onClick={handleOpenDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Record Distribution
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit' : 'Record'} Condom & Lubricant Distribution
            </DialogTitle>
            <DialogDescription>
              Record the distribution of condoms and lubricants to this client
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Condoms */}
            <div className="space-y-4">
              <h3 className="font-medium">Condoms Distributed</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Male Condoms</Label>
                  <Input
                    type="number"
                    value={maleCondoms}
                    onChange={(e) => setMaleCondoms(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Female Condoms</Label>
                  <Input
                    type="number"
                    value={femaleCondoms}
                    onChange={(e) => setFemaleCondoms(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Lubricant */}
            <div className="space-y-4">
              <h3 className="font-medium">Lubricant</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Number of Packets</Label>
                  <Input
                    type="number"
                    value={lubricant}
                    onChange={(e) => setLubricant(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <select
                    value={lubricantType}
                    onChange={(e) => setLubricantType(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-md"
                  >
                    <option value="water-based">Water-based</option>
                    <option value="silicone-based">Silicone-based</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Education */}
            <div className="space-y-4">
              <h3 className="font-medium">Safe Sex Education</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={safeSexEducation}
                    onCheckedChange={(checked) => setSafeSexEducation(checked as boolean)}
                    id="safe-sex-ed"
                  />
                  <Label htmlFor="safe-sex-ed">Safe Sex Counseling Provided</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={demonstrationProvided}
                    onCheckedChange={(checked) => setDemonstrationProvided(checked as boolean)}
                    id="demonstration"
                  />
                  <Label htmlFor="demonstration">Proper Use Demonstration</Label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, concerns, referrals..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button type="submit">
                {editingRecord ? 'Update' : 'Save'} Distribution
              </Button>
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
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">Distribution #{records.length - idx}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(record)}
                      className="h-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <div className="text-sm text-gray-500">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(record.providedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  {(record.maleCondoms && record.maleCondoms > 0) && (
                    <div>
                      <p className="text-sm text-gray-600">Male Condoms</p>
                      <p className="text-lg font-medium">{record.maleCondoms}</p>
                    </div>
                  )}
                  {(record.femaleCondoms && record.femaleCondoms > 0) && (
                    <div>
                      <p className="text-sm text-gray-600">Female Condoms</p>
                      <p className="text-lg font-medium">{record.femaleCondoms}</p>
                    </div>
                  )}
                  {(record.lubricant && record.lubricant > 0) && (
                    <div>
                      <p className="text-sm text-gray-600">Lubricant ({record.lubricantType})</p>
                      <p className="text-lg font-medium">{record.lubricant} packets</p>
                    </div>
                  )}
                </div>

                {/* Show message if nothing distributed */}
                {(!record.maleCondoms || record.maleCondoms === 0) && 
                 (!record.femaleCondoms || record.femaleCondoms === 0) && 
                 (!record.lubricant || record.lubricant === 0) && (
                  <p className="text-sm text-gray-500 mb-4">No items distributed</p>
                )}

                {/* Education */}
                {record.education && (record.education.safeSex || record.education.demonstration) && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Education Provided</p>
                    <div className="flex flex-wrap gap-2">
                      {record.education.safeSex && (
                        <Badge variant="outline">Safe Sex Counseling</Badge>
                      )}
                      {record.education.demonstration && (
                        <Badge variant="outline">Proper Use Demonstration</Badge>
                      )}
                    </div>
                  </div>
                )}

                {record.notes && (
                  <p className="text-sm text-gray-600 border-t pt-3 mb-3">{record.notes}</p>
                )}

                <div className="text-xs text-gray-400 border-t pt-2">
                  Recorded by {currentUser?.name || currentUser?.email || 'Staff'} on {new Date(record.providedAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No condom distributions recorded for this visit yet.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}