# Repository Guidelines

## Project Structure & Module Organization
This workspace stores Codex CLI state rather than traditional application code. Root-level `config.toml` defines model defaults and trust scopes, `auth.json` carries redacted API credentials, and append-only history lives in `history.jsonl`. Rolling session data is kept in `sessions/<year>/` directories, runtime traces accumulate in `log/codex-tui.log`, and `version.json` tracks the CLI build. Treat these paths as canonical when scripting or performing maintenance, and add new folders using the existing lowercase-with-dashes convention.

## Build, Test, and Development Commands
Validate configuration changes before pushing: `python -c 'import tomllib; tomllib.load(open("config.toml","rb"))'` checks TOML syntax, and `jq -c '.' history.jsonl >/dev/null` confirms JSONL integrity. Watch runtime behavior with `tail -f log/codex-tui.log` while reproducing CLI issues. When modifying directory policies, run `codex --config ./config.toml --diagnostics` (if available) to surface deprecated settings before release.

## Coding Style & Naming Conventions
Use two-space indentation for TOML, compact JSON keys without trailing spaces, and UTF-8 everywhere. Auxiliary scripts should be Python 3 with Black-style formatting and snake_case identifiers. When introducing folders or files, follow lowercase-with-dashes naming (e.g., `sessions/2025/`). Comment only when documenting non-obvious workarounds; otherwise prefer self-descriptive keys.

## Testing Guidelines
Beyond the baseline TOML/JSONL checks above, validate sanitized credential files with `python -m json.tool auth.json` before sharing. For automation enhancements, place temporary tests under `tests/` and run them with `python -m pytest`; delete the folder if tests remain exploratory. Capture observed behavior in `log/codex-tui.log` and attach relevant snippets to reviews when anomalies persist.

## Commit & Pull Request Guidelines
Keep history clean with Conventional Commit prefixes such as `chore(config): update trusted roots`, squash intermediate work, and redact any sensitive identifiers before pushing. Pull requests should summarize scope, list validated commands, call out manual redaction steps, and link to upstream issues or support tickets. Include masked log excerpts or screenshots only when they illuminate the change.

## Security & Configuration Tips
Treat `auth.json` and session transcripts as secrets. Prefer local `.env` overrides instead of embedding credentials in tracked files, scrub sensitive lines from histories before sharing, and rotate tokens after testing authentication updates. Always verify that permission scopes align with the trust boundaries declared in `config.toml`.
