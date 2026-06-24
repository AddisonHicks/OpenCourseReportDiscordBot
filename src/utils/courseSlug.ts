import type { Course } from '../types/report.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

export function slugifyCourseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function buildCourseSlug(
  courseName: string,
  zipcode: string | null,
  city?: string,
  state?: string,
): string {
  const base = slugifyCourseName(courseName)
  const zip = zipcode?.trim()
  if (zip && /^\d{5}$/.test(zip)) {
    return `${base}-${zip}`
  }
  if (city && state) {
    return `${base}-${slugifyCourseName(city)}-${state.trim().toLowerCase()}`
  }
  return base
}

export function resolveCourseSlug(
  course: Pick<Course, 'slug' | 'course_name' | 'zipcode' | 'city' | 'state'>,
): string {
  return (
    course.slug ??
    buildCourseSlug(course.course_name, course.zipcode, course.city, course.state)
  )
}

export function coursePath(
  course: Pick<Course, 'slug' | 'course_name' | 'zipcode' | 'city' | 'state'>,
): string {
  return `/course/${resolveCourseSlug(course)}`
}
