"use strict";

const catalogGoldenFixtures = require("./catalog-golden-fixtures.js");

function rebuildCatalogGoldens() {
  catalogGoldenFixtures.ensureGoldenFixturesDirectory();
  catalogGoldenFixtures.writeGoldenFixture(
    catalogGoldenFixtures.detectorCatalogGoldenPath,
    catalogGoldenFixtures.buildDetectorCatalogGoldenSnapshot()
  );
  catalogGoldenFixtures.writeGoldenFixture(
    catalogGoldenFixtures.pipelineRulePackGoldenPath,
    catalogGoldenFixtures.buildPipelineRulePackGoldenSnapshot()
  );

  process.stdout.write(
    [
      "Detector catalog golden: " + catalogGoldenFixtures.detectorCatalogGoldenPath,
      "Pipeline rule-pack golden: " + catalogGoldenFixtures.pipelineRulePackGoldenPath
    ].join("\n") + "\n"
  );
}

rebuildCatalogGoldens();
