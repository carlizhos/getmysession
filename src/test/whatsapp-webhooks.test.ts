import { describe, it, expect } from 'vitest';

// ── Pure Helpers to test (duplicated from Edge Function for isolation) ──
function getCleanPhone(phoneStr: string): string {
  const cleaned = phoneStr.replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
}

function normalizeMexicanPhone(phoneStr: string): string {
  let cleaned = phoneStr.replace(/\D/g, "");
  if (cleaned.startsWith("521") && cleaned.length === 13) {
    cleaned = "52" + cleaned.slice(3);
  }
  return cleaned;
}

// Helper to determine reply action based on message body
function getReplyAction(body: string, hasAppointment: boolean, hoursDiff?: number, reschedulePolicyHours = 24) {
  const bodyLower = body.toLowerCase().trim();
  
  // 1. Link code detection
  const match = body.match(/C[oó]digo:\s*([A-Z0-9-]+)/i);
  if (match) {
    return { type: 'link', code: match[1].toUpperCase() };
  }

  // 2. Appointment confirmation/cancellation
  if (hasAppointment) {
    const isConfirm = ["sí", "si", "yes", "confirmar", "1"].includes(bodyLower);
    const isCancel = ["no", "cancelar", "reagendar", "2"].includes(bodyLower);

    if (isConfirm) {
      return { type: 'confirm_appointment' };
    } else if (isCancel) {
      if (hoursDiff !== undefined && hoursDiff < reschedulePolicyHours) {
        return { type: 'cancel_blocked_by_policy', policyHours: reschedulePolicyHours };
      }
      return { type: 'cancel_appointment' };
    }
  }

  return { type: 'general_fallback' };
}

describe('WhatsApp Webhook Core Logics', () => {
  describe('Phone Normalization Helpers', () => {
    it('should clean non-digits and keep last 10 digits for local lookup', () => {
      expect(getCleanPhone('+52 (555) 123-4567')).toBe('5551234567');
      expect(getCleanPhone('5551234567')).toBe('5551234567');
      expect(getCleanPhone('15551234567')).toBe('5551234567');
    });

    it('should strip Mexican carrier "1" prefix added on outbound Meta routing', () => {
      // Outbound format: 52 1 55 5123 4567 (13 digits starting with 521)
      // Normal format: 52 55 5123 4567 (12 digits)
      expect(normalizeMexicanPhone('5215551234567')).toBe('525551234567');
      expect(normalizeMexicanPhone('525551234567')).toBe('525551234567'); // Unaffected if no extra '1'
      expect(normalizeMexicanPhone('521555123456')).toBe('521555123456'); // Unaffected if not 13 digits
    });
  });

  describe('Inbound Message Parsing & Decision Making', () => {
    it('should detect linking code request', () => {
      const result = getReplyAction('Mi Código: SAU-1234', false);
      expect(result).toEqual({ type: 'link', code: 'SAU-1234' });
    });

    it('should confirm appointment when user replies yes', () => {
      const result = getReplyAction('Sí', true);
      expect(result).toEqual({ type: 'confirm_appointment' });

      const resultNumeric = getReplyAction('1', true);
      expect(resultNumeric).toEqual({ type: 'confirm_appointment' });
    });

    it('should cancel appointment when user replies no and is within policy window', () => {
      const result = getReplyAction('No', true, 36, 24); // 36 hours before start, policy is 24h
      expect(result).toEqual({ type: 'cancel_appointment' });
    });

    it('should reject cancellation when user replies no but violates policy window', () => {
      const result = getReplyAction('No', true, 12, 24); // 12 hours before start, policy is 24h
      expect(result).toEqual({ type: 'cancel_blocked_by_policy', policyHours: 24 });
    });

    it('should fallback to general auto-reply for custom messages', () => {
      const result = getReplyAction('Hola, ¿puedo cambiar la hora de la sesión?', true);
      expect(result).toEqual({ type: 'general_fallback' });
    });
  });
});
