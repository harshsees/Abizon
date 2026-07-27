export interface Country {
  id: number;
  name: string;
  code: string; // ISO 2-letter country code
  visaType: "E-Visa" | "Visa on Arrival" | "Visa Free" | "Sticker Visa";
  validity: string;
  fees: string;
  deliveryDays: number;
  documents: "Passport Only" | "Photo + Passport" | "No Documents Required";
  imageUrl: string;
}

// Map of high quality unsplash image IDs to make the UI look very premium and matching specific countries where possible
const unsplashIds: Record<string, string> = {
  th: "photo-1528181304800-2f5373a29587", // Thailand
  ae: "photo-1512453979798-5ea266f8880c", // UAE
  lk: "photo-1588598130794-3d9ad5a266db", // Sri Lanka
  my: "photo-1542856391-010fb87dcfed", // Malaysia
  vn: "photo-1528127269322-539801943592", // Vietnam
  sg: "photo-1525625293386-3f8f99389edd", // Singapore
  id: "photo-1537996194471-e657df975ab4", // Indonesia
  jp: "photo-1493976040374-85c8e12f0c0e", // Japan
  kr: "photo-1555939594-58d7cb561ad1", // South Korea
  gb: "photo-1485081661445-7e753080975f", // United Kingdom
  fr: "photo-1508009603885-50cf7c579365", // France
  it: "photo-1516483638261-f4dbaf036963", // Italy
  es: "photo-1539037116277-4db20889f2d4", // Spain
  de: "photo-1467269204594-9661b134dd2b", // Germany
  ch: "photo-1476514525535-07fb3b4ae5f1", // Switzerland
  au: "photo-1506973035872-a4ec16b8e8d9", // Australia
  nz: "photo-1469854523086-cc02fe5d8800", // New Zealand
  ca: "photo-1504280390367-361c6d9f38f4", // Canada
  us: "photo-1513581166391-887a96ded73a", // USA
  tr: "photo-1504609773096-104ff2c73ba4", // Turkey
  eg: "photo-1539650116574-8efeb43e2750", // Egypt
  za: "photo-1516026672322-bc52d61a55d5", // South Africa
  mv: "photo-1514282401047-d79a71a590e8", // Maldives
  mu: "photo-1509060464153-44667396260f", // Mauritius
  sc: "photo-1589979482837-e74f2e145060", // Seychelles
  br: "photo-1483728642387-6c3bdd6c93e5", // Brazil
  ar: "photo-1518495973542-4542c06a5843", // Argentina
  mx: "photo-1512813583145-baaa340ef29f", // Mexico
  pe: "photo-1531816458010-fb76819ec72f", // Peru
  ma: "photo-1539650116574-8efeb43e2750", // Morocco
  ke: "photo-1516026672322-bc52d61a55d5", // Kenya
  in: "photo-1564507592333-c60657eea523", // India
  ge: "photo-1565008447742-97f6f38c985c", // Georgia
  np: "photo-1589308078059-be1415eab4c3", // Nepal
  kh: "photo-1504609773096-104ff2c73ba4", // Cambodia
  ph: "photo-1518509562904-e7ef99cdcc86", // Philippines
  fj: "photo-1507525428034-b723cf961d3e", // Fiji
};

// Beautiful general categories for countries that don't have a specific landmark mapped
const categories = [
  "photo-1507525428034-b723cf961d3e", // Beach/Tropical
  "photo-1470071459604-3b5ec3a7fe05", // Mountains/Nature
  "photo-1477959858617-67f85cf4f1df", // City/Urban
  "photo-1464822759023-fed622ff2c3b", // Forest/Hills
  "photo-1500530855697-b586d89ba3ee", // Lake/Roadtrip
];

const getUnsplashUrl = (code: string, index: number): string => {
  const id = unsplashIds[code] || categories[index % categories.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=550&q=80`;
};

// Full list of 155 countries
const rawCountries: Country[] = [
  { id: 1, name: "Thailand", code: "th", visaType: "E-Visa", validity: "90 Days", fees: "₹3,500", deliveryDays: 2, documents: "Photo + Passport", imageUrl: "" },
  { id: 2, name: "United Arab Emirates", code: "ae", visaType: "E-Visa", validity: "60 Days", fees: "₹8,099", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 3, name: "Sri Lanka", code: "lk", visaType: "E-Visa", validity: "180 Days", fees: "₹2,200", deliveryDays: 3, documents: "No Documents Required", imageUrl: "" },
  { id: 4, name: "Malaysia", code: "my", visaType: "E-Visa", validity: "30 Days", fees: "₹2,900", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 5, name: "Vietnam", code: "vn", visaType: "E-Visa", validity: "90 Days", fees: "₹3,024", deliveryDays: 3, documents: "Photo + Passport", imageUrl: "" },
  { id: 6, name: "Singapore", code: "sg", visaType: "E-Visa", validity: "30 Days", fees: "₹2,650", deliveryDays: 4, documents: "Photo + Passport", imageUrl: "" },
  { id: 7, name: "Indonesia", code: "id", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹2,700", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 8, name: "Japan", code: "jp", visaType: "E-Visa", validity: "90 Days", fees: "₹0", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 9, name: "South Korea", code: "kr", visaType: "E-Visa", validity: "90 Days", fees: "₹1,800", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 10, name: "United Kingdom", code: "gb", visaType: "Sticker Visa", validity: "180 Days", fees: "₹12,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 11, name: "France", code: "fr", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 12, name: "Italy", code: "it", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 13, name: "Spain", code: "es", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 14, name: "Germany", code: "de", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 15, name: "Switzerland", code: "ch", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 16, name: "Australia", code: "au", visaType: "E-Visa", validity: "180 Days", fees: "₹9,500", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 17, name: "New Zealand", code: "nz", visaType: "E-Visa", validity: "90 Days", fees: "₹11,000", deliveryDays: 6, documents: "Photo + Passport", imageUrl: "" },
  { id: 18, name: "Canada", code: "ca", visaType: "Sticker Visa", validity: "180 Days", fees: "₹8,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 19, name: "United States", code: "us", visaType: "Sticker Visa", validity: "180 Days", fees: "₹15,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 20, name: "Turkey", code: "tr", visaType: "E-Visa", validity: "30 Days", fees: "₹4,200", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 21, name: "Egypt", code: "eg", visaType: "E-Visa", validity: "30 Days", fees: "₹2,100", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 22, name: "South Africa", code: "za", visaType: "E-Visa", validity: "90 Days", fees: "Free", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 23, name: "Maldives", code: "mv", visaType: "Visa on Arrival", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 24, name: "Mauritius", code: "mu", visaType: "Visa Free", validity: "60 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 25, name: "Seychelles", code: "sc", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 26, name: "Brazil", code: "br", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 27, name: "Argentina", code: "ar", visaType: "E-Visa", validity: "90 Days", fees: "₹4,100", deliveryDays: 6, documents: "Photo + Passport", imageUrl: "" },
  { id: 28, name: "Mexico", code: "mx", visaType: "Sticker Visa", validity: "180 Days", fees: "₹3,800", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 29, name: "Peru", code: "pe", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 30, name: "Morocco", code: "ma", visaType: "E-Visa", validity: "30 Days", fees: "₹2,900", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 31, name: "Kenya", code: "ke", visaType: "E-Visa", validity: "90 Days", fees: "₹4,500", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 32, name: "Saudi Arabia", code: "sa", visaType: "E-Visa", validity: "90 Days", fees: "₹9,200", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 33, name: "Qatar", code: "qa", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 34, name: "Oman", code: "om", visaType: "E-Visa", validity: "30 Days", fees: "₹1,900", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 35, name: "Jordan", code: "jo", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹4,800", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 36, name: "Kuwait", code: "kw", visaType: "E-Visa", validity: "90 Days", fees: "₹2,400", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 37, name: "Bahrain", code: "bh", visaType: "E-Visa", validity: "30 Days", fees: "₹1,950", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 38, name: "Cambodia", code: "kh", visaType: "E-Visa", validity: "30 Days", fees: "₹3,100", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 39, name: "Philippines", code: "ph", visaType: "E-Visa", validity: "30 Days", fees: "₹2,500", deliveryDays: 4, documents: "Photo + Passport", imageUrl: "" },
  { id: 40, name: "Taiwan", code: "tw", visaType: "E-Visa", validity: "30 Days", fees: "Free", deliveryDays: 3, documents: "Photo + Passport", imageUrl: "" },
  { id: 41, name: "Hong Kong", code: "hk", visaType: "Visa Free", validity: "14 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 42, name: "Macau", code: "mo", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 43, name: "Nepal", code: "np", visaType: "Visa Free", validity: "150 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 44, name: "Bhutan", code: "bt", visaType: "E-Visa", validity: "30 Days", fees: "₹3,300", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 45, name: "India", code: "in", visaType: "E-Visa", validity: "365 Days", fees: "₹6,800", deliveryDays: 3, documents: "Photo + Passport", imageUrl: "" },
  { id: 46, name: "Bangladesh", code: "bd", visaType: "Sticker Visa", validity: "30 Days", fees: "₹850", deliveryDays: 6, documents: "Photo + Passport", imageUrl: "" },
  { id: 47, name: "Kazakhstan", code: "kz", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 48, name: "Uzbekistan", code: "uz", visaType: "E-Visa", validity: "30 Days", fees: "₹1,800", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 49, name: "Georgia", code: "ge", visaType: "E-Visa", validity: "90 Days", fees: "₹1,700", deliveryDays: 5, documents: "Passport Only", imageUrl: "" },
  { id: 50, name: "Armenia", code: "am", visaType: "E-Visa", validity: "120 Days", fees: "₹600", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 51, name: "Azerbaijan", code: "az", visaType: "E-Visa", validity: "30 Days", fees: "₹2,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 52, name: "Austria", code: "at", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 53, name: "Belgium", code: "be", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 54, name: "Netherlands", code: "nl", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 55, name: "Ireland", code: "ie", visaType: "Sticker Visa", validity: "90 Days", fees: "₹5,400", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 56, name: "Portugal", code: "pt", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 57, name: "Greece", code: "gr", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 58, name: "Sweden", code: "se", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 60, name: "Denmark", code: "dk", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 61, name: "Finland", code: "fi", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 62, name: "Iceland", code: "is", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 63, name: "Poland", code: "pl", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 64, name: "Czech Republic", code: "cz", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 65, name: "Hungary", code: "hu", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 66, name: "Croatia", code: "hr", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 67, name: "Romania", code: "ro", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 68, name: "Bulgaria", code: "bg", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 69, name: "Cyprus", code: "cy", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 70, name: "Malta", code: "mt", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 71, name: "Monaco", code: "mc", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 72, name: "Andorra", code: "ad", visaType: "Sticker Visa", validity: "90 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 73, name: "Colombia", code: "co", visaType: "E-Visa", validity: "90 Days", fees: "₹6,500", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 74, name: "Chile", code: "cl", visaType: "Sticker Visa", validity: "90 Days", fees: "₹7,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 75, name: "Ecuador", code: "ec", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 76, name: "Costa Rica", code: "cr", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 77, name: "Panama", code: "pa", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 78, name: "Bahamas", code: "bs", visaType: "E-Visa", validity: "90 Days", fees: "₹8,300", deliveryDays: 4, documents: "Photo + Passport", imageUrl: "" },
  { id: 79, name: "Jamaica", code: "jm", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹7,500", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 80, name: "Dominican Republic", code: "do", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 81, name: "Cuba", code: "cu", visaType: "Sticker Visa", validity: "30 Days", fees: "₹4,500", deliveryDays: 6, documents: "Photo + Passport", imageUrl: "" },
  { id: 82, name: "Guatemala", code: "gt", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 83, name: "Bolivia", code: "bo", visaType: "Visa on Arrival", validity: "90 Days", fees: "₹4,100", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 84, name: "Uruguay", code: "uy", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 85, name: "Paraguay", code: "py", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 86, name: "Tanzania", code: "tz", visaType: "E-Visa", validity: "90 Days", fees: "₹4,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 87, name: "Madagascar", code: "mg", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹3,100", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 88, name: "Tunisia", code: "tn", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 89, name: "Ethiopia", code: "et", visaType: "E-Visa", validity: "30 Days", fees: "₹4,300", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 90, name: "Uganda", code: "ug", visaType: "E-Visa", validity: "90 Days", fees: "₹4,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 91, name: "Ghana", code: "gh", visaType: "Sticker Visa", validity: "90 Days", fees: "₹5,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 92, name: "Nigeria", code: "ng", visaType: "Sticker Visa", validity: "30 Days", fees: "₹6,800", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 93, name: "Senegal", code: "sn", visaType: "Visa on Arrival", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 94, name: "Algeria", code: "dz", visaType: "Sticker Visa", validity: "30 Days", fees: "₹5,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 95, name: "Namibia", code: "na", visaType: "Visa on Arrival", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 96, name: "Botswana", code: "bw", visaType: "E-Visa", validity: "90 Days", fees: "₹2,500", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 97, name: "Zimbabwe", code: "zw", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹2,500", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 98, name: "Rwanda", code: "rw", visaType: "E-Visa", validity: "30 Days", fees: "₹4,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 99, name: "Fiji", code: "fj", visaType: "Visa Free", validity: "120 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 100, name: "Samoa", code: "ws", visaType: "Visa Free", validity: "60 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 101, name: "Tonga", code: "to", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 102, name: "Vanuatu", code: "vu", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 103, name: "Solomon Islands", code: "sb", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 104, name: "Palau", code: "pw", visaType: "Visa on Arrival", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 105, name: "Micronesia", code: "fm", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 106, name: "Tuvalu", code: "tv", visaType: "Visa on Arrival", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 107, name: "Nauru", code: "nr", visaType: "Visa on Arrival", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 108, name: "Marshall Islands", code: "mh", visaType: "Visa on Arrival", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 109, name: "Kiribati", code: "ki", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 110, name: "Papua New Guinea", code: "pg", visaType: "E-Visa", validity: "60 Days", fees: "₹4,100", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 111, name: "Laos", code: "la", visaType: "E-Visa", validity: "30 Days", fees: "₹3,300", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 112, name: "Myanmar", code: "mm", visaType: "E-Visa", validity: "28 Days", fees: "₹4,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 113, name: "Mongolia", code: "mn", visaType: "E-Visa", validity: "30 Days", fees: "₹2,100", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 114, name: "Brunei", code: "bn", visaType: "Visa Free", validity: "14 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 115, name: "East Timor", code: "tl", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹2,500", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 116, name: "Morocco", code: "ma", visaType: "E-Visa", validity: "90 Days", fees: "₹3,400", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 117, name: "Jordan", code: "jo", visaType: "Visa on Arrival", validity: "90 Days", fees: "₹4,800", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 118, name: "Zambia", code: "zm", visaType: "E-Visa", validity: "90 Days", fees: "₹4,150", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 119, name: "Angola", code: "ao", visaType: "E-Visa", validity: "30 Days", fees: "Free", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 120, name: "Cameroon", code: "cm", visaType: "E-Visa", validity: "90 Days", fees: "₹8,500", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 121, name: "Gabon", code: "ga", visaType: "E-Visa", validity: "90 Days", fees: "₹6,800", deliveryDays: 4, documents: "Photo + Passport", imageUrl: "" },
  { id: 122, name: "Congo", code: "cg", visaType: "E-Visa", validity: "90 Days", fees: "₹7,200", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 123, name: "Ivory Coast", code: "ci", visaType: "E-Visa", validity: "90 Days", fees: "₹5,800", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 124, name: "Guinea", code: "gn", visaType: "E-Visa", validity: "90 Days", fees: "₹6,200", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 125, name: "Mali", code: "ml", visaType: "Sticker Visa", validity: "30 Days", fees: "₹5,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 126, name: "Niger", code: "ne", visaType: "Sticker Visa", validity: "30 Days", fees: "₹6,000", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 127, name: "Benin", code: "bj", visaType: "E-Visa", validity: "30 Days", fees: "₹4,100", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 128, name: "Togo", code: "tg", visaType: "Visa on Arrival", validity: "7 Days", fees: "₹3,500", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 129, name: "Liberia", code: "lr", visaType: "Sticker Visa", validity: "30 Days", fees: "₹6,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 130, name: "Sierra Leone", code: "sl", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹6,600", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 131, name: "Gambia", code: "gm", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 132, name: "Mauritania", code: "mr", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹5,200", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 133, name: "Cape Verde", code: "cv", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹2,200", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 134, name: "Sao Tome and Principe", code: "st", visaType: "E-Visa", validity: "30 Days", fees: "₹2,500", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 135, name: "Equatorial Guinea", code: "gq", visaType: "E-Visa", validity: "30 Days", fees: "₹6,300", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 136, name: "Djibouti", code: "dj", visaType: "E-Visa", validity: "30 Days", fees: "₹1,900", deliveryDays: 2, documents: "Passport Only", imageUrl: "" },
  { id: 137, name: "Somalia", code: "so", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹4,100", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 138, name: "Sudan", code: "sd", visaType: "Sticker Visa", validity: "30 Days", fees: "₹8,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 139, name: "Eritrea", code: "er", visaType: "Sticker Visa", validity: "30 Days", fees: "₹6,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 140, name: "South Sudan", code: "ss", visaType: "E-Visa", validity: "30 Days", fees: "₹8,100", deliveryDays: 4, documents: "Passport Only", imageUrl: "" },
  { id: 141, name: "Central African Republic", code: "cf", visaType: "Sticker Visa", validity: "30 Days", fees: "₹9,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 142, name: "Chad", code: "td", visaType: "Sticker Visa", validity: "30 Days", fees: "₹7,200", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 143, name: "Burundi", code: "bi", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹7,500", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 144, name: "Malawi", code: "mw", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 145, name: "Mozambique", code: "mz", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹4,200", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 146, name: "Lesotho", code: "ls", visaType: "E-Visa", validity: "44 Days", fees: "₹12,200", deliveryDays: 5, documents: "Photo + Passport", imageUrl: "" },
  { id: 147, name: "Swaziland", code: "sz", visaType: "Visa Free", validity: "30 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 148, name: "Comoros", code: "km", visaType: "Visa on Arrival", validity: "45 Days", fees: "₹2,600", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 149, name: "Suriname", code: "sr", visaType: "E-Visa", validity: "90 Days", fees: "₹4,500", deliveryDays: 3, documents: "Passport Only", imageUrl: "" },
  { id: 150, name: "Guyana", code: "gy", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹2,200", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 151, name: "Venezuela", code: "ve", visaType: "Sticker Visa", validity: "90 Days", fees: "₹6,800", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 152, name: "Belize", code: "bz", visaType: "Sticker Visa", validity: "30 Days", fees: "₹4,500", deliveryDays: 7, documents: "Photo + Passport", imageUrl: "" },
  { id: 153, name: "Honduras", code: "hn", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" },
  { id: 154, name: "Nicaragua", code: "ni", visaType: "Visa on Arrival", validity: "30 Days", fees: "₹850", deliveryDays: 1, documents: "Passport Only", imageUrl: "" },
  { id: 155, name: "El Salvador", code: "sv", visaType: "Visa Free", validity: "90 Days", fees: "Free", deliveryDays: 1, documents: "No Documents Required", imageUrl: "" }
];

export const countriesData: Country[] = rawCountries.map((country, idx) => ({
  ...country,
  imageUrl: getUnsplashUrl(country.code, idx)
}));
