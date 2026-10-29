"use strict";

const fs = require("node:fs");

const diagnosticsHealthSnapshot = require("./diagnostics-health-snapshot.js");

function rebuildDiagnosticsHealthData() {
  const snapshot = diagnosticsHealthSnapshot.buildDiagnosticsHealthSnapshot();
  const script = diagnosticsHealthSnapshot.buildDiagnosticsHealthDataScript(snapshot);

  fs.writeFileSync(diagnosticsHealthSnapshot.diagnosticsHealthDataOutputPath, script, "utf8");
  console.log("Rebuilt diagnostics health data: " + diagnosticsHealthSnapshot.diagnosticsHealthDataOutputPath);
}

rebuildDiagnosticsHealthData();
