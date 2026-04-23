# DDUCompany Apps

This directory is the build/output workspace for DDUCompany-produced applications.

- Keep ABKO CS repo (`abkosystem/`) clean and focused.
- Place generated apps here, one subfolder per app.

Suggested structure:
- `dducompany_apps/web/<app-name>/`
- `dducompany_apps/desktop/<app-name>/`

Delivery:
- Web: commit/push to a dedicated repo (separate from CS system repo).
- Desktop (Windows): build artifacts (.exe/.zip) produced via CI (GitHub Actions) or local build.

## Structure
- `web/` web apps (commit/push)
- `desktop/` desktop app scaffold + Windows build workflow

## Desktop build
GitHub → Actions → `desktop-build` → download artifact `dducompany-desktop-windows`.
