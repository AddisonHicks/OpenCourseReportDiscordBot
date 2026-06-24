import zipcodes from 'zipcodes'

export const DEFAULT_RADIUS_MILES = 75

export function normalizeZip(zip: string): string {
  return zip.replace(/\D/g, '').slice(0, 5)
}

export function zipDistanceMiles(a: string, b: string): number | null {
  const z1 = normalizeZip(a)
  const z2 = normalizeZip(b)
  if (z1.length !== 5 || z2.length !== 5) return null
  const distance = zipcodes.distance(z1, z2)
  return distance ?? null
}

export function isZipWithinRadius(
  centerZip: string,
  courseZip: string | null,
  radiusMiles = DEFAULT_RADIUS_MILES,
): boolean {
  if (!courseZip) return false
  const distance = zipDistanceMiles(centerZip, courseZip)
  return distance != null && distance <= radiusMiles
}

/** Pick a representative zip for a city/state (exact city name match). */
export function suggestZipFromCityState(
  city: string,
  state: string,
): string | null {
  const c = city.trim()
  const s = state.trim()
  if (c.length < 2 || s.length < 2) return null

  const matches = zipcodes.lookupByName(c, s)
  if (!matches?.length) return null

  const zips = matches
    .map((m) => m.zip)
    .filter((z): z is string => Boolean(z))
    .sort()

  return zips[0] ?? null
}

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
]

export function normalizeStateInput(input: string): string | null {
  const trimmed = input.trim()
  if (trimmed.length === 2) {
    const code = trimmed.toUpperCase()
    return US_STATES.some((s) => s.code === code) ? code : null
  }
  const lower = trimmed.toLowerCase()
  const match = US_STATES.find((s) => s.name.toLowerCase() === lower)
  return match?.code ?? null
}
