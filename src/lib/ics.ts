import { hhmm } from './tz.ts';

const stamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const wall = (date: string, min: number) => `${date.replace(/-/g, '')}T${hhmm(min).replace(':', '')}00`;
const addDays = (date: string, n: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export type Meeting = { start: number; title: string; notes: string };

/**
 * A weekly meeting, or a rotation of them: with n slots, slot k starts k weeks in and repeats every n weeks, so the
 * team takes them in turn. Times are written in the organiser's own zone so the series follows their DST.
 */
export function ics(meetings: Meeting[], { tz, date, dur }: { tz: string; date: string; dur: number }) {
  const n = meetings.length;
  const now = stamp(Date.now());
  const events = meetings.map((m, k) => {
    const day = addDays(date, k * 7);
    return [
      'BEGIN:VEVENT',
      `UID:morrow-${now}-${k}@morrow`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=${tz}:${wall(day, m.start)}`,
      `DURATION:PT${dur}M`,
      `RRULE:FREQ=WEEKLY;INTERVAL=${n}`,
      `SUMMARY:${esc(m.title)}`,
      `DESCRIPTION:${esc(m.notes)}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Morrow//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
}

/** A prefilled Google Calendar event for one slot, repeating weekly. */
export function google({ t, dur, title, notes, tz }: { t: number; dur: number; title: string; notes: string; tz: string }) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${stamp(t)}/${stamp(t + dur * 60000)}`,
    details: notes,
    ctz: tz,
    recur: 'RRULE:FREQ=WEEKLY',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
