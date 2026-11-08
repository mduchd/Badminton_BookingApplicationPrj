// The thumbnail directory contains one WebP for each bundled venue image.
export function venueThumbnail(url: string): string {
  const prefix = '/images/venues/'
  return url.startsWith(prefix) && !url.slice(prefix.length).includes('/')
    ? `/images/venue-thumbnails/${url.slice(prefix.length)}.webp`
    : url
}
