# Privacy Policy
## URL Forensics Workbench

Effective date: 2026-04-03

URL Forensics Workbench ("the extension") is designed to process URL-related content from opened webmail message views in your browser so you can inspect and compare links more safely.

This policy explains what the extension can access, what it stores, and what it does not do.

## 1) What the extension does

The extension provides an in-page URL analysis workflow with:
- an email mirror view
- URL extraction/normalization/final output views
- diagnostics and copy actions
- popup/settings controls for feature toggles

## 2) Information the extension accesses

When you use the extension on supported inbox pages, it can read page content needed to:
- detect message body text and markup
- extract URL candidates
- produce normalized/final URL output and diagnostics

The extension may also inspect basic tab/page context needed to manage its toolbar and in-page panel behavior.

## 3) Information stored by the extension

The extension stores only feature settings in browser extension local storage, including:
- `enableUrlNormalizationRepair`
- `replaceEmailBodyWithMirrorContent`
- `autoApplyMirrorForNamedSender`

These values are preference toggles used to restore your chosen behavior.

## 4) Clipboard usage

The extension uses clipboard write access only when you explicitly trigger copy actions (for example, copying final URL output, digest HTML, rewritten content, or diagnostics).

## 5) Network and data sharing

The extension does not include telemetry/analytics collection code.

The extension does not include code that uploads extracted email text or URL-analysis output to remote servers.

In normal operation, URL analysis is performed locally in the browser context.

## 6) Permissions summary

The extension currently declares:
- `tabs`: active tab context and extension-to-page coordination
- `storage`: saving user preference toggles
- `clipboardWrite`: user-initiated copy operations

These runtime permissions were reviewed for RC-3 and intentionally retained because they are required for current popup diagnostics, settings persistence, and user-triggered copy features.

Its page access is limited to these supported webmail hosts:
- `mail.google.com`
- `outlook.office.com`
- `outlook.live.com`
- `outlook.office365.com`
- `mail.yahoo.com`
- `mail.proton.me`
- `app.hey.com`
- `app.fastmail.com`

## 7) Data retention

The extension does not maintain a long-term archive of processed message content.

Processing output is generated for the active session/view and can be copied by user action.

Stored extension data is limited to settings/preferences unless future versions explicitly state otherwise.

## 8) Third-party services

The extension does not intentionally transmit processed message content to third-party analytics or telemetry endpoints.

If Firefox, AMO, or other platform providers collect operational metrics outside extension code, those practices are governed by their own policies.

## 9) Your choices

You can:
- disable or remove the extension at any time
- clear extension storage from Firefox add-on/data controls
- choose whether to enable URL normalization/repair or mirror replacement features

## 10) Changes to this policy

If data handling changes in future releases, this policy will be updated with a new effective date and release notes summary.

## 11) Contact

For privacy questions about this extension, use the publisher contact listed on the AMO listing page.
