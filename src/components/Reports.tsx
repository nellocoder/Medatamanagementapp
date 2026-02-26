import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  GitBranch,
  List,
  Wrench,
  FileSpreadsheet,
  Download,
  BookOpen,
  Shield,
  Target,
} from 'lucide-react';
import { ReportingOverview } from './reports/ReportingOverview';
import { ProgramPerformance } from './reports/ProgramPerformance';
import { CohortRetention } from './reports/CohortRetention';
import { Cascades } from './reports/Cascades';
import { LineListReports } from './reports/LineListReports';
import { CustomIndicatorBuilder } from './reports/CustomIndicatorBuilder';
import { DonorTemplates } from './reports/DonorTemplates';
import { ExportCenter } from './reports/ExportCenter';
import { IndicatorDictionary } from './reports/IndicatorDictionary';
import { ReportAuditLog } from './reports/ReportAuditLog';
import { TargetManagement } from './reports/TargetManagement';
import { hasHIVAccess } from '../utils/permissions';

interface ReportsProps {
  currentUser: any;
}

const REPORT_TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Executive snapshot' },
  { id: 'performance', label: 'Performance', icon: BarChart3, description: 'Program domain indicators' },
  { id: 'targets', label: 'Targets', icon: Target, description: 'Set program performance targets', adminOnly: true },
  { id: 'cohort', label: 'Cohort & Retention', icon: Users, description: 'Cohort retention grids' },
  { id: 'cascades', label: 'Cascades', icon: GitBranch, description: 'Service cascade funnels' },
  { id: 'linelists', label: 'Line Lists', icon: List, description: 'Action reports' },
  { id: 'builder', label: 'Indicator Builder', icon: Wrench, description: 'Custom reports', adminOnly: true },
  { id: 'donor', label: 'Donor Templates', icon: FileSpreadsheet, description: 'Donor-format reports', adminOnly: true },
  { id: 'export', label: 'Export Center', icon: Download, description: 'Download reports' },
  { id: 'dictionary', label: 'Indicator Dictionary', icon: BookOpen, description: 'Indicator reference' },
  { id: 'audit', label: 'Audit Log', icon: Shield, description: 'Report access log', adminOnly: true },
];

export function Reports({ currentUser }: ReportsProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const canAccessAll = ['Admin', 'System Admin', 'M&E Officer'].includes(currentUser?.role);
  const canAccessAdmin = ['Admin', 'System Admin', 'M&E Officer', 'Program Manager'].includes(currentUser?.role);

  const visibleTabs = REPORT_TABS.filter(tab => {
    if (tab.adminOnly && !canAccessAdmin) return false;
    return true;
  });

  const activeTabMeta = REPORT_TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Sticky Header with Navigation */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-xs text-gray-500">
                {activeTabMeta?.description || 'Comprehensive M&E reporting system'}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {currentUser?.role}
            </Badge>
          </div>

          {/* Tab Navigation - scrollable */}
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex gap-0.5 min-w-max pb-0">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
                      isActive
                        ? 'bg-gray-50 text-gray-900 border-gray-900'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 max-w-[1400px] mx-auto">
        {activeTab === 'overview' && <ReportingOverview currentUser={currentUser} />}
        {activeTab === 'performance' && <ProgramPerformance currentUser={currentUser} />}
        {activeTab === 'targets' && canAccessAdmin && <TargetManagement currentUser={currentUser} />}
        {activeTab === 'cohort' && <CohortRetention currentUser={currentUser} />}
        {activeTab === 'cascades' && <Cascades currentUser={currentUser} />}
        {activeTab === 'linelists' && <LineListReports currentUser={currentUser} />}
        {activeTab === 'builder' && canAccessAdmin && <CustomIndicatorBuilder currentUser={currentUser} />}
        {activeTab === 'donor' && canAccessAdmin && <DonorTemplates currentUser={currentUser} />}
        {activeTab === 'export' && <ExportCenter currentUser={currentUser} />}
        {activeTab === 'dictionary' && <IndicatorDictionary currentUser={currentUser} />}
        {activeTab === 'audit' && canAccessAdmin && <ReportAuditLog currentUser={currentUser} />}
      </div>

      {/* Role Notice */}
      {!canAccessAdmin && (
        <div className="fixed bottom-4 right-4 z-10">
          <Card className="border-amber-200 bg-amber-50 shadow-lg max-w-xs">
            <CardContent className="p-3">
              <p className="text-xs text-amber-800">
                <strong>View-only mode:</strong> Some tabs restricted for {currentUser?.role} role.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
