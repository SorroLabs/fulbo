export const TIMEZONES = [
  // América del Norte y Central
  { label: "América — Honolulu (UTC-10)", value: "Pacific/Honolulu" },
  { label: "América — Anchorage (UTC-9)", value: "America/Anchorage" },
  { label: "América — Los Ángeles, Vancouver (UTC-8)", value: "America/Los_Angeles" },
  { label: "América — Phoenix (UTC-7)", value: "America/Phoenix" },
  { label: "América — Denver (UTC-7)", value: "America/Denver" },
  { label: "América — Chicago, Ciudad de México (UTC-6)", value: "America/Chicago" },
  { label: "América — Managua, San José, Guatemala (UTC-6)", value: "America/Managua" },
  { label: "América — Miami, Nueva York, Toronto (UTC-5)", value: "America/New_York" },
  // América del Sur
  { label: "América — Bogotá, Lima, Quito (UTC-5)", value: "America/Bogota" },
  { label: "América — Halifax (UTC-4)", value: "America/Halifax" },
  { label: "América — Caracas (UTC-4)", value: "America/Caracas" },
  { label: "América — La Paz (UTC-4)", value: "America/La_Paz" },
  { label: "América — Asunción (UTC-4)", value: "America/Asuncion" },
  { label: "América — Santiago (UTC-3/-4)", value: "America/Santiago" },
  { label: "América — Buenos Aires (UTC-3)", value: "America/Argentina/Buenos_Aires" },
  { label: "América — São Paulo, Brasilia (UTC-3)", value: "America/Sao_Paulo" },
  { label: "América — Montevideo (UTC-3)", value: "America/Montevideo" },
  { label: "América — St. John's (UTC-3:30)", value: "America/St_Johns" },
  { label: "América — Noronha (UTC-2)", value: "America/Noronha" },
  // Europa
  { label: "Europa — Lisboa, Reikiavik (UTC+0)", value: "Europe/Lisbon" },
  { label: "Europa — Londres, Dublín (UTC+0/+1)", value: "Europe/London" },
  { label: "Europa — Madrid, París, Roma, Berlín (UTC+1)", value: "Europe/Madrid" },
  { label: "Europa — Ámsterdam, Bruselas, Varsovia (UTC+1)", value: "Europe/Amsterdam" },
  { label: "Europa — Estocolmo, Oslo, Copenhague (UTC+1)", value: "Europe/Stockholm" },
  { label: "Europa — Kiev (UTC+2/+3)", value: "Europe/Kiev" },
  { label: "Europa — Atenas, Bucarest, Helsinki (UTC+2)", value: "Europe/Athens" },
  { label: "Europa — Estambul (UTC+3)", value: "Europe/Istanbul" },
  { label: "Europa — Moscú, San Petersburgo (UTC+3)", value: "Europe/Moscow" },
  // África
  { label: "África — Dakar, Accra (UTC+0)", value: "Africa/Dakar" },
  { label: "África — Lagos, Túnez, Argel (UTC+1)", value: "Africa/Lagos" },
  { label: "África — El Cairo (UTC+2)", value: "Africa/Cairo" },
  { label: "África — Johannesburgo, Harare (UTC+2)", value: "Africa/Johannesburg" },
  { label: "África — Nairobi, Addis Abeba (UTC+3)", value: "Africa/Nairobi" },
  // Asia y Oriente Medio
  { label: "Asia — Riad, Kuwait, Bagdad (UTC+3)", value: "Asia/Riyadh" },
  { label: "Asia — Teherán (UTC+3:30)", value: "Asia/Tehran" },
  { label: "Asia — Dubái, Abu Dhabi, Bakú (UTC+4)", value: "Asia/Dubai" },
  { label: "Asia — Kabul (UTC+4:30)", value: "Asia/Kabul" },
  { label: "Asia — Karachi, Tashkent (UTC+5)", value: "Asia/Karachi" },
  { label: "Asia — Mumbai, Nueva Delhi, Colombo (UTC+5:30)", value: "Asia/Kolkata" },
  { label: "Asia — Katmandú (UTC+5:45)", value: "Asia/Kathmandu" },
  { label: "Asia — Dhaka, Almaty (UTC+6)", value: "Asia/Dhaka" },
  { label: "Asia — Rangún (UTC+6:30)", value: "Asia/Rangoon" },
  { label: "Asia — Bangkok, Hanói, Yakarta (UTC+7)", value: "Asia/Bangkok" },
  { label: "Asia — Shanghái, Pekín, Manila, Singapur (UTC+8)", value: "Asia/Shanghai" },
  { label: "Asia — Hong Kong, Taipéi (UTC+8)", value: "Asia/Hong_Kong" },
  { label: "Asia — Seúl (UTC+9)", value: "Asia/Seoul" },
  { label: "Asia — Tokio, Osaka (UTC+9)", value: "Asia/Tokyo" },
  { label: "Asia — Vladivostok (UTC+10)", value: "Asia/Vladivostok" },
  { label: "Asia — Magadán (UTC+11)", value: "Asia/Magadan" },
  { label: "Asia — Kamchatka (UTC+12)", value: "Asia/Kamchatka" },
  // Oceanía
  { label: "Oceanía — Perth (UTC+8)", value: "Australia/Perth" },
  { label: "Oceanía — Darwin (UTC+9:30)", value: "Australia/Darwin" },
  { label: "Oceanía — Brisbane (UTC+10)", value: "Australia/Brisbane" },
  { label: "Oceanía — Sídney, Melbourne (UTC+10/+11)", value: "Australia/Sydney" },
  { label: "Oceanía — Adelaida (UTC+9:30/+10:30)", value: "Australia/Adelaide" },
  { label: "Oceanía — Auckland, Wellington (UTC+12/+13)", value: "Pacific/Auckland" },
  { label: "Oceanía — Fiyi (UTC+12)", value: "Pacific/Fiji" },
  { label: "Oceanía — Samoa (UTC+13)", value: "Pacific/Apia" },
]

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "America/Bogota"
  }
}
