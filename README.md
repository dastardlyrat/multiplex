# URL Forensics Workbench

### Inspect the links behind the message.

An email can show a readable link while its destination carries a redirect wrapper, campaign identifiers, or an encoded URL. **URL Forensics Workbench** brings the message, the link-processing steps, and the resulting destinations into one Firefox workspace.

Open a supported webmail message, inspect its mirror, hover over links to examine their components, and follow the workflow from detection to final URLs and digest output. A separate **Backup** view keeps the captured original body available alongside the processed view.

**Multiplex** is the repository name; **URL Forensics Workbench** is the extension; `url-forensics` is the development-tooling package. The extension and package declare version **0.3.0**.

This is an unsigned Firefox development build. The included package can be
loaded temporarily; current webmail compatibility depends on the provider's
page structure. Saved fixtures and recorded packaging checks support review
without claiming a fresh live test of every integration.

**Explore:** [The workspace](#a-workspace-for-understanding-email-links) ·
[Try it](#try-it-in-firefox) · [Processing](#how-processing-works) ·
[Data and limits](#permissions-data-and-limits) ·
[Development](#development) · [Source map](#where-to-work).

**[Download the Firefox extension ZIP](release-extension/url-forensics-workbench-0.3.0-firefox.zip?raw=true)** · [Installation and checksum](release-extension/README.md) · [How processing works](#how-processing-works) · [Development](#development)

## A workspace for understanding email links

The helper opens as an in-page rail beside the mail view. Its views answer different questions:

| View | What it gives you |
| --- | --- |
| **Email Mirror** | A formatted view of the opened message, with processed links in their surrounding content. |
| **Backup** | A preview of the captured original HTML or text, separate from the mirror. |
| **Workflow** | The editable input, detected URLs, normalization and resolution details, tracker removal, final URL list, digest, and converted panel. |
| **Sidepanel Diagnostics** | Details about the current extraction and processing state. |

Hover inspection breaks a mirror link into its detection type, protocol, domain, subfolder, slug, tracking parameters, other parameters, and fragment. You can inspect the destination's structure while keeping the message in view.

The workflow's copy actions let you take away final URLs, digest HTML, individual pane contents, or converted content. The digest pairs destinations with nearby title text when available, falling back to a host-based title. It is a compact link digest rather than a summary of the email's meaning.

Typical uses include reviewing a newsletter's destinations, separating attribution parameters from useful query arguments, comparing original and processed message content, or investigating why a particular link was detected or rewritten.

## Try it in Firefox

Requires **Firefox 142 or later**, as declared by the [extension manifest](lab/firefox-extension/manifest.json). You do not need Node.js or a source checkout to try the packaged extension.

1. [Download the unsigned ZIP](release-extension/url-forensics-workbench-0.3.0-firefox.zip?raw=true).
2. Open `about:debugging#/runtime/this-firefox` in Firefox.
3. Choose **Load Temporary Add-on…** and select the ZIP. No extraction is required.
4. Open or reload a supported webmail tab, then open a message so its body is visible.
5. Open the extension's toolbar popup and choose **Open Helper**.
6. Start with **Email Mirror** and **Workflow**. Use **Settings** for processing choices and the other extension pages.

This is a temporary development installation: Firefox removes it when the browser restarts. Permanent installation in standard Firefox requires Mozilla signing. See Mozilla's [temporary-loading instructions](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) and [signing overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/).

The [package notes](release-extension/README.md) record the source commit, loading instructions, validation results, and existing lint warnings; [SHA256SUMS.txt](release-extension/SHA256SUMS.txt) identifies the packaged bytes.

### Webmail integrations

Provider definitions select message-body candidates using host patterns and provider-specific selectors. The manifest targets these HTTPS hosts and matching subdomains:

| Provider | Hosts |
| --- | --- |
| Gmail | `mail.google.com` |
| Outlook | `outlook.office.com`, `outlook.live.com`, `outlook.office365.com` |
| Yahoo Mail | `mail.yahoo.com` |
| Proton Mail | `mail.proton.me` |
| HEY | `app.hey.com` |
| Fastmail | `app.fastmail.com` |

Open a message in its reading view; the inbox list alone is insufficient. The HEY provider definition additionally targets `/topics` paths. These are configured integrations, with saved fixtures for provider layouts; current compatibility depends on the page structure and whether the message body is accessible.

## See a link move through the pipeline

Consider this synthetic input, using reserved example domains:

```text
Release notes
https://click.example.net/redirect?url=https%3A%2F%2Fexample.com%2Frelease%3Futm_source%3Dnewsletter%26keep%3Dyes
```

The outer URL contains an encoded destination in its `url` parameter. With the current default pipeline settings, the workbench produces:

| Step or output | Value |
| --- | --- |
| Detected input | The original wrapper URL is retained in the item's `original` field. |
| Destination extracted from the wrapper | `https://example.com/release?utm_source=newsletter&keep=yes` |
| Tracking parameter removed | `utm_source` |
| Final URL | `https://example.com/release?keep=yes` |
| Digest entry | Title `Release notes`, host `example.com`, type `tracker cleaned`. |

The item also records detector IDs, processing notes, and a cleanup entry with the destination before and after parameter removal. The unrelated `keep=yes` argument survives.

With **Strip known tracking parameters** turned off, the final URL is instead `https://example.com/release?utm_source=newsletter&keep=yes`. Wrapper resolution still runs. This example was checked against the extension's Node pipeline; it does not involve contacting the example domains.

### Three distinct controls

- **Resolution** extracts candidate destinations embedded in URL text, including nested wrappers. It operates even when optional normalization and repair are off.
- **Normalization and repair** enable additional cleanup of detected URL tokens, such as configured punctuation repairs. This setting is off by default.
- **Tracker stripping** removes selected known query parameters from resolved destinations. It is on by default and has individual filter switches.

The built-in rule pack includes UTM prefixes and identifiers such as `gclid`, `fbclid`, Mailchimp parameters, and HubSpot parameters. **Trackers** controls which filters are active; **Instrumentation** exposes the matching catalogs. Removing a known tracking parameter is a rule-based transformation, not proof that every remaining parameter is necessary or harmless.

## How processing works

The extension separates finding a message from analyzing its links and presenting results:

```text
Provider definitions and visible message candidates
                      ↓
Captured HTML + text + original-body backup
                      ↓
          Detect → Resolve → Assemble
                      ↓
Mirror · Workflow · Final URLs · Digest · Diagnostics
```

The orchestration in [pipeline.js](lab/firefox-extension/pipeline.js) executes three stages. The UI expands their results into several panes; each pane is not a separate execution stage.

| Stage | Work performed | Source |
| --- | --- | --- |
| **Detect** | Read HTML link targets and text, or scan plain text. Combine regex and tokenizer detector matches and retain detector IDs on detected items. Email targets can normalize to `mailto:` links. | [Detection](lab/firefox-extension/pipeline-detection.js), [detector registry](lab/firefox-extension/pipeline-detector-registry.js) |
| **Resolve** | Apply optional token repair, extract embedded destinations, apply selected tracking filters, retain candidate URLs and cleanup notes, and choose a replacement URL. | [Resolution](lab/firefox-extension/pipeline-resolution.js), [URL resolver](lab/firefox-extension/pipeline-url-resolver.js) |
| **Assemble** | Build final URLs, original-to-final change records, title-and-link digest entries, rewritten HTML/text, and processing diagnostics. | [Assembly](lab/firefox-extension/pipeline-assembly.js), [HTML rewriting](lab/firefox-extension/pipeline-html-rewriter.js), [diagnostics](lab/firefox-extension/pipeline-diagnostics.js) |

Detected items carry `original`, `normalized`, `resolved`, `validResolved`, `replacementUrl`, `detectorIds`, and `notes`; tracker cleanup adds before/after records and removed parameter names. That structure lets the views explain a result through intermediate data rather than showing only a substituted link.

The [stage runner](lab/firefox-extension/pipeline-stage-runner.js) provides before/after/error hooks and accumulates stage errors. The [declarative rule pack](lab/firefox-extension/pipeline-default-plugin.js) supplies detection patterns, tracker definitions, classification rules, and repair transforms through a [rule-pack registry](lab/firefox-extension/pipeline-plugin-registry.js). These are internal extension points for developers; the shipped UI does not provide a plugin marketplace or arbitrary rule-pack installer.

### Keeping the message and its original together

[Provider definitions](lab/firefox-extension/inbox-detector-registry.js) and inbox detection identify candidate bodies. Snapshot synchronization handles message changes and publication to the panes. The [original-body backup](lab/firefox-extension/email-original-backup.js) captures HTML, text, and a timestamp on the detected DOM elements; the snapshot carries that original separately from the processed mirror.

This backup supports comparison within the page session. It is not a durable mailbox export. Optional mirror replacement changes the displayed message body in the page; sender-based and mobile auto-apply choices control when replacement happens automatically.

## Settings and defaults

Defaults come from the shared [storage model](lab/firefox-extension/storage-model.js):

| Setting | Default |
| --- | --- |
| URL normalization and repair | Off |
| Strip known tracking parameters | On, using the default filter selections |
| Replace opened email body with mirror | Off |
| Auto-apply mirror on mobile | Off |
| Auto-apply mirror for configured senders | Off; sender list initially empty |
| Allow helper without a detected email body | Off |

Review the effective choices in **Settings**, **Trackers**, and **Storage** when comparing results. Turning normalization off does not disable resolution or tracker stripping.

### The settings hub

| Page | What to explore |
| --- | --- |
| Settings / Trackers | Processing choices, mirror application, sender lists, and individual parameter filters. |
| Instrumentation | URL, site, tracker, classification, and repair catalogs, plus committed validation snapshots. |
| Test Suite / Samples | Browser test surfaces and saved detector examples. |
| Diagnostics | Extension runtime, memory, and storage health. |
| Debugging | Trace levels and categories, the live in-memory trace, and manual JSON export. |
| Storage | Effective settings and whether a value is default, stored default, or customized. |
| Help / About | Usage, troubleshooting, purpose, and the documented privacy model. |

Access these pages through the installed extension's **Settings** hub. GitHub links to the [Help](lab/firefox-extension/help.html) and [About](lab/firefox-extension/about.html) files show their source.

## Permissions, data, and limits

The extension operates in the browser and configured webmail pages. Its About page describes local operation without a remote service required for its UI. The manifest declares `clipboardWrite` for copying results, `storage` for remembered choices, and `tabs` for tab coordination, along with the configured webmail content-script patterns. Its required data-collection declaration is `none`.

Settings, sender-address choices, debug configuration, and debug-page choices can persist in extension storage. Debug trace output remains in memory unless manually exported. Message-derived outputs and exported traces should be reviewed before sharing.

URL resolution here decodes and extracts destinations from strings; it does not establish a server's live redirect behavior. A classification such as `destination`, `tracker`, or `tracker cleaned` describes the pipeline's rules, not a safety verdict. The mirror is a review surface, not an asserted isolation boundary for hostile email.

The packaged extension has five recorded dynamic-`innerHTML` lint warnings, listed in the [package notes](release-extension/README.md). Those notes also distinguish successful packaging checks from live browser testing. Provider layouts can change, and recorded fixtures or green checklists do not establish current webmail compatibility.

## Development

### Get the source

The current default branch is `main`:

```sh
git clone --branch main https://github.com/dastardlyrat/multiplex.git
cd multiplex
```

To work on the source extension, temporarily load `lab/firefox-extension/manifest.json` in Firefox instead of the packaged ZIP. After source changes, reload the extension in `about:debugging`, then reload the webmail tab.

For the development toolchain, use **Node.js 22.18.x or a later compatible 22.x release**, or **Node.js 24 or later**, and **npm 8 or later**. These satisfy the direct development dependencies' Node constraints in [package-lock.json](package-lock.json); the root package has no `engines` field.

```sh
npm ci
npm test
npm run build:extension
```

`npm test` delegates to `npm run check`: syntax, ESLint, extension lint, duplicate detection, resource checks, and the Node smoke pipeline. `build:extension` writes `web-ext-artifacts/url_forensics_workbench-0.3.0.zip`, overwriting an existing build destination. Building does not sign or publish the extension, or refresh the committed copy in `release-extension/`.

### Use the processing module directly

For a small local experiment, start `node` from the repository root and paste:

```js
const pipeline = require('./lab/firefox-extension/pipeline.js');
const result = pipeline.analyzeInput({
  rawText: 'Release notes\nhttps://click.example.net/redirect?url=https%3A%2F%2Fexample.com%2Frelease%3Futm_source%3Dnewsletter%26keep%3Dyes'
});
console.log(result.finalUrls);
// [ 'https://example.com/release?keep=yes' ]
console.log(result.items[0].trackerCleanupEntries);
```

`analyzeInput` accepts `rawText`/`text`, optional `sourceHtml`/`html`, and `options`/`settings`. Its result includes items, final URLs, change records, digest entries, rewritten HTML/text, diagnostics, and errors. This is the repository module used by the extension tooling; it is not a documented npm-registry installation path. Browser DOM parsing and the Node HTML fallback are separate paths.

### Checks and review material

| Command | Purpose |
| --- | --- |
| `npm run check:syntax` | Check JavaScript syntax. |
| `npm run lint:js` | Run ESLint on extension JavaScript. |
| `npm run lint:extension` | Run `web-ext lint` against extension source. |
| `npm run duplicates` | Report duplicate JavaScript using the configured jscpd thresholds. |
| `npm run check:resources` | Verify manifest resources and HTML local references. |
| `npm run smoke` | Exercise the Node processing and helper checks. |
| `npm run check:detector-parity` | Run the separate detector-parity command, which is not explicitly listed in aggregate `check`. |

[Pipeline cases](tools/pipeline-test-cases.js) cover tracker cleanup and bypass behavior, email targets, and repair cases. [Saved inbox fixtures](tools/inbox-selector-fixtures/) exercise provider selectors; [golden outputs](tools/golden-fixtures/) record detector and rule-pack expectations. Browser validation surfaces exercise behavior beyond Node fallback parsing.

The `rebuild:test-suite`, `rebuild:catalog-goldens`, `rebuild:diagnostics-health`, and `rebuild:sample-review-data` scripts update generated review material. `smoke:save` and `test:pipeline:save` run the smoke pipeline with `--save`. Run these deliberately and review the resulting diff; a regenerated expectation needs review just as an implementation change does.

The [hardening checklist](HARDENING-TODO.md) records the project's modularization and validation work. Its completed items are project records, not a claim that checks were rerun for each documentation update.

### Where to work

Read the [extension manifest](lab/firefox-extension/manifest.json) first to see
the browser entry points and configured hosts. Follow the relevant source
family below, then inspect the matching fixtures and assertions in `tools/`.
The committed extension ZIP is a separate distribution snapshot: changing a
source file does not update that archive automatically.

| Area | Starting point |
| --- | --- |
| Active Firefox extension | [lab/firefox-extension/](lab/firefox-extension/) |
| Embedded workflow UI | [extension-workbench.html](lab/firefox-extension/core-components/extension-workbench.html) |
| Message detection and snapshots | `inbox-detector-registry.js`, `inbox-detectors.js`, `email-snapshot-sync.js`, and `email-root-summary.js` in the extension directory |
| Original, mirror, and hover views | `email-original-backup.js`, `page-pane-shell.js`, `page-pane-snapshot.js`, and `page-pane-mirror.js` in the extension directory |
| Processing and matching rules | `pipeline*.js` and `tracking-parameter-model.js` in the extension directory |
| Tooling, fixtures, and expectations | [tools/](tools/) |
| Downloadable package | [release-extension/](release-extension/) |
| Other lab explorations | [forensics.html](lab/forensics.html), [merged-link-lab-email.html](lab/merged-link-lab-email.html), and [lab/core-components/](lab/core-components/) |

The outer lab pages are distinct exploration surfaces. `forensics.html` contains an inline implementation; `merged-link-lab-email.html` references helper files absent from its own directory in this snapshot. Use the installed extension's Workflow as the starting point for its current UI and processing. Listing-asset material in [lab/firefox-extension-dev/](lab/firefox-extension-dev/) includes scripted screenshot templates; the [asset notes](lab/firefox-extension-dev/AMO_ASSETS_README.md) distinguish those graphics from literal browser captures.

## Troubleshooting

- **No email detected:** open a full message on a configured host and make sure its body is visible. For HEY, check that you are in a topic view.
- **Helper unavailable:** let the webmail page finish loading, reload it after loading the extension, and reopen the popup.
- **Previous message remains visible:** use the helper's **Refresh** action, or reopen the target message and helper.
- **Unexpected output:** check normalization and tracker settings, inspect the workflow notes, and compare the Backup view with the mirror.
- **Source changes do not appear:** reload the temporary extension and then the webmail tab. The committed ZIP is a separate snapshot and does not change when source files are edited.

## License metadata

[package.json](package.json) declares `ISC`. This tree has no standalone license file; this README records the existing metadata without adding license text or a copyright holder.

The three bundled Material Symbols fonts retain their embedded Google LLC
copyright notices. Google's [Material Symbols guide](https://developers.google.com/fonts/docs/material_symbols)
documents the upstream collection under Apache License 2.0. Those upstream
notices remain separate from the project's package metadata.
