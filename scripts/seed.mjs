import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'
import { createHash, randomBytes } from 'node:crypto'

const fileEnv = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter((line) => line.includes('=') && !line.trim().startsWith('#')).map((line) => {
  const separator = line.indexOf('=')
  return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')]
}))
const env = { ...fileEnv, ...process.env }
const uri = env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required in .env or the shell environment')

const client = new MongoClient(uri, { appName: 'oliv-homes-seed' })
const digest = (password) => {
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${createHash('sha256').update(`${salt}:${password}`).digest('hex')}`
}
const now = new Date()

await client.connect()
const db = client.db(env.MONGODB_DB ?? 'oliv_homes')
await db.dropDatabase()

const users = [
  { name: 'Ada Okoro', email: 'user@olivhomes.ng', phone: '+234 801 000 0001', password: digest('OlivUser2026!'), role: 'USER' },
  { name: 'Chidi Ebi', email: 'agent@olivhomes.ng', phone: '+234 803 000 0002', password: digest('OlivAgent2026!'), role: 'AGENT', agentVerificationStatus: 'VERIFIED', agentVerificationLevel: 3, agentCompanyName: 'Ebi Homes Amassoma', agentLicenseNumber: 'BAY-AG-003' },
  { name: 'OLIV Admin', email: 'admin@olivhomes.ng', phone: '+234 805 000 0003', password: digest('OlivAdmin2026!'), role: 'SUPER_ADMIN', agentVerificationStatus: 'VERIFIED', agentVerificationLevel: 3 },
]
await db.collection('users').insertMany(users.map((user) => ({ ...user, createdAt: now, updatedAt: now })))
const agent = await db.collection('users').findOne({ email: 'agent@olivhomes.ng' })
const agentId = agent?._id?.toString() ?? 'seed-agent'

const properties = [
  {
    slug: 'amassoma-riverside-court', agentId, title: 'Amassoma Riverside Court',
    description: 'A bright three-bedroom family apartment with reliable water, secure parking and easy access to central Amassoma.',
    type: 'apartment', price: 1250000, currency: 'NGN',
    location: { address: 'Amassoma Waterfront Road', city: 'Amassoma', area: 'Mango Street', state: 'Bayelsa', postalCode: '560001', country: 'Nigeria', coordinates: { lat: 4.9730872, lng: 6.1089697 } },
    bedrooms: 3, bathrooms: 3, squareMeters: 185, furnished: true, amenities: ['24/7 security', 'Parking', 'Water supply'],
    images: ['https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85'], verificationBadge: true, published: true,
  },
  {
    slug: 'ndu-road-family-home', agentId, title: 'NDU Road Family Home',
    description: 'A spacious four-bedroom home in a quiet compound near Niger Delta University, suitable for families and visiting professionals.',
    type: 'house', price: 8500000, currency: 'NGN',
    location: { address: 'NDU Road, Amassoma', city: 'Amassoma', area: 'Main Gate Axis', state: 'Bayelsa', postalCode: '560001', country: 'Nigeria', coordinates: { lat: 4.9700642, lng: 6.1020796 } },
    bedrooms: 4, bathrooms: 4, squareMeters: 260, furnished: false, amenities: ['Gated compound', 'Generator', 'Family lounge'],
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85'], verificationBadge: true, published: true,
  },
  {
    slug: 'scholars-lodge-amassoma', agentId, title: 'Scholars Lodge Amassoma',
    description: 'A furnished two-bedroom lodge with a practical layout for lecturers, postgraduate students and working professionals.',
    type: 'studio', price: 900000, currency: 'NGN',
    location: { address: 'University Community Road, Amassoma', city: 'Amassoma', area: 'CHS Area', state: 'Bayelsa', postalCode: '560001', country: 'Nigeria', coordinates: { lat: 4.9761, lng: 6.1132 } },
    bedrooms: 2, bathrooms: 2, squareMeters: 95, furnished: true, amenities: ['Furnished', 'Prepaid meter', 'Internet ready'],
    images: ['https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85'], verificationBadge: true, published: true,
  },
]
await db.collection('properties').insertMany(properties.map((property) => ({ ...property, createdAt: now, updatedAt: now })))

const ada = await db.collection('users').findOne({ email: 'user@olivhomes.ng' })
const riverside = await db.collection('properties').findOne({ slug: 'amassoma-riverside-court' })
if (riverside && ada && agent) {
  await db.collection('reviews').insertMany([
    { propertyId: riverside._id.toString(), userId: ada._id.toString(), authorName: ada.name, rating: 5, text: 'Quiet compound, good water supply and a convenient location for getting around Amassoma.', status: 'PUBLISHED', createdAt: now, updatedAt: now },
    { propertyId: riverside._id.toString(), userId: agent._id.toString(), authorName: agent.name, rating: 4, text: 'Well maintained and secure, with generous parking for residents and visitors.', status: 'PUBLISHED', createdAt: now, updatedAt: now },
  ])
}

console.log(`Reset ${db.databaseName} and seeded ${users.length} users with ${properties.length} Amassoma listings.`)
await client.close()
