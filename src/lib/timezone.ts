/**
 * timezone.ts — Utilidades centrales de zona horaria para Saudade.
 *
 * Principio: toda la lógica del sistema opera en UTC.
 * La zona horaria es exclusivamente un problema de presentación.
 * Los horarios del psicólogo son "hora de la clínica" anclados a la zona de la organización.
 */

// ── Mapeo de nombres amigables ────────────────────────────────────────────────

const TIMEZONE_CITY_NAMES: Record<string, string> = {
  'America/Mexico_City': 'Ciudad de México',
  'America/Monterrey': 'Monterrey',
  'America/Cancun': 'Cancún',
  'America/Tijuana': 'Tijuana',
  'America/Hermosillo': 'Hermosillo',
  'America/Chihuahua': 'Chihuahua',
  'America/Bogota': 'Bogotá',
  'America/Lima': 'Lima',
  'America/Buenos_Aires': 'Buenos Aires',
  'America/Santiago': 'Santiago',
  'America/Caracas': 'Caracas',
  'America/Guayaquil': 'Guayaquil',
  'America/La_Paz': 'La Paz',
  'America/Asuncion': 'Asunción',
  'America/Montevideo': 'Montevideo',
  'America/Panama': 'Panamá',
  'America/Costa_Rica': 'Costa Rica',
  'America/Guatemala': 'Guatemala',
  'America/New_York': 'Nueva York',
  'America/Chicago': 'Chicago',
  'America/Denver': 'Denver',
  'America/Los_Angeles': 'Los Ángeles',
  'America/Phoenix': 'Phoenix',
  'America/Anchorage': 'Alaska',
  'Pacific/Honolulu': 'Hawái',
  'America/Santo_Domingo': 'Santo Domingo',
  'America/Havana': 'La Habana',
  'America/Puerto_Rico': 'Puerto Rico',
  'Europe/Madrid': 'Madrid',
  'Europe/Paris': 'París',
  'Europe/London': 'Londres',
  'Europe/Berlin': 'Berlín',
  'Europe/Rome': 'Roma',
  'Europe/Lisbon': 'Lisboa',
  'Asia/Tokyo': 'Tokio',
  'Asia/Shanghai': 'Shanghái',
  'Australia/Sydney': 'Sídney',
};

// ── Core Functions ────────────────────────────────────────────────────────────

/**
 * Obtiene la zona horaria del navegador del visitante actual.
 * Ej: "Europe/Paris", "America/Mexico_City"
 */
export function getVisitorTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Mexico_City';
  }
}

/**
 * Genera un nombre amigable legible de zona horaria.
 * @example "America/Mexico_City" → "Ciudad de México (GMT-6)"
 * @example "Europe/Paris" → "París (GMT+2)"
 */
export function getTimezoneFriendlyLabel(tz: string): string {
  const cityName = TIMEZONE_CITY_NAMES[tz] || tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  const offsetStr = getTimezoneOffsetLabel(tz);
  return `${cityName} (${offsetStr})`;
}

/**
 * Obtiene solo el nombre de la ciudad en español de una zona horaria IANA.
 * @example "America/Mexico_City" → "Ciudad de México"
 */
export function getTimezoneCityName(tz: string): string {
  return TIMEZONE_CITY_NAMES[tz] || tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

/**
 * Obtiene la etiqueta de offset actual para una zona horaria.
 * @example "America/Mexico_City" → "GMT-6"
 * @example "Europe/Paris" → "GMT+2"
 */
export function getTimezoneOffsetLabel(tz: string): string {
  try {
    const formatted = new Date().toLocaleString('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    // Extract the offset part (e.g., "GMT-6" or "GMT+2")
    const match = formatted.match(/GMT[+-]?\d+/);
    return match ? match[0] : 'GMT';
  } catch {
    return 'GMT';
  }
}

/**
 * Construye un Date UTC correcto a partir de una fecha del calendario,
 * una hora "HH:mm" y la zona horaria de referencia (la del psicólogo/clínica).
 *
 * ⚡ Esta función resuelve el bug crítico del BookingPage:
 *    Garantiza que "10:00 hora de Ciudad de México" siempre se almacene
 *    como el instante UTC correcto (16:00Z), sin importar desde qué zona
 *    horaria del mundo esté reservando el paciente.
 *
 * @param date - Fecha seleccionada en el calendario (solo se usa año/mes/día)
 * @param timeStr - Hora en formato "HH:mm" (hora de la clínica)
 * @param clinicTimezone - Zona horaria IANA de la clínica (ej: "America/Mexico_City")
 * @returns Date en UTC que representa ese instante
 *
 * @example
 * // "10:00 en Ciudad de México (UTC-6)" → 16:00 UTC
 * buildUTCFromClinicTime(new Date(2026, 5, 24), "10:00", "America/Mexico_City")
 * // Returns: 2026-06-24T16:00:00.000Z
 */
export function buildUTCFromClinicTime(
  date: Date,
  timeStr: string,
  clinicTimezone: string
): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Step 1: Create a "scratch" UTC date with the wall-clock values
  //         (pretend "10:00 clinic time" is "10:00 UTC" temporarily)
  const tempUtc = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0
  ));

  // Step 2: Ask "when UTC clock shows 10:00, what does the clinic clock show?"
  //         For Mexico City (UTC-6): clinic shows 04:00
  const clinicStr = tempUtc.toLocaleString('en-US', { timeZone: clinicTimezone });
  const clinicLocal = new Date(clinicStr);

  // Step 3: The offset = tempUtc - clinicLocal
  //         For Mexico City: 10:00Z - 04:00 = +6 hours
  const offsetMs = tempUtc.getTime() - clinicLocal.getTime();

  // Step 4: Correct UTC = scratch_UTC + offset
  //         10:00Z + 6h = 16:00Z (which is 10:00 in Mexico City) ✓
  return new Date(tempUtc.getTime() + offsetMs);
}

/**
 * Convierte una hora "HH:mm" de una zona horaria de origen a una zona destino
 * para una fecha específica. Retorna el string "HH:mm" convertido.
 *
 * @example
 * // "10:00 Ciudad de México" → "18:00" en París (verano, +8h diferencia)
 * convertTimeSlot(someJuneDate, "10:00", "America/Mexico_City", "Europe/Paris")
 */
export function convertTimeSlot(
  date: Date,
  timeStr: string,
  fromTimezone: string,
  toTimezone: string
): string {
  const utcDate = buildUTCFromClinicTime(date, timeStr, fromTimezone);
  return utcDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: toTimezone,
  });
}

/**
 * Genera un enlace de Google Calendar para un evento.
 * Las fechas se pasan en formato UTC. Google Calendar las convierte
 * automáticamente a la zona horaria del usuario.
 *
 * @param title - Título del evento
 * @param startUtc - Fecha de inicio (UTC)
 * @param endUtc - Fecha de fin (UTC)
 * @param description - Descripción del evento
 * @param location - Ubicación (opcional)
 * @param timezone - Zona horaria para mostrar el evento (ctz parameter)
 */
export function buildGoogleCalendarUrl(
  title: string,
  startUtc: Date,
  endUtc: Date,
  description: string,
  location?: string,
  timezone?: string
): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${fmt(startUtc)}/${fmt(endUtc)}`,
    details: description,
  });

  if (location) params.set('location', location);
  if (timezone) params.set('ctz', timezone);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Genera un enlace de Outlook Web Calendar para un evento.
 */
export function buildOutlookCalendarUrl(
  title: string,
  startUtc: Date,
  endUtc: Date,
  description: string,
  location?: string
): string {
  const params = new URLSearchParams({
    rru: 'addevent',
    subject: title,
    startdt: startUtc.toISOString(),
    enddt: endUtc.toISOString(),
    body: description,
    path: '/calendar/action/compose',
  });

  if (location) params.set('location', location);

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}
