// Small request/response helpers shared by the OLIV API routes.

export const textQuery = (value: unknown, maxLength = 120) => {
  if (typeof value !== 'string') return undefined
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned ? cleaned.slice(0, maxLength) : undefined
}

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const parsePage = (value: unknown) => {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1
}

export const parseLimit = (value: unknown) => {
  const limit = Number(value)
  return Number.isInteger(limit) && limit > 0 ? Math.min(limit, 48) : 12
}

export const ok = (data: Record<string, unknown>, status = 200) => Response.json({ success: true, ...data }, { status })

export const serverError = () => Response.json({ success: false, error: 'Unexpected server error. Please try again.' }, { status: 500 })