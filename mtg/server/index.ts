import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { authRouter } from './routes/auth.js'
import { decksRouter } from './routes/decks.js'

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/decks', decksRouter)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err)
    res.status(500).json({ error: 'Server error.' })
  },
)

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`)
})
