import { coursePath } from './courseSlug.js'
import type { Course, Report } from '../types/report.js'

export function buildReportDateSlug(datePlayed: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePlayed)) return datePlayed
  const d = new Date(
    datePlayed.includes('T') ? datePlayed : `${datePlayed}T12:00:00`,
  )
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function resolveReportSlug(
  report: Pick<Report, 'slug' | 'date_played'>,
): string {
  return report.slug ?? buildReportDateSlug(report.date_played)
}

export function reportPath(
  course: Pick<Course, 'slug' | 'course_name' | 'zipcode' | 'city' | 'state'>,
  report: Pick<Report, 'slug' | 'date_played'>,
): string {
  return `${coursePath(course)}/${resolveReportSlug(report)}`
}
