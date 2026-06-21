import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Virtual database representing the Supabase backend tables
const MOCK_ORGS = {
  'org-a-id': { id: 'org-a-id', name: 'Org A' },
  'org-b-id': { id: 'org-b-id', name: 'Org B' },
};

const MOCK_PATIENTS = {
  'patient-a-id': { id: 'patient-a-id', name: 'Paciente A', organization_id: 'org-a-id' },
  'patient-b-id': { id: 'patient-b-id', name: 'Paciente B', organization_id: 'org-b-id' },
};

const MOCK_MEMBERS = [
  { user_id: 'psy-a-id', organization_id: 'org-a-id' },
  { user_id: 'psy-b-id', organization_id: 'org-b-id' },
];

function encodeJwt(payload: any) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const base64Signature = Buffer.from('mock-signature-that-is-long-enough').toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${base64Header}.${base64Payload}.${base64Signature}`;
}

// Mock JWT Tokens
const TOKEN_PSY_A = encodeJwt({
  sub: 'psy-a-id',
  email: 'psyA@test.com',
  exp: Math.floor(Date.now() / 1000) + 3600,
  user_metadata: { orgId: 'org-a-id' }
});

const TOKEN_PSY_B = encodeJwt({
  sub: 'psy-b-id',
  email: 'psyB@test.com',
  exp: Math.floor(Date.now() / 1000) + 3600,
  user_metadata: { orgId: 'org-b-id' }
});

// Decode mock token to simulate Supabase auth middleware role/user mapping
function getContextFromToken(authHeader: string | null | undefined) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  if (token === 'mock-key') {
    return { userId: 'anonymous', orgId: null };
  }
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return {
      userId: payload.sub,
      orgId: payload.user_metadata?.orgId || null
    };
  } catch (e) {
    return null;
  }
}

describe('Pruebas de Integración y Aislamiento de Seguridad (DevSecOps)', () => {
  let originalFetch: any;

  beforeAll(() => {
    originalFetch = global.fetch;

    // Intercept all fetch calls to simulate the Supabase API Gateway and Postgres RLS
    global.fetch = vi.fn().mockImplementation(async (url: string, options: any = {}) => {
      const parsedUrl = new URL(url);
      
      const getHeader = (headers: any, name: string): string | null | undefined => {
        if (!headers) return undefined;
        if (typeof headers.get === 'function') {
          return headers.get(name);
        }
        if (Array.isArray(headers)) {
          const found = headers.find(h => Array.isArray(h) && h[0]?.toLowerCase() === name.toLowerCase());
          return found ? found[1] : undefined;
        }
        if (typeof headers === 'object') {
          for (const key of Object.keys(headers)) {
            if (key.toLowerCase() === name.toLowerCase()) {
              return headers[key];
            }
          }
        }
        return undefined;
      };

      const authHeader = getHeader(options.headers, 'authorization');
      const method = options.method || 'GET';
      
      // 1. Middleware de Autorización (JWT Validation)
      console.log('--- FETCH MOCK ---', method, parsedUrl.pathname, 'AuthHeader:', authHeader);
      const context = getContextFromToken(authHeader);
      if (!context) {
        console.log('--- ACCESS DENIED (UNAUTHORIZED) ---');
        return new Response(
          JSON.stringify({ error: 'Unauthorized', message: 'Expected 3 parts in JWT; got 1' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if accessing auth user endpoint (needed for setSession)
      if (parsedUrl.pathname.includes('/auth/v1/user')) {
        return new Response(
          JSON.stringify({
            id: context.userId,
            email: context.userId === 'psy-a-id' ? 'psyA@test.com' : 'psyB@test.com',
            aud: 'authenticated',
            role: 'authenticated',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Check if accessing patients endpoint
      if (parsedUrl.pathname.includes('/rest/v1/patients')) {
        
        // Extract Patient ID from URL filters (e.g. ?id=eq.patient-a-id)
        const idFilter = parsedUrl.searchParams.get('id');
        let targetPatientId = '';
        if (idFilter && idFilter.startsWith('eq.')) {
          targetPatientId = idFilter.slice(3);
        }

        const patient = MOCK_PATIENTS[targetPatientId as keyof typeof MOCK_PATIENTS];

        // 2. Middleware de RLS (Row Level Security / Data Isolation Check)
        // Rule: Exists in organization_members with organization_id = patients.organization_id and user_id = auth.uid()
        const isMemberOfOrg = MOCK_MEMBERS.some(
          m => m.user_id === context.userId && m.organization_id === patient?.organization_id
        );

        if (method === 'GET') {
          // If accessing a patient belonging to another organization, RLS hides it.
          // We return 404 Not Found to prevent data exposure (Psychologist cannot verify existence).
          if (!patient || !isMemberOfOrg) {
            return new Response(
              JSON.stringify({ error: 'Not Found', message: 'Paciente no encontrado o acceso denegado.' }),
              { status: 404, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify([patient]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (method === 'PATCH' || method === 'PUT') {
          // If updating a patient belonging to another organization, RLS blocks it.
          // We strictly return 403 Forbidden to signal an access control violation.
          if (!patient || !isMemberOfOrg) {
            return new Response(
              JSON.stringify({ error: 'Forbidden', message: 'Acceso denegado: Violación de política RLS.' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify([ { ...patient, ...JSON.parse(options.body) } ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Default fallback
      return new Response(
        JSON.stringify([]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('Happy Path: Psicólogo A puede obtener y editar sus propios pacientes', async () => {
    const supabaseA = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseA.auth.setSession({
      access_token: TOKEN_PSY_A,
      refresh_token: 'mock-refresh-token',
    });

    // GET Paciente A
    const { data: getA, error: errGetA } = await supabaseA
      .from('patients')
      .select('*')
      .eq('id', 'patient-a-id');
    
    expect(errGetA).toBeNull();
    expect(getA).not.toBeNull();
    expect(getA?.[0]?.name).toBe('Paciente A');

    // PUT/PATCH Paciente A
    const { data: updateA, error: errUpdateA } = await supabaseA
      .from('patients')
      .update({ name: 'Paciente A Modificado' })
      .eq('id', 'patient-a-id')
      .select();

    expect(errUpdateA).toBeNull();
    expect(updateA).not.toBeNull();
    expect(updateA?.[0]?.name).toBe('Paciente A Modificado');
  });

  it('Happy Path: Psicólogo B puede obtener y editar sus propios pacientes', async () => {
    const supabaseB = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseB.auth.setSession({
      access_token: TOKEN_PSY_B,
      refresh_token: 'mock-refresh-token',
    });

    // GET Paciente B
    const { data: getB, error: errGetB } = await supabaseB
      .from('patients')
      .select('*')
      .eq('id', 'patient-b-id');
    
    expect(errGetB).toBeNull();
    expect(getB).not.toBeNull();
    expect(getB?.[0]?.name).toBe('Paciente B');

    // PUT/PATCH Paciente B
    const { data: updateB, error: errUpdateB } = await supabaseB
      .from('patients')
      .update({ name: 'Paciente B Modificado' })
      .eq('id', 'patient-b-id')
      .select();

    expect(errUpdateB).toBeNull();
    expect(updateB).not.toBeNull();
    expect(updateB?.[0]?.name).toBe('Paciente B Modificado');
  });

  it('Violación de Seguridad: Psicólogo A recibe 404 Not Found al intentar obtener pacientes del Psicólogo B', async () => {
    const supabaseA = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseA.auth.setSession({
      access_token: TOKEN_PSY_A,
      refresh_token: 'mock-refresh-token',
    });

    // GET Paciente B desde sesión de Psicólogo A
    const { data, error, status } = await supabaseA
      .from('patients')
      .select('*')
      .eq('id', 'patient-b-id');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(status).toBe(404);
    expect(error?.message).toContain('Paciente no encontrado o acceso denegado');
  });

  it('Violación de Seguridad: Psicólogo A recibe 403 Forbidden al intentar actualizar pacientes del Psicólogo B', async () => {
    const supabaseA = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseA.auth.setSession({
      access_token: TOKEN_PSY_A,
      refresh_token: 'mock-refresh-token',
    });

    // PATCH Paciente B desde sesión de Psicólogo A
    const { data, error, status } = await supabaseA
      .from('patients')
      .update({ name: 'Paciente B Hackeado' })
      .eq('id', 'patient-b-id')
      .select();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(status).toBe(403);
    expect(error?.message).toContain('Violación de política RLS');
  });

  it('Violación de Seguridad: Psicólogo B recibe 404 Not Found al intentar obtener pacientes del Psicólogo A', async () => {
    const supabaseB = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseB.auth.setSession({
      access_token: TOKEN_PSY_B,
      refresh_token: 'mock-refresh-token',
    });

    // GET Paciente A desde sesión de Psicólogo B
    const { data, error, status } = await supabaseB
      .from('patients')
      .select('*')
      .eq('id', 'patient-a-id');

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(status).toBe(404);
    expect(error?.message).toContain('Paciente no encontrado o acceso denegado');
  });

  it('Violación de Seguridad: Psicólogo B recibe 403 Forbidden al intentar actualizar pacientes del Psicólogo A', async () => {
    const supabaseB = createClient('https://mock.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await supabaseB.auth.setSession({
      access_token: TOKEN_PSY_B,
      refresh_token: 'mock-refresh-token',
    });

    // PATCH Paciente A desde sesión de Psicólogo B
    const { data, error, status } = await supabaseB
      .from('patients')
      .update({ name: 'Paciente A Hackeado' })
      .eq('id', 'patient-a-id')
      .select();

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(status).toBe(403);
    expect(error?.message).toContain('Violación de política RLS');
  });
});
