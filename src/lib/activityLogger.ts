import { supabase } from './supabase';

export type ActivityType = 
  | 'appointment_created'
  | 'appointment_rescheduled'
  | 'appointment_cancelled'
  | 'payment_received'
  | 'patient_created'
  | 'patient_reactivation'
  | 'system_alert';

interface LogActivityParams {
  profile_id: string; // The user who should receive/see the notification
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  organization_id?: string;
}

export const logActivity = async ({
  profile_id,
  type,
  title,
  description,
  metadata,
  organization_id
}: LogActivityParams) => {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      profile_id,
      type,
      title,
      description,
      metadata,
      organization_id,
    });

    if (error) {
      console.error('Error logging activity:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Failed to log activity', err);
    return false;
  }
};
