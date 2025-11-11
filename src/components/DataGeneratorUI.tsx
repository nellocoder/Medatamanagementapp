import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { generateClients, uploadClients } from './DataGenerator';
import { Database, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataGeneratorUIProps {
  currentUser: any;
  onComplete?: () => void;
}

export function DataGeneratorUI({ currentUser, onComplete }: DataGeneratorUIProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResult(null);

    try {
      // Generate clients
      toast.info('Generating 100 client profiles...');
      setProgress(10);
      
      const clients = generateClients();
      setProgress(30);
      
      toast.info('Uploading clients to database...');
      
      // Upload in batches to show progress
      const batchSize = 10;
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < clients.length; i += batchSize) {
        const batch = clients.slice(i, i + batchSize);
        const batchResult = await uploadClients(batch, currentUser.id);
        
        successCount += batchResult.successCount;
        failCount += batchResult.failCount;
        
        const progressPercent = 30 + ((i + batchSize) / clients.length) * 70;
        setProgress(Math.min(progressPercent, 100));
      }
      
      const finalResult = {
        total: clients.length,
        successCount,
        failCount,
        breakdown: {
          nsp: 30,
          methadone: 30,
          stimulant: 40
        }
      };
      
      setResult(finalResult);
      
      if (successCount === clients.length) {
        toast.success(`Successfully generated and uploaded ${successCount} client profiles!`);
      } else {
        toast.warning(`Uploaded ${successCount} clients, ${failCount} failed`);
      }
      
      if (onComplete) {
        setTimeout(onComplete, 2000);
      }
      
    } catch (error) {
      console.error('Error generating data:', error);
      toast.error('Failed to generate client data');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Generate Demo Data
        </CardTitle>
        <CardDescription>
          Generate 100 realistic client profiles for health and harm reduction programs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will generate 100 client profiles distributed across three programs:
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>30 NSP (Needle and Syringe Program) clients</li>
              <li>30 Methadone/MAT clients</li>
              <li>40 Stimulant Users Program clients</li>
            </ul>
            <div className="mt-2">
              Locations: Mombasa, Lamu, and Kilifi counties in Kenya
            </div>
          </AlertDescription>
        </Alert>

        {isGenerating && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generating and uploading...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {result && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-green-900">
                  Successfully generated {result.successCount} out of {result.total} clients
                </p>
                <div className="text-sm text-green-800">
                  <p>• NSP clients: {result.breakdown.nsp}</p>
                  <p>• Methadone/MAT clients: {result.breakdown.methadone}</p>
                  <p>• Stimulant Users Program clients: {result.breakdown.stimulant}</p>
                </div>
                {result.failCount > 0 && (
                  <p className="text-sm text-orange-700 mt-2">
                    {result.failCount} clients failed to upload. Check console for details.
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
          <p className="font-semibold">Each client profile includes:</p>
          <ul className="ml-4 list-disc space-y-1 text-gray-700">
            <li>Demographics (name, age, gender, location, contact)</li>
            <li>Clinical assessment (HIV, Hep B/C, TB, vitals, BMI)</li>
            <li>Mental health screening (PHQ9, GAD7, ASSIST scores)</li>
            <li>Program-specific data (needles, doses, stimulant use)</li>
            <li>Interventions received (testing, counselling, linkages)</li>
            <li>Follow-up status and case management data</li>
          </ul>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? 'Generating...' : 'Generate 100 Client Profiles'}
        </Button>
      </CardContent>
    </Card>
  );
}
