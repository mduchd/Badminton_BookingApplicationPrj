const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const utcTime = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00+07:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function buildBookingIcs(booking: { id: string; date: string; timeRange: string; facilityName: string; courtName: string; address: string }, stamp = new Date()) {
  const [start, end] = booking.timeRange.split(' - ')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SmashCourt//Booking//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:booking-${booking.id}@smashcourt`, `DTSTAMP:${stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${utcTime(booking.date, start)}`, `DTEND:${utcTime(booking.date, end)}`,
    `SUMMARY:${escapeText(`Đặt sân: ${booking.facilityName} (${booking.courtName})`)}`, `LOCATION:${escapeText(booking.address)}`,
    'STATUS:CONFIRMED', 'END:VEVENT', 'END:VCALENDAR']
  // RFC 5545: fold at 75 UTF-8 octets without splitting a code point.
  const encoder = new TextEncoder()
  return lines.map(line => {
    let result = '', length = 0
    for (const char of line) {
      const size = encoder.encode(char).length
      if (length + size > 75) { result += '\r\n '; length = 1 }
      result += char; length += size
    }
    return result
  }).join('\r\n') + '\r\n'
}
