const FLAG_CODES: Record<string, string> = {
  // América del Sur
  Argentina: "ar", Brasil: "br", Uruguay: "uy", Colombia: "co",
  Ecuador: "ec", Chile: "cl", Paraguay: "py", Venezuela: "ve",
  Bolivia: "bo", Perú: "pe",

  // América del Norte / Central / Caribe
  "Estados Unidos": "us", Canadá: "ca", México: "mx", Jamaica: "jm",
  Honduras: "hn", "Costa Rica": "cr", Panamá: "pa", "Trinidad y Tobago": "tt",
  "El Salvador": "sv", Guatemala: "gt", Haití: "ht", Cuba: "cu",
  Martinica: "mq", Curazao: "cw",

  // Europa
  España: "es", Francia: "fr", Alemania: "de", Inglaterra: "gb-eng",
  Portugal: "pt", "Países Bajos": "nl", Bélgica: "be", Croacia: "hr",
  Serbia: "rs", Eslovenia: "si", Eslovaquia: "sk", Hungría: "hu",
  Turquía: "tr", Rumania: "ro", Austria: "at", Suiza: "ch",
  Escocia: "gb-sct", "República Checa": "cz", Albania: "al",
  Georgia: "ge", Ucrania: "ua", Polonia: "pl", Dinamarca: "dk",
  Suecia: "se", Noruega: "no", Finlandia: "fi", Islandia: "is",
  Gales: "gb-wls", "Irlanda del Norte": "gb-nir",
  "República de Irlanda": "ie", Irlanda: "ie", Grecia: "gr", Italia: "it",
  Kosovo: "xk", "Bosnia y Herzegovina": "ba", Montenegro: "me",
  "Macedonia del Norte": "mk", Armenia: "am", Azerbaiyán: "az",
  Israel: "il", Kazajistán: "kz", Bielorrusia: "by", Letonia: "lv",
  Lituania: "lt", Estonia: "ee", Moldavia: "md", Luxemburgo: "lu",
  Malta: "mt",

  // África
  Marruecos: "ma", Senegal: "sn", Nigeria: "ng", Camerún: "cm",
  Ghana: "gh", "Costa de Marfil": "ci", Egipto: "eg", Sudáfrica: "za",
  Tanzania: "tz", Uganda: "ug", Túnez: "tn", Argelia: "dz",
  Angola: "ao", Mozambique: "mz", Guinea: "gn", "R.D. del Congo": "cd",
  Congo: "cg", Etiopía: "et", Zambia: "zm", Zimbabue: "zw",
  Kenia: "ke", Mali: "ml", "Burkina Faso": "bf", Gabón: "ga",
  Ruanda: "rw", Mauritania: "mr", "Cabo Verde": "cv",
  "Guinea Ecuatorial": "gq", Togo: "tg", "Sierra Leona": "sl",
  Benín: "bj", Malaui: "mw", Namibia: "na", Botsuana: "bw",
  Gambia: "gm", Liberia: "lr",

  // Asia
  Japón: "jp", "Corea del Sur": "kr", "Arabia Saudita": "sa",
  Australia: "au", Irán: "ir", Uzbekistán: "uz", Jordania: "jo",
  Iraq: "iq", Irak: "iq", Indonesia: "id", China: "cn", Omán: "om", Qatar: "qa", Catar: "qa",
  Kuwait: "kw", Baréin: "bh", Tayikistán: "tj", Kirguistán: "kg",
  Siria: "sy", Líbano: "lb", Palestina: "ps", India: "in",
  Tailandia: "th", Vietnam: "vn", Filipinas: "ph", "Corea del Norte": "kp",
  Turkmenistán: "tm", Pakistán: "pk", "Sri Lanka": "lk",
  Camboya: "kh", Malasia: "my", Singapur: "sg", Chipre: "cy",
  Yemen: "ye", "Emiratos Árabes Unidos": "ae", EAU: "ae",

  // Oceanía
  "Nueva Zelanda": "nz", Fiji: "fj", "Nueva Caledonia": "nc", Tahití: "pf",
}

export function getTeamFlag(teamName: string): string | null {
  const code = FLAG_CODES[teamName]
  if (!code) return null
  return `https://flagcdn.com/w80/${code}.png`
}
