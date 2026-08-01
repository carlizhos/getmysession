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

const TIMEZONE_FRIENDLY_NAMES: Record<string, string> = {
  'America/Los_Angeles': 'Hora del Pacífico',
  'America/Tijuana': 'Hora del Pacífico',
  'America/Ensenada': 'Hora del Pacífico',
  'America/Hermosillo': 'Hora del Pacífico (Sonora)',
  'America/Mazatlan': 'Hora de la Montaña',
  'America/Chihuahua': 'Hora de la Montaña',
  'America/Denver': 'Hora de la Montaña',
  'America/Phoenix': 'Hora de la Montaña',
  'America/Mexico_City': 'Hora del Centro',
  'America/Monterrey': 'Hora del Centro',
  'America/Guadalajara': 'Hora del Centro',
  'America/Merida': 'Hora del Centro',
  'America/Chicago': 'Hora del Centro',
  'America/Cancun': 'Hora del Este',
  'America/New_York': 'Hora del Este',
  'America/Miami': 'Hora del Este',
  'America/Bogota': 'Hora de Colombia',
  'America/Lima': 'Hora de Perú',
  'America/Buenos_Aires': 'Hora de Argentina',
  'America/Santiago': 'Hora de Chile',
  'Europe/Madrid': 'Hora de España (CET)',
};

/**
 * Genera un nombre amigable legible de zona horaria según estándares de la industria (Ej. Hora del Pacífico).
 * @example "America/Los_Angeles" → "Hora del Pacífico"
 * @example "America/Mexico_City" → "Hora del Centro"
 */
export function getTimezoneFriendlyLabel(tz: string): string {
  if (!tz) return 'Hora local';
  if (TIMEZONE_FRIENDLY_NAMES[tz]) return TIMEZONE_FRIENDLY_NAMES[tz];
  const cityName = TIMEZONE_CITY_NAMES[tz] || tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  if (cityName.toLowerCase() === 'los angeles' || cityName.toLowerCase() === 'tijuana') return 'Hora del Pacífico';
  if (cityName.toLowerCase() === 'ciudad de méxico' || cityName.toLowerCase() === 'mexico city') return 'Hora del Centro';
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

  // Step 2: Use Intl.DateTimeFormat.formatToParts to get the clinic wall-clock
  //         components when UTC shows this time — entirely browser-timezone independent.
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(tempUtc);
  const vals: Record<string, number> = {};
  parts.forEach(p => {
    if (p.type !== 'literal') vals[p.type] = parseInt(p.value);
  });

  // Step 3: Build a pure-UTC timestamp from the clinic wall-clock components
  //         (this avoids the bug where new Date(string) parses in browser-local tz)
  const clinicWallAsUtc = Date.UTC(
    vals.year,
    vals.month - 1,
    vals.day,
    vals.hour === 24 ? 0 : vals.hour,
    vals.minute,
    vals.second || 0
  );

  // Step 4: offset = tempUtc - clinicWallAsUtc
  //         For Tijuana (UTC-7): 09:00Z - 02:00Z = +7 hours
  const offsetMs = tempUtc.getTime() - clinicWallAsUtc;

  // Step 5: Correct UTC = scratch_UTC + offset
  //         09:00Z + 7h = 16:00Z (which is 09:00 in Tijuana) ✓
  return new Date(tempUtc.getTime() + offsetMs);
}

/**
 * Returns the hour (0-23) in the clinic timezone for a given UTC Date.
 * Browser-timezone independent.
 *
 * @example
 * // 16:00Z in Tijuana (UTC-7) = 9
 * getClinicHour(new Date("2026-08-01T16:00:00Z"), "America/Tijuana") // 9
 */
export function getClinicHour(utcDate: Date, clinicTimezone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTimezone,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const h = parts.find(p => p.type === 'hour')?.value || '0';
  return parseInt(h) === 24 ? 0 : parseInt(h);
}

/**
 * Formats a UTC Date as "HH:mm" in the clinic timezone.
 * Browser-timezone independent.
 *
 * @example
 * formatClinicTime(new Date("2026-08-01T16:00:00Z"), "America/Tijuana") // "09:00"
 */
export function formatClinicTime(utcDate: Date, clinicTimezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcDate);
  const h = parts.find(p => p.type === 'hour')?.value || '00';
  const m = parts.find(p => p.type === 'minute')?.value || '00';
  const cleanH = h === '24' ? '00' : h;
  return `${cleanH}:${m}`;
}

/**
 * Returns the clinic-timezone Date parts (year, month, day) for a given UTC Date.
 * Useful for isSameDay comparisons in the clinic timezone.
 */
export function getClinicDateParts(utcDate: Date, clinicTimezone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: clinicTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(utcDate);
  const vals: Record<string, number> = {};
  parts.forEach(p => {
    if (p.type !== 'literal') vals[p.type] = parseInt(p.value);
  });
  return { year: vals.year, month: vals.month, day: vals.day };
}

/**
 * Checks if a UTC date falls on the same calendar day in the clinic timezone.
 */
export function isSameDayInClinic(utcDate: Date, localDate: Date, clinicTimezone: string): boolean {
  const clinic = getClinicDateParts(utcDate, clinicTimezone);
  return clinic.year === localDate.getFullYear()
    && clinic.month === (localDate.getMonth() + 1)
    && clinic.day === localDate.getDate();
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
