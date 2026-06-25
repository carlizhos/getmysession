import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Appointment } from '@/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface DayConfig {
  activo: boolean;
  inicio: string;
  fin: string;
}

export interface ScheduleConfig {
  dias: Record<number, DayConfig>;
  dias_no_laborables: string[];
  fin?: string;
}

export const useSchedule = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['schedule', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('horario_atencion')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return (data?.horario_atencion as unknown as ScheduleConfig) || null;
    },
    enabled: !!user,
  });
};

export const useAppointments = (organizationId?: string) => {
  return useQuery({
    queryKey: ['appointments', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('start_time', { ascending: true });
        
      if (error) {
        toast.error('Error al cargar agenda: ' + error.message);
        throw error;
      }
      return (data as Appointment[]) || [];
    },
    enabled: !!organizationId,
  });
};

export const useMutateAppointments = () => {
  const queryClient = useQueryClient();

  const cancelAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cita cancelada correctamente');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (error: any) => {
      toast.error('Error al cancelar la cita: ' + error.message);
    }
  });

  return { cancelAppointment };
};
