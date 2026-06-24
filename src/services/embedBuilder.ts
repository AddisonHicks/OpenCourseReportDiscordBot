import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js'
import type { ReportWithCourse } from '../types/report.js'
import { coursePath } from '../utils/courseSlug.js'
import { reportPath } from '../utils/reportSlug.js'
import {
  formatDate,
  formatGreenFee,
  formatHolesPlayed,
  formatPace,
  submitterName,
  timeOfDayEmoji,
  timeOfDayLabel,
  transportLabel,
  truncateField,
} from '../utils/formatReport.js'

function addField(
  embed: EmbedBuilder,
  name: string,
  value: string | null | undefined,
): void {
  if (!value?.trim()) return
  embed.addFields({ name, value: truncateField(value) })
}

export const REPORT_ANNOUNCEMENT =
  'A New Course Conditions Report Has Been Submitted:'

export function buildReportEmbed(
  report: ReportWithCourse,
  siteUrl: string,
): {
  content: string
  embeds: EmbedBuilder[]
  components: ActionRowBuilder<ButtonBuilder>[]
} {
  const course = report.courses
  const courseUrl = `${siteUrl}${coursePath(course)}`
  const reportUrl = `${siteUrl}${reportPath(course, report)}`
  const submitUrl = `${siteUrl}/submit`

  const transport = transportLabel(report.transport_mode)
  const name = submitterName(report.first_name, report.last_initial)

  const embed = new EmbedBuilder()
    .setColor(0x2d6a4f)
    .setTitle(course.course_name)
    .setURL(courseUrl)
    .setDescription(
      [
        `${course.city}, ${course.state} | Played ${formatDate(report.date_played)} | ${timeOfDayEmoji(report.time_of_day)} ${timeOfDayLabel(report.time_of_day)}`,
        `Submitted by: ${name}`,
      ].join('\n'),
    )
    .setFooter({ text: 'OpenCourseReport' })
    .setTimestamp(new Date(report.created_at))

  if (report.price_paid != null) {
    embed.addFields({
      name: 'Green Fee',
      value: formatGreenFee(report.price_paid, report.holes_played),
      inline: true,
    })
  }
  if (report.holes_played != null) {
    embed.addFields({
      name: 'Holes played',
      value: formatHolesPlayed(report.holes_played),
      inline: true,
    })
  }
  if (transport) {
    embed.addFields({ name: 'Transport', value: transport, inline: true })
  }

  addField(embed, 'Greens', report.greens_report)
  addField(embed, 'Fairways & Tees', report.fairways_tees_report)
  addField(embed, 'Maintenance', report.maintenance_notes)
  addField(embed, 'Other Conditions', report.other_conditions_notes)

  if (report.pace_of_play != null) {
    embed.addFields({
      name: 'Pace of Play',
      value: formatPace(report.pace_of_play),
      inline: true,
    })
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Report')
      .setStyle(ButtonStyle.Link)
      .setURL(reportUrl),
    new ButtonBuilder()
      .setLabel('Submit a Report')
      .setStyle(ButtonStyle.Link)
      .setURL(submitUrl),
  )

  return {
    content: REPORT_ANNOUNCEMENT,
    embeds: [embed],
    components: [row],
  }
}

export function buildWelcomeEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x2d6a4f)
    .setTitle('OpenCourseReport Bot')
    .setDescription(
      [
        'Thanks for adding me! I post new golf course condition reports from [OpenCourseReport](https://open-course-report.vercel.app) to your server.',
        '',
        '**Get started:**',
        '1. `/setup channel:#your-channel` — choose where reports are posted',
        '2. `/settings city:Portland state:OR radius:75` — set your area filter',
        '',
        'Only users with **Manage Server** can configure the bot.',
      ].join('\n'),
    )
    .setFooter({ text: 'OpenCourseReport' })
}
