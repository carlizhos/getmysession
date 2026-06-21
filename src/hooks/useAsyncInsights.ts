import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { AsyncMessage } from '@/types';

export const useAsyncInsights = (patientId: string | undefined) => {
  const query = useQuery<AsyncMessage[]>({
    queryKey: ['async-insights', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('async_messages')
        .select('*')
        .eq('patient_id', patientId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('ai_processed_at', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as AsyncMessage[]) || [];
    },
    enabled: !!patientId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const redFlagCount = query.data?.filter(m => m.ai_red_flag).length ?? 0;
  const thisWeek = query.data?.filter(m => {
    const created = new Date(m.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  }) ?? [];

  return {
    insights: query.data ?? [],
    thisWeekInsights: thisWeek,
    redFlagCount,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
