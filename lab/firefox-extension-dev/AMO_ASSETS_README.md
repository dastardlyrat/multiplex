# AMO Asset Bundle

Generated on: 2026-04-03

## Asset Paths

- Icons: `lab/firefox-extension-dev/amo-assets/icons/`
- Screenshots: `lab/firefox-extension-dev/amo-assets/screenshots/`

## Generator

- Script: `lab/firefox-extension-dev/tools/generate-amo-assets.ps1`
- Run command:

```powershell
powershell -ExecutionPolicy Bypass -File "lab/firefox-extension-dev/tools/generate-amo-assets.ps1"
```

## Notes

- Generated screenshots are release-listing graphics derived from scripted templates.
- If you want literal in-browser captures, run manual capture on the extension UI and keep the same filenames listed in `AMO_SCREENSHOT_CAPTIONS.md`.
