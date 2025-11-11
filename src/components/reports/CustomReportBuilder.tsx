import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { 
  Settings, 
  Save,
  Play,
  Clock,
  BarChart,
  Table as TableIcon,
  Plus,
  Trash2,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface CustomReportBuilderProps {
  currentUser: any;
}

export function CustomReportBuilder({ currentUser }: CustomReportBuilderProps) {
  const [reportName, setReportName] = useState('');
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [visualizationType, setVisualizationType] = useState('both');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleDay, setScheduleDay] = useState('monday');
  const [recipientEmails, setRecipientEmails] = useState('');

  const availableIndicators = [
    { id: 'total-clients', name: 'Total Clients Served', category: 'General' },
    { id: 'total-visits', name: 'Total Visits', category: 'General' },
    { id: 'new-registrations', name: 'New Registrations', category: 'General' },
    { id: 'active-clients', name: 'Active Clients', category: 'General' },
    { id: 'nsp-distributed', name: 'NSP Items Distributed', category: 'NSP' },
    { id: 'nsp-return-ratio', name: 'NSP Return Ratio', category: 'NSP' },
    { id: 'mat-active', name: 'MAT Active Clients', category: 'MAT' },
    { id: 'mat-adherence', name: 'MAT Adherence Rate', category: 'MAT' },
    { id: 'mat-avg-dose', name: 'MAT Average Dose', category: 'MAT' },
    { id: 'condom-male', name: 'Male Condoms Distributed', category: 'Condom' },
    { id: 'condom-female', name: 'Female Condoms Distributed', category: 'Condom' },
    { id: 'mh-screenings', name: 'Mental Health Screenings', category: 'Mental Health' },
    { id: 'phq9-severe', name: 'PHQ-9 Severe Cases', category: 'Mental Health' },
    { id: 'gad7-severe', name: 'GAD-7 Severe Cases', category: 'Mental Health' },
    { id: 'psycho-sessions', name: 'Psychosocial Sessions', category: 'Psychosocial' },
    { id: 'hiv-tests', name: 'HIV Tests Conducted', category: 'Clinical' },
    { id: 'sti-screenings', name: 'STI Screenings', category: 'Clinical' },
    { id: 'high-risk-clients', name: 'High Risk Client Count', category: 'Risk' },
    { id: 'follow-up-rate', name: 'Follow-up Completion Rate', category: 'General' },
  ];

  const programs = [
    { id: 'nsp', name: 'NSP' },
    { id: 'mat', name: 'MAT' },
    { id: 'condom', name: 'Condom Distribution' },
    { id: 'mental-health', name: 'Mental Health' },
    { id: 'psychosocial', name: 'Psychosocial' },
    { id: 'clinical', name: 'Clinical' },
    { id: 'outreach', name: 'Outreach' },
  ];

  const locations = [
    { id: 'mombasa', name: 'Mombasa' },
    { id: 'lamu', name: 'Lamu' },
    { id: 'kilifi', name: 'Kilifi' },
  ];

  const toggleIndicator = (id: string) => {
    setSelectedIndicators(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleProgram = (id: string) => {
    setSelectedPrograms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleLocation = (id: string) => {
    setSelectedLocations(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const handleSaveTemplate = () => {
    if (!reportName) {
      toast.error('Please provide a report name');
      return;
    }
    if (selectedIndicators.length === 0) {
      toast.error('Please select at least one indicator');
      return;
    }

    const template = {
      id: Date.now().toString(),
      name: reportName,
      indicators: selectedIndicators,
      programs: selectedPrograms,
      locations: selectedLocations,
      visualizationType,
      schedule: scheduleEnabled ? {
        frequency: scheduleFrequency,
        day: scheduleDay,
        recipients: recipientEmails,
      } : null,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    setSavedTemplates([...savedTemplates, template]);
    toast.success('Report template saved successfully');
    
    // Reset form
    setReportName('');
    setSelectedIndicators([]);
    setSelectedPrograms([]);
    setSelectedLocations([]);
    setScheduleEnabled(false);
  };

  const handleRunReport = () => {
    if (selectedIndicators.length === 0) {
      toast.error('Please select at least one indicator');
      return;
    }
    
    try {
      // Generate a simple HTML report
      const htmlReport = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
            h2 { color: #333; margin-top: 30px; }
            .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin: 2px; background: #e0e7ff; color: #4338ca; }
            .logo { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 20px; }
            .info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="logo">MEWA M&E System</div>
          <h1>Custom Report${reportName ? `: ${reportName}` : ''}</h1>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Generated by:</strong> ${currentUser.name} (${currentUser.role})</p>

          <div class="info">
            <h3>Report Configuration</h3>
            <p><strong>Selected Indicators:</strong> ${selectedIndicators.length}</p>
            ${selectedPrograms.length > 0 ? `<p><strong>Programs:</strong> ${selectedPrograms.join(', ')}</p>` : ''}
            ${selectedLocations.length > 0 ? `<p><strong>Locations:</strong> ${selectedLocations.join(', ')}</p>` : ''}
            <p><strong>Visualization:</strong> ${visualizationType}</p>
          </div>

          <h2>Selected Indicators</h2>
          ${selectedIndicators.map(id => {
            const indicator = availableIndicators.find(i => i.id === id);
            return `<span class="badge">${indicator?.name || id}</span>`;
          }).join(' ')}

          <h2>Report Data</h2>
          <p style="padding: 40px; text-align: center; color: #666; background: #f9fafb; border-radius: 8px;">
            This is a custom report preview. In a production system, this would contain:<br><br>
            • Real-time data for selected indicators<br>
            • Charts and visualizations<br>
            • Detailed tables with filterable data<br>
            • Trend analysis and comparisons
          </p>

          <p style="margin-top: 60px; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
            Generated by MEWA M&E System on ${new Date().toLocaleString()}
          </p>
        </body>
        </html>
      `;

      const blob = new Blob([htmlReport], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = reportName ? reportName.replace(/\s+/g, '_') : 'custom_report';
      a.download = `${filename}_${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Custom report generated! Open the HTML file to view.');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleDeleteTemplate = (id: string) => {
    setSavedTemplates(savedTemplates.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const handleLoadTemplate = (template: any) => {
    setReportName(template.name);
    setSelectedIndicators(template.indicators);
    setSelectedPrograms(template.programs);
    setSelectedLocations(template.locations);
    setVisualizationType(template.visualizationType);
    if (template.schedule) {
      setScheduleEnabled(true);
      setScheduleFrequency(template.schedule.frequency);
      setScheduleDay(template.schedule.day);
      setRecipientEmails(template.schedule.recipients);
    }
    toast.success('Template loaded');
  };

  const groupedIndicators = availableIndicators.reduce((acc, indicator) => {
    if (!acc[indicator.category]) {
      acc[indicator.category] = [];
    }
    acc[indicator.category].push(indicator);
    return acc;
  }, {} as Record<string, typeof availableIndicators>);

  return (
    <div className="space-y-6">
      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Custom Report Builder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Name */}
          <div>
            <Label>Report Name *</Label>
            <Input
              placeholder="e.g., Monthly Donor Report, Weekly Program Summary"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
            />
          </div>

          {/* Indicator Selection */}
          <div>
            <Label className="mb-3 block">Select Indicators *</Label>
            <div className="space-y-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
              {Object.entries(groupedIndicators).map(([category, indicators]) => (
                <div key={category}>
                  <p className="font-semibold text-sm mb-2">{category}</p>
                  <div className="space-y-2 ml-4">
                    {indicators.map(indicator => (
                      <div key={indicator.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedIndicators.includes(indicator.id)}
                          onCheckedChange={() => toggleIndicator(indicator.id)}
                        />
                        <label className="text-sm cursor-pointer" onClick={() => toggleIndicator(indicator.id)}>
                          {indicator.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {selectedIndicators.length} indicator{selectedIndicators.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Program Filters */}
          <div>
            <Label className="mb-3 block">Filter by Programs (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {programs.map(program => (
                <Badge
                  key={program.id}
                  variant={selectedPrograms.includes(program.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleProgram(program.id)}
                >
                  {program.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Location Filters */}
          <div>
            <Label className="mb-3 block">Filter by Locations (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {locations.map(location => (
                <Badge
                  key={location.id}
                  variant={selectedLocations.includes(location.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleLocation(location.id)}
                >
                  {location.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Visualization Type */}
          <div>
            <Label>Visualization Type</Label>
            <Select value={visualizationType} onValueChange={setVisualizationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="charts">Charts Only</SelectItem>
                <SelectItem value="tables">Tables Only</SelectItem>
                <SelectItem value="both">Charts & Tables</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Settings */}
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={scheduleEnabled}
                onCheckedChange={setScheduleEnabled}
              />
              <Label className="cursor-pointer" onClick={() => setScheduleEnabled(!scheduleEnabled)}>
                Schedule Automated Report Delivery
              </Label>
            </div>

            {scheduleEnabled && (
              <div className="space-y-4 ml-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scheduleFrequency === 'weekly' && (
                    <div>
                      <Label>Day of Week</Label>
                      <Select value={scheduleDay} onValueChange={setScheduleDay}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monday">Monday</SelectItem>
                          <SelectItem value="tuesday">Tuesday</SelectItem>
                          <SelectItem value="wednesday">Wednesday</SelectItem>
                          <SelectItem value="thursday">Thursday</SelectItem>
                          <SelectItem value="friday">Friday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Recipient Email Addresses (comma-separated)</Label>
                  <Input
                    placeholder="email1@example.com, email2@example.com"
                    value={recipientEmails}
                    onChange={(e) => setRecipientEmails(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleRunReport}>
              <Play className="w-4 h-4 mr-2" />
              Run Report Now
            </Button>
            <Button variant="outline" onClick={handleSaveTemplate}>
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved Templates */}
      {savedTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="w-5 h-5" />
              Saved Report Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedTemplates.map(template => (
                <div key={template.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{template.name}</h4>
                        {template.schedule && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Scheduled: {template.schedule.frequency}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {template.indicators.length} indicators
                        </Badge>
                        {template.programs.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {template.programs.length} programs
                          </Badge>
                        )}
                        {template.locations.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {template.locations.length} locations
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        Created by {template.createdBy} on {new Date(template.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Donor Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-configured Donor Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">EJAF Report Template</h4>
              <p className="text-sm text-gray-600 mb-3">
                Quarterly report for Elton John AIDS Foundation
              </p>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Mainline Report Template</h4>
              <p className="text-sm text-gray-600 mb-3">
                Monthly program performance report
              </p>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Global Fund Report Template</h4>
              <p className="text-sm text-gray-600 mb-3">
                Annual program review and outcomes
              </p>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:border-indigo-500 transition-colors cursor-pointer">
              <h4 className="font-semibold mb-2">Internal MEWA Report</h4>
              <p className="text-sm text-gray-600 mb-3">
                Comprehensive program monitoring
              </p>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}