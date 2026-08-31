/**
 * ISO 3166-1 ALPHA-3 → THE WORD THAT GOES IN THE NATIONALITY FIELD
 * ---------------------------------------------------------------------------
 * The machine-readable zone carries nationality as three letters — `IND`,
 * `GBR`, `USA`. The form takes a word, and `IND` is not one.
 *
 * `fieldsToDetails` used to handle that with a single conditional:
 *
 *     nationality: fields.nationality === "IND" ? "Indian" : ""
 *
 * which is honest — it mapped only the code it could state confidently — but
 * the consequence was that every applicant who was not Indian met a blank
 * required field on the review screen, on a screen whose entire promise is
 * that the passport has been read for them. The passport said what their
 * nationality was; the flow simply had nowhere to look it up.
 *
 * ── Demonyms, not country names ──
 *
 * The field is "Nationality", so the value is `Indian`, not `India`. That
 * distinction is the reason this cannot be derived from `data/countries.ts`,
 * which holds destinations and their display names — a different list, for a
 * different purpose, in the wrong grammatical form.
 *
 * ── What is in here, and what is deliberately not ──
 *
 * Every alpha-3 the standard assigns, so a passport from anywhere resolves.
 * Codes that are NOT plain country codes are left out on purpose, because
 * there is no demonym that is not misleading:
 *
 *   UNO, UNA, UNK   United Nations and Kosovo travel documents
 *   XXA, XXB, XXC   stateless persons, refugees (1951), refugees (1954)
 *   XXX             a person of unspecified nationality
 *   XOM, XCC …      the ICAO organisation codes
 *
 * Those come back `undefined` and the field is left for the applicant, which
 * is the correct outcome: a stateless traveller's nationality is not a thing
 * this table gets to guess at.
 *
 * ── Why the lookup is forgiving about `D` ──
 *
 * German passports carry `D` rather than `DEU`. It is the one live exception
 * to alpha-3 in circulation and it is old enough to be in every reader; the
 * alias table below carries it and the handful of other codes that appear on
 * documents still in date but issued under a previous standard.
 */

/**
 * The table. Sorted by code so a missing entry is easy to spot, and flat
 * rather than grouped so nothing needs a second lookup.
 */
const DEMONYM: Record<string, string> = {
  ABW: "Aruban",
  AFG: "Afghan",
  AGO: "Angolan",
  AIA: "Anguillan",
  ALA: "Ålandic",
  ALB: "Albanian",
  AND: "Andorran",
  ARE: "Emirati",
  ARG: "Argentine",
  ARM: "Armenian",
  ASM: "American Samoan",
  ATG: "Antiguan",
  AUS: "Australian",
  AUT: "Austrian",
  AZE: "Azerbaijani",
  BDI: "Burundian",
  BEL: "Belgian",
  BEN: "Beninese",
  BES: "Bonairean",
  BFA: "Burkinabé",
  BGD: "Bangladeshi",
  BGR: "Bulgarian",
  BHR: "Bahraini",
  BHS: "Bahamian",
  BIH: "Bosnian",
  BLM: "Saint Barthélemy Islander",
  BLR: "Belarusian",
  BLZ: "Belizean",
  BMU: "Bermudian",
  BOL: "Bolivian",
  BRA: "Brazilian",
  BRB: "Barbadian",
  BRN: "Bruneian",
  BTN: "Bhutanese",
  BWA: "Motswana",
  CAF: "Central African",
  CAN: "Canadian",
  CCK: "Cocos Islander",
  CHE: "Swiss",
  CHL: "Chilean",
  CHN: "Chinese",
  CIV: "Ivorian",
  CMR: "Cameroonian",
  COD: "Congolese",
  COG: "Congolese",
  COK: "Cook Islander",
  COL: "Colombian",
  COM: "Comorian",
  CPV: "Cabo Verdean",
  CRI: "Costa Rican",
  CUB: "Cuban",
  CUW: "Curaçaoan",
  CXR: "Christmas Islander",
  CYM: "Caymanian",
  CYP: "Cypriot",
  CZE: "Czech",
  DEU: "German",
  DJI: "Djiboutian",
  DMA: "Dominican",
  DNK: "Danish",
  DOM: "Dominican",
  DZA: "Algerian",
  ECU: "Ecuadorian",
  EGY: "Egyptian",
  ERI: "Eritrean",
  ESH: "Sahrawi",
  ESP: "Spanish",
  EST: "Estonian",
  ETH: "Ethiopian",
  FIN: "Finnish",
  FJI: "Fijian",
  FLK: "Falkland Islander",
  FRA: "French",
  FRO: "Faroese",
  FSM: "Micronesian",
  GAB: "Gabonese",
  GBR: "British",
  GEO: "Georgian",
  GGY: "Guernseyman",
  GHA: "Ghanaian",
  GIB: "Gibraltarian",
  GIN: "Guinean",
  GLP: "Guadeloupean",
  GMB: "Gambian",
  GNB: "Bissau-Guinean",
  GNQ: "Equatorial Guinean",
  GRC: "Greek",
  GRD: "Grenadian",
  GRL: "Greenlandic",
  GTM: "Guatemalan",
  GUF: "French Guianese",
  GUM: "Guamanian",
  GUY: "Guyanese",
  HKG: "Hong Konger",
  HND: "Honduran",
  HRV: "Croatian",
  HTI: "Haitian",
  HUN: "Hungarian",
  IDN: "Indonesian",
  IMN: "Manx",
  IND: "Indian",
  IOT: "British Indian Ocean Territory Islander",
  IRL: "Irish",
  IRN: "Iranian",
  IRQ: "Iraqi",
  ISL: "Icelandic",
  ISR: "Israeli",
  ITA: "Italian",
  JAM: "Jamaican",
  JEY: "Jerseyman",
  JOR: "Jordanian",
  JPN: "Japanese",
  KAZ: "Kazakhstani",
  KEN: "Kenyan",
  KGZ: "Kyrgyzstani",
  KHM: "Cambodian",
  KIR: "I-Kiribati",
  KNA: "Kittitian",
  KOR: "South Korean",
  KWT: "Kuwaiti",
  LAO: "Lao",
  LBN: "Lebanese",
  LBR: "Liberian",
  LBY: "Libyan",
  LCA: "Saint Lucian",
  LIE: "Liechtensteiner",
  LKA: "Sri Lankan",
  LSO: "Mosotho",
  LTU: "Lithuanian",
  LUX: "Luxembourger",
  LVA: "Latvian",
  MAC: "Macanese",
  MAF: "Saint Martin Islander",
  MAR: "Moroccan",
  MCO: "Monégasque",
  MDA: "Moldovan",
  MDG: "Malagasy",
  MDV: "Maldivian",
  MEX: "Mexican",
  MHL: "Marshallese",
  MKD: "Macedonian",
  MLI: "Malian",
  MLT: "Maltese",
  MMR: "Burmese",
  MNE: "Montenegrin",
  MNG: "Mongolian",
  MNP: "Northern Mariana Islander",
  MOZ: "Mozambican",
  MRT: "Mauritanian",
  MSR: "Montserratian",
  MTQ: "Martiniquais",
  MUS: "Mauritian",
  MWI: "Malawian",
  MYS: "Malaysian",
  MYT: "Mahoran",
  NAM: "Namibian",
  NCL: "New Caledonian",
  NER: "Nigerien",
  NFK: "Norfolk Islander",
  NGA: "Nigerian",
  NIC: "Nicaraguan",
  NIU: "Niuean",
  NLD: "Dutch",
  NOR: "Norwegian",
  NPL: "Nepali",
  NRU: "Nauruan",
  NZL: "New Zealander",
  OMN: "Omani",
  PAK: "Pakistani",
  PAN: "Panamanian",
  PCN: "Pitcairn Islander",
  PER: "Peruvian",
  PHL: "Filipino",
  PLW: "Palauan",
  PNG: "Papua New Guinean",
  POL: "Polish",
  PRI: "Puerto Rican",
  PRK: "North Korean",
  PRT: "Portuguese",
  PRY: "Paraguayan",
  PSE: "Palestinian",
  PYF: "French Polynesian",
  QAT: "Qatari",
  REU: "Réunionese",
  ROU: "Romanian",
  RUS: "Russian",
  RWA: "Rwandan",
  SAU: "Saudi Arabian",
  SDN: "Sudanese",
  SEN: "Senegalese",
  SGP: "Singaporean",
  SGS: "South Georgian",
  SHN: "Saint Helenian",
  SJM: "Svalbardian",
  SLB: "Solomon Islander",
  SLE: "Sierra Leonean",
  SLV: "Salvadoran",
  SMR: "Sammarinese",
  SOM: "Somali",
  SPM: "Saint-Pierrais",
  SRB: "Serbian",
  SSD: "South Sudanese",
  STP: "São Toméan",
  SUR: "Surinamese",
  SVK: "Slovak",
  SVN: "Slovenian",
  SWE: "Swedish",
  SWZ: "Swazi",
  SXM: "Sint Maartener",
  SYC: "Seychellois",
  SYR: "Syrian",
  TCA: "Turks and Caicos Islander",
  TCD: "Chadian",
  TGO: "Togolese",
  THA: "Thai",
  TJK: "Tajikistani",
  TKL: "Tokelauan",
  TKM: "Turkmen",
  TLS: "Timorese",
  TON: "Tongan",
  TTO: "Trinidadian",
  TUN: "Tunisian",
  TUR: "Turkish",
  TUV: "Tuvaluan",
  TWN: "Taiwanese",
  TZA: "Tanzanian",
  UGA: "Ugandan",
  UKR: "Ukrainian",
  URY: "Uruguayan",
  USA: "American",
  UZB: "Uzbekistani",
  VAT: "Vatican",
  VCT: "Vincentian",
  VEN: "Venezuelan",
  VGB: "British Virgin Islander",
  VIR: "United States Virgin Islander",
  VNM: "Vietnamese",
  VUT: "Ni-Vanuatu",
  WLF: "Wallisian",
  WSM: "Samoan",
  YEM: "Yemeni",
  ZAF: "South African",
  ZMB: "Zambian",
  ZWE: "Zimbabwean",
};

/**
 * Codes still in circulation on in-date documents that are not the current
 * alpha-3 for the issuing state.
 *
 * `D` is Germany's, and it is the only one of these anybody meets often. The
 * rest are here because a passport is valid for ten years and states rename
 * themselves inside that window.
 */
const ALIAS: Record<string, string> = {
  D: "DEU",
  GBD: "GBR", // British Overseas Territories citizen
  GBN: "GBR", // British National (Overseas)
  GBO: "GBR", // British Overseas citizen
  GBP: "GBR", // British Protected Person
  GBS: "GBR", // British Subject
  RKS: "SRB", // Kosovo — issued as RKS; no ISO code assigned
  EUE: "", // European Union laissez-passer: not a nationality
};

/**
 * The nationality word for an MRZ country code, or `undefined`.
 *
 * `undefined` rather than an empty string, so a caller can tell "this code
 * means no nationality can be stated" from "the field happens to be blank" —
 * `fieldsToDetails` leaves the form untouched in the first case rather than
 * writing a blank over something the applicant may have typed.
 */
export function nationalityFromCode(code: string): string | undefined {
  const normalised = code.toUpperCase().replace(/[^A-Z]/g, "");
  if (!normalised) return undefined;

  const resolved = ALIAS[normalised] ?? normalised;
  if (!resolved) return undefined;

  return DEMONYM[resolved];
}

/**
 * The reverse, for reading a nationality off printed text.
 *
 * The back page of a passport does not carry a nationality field, but it does
 * carry the issuing state's name in the header on many designs, and the front
 * page carries both. `BrowserMrzScanner` uses this as a fallback for the one
 * case that matters: an MRZ whose three-letter code came back as noise on a
 * passport whose printed page reads clearly.
 *
 * Matched against the country NAME as well as the demonym, because the page
 * says "REPUBLIC OF INDIA" where the field wants "Indian".
 */
const COUNTRY_WORD: Record<string, string> = {
  AFGHANISTAN: "Afghan",
  ALBANIA: "Albanian",
  ALGERIA: "Algerian",
  ARGENTINA: "Argentine",
  ARMENIA: "Armenian",
  AUSTRALIA: "Australian",
  AUSTRIA: "Austrian",
  AZERBAIJAN: "Azerbaijani",
  BAHRAIN: "Bahraini",
  BANGLADESH: "Bangladeshi",
  BELARUS: "Belarusian",
  BELGIUM: "Belgian",
  BHUTAN: "Bhutanese",
  BRAZIL: "Brazilian",
  BULGARIA: "Bulgarian",
  CAMBODIA: "Cambodian",
  CANADA: "Canadian",
  CHINA: "Chinese",
  COLOMBIA: "Colombian",
  CROATIA: "Croatian",
  CYPRUS: "Cypriot",
  CZECHIA: "Czech",
  DENMARK: "Danish",
  EGYPT: "Egyptian",
  ESTONIA: "Estonian",
  ETHIOPIA: "Ethiopian",
  FINLAND: "Finnish",
  FRANCE: "French",
  GEORGIA: "Georgian",
  GERMANY: "German",
  GHANA: "Ghanaian",
  GREECE: "Greek",
  HUNGARY: "Hungarian",
  ICELAND: "Icelandic",
  INDIA: "Indian",
  INDONESIA: "Indonesian",
  IRAN: "Iranian",
  IRAQ: "Iraqi",
  IRELAND: "Irish",
  ISRAEL: "Israeli",
  ITALY: "Italian",
  JAPAN: "Japanese",
  JORDAN: "Jordanian",
  KAZAKHSTAN: "Kazakhstani",
  KENYA: "Kenyan",
  KUWAIT: "Kuwaiti",
  LATVIA: "Latvian",
  LEBANON: "Lebanese",
  LITHUANIA: "Lithuanian",
  MALAYSIA: "Malaysian",
  MALDIVES: "Maldivian",
  MALTA: "Maltese",
  MAURITIUS: "Mauritian",
  MEXICO: "Mexican",
  MOROCCO: "Moroccan",
  MYANMAR: "Burmese",
  NEPAL: "Nepali",
  NETHERLANDS: "Dutch",
  NIGERIA: "Nigerian",
  NORWAY: "Norwegian",
  OMAN: "Omani",
  PAKISTAN: "Pakistani",
  PERU: "Peruvian",
  PHILIPPINES: "Filipino",
  POLAND: "Polish",
  PORTUGAL: "Portuguese",
  QATAR: "Qatari",
  ROMANIA: "Romanian",
  RUSSIA: "Russian",
  RWANDA: "Rwandan",
  SERBIA: "Serbian",
  SINGAPORE: "Singaporean",
  SLOVAKIA: "Slovak",
  SLOVENIA: "Slovenian",
  SOMALIA: "Somali",
  SPAIN: "Spanish",
  SUDAN: "Sudanese",
  SWEDEN: "Swedish",
  SWITZERLAND: "Swiss",
  SYRIA: "Syrian",
  TAIWAN: "Taiwanese",
  TANZANIA: "Tanzanian",
  THAILAND: "Thai",
  TUNISIA: "Tunisian",
  TURKEY: "Turkish",
  UGANDA: "Ugandan",
  UKRAINE: "Ukrainian",
  URUGUAY: "Uruguayan",
  UZBEKISTAN: "Uzbekistani",
  VIETNAM: "Vietnamese",
  YEMEN: "Yemeni",
  ZAMBIA: "Zambian",
  ZIMBABWE: "Zimbabwean",
};

/**
 * A nationality named anywhere in a page's OCR text, or `undefined`.
 *
 * Deliberately looks for the country name only, never the demonym. A passport
 * page prints its issuing state ("REPUBLIC OF INDIA", "KINGDOM OF THAILAND");
 * it does not print "Indian", and matching on demonyms would let a word from
 * an address line decide somebody's nationality.
 *
 * Multi-word names are matched against the joined text; single words against
 * the word list, so `INDIA` in `REPUBLIC OF INDIA` hits and `INDIAN` in an
 * address does not.
 */
export function nationalityFromPageText(words: readonly string[]): string | undefined {
  const upper = words.map((word) => word.toUpperCase().replace(/[^A-Z]/g, ""));
  const joined = upper.join(" ");

  for (const [name, demonym] of Object.entries(COUNTRY_WORD)) {
    if (name.includes(" ")) {
      if (joined.includes(name)) return demonym;
    } else if (upper.includes(name)) {
      return demonym;
    }
  }

  return undefined;
}
