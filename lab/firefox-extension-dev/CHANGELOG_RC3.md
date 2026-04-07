# URL Forensics Workbench
## RC-3 Changelog Notes

- Date: `2026-04-03`
- Release channel: Firefox AMO Release Candidate (`RC-3`)
- Version: `0.9.1`

## Finalized Manifest Identity

- `name`: `URL Forensics Workbench`
- `description`: `Turn detected email bodies into a URL forensics side panel.`
- `browser_specific_settings.gecko.id`: `url-forensics-workbench@urlforensics.local`
- `browser_specific_settings.gecko.strict_min_version`: `142.0` (locked)

## RC-3 Scope

- Locked publish source folder to `lab/firefox-extension` for release packaging and AMO submission.
- Locked extension identity fields for submission consistency.
- Bumped manifest version to `0.9.1` for RC-3 packaging.
- Locked Firefox minimum supported version to `142.0`.
- Added release support policy and minimum-version test gate documentation.
- Added storage-value visibility in popup diagnostics and in-page diagnostics for troubleshooting.
- Added a packaged help page and linked it from the popup and full settings page.

## Compatibility and Permissions Notes

- Firefox support floor is now explicitly `142.0+`.
- Existing runtime permissions are intentionally retained after review:
  - `tabs`
  - `storage`
  - `clipboardWrite`
- Content script and web-accessible resources are now limited to supported webmail hosts:
  - `mail.google.com`
  - `outlook.office.com`
  - `outlook.live.com`
  - `outlook.office365.com`
  - `mail.yahoo.com`
  - `mail.proton.me`
  - `app.hey.com`
  - `app.fastmail.com`

## QA and Release Readiness Snapshot

Completed:
- Publish source folder freeze to `lab/firefox-extension`
- Manifest identity finalization
- Version bump to `0.9.1`
- Minimum Firefox version lock to `142.0`
- Support policy/test gate write-up

Pending before AMO submission:
- Debug/dev asset bundle verification
- Manual provider matrix run (Gmail, Outlook, Yahoo Mail, Proton Mail, HEY, Fastmail)
- Failure-mode validation
- Packaged zip load test via `about:debugging`

## Suggested AMO "What's New" (Short Form)

- Finalized RC-3 packaging metadata and extension identity.
- Locked Firefox compatibility floor to `142.0`.
- Prepared release test gate and support policy for AMO submission.
