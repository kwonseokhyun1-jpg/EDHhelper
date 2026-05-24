import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { prisma } from '../prisma.js'
import type { AuthedRequest } from '../auth.js'

export const decksRouter = Router()

decksRouter.use(requireAuth)

function extractCommanderName(listText: string): string | null {
  const lines = listText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return null
  const last = lines[lines.length - 1]
  const match = last.match(/^(\d+)x?\s+(.+)$/i)
  return match ? match[2].trim() : last
}

function serializeDeck(deck: {
  id: string
  userId: string
  name: string
  listText: string
  commanderName: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: deck.id,
    user_id: deck.userId,
    name: deck.name,
    list_text: deck.listText,
    commander_name: deck.commanderName,
    created_at: deck.createdAt.toISOString(),
    updated_at: deck.updatedAt.toISOString(),
  }
}

decksRouter.get('/', async (req, res) => {
  const user = (req as unknown as AuthedRequest).user
  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  })
  res.json({ decks: decks.map(serializeDeck) })
})

decksRouter.post('/', async (req, res) => {
  const user = (req as unknown as AuthedRequest).user
  const name = String(req.body?.name ?? '').trim() || 'Untitled deck'
  const listText = String(req.body?.list_text ?? '')

  const deck = await prisma.deck.create({
    data: {
      userId: user.id,
      name,
      listText,
      commanderName: extractCommanderName(listText),
    },
  })

  res.status(201).json({ deck: serializeDeck(deck) })
})

decksRouter.put('/:id', async (req, res) => {
  const user = (req as unknown as AuthedRequest).user
  const id = req.params.id
  const name = String(req.body?.name ?? '').trim() || 'Untitled deck'
  const listText = String(req.body?.list_text ?? '')

  const existing = await prisma.deck.findFirst({ where: { id, userId: user.id } })
  if (!existing) {
    res.status(404).json({ error: 'Deck not found.' })
    return
  }

  const deck = await prisma.deck.update({
    where: { id },
    data: {
      name,
      listText,
      commanderName: extractCommanderName(listText),
    },
  })

  res.json({ deck: serializeDeck(deck) })
})

decksRouter.delete('/:id', async (req, res) => {
  const user = (req as unknown as AuthedRequest).user
  const id = req.params.id

  const existing = await prisma.deck.findFirst({ where: { id, userId: user.id } })
  if (!existing) {
    res.status(404).json({ error: 'Deck not found.' })
    return
  }

  await prisma.deck.delete({ where: { id } })
  res.status(204).end()
})
