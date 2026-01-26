# Implementation Notes

## Architecture
- **ProgramReports.tsx**: Main container handling state, API calls, and layout.
- **ExportPreviewDialog.tsx**: Reusable modal for print/PDF preview.
- **Tailwind**: Used for all styling (Blue-gray palette).
- **Lucide React**: Icon set.

## Key Decisions
- **Sticky Header**: Implemented within the component to allow full-page feel without rewriting the global layout.
- **Table Logic**: Custom `TableRow` component used instead of `shadcn/ui/table` to strictly control grid alignment and sticky headers.
- **Mock Data**: "Referrals" and "Commodities" tabs are placeholders as the backend endpoints were not specified for those specific cuts in the prompt.

## Next Steps
1. Connect `Referrals` and `Commodities` tabs to real API endpoints.
2. Implement server-side pagination for large datasets.
3. Refine the print CSS in `ExportPreviewDialog` for perfect A4 pagination.
