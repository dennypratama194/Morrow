// the live address; change it here when Morrow gets its own domain
export const SITE_URL = 'https://morrow-hazel.vercel.app';
export const NAME = 'Morrow';
export const TITLE = 'Morrow: free time zone meeting planner that shares the late call';
export const DESCRIPTION =
  'Find the best meeting time across time zones. Morrow shows who pays for each slot and rotates the late call for weekly meetings. Free, no sign-up.';

export const FAQ: [string, string][] = [
  ['Is Morrow free?', 'Yes. There is no account and no paid plan.'],
  ['Where is my team stored?', 'Only in the link. The team is written into the part of the URL after the #, which browsers never send to a server. If you lose the link, the plan is gone.'],
  ['Why not use my calendar’s “find a time”?', 'It finds a slot where everyone is free. It doesn’t tell you that the slot is 9 pm for the same person every week, and it won’t suggest taking turns.'],
  ['How does it choose a rotation?', 'It tries every set of two or three of the best times and keeps the one that is kindest to the worst-off person. It only suggests rotating when that cuts their share by at least a quarter, and never pushes anyone outside the hours they said they’d stretch to.'],
  ['Does it work across a daylight saving change?', 'Times are right for the week you pick. Zones change their clocks on different dates, so check the plan again around a change; the calendar events follow your own zone.'],
];
