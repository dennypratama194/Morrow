# Security policy

## Reporting an issue

Use GitHub private vulnerability reporting in this repository's Security tab
if available. Otherwise, open an issue asking for a private contact channel
without including vulnerability details, private links, or personal data.

Do not post credentials, confidential schedules, or working exploit details in
public issues. Include affected versions and reproduction steps privately.

## Data handling

Morrow is a static application. Team details are encoded in the URL fragment,
not encrypted. Anyone holding a complete share link can read them. Browser
history, extensions, and the services used to share links may retain the URL.
Google Calendar export sends the selected event details to Google. Calendar
files include event details and should be shared deliberately.

No API keys or environment variables are required. Keep local credentials out
of Git if you add integrations to a fork.
