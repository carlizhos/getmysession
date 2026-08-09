import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useOfflineSync = () => {
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🌐 Conexión restaurada, intentando sincronizar notas...');
      
      const savedNotesStr = localStorage.getItem('getmysession_offline_notes');
      if (!savedNotesStr) return;

      try {
        const pendingNotes = JSON.parse(savedNotesStr);
        if (!Array.isArray(pendingNotes) || pendingNotes.length === 0) return;

        toast.loading(`Sincronizando ${pendingNotes.length} nota(s) offline...`, { id: 'sync-notes' });

        // Remover propiedades temporales (_offlineId) antes de subir
        const payload = pendingNotes.map(note => {
          const { _offlineId, ...rest } = note;
          return rest;
        });

        const { error } = await supabase.from('session_notes').insert(payload);

        if (error) {
          throw error;
        }

        // Si tuvo éxito, limpiar el localStorage
        localStorage.removeItem('getmysession_offline_notes');
        toast.success(`Se sincronizaron ${pendingNotes.length} nota(s) guardada(s) sin conexión.`, { id: 'sync-notes' });
      } catch (err: any) {
        console.error('Error al sincronizar notas offline:', err);
        toast.error('No se pudieron sincronizar las notas offline. Reintentando más tarde.', { id: 'sync-notes' });
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
};
