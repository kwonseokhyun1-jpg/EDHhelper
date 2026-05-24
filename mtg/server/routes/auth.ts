import { Router } from 'express'
import { hashPassword, requireAuth, signToken, toAuthUser, verifyPassword } from '../auth.js'
import { prisma } from '../prisma.js'
import type { AuthedRequest } from '../auth.js'

export const authRouter = Router()

authRouter.post('/signup', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(req.body?.password ?? '')

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' })
      return
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' })
      return
    }

    const user = await prisma.user.create({
      data: { email, password: await hashPassword(password) },
    })

    const token = signToken(user.id)
    res.status(201).json({ user: toAuthUser(user), token })
  } catch (err) {
    console.error('signup error', err)
    res.status(500).json({ error: 'Could not create account.' })
  }
})

authRouter.post('/signin', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '')
      .trim()
      .toLowerCase()
    const password = String(req.body?.password ?? '')

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.password))) {
      res.status(401).json({ error: 'Wrong email or password.' })
      return
    }

    res.json({ user: toAuthUser(user), token: signToken(user.id) })
  } catch (err) {
    console.error('signin error', err)
    res.status(500).json({ error: 'Could not sign in.' })
  }
})

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: (req as unknown as AuthedRequest).user })
})
