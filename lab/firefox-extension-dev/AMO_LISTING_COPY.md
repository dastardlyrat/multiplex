# AMO Listing Copy (RC-3 / v0.9.1)

## Short Description (Recommended)

Turn opened webmail messages into a URL forensics workbench with mirror view, URL cleanup, digest output, and diagnostics.

## Full Description

URL Forensics Workbench helps you inspect and rewrite links found in opened webmail messages.

The extension adds an in-page workflow rail with three focused tabs:
- Email Mirror: a formatted mirror of the opened message
- Workflow: step-by-step URL extraction, normalization, and final URL output
- Diagnostics: run details and troubleshooting context for the current message

Key capabilities:
- Detects URL tokens in opened email body content and builds a final destination list
- Shows raw URLs, normalized/resolved URLs, final URL output, and digest-ready output
- Includes copy actions for final URL lists, digest HTML, rewritten content, and diagnostics
- Provides a hover URL inspector in the mirror tab to reveal URL components
- Includes settings to control URL normalization/repair and mirror-replacement behavior

Version and compatibility:
- Current version: 0.9.1
- Firefox minimum supported version: 142.0+

Notes:
- The extension runs on inbox pages where an email body is open and readable by the page context.
- Supported hosts: `mail.google.com`, `outlook.office.com`, `outlook.live.com`, `outlook.office365.com`, `mail.yahoo.com`, `mail.proton.me`, `app.hey.com`, and `app.fastmail.com`.
- URL normalization/repair is configurable and disabled by default.

## Category Recommendation

- Primary category: `Productivity`
- Alternate category option: `Privacy & Security`

Rationale:
- The extension is workflow-first (extract, normalize, compare, and copy URL outputs from opened email content), which aligns best with `Productivity`.
- If you want to position it as link inspection/risk-awareness tooling, `Privacy & Security` is a valid alternative.

## Privacy/Data Handling Statement (AMO-Ready)

Use this text in the AMO privacy/data handling section:

This extension processes opened email page content locally in your browser to extract, normalize, and display URLs for review.

Data use details:
- Reads content from the currently opened inbox message view to build URL analysis outputs.
- Stores only extension settings in browser extension storage (for example, toggle preferences).
- Uses clipboard permissions only when you trigger copy actions.

Data sharing and retention:
- The extension does not include code that sends extracted email text or URL analysis results to a remote server.
- The extension does not include telemetry or analytics collection code.
- Processed message content is used for in-session analysis/rendering and is not persisted by the extension as a long-term message archive.

Permissions summary:
- `tabs`: intentionally retained to detect active tab context and communicate with the current page.
- `storage`: intentionally retained to save user preferences.
- `clipboardWrite`: intentionally retained to copy generated outputs when requested.
- Host scope: limited to supported webmail hosts instead of broad all-site page access.

## Long-Form Privacy Policy Page

Long-form page text is available in:
- `lab/firefox-extension-dev/PRIVACY_POLICY_PAGE.md`

## Screenshot Caption Pack

AMO-ready screenshot captions and shot list are available in:
- `lab/firefox-extension-dev/AMO_SCREENSHOT_CAPTIONS.md`

## Generated Asset Files

Generated listing assets are available in:
- Icons: `lab/firefox-extension-dev/amo-assets/icons/`
- Screenshots: `lab/firefox-extension-dev/amo-assets/screenshots/`

## Optional Alternate Short Description

Inspect and convert links from opened webmail messages with mirror, workflow, and diagnostics tabs in one side panel.
