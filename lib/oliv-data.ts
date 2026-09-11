import type { Property } from '@/lib/types'

export const OLIV_MARKET = {
  city: 'Amassoma',
  state: 'Bayelsa',
  country: 'Nigeria',
  center: { lat: 4.9730872, lng: 6.1089697 },
} as const

export type AmassomaZone = { name: string; description: string; center: { lat: number; lng: number }; radius: number }
export const AMASSOMA_ZONES: AmassomaZone[] = [
  { name: 'CHS Area', description: 'College of Health Sciences and CHS Boys Hostels', center: { lat: 4.982, lng: 6.103 }, radius: 420 },
  { name: 'Main Gate Axis', description: 'Homes around the main Niger Delta University entrance', center: { lat: 4.978, lng: 6.111 }, radius: 420 },
  { name: 'Tantua / Tantua Road', description: 'Premium area opposite the late DSP Alamieyeseigha Estate', center: { lat: 4.969, lng: 6.116 }, radius: 500 },
  { name: 'Mango Street', description: 'Popular student lodges with stronger water infrastructure', center: { lat: 4.965, lng: 6.107 }, radius: 360 },
  { name: 'Mango Street Junction', description: 'Commercial and transport entrance to Mango Street', center: { lat: 4.963, lng: 6.111 }, radius: 300 },
  { name: 'Ogbopina', description: 'Busy student neighbourhood with shops and viewing centres', center: { lat: 4.973, lng: 6.116 }, radius: 430 },
  { name: 'Abenikiri (Ibenikiri)', description: 'Calmer, populated residential settlement', center: { lat: 4.967, lng: 6.099 }, radius: 430 },
  { name: 'Okori-Ama', description: 'Fast-growing student community', center: { lat: 4.956, lng: 6.105 }, radius: 480 },
  { name: 'Agbedi-Ama', description: 'Densely populated, budget-friendly student housing', center: { lat: 4.958, lng: 6.115 }, radius: 420 },
  { name: 'Efeke-Ama', description: 'Historic royal quarter with lodges and family compounds', center: { lat: 4.979, lng: 6.118 }, radius: 400 },
  { name: 'Ogoun-Ama', description: 'Expanding outer zone with new lodge construction', center: { lat: 4.95, lng: 6.12 }, radius: 520 },
]
export const getAmassomaZone = (name?: string | null) => AMASSOMA_ZONES.find((zone) => zone.name === name)

export const nigerianStates = ['Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'] as const

// Known major cities per state — used to infer the state of listings that only record a city.
export const CITY_TO_STATE: Record<string, string> = {
  // Abia
  Umuahia: 'Abia', Aba: 'Abia', 'Aba North': 'Abia', Ohafia: 'Abia',
  // Adamawa
  Yola: 'Adamawa', Numan: 'Adamawa', Mubi: 'Adamawa', Jimeta: 'Adamawa',
  // Akwa Ibom
  Uyo: 'Akwa Ibom', Eket: 'Akwa Ibom', Ikot: 'Akwa Ibom', Oron: 'Akwa Ibom',
  // Anambra
  Awka: 'Anambra', Onitsha: 'Anambra', Nnewi: 'Anambra', Ekwulobia: 'Anambra', 'Nanka': 'Anambra',
  // Bauchi
  Bauchi: 'Bauchi', Azare: 'Bauchi',
  // Bayelsa
  Yenagoa: 'Bayelsa', Ogbia: 'Bayelsa', Sagbama: 'Bayelsa', Brass: 'Bayelsa', Nembe: 'Bayelsa',
  // Benue
  Makurdi: 'Benue', Gboko: 'Benue', Otukpo: 'Benue',
  // Borno
  Maiduguri: 'Borno', Biu: 'Borno',
  // Cross River
  Calabar: 'Cross River', Ikom: 'Cross River', Ogoja: 'Cross River',
  // Delta
  Asaba: 'Delta', Warri: 'Delta', Sapele: 'Delta', Ughelli: 'Delta', Effurun: 'Delta', 'Agbor': 'Delta',
  // Ebonyi
  Abakaliki: 'Ebonyi', Afikpo: 'Ebonyi',
  // Edo
  'Benin City': 'Edo', Benin: 'Edo', Auchi: 'Edo', Ekpoma: 'Edo', Uromi: 'Edo',
  // Ekiti
  'Ado-Ekiti': 'Ekiti', Ado: 'Ekiti', Ikere: 'Ekiti', Ijero: 'Ekiti', Efon: 'Ekiti',
  // Enugu
  Enugu: 'Enugu', Nsukka: 'Enugu', Awgu: 'Enugu', 'Enugu-Ezike': 'Enugu',
  // FCT
  Abuja: 'FCT', Gwagwalada: 'FCT', Kubwa: 'FCT', Bwari: 'FCT',
  // Gombe
  Gombe: 'Gombe', Kumo: 'Gombe',
  // Imo
  Owerri: 'Imo', Orlu: 'Imo', Okigwe: 'Imo', Oguta: 'Imo',
  // Jigawa
  Dutse: 'Jigawa', Hadejia: 'Jigawa',
  // Kaduna
  Kaduna: 'Kaduna', Zaria: 'Kaduna', Kafanchan: 'Kaduna',
  // Kano
  Kano: 'Kano', Wudil: 'Kano',
  // Katsina
  Katsina: 'Katsina', Funtua: 'Katsina', Daura: 'Katsina',
  // Kebbi
  'Birnin Kebbi': 'Kebbi', Argungu: 'Kebbi',
  // Kogi
  Lokoja: 'Kogi', Okene: 'Kogi', Idah: 'Kogi',
  // Kwara
  Ilorin: 'Kwara', Offa: 'Kwara',
  // Lagos
  Lagos: 'Lagos', Ikeja: 'Lagos', Lekki: 'Lagos', Surulere: 'Lagos', Ikorodu: 'Lagos', Badagry: 'Lagos', Epe: 'Lagos', Victoria: 'Lagos',
  // Nasarawa
  Lafia: 'Nasarawa', Keffi: 'Nasarawa', Akwanga: 'Nasarawa',
  // Niger
  Minna: 'Niger', Bida: 'Niger', Kontagora: 'Niger', Suleja: 'Niger',
  // Ogun
  Abeokuta: 'Ogun', Ota: 'Ogun', Sagamu: 'Ogun', Ijebu: 'Ogun',
  // Ondo
  Akure: 'Ondo', Ondo: 'Ondo', Ore: 'Ondo', Owo: 'Ondo',
  // Osun
  Osogbo: 'Osun', 'Ile-Ife': 'Osun', Ife: 'Osun', Ilesa: 'Osun', Ede: 'Osun',
  // Oyo
  Ibadan: 'Oyo', Oyo: 'Oyo', Ogbomoso: 'Oyo', Iseyin: 'Oyo',
  // Plateau
  Jos: 'Plateau', Bukuru: 'Plateau',
  // Rivers
  'Port Harcourt': 'Rivers', Portharcourt: 'Rivers', 'Port-Harcourt': 'Rivers', Bonny: 'Rivers', Eleme: 'Rivers', Obio: 'Rivers', Omoku: 'Rivers',
  // Sokoto
  Sokoto: 'Sokoto', Tambuwal: 'Sokoto',
  // Taraba
  Jalingo: 'Taraba', Wukari: 'Taraba',
  // Yobe
  Damaturu: 'Yobe', Potiskum: 'Yobe',
  // Zamfara
  Gusau: 'Zamfara', Kaura: 'Zamfara',
}

// Normalizes state names ('Federal Capital Territory', 'Portharcourt', case, spacing)
export const normalizeState = (value?: string | null) => {
  if (!value) return undefined
  const cleaned = value.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!cleaned) return undefined
  if (cleaned === 'fct' || cleaned === 'federal capital territory' || cleaned === 'abuja' || cleaned === 'f.c.t') return 'FCT'
  const full = nigerianStates.find((state) => state.toLowerCase() === cleaned)
  if (full) return full
  const partial = nigerianStates.find((state) => cleaned.includes(state.toLowerCase()) || state.toLowerCase().includes(cleaned))
  return partial
}

// Infers the state for a listing from an explicit state field or a known city name.
export const stateForCity = (location?: { city?: string; state?: string } | null) => {
  if (!location) return undefined
  const explicit = normalizeState(location.state)
  if (explicit) return explicit
  const city = (location.city ?? '').trim().toLowerCase()
  if (!city) return undefined
  for (const [name, state] of Object.entries(CITY_TO_STATE)) {
    const normalized = name.toLowerCase()
    if (city === normalized || city.includes(normalized) || (normalized.length > 4 && normalized.includes(city))) return state
  }
  return undefined
}

// Property records are loaded from MongoDB at runtime. This module only contains presentation helpers.
export const olivHomes: Property[] = []
export const formatNaira = (value: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
export const getHome = (id: string) => olivHomes.find((home) => home._id === id)
export const homeImage = (home?: Property) => home?.images?.[0] ?? ''
