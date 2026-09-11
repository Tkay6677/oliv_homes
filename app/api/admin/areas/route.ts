import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/oliv-auth'
import { deleteAmassomaZone, listAmassomaZones, saveAmassomaZone } from '@/lib/oliv-db'
import type { AmassomaZone } from '@/lib/oliv-data'

export const runtime = 'nodejs'
const valid = (body: Record<string, unknown>) => {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 200) : ''
  const lat = Number(body.lat); const lng = Number(body.lng); const radius = Number(body.radius)
  if (name.length < 2 || description.length < 4 || !Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius) || radius < 50 || radius > 5000) return null
  return { name, description, center: { lat, lng }, radius } satisfies AmassomaZone
}
async function admin() { const user = await currentUser(); return user?.role === 'SUPER_ADMIN' ? user : null }
export async function GET() { if (!await admin()) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 }); return NextResponse.json({ areas: await listAmassomaZones() }) }
export async function POST(request: Request) {
  try { if (!await admin()) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 }); const body = await request.json().catch(() => ({})); const area = valid(body); if (!area) return NextResponse.json({ error: 'Use a name, description, coordinates, and a radius between 50 and 5000 metres.' }, { status: 400 }); return NextResponse.json({ area: await saveAmassomaZone(area) }, { status: 201 }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to save area.' }, { status: 500 }) }
}
export async function PATCH(request: Request) {
  try { if (!await admin()) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 }); const body = await request.json().catch(() => ({})); const area = valid(body); const originalName = typeof body.originalName === 'string' ? body.originalName : undefined; if (!area || !originalName) return NextResponse.json({ error: 'A valid area and originalName are required.' }, { status: 400 }); return NextResponse.json({ area: await saveAmassomaZone(area, originalName) }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update area.' }, { status: 500 }) }
}
export async function DELETE(request: Request) {
  try { if (!await admin()) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 }); const name = new URL(request.url).searchParams.get('name')?.trim() ?? ''; if (!name) return NextResponse.json({ error: 'Area name is required.' }, { status: 400 }); await deleteAmassomaZone(name); return NextResponse.json({ ok: true }) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to delete area.' }, { status: 404 }) }
}