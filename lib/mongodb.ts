import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI
const options = { appName: 'oliv-homes' }

if (!uri && process.env.NODE_ENV === 'production') {
  console.warn('[v0] MONGODB_URI is not configured; persistence routes will remain unavailable.')
}

type MongoCache = { client: MongoClient | null; promise: Promise<MongoClient> | null }
const globalWithMongo = globalThis as typeof globalThis & { __olivMongo?: MongoCache }
const cached = globalWithMongo.__olivMongo ?? { client: null, promise: null }
globalWithMongo.__olivMongo = cached

export async function getMongoDb(): Promise<Db> {
  if (!uri) throw new Error('MONGODB_URI is required for OLIV Homes persistence.')
  const dbName = process.env.MONGODB_DB ?? 'oliv_homes'
  if (cached.client) return cached.client.db(dbName)
  if (!cached.promise) cached.promise = new MongoClient(uri, options).connect()
  cached.client = await cached.promise
  return cached.client.db(dbName)
}
