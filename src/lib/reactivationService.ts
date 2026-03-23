import { supabase } from './supabase';
import { logActivity } from './activityLogger';

// Bandera para evitar ejecuciones simultáneas si el componente se monta/desmonta rápido (React StrictMode)
let isChecking = false;

export const checkReactivations = async (userId: string, organizationId: string) => {
    if (!userId || !organizationId || isChecking) return;
    isChecking = true;

    try {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(now.getDate() - 15);

        // 1. Obtener todos los pacientes del usuario
        const { data: patients, error: patientsError } = await supabase
            .from('patients')
            .select('id, name')
            .eq('organization_id', organizationId);
            
        if (patientsError || !patients || patients.length === 0) return;

        // 2. Obtener las citas de interés del usuario para analizar
        // Solo necesitamos 'patient_id', 'start_time', 'status'
        // Nos traemos todo pero solo asociado a este user
        // Nota: en producción con cientos de citas, se podría hacer vía RPC o filtrar mejor, 
        // pero para volúmenes promedio de consultas, esto es muy rápido vía Supabase de forma asíncrona.
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('patient_id, start_time, status')
            .eq('organization_id', organizationId);
            
        if (apptError || !appointments) return;

        // 3. Obtener logs recientes de reactivación (últimos 15 días) para evitar SPAM
        const { data: recentLogs, error: logsError } = await supabase
            .from('activity_logs')
            .select('metadata')
            .eq('organization_id', organizationId)
            .eq('type', 'patient_reactivation')
            .gte('created_at', fifteenDaysAgo.toISOString());
            
        // Extraer los patient_ids que ya fueron alertados recientemente
        const recentlyAlertedPatientIds = new Set(
            (recentLogs || []).map(log => log.metadata?.patient_id).filter(Boolean)
        );

        // 4. Analizar cada paciente
        for (const patient of patients) {
            // Si ya le mandamos notificación hace menos de 15 días, saltarlo
            if (recentlyAlertedPatientIds.has(patient.id)) continue;

            const patientAppts = appointments.filter(a => a.patient_id === patient.id);
            if (patientAppts.length === 0) continue; // Si nunca ha tenido cita, no hay que "reactivarlo" aún

            // Separar citas pasadas completadas y citas futuras no canceladas
            const pastAppts = patientAppts.filter(a => new Date(a.start_time) < now && a.status === 'completed');
            const futureAppts = patientAppts.filter(a => new Date(a.start_time) >= now && a.status !== 'cancelled');

            // Si tiene citas en el futuro, está activo, no necesita reactivación
            if (futureAppts.length > 0) continue;

            // Si no tiene citas futuras, checamos cuándo fue su última cita completada
            if (pastAppts.length > 0) {
                // Ordenar pasadas por fecha descendente (la más reciente primero)
                const sortedPast = pastAppts.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
                const lastSessionDate = new Date(sortedPast[0].start_time);

                // Si esa fecha fue hace más de 30 días
                if (lastSessionDate < thirtyDaysAgo) {
                    // Generar alerta de reactivación silenciosamente
                    await logActivity({
                        profile_id: userId,
                        type: 'patient_reactivation',
                        title: 'Seguimiento de Paciente',
                        description: `${patient.name} no ha tenido sesiones en más de 30 días y no tiene próximas citas. Considera contactarlo para darle seguimiento.`,
                        metadata: { patient_id: patient.id },
                        organization_id: organizationId
                    });
                }
            }
        }
    } catch (err) {
        console.error('Error al verificar reactivaciones:', err);
    } finally {
        isChecking = false;
    }
};
