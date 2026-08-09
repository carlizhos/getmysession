import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { parseISO, differenceInMinutes, isAfter, format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ActivityType } from '@/lib/activityLogger';

export interface SmartActivityLog {
  id: string;
  type: ActivityType | 'system';
  title: string;
  description: string;
  read: boolean;
  created_at: string;
  metadata?: any;
}

export const useSmartAlerts = () => {
  const { user } = useAuth();
  const [smartAlerts, setSmartAlerts] = useState<SmartActivityLog[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('getmysession_dismissed_alerts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('getmysession_dismissed_alerts', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  useEffect(() => {
    if (!user) return;

    const generateAlerts = async () => {
      // Definir rangos de tiempo
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      const pastWeek = startOfDay(subDays(new Date(), 7)).toISOString();

      // Consultar datos relevantes
      const [appointmentsRes, notesRes, paymentsRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('user_id', user.id).gte('start_time', todayStart).lte('start_time', todayEnd),
        supabase.from('session_notes').select('id, patient_id, date').eq('user_id', user.id).gte('date', todayStart).lte('date', todayEnd),
        supabase.from('payments').select('*').eq('user_id', user.id).eq('status', 'pending').gte('created_at', pastWeek)
      ]);

      const appointments = appointmentsRes.data || [];
      const notes = notesRes.data || [];
      const pendingPayments = paymentsRes.data || [];

      const now = new Date();
      const newAlerts: SmartActivityLog[] = [];

      // 1. Alerta Inminente (Citas próximas en <= 15 mins)
      appointments.forEach((apt) => {
        if (apt.status !== 'cancelled') {
          const aptStart = parseISO(apt.start_time);
          const diffMins = differenceInMinutes(aptStart, now);
          
          if (diffMins > 0 && diffMins <= 15) {
            const id = `smart-upcoming-${apt.id}`;
            if (!dismissedAlerts.has(id)) {
              newAlerts.push({
                id,
                type: 'system',
                title: `Cita inminente: ${apt.patient_name || 'Paciente'}`,
                description: `Tu sesión comienza en ${diffMins} minutos. ¡Prepárate!`,
                read: false,
                created_at: new Date().toISOString(),
                metadata: { isSmartAlert: true, icon: 'zap' }
              });
            }
          }
        }
      });

      // 2. Resumen del Día (Daily Digest)
      const attendedCount = appointments.filter(a => a.status === 'attended' || a.status === 'completed').length;
      const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;
      
      const lastApt = [...appointments].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
      
      // Si ya pasó la última cita del día
      if (appointments.length > 0 && lastApt && isAfter(now, parseISO(lastApt.end_time))) {
        const notesMissing = Math.max(0, attendedCount - notes.length);
        const totalPending = pendingPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
        const id = `smart-digest-${format(now, 'yyyy-MM-dd')}`;
        if (!dismissedAlerts.has(id)) {
          newAlerts.push({
            id,
            type: 'system',
            title: 'Tu Resumen del Día 🌙',
            description: `Hoy tuviste ${appointments.length} citas programadas (${cancelledCount} canceladas). Te falta escribir ${notesMissing} notas clínicas. Tienes $${totalPending} MXN en cobros pendientes recientes.`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: { isSmartAlert: true, icon: 'sparkles' }
          });
        }
      }

      // 3. Pagos Rezagados
      const oldPendingPayments = pendingPayments.filter(p => differenceInMinutes(now, parseISO(p.created_at)) > 24 * 60);
      if (oldPendingPayments.length > 0) {
        const totalOld = oldPendingPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const id = `smart-payment-warning-${format(now, 'yyyy-MM-dd')}`;
        if (!dismissedAlerts.has(id)) {
          newAlerts.push({
            id,
            type: 'system',
            title: 'Cobros Rezagados ⚠️',
            description: `Tienes ${oldPendingPayments.length} pagos pendientes de días anteriores sumando $${totalOld} MXN. ¡Asegúrate de enviar recordatorios!`,
            read: false,
            created_at: new Date().toISOString(),
            metadata: { isSmartAlert: true, icon: 'alert' }
          });
        }
      }

      setSmartAlerts(newAlerts);
    };

    generateAlerts();
    const interval = setInterval(generateAlerts, 60000); // Evaluar cada minuto
    return () => clearInterval(interval);
  }, [user, dismissedAlerts]);

  return { smartAlerts, dismissAlert };
};
