import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { 
  FileText, 
  Users, 
  Package, 
  Settings, 
  Download,
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { ProgramReports } from './reports/ProgramReports';
import { ClientReports } from './reports/ClientReports';
import { CommoditiesReports } from './reports/CommoditiesReports';
import { CustomReportBuilder } from './reports/CustomReportBuilder';

interface ReportsProps {
  currentUser: any;
}

export function Reports({ currentUser }: ReportsProps) {
  const [activeTab, setActiveTab] = useState('program');

  // Role-based access control
  const canAccessClinical = ['Admin', 'System Admin', 'M&E Officer', 'Clinician', 'Program Manager'].includes(currentUser?.role);
  const canAccessMentalHealth = ['Admin', 'System Admin', 'M&E Officer', 'Psychologist', 'Counselor', 'Program Manager'].includes(currentUser?.role);
  const canAccessAll = ['Admin', 'System Admin', 'M&E Officer'].includes(currentUser?.role);
  const canExport = ['Admin', 'System Admin', 'M&E Officer', 'Data Entry', 'Program Manager'].includes(currentUser?.role);

  const reportCategories = [
    {
      id: 'program',
      label: 'Program Reports',
      icon: BarChart3,
      description: 'NSP, MAT, Condom, Mental Health, Clinical, Psychosocial, Outreach',
      color: 'bg-blue-500'
    },
    {
      id: 'client',
      label: 'Client Reports',
      icon: Users,
      description: 'Individual client reports and summary tables',
      color: 'bg-green-500'
    },
    {
      id: 'commodities',
      label: 'Commodities & Logistics',
      icon: Package,
      description: 'Stock tracking, issuance logs, forecasting',
      color: 'bg-orange-500'
    },
    {
      id: 'custom',
      label: 'Custom Report Builder',
      icon: Settings,
      description: 'Build and schedule custom reports',
      color: 'bg-purple-500',
      adminOnly: true
    },
  ];

  const accessibleCategories = reportCategories.filter(cat => 
    !cat.adminOnly || canAccessAll
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl mb-2">Reports & Analytics</h1>
            <p className="text-gray-600">
              Comprehensive reporting system for MEWA M&E data
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Role: {currentUser?.role}
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {accessibleCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card 
              key={category.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setActiveTab(category.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${category.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{category.label}</h3>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Reports Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-4xl mb-8">
          {accessibleCategories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.id} value={category.id}>
                <Icon className="w-4 h-4 mr-2" />
                {category.label.split(' ')[0]}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="program">
          <ProgramReports 
            currentUser={currentUser}
            canAccessClinical={canAccessClinical}
            canAccessMentalHealth={canAccessMentalHealth}
            canExport={canExport}
          />
        </TabsContent>

        <TabsContent value="client">
          <ClientReports 
            currentUser={currentUser}
            canAccessClinical={canAccessClinical}
            canAccessMentalHealth={canAccessMentalHealth}
            canExport={canExport}
          />
        </TabsContent>

        <TabsContent value="commodities">
          <CommoditiesReports 
            currentUser={currentUser}
            canExport={canExport}
          />
        </TabsContent>

        {canAccessAll && (
          <TabsContent value="custom">
            <CustomReportBuilder 
              currentUser={currentUser}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Export Notice */}
      {!canExport && (
        <Card className="mt-8 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Your role ({currentUser?.role}) has view-only access. 
              Contact an M&E Officer or Admin for export privileges.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
