# Reports & Analytics - Design Specifications

## Objectives
- Present all reporting data primarily in tables.
- Ensure exports (PDF/Excel) are accurate and aligned to MOH Kenya reporting expectations.
- Improve usability for health workers/admins.
- Deliver a modern, clinical UI in a blue-gray palette (#007BFF primary, #F8F9FA background).

## Page Layout Specification
### Sticky Top Header Bar
- **Left**: Title “Reports & Analytics”, Subtitle “Comprehensive reporting for MEWA M&E data”
- **Right**: Role badge, Location tag, Logout icon
- **Action Group**: Generate Report (Primary), Export PDF (Outline), Export Excel (Outline)

### Filter Controls Section (Collapsible)
- **Program**: Dropdown chips (NSP, MAT, etc.)
- **Date Range**: This Month, Last Month, Custom
- **Location**: All, specific counties
- **Staff**: All, specific staff
- **Toggle**: Show Summary Charts

### Main Content Card
- **Primary**: Enhanced Service Delivery Summary Table
  - Columns: INDICATOR | MALE | FEMALE | NOT RECORDED | TOTAL
  - Conditional formatting for rates (>90% green, <60% red)
- **NSP Sub-table**: Needles Distributed/Returned, Return Rate
- **Secondary**: Detailed Breakdowns (Tabs)
  - Tab 1: By Service Type
  - Tab 2: Referrals Summary
  - Tab 3: Commodities & Stock

## Export & Preview
- **Generate Report**: Triggers PDF preview modal.
- **Modal**: Printable layout, includes metadata.
- **PDF**: Clean tables, page breaks.
- **Excel**: Multiple sheets (Summary, NSP, Referrals, Commodities, Raw Data).

## Accessibility
- Keyboard navigation support.
- ARIA labels for tables and filters.
- High contrast text.

## Responsive Behavior
- **Desktop**: Full table.
- **Tablet**: Collapsible columns.
- **Mobile**: Stacked card view.
