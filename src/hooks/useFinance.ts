import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const useFinanceData = (organizationId?: string, selectedDate: Date = new Date()) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['finance', organizationId, user?.id, selectedDate.toISOString().substring(0, 7)],
    queryFn: async () => {
      if (!organizationId || !user?.id) return null;

      const start = startOfMonth(selectedDate).toISOString();
      const end = endOfMonth(selectedDate).toISOString();
      const lastMonth = subMonths(selectedDate, 1);
      const lastStart = startOfMonth(lastMonth).toISOString();
      const lastEnd = endOfMonth(lastMonth).toISOString();

      const [{ data: appts }, { data: pmts }, { data: cfg }, { data: lastPmts }, { data: lastAppts }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, patient_name, start_time, fee, payment_status, status, stripe_checkout_id, commission_percentage')
          .eq('organization_id', organizationId)
          .gte('start_time', start)
          .lte('start_time', end)
          .order('start_time', { ascending: false }),
        supabase
          .from('payments')
          .select('*, invoice_url, invoice_id')
          .eq('organization_id', organizationId)
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('porcentaje_consultorio, stripe_fee_percent').eq('id', user.id).maybeSingle(),
        supabase
          .from('payments')
          .select('id, amount, status, method')
          .eq('organization_id', organizationId)
          .eq('status', 'paid')
          .gte('created_at', lastStart)
          .lte('created_at', lastEnd),
        supabase
          .from('appointments')
          .select('id, fee, status, commission_percentage')
          .eq('organization_id', organizationId)
          .gte('start_time', lastStart)
          .lte('start_time', lastEnd),
      ]);

      return {
        appointments: appts || [],
        payments: pmts || [],
        feeConfig: cfg || { porcentaje_consultorio: 30, stripe_fee_percent: 5.14 },
        lastMonthPayments: lastPmts || [],
        lastMonthAppointments: lastAppts || [],
      };
    },
    enabled: !!organizationId && !!user?.id,
  });
};
