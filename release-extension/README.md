# URL Forensics Workbench — temporary Firefox extension

[Download the unsigned Firefox extension ZIP](url-forensics-workbench-0.3.0-firefox.zip?raw=true).

Version **0.3.0**, for **Firefox 142 or later**. This package contains all 98 files from `lab/firefox-extension/`. During the clean-rebuild review, every archived file was compared byte for byte with its corresponding file in that directory. The ZIP has `manifest.json` at its root.

## Load the extension

1. Download `url-forensics-workbench-0.3.0-firefox.zip` using the link above. If GitHub shows the file page, choose **Download raw file**.
2. In Firefox, open `about:debugging#/runtime/this-firefox`.
3. Choose **Load Temporary Add-on…**, then select the downloaded ZIP. No extraction is required.
4. Open or reload a supported webmail page, then open a message so its body is visible.
5. Open the extension's toolbar popup and choose **Open Helper**. Use **Settings** to configure URL processing and access the other workbench pages.

Firefox removes temporary extensions when it restarts; repeat the loading steps when needed. This unsigned package is for temporary loading. Permanent installation in standard Firefox requires Mozilla signing. See Mozilla's [temporary installation](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/) and [signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) documentation.

Configured webmail providers are Gmail, Outlook, Yahoo Mail, Proton Mail, HEY, and Fastmail. See the [root README](../README.md) for exact hosts, processing defaults, permissions, data handling, and troubleshooting.

## Verify the download

The expected archive SHA-256 is recorded in [SHA256SUMS.txt](SHA256SUMS.txt). In PowerShell, from the download directory:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\url-forensics-workbench-0.3.0-firefox.zip
```

Compare the returned hash with `SHA256SUMS.txt`. A matching hash confirms byte identity with the recorded archive; it is not a Mozilla signature or a safety assessment.

## Validation at packaging

- ZIP integrity passed; all 98 archived files matched the source snapshot used for packaging, with no extra files.
- JavaScript syntax: 70 files passed.
- Manifest resources and HTML local references: passed.
- Node smoke pipeline: 131 passed, 0 failed.
- ESLint: passed.
- Duplicate detection completed successfully and reported 15 existing clones (1.3% duplicated lines).
- Extension lint: 0 errors, 0 notices, and 5 existing `UNSAFE_VAR_ASSIGNMENT` warnings for dynamic `innerHTML` assignments:

| Source file under `lab/firefox-extension/` | Line |
| --- | --- |
| `content-script.js` | 62 |
| `content-ui-helpers.js` | 218 |
| `page-pane-mirror.js` | 36 |
| `sidepanel-browser-validation.js` | 201 |
| `sidepanel-browser-validation.js` | 711 |

The extension code and version were preserved. No live Firefox installation or webmail session was tested during packaging; the warnings remain unresolved.

## Rebuild from source

From this repository's root, with the development requirements in the root README:

```sh
npm ci
npm run build:extension
```

The existing build command writes `web-ext-artifacts/url_forensics_workbench-0.3.0.zip`. This release-folder copy has a descriptive Firefox filename. Rebuilt ZIP bytes may differ because archive metadata can vary; compare extracted file contents when checking source equivalence. The checksum file identifies this particular packaged archive.
