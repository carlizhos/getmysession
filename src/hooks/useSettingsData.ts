import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Cedula, Curso, Service, BookingQuestion, NoteTemplate } from '@/types';

export interface ProfileData {
  prefix: string;
  full_name: string;
  avatar_url: string | null;
  institucion_formadora: string;
  telefono_profesional: string;
  porcentaje_consultorio: number;
  stripe_fee_percent: number;
  slug: string;
  is_public: boolean;
  signature_data: string | null;
  logo_data: string | null;
  bio: string;
  experience_years: number;
  social_links: Record<string, string>;
  reschedule_policy_hours: number;
  google_refresh_token?: string | null;
  microsoft_refresh_token?: string | null;
  zoom_refresh_token?: string | null;
  stripe_account_id?: string | null;
  stripe_account_status?: string | null;
  horario_atencion?: any;
  notification_settings?: any;
}

export function useProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('prefix, full_name, avatar_url, cedulas, cursos, institucion_formadora, telefono_profesional, porcentaje_consultorio, stripe_fee_percent, horario_atencion, notification_settings, slug, is_public, google_refresh_token, microsoft_refresh_token, zoom_refresh_token, stripe_account_id, stripe_account_status, signature_data, logo_data, bio, experience_years, social_links, reschedule_policy_hours')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-profile', variables.userId] });
    },
  });
}

export function useServicesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings-services', userId],
    queryFn: async () => {
      if (!userId) return [] as Service[];
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: !!userId,
  });
}

export function useSaveServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, organizationId, service }: { userId: string; organizationId: string; service: Service }) => {
      const payload = {
        ...service,
        user_id: userId,
        organization_id: organizationId,
      };

      if (service.id) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert([payload]);
        if (error) throw error;
      }
      return service;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-services', variables.userId] });
    },
  });
}

export function useDeleteServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-services', variables.userId] });
    },
  });
}

export function useBookingQuestionsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings-questions', userId],
    queryFn: async () => {
      if (!userId) return [] as BookingQuestion[];
      const { data, error } = await supabase
        .from('booking_questions')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as BookingQuestion[];
    },
    enabled: !!userId,
  });
}

export function useSaveBookingQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, organizationId, question }: { userId: string; organizationId: string; question: BookingQuestion }) => {
      const payload = {
        ...question,
        user_id: userId,
        organization_id: organizationId,
      };

      if (question.id) {
        const { error } = await supabase
          .from('booking_questions')
          .update(payload)
          .eq('id', question.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('booking_questions')
          .insert([payload]);
        if (error) throw error;
      }
      return question;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-questions', variables.userId] });
    },
  });
}

export function useDeleteBookingQuestionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
      const { error } = await supabase
        .from('booking_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-questions', variables.userId] });
    },
  });
}

export function useNoteTemplatesQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['settings-note-templates', userId],
    queryFn: async () => {
      if (!userId) return [] as NoteTemplate[];
      const { data, error } = await supabase
        .from('note_templates')
        .select('*')
        .or(`is_system.eq.true,user_id.eq.${userId}`)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as NoteTemplate[];
    },
    enabled: !!userId,
  });
}

export function useSaveNoteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, organizationId, template }: { userId: string; organizationId: string; template: NoteTemplate }) => {
      if (template.id) {
        const { error } = await supabase
          .from('note_templates')
          .update({
            name: template.name,
            description: template.description,
            sections: template.sections,
            section_labels: template.section_labels,
            color: template.color,
          })
          .eq('id', template.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('note_templates')
          .insert({
            name: template.name,
            description: template.description,
            sections: template.sections,
            section_labels: template.section_labels,
            color: template.color,
            is_system: false,
            user_id: userId,
            organization_id: organizationId,
          });
        if (error) throw error;
      }
      return template;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-note-templates', variables.userId] });
    },
  });
}

export function useDeleteNoteTemplateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, id }: { userId: string; id: string }) => {
      const { error } = await supabase
        .from('note_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settings-note-templates', variables.userId] });
    },
  });
}
