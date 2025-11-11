# M&E Data Management System - Documentation

## Overview

A comprehensive Monitoring & Evaluation (M&E) data management application designed for multi-location client tracking with real-time synchronization, role-based access control, audit trails, and dashboard reporting.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Supabase Edge Functions (Hono web framework)
- **Database**: PostgreSQL (via Supabase KV Store)
- **Real-time**: Polling-based updates (10-30 second intervals)
- **Charts**: Recharts library

### Architecture Pattern
```
┌─────────────────────┐
│   React Frontend    │
│  (3 Locations)      │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│  Supabase Edge      │
│  Functions (Hono)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  PostgreSQL KV      │
│  Store Database     │
└─────────────────────┘
```

## Features

### 1. Authentication & Authorization
- **Login System**: Email/password authentication
- **Demo Accounts**: Pre-configured users for testing
- **Session Management**: LocalStorage-based persistence

### 2. Role-Based Access Control (RBAC)
- **Admin**: Full access to all features including user management and audit logs
- **M&E Officer**: Can add/edit clients and visits, view all reports
- **Data Entry**: Can add/edit clients and visits
- **Viewer**: Read-only access to client data and dashboards

### 3. Client Management
- Client registration with comprehensive profile data
- Search and filter capabilities
- Location-based filtering
- Real-time updates across locations
- CSV export functionality
- Fields captured:
  - Client ID (unique identifier)
  - First Name, Last Name
  - Age, Gender
  - Location (A, B, or C)
  - Phone, Email
  - Address
  - Status (Active/Inactive)

### 4. Visit/Encounter Tracking
- Record client service visits
- Visit types: Initial Consultation, Follow-up, Counseling, Medical Checkup, Service Delivery
- Service documentation
- Follow-up tracking with dates
- Linked to client records

### 5. Dashboard & Reporting
**KPI Cards:**
- Total Clients
- Total Visits
- Active Users
- Number of Locations

**Visualizations:**
- Clients by Location (Bar Chart)
- Clients by Gender (Pie Chart)
- Clients by Age Group (Bar Chart)

**Real-time Updates:**
- Auto-refresh every 30 seconds
- Recent activity tracking (last 30 days)

### 6. Audit Log
- Tracks all system changes
- Records: Create, Update, Delete actions
- Captures: Entity type, Entity ID, User, Timestamp
- Admin-only access
- Searchable and filterable
- Auto-refresh every 15 seconds

### 7. User Management
- Create new users
- Assign roles and locations
- View all system users
- Admin-only access

## Data Model

### Entities

#### Client
```json
{
  "id": "client_1234567890_abc123def",
  "clientId": "CL-001",
  "firstName": "John",
  "lastName": "Doe",
  "age": 35,
  "gender": "Male",
  "location": "Location A",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "status": "Active",
  "createdAt": "2025-01-01T12:00:00Z",
  "updatedAt": "2025-01-01T12:00:00Z",
  "createdBy": "user_1234567890_xyz"
}
```

#### Visit
```json
{
  "id": "visit_1234567890_abc123def",
  "clientId": "client_1234567890_abc123def",
  "visitDate": "2025-01-05",
  "visitType": "Follow-up",
  "serviceProvided": "Counseling session",
  "notes": "Client progress noted",
  "followUpRequired": true,
  "followUpDate": "2025-02-05",
  "createdAt": "2025-01-05T14:30:00Z",
  "createdBy": "user_1234567890_xyz"
}
```

#### User
```json
{
  "id": "user_1234567890_abc123def",
  "name": "Jane Smith",
  "email": "jane@demo.org",
  "password": "hashed_password",
  "role": "M&E Officer",
  "location": "Location B",
  "status": "Active",
  "createdAt": "2025-01-01T10:00:00Z"
}
```

#### Audit Log
```json
{
  "id": "audit_1234567890_abc123def",
  "entityType": "client",
  "entityId": "client_1234567890_abc123def",
  "action": "update",
  "userId": "user_1234567890_xyz",
  "timestamp": "2025-01-05T14:30:00Z",
  "before": { "status": "Active" },
  "after": { "status": "Inactive" }
}
```

## API Endpoints

### Authentication
- `POST /make-server-56fd5521/auth/login` - User login

### Clients
- `POST /make-server-56fd5521/clients` - Create client
- `GET /make-server-56fd5521/clients` - Get all clients
- `GET /make-server-56fd5521/clients/:id` - Get single client
- `PUT /make-server-56fd5521/clients/:id` - Update client

### Visits
- `POST /make-server-56fd5521/visits` - Create visit
- `GET /make-server-56fd5521/visits` - Get all visits
- `GET /make-server-56fd5521/visits/client/:clientId` - Get visits for client

### Users
- `POST /make-server-56fd5521/users` - Create user
- `GET /make-server-56fd5521/users` - Get all users

### Metrics
- `GET /make-server-56fd5521/metrics` - Get dashboard metrics

### Audit
- `GET /make-server-56fd5521/audit` - Get all audit logs
- `GET /make-server-56fd5521/audit/:entityType/:entityId` - Get logs for entity

## Demo Credentials

### Pre-configured Users
| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@demo.org | demo123 | Full access |
| M&E Officer | me@demo.org | demo123 | Add/edit clients, visits, reports |
| Data Entry | data@demo.org | demo123 | Add/edit clients and visits |
| Viewer | viewer@demo.org | demo123 | Read-only access |

## Real-time Synchronization

### Approach
The system uses **polling-based real-time updates**:
- Dashboard metrics: 30-second refresh
- Client list: 10-second refresh
- Visit list: 10-second refresh
- Audit logs: 15-second refresh

### Benefits
- Simple implementation
- Works across all three locations
- No complex WebSocket infrastructure
- Reliable in variable network conditions

### Conflict Resolution
- **Last-write-wins**: Most recent update takes precedence
- Audit logs track all changes for conflict investigation
- Timestamps on all records

## Security

### Authentication
- Email/password authentication
- Session stored in localStorage
- Authorization header with Bearer token

### Authorization
- Role-based access control enforced at API level
- UI elements hidden based on permissions
- Server validates user role for protected operations

### Data Protection
- All API calls use HTTPS
- Passwords stored in database (note: use hashing in production)
- Audit logs for compliance tracking

### Important Security Notes for Production
⚠️ **This is a prototype/demo system. For production deployment:**
- Implement password hashing (bcrypt, Argon2)
- Add rate limiting
- Implement proper session management
- Use JWT tokens instead of localStorage
- Add input validation and sanitization
- Implement CSRF protection
- Enable database encryption at rest
- Implement row-level security policies
- Add data anonymization for PII
- Conduct security audit

## Deployment Considerations

### Infrastructure Requirements
- Supabase project (provides PostgreSQL, Edge Functions, Auth)
- CDN for frontend static files
- Monitoring and logging system

### Scaling Considerations
- Current design supports up to 50-100 concurrent users
- For larger deployments:
  - Implement WebSocket for true real-time
  - Add caching layer (Redis)
  - Database read replicas for reporting
  - Load balancer for multiple edge function instances

### Backup & Disaster Recovery
- Supabase automatic backups (daily)
- Export capability for client data (CSV)
- Audit logs provide change history
- Implement point-in-time recovery for production

## Testing Checklist

### Functional Tests
- [ ] User can log in with all role types
- [ ] Admin can create new users
- [ ] Data entry user can add new client
- [ ] Client data appears in dashboard metrics
- [ ] Visit can be recorded for existing client
- [ ] Audit log captures all changes
- [ ] CSV export works correctly
- [ ] Search and filter work properly
- [ ] Viewer cannot access admin features

### Multi-Location Tests
- [ ] Client added in Location A visible in Location B
- [ ] Updates in one location reflected in others
- [ ] Dashboard metrics aggregate across locations
- [ ] Location filters work correctly

### Performance Tests
- [ ] Dashboard loads in <2 seconds
- [ ] Client list loads in <1 second
- [ ] Real-time updates appear within polling interval
- [ ] CSV export completes for 1000+ records

## Known Limitations

1. **Polling Latency**: Updates may take 10-30 seconds to appear across locations
2. **No Offline Support**: Requires active internet connection
3. **Simple Authentication**: Demo uses basic email/password without 2FA
4. **No File Attachments**: Current version doesn't support document uploads
5. **Limited Export Formats**: Only CSV export currently supported
6. **No Mobile App**: Web-only, though responsive design works on mobile browsers
7. **Concurrent Edit Conflicts**: Last-write-wins may overwrite simultaneous edits
8. **No Data Validation**: Limited field validation on forms

## Future Enhancements

### Phase 2 (MVP Enhancements)
- [ ] WebSocket-based real-time updates
- [ ] File attachment support for client records
- [ ] PDF report generation
- [ ] Advanced search with date ranges
- [ ] Bulk import from CSV
- [ ] Email notifications for follow-ups

### Phase 3 (Production Features)
- [ ] Offline support with service workers
- [ ] Mobile native apps (React Native)
- [ ] Advanced analytics and custom reports
- [ ] Data visualization exports
- [ ] SSO/SAML integration
- [ ] Multi-language support
- [ ] Configurable forms and fields
- [ ] Scheduled reports via email
- [ ] Two-factor authentication

### Phase 4 (Enterprise)
- [ ] Multi-tenancy support
- [ ] Advanced RBAC with custom permissions
- [ ] Data warehouse integration
- [ ] API for third-party integrations
- [ ] White-labeling options
- [ ] Advanced audit and compliance features

## Support & Maintenance

### Monitoring
- Check Supabase dashboard for Edge Function errors
- Monitor API response times
- Track database growth
- Review audit logs for suspicious activity

### Regular Maintenance
- Weekly: Review audit logs
- Monthly: Database cleanup of old audit entries
- Quarterly: User access review
- Annually: Security audit

## Development Notes

### File Structure
```
/
├── App.tsx                          # Main application
├── components/
│   ├── Login.tsx                    # Authentication
│   ├── Sidebar.tsx                  # Navigation
│   ├── Dashboard.tsx                # KPIs and charts
│   ├── ClientManagement.tsx         # Client CRUD
│   ├── VisitManagement.tsx          # Visit tracking
│   ├── UserManagement.tsx           # User admin
│   ├── AuditLog.tsx                 # Audit trail
│   ├── InitializeData.tsx           # Demo data setup
│   └── ui/                          # shadcn components
├── supabase/functions/server/
│   ├── index.tsx                    # Server entry point
│   ├── routes.tsx                   # API routes
│   └── kv_store.tsx                 # Database utilities
└── utils/supabase/info.tsx          # Supabase config
```

### Adding New Features
1. Define data model in routes.tsx
2. Create API endpoints
3. Build React component
4. Add to navigation in Sidebar.tsx
5. Update audit logging
6. Test across all roles
7. Document in this file

## Contact & Support

For technical issues or questions about this M&E system, refer to the development team or project documentation.

---

**Version**: 1.0.0  
**Last Updated**: November 8, 2025  
**License**: Proprietary - For authorized use only
