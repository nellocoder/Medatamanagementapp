import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

const app = new Hono();

// CORS for all routes
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ==================== CLIENT MANAGEMENT ====================

// Create new client
app.post('/clients', async (c) => {
  try {
    const body = await c.req.json();
    const { client, userId } = body;
    
    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const clientRecord = {
      id: clientId,
      ...client,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`client:${clientId}`, clientRecord);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'client',
      entityId: clientId,
      action: 'create',
      userId,
      timestamp,
      changes: clientRecord,
    });
    
    return c.json({ success: true, client: clientRecord });
  } catch (error) {
    console.error('Error creating client:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// [UPDATED] Get all clients (With Filtering & Pagination)
app.get('/clients', async (c) => {
  try {
    // 1. Get Filters from URL
    const location = c.req.query('location');
    const program = c.req.query('program');
    const search = c.req.query('search')?.toLowerCase();
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '1000'); // Increased default limit to ensure we see most clients

    // 2. Fetch all data (KV limitation)
    let clients = await kv.getByPrefix('client:');

    // Sort by createdAt descending (newest first)
    clients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 3. Apply Filters on Server Side
    if (location && location !== 'all') {
      clients = clients.filter(c => c.location === location);
    }
    
    if (program && program !== 'all') {
      clients = clients.filter(c => {
         if (program === 'NSP') return c.program === 'NSP';
         if (program === 'MAT') return c.program === 'Methadone' || c.program === 'MAT';
         return c.program === program;
      });
    }

    if (search) {
      clients = clients.filter(c => 
        (c.firstName && c.firstName.toLowerCase().includes(search)) || 
        (c.lastName && c.lastName.toLowerCase().includes(search)) || 
        (c.clientId && c.clientId.toLowerCase().includes(search))
      );
    }

    // 4. Calculate Stats & Paginate
    const totalCount = clients.length;
    const startIndex = (page - 1) * limit;
    const paginatedClients = clients.slice(startIndex, startIndex + limit);

    return c.json({ 
      success: true, 
      clients: paginatedClients,
      total: totalCount,
      page,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Error fetching clients:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get next client ID (Auto-generation)
app.get('/clients/next-id', async (c) => {
  try {
    const program = c.req.query('program');
    const clients = await kv.getByPrefix('client:');
    
    // Determine prefix based on program
    let prefix = 'CL';
    if (program === 'NSP') prefix = 'NSP';
    else if (program === 'MAT') prefix = 'MAT';
    else if (program === 'Stimulants') prefix = 'STIM';
    
    let maxId = 0;
    
    clients.forEach(client => {
      if (client.clientId && typeof client.clientId === 'string') {
        // Check if ID starts with the determined prefix
        // Format: PREFIX-NUMBER (e.g., NSP-1001, CL-1001)
        const parts = client.clientId.split('-');
        if (parts.length === 2) {
          const idPrefix = parts[0].toUpperCase();
          const idNum = parseInt(parts[1], 10);
          
          if (idPrefix === prefix && !isNaN(idNum)) {
            if (idNum > maxId) {
              maxId = idNum;
            }
          }
        }
      }
    });
    
    // If no existing IDs found for this prefix, start at 1000, otherwise increment
    const nextNum = maxId === 0 ? 1001 : maxId + 1;
    const nextId = `${prefix}-${nextNum}`;
    
    return c.json({ success: true, nextId });
  } catch (error) {
    console.error('Error generating next client ID:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single client
app.get('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const client = await kv.get(`client:${id}`);
    
    if (!client) {
      return c.json({ success: false, error: 'Client not found' }, 404);
    }
    
    return c.json({ success: true, client });
  } catch (error) {
    console.error('Error fetching client:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update client
app.put('/clients/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { updates, userId } = body;
    
    const existingClient = await kv.get(`client:${id}`);
    if (!existingClient) {
      return c.json({ success: false, error: 'Client not found' }, 404);
    }
    
    const timestamp = new Date().toISOString();
    
    // Add to version history
    const versionHistory = existingClient.versionHistory || [];
    versionHistory.unshift({
      timestamp,
      userId,
      changes: updates,
      snapshot: { ...existingClient },
    });
    
    const updatedClient = {
      ...existingClient,
      ...updates,
      updatedAt: timestamp,
      updatedBy: userId,
      versionHistory: versionHistory.slice(0, 20), // Keep last 20 versions
    };
    
    await kv.set(`client:${id}`, updatedClient);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'client',
      entityId: id,
      action: 'update',
      userId,
      timestamp,
      before: existingClient,
      after: updatedClient,
    });
    
    return c.json({ success: true, client: updatedClient });
  } catch (error) {
    console.error('Error updating client:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== VISITS/ENCOUNTERS ====================

// Create visit
app.post('/visits', async (c) => {
  try {
    const body = await c.req.json();
    const { visit, userId } = body;
    
    const visitId = `visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const visitRecord = {
      id: visitId,
      ...visit,
      createdAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`visit:${visitId}`, visitRecord);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'visit',
      entityId: visitId,
      action: 'create',
      userId,
      timestamp,
      changes: visitRecord,
    });
    
    return c.json({ success: true, visit: visitRecord });
  } catch (error) {
    console.error('Error creating visit:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get visits for a client
app.get('/visits/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const allVisits = await kv.getByPrefix('visit:');
    const clientVisits = allVisits.filter(v => v.clientId === clientId);
    
    return c.json({ success: true, visits: clientVisits });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// [UPDATED] Get recent visits (With Limiting & Sorting)
app.get('/visits', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    
    let visits = await kv.getByPrefix('visit:');
    
    // Sort Newest First (Safe handling of missing dates)
    visits.sort((a, b) => {
       const dateA = a.visitDate || a.createdAt || 0;
       const dateB = b.visitDate || b.createdAt || 0;
       return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    // Slice to limit
    const recentVisits = visits.slice(0, limit);

    return c.json({ success: true, visits: recentVisits });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update visit
app.put('/visits/:id', async (c) => {
  try {
    const visitId = c.req.param('id');
    const { updates, userId } = await c.req.json();
    
    // Check if visit exists
    const existingVisit = await kv.get(`visit:${visitId}`);
    if (!existingVisit) {
      return c.json({ success: false, error: 'Visit not found' }, 404);
    }
    
    // Update visit
    const updatedVisit = {
      ...existingVisit,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    
    await kv.set(`visit:${visitId}`, updatedVisit);
    
    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'visit_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { visitId, updates },
    });
    
    return c.json({ success: true, visit: updatedVisit });
  } catch (error) {
    console.error('Error updating visit:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add mental health record
app.post('/mental-health', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `mental-health:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const mentalHealthRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, mentalHealthRecord);

    // Check for high-risk flags
    const flags = [];
    if (record.phq9Score >= 15 || record.suicidalThought) {
      flags.push({
        type: 'severe-depression',
        severity: 'high',
        date: new Date().toISOString(),
        details: record.suicidalThought ? 'Suicidal thoughts detected' : `PHQ-9 score: ${record.phq9Score}`,
      });
    }
    if (record.gad7Score >= 15) {
      flags.push({
        type: 'severe-anxiety',
        severity: 'high',
        date: new Date().toISOString(),
        details: `GAD-7 score: ${record.gad7Score}`,
      });
    }

    // Add flags to client record if needed
    if (flags.length > 0 && record.clientId) {
      const clientKey = `client:${record.clientId}`;
      const client = await kv.get(clientKey);
      if (client) {
        const existingFlags = Array.isArray(client.flags) ? client.flags : [];
        client.flags = [...existingFlags, ...flags];
        await kv.set(clientKey, client);
      }
    }

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'mental_health_record_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, clientId: record.clientId, type: record.type },
    });

    return c.json({ success: true, record: mentalHealthRecord, flags });
  } catch (error) {
    console.error('Error adding mental health record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/mental-health/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'mental_health_record_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating mental health record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get mental health records for a visit
app.get('/mental-health/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('mental-health:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching mental health records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Placeholder routes for other modules
app.get('/clinical/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('clinical:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching clinical records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/clinical', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `clinical:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const clinicalRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, clinicalRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'clinical_record_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, type: record.type },
    });

    return c.json({ success: true, record: clinicalRecord });
  } catch (error) {
    console.error('Error adding clinical record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/clinical/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'clinical_record_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId, type: record.type },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating clinical record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/psychosocial/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('psychosocial:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching psychosocial records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/psychosocial', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `psychosocial:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const psychosocialRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, psychosocialRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'psychosocial_record_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, type: record.sessionType },
    });

    return c.json({ success: true, record: psychosocialRecord });
  } catch (error) {
    console.error('Error adding psychosocial record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/psychosocial/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'psychosocial_record_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating psychosocial record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/nsp/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('nsp:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching NSP records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/nsp', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `nsp:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const nspRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, nspRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'nsp_record_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, syringesGiven: record.syringesGiven },
    });

    return c.json({ success: true, record: nspRecord });
  } catch (error) {
    console.error('Error adding NSP record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/nsp/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'nsp_record_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating NSP record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/condom/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('condom:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching condom records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/condom', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `condom:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const condomRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, condomRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'condom_distribution_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, maleCondoms: record.maleCondoms, femaleCondoms: record.femaleCondoms },
    });

    return c.json({ success: true, record: condomRecord });
  } catch (error) {
    console.error('Error adding condom record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/condom/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'condom_distribution_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating condom record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/mat/:visitId', async (c) => {
  try {
    const visitId = c.req.param('visitId');
    const allRecords = await kv.getByPrefix('mat:');
    const records = allRecords.filter((r: any) => r.visitId === visitId);
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching MAT records:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/mat', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `mat:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    const matRecord = {
      id,
      ...record,
      createdAt: new Date().toISOString(),
      createdBy: userId,
    };

    await kv.set(id, matRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'mat_dosing_created',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId: id, medication: record.medication, dose: record.dose },
    });

    return c.json({ success: true, record: matRecord });
  } catch (error) {
    console.error('Error adding MAT record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.put('/mat/:recordId', async (c) => {
  try {
    const recordId = c.req.param('recordId');
    const { record, userId } = await c.req.json();
    
    const updatedRecord = {
      ...record,
      id: recordId,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };

    await kv.set(recordId, updatedRecord);

    // Log audit
    await kv.set(`audit:${Date.now()}`, {
      action: 'mat_dosing_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { recordId },
    });

    return c.json({ success: true, record: updatedRecord });
  } catch (error) {
    console.error('Error updating MAT record:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== USERS ====================

// Create user
app.post('/users', async (c) => {
  try {
    const body = await c.req.json();
    const { user, adminUserId } = body;
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const userRecord = {
      id: userId,
      ...user,
      createdAt: timestamp,
      status: user.status || 'Active',
      loginHistory: [],
      permissionOverrides: {},
    };
    
    await kv.set(`user:${userId}`, userRecord);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'user',
      entityId: userId,
      action: 'create',
      userId: adminUserId || 'system',
      timestamp,
      changes: { email: user.email, role: user.role, location: user.location },
    });
    
    return c.json({ success: true, user: userRecord });
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get all users
app.get('/users', async (c) => {
  try {
    const users = await kv.getByPrefix('user:');
    return c.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update user
app.put('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { updates, adminUserId } = body;
    
    const existingUser = await kv.get(`user:${id}`);
    if (!existingUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    const timestamp = new Date().toISOString();
    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: timestamp,
    };
    
    await kv.set(`user:${id}`, updatedUser);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'user',
      entityId: id,
      action: 'update',
      userId: adminUserId || 'system',
      timestamp,
      before: existingUser,
      after: updatedUser,
    });
    
    return c.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Delete/Deactivate user
app.delete('/users/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { adminUserId, permanent } = body;
    
    const existingUser = await kv.get(`user:${id}`);
    if (!existingUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }
    
    const timestamp = new Date().toISOString();
    
    if (permanent) {
      await kv.del(`user:${id}`);
    } else {
      const deactivatedUser = {
        ...existingUser,
        status: 'Deactivated',
        deactivatedAt: timestamp,
      };
      await kv.set(`user:${id}`, deactivatedUser);
    }
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'user',
      entityId: id,
      action: permanent ? 'delete' : 'deactivate',
      userId: adminUserId || 'system',
      timestamp,
      changes: { email: existingUser.email, permanent },
    });
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Login/authenticate user
app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    const users = await kv.getByPrefix('user:');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    
    if (user.status !== 'Active') {
      return c.json({ success: false, error: 'Account is not active' }, 403);
    }
    
    // Update login history
    const timestamp = new Date().toISOString();
    const loginHistory = user.loginHistory || [];
    loginHistory.unshift({
      timestamp,
      device: 'Web Browser',
      ip: '127.0.0.1',
    });
    
    const updatedUser = {
      ...user,
      lastLogin: timestamp,
      loginHistory: loginHistory.slice(0, 10), // Keep last 10 logins
    };
    
    await kv.set(`user:${user.id}`, updatedUser);
    
    // Don't send password back
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    return c.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Error during login:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== ROLES & PERMISSIONS ====================

// Get all roles
app.get('/roles', async (c) => {
  try {
    // Return empty array for now - roles are defined in frontend
    // Custom roles can be stored in KV store
    const customRoles = await kv.getByPrefix('role:');
    return c.json({ success: true, roles: customRoles || [] });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return c.json({ success: true, roles: [] }); // Return empty array instead of error
  }
});

// Create custom role
app.post('/roles', async (c) => {
  try {
    const body = await c.req.json();
    const { role, adminUserId } = body;
    
    const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const roleRecord = {
      id: roleId,
      ...role,
      createdAt: timestamp,
      createdBy: adminUserId,
    };
    
    await kv.set(`role:${roleId}`, roleRecord);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'role',
      entityId: roleId,
      action: 'create',
      userId: adminUserId,
      timestamp,
      changes: roleRecord,
    });
    
    return c.json({ success: true, role: roleRecord });
  } catch (error) {
    console.error('Error creating role:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update role
app.put('/roles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { updates, adminUserId } = body;
    
    const existingRole = await kv.get(`role:${id}`);
    if (!existingRole) {
      return c.json({ success: false, error: 'Role not found' }, 404);
    }
    
    const timestamp = new Date().toISOString();
    const updatedRole = {
      ...existingRole,
      ...updates,
      updatedAt: timestamp,
    };
    
    await kv.set(`role:${id}`, updatedRole);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'role',
      entityId: id,
      action: 'update',
      userId: adminUserId,
      timestamp,
      before: existingRole,
      after: updatedRole,
    });
    
    return c.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error('Error updating role:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get permission templates
app.get('/permission-templates', async (c) => {
  try {
    // Return empty array for now - templates are defined in frontend
    return c.json({ success: true, templates: [] });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return c.json({ success: true, templates: [] }); // Return empty array instead of error
  }
});

// ==================== DASHBOARD METRICS ====================

app.get('/metrics', async (c) => {
  try {
    const clients = await kv.getByPrefix('client:');
    const visits = await kv.getByPrefix('visit:');
    const users = await kv.getByPrefix('user:');
    
    // Calculate metrics
    const totalClients = clients.length;
    const totalVisits = visits.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    
    // Program counts
    const programCounts = clients.reduce((acc, client) => {
      const prog = client.program || 'Unknown';
      acc[prog] = (acc[prog] || 0) + 1;
      return acc;
    }, {});
    
    // Clients by location
    const locationCounts = clients.reduce((acc, client) => {
      const loc = client.location || 'Unknown';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});
    
    // Clients by gender
    const genderCounts = clients.reduce((acc, client) => {
      const gender = client.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});
    
    // Clients by age group
    const ageGroups = clients.reduce((acc, client) => {
      if (!client.age) return acc;
      const age = parseInt(client.age);
      if (isNaN(age)) return acc;
      let group = 'Unknown';
      if (age < 18) group = '0-17';
      else if (age < 35) group = '18-34';
      else if (age < 50) group = '35-49';
      else group = '50+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentClients = clients.filter(c => c.createdAt && new Date(c.createdAt) > thirtyDaysAgo).length;
    const recentVisits = visits.filter(v => v.createdAt && new Date(v.createdAt) > thirtyDaysAgo).length;
    
    return c.json({
      success: true,
      metrics: {
        totalClients,
        totalVisits,
        activeUsers,
        recentClients,
        recentVisits,
        programCounts,
        locationCounts,
        genderCounts,
        ageGroups,
      }
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== AUDIT LOGS ====================

app.get('/audit', async (c) => {
  try {
    const logs = await kv.getByPrefix('audit:');
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get audit logs for specific entity
app.get('/audit/:entityType/:entityId', async (c) => {
  try {
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');
    
    const logs = await kv.getByPrefix('audit:');
    const entityLogs = logs.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
    
    entityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ success: true, logs: entityLogs });
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== CLINICAL RESULTS ====================

// Add clinical result
app.post('/clinical-results', async (c) => {
  try {
    const body = await c.req.json();
    const { result, userId } = body;
    
    const resultId = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const resultRecord = {
      id: resultId,
      ...result,
      createdAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`clinical-result:${resultId}`, resultRecord);
    
    // Check for automatic flags
    const flags = [];
    
    if (result.type === 'lab') {
      if (result.hivTest === 'Positive') {
        flags.push({ type: 'hiv-positive', severity: 'high', date: timestamp });
      }
      if (result.hepC === 'Positive') {
        flags.push({ type: 'hepc-positive', severity: 'medium', date: timestamp });
      }
    }
    
    if (result.type === 'mental-health') {
      // Flag moderate (10+) and above
      if (result.phq9Score && parseInt(result.phq9Score) >= 10) {
        flags.push({ type: 'high-phq9', severity: 'high', date: timestamp, score: result.phq9Score });
      }
      if (result.gad7Score && parseInt(result.gad7Score) >= 10) {
        flags.push({ type: 'high-gad7', severity: 'high', date: timestamp, score: result.gad7Score });
      }
    }
    
    // Update client with flags
    if (flags.length > 0 && result.clientId) {
      const client = await kv.get(`client:${result.clientId}`);
      if (client) {
        const updatedFlags = [...(client.flags || []), ...flags];
        await kv.set(`client:${result.clientId}`, {
          ...client,
          flags: updatedFlags,
        });
      }
    }
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'clinical-result',
      entityId: resultId,
      action: 'create',
      userId,
      timestamp,
      changes: resultRecord,
    });
    
    return c.json({ success: true, result: resultRecord, flags });
  } catch (error) {
    console.error('Error creating clinical result:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get clinical results for client
app.get('/clinical-results/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const allResults = await kv.getByPrefix('clinical-result:');
    const clientResults = allResults.filter(r => r.clientId === clientId);
    clientResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ success: true, results: clientResults });
  } catch (error) {
    console.error('Error fetching clinical results:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== INTERVENTIONS ====================

// Add intervention
app.post('/interventions', async (c) => {
  try {
    const body = await c.req.json();
    const { intervention, userId } = body;
    
    const interventionId = `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const interventionRecord = {
      id: interventionId,
      ...intervention,
      createdAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`intervention:${interventionId}`, interventionRecord);
    
    // Audit log
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'intervention',
      entityId: interventionId,
      action: 'create',
      userId,
      timestamp,
      changes: interventionRecord,
    });
    
    return c.json({ success: true, intervention: interventionRecord });
  } catch (error) {
    console.error('Error creating intervention:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get interventions for client
app.get('/interventions/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const allInterventions = await kv.getByPrefix('intervention:');
    const clientInterventions = allInterventions.filter(i => i.clientId === clientId);
    clientInterventions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json({ success: true, interventions: clientInterventions });
  } catch (error) {
    console.error('Error fetching interventions:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TIMELINE ====================

// Get full timeline for client
app.get('/timeline/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    
    const [visits, results, interventions, audits] = await Promise.all([
      kv.getByPrefix('visit:').then(items => items.filter(v => v.clientId === clientId)),
      kv.getByPrefix('clinical-result:').then(items => items.filter(r => r.clientId === clientId)),
      kv.getByPrefix('intervention:').then(items => items.filter(i => i.clientId === clientId)),
      kv.getByPrefix('audit:').then(items => items.filter(a => a.entityId === clientId)),
    ]);
    
    const timeline = [
      ...visits.map(v => ({ ...v, type: 'visit', timestamp: v.visitDate || v.createdAt })),
      ...results.map(r => ({ ...r, type: 'clinical-result', timestamp: r.createdAt })),
      ...interventions.map(i => ({ ...i, type: 'intervention', timestamp: i.createdAt })),
      ...audits.map(a => ({ ...a, type: 'audit', timestamp: a.timestamp })),
    ];
    
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return c.json({ success: true, timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== REPORTS ====================

// Get program report data
app.get('/reports/program', async (c) => {
  try {
    const program = c.req.query('program');
    const dateRange = c.req.query('dateRange') || 'month';
    const location = c.req.query('location') || 'all';
    const staff = c.req.query('staff') || 'all';
    
    // Fetch all visits
    const visits = await kv.getByPrefix('visit:');
    
    // Filter visits based on date range
    const now = new Date();
    const filteredVisits = visits.filter((visit: any) => {
      // Check multiple date field names: visitDate, date, createdAt
      const dateValue = visit.visitDate || visit.date || visit.createdAt;
      if (!dateValue) return false;
      
      const visitDate = new Date(dateValue);
      let dateMatch = false;
      
      switch (dateRange) {
        case 'today':
          dateMatch = visitDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateMatch = visitDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateMatch = visitDate >= monthAgo;
          break;
        case 'quarter':
          const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateMatch = visitDate >= quarterAgo;
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateMatch = visitDate >= yearAgo;
          break;
        default:
          dateMatch = true;
      }
      
      const locationMatch = location === 'all' || visit.location === location;
      
      return dateMatch && locationMatch;
    });
    
    // Fetch program-specific records
    let programRecords: any[] = [];
    if (program === 'nsp') {
      programRecords = await kv.getByPrefix('nsp:');
    } else if (program === 'mat') {
      programRecords = await kv.getByPrefix('mat:');
    } else if (program === 'condom') {
      programRecords = await kv.getByPrefix('condom:');
    } else if (program === 'mental-health') {
      programRecords = await kv.getByPrefix('mentalhealth:');
    } else if (program === 'psychosocial') {
      programRecords = await kv.getByPrefix('psychosocial:');
    } else if (program === 'clinical') {
      programRecords = await kv.getByPrefix('clinical:');
    }
    
    // Filter program records by visit IDs OR by date for standalone records
    const visitIds = new Set(filteredVisits.map((v: any) => v.id));
    const filteredProgramRecords = programRecords.filter((record: any) => {
      // Check if record has a visitId and it matches
      if (record.visitId && visitIds.has(record.visitId)) {
        return true;
      }
      
      // For standalone records (like condom distribution), filter by date and location
      // Check multiple date field names: date, providedAt, assessmentDate, dosingDate, createdAt
      const dateField = record.date || record.providedAt || record.assessmentDate || record.dosingDate || record.createdAt;
      
      if (!record.visitId && dateField) {
        const recordDate = new Date(dateField);
        let dateMatch = false;
        
        switch (dateRange) {
          case 'today':
            dateMatch = recordDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateMatch = recordDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateMatch = recordDate >= monthAgo;
            break;
          case 'quarter':
            const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            dateMatch = recordDate >= quarterAgo;
            break;
          case 'year':
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            dateMatch = recordDate >= yearAgo;
            break;
          default:
            dateMatch = true;
        }
        
        const locationMatch = location === 'all' || record.location === location;
        return dateMatch && locationMatch;
      }
      
      return false;
    });
    
    // Calculate metrics
    const uniqueClients = new Set(filteredVisits.map((v: any) => v.clientId));
    const report: any = {
      totalServices: filteredProgramRecords.length,
      uniqueClients: uniqueClients.size,
      totalVisits: filteredVisits.length,
      completionRate: 95, // Mock data
      records: filteredProgramRecords.slice(0, 50), // Limit to 50 for preview
    };
    
    // Program-specific metrics
    if (program === 'nsp') {
      const needlesDistributed = filteredProgramRecords.reduce((sum, r) => sum + (r.needlesGiven || 0), 0);
      const syringesDistributed = filteredProgramRecords.reduce((sum, r) => sum + (r.syringesGiven || 0), 0);
      const needlesReturned = filteredProgramRecords.reduce((sum, r) => sum + (r.needlesReturned || 0), 0);
      
      report.nspMetrics = {
        needlesDistributed,
        syringesDistributed,
        returnRatio: needlesDistributed > 0 ? Math.round((needlesReturned / needlesDistributed) * 100) : 0,
      };
    }
    
    if (program === 'mat') {
      const matClients = await kv.getByPrefix('client:');
      const matStatuses = matClients.filter((c: any) => c.programs?.includes('MAT'));
      
      report.matMetrics = {
        active: matStatuses.filter((c: any) => c.matStatus === 'Active').length,
        defaulted: matStatuses.filter((c: any) => c.matStatus === 'Defaulted').length,
        ltfu: matStatuses.filter((c: any) => c.matStatus === 'LTFU').length,
        avgDose: filteredProgramRecords.length > 0 
          ? Math.round(filteredProgramRecords.reduce((sum, r) => sum + (r.dose || 0), 0) / filteredProgramRecords.length)
          : 0,
      };
    }
    
    if (program === 'condom') {
      report.condomMetrics = {
        maleCondoms: filteredProgramRecords.reduce((sum, r) => sum + (r.maleCondoms || 0), 0),
        femaleCondoms: filteredProgramRecords.reduce((sum, r) => sum + (r.femaleCondoms || 0), 0),
        lubricant: filteredProgramRecords.reduce((sum, r) => sum + (r.lubricant || 0), 0),
      };
    }
    
    if (program === 'mental-health') {
      const phq9Scores = filteredProgramRecords.filter(r => r.phq9Score !== undefined);
      const gad7Scores = filteredProgramRecords.filter(r => r.gad7Score !== undefined);
      
      report.mentalHealthMetrics = {
        phq9: {
          minimal: phq9Scores.filter(r => r.phq9Score < 5).length,
          mild: phq9Scores.filter(r => r.phq9Score >= 5 && r.phq9Score < 10).length,
          moderate: phq9Scores.filter(r => r.phq9Score >= 10 && r.phq9Score < 15).length,
          severe: phq9Scores.filter(r => r.phq9Score >= 15).length,
        },
        gad7: {
          minimal: gad7Scores.filter(r => r.gad7Score < 5).length,
          mild: gad7Scores.filter(r => r.gad7Score >= 5 && r.gad7Score < 10).length,
          moderate: gad7Scores.filter(r => r.gad7Score >= 10 && r.gad7Score < 15).length,
          severe: gad7Scores.filter(r => r.gad7Score >= 15).length,
        },
      };
    }
    
    return c.json({ success: true, report });
  } catch (error) {
    console.error('Error generating program report:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get client report data
app.get('/reports/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    
    // Fetch client
    const client = await kv.get(`client:${clientId}`);
    if (!client) {
      return c.json({ success: false, error: 'Client not found' }, 404);
    }
    
    // Fetch all visits for this client
    const allVisits = await kv.getByPrefix('visit:');
    const clientVisits = allVisits.filter((v: any) => v.clientId === clientId);
    
    // Fetch all service records for this client's visits
    const visitIds = clientVisits.map((v: any) => v.id);
    const allNSP = await kv.getByPrefix('nsp:');
    const allMAT = await kv.getByPrefix('mat:');
    const allCondom = await kv.getByPrefix('condom:');
    const allMH = await kv.getByPrefix('mentalhealth:');
    const allPsycho = await kv.getByPrefix('psychosocial:');
    const allClinical = await kv.getByPrefix('clinical:');
    
    const clientNSP = allNSP.filter((r: any) => visitIds.includes(r.visitId));
    const clientMAT = allMAT.filter((r: any) => visitIds.includes(r.visitId));
    const clientCondom = allCondom.filter((r: any) => visitIds.includes(r.visitId));
    const clientMH = allMH.filter((r: any) => visitIds.includes(r.visitId));
    const clientPsycho = allPsycho.filter((r: any) => visitIds.includes(r.visitId));
    const clientClinical = allClinical.filter((r: any) => visitIds.includes(r.visitId));
    
    // Calculate summary
    const lastVisit = clientVisits.length > 0 
      ? clientVisits.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    
    const services = {
      'NSP': clientNSP.length,
      'MAT': clientMAT.length,
      'Condom': clientCondom.length,
      'Mental Health': clientMH.length,
      'Psychosocial': clientPsycho.length,
      'Clinical': clientClinical.length,
    };
    
    // Mental health trends
    const latestMH = clientMH.length > 0 
      ? clientMH.sort((a: any, b: any) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime())[0]
      : null;
    
    const report = {
      client,
      programs: client.programs || [],
      visitCount: clientVisits.length,
      lastVisit: lastVisit?.date,
      serviceCount: Object.values(services).reduce((a: any, b: any) => a + b, 0),
      services,
      riskFlags: client.riskFlags || [],
      mentalHealthTrend: latestMH ? {
        latestPHQ9: latestMH.phq9Score,
        latestGAD7: latestMH.gad7Score,
      } : null,
    };
    
    return c.json({ success: true, report });
  } catch (error) {
    console.error('Error generating client report:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get commodities report data
app.get('/reports/commodities', async (c) => {
  try {
    const commodity = c.req.query('commodity');
    const location = c.req.query('location') || 'all';
    const dateRange = c.req.query('dateRange') || 'month';
    
    // Mock data for commodities (in production, this would come from a real inventory system)
    const mockData: any = {
      currentStock: Math.floor(Math.random() * 5000) + 1000,
      totalDistributed: Math.floor(Math.random() * 3000) + 500,
      totalReceived: Math.floor(Math.random() * 4000) + 1000,
      wastage: Math.floor(Math.random() * 100) + 10,
      wastagePercentage: 2,
      lowStock: Math.random() > 0.7,
      avgDailyConsumption: Math.floor(Math.random() * 100) + 20,
      daysRemaining: Math.floor(Math.random() * 30) + 5,
      recommendedReorder: Math.floor(Math.random() * 3000) + 1000,
      movements: [],
    };
    
    // Generate mock movement history
    for (let i = 0; i < 10; i++) {
      const types = ['in', 'out', 'wastage'];
      const type = types[Math.floor(Math.random() * types.length)];
      mockData.movements.push({
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        type,
        quantity: Math.floor(Math.random() * 500) + 50,
        location: ['Mombasa', 'Lamu', 'Kilifi'][Math.floor(Math.random() * 3)],
        user: ['Staff A', 'Staff B', 'Staff C'][Math.floor(Math.random() * 3)],
        notes: type === 'wastage' ? 'Expired stock' : '',
      });
    }
    
    // Sort movements by date (newest first)
    mockData.movements.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Location breakdown if viewing all
    if (location === 'all') {
      mockData.locationBreakdown = {
        'Mombasa': {
          stock: Math.floor(Math.random() * 2000) + 500,
          distributed: Math.floor(Math.random() * 1000) + 200,
          received: Math.floor(Math.random() * 1500) + 300,
          lowStock: Math.random() > 0.7,
        },
        'Lamu': {
          stock: Math.floor(Math.random() * 1500) + 300,
          distributed: Math.floor(Math.random() * 800) + 150,
          received: Math.floor(Math.random() * 1200) + 250,
          lowStock: Math.random() > 0.7,
        },
        'Kilifi': {
          stock: Math.floor(Math.random() * 1800) + 400,
          distributed: Math.floor(Math.random() * 900) + 180,
          received: Math.floor(Math.random() * 1400) + 280,
          lowStock: Math.random() > 0.7,
        },
      };
    }
    
    return c.json({ success: true, data: mockData });
  } catch (error) {
    console.error('Error generating commodities report:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;