import test from 'node:test'
import assert from 'node:assert/strict'
import { buildBookingIcs } from '../src/modules/booking/calendarExport.ts'

test('calendar export includes stable identity and correct UTC date across midnight', () => {
  const ics = buildBookingIcs({ id: '42', date: '2026-11-10', timeRange: '00:30 - 01:30', facilityName: 'Sân, A; B', courtName: 'Sân 1', address: 'Hà Nội\nViệt Nam' }, new Date('2026-11-09T00:00:00Z'))
  assert.match(ics, /UID:booking-42@smashcourt/)
  assert.match(ics, /DTSTART:20261109T173000Z/)
  assert.match(ics, /DTEND:20261109T183000Z/)
  assert.ok(ics.includes('Sân\\, A\\; B'))
  assert.ok(ics.includes('Hà Nội\\nViệt Nam'))
  assert.ok(ics.endsWith('\r\n'))
})
test('folds UTF-8 calendar lines without splitting Vietnamese characters', () => {
  const name = 'Sân cầu lông Hà Nội '.repeat(12)
  const ics = buildBookingIcs({ id: '1', date: '2026-11-10', timeRange: '18:00 - 19:00', facilityName: name, courtName: '1', address: '' })
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75)
  assert.ok(ics.replace(/\r\n /g, '').includes(name))
})
