import { NextResponse } from 'next/server'
import { listAmassomaZones } from '@/lib/oliv-db'

export const runtime = 'nodejs'

export async function GET() {
  try { return NextResponse.json({ areas: await listAmassomaZones() }) }
  catch (error) { console.error('[oliv] areas failed:', error); return NextResponse.json({ error: 'Unable to load areas.' }, { status: 500 }) }
}