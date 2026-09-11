import { ObjectId } from 'mongodb'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { getMongoDb } from './mongodb'
import { ensureOlivIndexes } from './mongodb-indexes'
import type { Property, Review } from './types'
import { AMASSOMA_ZONES, type AmassomaZone } from './oliv-data'

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
export async function addReview(input: Omit<Review, '_id' | 'createdAt' | 'updatedAt' | 'status'>, status: Review['status'] = 'PUBLISHED') {
  const db = await dbReady(); const now = new Date(); const result = await db.collection('reviews').insertOne({ ...input, status, createdAt: now, updatedAt: now })
  const review = clean({ ...input, status, _id: result.insertedId, createdAt: now, updatedAt: now }) as unknown as Review & { _id: string }
  // Notify the listing's agent about a new review (skip self-reviews).
  try {
    const property = await getProperty(input.propertyId)
    if (property?.agentId && String(property.agentId) !== input.userId) {
      await createNotification({ recipientId: String(property.agentId), type: 'REVIEW_RECEIVED', title: 'New review on your listing', body: `${property.title} received a ${input.rating}-star review from ${input.authorName}.`, link: `/listing/${input.propertyId}` })
    }
  } catch (error) { console.error('[oliv] review notification failed:', error) }
  return review
}
// Published reviews across all listings, plus any pending reviews the current user authored (so they persist across refreshes).
export async function listReviewsVisible(userId?: string) {
  const db = await dbReady()
  if (userId) {
    const [published, mine] = await Promise.all([
      db.collection('reviews').find({ status: 'PUBLISHED' }).sort({ createdAt: -1 }).limit(300).toArray(),
      db.collection('reviews').find({ userId, status: { $in: ['PENDING', 'REPORTED'] } }).sort({ createdAt: -1 }).toArray(),
    ])
    return clean([...mine, ...published]) as unknown as Review[]
  }
  return clean(await db.collection('reviews').find({ status: 'PUBLISHED' }).sort({ createdAt: -1 }).limit(300).toArray()) as unknown as Review[]
}
export async function listReviewsForProperty(propertyId: string, userId?: string) {
  const db = await dbReady()
  const filter: Record<string, unknown> = { propertyId }
  const base = { ...filter, status: 'PUBLISHED' }
  if (userId) {
    const [published, mine] = await Promise.all([
      db.collection('reviews').find(base).sort({ createdAt: -1 }).toArray(),
      db.collection('reviews').find({ propertyId, userId, status: { $in: ['PENDING', 'REPORTED'] } }).toArray(),
    ])
    return clean([...mine, ...published]) as unknown as Review[]
  }
  return clean(await db.collection('reviews').find(base).sort({ createdAt: -1 }).toArray()) as unknown as Review[]
}
export async function saveFavorite(userId: string, propertyId: string) { const db = await dbReady(); const existing = await db.collection('savedProperties').findOne({ userId, propertyId }); if (existing) { await db.collection('savedProperties').deleteOne({ _id: existing._id }); return false } await db.collection('savedProperties').insertOne({ userId, propertyId, createdAt: new Date() }); return true }
export async function getFavorites(userId: string) { const db = await dbReady(); return clean(await db.collection('savedProperties').find({ userId }).sort({ createdAt: -1 }).toArray()) }

// ---- Notifications ----
export async function createNotification(input: { recipientId: string; type: string; title: string; body?: string; link?: string }) {
  const db = await dbReady(); const now = new Date()
  const result = await db.collection('notifications').insertOne({ ...input, body: input.body ?? '', link: input.link ?? '', readAt: null, createdAt: now })
  return clean({ ...input, body: input.body ?? '', link: input.link ?? '', readAt: null, createdAt: now, _id: result.insertedId })
}
export async function notifyAdmins(type: string, title: string, body?: string, link?: string) {
  const db = await dbReady()
  const admins = await db.collection('users').find({ role: 'SUPER_ADMIN' }, { projection: { _id: 1 } }).toArray()
  const now = new Date()
  if (!admins.length) return
  await db.collection('notifications').insertMany(admins.map((admin) => ({ recipientId: String(admin._id), type, title, body: body ?? '', link: link ?? '', readAt: null, createdAt: now })))
}
export async function listNotificationsForUser(userId: string, limit = 40) { const db = await dbReady(); return clean(await db.collection('notifications').find({ recipientId: userId }).sort({ createdAt: -1 }).limit(limit).toArray()) }
export async function unreadNotificationsCount(userId: string) { const db = await dbReady(); return db.collection('notifications').countDocuments({ recipientId: userId, readAt: null }) }
export async function markNotificationsRead(userId: string, ids?: string[], read = true) {
  const db = await dbReady()
  const filter: Record<string, unknown> = { recipientId: userId }
  if (ids?.length) filter._id = { $in: ids.map((id) => { try { return new ObjectId(id) } catch { return id } }) }
  const set: Record<string, unknown> = read ? { readAt: new Date() } : { readAt: null }
  const result = await db.collection('notifications').updateMany(filter, { $set: set })
  return { modifiedCount: result.modifiedCount }
}
export async function createRequest(input: Record<string, unknown>) {
  const db = await dbReady(); const result = await db.collection('viewingRequests').insertOne({ ...input, status: 'PENDING', createdAt: new Date() })
  const id = result.insertedId.toString()
  // Notify the listing's agent about the new viewing request or inquiry.
  try {
    const agentId = String(input.agentId ?? '')
    if (agentId) {
      const property = await getProperty(String(input.propertyId ?? ''))
      const isInquiry = input.type === 'INQUIRY'
      await createNotification({
        recipientId: agentId,
        type: isInquiry ? 'INQUIRY' : 'VIEWING_REQUEST',
        title: isInquiry ? 'New inquiry on your listing' : 'New viewing request',
        body: isInquiry
          ? `${property?.title ?? 'Your listing'} — a renter sent you a message.`
          : `${property?.title ?? 'Your listing'} — a renter requested a viewing.`,
        link: '/agent/dashboard?tab=requests',
      })
    }
  } catch (error) { console.error('[oliv] request notification failed:', error) }
  return id
}
// Agent-side request flow: update status + store the agent's reply (for inquiries), refreshed timestamps.
export async function updateRequestStatus(requestId: string, agentId: string, patch: { status?: string; agentReply?: string }) {
  const db = await dbReady()
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (patch.status) update.status = patch.status
  if (typeof patch.agentReply === 'string') update.agentReply = patch.agentReply.slice(0, 1000)
  const result = await db.collection('viewingRequests').updateOne({ _id: new ObjectId(requestId), agentId }, { $set: update })
  if (!result.matchedCount) throw new Error('Request not found for this agent.')
  const updated = clean(await db.collection('viewingRequests').findOne({ _id: new ObjectId(requestId) })) as Record<string, unknown>
  // Notify the renter about the outcome (confirmed / declined / completed / reply).
  try {
    const recipientId = String(updated.userId ?? '')
    const status = String(updated.status ?? '')
    if (recipientId) {
      const property = await getProperty(String(updated.propertyId ?? ''))
      const title = property?.title ?? 'Your listing request'
      const listingLink = `/listing/${updated.propertyId}`
      const isInquiry = updated.type === 'INQUIRY'
      if (status === 'CONFIRMED') await createNotification({ recipientId, type: 'VIEWING_CONFIRMED', title: 'Viewing confirmed', body: `Your viewing for ${title} was confirmed. The agent is expecting you.`, link: listingLink })
      else if (status === 'COMPLETED') await createNotification({ recipientId, type: 'VIEWING_COMPLETED', title: 'Viewing marked completed', body: `Your viewing for ${title} was marked completed.`, link: listingLink })
      else if (status === 'CANCELLED') await createNotification({ recipientId, type: 'VIEWING_DECLINED', title: 'Viewing declined', body: `Your viewing request for ${title} was declined by the agent.`, link: listingLink })
      else if (status === 'REPLIED' && isInquiry) await createNotification({ recipientId, type: 'INQUIRY_REPLIED', title: 'The agent replied', body: `An agent replied to your inquiry about ${title}.`, link: listingLink })
    }
  } catch (error) { console.error('[oliv] request update notification failed:', error) }
  return updated
}
export async function listAgentReviews(agentId: string) {
  const db = await dbReady()
  const properties = await db.collection('properties').find({ agentId }).toArray()
  if (!properties.length) return []
  const titles = new Map(properties.map((property) => [String(property._id), String(property.title ?? 'Listing')]))
  const reviews = await db.collection('reviews').find({ propertyId: { $in: [...titles.keys()] }, status: { $ne: 'HIDDEN' } }).sort({ createdAt: -1 }).limit(100).toArray()
  return clean(reviews.map((review) => ({ ...review, propertyTitle: titles.get(review.propertyId) ?? 'Listing' })))
}
// Editable agent profile fields (reused by the dashboard settings).
export async function updateAgentProfile(userId: string, patch: { phone?: string; agentCompanyName?: string; agentLicenseNumber?: string; agentBio?: string; agentStatesServed?: string[]; agentOfficeLocation?: { lat: number; lng: number; address?: string; city?: string; state?: string } }) {
  const db = await dbReady()
  const update: Record<string, unknown> = { updatedAt: new Date() }
  if (typeof patch.phone === 'string') update.phone = patch.phone.trim().slice(0, 40)
  if (typeof patch.agentCompanyName === 'string') update.agentCompanyName = patch.agentCompanyName.trim().slice(0, 80)
  if (typeof patch.agentLicenseNumber === 'string') update.agentLicenseNumber = patch.agentLicenseNumber.trim().slice(0, 60)
  if (typeof patch.agentBio === 'string') update.agentBio = patch.agentBio.trim().slice(0, 1200)
  if (Array.isArray(patch.agentStatesServed)) update.agentStatesServed = patch.agentStatesServed.map((item) => String(item).slice(0, 40)).filter(Boolean).slice(0, 20)
  if (patch.agentOfficeLocation && Number.isFinite(patch.agentOfficeLocation.lat) && Number.isFinite(patch.agentOfficeLocation.lng)) update.agentOfficeLocation = { lat: patch.agentOfficeLocation.lat, lng: patch.agentOfficeLocation.lng, address: (patch.agentOfficeLocation.address ?? '').slice(0, 200), city: (patch.agentOfficeLocation.city ?? '').slice(0, 60), state: (patch.agentOfficeLocation.state ?? '').slice(0, 60) }
  await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: update })
  return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) }))
}
export async function adminOverview() { const db = await dbReady(); const [users, properties, pendingReviews, requests] = await Promise.all([db.collection('users').countDocuments(), db.collection('properties').countDocuments(), db.collection('reviews').countDocuments({ status: 'PENDING' }), db.collection('viewingRequests').countDocuments({ status: 'PENDING' })]); return { users, properties, pendingReviews, requests } }

export async function listAmassomaZones() {
  const db = await dbReady()
  const stored = await db.collection<AmassomaZone>('marketAreas').find({ market: 'Amassoma' }).sort({ name: 1 }).toArray()
  if (stored.length) return clean(stored)
  const now = new Date()
  await db.collection('marketAreas').insertMany(AMASSOMA_ZONES.map((area) => ({ market: 'Amassoma', ...area, createdAt: now, updatedAt: now })))
  return AMASSOMA_ZONES
}
export async function saveAmassomaZone(input: AmassomaZone, originalName?: string) {
  const db = await dbReady(); const now = new Date()
  const filter = { market: 'Amassoma', name: originalName ?? input.name }
  await db.collection('marketAreas').updateOne(filter, { $set: { market: 'Amassoma', ...input, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true })
  const saved = await db.collection<AmassomaZone>('marketAreas').findOne({ market: 'Amassoma', name: input.name })
  if (!saved) throw new Error('The area was not saved. Please try again.')
  return clean(saved)
}
export async function deleteAmassomaZone(name: string) {
  const db = await dbReady(); const result = await db.collection('marketAreas').deleteOne({ market: 'Amassoma', name })
  if (!result.deletedCount) throw new Error('Area not found.')
}

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
  await notifyAdmins('AGENT_APPLICATION', 'New agent application', `${application.name ?? user.name} (${user.email}) submitted an application for review.`, '/admin')
  return clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) }))
}

export async function listAgentsForReview() { const db = await dbReady(); return clean(await db.collection('users').find({ role: 'AGENT', agentVerificationStatus: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }, { projection: { password: 0 } }).sort({ agentSubmittedAt: 1 }).limit(50).toArray()) }

export async function setAgentVerification(userId: string, status: 'VERIFIED' | 'REJECTED' | 'UNDER_REVIEW' | 'SUSPENDED', level: number, reviewerId: string) {
  const db = await dbReady(); const now = new Date()
  const result = await db.collection('users').updateOne({ _id: new ObjectId(userId), role: 'AGENT' }, { $set: { agentVerificationStatus: status, agentVerificationLevel: level, agentReviewedAt: now, agentReviewedBy: reviewerId, updatedAt: now } })
  if (!result.matchedCount) throw new Error('Agent not found.')
  await db.collection('auditLogs').insertOne({ actorId: reviewerId, action: `AGENT_${status}`, targetId: userId, createdAt: now })
  // Notify the agent about the verification outcome.
  const agent = clean(await db.collection('users').findOne<OlivUser>({ _id: new ObjectId(userId) }))
  const label = { VERIFIED: 'approved', REJECTED: 'not approved', SUSPENDED: 'suspended', UNDER_REVIEW: 'moved to review' }[status] ?? status
  const typeByStatus: Record<string, string> = { VERIFIED: 'VERIFICATION_APPROVED', REJECTED: 'VERIFICATION_REJECTED', SUSPENDED: 'VERIFICATION_SUSPENDED', UNDER_REVIEW: 'VERIFICATION_UNDER_REVIEW' }
  await createNotification({ recipientId: userId, type: typeByStatus[status] ?? 'SYSTEM', title: 'Agent application update', body: `Your agent application was ${label}.`, link: '/agent/onboarding' })
  return agent
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
  const property = clean({ ...document, _id: result.insertedId }) as unknown as Property & { _id: string }
  if (input.published) {
    await notifyAdmins('LISTING_PUBLISHED', 'New listing published', `${property.title} was published by an agent.`, `/listing/${result.insertedId}`)
  }
  return property
}
export async function updateAgentProperty(agentId: string, propertyId: string, input: {
  title: string; description: string; type: Property['type']; price: number
  location: Property['location']; bedrooms: number; bathrooms: number; squareMeters: number
  furnished: boolean; amenities: string[]; images: string[]; published: boolean
}) {
  if (!ObjectId.isValid(propertyId)) throw new Error('Listing not found.')
  const db = await dbReady(); const now = new Date()
  const result = await db.collection('properties').findOneAndUpdate({ _id: new ObjectId(propertyId), agentId }, { $set: { ...input, updatedAt: now } }, { returnDocument: 'after' })
  if (!result) throw new Error('Listing not found.')
  return clean(result) as unknown as Property
}
export async function deleteAgentProperty(agentId: string, propertyId: string) {
  if (!ObjectId.isValid(propertyId)) throw new Error('Listing not found.')
  const db = await dbReady(); const _id = new ObjectId(propertyId)
  const result = await db.collection('properties').deleteOne({ _id, agentId })
  if (!result.deletedCount) throw new Error('Listing not found.')
  await Promise.all([
    db.collection('savedProperties').deleteMany({ propertyId }),
    db.collection('reviews').deleteMany({ propertyId }),
    db.collection('viewingRequests').deleteMany({ propertyId }),
  ])
}

// Favorites and viewing requests
export async function listFavoritesWithHomes(userId: string) { const db = await dbReady(); const favorites = await db.collection('savedProperties').find({ userId }).sort({ createdAt: -1 }).toArray(); const ids = favorites.map((favorite) => { try { return new ObjectId(favorite.propertyId) } catch { return null } }).filter((id): id is ObjectId => id !== null); if (!ids.length) return []; const properties = await db.collection('properties').find({ _id: { $in: ids } }).toArray(); return clean(properties) }
export async function listRequestsForUser(userId: string) { const db = await dbReady(); return clean(await db.collection('viewingRequests').find({ userId }).sort({ createdAt: -1 }).limit(50).toArray()) }
export async function listRequestsForAgent(agentId: string) {
  const db = await dbReady()
  const requests = await db.collection('viewingRequests').find({ agentId }).sort({ createdAt: -1 }).limit(50).toArray()
  const propertyIds = requests.map((request) => (ObjectId.isValid(request.propertyId) ? new ObjectId(request.propertyId) : null)).filter((id): id is ObjectId => id !== null)
  const userIds = requests.map((request) => (ObjectId.isValid(request.userId) ? new ObjectId(request.userId) : null)).filter((id): id is ObjectId => id !== null)
  const titles = new Map<string, string>()
  const people = new Map<string, { name: string; email?: string }>()
  if (propertyIds.length) for (const property of await db.collection('properties').find({ _id: { $in: propertyIds } }, { projection: { title: 1 } }).toArray()) titles.set(property._id.toString(), String(property.title ?? 'Listing'))
  if (userIds.length) for (const user of await db.collection('users').find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } }).toArray()) people.set(user._id.toString(), { name: String(user.name ?? 'Renter'), email: user.email ? String(user.email) : undefined })
  return clean(requests.map((request) => ({ ...request, propertyTitle: titles.get(request.propertyId) ?? 'Listing', userName: people.get(request.userId)?.name ?? 'Renter', userEmail: people.get(request.userId)?.email })))
}
