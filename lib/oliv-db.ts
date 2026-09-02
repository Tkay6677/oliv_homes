import { ObjectId } from 'mongodb'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getMongoDb } from './mongodb'
import { ensureOlivIndexes } from './mongodb-indexes'
import type { Property, Review } from './types'

export type UserRole = 'USER' | 'AGENT' | 'SUPER_ADMIN'
export type OlivUser = { _id?: string; name: string; email: string; phone?: string; role: UserRole; agentVerificationLevel?: number; agentVerificationStatus?: string; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { lat: number; lng: number; address?: string; city?: string; state?: string }; agentSubmittedAt?: Date; agentReviewedAt?: Date; agentReviewedBy?: string; createdAt?: Date }

const dbReady = async () => { const db = await getMongoDb(); await ensureOlivIndexes(db); return db }
const hashPassword = (password: string, salt: string) => createHash('sha256').update(`${salt}:${password}`).digest('hex')
export const passwordDigest = (password: string) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${hashPassword(password, salt)}` }
export const passwordMatches = (password: string, stored: string) => { const [salt, digest] = stored.split(':'); return Boolean(salt && digest && hashPassword(password, salt) === digest) }
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value, (_, v) => v instanceof ObjectId ? v.toString() : v))
export const publicUser = (user: Record<string, unknown> | null) => { if (!user) return null; const { password, passwordHash, ...safe } = user; return safe }

export async function findUserByEmail(email: string) { const db = await dbReady(); return clean(await db.collection('users').findOne<OlivUser & { password: string }>({ email: email.toLowerCase().trim() })) }
export async function createUser(input: { name: string; email: string; password: string; role?: UserRole; phone?: string }) { const db = await dbReady(); const now = new Date(); const user = { name: input.name.trim(), email: input.email.toLowerCase().trim(), password: passwordDigest(input.password), role: input.role ?? 'USER', phone: input.phone, createdAt: now, updatedAt: now }; const result = await db.collection('users').insertOne(user); return clean({ ...user, _id: result.insertedId }) }
export async function createSession(userId: string) { const db = await dbReady(); const token = `${randomUUID()}-${randomBytes(24).toString('hex')}`; await db.collection('sessions').insertOne({ token, userId, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), createdAt: new Date() }); return token }
export async function getUserFromSession(token?: string) { if (!token) return null; const db = await dbReady(); const session = await db.collection('sessions').findOne<{ userId: string; expiresAt: Date }>({ token, expiresAt: { $gt: new Date() } }); if (!session) return null; return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(session.userId) })) }
export async function deleteSession(token: string) { const db = await dbReady(); await db.collection('sessions').deleteOne({ token }) }
export async function listProperties(query: Record<string, unknown> = {}) { const db = await dbReady(); return clean(await db.collection('properties').find(query).sort({ featured: -1, createdAt: -1 }).limit(100).toArray()) as unknown as Property[] }
export async function getProperty(id: string) { const db = await dbReady(); const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { slug: id }; return clean(await db.collection('properties').findOne(query)) as Property | null }
export async function listReviews(propertyId: string) { const db = await dbReady(); return clean(await db.collection('reviews').find({ propertyId, status: 'PUBLISHED' }).sort({ createdAt: -1 }).toArray()) as unknown as Review[] }
export async function addReview(input: Omit<Review, '_id' | 'createdAt' | 'updatedAt'>) { const db = await dbReady(); const now = new Date(); const result = await db.collection('reviews').insertOne({ ...input, status: 'PENDING', createdAt: now, updatedAt: now }); return clean({ ...input, _id: result.insertedId, createdAt: now, updatedAt: now }) }
export async function saveFavorite(userId: string, propertyId: string) { const db = await dbReady(); const existing = await db.collection('savedProperties').findOne({ userId, propertyId }); if (existing) { await db.collection('savedProperties').deleteOne({ _id: existing._id }); return false } await db.collection('savedProperties').insertOne({ userId, propertyId, createdAt: new Date() }); return true }
export async function getFavorites(userId: string) { const db = await dbReady(); return clean(await db.collection('savedProperties').find({ userId }).sort({ createdAt: -1 }).toArray()) }
export async function createRequest(input: Record<string, unknown>) { const db = await dbReady(); const result = await db.collection('viewingRequests').insertOne({ ...input, status: 'PENDING', createdAt: new Date() }); return result.insertedId.toString() }
export async function adminOverview() { const db = await dbReady(); const [users, properties, pendingReviews, requests] = await Promise.all([db.collection('users').countDocuments(), db.collection('properties').countDocuments(), db.collection('reviews').countDocuments({ status: 'PENDING' }), db.collection('viewingRequests').countDocuments({ status: 'PENDING' })]); return { users, properties, pendingReviews, requests } }

// Agent onboarding and verification
export async function updateUser(userId: string, patch: Record<string, unknown>) { const db = await dbReady(); await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { ...patch, updatedAt: new Date() } }); return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) })) }

export async function submitAgentApplication(userId: string, application: { name?: string; phone?: string; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { lat: number; lng: number; address?: string; city?: string; state?: string } }) {
  const db = await dbReady(); const now = new Date()
  const user = await db.collection('users').findOne<OlivUser & { password?: string }>({ _id: new ObjectId(userId) })
  if (!user) throw new Error('Account not found.')
  if (user.agentVerificationStatus === 'VERIFIED') throw new Error('This account is already a verified agent.')
  if (user.agentVerificationStatus === 'SUSPENDED') throw new Error('This account is suspended. Contact support.')
  const patch = { ...application, role: 'AGENT' as UserRole, agentVerificationStatus: 'SUBMITTED', agentSubmittedAt: now, updatedAt: now }
  if (application.name) patch.name = application.name
  await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: patch })
  await db.collection('auditLogs').insertOne({ actorId: userId, action: 'AGENT_APPLICATION_SUBMITTED', targetId: userId, createdAt: now })
  return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) }))
}

export async function listAgentsForReview() { const db = await dbReady(); return clean(await db.collection('users').find({ role: 'AGENT', agentVerificationStatus: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }, { projection: { password: 0 } }).sort({ agentSubmittedAt: 1 }).limit(50).toArray()) }

export async function setAgentVerification(userId: string, status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW' | 'SUSPENDED', level: number, reviewerId: string) {
  const db = await dbReady(); const now = new Date()
  const result = await db.collection('users').updateOne({ _id: new ObjectId(userId), role: 'AGENT' }, { $set: { agentVerificationStatus: status, agentVerificationLevel: level, agentReviewedAt: now, agentReviewedBy: reviewerId, updatedAt: now } })
  if (!result.matchedCount) throw new Error('Agent not found.')
  await db.collection('auditLogs').insertOne({ actorId: reviewerId, action: `AGENT_${status}`, targetId: userId, createdAt: now })
  return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) }))
}

// Agent workspace data
export async function listAgentProperties(agentId: string) { const db = await dbReady(); return clean(await db.collection('properties').find({ agentId }).sort({ createdAt: -1 }).limit(50).toArray()) as unknown as Property[] }
export async function agentRequestsSummary(agentId: string) { const db = await dbReady(); const [viewing, inquiries] = await Promise.all([db.collection('viewingRequests').countDocuments({ agentId, type: 'VIEWING' }), db.collection('viewingRequests').countDocuments({ agentId, type: 'INQUIRY' })]); return { viewing, inquiries } }
export async function createAgentProperty(agentId: string, input: {
  title: string; description: string; type: Property['type']; price: number
  location: Property['location']; bedrooms: number; bathrooms: number; squareMeters: number
  furnished: boolean; amenities: string[]; images: string[]; published: boolean
}) {
  const db = await dbReady(); const now = new Date()
  const document = { ...input, agentId, currency: 'NGN', verificationBadge: false, createdAt: now, updatedAt: now }
  const result = await db.collection('properties').insertOne(document)
  return clean({ ...document, _id: result.insertedId }) as unknown as Property
}

// Favorites and viewing requests
export async function listFavoritesWithHomes(userId: string) { const db = await dbReady(); const favorites = await db.collection('savedProperties').find({ userId }).sort({ createdAt: -1 }).toArray(); const ids = favorites.map((favorite) => { try { return new ObjectId(favorite.propertyId) } catch { return null } }).filter((id): id is ObjectId => id !== null); if (!ids.length) return []; const properties = await db.collection('properties').find({ _id: { $in: ids } }).toArray(); return clean(properties) }
export async function listRequestsForUser(userId: string) { const db = await dbReady(); return clean(await db.collection('viewingRequests').find({ userId }).sort({ createdAt: -1 }).limit(50).toArray()) }
export async function listRequestsForAgent(agentId: string) {
  const db = await dbReady()
  const requests = await db.collection('viewingRequests').find({ agentId }).sort({ createdAt: -1 }).limit(20).toArray()
  const ids = requests.map((request) => (ObjectId.isValid(request.propertyId) ? new ObjectId(request.propertyId) : null)).filter((id): id is ObjectId => id !== null)
  const titles = new Map<string, string>()
  if (ids.length) for (const property of await db.collection('properties').find({ _id: { $in: ids } }, { projection: { title: 1 } }).toArray()) titles.set(property._id.toString(), String(property.title ?? 'Listing'))
  return clean(requests.map((request) => ({ ...request, propertyTitle: titles.get(request.propertyId) ?? 'Listing' })))
}
