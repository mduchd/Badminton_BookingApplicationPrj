// Deterministic provider for isolated E2E tests only. Never use this as a production provider.
import { createServer } from 'node:http'
createServer(async (req, res) => {
  if (req.url === '/health') { res.end('ok'); return }
  if (req.url !== '/chat/completions') { res.writeHead(404).end(); return }
  for await (const _ of req) { /* consume bounded test input */ }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  const date = new Date(`${today}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
    intent: 'SEARCH', sportType: 'badminton', district: 'Verification', date: date.toISOString().slice(0, 10),
    startTime: '19:00', endTime: '21:00', maxPricePerHour: 150000, amenities: [], reply: 'Fixture result',
  }) } }] }))
}).listen(19191, '0.0.0.0', () => console.log('Test provider ready on 19191'))
