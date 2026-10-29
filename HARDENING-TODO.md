# URL Forensics Hardening TODO

## In Progress
- [x] Extract sidepanel diagnostics builders out of `lab/firefox-extension/content-script.js` into a focused module.
- [x] Extract hover-link inspector and pane-shell markup helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract pane event wiring and frame bootstrap helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract pane visibility and layout reservation helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract mirror hover inspection and converted-pane rendering helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract snapshot publication, clear-state, and pane refresh orchestration helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract inbox-candidate sync flow and missing-candidate recovery helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract inbox candidate discovery and scoring helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract shared email-root summarization and content-measurement helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract email-root observation and mirror-rewrite helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract sender-detection and auto-replace eligibility helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract sender-pattern compilation and storage-driven auto-replace state helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract remaining settings/storage orchestration helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract runtime message and page lifecycle wiring out of `lab/firefox-extension/content-script.js`.
- [x] Extract remaining DOM utility, formatting, and clipboard helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract pane assembly and active-tab rendering helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract remaining snapshot identity and page-context helpers out of `lab/firefox-extension/content-script.js`.
- [x] Extract remaining pipeline-setting and state-accessor wrappers out of `lab/firefox-extension/content-script.js`.

## Simplification
- [x] Split `lab/firefox-extension/content-script.js` into inbox extraction, mirror rendering, diagnostics, and pane-shell modules.
- [x] Extract the inbox workflow factory layer out of `lab/firefox-extension/content-script.js` into `lab/firefox-extension/content-inbox-workflows.js`.
- [x] Extract the pane workflow factory layer out of `lab/firefox-extension/content-script.js` into `lab/firefox-extension/content-pane-workflows.js`.
- [x] Extract the remaining top-level content-script orchestration into `lab/firefox-extension/content-script-runtime.js`.
- [x] Split `lab/firefox-extension/pipeline.js` into detection, resolution, assembly, and diagnostics modules.
- [x] Extract the pipeline detection helpers out of `lab/firefox-extension/pipeline.js` into `lab/firefox-extension/pipeline-detection.js`.
- [x] Extract the pipeline resolution helpers out of `lab/firefox-extension/pipeline.js` into `lab/firefox-extension/pipeline-resolution.js`.
- [x] Extract the pipeline assembly/output helpers out of `lab/firefox-extension/pipeline.js` into `lab/firefox-extension/pipeline-assembly.js`.
- [x] Extract the pipeline diagnostics builder out of `lab/firefox-extension/pipeline.js` into `lab/firefox-extension/pipeline-diagnostics.js`.
- [x] Remove stale or unused DOM wiring on extension pages as modules are extracted.
- [x] Reduce direct global coupling by routing new UI helpers through small factory modules.

## Hardening
- [x] Add selector-health checks for inbox providers against saved HTML fixtures.
- [x] Add browser-path validation so DOM execution is checked separately from Node fallback parsing.
- [x] Add drift checks so detector, plugin-pack, and diagnostics catalogs stay aligned.
- [x] Add explicit failure reporting for provider mismatch and empty-match conditions in inbox detection.
- [x] Audit state transitions around pane snapshots, tab switching, and mirror refresh for race conditions.

## Test Harnesses
- [x] Build fixture-driven browser tests for Gmail, Outlook, Yahoo, Proton, HEY, and Fastmail snapshots.
- [x] Add end-to-end sidepanel assertions for mirror rendering, hover inspection, and diagnostics output.
- [x] Add golden-output tests for detector catalogs and resolved pipeline rule packs.
- [x] Expand smoke coverage around content-script helper modules as they are extracted.

## User Review Surfaces
- [x] Expose URL detectors, inbox providers, and pipeline rule catalogs on the diagnostics page.
- [x] Expose detector parity and selector-health status in diagnostics.
- [x] Add a user-facing fixture/debug page for reviewing detector matches against saved samples.
