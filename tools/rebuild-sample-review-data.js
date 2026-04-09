"use strict";

const fs = require("node:fs");

const sampleReviewData = require("./sample-review-data.js");

function rebuildSampleReviewData() {
  const reviewData = sampleReviewData.buildSampleReviewData();
  const script = sampleReviewData.buildSampleReviewDataScript(reviewData);

  fs.writeFileSync(sampleReviewData.sampleReviewDataOutputPath, script, "utf8");
  console.log("Rebuilt sample review data: " + sampleReviewData.sampleReviewDataOutputPath);
}

rebuildSampleReviewData();
