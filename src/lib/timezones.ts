export const TIMEZONES = [
  { label: "América — Bogotá, Lima, Quito (UTC-5)", value: "America/Bogota" },
  { label: "América — Buenos Aires, Santiago (UTC-3)", value: "America/Argentina/Buenos_Aires" },
  { label: "América — Caracas (UTC-4)", value: "America/Caracas" },
  { label: "América — Ciudad de México (UTC-6)", value: "America/Mexico_City" },
  { label: "América — La Paz (UTC-4)", value: "America/La_Paz" },
  { label: "América — Managua, San José (UTC-6)", value: "America/Managua" },
  { label: "América — Miami, Nueva York (UTC-5)", value: "America/New_York" },
  { label: "América — Los Ángeles (UTC-8)", value: "America/Los_Angeles" },
  { label: "América — Chicago (UTC-6)", value: "America/Chicago" },
  { label: "América — Toronto, Ottawa (UTC-5)", value: "America/Toronto" },
  { label: "América — Vancouver (UTC-8)", value: "America/Vancouver" },
  { label: "América — São Paulo, Brasilia (UTC-3)", value: "America/Sao_Paulo" },
  { label: "América — Asunción (UTC-4)", value: "America/Asuncion" },
  { label: "América — Montevideo (UTC-3)", value: "America/Montevideo" },
  { label: "Europa — Madrid, París, Roma (UTC+1)", value: "Europe/Madrid" },
  { label: "Europa — Londres (UTC+0)", value: "Europe/London" },
  { label: "Europa — Moscú (UTC+3)", value: "Europe/Moscow" },
  { label: "África — Lagos (UTC+1)", value: "Africa/Lagos" },
  { label: "África — Nairobi (UTC+3)", value: "Africa/Nairobi" },
  { label: "Asia — Dubái (UTC+4)", value: "Asia/Dubai" },
  { label: "Asia — Tokio (UTC+9)", value: "Asia/Tokyo" },
  { label: "Asia — Shanghái (UTC+8)", value: "Asia/Shanghai" },
  { label: "Oceanía — Sídney (UTC+11)", value: "Australia/Sydney" },
]

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "America/Bogota"
  }
}
