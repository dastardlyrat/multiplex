param(
  [string]$Root = "lab/firefox-extension-dev/amo-assets"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$iconDir = Join-Path $Root "icons"
$screenshotDir = Join-Path $Root "screenshots"
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
New-Item -ItemType Directory -Force -Path $screenshotDir | Out-Null

function New-LinearGradientBrush {
  param(
    [System.Drawing.Rectangle]$Rect,
    [System.Drawing.Color]$ColorA,
    [System.Drawing.Color]$ColorB,
    [int]$Angle
  )

  return [System.Drawing.Drawing2D.LinearGradientBrush]::new($Rect, $ColorA, $ColorB, $Angle)
}

function Save-Icon {
  param(
    [int]$Size,
    [string]$Path
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $canvasRect = [System.Drawing.Rectangle]::new(0, 0, $Size, $Size)
  $bgBrush = New-LinearGradientBrush -Rect $canvasRect `
    -ColorA ([System.Drawing.Color]::FromArgb(14, 53, 71)) `
    -ColorB ([System.Drawing.Color]::FromArgb(26, 126, 140)) `
    -Angle 45
  $graphics.FillRectangle($bgBrush, $canvasRect)

  $edgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 237, 250), [Math]::Max(1, [int]($Size * 0.02)))
  $graphics.DrawRectangle($edgePen, 1, 1, $Size - 3, $Size - 3)

  $linkPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(240, 252, 255), [Math]::Max(2, [int]($Size * 0.085)))
  $linkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $linkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $leftX = [int]($Size * 0.16)
  $leftY = [int]($Size * 0.26)
  $linkW = [int]($Size * 0.34)
  $linkH = [int]($Size * 0.24)
  $rightX = [int]($Size * 0.50)
  $rightY = [int]($Size * 0.50)

  $graphics.DrawEllipse($linkPen, $leftX, $leftY, $linkW, $linkH)
  $graphics.DrawEllipse($linkPen, $rightX, $rightY, $linkW, $linkH)

  $connectorPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(240, 252, 255), [Math]::Max(2, [int]($Size * 0.06)))
  $connectorPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $connectorPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $graphics.DrawLine(
    $connectorPen,
    [int]($Size * 0.38),
    [int]($Size * 0.44),
    [int]($Size * 0.62),
    [int]($Size * 0.56)
  )

  $labelFontSize = [Math]::Max(7, [int]($Size * 0.14))
  $labelFont = [System.Drawing.Font]::new("Segoe UI Semibold", $labelFontSize, [System.Drawing.FontStyle]::Regular)
  $labelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 252, 255))
  $labelRect = [System.Drawing.RectangleF]::new(0, [single]($Size * 0.74), [single]$Size, [single]($Size * 0.2))
  $labelFormat = [System.Drawing.StringFormat]::new()
  $labelFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $labelFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString("URL LAB", $labelFont, $labelBrush, $labelRect, $labelFormat)

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $labelFormat.Dispose()
  $labelBrush.Dispose()
  $labelFont.Dispose()
  $connectorPen.Dispose()
  $linkPen.Dispose()
  $edgePen.Dispose()
  $bgBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

function Save-Screenshot {
  param(
    [string]$Path,
    [string]$Title,
    [string]$Subtitle,
    [string[]]$Bullets,
    [string]$Badge
  )

  $width = 1280
  $height = 800
  $bitmap = [System.Drawing.Bitmap]::new($width, $height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $canvasRect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
  $bgBrush = New-LinearGradientBrush -Rect $canvasRect `
    -ColorA ([System.Drawing.Color]::FromArgb(11, 44, 61)) `
    -ColorB ([System.Drawing.Color]::FromArgb(23, 116, 132)) `
    -Angle 35
  $graphics.FillRectangle($bgBrush, $canvasRect)

  $orbBrushA = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(35, 255, 255, 255))
  $orbBrushB = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 255, 255, 255))
  $graphics.FillEllipse($orbBrushA, -140, 560, 420, 420)
  $graphics.FillEllipse($orbBrushB, 970, -180, 450, 450)

  $panelRect = [System.Drawing.Rectangle]::new(80, 78, 1120, 640)
  $panelBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 247, 252, 255))
  $panelBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(195, 35, 90, 109), 3)
  $graphics.FillRectangle($panelBrush, $panelRect)
  $graphics.DrawRectangle($panelBorder, $panelRect)

  $badgeRect = [System.Drawing.Rectangle]::new(935, 106, 230, 56)
  $badgeRectF = [System.Drawing.RectangleF]::new([single]935, [single]106, [single]230, [single]56)
  $badgeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(34, 84, 103))
  $badgeTextBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(242, 252, 255))
  $badgeFont = [System.Drawing.Font]::new("Segoe UI Semibold", 16, [System.Drawing.FontStyle]::Regular)
  $badgeFormat = [System.Drawing.StringFormat]::new()
  $badgeFormat.Alignment = [System.Drawing.StringAlignment]::Center
  $badgeFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.FillRectangle($badgeBrush, $badgeRect)
  $graphics.DrawString($Badge, $badgeFont, $badgeTextBrush, $badgeRectF, $badgeFormat)

  $titleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(21, 55, 74))
  $subtitleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(49, 88, 107))
  $bulletBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(28, 64, 83))
  $titleFont = [System.Drawing.Font]::new("Segoe UI Semibold", 45, [System.Drawing.FontStyle]::Regular)
  $subtitleFont = [System.Drawing.Font]::new("Segoe UI", 22, [System.Drawing.FontStyle]::Regular)
  $bulletFont = [System.Drawing.Font]::new("Segoe UI", 25, [System.Drawing.FontStyle]::Regular)
  $footerFont = [System.Drawing.Font]::new("Segoe UI Semibold", 18, [System.Drawing.FontStyle]::Regular)

  $graphics.DrawString($Title, $titleFont, $titleBrush, 128, 150)
  $graphics.DrawString($Subtitle, $subtitleFont, $subtitleBrush, 130, 223)

  $rowY = 308
  foreach ($bullet in $Bullets) {
    $graphics.DrawString("• " + $bullet, $bulletFont, $bulletBrush, 152, $rowY)
    $rowY += 70
  }

  $footerBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 93, 111))
  $graphics.DrawString("URL Forensics Workbench | RC-3", $footerFont, $footerBrush, 128, 664)

  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

  $footerBrush.Dispose()
  $footerFont.Dispose()
  $bulletFont.Dispose()
  $subtitleFont.Dispose()
  $titleFont.Dispose()
  $bulletBrush.Dispose()
  $subtitleBrush.Dispose()
  $titleBrush.Dispose()
  $badgeFormat.Dispose()
  $badgeFont.Dispose()
  $badgeTextBrush.Dispose()
  $badgeBrush.Dispose()
  $panelBorder.Dispose()
  $panelBrush.Dispose()
  $orbBrushB.Dispose()
  $orbBrushA.Dispose()
  $bgBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$iconSizes = @(32, 48, 64, 96, 128, 256, 512)
foreach ($iconSize in $iconSizes) {
  Save-Icon -Size $iconSize -Path (Join-Path $iconDir ("icon-{0}.png" -f $iconSize))
}

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-01-workflow-rail-overview.png") `
  -Title "Workflow Rail Overview" `
  -Subtitle "Mirror, Workflow, and Diagnostics in one in-page panel." `
  -Bullets @(
    "Open and inspect links without leaving the message view",
    "Track final URL count and quick status at a glance",
    "Switch tabs for mirror rendering and diagnostics context"
  ) `
  -Badge "Screenshot 1"

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-02-url-pipeline-outputs.png") `
  -Title "URL Pipeline Outputs" `
  -Subtitle "Follow URL flow from detection to final output." `
  -Bullets @(
    "Detected URL tokens from opened message body content",
    "Normalization and resolve stage for cleaned destinations",
    "Final URL list and digest output ready for copy"
  ) `
  -Badge "Screenshot 2"

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-03-hover-inspector.png") `
  -Title "Hover URL Inspector" `
  -Subtitle "Reveal resolved link components before navigation." `
  -Bullets @(
    "Hover a mirror link to inspect target URL details",
    "Reduce uncertainty for rewritten or wrapped links",
    "Review components in context of the opened email"
  ) `
  -Badge "Screenshot 3"

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-04-diagnostics-tab.png") `
  -Title "Diagnostics Tab" `
  -Subtitle "Troubleshoot extraction and pipeline behavior quickly." `
  -Bullets @(
    "Extension details, runtime status, and storage snapshot",
    "Detection mode, counts, and pipeline error reporting",
    "Settings visibility for troubleshooting support cases"
  ) `
  -Badge "Screenshot 4"

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-05-popup-controls.png") `
  -Title "Popup Quick Controls" `
  -Subtitle "Adjust toggles and refresh current-tab diagnostics." `
  -Bullets @(
    "Default-off behavior controls for safe operation",
    "Storage value visibility in popup diagnostics rows",
    "Fast status checks without opening settings page"
  ) `
  -Badge "Screenshot 5"

Save-Screenshot `
  -Path (Join-Path $screenshotDir "amo-06-settings-page.png") `
  -Title "Settings Page" `
  -Subtitle "Configure behavior for URL normalization and mirroring." `
  -Bullets @(
    "Persistent toggle controls stored in extension local storage",
    "Sender-based auto-apply support for specific addresses",
    "Clear warnings for risky normalization/repair behavior"
  ) `
  -Badge "Screenshot 6"

Write-Output ("Generated assets in: {0}" -f (Resolve-Path $Root))
