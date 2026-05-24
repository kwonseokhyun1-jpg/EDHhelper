import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { prisma } from './prisma.js'

const JWT_SECRET = process.env.JWT_SECRET?.trim() || 'dev-secret-change-me'

export type AuthUser = {
  id: string
  email: string
}

export type AuthedRequest = Request & { user: AuthUser }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (typeof payload === 'string' || !payload.sub) return null
    return { sub: payload.sub }
  } catch {
    return null
  }
}

export function toAuthUser(user: { id: string; email: string }): AuthUser {
  return { id: user.id, email: user.email }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sign in to continue.' })
    return
  }

  const payload = verifyToken(header.slice(7))
  if (!payload) {
    res.status(401).json({ error: 'Session expired. Sign in again.' })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) {
    res.status(401).json({ error: 'Account not found.' })
    return
  }

  ;(req as AuthedRequest).user = toAuthUser(user)
  next()
}
