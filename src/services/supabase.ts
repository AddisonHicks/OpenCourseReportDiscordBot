import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import WebSocket from 'ws'
import type { ReportWithCourse } from '../types/report.js'

const REPORT_SELECT = `
  id,
  slug,
  date_played,
  first_name,
  last_initial,
  course_id,
  time_of_day,
  transport_mode,
  walkability_notes,
  price_paid,
  holes_played,
  pace_of_play,
  greens_report,
  fairways_tees_report,
  maintenance_notes,
  other_conditions_notes,
  helpful_votes,
  created_at,
  courses (
    id,
    course_name,
    city,
    state,
    zipcode,
    slug,
    holes,
    course_type,
    is_user_submitted,
    is_approved,
    created_at
  )
`

export function createSupabaseClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
      transport: WebSocket as unknown as import('@supabase/realtime-js').WebSocketLikeConstructor,
    },
  })
}

export async function fetchReportWithCourse(
  supabase: SupabaseClient,
  reportId: string,
): Promise<ReportWithCourse | null> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .eq('id', reportId)
    .maybeSingle()

  if (error) {
    console.error('Fetch report error:', error)
    return null
  }
  if (!data) return null
  return data as unknown as ReportWithCourse
}
