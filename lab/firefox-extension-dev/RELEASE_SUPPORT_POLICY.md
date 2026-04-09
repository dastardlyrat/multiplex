# URL Forensics Workbench Firefox Support Policy and Test Gate

## 0) Release Source Freeze

The authoritative Firefox release source folder for the current release train is:

- `lab/firefox-extension`

Rules:
- Build, package, test, and submit to AMO only from `lab/firefox-extension`.
- Treat any `lab/lab/firefox-extension` path found in backup snapshots as historical rollback material, not as a live release candidate.
- If a duplicate working copy appears again, mark it non-release before continuing QA or packaging.

## 1) Support Policy (Decide and Freeze Before RC Build)

Pick exactly one policy for RC-3 and document it in release notes.

### Policy A (Recommended for current manifest)
- Support floor: Firefox Desktop `142.0+`
- Manifest value: `"browser_specific_settings.gecko.strict_min_version": "142.0"`
- Rationale: Matches current manifest and recent RC snapshots, minimizes late-cycle compatibility risk.
- Tradeoff: Older Firefox installations are intentionally unsupported.

### Policy B (Wider compatibility)
- Support floor: Lower than `142.0` only if full gate passes on that lower version.
- Manifest value: Set `strict_min_version` to the lowest fully passing version.
- Rationale: Increases install base coverage.
- Tradeoff: Higher QA scope and greater regression risk late in release.

## 2) Identity Freeze Policy (Must Pass Before AMO Submission)

These fields are identity-contract fields and must be finalized once per release train:

- `name`
- `description`
- `browser_specific_settings.gecko.id`

Rules:
- Do not change `gecko.id` after first AMO release or users will not receive updates on the same extension identity.
- Keep AMO listing copy consistent with manifest `name` and `description`.
- Bump `version` only after identity fields and test gate are complete.

## 3) Minimum Version Test Gate (Release Blocking)

Run this gate on each candidate minimum version before locking `strict_min_version`.

### Test environments
- E1: Candidate floor version (the exact version you plan to set as `strict_min_version`)
- E2: Current Firefox stable at release time
- E3: Optional next-channel sanity check (Beta/Nightly) for early breakage warning

### Blocking test suite
- G1: Install and startup
  - Temporary load from packaged zip succeeds.
  - No startup/runtime errors in extension background/content flow.
- G2: Mail-provider matrix
  - Gmail, Outlook, Yahoo Mail, Proton Mail, HEY, Fastmail
  - Verify mirror pane, hover URL pane, copy actions, settings persistence, toolbar diagnostics
- G3: Failure-mode handling
  - No active email body
  - Unsupported pages
  - Malformed URLs
  - Very large email body
- G4: Permission-sensitive behavior
  - `tabs`, `storage`, `clipboardWrite` behavior works as designed
  - No new runtime permission errors
- G5: Clipboard behavior
  - `text/plain` copy path
  - `text/html` copy path
- G6: Performance guardrail
  - Large input remains responsive (no hard lock, no crash)

### Pass/Fail criteria
- PASS only if:
  - 100% of G1-G6 pass on E1 and E2
  - No P0/P1 defects remain open
  - No identity-field edits pending
- FAIL if any blocking suite fails on E1 or E2.

### Failure action
- If FAIL on E1:
  - Option 1: Fix defect and rerun full gate.
  - Option 2: Raise support floor and rerun full gate at new floor.

## 4) Release Decision Output (Record Every Run)

For each gate run, record:
- Date/time
- Candidate `strict_min_version`
- Tested Firefox versions/builds
- Pass/fail per suite (G1-G6)
- Open defects (if any)
- Final decision: keep floor or raise floor

Suggested decision template:

```
Gate run date:
Candidate strict_min_version:
E1 (floor build):
E2 (stable build):
E3 (optional):
G1:
G2:
G3:
G4:
G5:
G6:
Open P0/P1:
Final decision:
Manifest strict_min_version set to:
```

## 5) Current Project Default (Until Changed)

Until a new gate run says otherwise:
- Active policy: Policy A
- Manifest support floor: `142.0`
- Locked decision date: `2026-04-03` (RC-3 floor locked at Firefox `142.0`)

## 6) Finalized Manifest Identity (RC-3)

- Locked on: `2026-04-03`
- `name`: `URL Forensics Workbench`
- `description`: `Turn detected email bodies into a URL forensics side panel.`
- `browser_specific_settings.gecko.id`: `url-forensics-workbench@urlforensics.local`
- `version` (RC-3 candidate): `0.3.0`
