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
  metadata?: Record<string, any>;
}

export const logActivity = async ({
  profile_id,
  type,
  title,
  description,
  metadata
}: LogActivityParams) => {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      profile_id,
      type,
      title,
      description,
      metadata
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
