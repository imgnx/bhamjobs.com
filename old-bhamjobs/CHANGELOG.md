# Changelog

All notable changes to this project are documented here.

## 2025-10-23

Added
- Trivium design theme (Tailwind v4 tokens) with three variants: Grammar (amber), Logic (emerald), and Rhetoric (violet).
- Default consumer theme set to Trivium — Rhetoric across the app shell and chat UI.
- Admin-only theme switching via Command Palette commands.
- Admin verification endpoint: `GET /api/admin/verify` (requires `Authorization: Bearer ${API_TOKEN}`).

Changed
- Global styles (`app/globals.css`) now expose theme tokens: `--color-primary`, `--color-secondary`, `--color-accent`, `--color-fg`, `--color-muted`, `--color-border`, `--color-surface`.
- Chat UI and shell components updated to use theme tokens (links, focus rings, bubbles, buttons, borders, muted text).

Docs
- README and USAGE updated to describe Trivium defaults, admin sign-in, and theme switching behavior.

