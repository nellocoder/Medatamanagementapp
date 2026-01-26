import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, Printer, FileSpreadsheet, FileText, X } from 'lucide-react';
import { format } from 'date-fns';

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  filters: any;
  onExportPDF: () => void;
  onExportExcel: () => void;
  currentUser: any;
}

export function ExportPreviewDialog({
  open,
  onOpenChange,
  data,
  filters,
  onExportPDF,
  onExportExcel,
  currentUser
}: ExportPreviewDialogProps) {
  
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl text-indigo-700">Report Preview</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            This preview reflects the selected filters. Use Download to export the full dataset.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] p-[20mm] text-sm">
            {/* Header */}
            <div className="border-b-2 border-indigo-600 pb-4 mb-6">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">MEWA M&E System</h1>
                  <h2 className="text-lg text-indigo-600 font-medium mt-1">
                    {filters.program === 'all' ? 'Comprehensive' : filters.program} Program Report
                  </h2>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>Generated: {format(new Date(), 'PPpp')}</p>
                  <p>By: {currentUser.name} ({currentUser.role})</p>
                  <p>Location: {filters.location === 'all' ? 'All Locations' : filters.location}</p>
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="grid grid-cols-4 gap-4 mb-8 text-xs bg-gray-50 p-3 rounded">
              <div>
                <span className="font-semibold text-gray-600 block">Period</span>
                {filters.dateRange === 'custom' 
                  ? `${filters.startDate} to ${filters.endDate}`
                  : filters.dateRange.charAt(0).toUpperCase() + filters.dateRange.slice(1)
                }
              </div>
              <div>
                <span className="font-semibold text-gray-600 block">Program</span>
                {filters.program}
              </div>
              <div>
                <span className="font-semibold text-gray-600 block">Location</span>
                {filters.location}
              </div>
              <div>
                <span className="font-semibold text-gray-600 block">Staff</span>
                {filters.staff === 'all' ? 'All Staff' : 'Filtered'}
              </div>
            </div>

            {/* Content Preview */}
            <div className="space-y-6">
              <h3 className="font-bold text-gray-800 border-b pb-1">Service Delivery Summary</h3>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 border">Indicator</th>
                    <th className="p-2 border">Male</th>
                    <th className="p-2 border">Female</th>
                    <th className="p-2 border">Not Rec.</th>
                    <th className="p-2 border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.serviceDelivery && [
                    { label: 'Total Services', ...data.serviceDelivery.totalServices },
                    { label: 'Unique Clients', ...data.serviceDelivery.uniqueClients },
                    { label: 'Total Visits', ...data.serviceDelivery.totalVisits },
                  ].map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 border font-medium">{row.label}</td>
                      <td className="p-2 border">{row.male || 0}</td>
                      <td className="p-2 border">{row.female || 0}</td>
                      <td className="p-2 border">{row.notRecorded || 0}</td>
                      <td className="p-2 border font-bold">{row.total || 0}</td>
                    </tr>
                  ))}
                  {data.serviceDelivery?.completionRate && (
                    <tr className="border-b bg-gray-50 font-bold">
                      <td className="p-2 border">Completion Rate</td>
                      <td className="p-2 border" colSpan={4}>
                        {data.serviceDelivery.completionRate.total}%
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {data.nspMetrics?.byGender && (
                <>
                  <h3 className="font-bold text-gray-800 border-b pb-1 mt-6">NSP Specific Indicators</h3>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 border">Indicator</th>
                        <th className="p-2 border">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 border">Needles Distributed</td>
                        <td className="p-2 border">{data.nspMetrics.byGender.needlesDistributed.total}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 border">Needles Returned</td>
                        <td className="p-2 border">{data.nspMetrics.byGender.needlesReturned.total}</td>
                      </tr>
                       <tr className="border-b font-bold bg-yellow-50">
                        <td className="p-2 border">Return Rate</td>
                        <td className="p-2 border">{data.nspMetrics.returnRatio}%</td>
                      </tr>
                    </tbody>
                  </table>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-4 border-t text-xs text-center text-gray-400">
              Confidential Report - Generated by MEWA M&E System
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-white">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Preview</Button>
          <Button onClick={onExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download Full Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
