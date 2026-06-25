import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SessionNote, PatientTest } from '@/types';

export function usePatientDetails(patientId: string | null, organizationId: string | undefined) {
  return useQuery({
    queryKey: ['patient-details', patientId, organizationId],
    queryFn: async () => {
      if (!patientId || !organizationId) {
        return {
          notes: [] as SessionNote[],
          tests: [] as PatientTest[],
          payments: [] as any[],
          consents: [] as any[],
          documents: [] as any[],
        };
      }

      // Fetch all in parallel
      const [notesRes, testsRes, paymentsRes, consentsRes, docsRes] = await Promise.all([
        // 1. Session Notes
        supabase
          .from('session_notes')
          .select(
            'id, date, session_number, agenda, mood, created_at, cie10_code, cie10_description, diagnostico_principal, bridge, transcript_summary'
          )
          .eq('patient_id', patientId)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('date', { ascending: false }),

        // 2. Patient Tests
        supabase
          .from('patient_tests')
          .select('id, test_type, status, score, interpretation, created_at, completed_at, answers')
          .eq('patient_id', patientId)
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),

        // 3. Payments
        supabase
          .from('payments')
          .select(`
              id, amount, method, status, paid_at, created_at,
              appointments!inner (
                  patient_id,
                  start_time,
                  organization_id
              )
          `)
          .eq('appointments.patient_id', patientId)
          .eq('appointments.organization_id', organizationId)
          .order('created_at', { ascending: false }),

        // 4. Consents
        supabase
          .from('consent_forms')
          .select('*')
          .eq('patient_id', patientId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),

        // 5. Documents
        supabase
          .from('patient_documents')
          .select('*')
          .eq('patient_id', patientId)
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ]);

      if (notesRes.error) throw notesRes.error;
      if (testsRes.error) throw testsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;
      if (consentsRes.error) throw consentsRes.error;
      if (docsRes.error) throw docsRes.error;

      return {
        notes: (notesRes.data as SessionNote[]) || [],
        tests: (testsRes.data as PatientTest[]) || [],
        payments: paymentsRes.data || [],
        consents: consentsRes.data || [],
        documents: docsRes.data || [],
      };
    },
    enabled: !!patientId && !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache validity
  });
}
