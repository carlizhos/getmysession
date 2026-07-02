import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SessionNote } from '@/types';
import { toast } from 'sonner';

export const useNotes = (patientId: string | null) => {
  return useQuery({
    queryKey: ['session_notes', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('patient_id', patientId)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) {
        toast.error('Error al cargar notas: ' + error.message);
        throw error;
      }
      return (data as SessionNote[]) ?? [];
    },
    enabled: !!patientId,
  });
};

export const useNoteTemplates = () => {
  return useQuery({
    queryKey: ['note_templates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('note_templates')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${user.id}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useProfessionalProfile = () => {
  return useQuery({
    queryKey: ['professional_profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, prefix, cedulas, signature_data, logo_data')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    }
  });
};

export const useMutateNotes = () => {
  const queryClient = useQueryClient();

  const createNote = useMutation({
    mutationFn: async (payload: any) => {
      if (!navigator.onLine) {
        console.warn('Network offline, saving to local queue...');
        const pending = JSON.parse(localStorage.getItem('saudade_offline_notes') || '[]');
        pending.push({ ...payload, _offlineId: Date.now().toString() });
        localStorage.setItem('saudade_offline_notes', JSON.stringify(pending));
        throw new Error('OFFLINE_SAVED');
      }

      const { error } = await supabase.from('session_notes').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota clínica guardada correctamente');
      queryClient.invalidateQueries({ queryKey: ['session_notes'] });
    },
    onError: (error: any) => {
      if (error.message === 'OFFLINE_SAVED') {
        toast.info('Sin conexión a internet. La nota se guardó localmente y se sincronizará cuando regrese la red.', { duration: 6000 });
        queryClient.invalidateQueries({ queryKey: ['session_notes'] });
      } else {
        toast.error('Error al guardar la nota: ' + error.message);
      }
    }
  });

  const archiveNote = useMutation({
    mutationFn: async ({ noteId, userId }: { noteId: string, userId?: string }) => {
      const { error } = await supabase
        .from('session_notes')
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota archivada (retenida 5 años según NOM-024)');
      queryClient.invalidateQueries({ queryKey: ['session_notes'] });
    },
    onError: (error: any) => {
      toast.error('Error al archivar: ' + error.message);
    }
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, payload }: { noteId: string, payload: any }) => {
      const { error } = await supabase
        .from('session_notes')
        .update(payload)
        .eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota actualizada');
      queryClient.invalidateQueries({ queryKey: ['session_notes'] });
    },
    onError: (error: any) => {
      toast.error('Error al guardar cambios: ' + error.message);
    }
  });

  return { createNote, archiveNote, updateNote };
};
