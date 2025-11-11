import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { MapPin, AlertCircle, CheckCircle2, Database, ArrowRight } from 'lucide-react';

interface LocationMigrationToolProps {
  currentUser: any;
  onComplete?: () => void;
}

export function LocationMigrationTool({ currentUser, onComplete }: LocationMigrationToolProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // Location mapping
  const locationMapping: { [key: string]: string } = {
    'Location A': 'Mombasa',
    'Location B': 'Kilifi',
    'Location C': 'Lamu',
  };

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    setMigrationResult(null);

    try {
      // Fetch all clients
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error('Failed to fetch clients');
      }

      // Find clients with old location values
      const clientsToMigrate = data.clients.filter((client: any) =>
        ['Location A', 'Location B', 'Location C'].includes(client.location)
      );

      const breakdown = {
        'Location A': clientsToMigrate.filter((c: any) => c.location === 'Location A').length,
        'Location B': clientsToMigrate.filter((c: any) => c.location === 'Location B').length,
        'Location C': clientsToMigrate.filter((c: any) => c.location === 'Location C').length,
      };

      setScanResult({
        total: data.clients.length,
        needsMigration: clientsToMigrate.length,
        breakdown,
        clients: clientsToMigrate,
      });

      if (clientsToMigrate.length === 0) {
        toast.success('All clients already have correct locations!');
      } else {
        toast.info(`Found ${clientsToMigrate.length} clients that need migration`);
      }
    } catch (error) {
      console.error('Error scanning clients:', error);
      toast.error('Failed to scan clients');
    } finally {
      setScanning(false);
    }
  };

  const handleMigrate = async () => {
    if (!scanResult || scanResult.needsMigration === 0) {
      toast.error('No clients to migrate');
      return;
    }

    setIsMigrating(true);
    setProgress(0);
    setMigrationResult(null);

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      const clientsToUpdate = scanResult.clients;

      for (let i = 0; i < clientsToUpdate.length; i++) {
        const client = clientsToUpdate[i];
        const newLocation = locationMapping[client.location];

        try {
          // Update client with new location
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-56fd5521/clients/${client.id}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${publicAnonKey}`,
              },
              body: JSON.stringify({
                client: {
                  ...client,
                  location: newLocation,
                },
                userId: currentUser.id,
              }),
            }
          );

          const result = await response.json();
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${client.clientId}: ${result.error || 'Unknown error'}`);
          }
        } catch (error: any) {
          failCount++;
          errors.push(`${client.clientId}: ${error.message}`);
        }

        // Update progress
        const progressPercent = ((i + 1) / clientsToUpdate.length) * 100;
        setProgress(progressPercent);
      }

      setMigrationResult({
        total: clientsToUpdate.length,
        successCount,
        failCount,
        errors,
      });

      if (successCount === clientsToUpdate.length) {
        toast.success(`Successfully migrated ${successCount} clients!`);
      } else {
        toast.warning(`Migrated ${successCount} clients, ${failCount} failed`);
      }

      // Re-scan to show updated results
      setTimeout(() => {
        handleScan();
      }, 1000);

      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
    } catch (error) {
      console.error('Error migrating clients:', error);
      toast.error('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Data Migration
        </CardTitle>
        <CardDescription>
          Update client locations from old values (Location A/B/C) to new values (Mombasa/Kilifi/Lamu)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Migration Mapping Info */}
        <Alert>
          <Database className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Location Mapping:</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Location A</Badge>
                  <ArrowRight className="w-3 h-3" />
                  <Badge>Mombasa</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Location B</Badge>
                  <ArrowRight className="w-3 h-3" />
                  <Badge>Kilifi</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Location C</Badge>
                  <ArrowRight className="w-3 h-3" />
                  <Badge>Lamu</Badge>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Scan Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleScan}
            disabled={scanning || isMigrating}
            variant="outline"
          >
            {scanning ? 'Scanning...' : 'Scan for Old Locations'}
          </Button>
        </div>

        {/* Scan Results */}
        {scanResult && (
          <Alert className={scanResult.needsMigration > 0 ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">
                  Scan Results: {scanResult.total} total clients
                </p>
                {scanResult.needsMigration > 0 ? (
                  <>
                    <p className="text-amber-800">
                      Found <strong>{scanResult.needsMigration}</strong> clients with old location values:
                    </p>
                    <div className="space-y-1 text-sm">
                      {scanResult.breakdown['Location A'] > 0 && (
                        <div>• Location A: {scanResult.breakdown['Location A']} clients</div>
                      )}
                      {scanResult.breakdown['Location B'] > 0 && (
                        <div>• Location B: {scanResult.breakdown['Location B']} clients</div>
                      )}
                      {scanResult.breakdown['Location C'] > 0 && (
                        <div>• Location C: {scanResult.breakdown['Location C']} clients</div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-green-800">
                    ✓ All clients have correct location values!
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Migration Progress */}
        {isMigrating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Migrating clients...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Migration Results */}
        {migrationResult && (
          <Alert className={migrationResult.failCount === 0 ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Migration Complete!</p>
                <div className="text-sm space-y-1">
                  <div>✓ Successfully migrated: {migrationResult.successCount} clients</div>
                  {migrationResult.failCount > 0 && (
                    <div className="text-red-600">✗ Failed: {migrationResult.failCount} clients</div>
                  )}
                </div>
                {migrationResult.errors.length > 0 && (
                  <details className="text-xs mt-2">
                    <summary className="cursor-pointer font-medium">View Errors</summary>
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {migrationResult.errors.map((error: string, idx: number) => (
                        <div key={idx} className="text-red-600">• {error}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Migrate Button */}
        {scanResult && scanResult.needsMigration > 0 && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleMigrate}
              disabled={isMigrating || scanning}
              className="w-full"
            >
              {isMigrating ? 'Migrating...' : `Migrate ${scanResult.needsMigration} Clients`}
            </Button>
          </div>
        )}

        {/* Warning */}
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <strong>Important:</strong> This operation will update client records in the database.
            All changes are logged in the audit trail. Make sure to scan first before migrating.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
