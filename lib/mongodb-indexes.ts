import type { Db } from 'mongodb'

let indexesReady: Promise<void> | null = null

export function ensureOlivIndexes(db: Db) {
  if (!indexesReady) {
    indexesReady = Promise.all([
      db.collection('properties').createIndex({ published: 1, 'location.city': 1, createdAt: -1 }),
      db.collection('properties').createIndex({ published: 1, type: 1, price: 1 }),
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('savedProperties').createIndex({ userId: 1, propertyId: 1 }, { unique: true }),
      db.collection('viewingRequests').createIndex({ agentId: 1, status: 1, preferredDate: 1 }),
      db.collection('notifications').createIndex({ recipientId: 1, readAt: 1, createdAt: -1 }),
      db.collection('reviews').createIndex({ propertyId: 1, status: 1, createdAt: -1 }),
      db.collection('reports').createIndex({ status: 1, createdAt: -1 }),
      db.collection('auditLogs').createIndex({ actorId: 1, createdAt: -1 }),
    ]).then(() => undefined)
  }
  return indexesReady
}
