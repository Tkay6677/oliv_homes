import { cookies } from 'next/headers'
import { getUserFromSession } from './oliv-db'

export const SESSION_COOKIE = 'oliv_session'
export async function currentUser() { const store = await cookies(); return getUserFromSession(store.get(SESSION_COOKIE)?.value) }
export async function requireRole(roles: string[]) { const user = await currentUser(); if (!user || !roles.includes(user.role)) throw new Error('FORBIDDEN'); return user }
