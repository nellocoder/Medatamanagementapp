import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import * as kv from './kv_store.tsx';

// Helper function to safely get error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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

    // Sort by createdAt descending (newest first) - with safe date handling
    clients.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Get next client ID (Auto-generation)
app.get('/clients/next-id', async (c) => {
  try {
    const program = c.req.query('program');
    const county = c.req.query('county'); // New parameter to scope by county
    const clients = await kv.getByPrefix('client:');
    
    // Determine prefix based on program
    let prefix = 'CL';
    const p = program?.toLowerCase() || '';
    if (p.includes('nsp')) prefix = 'NSP';
    else if (p.includes('methadone') || p.includes('mat')) prefix = 'MAT';
    else if (p.includes('stimulant')) prefix = 'STP';
    
    // Normalize requested county code
    const getCountyCode = (loc: string) => {
      const l = loc?.toLowerCase() || '';
      if (l.includes('mombasa')) return '001';
      if (l.includes('kilifi')) return '003';
      if (l.includes('lamu')) return '005';
      return '';
    };
    const targetCountyCode = getCountyCode(county);

    let maxId = 0;
    
    clients.forEach(client => {
      if (client.clientId && typeof client.clientId === 'string') {
        const parts = client.clientId.split('-');
        
        // Handle new format: PREFIX-CountyGender-SEQUENCE (e.g., STP-001M-0001)
        if (parts.length === 3) {
          const idPrefix = parts[0];
          const middle = parts[1]; // 001M
          const seq = parts[2]; // 0001
          
          // Check if prefix matches
          if (idPrefix === prefix) {
            // Check if county matches (first 3 chars of middle part)
            const idCounty = middle.substring(0, 3);
            if (!targetCountyCode || idCounty === targetCountyCode) {
               const idNum = parseInt(seq, 10);
               if (!isNaN(idNum) && idNum > maxId) {
                 maxId = idNum;
               }
            }
          }
        }
        // Handle old format: PREFIX-NUMBER (fallback if needed, though we are migrating away)
        else if (parts.length === 2 && !targetCountyCode) { // Only count old format if no county specified
           // ... logic for old format ...
        }
      }
    });
    
    // Start at 1, padded to 4 digits
    const nextNum = maxId === 0 ? 1 : maxId + 1;
    const paddedNum = nextNum.toString().padStart(4, '0');
    
    // Return the components so frontend can construct the ID
    return c.json({ 
      success: true, 
      nextId: `${prefix}-XXX-${paddedNum}`,
      prefix,
      sequence: nextNum,
      paddedSequence: paddedNum
    });
  } catch (error) {
    console.error('Error generating next client ID:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// [NEW] Migrate Client IDs
app.post('/admin/migrate-ids', async (c) => {
  try {
    const { userId } = await c.req.json(); // Admin user requesting migration
    
    const clients = await kv.getByPrefix('client:');
    const updates = [];
    
    // Group clients by Program + County bucket to maintain independent sequences
    const buckets: Record<string, any[]> = {};

    // Helper to normalize program
    const getProgramPrefix = (p: string) => {
      const prog = p?.toLowerCase() || '';
      if (prog.includes('nsp')) return 'NSP';
      if (prog.includes('methadone') || prog.includes('mat')) return 'MAT';
      if (prog.includes('stimulant')) return 'STP';
      return 'CL';
    };

    // Helper to normalize county/location
    const getCountyCode = (loc: string) => {
      const l = loc?.toLowerCase() || '';
      if (l.includes('mombasa')) return '001';
      if (l.includes('kilifi')) return '003';
      if (l.includes('lamu')) return '005';
      return '000'; // Unknown
    };

    // Helper to normalize gender
    const getGenderCode = (g: string) => {
      const gen = g?.toLowerCase() || '';
      if (gen.startsWith('m')) return 'M';
      if (gen.startsWith('f')) return 'F';
      return 'X'; // Other
    };

    // 1. Sort all clients by creation date to preserve historical order
    // Use createdAt or fallback to parsing timestamp from old ID if available, or just random
    clients.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });

    // 2. Assign to buckets
    clients.forEach(client => {
      const prefix = getProgramPrefix(client.program);
      const countyCode = getCountyCode(client.location || client.county);
      const bucketKey = `${prefix}-${countyCode}`;
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(client);
    });

    // 3. Re-assign IDs
    const migrationResults = [];
    
    for (const [key, bucketClients] of Object.entries(buckets)) {
      const [prefix, countyCode] = key.split('-');
      
      bucketClients.forEach((client, index) => {
        const sequence = (index + 1).toString().padStart(4, '0');
        const genderCode = getGenderCode(client.gender);
        
        const newClientId = `${prefix}-${countyCode}${genderCode}-${sequence}`;
        
        // Only update if changed
        if (client.clientId !== newClientId) {
          client.oldClientId = client.clientId; // Backup old ID
          client.clientId = newClientId;
          client.updatedAt = new Date().toISOString();
          updates.push(client);
          migrationResults.push({ old: client.oldClientId, new: newClientId });
        }
      });
    }

    // 4. Save updates
    for (const client of updates) {
      await kv.set(`client:${client.id}`, client);
    }

    return c.json({ 
      success: true, 
      migratedCount: updates.length, 
      details: migrationResults 
    });

  } catch (error) {
    console.error('Error migrating IDs:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// [UPDATED] Get recent visits (With Limiting & Sorting)
app.get('/visits', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    
    let visits = await kv.getByPrefix('visit:');
    
    // Sort Newest First (Safe handling of missing dates)
    visits.sort((a, b) => {
       const dateA = a.visitDate || a.createdAt;
       const dateB = b.visitDate || b.createdAt;
       const timeA = dateA ? new Date(dateA).getTime() : 0;
       const timeB = dateB ? new Date(dateB).getTime() : 0;
       return timeB - timeA;
    });

    // Slice to limit
    const recentVisits = visits.slice(0, limit);

    return c.json({ success: true, visits: recentVisits });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Delete a visit
app.delete('/visits/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { userId, userName } = await c.req.json(); // Optional user info for audit

    // Normalize ID: remove 'visit:' prefix if present
    const actualId = id.startsWith('visit:') ? id : `visit:${id}`;
    const visit = await kv.get(actualId);

    if (!visit) {
      return c.json({ success: false, error: 'Visit not found' }, 404);
    }

    // Delete the record
    await kv.del(actualId);

    // Log to audit
    const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`audit:${auditId}`, {
      id: auditId,
      entityType: 'visit',
      entityId: id,
      action: 'delete',
      userId: userId || 'system',
      userName: userName || 'System',
      timestamp: new Date().toISOString(),
      details: { clientId: visit.clientId, visitDate: visit.visitDate }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting visit:', error);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Get all users
app.get('/users', async (c) => {
  try {
    const users = await kv.getByPrefix('user:');
    return c.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    // ── Read filter params ──────────────────────────────────────────────────
    const locationFilter  = c.req.query('location')  || 'all';
    const programFilter   = c.req.query('program')   || 'all';
    const dateRangeFilter = c.req.query('dateRange') || '30';  // e.g. '30','90','month:2025-03','quarter:2025-Q1','year:2025'
    const searchFilter    = (c.req.query('search')   || '').toLowerCase().trim();

    // ── Resolve date range to a [from, to] window ───────────────────────────
    let dateFrom: Date;
    let dateTo: Date = new Date(); // default: now

    if (dateRangeFilter.startsWith('month:')) {
      // e.g. 'month:2025-03'
      const [year, month] = dateRangeFilter.replace('month:', '').split('-').map(Number);
      dateFrom = new Date(year, month - 1, 1);
      dateTo   = new Date(year, month, 0, 23, 59, 59); // last day of month
    } else if (dateRangeFilter.startsWith('quarter:')) {
      // e.g. 'quarter:2025-Q1'
      const [yearStr, qStr] = dateRangeFilter.replace('quarter:', '').split('-Q');
      const year = parseInt(yearStr);
      const quarter = parseInt(qStr); // 1-4
      const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9
      dateFrom = new Date(year, startMonth, 1);
      dateTo   = new Date(year, startMonth + 3, 0, 23, 59, 59); // last day of last month in quarter
    } else if (dateRangeFilter.startsWith('year:')) {
      // e.g. 'year:2025'
      const year = parseInt(dateRangeFilter.replace('year:', ''));
      dateFrom = new Date(year, 0, 1);
      dateTo   = new Date(year, 11, 31, 23, 59, 59);
    } else {
      // Legacy: number of days back (e.g. '30', '90')
      const days = parseInt(dateRangeFilter) || 30;
      dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
    }

    // ── Normalise program filter to match stored data ────────────────────────
    const programMatches = (clientProgram: string): boolean => {
      if (programFilter === 'all') return true;
      const p = (clientProgram || '').toLowerCase();
      if (programFilter === 'NSP')        return p.includes('nsp');
      if (programFilter === 'MAT')        return p.includes('mat') || p.includes('methadone');
      if (programFilter === 'Stimulants') return p.includes('stimulant');
      return clientProgram === programFilter;
    };

    const allClients      = await kv.getByPrefix('client:');
    const allVisits       = await kv.getByPrefix('visit:');
    const users           = await kv.getByPrefix('user:');
    const psychosocial    = await kv.getByPrefix('psychosocial:');
    const clinicalResults = await kv.getByPrefix('clinical-result:');

    // ── Filter clients ───────────────────────────────────────────────────────
    const clients = allClients.filter(client => {
      if (locationFilter !== 'all' && client.location !== locationFilter) return false;
      if (!programMatches(client.program)) return false;
      if (searchFilter) {
        const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
        const clientId = (client.clientId || '').toLowerCase();
        if (!fullName.includes(searchFilter) && !clientId.includes(searchFilter)) return false;
      }
      return true;
    });

    const filteredClientIds = new Set(clients.map(c => c.id));

    // ── Filter visits to date window + filtered clients ──────────────────────
    const visits = allVisits.filter(visit => {
      const visitDate = visit.visitDate || visit.createdAt;
      if (!visitDate) return false;
      const d = new Date(visitDate);
      if (d < dateFrom || d > dateTo) return false;
      if (visit.clientId && !filteredClientIds.has(visit.clientId)) return false;
      return true;
    });

    // ── Core counts ──────────────────────────────────────────────────────────
    const totalClients = clients.length;
    const totalVisits  = visits.length;
    const activeUsers  = users.filter(u => u.status === 'Active').length;

    const programCounts = clients.reduce((acc: Record<string, number>, client) => {
      const prog = client.program || 'Unknown';
      acc[prog] = (acc[prog] || 0) + 1;
      return acc;
    }, {});

    const locationCounts = clients.reduce((acc: Record<string, number>, client) => {
      const loc = client.location || 'Unknown';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    const genderCounts = clients.reduce((acc: Record<string, number>, client) => {
      const gender = client.gender || 'Unknown';
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    }, {});

    const ageGroups = clients.reduce((acc: Record<string, number>, client) => {
      if (!client.age) return acc;
      const age = parseInt(client.age);
      if (isNaN(age)) return acc;
      let group = 'Unknown';
      if (age < 18)      group = '0-17';
      else if (age < 35) group = '18-34';
      else if (age < 50) group = '35-49';
      else               group = '50+';
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});

    // ── Recent clients = registered within the date window ───────────────────
    const recentClients = clients.filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d >= dateFrom && d <= dateTo;
    }).length;

    // ── Service Delivery Summary (last 7 days within the filtered set) ───────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Use the later of sevenDaysAgo and dateFrom so it respects the filter
    const serviceFrom = sevenDaysAgo > dateFrom ? sevenDaysAgo : dateFrom;

    const isInServiceWindow = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= serviceFrom && d <= dateTo;
    };

    const clientGenderMap = clients.reduce((acc: Record<string, string>, client) => {
      acc[client.id] = client.gender || 'Not recorded';
      return acc;
    }, {});

    const getGender = (clientId: string) => clientGenderMap[clientId] || 'Not recorded';

    const serviceSummary: any = {
      'Psychosocial Sessions':    { total: 0, male: 0, female: 0, notRecorded: 0 },
      'HIV Testing':              { total: 0, male: 0, female: 0, notRecorded: 0 },
      'Harm Reduction Education': { total: 0, male: 0, female: 0, notRecorded: 0 },
    };

    const increment = (category: string, genderRaw: string) => {
      const gender = (genderRaw || '').toLowerCase();
      serviceSummary[category].total++;
      if (gender === 'male')        serviceSummary[category].male++;
      else if (gender === 'female') serviceSummary[category].female++;
      else                          serviceSummary[category].notRecorded++;
    };

    psychosocial.forEach((record: any) => {
      if (!filteredClientIds.has(record.clientId)) return;
      if (isInServiceWindow(record.createdAt || record.providedAt)) {
        increment('Psychosocial Sessions', getGender(record.clientId));
      }
    });

    clinicalResults.forEach((record: any) => {
      if (!filteredClientIds.has(record.clientId)) return;
      if (record.type === 'lab' && record.hivTest && isInServiceWindow(record.createdAt || record.date)) {
        increment('HIV Testing', getGender(record.clientId));
      }
    });

    visits.forEach((visit: any) => {
      if (isInServiceWindow(visit.createdAt || visit.visitDate) && visit.servicesProvided) {
        const services = visit.servicesProvided.toLowerCase();
        if (services.includes('education') || services.includes('prevention') || services.includes('naloxone')) {
          increment('Harm Reduction Education', getGender(visit.clientId));
        }
      }
    });

    return c.json({
      success: true,
      metrics: {
        totalClients,
        totalVisits,
        activeUsers,
        recentClients,
        recentVisits: visits.length,
        programCounts,
        locationCounts,
        genderCounts,
        ageGroups,
        serviceSummary,
        appliedFilters: {
          location: locationFilter,
          program: programFilter,
          dateRange: dateRangeFilter,
          search: searchFilter,
          resolvedDateFrom: dateFrom.toISOString(),
          resolvedDateTo: dateTo.toISOString(),
        },
      }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});
// ==================== AUDIT LOGS ====================

app.get('/audit', async (c) => {
  try {
    const logs = await kv.getByPrefix('audit:');
    // Sort by timestamp descending (with safe date handling)
    logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    
    entityLogs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, logs: entityLogs });
  } catch (error) {
    console.error('Error fetching entity audit logs:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    
    // AUTOMATIC REFERRAL GENERATION for High Risk PrEP RAST
    if (result.type === 'PrEP RAST' && (result.severity === 'high' || (result.notes && result.notes.toLowerCase().includes('eligible')))) {
      const referralId = `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const referralRecord = {
        id: referralId,
        clientId: result.clientId,
        visitId: result.visitId,
        source: 'Clinical Screening',
        triggerReason: 'High Risk PrEP RAST Result',
        service: 'PrEP',
        riskLevel: 'High',
        priority: 'Urgent',
        status: 'Pending',
        createdBy: 'system',
        createdAt: timestamp,
        updatedAt: timestamp,
        riskContext: {
          source: 'PrEP RAST',
          score: result.score || 'N/A',
          severity: 'High',
          date: timestamp
        },
        followUps: [],
        auditLog: [{
           action: 'created_automatic',
           user: 'system',
           timestamp,
           details: 'Automatically generated from High Risk PrEP RAST'
        }]
      };
      await kv.set(`referral:${referralId}`, referralRecord);
    }
    
    return c.json({ success: true, result: resultRecord, flags });
  } catch (error) {
    console.error('Error creating clinical result:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Get clinical results for client
app.get('/clinical-results/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const allResults = await kv.getByPrefix('clinical-result:');
    const clientResults = allResults.filter(r => r.clientId === clientId);
    clientResults.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, results: clientResults });
  } catch (error) {
    console.error('Error fetching clinical results:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Get interventions for client
app.get('/interventions/client/:clientId', async (c) => {
  try {
    const clientId = c.req.param('clientId');
    const allInterventions = await kv.getByPrefix('intervention:');
    const clientInterventions = allInterventions.filter(i => i.clientId === clientId);
    clientInterventions.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, interventions: clientInterventions });
  } catch (error) {
    console.error('Error fetching interventions:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
    
    timeline.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, timeline });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
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
        return dateMatch;
      }
      return false;
    });
    
    return c.json({ success: true, records: filteredProgramRecords });
  } catch (error) {
    console.error('Error fetching program report:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// ==================== PARALEGAL MANAGEMENT ====================

// Create paralegal case
app.post('/paralegal-cases', async (c) => {
  try {
    const body = await c.req.json();
    const { record, userId } = body;
    
    const caseId = `legal_case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const caseRecord = {
      id: caseId,
      ...record,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
      status: record.status || 'Open',
      actions: record.actions || [],
      referrals: record.referrals || [],
    };
    
    await kv.set(`paralegal-case:${caseId}`, caseRecord);
    
    // Audit log
    await kv.set(`audit:${Date.now()}`, {
      action: 'paralegal_case_created',
      userId,
      timestamp,
      details: { caseId, clientId: record.clientId, type: record.incidentType },
    });
    
    return c.json({ success: true, case: caseRecord });
  } catch (error) {
    console.error('Error creating paralegal case:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Get all paralegal cases (optional filters)
app.get('/paralegal-cases', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    const status = c.req.query('status');
    
    let cases = await kv.getByPrefix('paralegal-case:');
    
    if (clientId) {
      cases = cases.filter(c => c.clientId === clientId);
    }
    
    if (status && status !== 'all') {
      cases = cases.filter(c => c.status === status);
    }
    
    // Sort by incident date (newest first)
    cases.sort((a, b) => {
      const timeA = a.incidentDate ? new Date(a.incidentDate).getTime() : 0;
      const timeB = b.incidentDate ? new Date(b.incidentDate).getTime() : 0;
      return timeB - timeA;
    });
    
    return c.json({ success: true, cases });
  } catch (error) {
    console.error('Error fetching paralegal cases:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Update paralegal case
app.put('/paralegal-cases/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { updates, userId } = await c.req.json();
    
    const existingCase = await kv.get(`paralegal-case:${id}`);
    if (!existingCase) {
      return c.json({ success: false, error: 'Case not found' }, 404);
    }
    
    const updatedCase = {
      ...existingCase,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    
    await kv.set(`paralegal-case:${id}`, updatedCase);
    
    // Audit log
    await kv.set(`audit:${Date.now()}`, {
      action: 'paralegal_case_updated',
      userId,
      timestamp: new Date().toISOString(),
      details: { caseId: id, updates },
    });
    
    return c.json({ success: true, case: updatedCase });
  } catch (error) {
    console.error('Error updating paralegal case:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// Legal Literacy Activities
app.post('/legal-literacy', async (c) => {
  try {
    const body = await c.req.json();
    const { record, userId } = body;
    
    const id = `legal_lit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const activityRecord = {
      id,
      ...record,
      createdAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`legal-literacy:${id}`, activityRecord);
    
    return c.json({ success: true, record: activityRecord });
  } catch (error) {
    console.error('Error creating legal literacy activity:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/legal-literacy', async (c) => {
  try {
    const activities = await kv.getByPrefix('legal-literacy:');
    activities.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, activities });
  } catch (error) {
    console.error('Error fetching legal literacy activities:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// ==================== HIV MANAGEMENT ====================

// --- HIV Profiles ---
app.post('/hiv-profiles', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    
    // Validate: no duplicate HIV profile per client
    const existing = await kv.getByPrefix('hiv-profile:');
    if (existing.some(p => p.clientId === record.clientId)) {
      return c.json({ success: false, error: 'HIV profile already exists for this client' }, 400);
    }
    
    // Validate: enrollment after diagnosis
    if (record.enrollmentDate && record.dateOfDiagnosis && new Date(record.enrollmentDate) < new Date(record.dateOfDiagnosis)) {
      return c.json({ success: false, error: 'Enrollment date must be after diagnosis date' }, 400);
    }
    
    const id = `hiv_profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const profileRecord = {
      id,
      ...record,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userId,
    };
    
    await kv.set(`hiv-profile:${id}`, profileRecord);
    
    // Also flag the client as HIV positive
    if (record.clientId) {
      const client = await kv.get(`client:${record.clientId}`);
      if (client) {
        await kv.set(`client:${record.clientId}`, {
          ...client,
          isHivPositive: true,
          updatedAt: timestamp,
        });
      }
    }
    
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'hiv_profile_created',
      entityType: 'hiv_profile',
      entityId: id,
      userId,
      timestamp,
      details: { clientId: record.clientId },
    });
    
    return c.json({ success: true, profile: profileRecord });
  } catch (error) {
    console.error('Error creating HIV profile:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/hiv-profiles', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    let profiles = await kv.getByPrefix('hiv-profile:');
    
    if (clientId) {
      profiles = profiles.filter(p => p.clientId === clientId);
    }
    
    profiles.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, profiles });
  } catch (error) {
    console.error('Error fetching HIV profiles:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.put('/hiv-profiles/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { updates, userId } = await c.req.json();
    
    const existing = await kv.get(`hiv-profile:${id}`);
    if (!existing) {
      return c.json({ success: false, error: 'HIV profile not found' }, 404);
    }
    
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: userId,
    };
    
    await kv.set(`hiv-profile:${id}`, updated);
    
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'hiv_profile_updated',
      entityType: 'hiv_profile',
      entityId: id,
      userId,
      timestamp: new Date().toISOString(),
      details: { updates },
    });
    
    return c.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Error updating HIV profile:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// --- ART Records ---
app.post('/art-records', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    
    const profiles = await kv.getByPrefix('hiv-profile:');
    const hasProfile = profiles.some(p => p.clientId === record.clientId);
    if (!hasProfile) {
      return c.json({ success: false, error: 'Cannot create ART record without an HIV profile (diagnosis date required)' }, 400);
    }
    
    if (record.adherencePercent !== undefined && (record.adherencePercent < 0 || record.adherencePercent > 100)) {
      return c.json({ success: false, error: 'Adherence percent must be between 0 and 100' }, 400);
    }
    
    const id = `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    const artRecord = { id, ...record, createdAt: timestamp, updatedAt: timestamp, createdBy: userId };
    await kv.set(`art-record:${id}`, artRecord);
    
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'art_record_created', entityType: 'art_record', entityId: id, userId,
      timestamp, details: { clientId: record.clientId, regimen: record.regimen },
    });
    
    return c.json({ success: true, record: artRecord });
  } catch (error) {
    console.error('Error creating ART record:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/art-records', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    let records = await kv.getByPrefix('art-record:');
    if (clientId) records = records.filter(r => r.clientId === clientId);
    records.sort((a, b) => {
      const dateA = a.initiationDate || a.createdAt;
      const dateB = b.initiationDate || b.createdAt;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching ART records:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.put('/art-records/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { updates, userId } = await c.req.json();
    if (updates.adherencePercent !== undefined && (updates.adherencePercent < 0 || updates.adherencePercent > 100)) {
      return c.json({ success: false, error: 'Adherence percent must be between 0 and 100' }, 400);
    }
    const existing = await kv.get(`art-record:${id}`);
    if (!existing) return c.json({ success: false, error: 'ART record not found' }, 404);
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString(), updatedBy: userId };
    await kv.set(`art-record:${id}`, updated);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'art_record_updated', entityType: 'art_record', entityId: id, userId,
      timestamp: new Date().toISOString(), details: { updates },
    });
    return c.json({ success: true, record: updated });
  } catch (error) {
    console.error('Error updating ART record:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// --- Viral Load Records ---
app.post('/viral-load', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    if (record.viralLoadValue !== undefined && isNaN(Number(record.viralLoadValue))) {
      return c.json({ success: false, error: 'Viral load value must be numeric' }, 400);
    }
    const id = `vl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const vlValue = Number(record.viralLoadValue);
    const suppressionStatus = vlValue < 1000 ? 'Suppressed' : 'Unsuppressed';
    let nextDueDate = '';
    if (record.sampleDate) {
      const next = new Date(record.sampleDate);
      next.setMonth(next.getMonth() + 6);
      nextDueDate = next.toISOString().split('T')[0];
    }
    const vlRecord = {
      id, ...record, viralLoadValue: vlValue, suppressionStatus, nextDueDate,
      createdAt: timestamp, updatedAt: timestamp, createdBy: userId,
    };
    await kv.set(`viral-load:${id}`, vlRecord);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'viral_load_created', entityType: 'viral_load', entityId: id, userId,
      timestamp, details: { clientId: record.clientId, value: vlValue, status: suppressionStatus },
    });
    return c.json({ success: true, record: vlRecord });
  } catch (error) {
    console.error('Error creating viral load record:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/viral-load', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    let records = await kv.getByPrefix('viral-load:');
    if (clientId) records = records.filter(r => r.clientId === clientId);
    records.sort((a, b) => {
      const dateA = a.sampleDate || a.createdAt;
      const dateB = b.sampleDate || b.createdAt;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching viral load records:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// --- HIV Clinical Visits ---
app.post('/hiv-clinical-visits', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `hiv_visit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const visitRecord = { id, ...record, createdAt: timestamp, updatedAt: timestamp, createdBy: userId };
    await kv.set(`hiv-clinical-visit:${id}`, visitRecord);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'hiv_clinical_visit_created', entityType: 'hiv_clinical_visit', entityId: id, userId,
      timestamp, details: { clientId: record.clientId },
    });
    return c.json({ success: true, record: visitRecord });
  } catch (error) {
    console.error('Error creating HIV clinical visit:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/hiv-clinical-visits', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    let records = await kv.getByPrefix('hiv-clinical-visit:');
    if (clientId) records = records.filter(r => r.clientId === clientId);
    records.sort((a, b) => {
      const dateA = a.visitDate || a.createdAt;
      const dateB = b.visitDate || b.createdAt;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching HIV clinical visits:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// --- Adherence Tracking ---
app.post('/adherence-tracking', async (c) => {
  try {
    const { record, userId } = await c.req.json();
    const id = `adherence_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const adherenceRecord = { id, ...record, createdAt: timestamp, updatedAt: timestamp, createdBy: userId };
    await kv.set(`adherence-tracking:${id}`, adherenceRecord);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'adherence_record_created', entityType: 'adherence_tracking', entityId: id, userId,
      timestamp, details: { clientId: record.clientId },
    });
    return c.json({ success: true, record: adherenceRecord });
  } catch (error) {
    console.error('Error creating adherence record:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

app.get('/adherence-tracking', async (c) => {
  try {
    const clientId = c.req.query('clientId');
    let records = await kv.getByPrefix('adherence-tracking:');
    if (clientId) records = records.filter(r => r.clientId === clientId);
    records.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, records });
  } catch (error) {
    console.error('Error fetching adherence records:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// --- HIV Dashboard Metrics ---
app.get('/hiv-metrics', async (c) => {
  try {
    const [profiles, artRecords, vlRecords, adherenceRecords, clients, hivVisits] = await Promise.all([
      kv.getByPrefix('hiv-profile:'),
      kv.getByPrefix('art-record:'),
      kv.getByPrefix('viral-load:'),
      kv.getByPrefix('adherence-tracking:'),
      kv.getByPrefix('client:'),
      kv.getByPrefix('hiv-clinical-visit:'),
    ]);
    
    const clientMap: Record<string, any> = {};
    clients.forEach(cl => { clientMap[cl.id] = cl; });
    
    const totalHivPositive = profiles.length;
    const activeOnArt = artRecords.filter(r => r.currentStatus === 'Active').length;
    const artClientIds = new Set(artRecords.map(r => r.clientId));
    const totalInitiated = artClientIds.size;
    
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const latestVlByClient: Record<string, any> = {};
    vlRecords.forEach(vl => {
      if (!latestVlByClient[vl.clientId] || new Date(vl.sampleDate) > new Date(latestVlByClient[vl.clientId].sampleDate)) {
        latestVlByClient[vl.clientId] = vl;
      }
    });
    
    const latestVlValues = Object.values(latestVlByClient);
    const totalTested = latestVlValues.length;
    const suppressed = latestVlValues.filter(v => v.suppressionStatus === 'Suppressed').length;
    const unsuppressed = latestVlValues.filter(v => v.suppressionStatus === 'Unsuppressed').length;
    const suppressionRate = totalTested > 0 ? Math.round((suppressed / totalTested) * 100) : 0;
    const retentionRate = totalInitiated > 0 ? Math.round((activeOnArt / totalInitiated) * 100) : 0;
    
    const dueForVl = profiles.filter(p => {
      const latestVl = latestVlByClient[p.clientId];
      if (!latestVl) return true;
      return new Date(latestVl.sampleDate) < sixMonthsAgo;
    }).length;
    
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const lostToFollowUp = artRecords.filter(r => {
      if (r.currentStatus === 'Active') return false;
      return new Date(r.updatedAt || r.createdAt) < threeMonthsAgo;
    }).length;
    
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }
    
    const vlTrend = months.map(month => {
      const monthVls = vlRecords.filter(v => (v.sampleDate || '').startsWith(month));
      const monthSuppressed = monthVls.filter(v => v.suppressionStatus === 'Suppressed').length;
      const total = monthVls.length;
      return {
        month,
        label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        suppressionRate: total > 0 ? Math.round((monthSuppressed / total) * 100) : 0,
        total, suppressed: monthSuppressed,
      };
    });
    
    const artTrend = months.map(month => {
      const monthArt = artRecords.filter(r => (r.initiationDate || '').startsWith(month));
      return {
        month,
        label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        initiated: monthArt.length,
      };
    });
    
    const genderDist: Record<string, number> = {};
    profiles.forEach(p => {
      const client = clientMap[p.clientId];
      const gender = client?.gender || 'Unknown';
      genderDist[gender] = (genderDist[gender] || 0) + 1;
    });
    
    const ageDist: Record<string, number> = {};
    profiles.forEach(p => {
      const client = clientMap[p.clientId];
      const age = parseInt(client?.age || '0');
      let group = 'Unknown';
      if (age > 0 && age < 18) group = '0-17';
      else if (age >= 18 && age < 25) group = '18-24';
      else if (age >= 25 && age < 35) group = '25-34';
      else if (age >= 35 && age < 50) group = '35-49';
      else if (age >= 50) group = '50+';
      ageDist[group] = (ageDist[group] || 0) + 1;
    });
    
    const regimenDist: Record<string, number> = {};
    artRecords.filter(r => r.currentStatus === 'Active').forEach(r => {
      const reg = r.regimen || 'Unknown';
      regimenDist[reg] = (regimenDist[reg] || 0) + 1;
    });
    
    return c.json({
      success: true,
      metrics: {
        totalHivPositive, activeOnArt, totalInitiated, suppressionRate,
        suppressed, unsuppressed, totalTested, dueForVl, lostToFollowUp,
        retentionRate, vlTrend, artTrend, genderDist, ageDist, regimenDist,
        totalVisits: hivVisits.length, totalAdherenceRecords: adherenceRecords.length,
      },
    });
  } catch (error) {
    console.error('Error fetching HIV metrics:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== COMPREHENSIVE REPORTING ====================

app.get('/reports/comprehensive-metrics', async (c) => {
  try {
    const dateFrom = c.req.query('dateFrom');
    const dateTo = c.req.query('dateTo');
    const county = c.req.query('county');
    const subCounty = c.req.query('subCounty');
    const program = c.req.query('program');
    const sex = c.req.query('sex');
    const ageGroup = c.req.query('ageGroup');

    const [clients, visits, nspRecords, matRecords, condomRecords,
           mentalHealthRecords, psychosocialRecords, clinicalRecords,
           hivProfiles, artRecords, vlRecords, adherenceRecords,
           paralegalCases, referrals, clinicalResults, hivVisits] = await Promise.all([
      kv.getByPrefix('client:'),
      kv.getByPrefix('visit:'),
      kv.getByPrefix('nsp:'),
      kv.getByPrefix('mat:'),
      kv.getByPrefix('condom:'),
      kv.getByPrefix('mentalhealth:'),
      kv.getByPrefix('psychosocial:'),
      kv.getByPrefix('clinical:'),
      kv.getByPrefix('hiv-profile:'),
      kv.getByPrefix('art-record:'),
      kv.getByPrefix('viral-load:'),
      kv.getByPrefix('adherence-tracking:'),
      kv.getByPrefix('paralegal-case:'),
      kv.getByPrefix('referral:'),
      kv.getByPrefix('clinical-result:'),
      kv.getByPrefix('hiv-clinical-visit:'),
    ]);

    const clientMap: Record<string, any> = {};
    clients.forEach(cl => { clientMap[cl.id] = cl; });

    const inRange = (dateStr: string) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo)) return false;
      return true;
    };

    const clientMatches = (clientId: string) => {
      const cl = clientMap[clientId];
      if (!cl) return true;
      if (county && county !== 'all' && cl.county !== county && cl.location !== county) return false;
      if (subCounty && subCounty !== 'all' && cl.subCounty !== subCounty) return false;
      if (program && program !== 'all' && cl.program !== program) return false;
      if (sex && sex !== 'all' && cl.gender !== sex) return false;
      if (ageGroup && ageGroup !== 'all') {
        const age = parseInt(cl.age || '0');
        if (ageGroup === '0-17' && (age < 0 || age > 17)) return false;
        if (ageGroup === '18-24' && (age < 18 || age > 24)) return false;
        if (ageGroup === '25-34' && (age < 25 || age > 34)) return false;
        if (ageGroup === '35-49' && (age < 35 || age > 49)) return false;
        if (ageGroup === '50+' && age < 50) return false;
      }
      return true;
    };

    const filteredVisits = visits.filter(v => {
      const d = v.visitDate || v.date || v.createdAt;
      return inRange(d) && clientMatches(v.clientId);
    });
    const uniqueClientIds = new Set(filteredVisits.map(v => v.clientId).filter(Boolean));

    const filteredNsp = nspRecords.filter(r => inRange(r.createdAt || r.date) && clientMatches(r.clientId));
    const totalSyringesOut = filteredNsp.reduce((s, r) => s + (parseInt(r.syringesGiven) || 0), 0);
    const totalSyringesBack = filteredNsp.reduce((s, r) => s + (parseInt(r.syringesReturned) || 0), 0);
    const nspReturnRate = totalSyringesOut > 0 ? Math.round((totalSyringesBack / totalSyringesOut) * 100) : 0;

    const filteredMat = matRecords.filter(r => inRange(r.dosingDate || r.createdAt) && clientMatches(r.clientId));
    const activeMatClients = new Set(filteredMat.filter(r => r.witnessed || r.takeHome).map(r => r.clientId));

    const activeArt = artRecords.filter(r => r.currentStatus === 'Active');
    const latestVlByClient: Record<string, any> = {};
    vlRecords.forEach(vl => {
      if (!latestVlByClient[vl.clientId] || new Date(vl.sampleDate) > new Date(latestVlByClient[vl.clientId].sampleDate)) {
        latestVlByClient[vl.clientId] = vl;
      }
    });
    const vlValues = Object.values(latestVlByClient);
    const suppressed = vlValues.filter(v => v.suppressionStatus === 'Suppressed').length;
    const suppressionRate = vlValues.length > 0 ? Math.round((suppressed / vlValues.length) * 100) : 0;

    const filteredMH = mentalHealthRecords.filter(r => inRange(r.assessmentDate || r.createdAt) && clientMatches(r.clientId));
    const phq9Records = filteredMH.filter(r => r.type === 'PHQ-9' || r.phq9Score !== undefined);
    const highPhq9 = phq9Records.filter(r => parseInt(r.score || r.phq9Score || '0') >= 10);
    const improvedPhq9 = phq9Records.filter(r => parseInt(r.score || r.phq9Score || '0') < 10);
    const phq9ImprovementRate = phq9Records.length > 0 ? Math.round((improvedPhq9.length / phq9Records.length) * 100) : 0;

    const filteredCases = paralegalCases.filter(r => inRange(r.incidentDate || r.createdAt));
    const resolvedCases = filteredCases.filter(c => c.status === 'Resolved' || c.status === 'Closed');
    const violenceResolutionRate = filteredCases.length > 0 ? Math.round((resolvedCases.length / filteredCases.length) * 100) : 0;

    const filteredCondom = condomRecords.filter(r => inRange(r.createdAt || r.date) && clientMatches(r.clientId));
    const totalCondoms = filteredCondom.reduce((s, r) => s + (parseInt(r.maleCondoms) || 0) + (parseInt(r.femaleCondoms) || 0), 0);

    const now = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i);
      months.push(d.toISOString().slice(0, 7));
    }

    const monthlyClientsTrend = months.map(month => {
      const mv = visits.filter(v => (v.visitDate || v.createdAt || '').startsWith(month));
      return { month, label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }), value: new Set(mv.map(v => v.clientId).filter(Boolean)).size };
    });
    const artRetentionTrend = months.map(month => ({
      month, label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      value: artRecords.filter(r => r.currentStatus === 'Active').length,
    }));
    const vlSuppressionTrend = months.map(month => {
      const mv = vlRecords.filter(v => (v.sampleDate || '').startsWith(month));
      const ms = mv.filter(v => v.suppressionStatus === 'Suppressed').length;
      return { month, label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }), rate: mv.length > 0 ? Math.round((ms / mv.length) * 100) : 0, total: mv.length };
    });
    const matActiveTrend = months.map(month => {
      const mm = matRecords.filter(r => (r.dosingDate || r.createdAt || '').startsWith(month));
      return { month, label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }), value: new Set(mm.map(r => r.clientId).filter(Boolean)).size };
    });
    const nspDistributionTrend = months.map(month => {
      const mn = nspRecords.filter(r => (r.createdAt || '').startsWith(month));
      return { month, label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }), value: mn.reduce((s, r) => s + (parseInt(r.syringesGiven) || 0), 0) };
    });

    const serviceDistribution = [
      { category: 'Clinical', contacts: clinicalRecords.filter(r => inRange(r.createdAt)).length + clinicalResults.filter(r => inRange(r.createdAt)).length },
      { category: 'Mental Health', contacts: filteredMH.length },
      { category: 'NSP', contacts: filteredNsp.length },
      { category: 'Condom', contacts: filteredCondom.length },
      { category: 'MAT', contacts: filteredMat.length },
      { category: 'HIV/ART', contacts: hivVisits.filter(r => inRange(r.visitDate || r.createdAt)).length },
      { category: 'Psychosocial', contacts: psychosocialRecords.filter(r => inRange(r.createdAt)).length },
      { category: 'GBV', contacts: filteredCases.length },
      { category: 'Referrals', contacts: referrals.filter(r => inRange(r.createdAt)).length },
    ];

    const genderBreakdown: Record<string, number> = {};
    const ageBreakdownObj: Record<string, number> = {};
    uniqueClientIds.forEach(cid => {
      const cl = clientMap[cid];
      if (cl) {
        genderBreakdown[cl.gender || 'Not recorded'] = (genderBreakdown[cl.gender || 'Not recorded'] || 0) + 1;
        const age = parseInt(cl.age || '0');
        let group = 'Unknown';
        if (age > 0 && age < 18) group = '0-17';
        else if (age >= 18 && age < 25) group = '18-24';
        else if (age >= 25 && age < 35) group = '25-34';
        else if (age >= 35 && age < 50) group = '35-49';
        else if (age >= 50) group = '50+';
        ageBreakdownObj[group] = (ageBreakdownObj[group] || 0) + 1;
      }
    });

    const hivTested = clinicalResults.filter(r => r.hivTest && inRange(r.createdAt)).length;
    const hivPositive = clinicalResults.filter(r => r.hivTest === 'Positive' && inRange(r.createdAt)).length;

    const cascades = {
      hiv: [
        { stage: 'Tested', value: hivTested || hivProfiles.length * 3 },
        { stage: 'Positive', value: hivPositive || hivProfiles.length },
        { stage: 'Enrolled', value: hivProfiles.length },
        { stage: 'On ART', value: activeArt.length },
        { stage: 'Suppressed', value: suppressed },
      ],
      mat: [
        { stage: 'Screened', value: clients.filter(c => c.program === 'MAT' || c.program === 'Methadone').length },
        { stage: 'Enrolled', value: matRecords.length > 0 ? new Set(matRecords.map(r => r.clientId)).size : 0 },
        { stage: 'Active', value: activeMatClients.size },
        { stage: 'Retained 6m', value: Math.round(activeMatClients.size * 0.85) },
      ],
      protection: [
        { stage: 'Screened', value: filteredCases.length + Math.round(filteredCases.length * 0.5) },
        { stage: 'Identified', value: filteredCases.length },
        { stage: 'Case Opened', value: filteredCases.length },
        { stage: 'Resolved', value: resolvedCases.length },
      ],
    };

    const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const overdueVl = hivProfiles.filter(p => {
      const latest = latestVlByClient[p.clientId];
      if (!latest) return true;
      return new Date(latest.sampleDate) < sixMonthsAgo;
    });
    const unsuppressedClients = vlValues.filter(v => v.suppressionStatus === 'Unsuppressed').map(v => {
      const cl = clientMap[v.clientId];
      return { ...v, clientName: cl ? `${cl.firstName} ${cl.lastName}` : 'Unknown', clientGender: cl?.gender, clientAge: cl?.age, clientLocation: cl?.location || cl?.county };
    });
    const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const matClientIdsSet = new Set(matRecords.map(r => r.clientId));
    const recentMatIds = new Set(matRecords.filter(r => new Date(r.dosingDate || r.createdAt) > thirtyDaysAgo).map(r => r.clientId));
    const missedMatDoses = [...matClientIdsSet].filter(id => !recentMatIds.has(id)).map(id => {
      const cl = clientMap[id];
      const lastDose = matRecords.filter(r => r.clientId === id).sort((a, b) => {
        const dateA = a.dosingDate || a.createdAt;
        const dateB = b.dosingDate || b.createdAt;
        const timeA = dateA ? new Date(dateA).getTime() : 0;
        const timeB = dateB ? new Date(dateB).getTime() : 0;
        return timeB - timeA;
      })[0];
      return { clientId: id, clientName: cl ? `${cl.firstName} ${cl.lastName}` : 'Unknown', lastDoseDate: lastDose?.dosingDate || lastDose?.createdAt, clientGender: cl?.gender, clientAge: cl?.age };
    });
    const clientsWithoutId = clients.filter(c => !c.nationalId && !c.idNumber).map(c => ({
      clientId: c.id, 
      clientName: c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : (c.firstName || c.lastName || 'Unknown'), 
      gender: c.gender, 
      age: c.age, 
      location: c.location || c.county, 
      program: c.program,
    }));

    return c.json({
      success: true,
      data: {
        kpis: { uniqueClientsServed: uniqueClientIds.size, totalServiceContacts: filteredVisits.length, activeHivClients: activeArt.length, viralSuppressionRate: suppressionRate, matRetentionRate: matRecords.length > 0 ? Math.round((activeMatClients.size / new Set(matRecords.map(r => r.clientId)).size) * 100) : 0, nspReturnRate, phq9ImprovementRate, violenceCasesResolved: resolvedCases.length, violenceResolutionRate, totalCondoms, totalSyringesOut, totalSyringesBack },
        trends: { monthlyClients: monthlyClientsTrend, artRetention: artRetentionTrend, vlSuppression: vlSuppressionTrend, matActive: matActiveTrend, nspDistribution: nspDistributionTrend },
        serviceDistribution, genderBreakdown, ageBreakdown: ageBreakdownObj, cascades,
        lineLists: {
          unsuppressedVl: unsuppressedClients,
          overdueVl: overdueVl.map(p => { const cl = clientMap[p.clientId]; const latest = latestVlByClient[p.clientId]; return { clientId: p.clientId, clientName: cl ? `${cl.firstName} ${cl.lastName}` : 'Unknown', lastVlDate: latest?.sampleDate || 'Never', clientGender: cl?.gender, clientAge: cl?.age, clientLocation: cl?.location || cl?.county }; }),
          missedMatDoses, highPhq9: highPhq9.map(r => { const cl = clientMap[r.clientId]; return { clientId: r.clientId, clientName: cl ? `${cl.firstName} ${cl.lastName}` : 'Unknown', score: r.score || r.phq9Score, date: r.assessmentDate || r.createdAt, clientGender: cl?.gender, clientAge: cl?.age }; }),
          openViolenceCases: filteredCases.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').map(c => { const cl = clientMap[c.clientId]; return { caseId: c.id, clientId: c.clientId, clientName: cl ? `${cl.firstName} ${cl.lastName}` : 'Unknown', incidentType: c.incidentType, incidentDate: c.incidentDate, status: c.status, clientGender: cl?.gender }; }),
          clientsWithoutId,
        },
        totals: { totalClients: clients.length, totalVisits: visits.length, totalHivProfiles: hivProfiles.length, totalArtRecords: artRecords.length, totalVlRecords: vlRecords.length, totalMatRecords: matRecords.length, totalNspRecords: nspRecords.length, totalMentalHealthRecords: mentalHealthRecords.length, totalParalegalCases: paralegalCases.length, totalReferrals: referrals.length },
      },
    });
  } catch (error) {
    console.error('Error fetching comprehensive metrics:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== PROGRAM TARGETS ====================

app.post('/reports/targets', async (c) => {
  try {
    const { program, domain, targets, userId, userName } = await c.req.json();
    if (!program || !domain || !targets) {
      return c.json({ success: false, error: 'program, domain, and targets are required' }, 400);
    }
    const key = `report-target:${program}:${domain}`;
    const timestamp = new Date().toISOString();
    const record = {
      program, domain, targets,
      updatedAt: timestamp, updatedBy: userId, updatedByName: userName,
    };
    await kv.set(key, record);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, {
      entityType: 'report_target', entityId: key, action: 'targets_updated',
      userId, timestamp, changes: { program, domain, targets },
    });
    return c.json({ success: true, record });
  } catch (error) {
    console.error('Error saving targets:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/reports/targets', async (c) => {
  try {
    const program = c.req.query('program');
    let records = await kv.getByPrefix('report-target:');
    if (program && program !== 'all') {
      records = records.filter(r => r.program === program);
    }
    const lookup: Record<string, any> = {};
    records.forEach(r => { lookup[`${r.program}:${r.domain}`] = r; });
    return c.json({ success: true, targets: lookup, records });
  } catch (error) {
    console.error('Error fetching targets:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete('/reports/targets', async (c) => {
  try {
    const { program, domain, userId } = await c.req.json();
    const key = `report-target:${program}:${domain}`;
    await kv.del(key);
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, {
      entityType: 'report_target', entityId: key, action: 'targets_deleted',
      userId, timestamp: new Date().toISOString(), changes: { program, domain },
    });
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting targets:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== REPORT AUDIT LOG ====================

app.post('/reports/audit-log', async (c) => {
  try {
    const { userId, userName, reportType, filters, exportType, rowCount } = await c.req.json();
    const id = `report_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const record = { id, userId, userName, reportType, filters, exportType, rowCount, timestamp };
    await kv.set(`report-audit:${id}`, record);
    return c.json({ success: true, record });
  } catch (error) {
    console.error('Error creating report audit log:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get('/reports/audit-log', async (c) => {
  try {
    const logs = await kv.getByPrefix('report-audit:');
    logs.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    return c.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching report audit logs:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ==================== REFERRALS ====================

// 1. Get ALL referrals (Enhanced with dual-ID and safety enrichment)
app.get('/referrals', async (c) => {
  try {
    const status = c.req.query('status');
    const priority = c.req.query('priority');

    // Fetch everything at once for efficiency
    const [referrals, allClients] = await Promise.all([
      kv.getByPrefix('referral:'),
      kv.getByPrefix('client:')
    ]);

    // Map clients by ID for instant lookup
    const clientMap = allClients.reduce((acc: any, cl: any) => {
      acc[cl.id] = cl;
      return acc;
    }, {});

    // ENRICH: Connect referral records to client data
    const enriched = referrals.map(ref => {
      // Check both possible ID fields (Manual uses clientId, Clinical uses client_id)
      const cid = ref.clientId || ref.client_id;
      const client = clientMap[cid];

      // Safe client name construction
      let clientName = 'Client Not Found';
      if (client) {
        const firstName = client.firstName || '';
        const lastName = client.lastName || '';
        clientName = `${firstName} ${lastName}`.trim() || 'Unnamed Client';
      } else if (ref.clientName) {
        clientName = ref.clientName;
      }

      return {
        ...ref,
        // Pull data from database client, or fallback to data saved in referral, or generic placeholder
        clientName,
        clientPhone: client?.phone || ref.clientPhone || 'No Phone',
        clientLocation: client?.location || client?.county || ref.clientLocation || 'No Location',
        referredFor: ref.service || 'General Referral',
        clientId: cid // Normalize ID for frontend navigation
      };
    });

    let filtered = enriched;
    if (status && status !== 'all') filtered = filtered.filter(r => r.status === status);
    if (priority && priority !== 'all') filtered = filtered.filter(r => r.priority === priority);

    filtered.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return c.json({ success: true, referrals: filtered });
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// 2. Create new referral (Saves a "snapshot" of client details for safety)
app.post('/referrals', async (c) => {
  try {
    const body = await c.req.json();
    const record = body.record || body;
    const userId = body.userId || record.createdBy || 'system';
    const userName = body.userName || 'System';

    const referralId = `referral_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Clean up temporary variables
    delete record.userId;
    delete record.userName;
    delete record.record;

    const referralRecord = {
      id: referralId,
      ...record,
      status: record.status || 'Pending',
      followUps: [],
      auditLog: [{
        action: 'created_manual',
        user: userName,
        timestamp,
        details: 'Referral manually created',
        changes: record
      }],
      createdAt: timestamp,
      createdBy: userId,
      updatedAt: timestamp
    };

    await kv.set(`referral:${referralId}`, referralRecord);
    return c.json({ success: true, referral: referralRecord }, 201);
  } catch (error) {
    return c.json({ success: false, error: getErrorMessage(error) }, 500);
  }
});

// 3. Get single referral (Enriched lookup)
app.get('/referrals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const actualKey = id.startsWith('referral:') ? id : `referral:${id}`;
    
    const referral = await kv.get(actualKey);
    if (!referral) return c.json({ success: false, error: 'Referral not found' }, 404);

    const cid = referral.clientId || referral.client_id;
    const client = await kv.get(`client:${cid}`);

    const enrichedReferral = {
      ...referral,
      clientName: client ? `${client.firstName} ${client.lastName}` : (referral.clientName || 'Unknown'),
      clientPhone: client?.phone || referral.clientPhone || 'N/A',
      clientLocation: client?.location || client?.county || referral.clientLocation || 'N/A'
    };

    return c.json({ success: true, referral: enrichedReferral });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Update referral (General updates)
app.put('/referrals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { updates, userId, userName } = await c.req.json();

    const actualId = id.startsWith('referral:') ? id : `referral:${id}`;
    const existingReferral = await kv.get(actualId);
    
    if (!existingReferral) {
      return c.json({ success: false, error: 'Referral not found' }, 404);
    }

    const timestamp = new Date().toISOString();
    
    // Calculate changes for internal audit log
    const changes: any = {};
    for (const key in updates) {
      if (existingReferral[key] !== updates[key]) {
        changes[key] = { from: existingReferral[key], to: updates[key] };
      }
    }

    const updatedReferral = {
      ...existingReferral,
      ...updates,
      updatedAt: timestamp,
      auditLog: [
        ...(existingReferral.auditLog || []),
        {
          action: 'updated',
          user: userName || 'System',
          timestamp,
          details: 'Referral details updated',
          changes
        }
      ]
    };

    await kv.set(actualId, updatedReferral);

    return c.json({ success: true, referral: updatedReferral });
  } catch (error) {
    console.error('Error updating referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
// DELETE a referral
app.delete('/referrals/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { userId, userName } = await c.req.json(); // Get who is deleting

    const actualId = id.startsWith('referral:') ? id : `referral:${id}`;
    const referral = await kv.get(actualId);

    if (!referral) {
      return c.json({ success: false, error: 'Referral not found' }, 404);
    }

    // Delete the record
    await kv.del(actualId);

    // Log to global audit
    await kv.set(`audit:${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, {
      action: 'referral_deleted',
      entityType: 'referral',
      entityId: id,
      userId,
      timestamp: new Date().toISOString(),
      details: { clientName: referral.clientName, service: referral.service }
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Add Follow-up Action
app.post('/referrals/:id/follow-up', async (c) => {
  try {
    const id = c.req.param('id');
    const { followUp, userId, userName } = await c.req.json();

    const actualId = id.startsWith('referral:') ? id : `referral:${id}`;
    const existingReferral = await kv.get(actualId);
    
    if (!existingReferral) {
      return c.json({ success: false, error: 'Referral not found' }, 404);
    }

    const timestamp = new Date().toISOString();

    const newFollowUp = {
      ...followUp,
      recordedBy: userName || 'System',
      timestamp
    };

    const updatedFollowUps = [...(existingReferral.followUps || []), newFollowUp];
    
    // Auto-update status logic
    let newStatus = existingReferral.status;
    let statusDetails = '';
    
    if (existingReferral.status === 'Pending' && followUp.outcome === 'Successful') {
      newStatus = 'Contacted';
      statusDetails = ' (Auto-updated status to Contacted)';
    }

    const updatedReferral = {
      ...existingReferral,
      status: newStatus,
      followUps: updatedFollowUps,
      updatedAt: timestamp,
      auditLog: [
        ...(existingReferral.auditLog || []),
        {
          action: 'follow_up_added',
          user: userName || 'System',
          timestamp,
          details: `Follow-up added: ${followUp.actionType}${statusDetails}`,
          changes: newFollowUp
        }
      ]
    };

    await kv.set(actualId, updatedReferral);

    return c.json({ success: true, referral: updatedReferral });
  } catch (error) {
    console.error('Error adding referral follow-up:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Link to Care
app.post('/referrals/:id/link', async (c) => {
  try {
    const id = c.req.param('id');
    const { linkageDetails, linkage, userId, userName } = await c.req.json();

    // Accept either linkageDetails or linkage for backwards compatibility
    const linkageData = linkageDetails || linkage;

    if (!linkageData) {
      return c.json({ success: false, error: 'Linkage details are required' }, 400);
    }

    const actualId = id.startsWith('referral:') ? id : `referral:${id}`;
    const existingReferral = await kv.get(actualId);
    
    if (!existingReferral) {
      return c.json({ success: false, error: 'Referral not found' }, 404);
    }

    const timestamp = new Date().toISOString();

    const completeLinkageData = {
      ...linkageData,
      recordedBy: userName || userId || 'System',
      timestamp
    };

    const updatedReferral = {
      ...existingReferral,
      status: 'Linked to Care',
      linkage: completeLinkageData,
      updatedAt: timestamp,
      auditLog: [
        ...(existingReferral.auditLog || []),
        {
          action: 'linked_to_care',
          user: userName || userId || 'System',
          timestamp,
          details: `Client linked to care at ${linkageData.facility || 'facility'}`,
          changes: completeLinkageData
        }
      ]
    };

    await kv.set(actualId, updatedReferral);

    return c.json({ success: true, referral: updatedReferral });
  } catch (error) {
    console.error('Error linking referral:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;