"use strict";

function urlForensicsPagePaneShellBuildHoverLinkInspectorMarkup(isExpanded) {
  return [
    '  <details class="merged-link-lab-page-pane__hover-link-box" data-role="hoverLinkInfo" aria-live="polite"' + (isExpanded ? " open" : "") + ">",
    '    <summary class="merged-link-lab-page-pane__hover-link-summary">',
    '      <span class="merged-link-lab-page-pane__hover-link-summary-copy">',
    '        <span class="merged-link-lab-page-pane__hover-link-label"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="link" aria-hidden="true">link</span><span>Hovered Link</span></span>',
    '        <span class="merged-link-lab-page-pane__hover-link-summary-line" data-role="hoverLinkInfoSummary">Hover over a link to reveal URL components</span>',
    "      </span>",
    "    </summary>",
    '    <pre class="merged-link-lab-page-pane__hover-link-value" data-role="hoverLinkInfoValue">Hover over a link to reveal URL components</pre>',
    "  </details>"
  ].join("");
}

function urlForensicsPagePaneShellBuildPaneMarkup(options) {
  const optionBag = options && typeof options === "object" ? options : {};

  return [
    '<button type="button" class="merged-link-lab-page-pane__rail" data-role="railToggleButton" aria-expanded="false">',
    '  <span class="merged-link-lab-page-pane__rail-badge" data-role="railBadge">0</span>',
    '  <span class="merged-link-lab-page-pane__rail-dot" aria-hidden="true"></span>',
    '  <span class="merged-link-lab-page-pane__rail-bubble-title" aria-hidden="true">Lab</span>',
    '  <span class="merged-link-lab-page-pane__rail-title">URL Forensics Workbench</span>',
    '  <span class="merged-link-lab-page-pane__rail-status" data-role="railStatus">No email</span>',
    '  <span class="merged-link-lab-page-pane__rail-count" data-role="railCount">0 URLs</span>',
    "</button>",
    '<div class="merged-link-lab-page-pane__shell">',
    '  <div class="merged-link-lab-page-pane__panel-head">',
    '    <div class="merged-link-lab-page-pane__panel-copy">',
    '      <strong class="merged-link-lab-page-pane__panel-title"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__title-icon" data-icon="travel_explore" aria-hidden="true">travel_explore</span><span>URL Forensics Workbench</span></strong>',
    '      <span class="merged-link-lab-page-pane__panel-subtitle">Detected email body workspace</span>',
    "    </div>",
    '    <div class="merged-link-lab-page-pane__panel-actions">',
    '      <button type="button" data-role="settingsButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="settings" aria-hidden="true">settings</span><span>Settings</span></button>',
    '      <button type="button" data-role="refreshButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="refresh" aria-hidden="true">refresh</span><span>Refresh</span></button>',
    '      <button type="button" data-role="collapseButton"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="close_fullscreen" aria-hidden="true">close_fullscreen</span><span>Minimize</span></button>',
    "    </div>",
    "  </div>",
    '  <div class="merged-link-lab-page-pane__tab-bar" role="tablist" aria-label="URL Forensics Workbench tabs">',
    '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="converted" role="tab" aria-selected="true"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="mail" aria-hidden="true">mail</span><span>Email Mirror</span></button>',
    '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="backup" role="tab" aria-selected="false"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="inventory_2" aria-hidden="true">inventory_2</span><span>Backup</span></button>',
    '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="lab" role="tab" aria-selected="false"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="account_tree" aria-hidden="true">account_tree</span><span>Workflow</span></button>',
    '    <button type="button" class="merged-link-lab-page-pane__tab-button" data-tab-button="diagnostics" role="tab" aria-selected="false"><span class="merged-link-lab-page-pane__icon merged-link-lab-page-pane__button-icon" data-icon="analytics" aria-hidden="true">analytics</span><span>Sidepanel Diagnostics</span></button>',
    "  </div>",
    urlForensicsPagePaneShellBuildHoverLinkInspectorMarkup(optionBag.hoverLinkPanelExpanded === true),
    '  <div class="merged-link-lab-page-pane__tab-panel-stack">',
    '    <section class="merged-link-lab-page-pane__tab-panel is-active" data-tab-panel="converted" aria-hidden="false">',
    '      <div class="merged-link-lab-page-pane__preview-shell">',
    '        <iframe class="merged-link-lab-page-pane__mirror-frame" data-role="convertedPane" title="Formatted email mirror" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>',
    "      </div>",
    "    </section>",
    '    <section class="merged-link-lab-page-pane__tab-panel is-hidden" data-tab-panel="backup" aria-hidden="true">',
    '      <div class="merged-link-lab-page-pane__backup-pane" data-role="backupPane">',
    '        <div class="merged-link-lab-page-pane__backup-summary" data-role="backupSummary">No original email backup captured yet.</div>',
    '        <iframe class="merged-link-lab-page-pane__backup-frame" data-role="backupFrame" title="Original email backup preview" sandbox=""></iframe>',
    '        <textarea class="merged-link-lab-page-pane__backup-payload" data-role="backupPayload" hidden readonly aria-hidden="true"></textarea>',
    "      </div>",
    "    </section>",
    '    <section class="merged-link-lab-page-pane__tab-panel is-hidden" data-tab-panel="lab" aria-hidden="true">',
    '      <div class="merged-link-lab-page-pane__frame-shell">',
    '        <iframe class="merged-link-lab-page-pane__lab-frame" data-role="labFrame" title="URL Forensics Workbench workspace"></iframe>',
    "      </div>",
    "    </section>",
    '    <section class="merged-link-lab-page-pane__tab-panel is-hidden" data-tab-panel="diagnostics" aria-hidden="true">',
    '      <div class="merged-link-lab-page-pane__diagnostics-pane" data-role="diagnosticsPane"></div>',
    "    </section>",
    "  </div>",
    "</div>"
  ].join("");
}

function urlForensicsPagePaneShellCollectElements(paneRoot) {
  return {
    railToggleButton: paneRoot.querySelector('[data-role="railToggleButton"]'),
    railBadge: paneRoot.querySelector('[data-role="railBadge"]'),
    railStatus: paneRoot.querySelector('[data-role="railStatus"]'),
    railCount: paneRoot.querySelector('[data-role="railCount"]'),
    settingsButton: paneRoot.querySelector('[data-role="settingsButton"]'),
    refreshButton: paneRoot.querySelector('[data-role="refreshButton"]'),
    tabButtons: Array.from(paneRoot.querySelectorAll("[data-tab-button]")),
    tabPanels: Array.from(paneRoot.querySelectorAll("[data-tab-panel]")),
    hoverLinkInfo: paneRoot.querySelector('[data-role="hoverLinkInfo"]'),
    hoverLinkInfoSummary: paneRoot.querySelector('[data-role="hoverLinkInfoSummary"]'),
    hoverLinkInfoValue: paneRoot.querySelector('[data-role="hoverLinkInfoValue"]'),
    convertedPane: paneRoot.querySelector('[data-role="convertedPane"]'),
    backupPane: paneRoot.querySelector('[data-role="backupPane"]'),
    backupSummary: paneRoot.querySelector('[data-role="backupSummary"]'),
    backupFrame: paneRoot.querySelector('[data-role="backupFrame"]'),
    backupPayload: paneRoot.querySelector('[data-role="backupPayload"]'),
    labFrame: paneRoot.querySelector('[data-role="labFrame"]'),
    diagnosticsPane: paneRoot.querySelector('[data-role="diagnosticsPane"]'),
    collapseButton: paneRoot.querySelector('[data-role="collapseButton"]')
  };
}

(function attachUrlForensicsPagePaneShell(globalScope) {
  const pagePaneShell = Object.freeze({
    buildPaneMarkup: urlForensicsPagePaneShellBuildPaneMarkup,
    collectElements: urlForensicsPagePaneShellCollectElements
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pagePaneShell;
  }

  if (globalScope) {
    globalScope.urlForensicsPagePaneShell = pagePaneShell;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
