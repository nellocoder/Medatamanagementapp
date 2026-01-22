// Permission types and access control definitions for MEWA M&E System

export const PERMISSIONS = {
  // Client Management
  CLIENT_VIEW: 'client.view',
  CLIENT_CREATE: 'client.create',
  CLIENT_EDIT: 'client.edit',
  CLIENT_DELETE: 'client.delete',
  CLIENT_VIEW_SENSITIVE: 'client.view_sensitive',
  CLIENT_VIEW_LIMITED: 'client.view_limited', // initials only
  
  // Visit Management
  VISIT_VIEW: 'visit.view',
  VISIT_CREATE: 'visit.create',
  VISIT_EDIT: 'visit.edit',
  VISIT_DELETE: 'visit.delete',
  
  // Clinical
  CLINICAL_VIEW: 'clinical.view',
  CLINICAL_CREATE: 'clinical.create',
  CLINICAL_EDIT: 'clinical.edit',
  CLINICAL_APPROVE: 'clinical.approve',
  
  // Programs
  PROGRAM_VIEW: 'program.view',
  PROGRAM_MANAGE: 'program.manage',
  PROGRAM_APPROVE: 'program.approve',
  
  // Reports & Analytics
  REPORT_VIEW: 'report.view',
  REPORT_CREATE: 'report.create',
  REPORT_EXPORT: 'report.export',
  REPORT_DOWNLOAD: 'report.download',
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_AGGREGATED_ONLY: 'analytics.aggregated_only',
  
  // Forms
  FORM_VIEW: 'form.view',
  FORM_MANAGE: 'form.manage',
  
  // Follow-ups
  FOLLOWUP_VIEW: 'followup.view',
  FOLLOWUP_MANAGE: 'followup.manage',
  
  // Interventions
  INTERVENTION_VIEW: 'intervention.view',
  INTERVENTION_MANAGE: 'intervention.manage',
  
  // Outreach
  OUTREACH_VIEW: 'outreach.view',
  OUTREACH_CREATE: 'outreach.create',
  OUTREACH_EDIT: 'outreach.edit',
  
  // User Management
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_EDIT: 'user.edit',
  USER_DELETE: 'user.delete',
  USER_MANAGE_ROLES: 'user.manage_roles',
  USER_MANAGE_PERMISSIONS: 'user.manage_permissions',
  
  // System
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_AUDIT: 'system.audit',
  SYSTEM_SYNC: 'system.sync',
  SYSTEM_BACKUP: 'system.backup',
};

export const ROLE_DEFINITIONS = {
  'System Admin': {
    name: 'System Admin',
    description: 'Full unrestricted access to everything',
    permissions: Object.values(PERMISSIONS),
    color: '#ef4444',
    icon: 'Shield',
  },

  'Admin': {
    name: 'Admin',
    description: 'Full unrestricted access to everything',
    permissions: Object.values(PERMISSIONS),
    color: '#ef4444',
    icon: 'Shield',
  },

  'Viewer': {
    name: 'Viewer',
    description: 'View-only access to all modules',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.FORM_VIEW,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.INTERVENTION_VIEW,
      PERMISSIONS.OUTREACH_VIEW,
    ],
    color: '#94a3b8',
    icon: 'Eye',
  },
  
  'Data Entry': {
    name: 'Data Entry',
    description: 'Enter, verify, clean, and validate data',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.FORM_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.OUTREACH_VIEW,
      PERMISSIONS.OUTREACH_CREATE,
      PERMISSIONS.OUTREACH_EDIT,
    ],
    restrictions: {
      cannotModifyUserRoles: true,
      cannotEditClinicalNotes: true,
    },
    color: '#6366f1',
    icon: 'Database',
  },
  
  'Clinician': {
    name: 'Clinician',
    description: 'View clinical history, enter clinical notes, upload lab results, schedule care',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_VIEW_SENSITIVE,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.CLINICAL_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.REPORT_VIEW,
    ],
    restrictions: {
      cannotDelete: true,
      cannotExportSystemReports: true,
    },
    color: '#3b82f6',
    icon: 'Stethoscope',
  },
  
  'M&E Officer': {
    name: 'M&E Officer',
    description: 'View analytics, export reports, generate dashboards',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.REPORT_DOWNLOAD,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.FORM_VIEW,
      PERMISSIONS.SYSTEM_AUDIT,
    ],
    restrictions: {
      cannotEditClinical: true,
      cannotOverrideClientData: true,
    },
    color: '#8b5cf6',
    icon: 'BarChart',
  },
  
  'Program Manager': {
    name: 'Program Manager',
    description: 'Approve data, manage follow-ups, edit program entries, view all indicators',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.PROGRAM_MANAGE,
      PERMISSIONS.PROGRAM_APPROVE,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.INTERVENTION_VIEW,
      PERMISSIONS.INTERVENTION_MANAGE,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.CLINICAL_APPROVE,
    ],
    restrictions: {
      cannotChangeSystemSettings: true,
    },
    color: '#10b981',
    icon: 'Briefcase',
  },
  
  'Program Coordinator': {
    name: 'Program Coordinator',
    description: 'Manage daily operations, assign outreach tasks, view client progress',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_VIEW_LIMITED,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.OUTREACH_VIEW,
      PERMISSIONS.OUTREACH_CREATE,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.ANALYTICS_AGGREGATED_ONLY,
    ],
    restrictions: {
      cannotViewConfidentialClinical: true,
    },
    color: '#06b6d4',
    icon: 'Users',
  },
  
  'Outreach Worker': {
    name: 'Outreach Worker',
    description: 'Register clients, record outreach contacts, upload field notes',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.CLIENT_VIEW_LIMITED,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.OUTREACH_VIEW,
      PERMISSIONS.OUTREACH_CREATE,
      PERMISSIONS.OUTREACH_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
    ],
    restrictions: {
      cannotAccessSensitiveMedical: true,
    },
    color: '#f59e0b',
    icon: 'MapPin',
  },
  
  'HTS Counsellor': {
    name: 'HTS Counsellor',
    description: 'Record HIV Testing Services data, sessions, linkage to care',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
    ],
    restrictions: {
      cannotEditProgramIndicators: true,
    },
    color: '#ec4899',
    icon: 'TestTube',
  },
  
  'Psychologist': {
    name: 'Psychologist',
    description: 'Record psychological assessments, CBT attendance, mental health notes',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_VIEW_SENSITIVE,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.CLINICAL_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
    ],
    restrictions: {
      cannotAccessNSPMATData: true,
    },
    color: '#a855f7',
    icon: 'Brain',
  },
  
  'Counsellor': {
    name: 'Counsellor',
    description: 'Conduct counseling sessions, record session notes, track client progress',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
    ],
    restrictions: {
      cannotAccessNSPMATData: true,
    },
    color: '#14b8a6',
    icon: 'MessageCircle',
  },
  
  'Nurse': {
    name: 'Nurse',
    description: 'Clinical vitals, follow-ups, schedule reviews',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_VIEW_SENSITIVE,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.CLINICAL_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
    ],
    restrictions: {
      cannotExportSystemReports: true,
    },
    color: '#0ea5e9',
    icon: 'Heart',
  },
  
  'Paralegal': {
    name: 'Paralegal',
    description: 'Record legal support sessions, GBV screenings, referrals',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_VIEW_LIMITED,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.REPORT_VIEW,
    ],
    restrictions: {
      cannotAccessMedicalDrugHistory: true,
    },
    color: '#f97316',
    icon: 'Scale',
  },
  
  'Social Worker': {
    name: 'Social Worker',
    description: 'Manage case plans, follow-up notes, home visits tracking',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.INTERVENTION_VIEW,
      PERMISSIONS.INTERVENTION_MANAGE,
    ],
    restrictions: {
      cannotAccessClinicalModules: true,
    },
    color: '#84cc16',
    icon: 'Home',
  },
  
  'Data Officer': {
    name: 'Data Officer',
    description: 'Enter, verify, clean, and validate data, run queries',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.FORM_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
    ],
    restrictions: {
      cannotModifyUserRoles: true,
      cannotEditClinicalNotes: true,
    },
    color: '#6366f1',
    icon: 'Database',
  },
};

export const PERMISSION_TEMPLATES = {
  'read-only': {
    name: 'Read Only',
    description: 'View-only access to all modules',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.FORM_VIEW,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.INTERVENTION_VIEW,
      PERMISSIONS.OUTREACH_VIEW,
    ],
  },
  
  'data-entry': {
    name: 'Data Entry Only',
    description: 'Can create and edit data but not delete',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_CREATE,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.OUTREACH_VIEW,
      PERMISSIONS.OUTREACH_CREATE,
      PERMISSIONS.OUTREACH_EDIT,
    ],
  },
  
  'supervisor': {
    name: 'Supervisor',
    description: 'Can review, approve, and manage most operations',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_APPROVE,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.PROGRAM_APPROVE,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.ANALYTICS_VIEW,
    ],
  },
  
  'manager': {
    name: 'Manager',
    description: 'Full operational access except system administration',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.CLIENT_EDIT,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_EDIT,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_APPROVE,
      PERMISSIONS.PROGRAM_VIEW,
      PERMISSIONS.PROGRAM_APPROVE,
      PERMISSIONS.PROGRAM_MANAGE,
      PERMISSIONS.FOLLOWUP_VIEW,
      PERMISSIONS.FOLLOWUP_MANAGE,
      PERMISSIONS.INTERVENTION_MANAGE,
      PERMISSIONS.REPORT_VIEW,
      PERMISSIONS.REPORT_CREATE,
      PERMISSIONS.REPORT_EXPORT,
      PERMISSIONS.REPORT_DOWNLOAD,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.USER_VIEW,
    ],
  },
  
  'clinical-restricted': {
    name: 'Clinical Restricted',
    description: 'Clinical access without sensitive data',
    permissions: [
      PERMISSIONS.CLIENT_VIEW,
      PERMISSIONS.VISIT_VIEW,
      PERMISSIONS.VISIT_CREATE,
      PERMISSIONS.CLINICAL_VIEW,
      PERMISSIONS.CLINICAL_CREATE,
      PERMISSIONS.FOLLOWUP_VIEW,
    ],
  },
  
  'full-access': {
    name: 'Full Access',
    description: 'Unrestricted access to all features',
    permissions: Object.values(PERMISSIONS),
  },
};

// Location-based access
export const LOCATIONS = ['Mombasa', 'Lamu', 'Kilifi'];

// Program-based access
export const PROGRAMS = ['NSP', 'MAT', 'Stimulants'];

// Helper functions
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

export const hasAllPermissions = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

export const getRolePermissions = (roleName: string): string[] => {
  const role = ROLE_DEFINITIONS[roleName as keyof typeof ROLE_DEFINITIONS];
  return role ? role.permissions : [];
};

export const getTemplatePermissions = (templateName: string): string[] => {
  const template = PERMISSION_TEMPLATES[templateName as keyof typeof PERMISSION_TEMPLATES];
  return template ? template.permissions : [];
};