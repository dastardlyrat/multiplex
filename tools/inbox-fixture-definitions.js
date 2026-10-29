"use strict";

const path = require("node:path");

const fixtureDirectoryPath = path.resolve(__dirname, "inbox-selector-fixtures");

const fixtureDefinitions = Object.freeze([
  Object.freeze({
    providerId: "gmail",
    title: "Gmail full message",
    fixturePath: path.resolve(fixtureDirectoryPath, "gmail-full-message.html"),
    fixtureUrl: "https://mail.google.com/mail/u/1/?ui=2&view=lg&permmsgid=msg-f:123",
    expectedSelectors: Object.freeze([
      "div.maincontent",
      "div.AO div.adn.ads[data-message-id] .a3s.aiL",
      "div.AO div[data-message-id].adn.ads .a3s.aiL",
      "[data-message-id] .a3s.aiL",
      ".a3s.aiL"
    ]),
    expectedPrimaryTagName: "DIV",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "Gmail fixture review summary",
      "Please review the linked account summary"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/gmail-review"
    ]),
    nestedFrames: Object.freeze([])
  }),
  Object.freeze({
    providerId: "outlook",
    title: "Outlook read pane",
    fixturePath: path.resolve(fixtureDirectoryPath, "outlook-read-pane.html"),
    fixtureUrl: "https://outlook.office.com/mail/inbox/id/abc",
    expectedSelectors: Object.freeze([
      "div[data-test-id='mailMessageBodyContainer']",
      "[data-app-section='MailReadCompose'] div[role='document']",
      "div[role='document'][aria-label*='Message']",
      "div[aria-label='Message body']",
      "div[aria-label*='Message body']"
    ]),
    expectedPrimaryTagName: "DIV",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "Outlook fixture message body",
      "Follow the case notes"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/outlook-review"
    ]),
    nestedFrames: Object.freeze([])
  }),
  Object.freeze({
    providerId: "yahoo",
    title: "Yahoo message view",
    fixturePath: path.resolve(fixtureDirectoryPath, "yahoo-message-view.html"),
    fixtureUrl: "https://mail.yahoo.com/d/folders/1/messages/abc",
    expectedSelectors: Object.freeze([
      "div.msg-body[data-test-id='message-view-body-content']"
    ]),
    expectedPrimaryTagName: "DIV",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "Yahoo fixture message body",
      "Review the linked campaign digest"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/yahoo-review"
    ]),
    nestedFrames: Object.freeze([])
  }),
  Object.freeze({
    providerId: "proton",
    title: "Proton message view",
    fixturePath: path.resolve(fixtureDirectoryPath, "proton-message-view.html"),
    fixtureUrl: "https://mail.proton.me/u/0/inbox/abc",
    expectedSelectors: Object.freeze([
      "iframe.w-full[title='Email content']"
    ]),
    expectedPrimaryTagName: "IFRAME",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "Proton fixture message body",
      "Open the encrypted review summary"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/proton-review"
    ]),
    nestedFrames: Object.freeze([
      Object.freeze({
        selector: "iframe.w-full[title='Email content']",
        fixturePath: path.resolve(fixtureDirectoryPath, "proton-email-frame.html")
      })
    ])
  }),
  Object.freeze({
    providerId: "hey",
    title: "HEY topic thread",
    fixturePath: path.resolve(fixtureDirectoryPath, "hey-topic-thread.html"),
    fixtureUrl: "https://app.hey.com/topics/abc",
    expectedSelectors: Object.freeze([
      "div[id^='entry_expander_entry_'].entry__body.entry-expander",
      "#entries .entry__body.entry-expander",
      "div.entry__body.entry-expander",
      "article.entry .entry__body.entry-expander",
      "div.entry__wrapper .entry__body.entry-expander",
      ".thread-message__body",
      ".message-body",
      ".message-content"
    ]),
    expectedPrimaryTagName: "DIV",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "HEY fixture topic thread",
      "Read the linked delivery recap"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/hey-review"
    ]),
    nestedFrames: Object.freeze([])
  }),
  Object.freeze({
    providerId: "fastmail",
    title: "Fastmail message view",
    fixturePath: path.resolve(fixtureDirectoryPath, "fastmail-message-view.html"),
    fixtureUrl: "https://app.fastmail.com/mail/Inbox/abc",
    expectedSelectors: Object.freeze([
      "div.u-containSelection.v-Message-body"
    ]),
    expectedPrimaryTagName: "DIV",
    expectedDetectionMode: "inbox-read",
    expectedRawTextIncludes: Object.freeze([
      "Fastmail fixture message body",
      "Check the attached workflow summary"
    ]),
    expectedFinalUrls: Object.freeze([
      "https://example.com/fastmail-review"
    ]),
    nestedFrames: Object.freeze([])
  })
]);

module.exports = Object.freeze({
  fixtureDefinitions: fixtureDefinitions
});
