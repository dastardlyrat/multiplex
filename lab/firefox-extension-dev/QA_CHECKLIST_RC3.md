# URL Forensics Workbench
## RC-3 QA Checklist

Use this checklist for the packaged runtime-clean build before AMO submission.

## Run Info

- Date:
- Tester:
- Artifact:
- Firefox version under test:
- Supported host scope:
  - `mail.google.com`
  - `outlook.office.com`
  - `outlook.live.com`
  - `outlook.office365.com`
  - `mail.yahoo.com`
  - `mail.proton.me`
  - `app.hey.com`
  - `app.fastmail.com`

## Preflight

- [ ] Load the packaged zip successfully from `about:debugging`.
- [ ] Confirm `manifest.json` is at the archive root.
- [ ] Confirm popup opens without startup errors.
- [ ] Confirm settings page opens without startup errors.
- [ ] Confirm help page opens from popup and settings page.

## Provider Matrix

Run the same checks for each provider with a real opened email body.

### Gmail

- [ ] Opened email body is detected.
- [ ] Popup `Open In-Page Helper` opens the helper successfully.
- [ ] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

### Outlook

- [ ] Opened email body is detected.
- [ ] Popup `Open In-Page Helper` opens the helper successfully.
- [ ] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

### Yahoo Mail

- [ ] Opened email body is detected.
- [ ] Popup `Open In-Page Helper` opens the helper successfully.
- [ ] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

### Proton Mail

- [x] Opened email body is detected.
- [-] Popup `Open In-Page Helper` opens the helper successfully.
- [-] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

### HEY

- [ ] Opened email body is detected.
- [ ] Popup `Open In-Page Helper` opens the helper successfully.
- [ ] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

### Fastmail

- [ ] Opened email body is detected.
- [ ] Popup `Open In-Page Helper` opens the helper successfully.
- [ ] Email Mirror tab renders the opened message.
- [ ] Hover URL pane updates when hovering a link in the mirror.
- [ ] Workflow tab populates raw URLs, resolved output, final URLs, and digest output.
- [ ] Copy actions work for final URLs, digest output, rewritten content, and diagnostics.
- [ ] Popup diagnostics refresh reflects the active tab correctly.
- [ ] Settings changes persist after refresh or navigation.

## Failure Modes

- [ ] No active email body: helper stays empty and diagnostics explain that no email is detected.
- [ ] Unsupported page: popup/helper report that the extension is unavailable on the current page.
- [ ] Malformed URLs: workflow still renders and diagnostics show errors without breaking the helper UI.
- [ ] Very large email body: helper remains responsive and does not lock the page or browser.
- [ ] Back/forward navigation: stale email stats do not remain visible after navigation away from the message.

## Permission-Sensitive Behavior

- [ ] `tabs`: active-tab diagnostics and helper-open action work correctly.
- [ ] `storage`: settings persist and diagnostics show stored/default values correctly.
- [ ] `clipboardWrite`: copy actions complete without permission errors.

## Clipboard Paths

- [ ] `text/plain` copy path works.
- [ ] `text/html` copy path works where rich output is expected.

## Notes

- Defects found:
- Open questions:
- Retest required:

## Release Decision

- [ ] PASS: ready for AMO submission.
- [ ] FAIL: fix issues and rerun.

- Final decision:
- Signed-off by:
