// End-to-end test: agent onboarding + admin verification + agent overview
// Usage: node scripts/e2e-onboarding.mjs [baseUrl]
import { MongoClient } from 'mongodb'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3002'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]))
const stamp = Date.now().toString(36)
let failures = 0
const check = (label, condition, detail = '') => { console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`); if (!condition) failures++ }
const digest = (password) => { const salt = randomBytes(16).toString('hex'); return `${salt}:${createHash('sha256').update(`${salt}:${password}`).digest('hex')}` }

const jar = {}
const call = async (path, { method = 'GET', body, cookieKey = 'default' } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(jar[cookieKey] ? { cookie: jar[cookieKey] } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  for (const cookie of response.headers.getSetCookie?.() ?? []) { const [pair] = cookie.split(';'); if (pair.includes('=')) jar[cookieKey] = pair }
  const json = await response.json().catch(() => ({}))
  return { status: response.status, json }
}

const main = async () => {
  console.log(`E2E against ${base}`)
  const email = `e2e-agent-${stamp}@olivtest.ng`
  const signup = await call('/api/auth', { method: 'POST', body: { action: 'signup', name: 'Test Agent', email, password: 'TestAgent2026!' } })
  check('signup creates agent account', signup.status === 200, `status ${signup.status} ${JSON.stringify(signup.json).slice(0, 120)}`)

  const before = await call('/api/agent/onboarding')
  check('GET onboarding offers submission', before.status === 200 && before.json.canSubmit === true, `status ${before.status} canSubmit=${before.json.canSubmit}`)
  check('GET onboarding never leaks password', Boolean(before.json.user) && !JSON.stringify(before.json.user).includes('"password"'))

  const missing = await call('/api/agent/onboarding', { method: 'POST', body: { name: 'T', phone: '123' } })
  check('onboarding rejects incomplete payload', missing.status === 400, `status ${missing.status} error=${missing.json.error}`)

  const submit = await call('/api/agent/onboarding', {
    method: 'POST',
    body: { name: 'Chidi Test', phone: '+234 803 555 0100', companyName: 'Test Homes Ltd', licenseNumber: 'BAY-E2E-001', bio: 'E2E verification agent.', statesServed: ['Bayelsa', 'Rivers'], officeLocation: { lat: 4.9267, lng: 6.2676, address: '201 Sani Abacha Way', city: 'Yenagoa', state: 'Bayelsa' } },
  })
  check('onboarding accepts valid application', submit.status === 200, `status ${submit.status} ${JSON.stringify(submit.json).slice(0, 160)}`)
  check('application lands in SUBMITTED', submit.json.user?.agentVerificationStatus === 'SUBMITTED', `status=${submit.json.user?.agentVerificationStatus}`)
  check('office location persisted', submit.json.user?.agentOfficeLocation?.city === 'Yenagoa' && Number(submit.json.user?.agentOfficeLocation?.lat) === 4.9267, JSON.stringify(submit.json.user?.agentOfficeLocation))

  const after = await call('/api/agent/onboarding')
  check('GET onboarding locks after submit', after.json.canSubmit === false && after.json.user?.agentVerificationStatus === 'SUBMITTED', `canSubmit=${after.json.canSubmit}`)

  const forbidden = await call('/api/admin/verification')
  check('non-admin blocked from verification queue', forbidden.status === 403, `status ${forbidden.status}`)

  let adminLogin = await call('/api/auth', { method: 'POST', cookieKey: 'admin', body: { action: 'login', email: 'admin@olivhomes.ng', password: 'OlivAdmin2026!' } })
  if (adminLogin.status !== 200) {
    console.log('  (seed admin missing — bootstrapping one via MongoDB)')
    const client = new MongoClient(env.MONGODB_URI)
    await client.connect()
    await client.db(env.MONGODB_DB ?? 'oliv_homes').collection('users').updateOne(
      { email: 'admin@olivhomes.ng' },
      { $set: { name: 'OLIV Admin', email: 'admin@olivhomes.ng', role: 'SUPER_ADMIN', password: digest('OlivAdmin2026!'), updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    )
    await client.close()
    adminLogin = await call('/api/auth', { method: 'POST', cookieKey: 'admin', body: { action: 'login', email: 'admin@olivhomes.ng', password: 'OlivAdmin2026!' } })
  }
  check('admin can sign in', adminLogin.status === 200, `status ${adminLogin.status}`)

  const queue = await call('/api/admin/verification', { cookieKey: 'admin' })
  const queued = (queue.json.queue ?? []).find((agent) => agent.email === email)
  check('queue contains the application', queue.status === 200 && Boolean(queued), `status ${queue.status} count=${(queue.json.queue ?? []).length}`)
  check('queue never leaks password hashes', !JSON.stringify(queue.json).includes('"password"'))

  const approve = await call('/api/admin/verification', { method: 'POST', cookieKey: 'admin', body: { userId: queued?._id, action: 'approve' } })
  check('admin approves application', approve.status === 200 && approve.json.agent?.agentVerificationStatus === 'VERIFIED', `status ${approve.status} ${JSON.stringify(approve.json).slice(0, 140)}`)

  const verified = await call('/api/agent/onboarding')
  check('agent sees VERIFIED status', verified.json.user?.agentVerificationStatus === 'VERIFIED' && verified.json.canSubmit === false, `status=${verified.json.user?.agentVerificationStatus} canSubmit=${verified.json.canSubmit}`)

  const overview = await call('/api/agent/overview')
  check('agent workspace loads with metrics', overview.status === 200 && typeof overview.json.metrics?.activeListings === 'number', `status ${overview.status} metrics=${JSON.stringify(overview.json.metrics)}`)
  check('workspace echoes company + states', overview.json.agent?.agentCompanyName === 'Test Homes Ltd' && (overview.json.agent?.agentStatesServed ?? []).includes('Bayelsa'))

  // --- Listing creation flow ---
  const anonListing = await call('/api/agent/properties', { method: 'POST', cookieKey: 'anon', body: { title: 'Should not work' } })
  check('anonymous listing creation blocked', anonListing.status === 401, `status ${anonListing.status}`)

  const badListing = await call('/api/agent/properties', { method: 'POST', body: { title: 'No', description: 'too short', type: 'apartment', price: 10, address: 'x', city: '', bedrooms: 1, bathrooms: 1, squareMeters: 10 } })
  check('invalid listing payload rejected', badListing.status === 400, `status ${badListing.status} error=${badListing.json.error}`)

  const listing = await call('/api/agent/properties', {
    method: 'POST',
    body: {
      title: 'E2E Map-Pinned Apartment',
      description: 'A bright two-bedroom created by the automated E2E run with a pinned location.',
      type: 'apartment', price: 1450000,
      location: { address: '12 E2E Crescent', city: 'Yenagoa', postalCode: '560001', coordinates: { lat: 4.9267, lng: 6.2676 } },
      bedrooms: 2, bathrooms: 2, squareMeters: 110, furnished: true,
      amenities: ['24/7 security', 'Parking'], images: ['https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85'],
      published: true,
    },
  })
  check('listing created with map coordinates', listing.status === 201 && listing.json.property?.location?.coordinates?.lat === 4.9267, `status ${listing.status} ${JSON.stringify(listing.json).slice(0, 160)}`)
  check('listing owned by agent + NGN', listing.json.property?.agentId && listing.json.property?.currency === 'NGN', `agentId=${listing.json.property?.agentId}`)

  const myListings = await call('/api/agent/properties')
  check('listing appears in agent workspace list', myListings.status === 200 && (myListings.json.properties ?? []).some((item) => item.title === 'E2E Map-Pinned Apartment'), `status ${myListings.status} count=${(myListings.json.properties ?? []).length}`)

  const publicListings = await call('/api/properties')
  check('published listing visible on public discover API', (publicListings.json.items ?? []).some((item) => item.title === 'E2E Map-Pinned Apartment'), `status ${publicListings.status} count=${(publicListings.json.items ?? []).length}`)

  const uploadWithoutKeys = await call('/api/upload', { method: 'POST' })
  check('upload endpoint reports config state cleanly', [503, 400].includes(uploadWithoutKeys.status) || uploadWithoutKeys.status === 201, `status ${uploadWithoutKeys.status} error=${uploadWithoutKeys.json.error ?? 'configured'}`)

  console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed.')
  process.exit(failures ? 1 : 0)
}
main().catch((error) => { console.error('E2E crashed:', error); process.exit(1) })