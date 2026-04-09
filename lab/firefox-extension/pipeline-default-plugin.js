// Declarative built-in rule pack for the URL Forensics pipeline.
"use strict";

(function attachUrlForensicsDefaultPipelinePlugin(globalScope) {
  const trailingUrlPunctuationPattern = Object.freeze({
    source: "[)\\]\\.,>]+$",
    flags: ""
  });

  const trackingParameterDefinitions = Object.freeze([
    Object.freeze({
      key: "utmPrefix",
      bucket: "safe",
      label: "utm_*",
      parameterName: "utm_",
      matchMode: "prefix",
      description: "Remove any UTM campaign parameter whose name starts with utm_."
    }),
    Object.freeze({
      key: "gclid",
      bucket: "safe",
      label: "gclid",
      parameterName: "gclid",
      matchMode: "exact",
      description: "Google Ads click identifier."
    }),
    Object.freeze({
      key: "dclid",
      bucket: "safe",
      label: "dclid",
      parameterName: "dclid",
      matchMode: "exact",
      description: "Google display click identifier."
    }),
    Object.freeze({
      key: "gbraid",
      bucket: "safe",
      label: "gbraid",
      parameterName: "gbraid",
      matchMode: "exact",
      description: "Google app-to-web attribution parameter."
    }),
    Object.freeze({
      key: "wbraid",
      bucket: "safe",
      label: "wbraid",
      parameterName: "wbraid",
      matchMode: "exact",
      description: "Google web-to-app attribution parameter."
    }),
    Object.freeze({
      key: "msclkid",
      bucket: "safe",
      label: "msclkid",
      parameterName: "msclkid",
      matchMode: "exact",
      description: "Microsoft Ads click identifier."
    }),
    Object.freeze({
      key: "ttclid",
      bucket: "safe",
      label: "ttclid",
      parameterName: "ttclid",
      matchMode: "exact",
      description: "TikTok click identifier."
    }),
    Object.freeze({
      key: "liFatId",
      bucket: "safe",
      label: "li_fat_id",
      parameterName: "li_fat_id",
      matchMode: "exact",
      description: "LinkedIn ad attribution identifier."
    }),
    Object.freeze({
      key: "fbclid",
      bucket: "safe",
      label: "fbclid",
      parameterName: "fbclid",
      matchMode: "exact",
      description: "Facebook click identifier."
    }),
    Object.freeze({
      key: "mcCid",
      bucket: "safe",
      label: "mc_cid",
      parameterName: "mc_cid",
      matchMode: "exact",
      description: "Mailchimp campaign identifier."
    }),
    Object.freeze({
      key: "mcEid",
      bucket: "safe",
      label: "mc_eid",
      parameterName: "mc_eid",
      matchMode: "exact",
      description: "Mailchimp email identifier."
    }),
    Object.freeze({
      key: "mcTc",
      bucket: "safe",
      label: "mc_tc",
      parameterName: "mc_tc",
      matchMode: "exact",
      description: "Mailchimp tracking code parameter."
    }),
    Object.freeze({
      key: "hsenc",
      bucket: "safe",
      label: "hsenc",
      parameterName: "hsenc",
      matchMode: "exact",
      description: "HubSpot email hash parameter."
    }),
    Object.freeze({
      key: "hsmi",
      bucket: "safe",
      label: "_hsmi",
      parameterName: "_hsmi",
      matchMode: "exact",
      description: "HubSpot message identifier."
    }),
    Object.freeze({
      key: "hsCtaTracking",
      bucket: "safe",
      label: "hsCtaTracking",
      parameterName: "hsctatracking",
      matchMode: "exact",
      description: "HubSpot CTA tracking parameter."
    })
  ]);

  const defaultPluginPack = Object.freeze({
    id: "builtin-default",
    title: "Built-in URL Forensics rule pack",
    priority: 0,
    detection: Object.freeze({
      urlTokenPattern: Object.freeze({
        source: "https?:\\/\\/[^\\s<>\"']+",
        flags: "gi"
      }),
      repairableUrlTokenPatterns: Object.freeze([
        Object.freeze({
          id: "protocol-whitespace-token",
          pattern: Object.freeze({
            source: "(?:^|[^a-z])(https?:\\/\\/\\s+[^\\s<>\"']+)",
            flags: "gi"
          }),
          tokenGroupIndex: 1
        }),
        Object.freeze({
          id: "protocol-single-slash-token",
          pattern: Object.freeze({
            source: "(?:^|[^a-z])(https?:\\/(?!\\/)[^\\s<>\"']+)",
            flags: "gi"
          }),
          tokenGroupIndex: 1
        }),
        Object.freeze({
          id: "protocol-missing-colon-token",
          pattern: Object.freeze({
            source: "(?:^|[^a-z])(https?\\/\\/[^\\s<>\"']+)",
            flags: "gi"
          }),
          tokenGroupIndex: 1
        }),
        Object.freeze({
          id: "protocol-missing-leading-h-token",
          pattern: Object.freeze({
            source: "(?:^|[^a-z])(ttps?:\\/\\/[^\\s<>\"']+)",
            flags: "gi"
          }),
          tokenGroupIndex: 1
        })
      ]),
      trailingUrlPunctuationPattern: trailingUrlPunctuationPattern,
      wrappedNoisePattern: Object.freeze({
        source: "[<>]",
        flags: "g"
      }),
      lightweightWhitespaceNoisePattern: Object.freeze({
        source: "[\\u2000-\\u200F\\u2028-\\u202F]",
        flags: "g"
      }),
      heavyWhitespaceNoisePattern: Object.freeze({
        source: "[\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180E\\u2000-\\u200F\\u2028-\\u202F\\u2060-\\u206F\\uFEFF]",
        flags: "g"
      }),
      protectedMarkupTagPattern: Object.freeze({
        source: "^(A|SCRIPT|STYLE|NOSCRIPT|TEXTAREA|PRE|CODE)$",
        flags: "i"
      }),
      embeddedTrackingParameterPattern: Object.freeze({
        source: "[?&](?:url|u|target|redirect|redirect_url|dest|destination|next|forward|goto|continue|to|href|link|data)=([^&]+)",
        flags: "gi"
      })
    }),
    tracking: Object.freeze({
      preferredTrackingParameterNames: Object.freeze([
        "url",
        "u",
        "target",
        "redirect",
        "redirect_url",
        "dest",
        "destination",
        "next",
        "forward",
        "goto",
        "continue",
        "to",
        "href",
        "link",
        "data"
      ]),
      trackerHostKeywords: Object.freeze([
        "list-manage",
        "rs6.net",
        "ccsend.com",
        "kajabimail",
        "mail",
        "tracking",
        "redirect",
        "click"
      ]),
      trackingParameterDefinitions: trackingParameterDefinitions
    }),
    classification: Object.freeze({
      hostRules: Object.freeze([
        Object.freeze({
          id: "publisher-list-manage",
          type: "publisher",
          matchType: "hostContains",
          value: "list-manage"
        }),
        Object.freeze({
          id: "newsletter-known-mailers",
          type: "newsletter",
          matchType: "hostContainsAny",
          values: Object.freeze([
            "rs6.net",
            "kajabimail",
            "ymlpmail",
            "ccsend.com",
            "mailchi.mp"
          ])
        }),
        Object.freeze({
          id: "tracker-host-pattern",
          type: "tracker",
          matchType: "hostPattern",
          pattern: Object.freeze({
            source: "track|trk|click|redirect",
            flags: "i"
          })
        })
      ])
    }),
    repair: Object.freeze({
      peelTransforms: Object.freeze([
        Object.freeze({
          id: "trim-trailing-url-punctuation",
          note: "TRAILING_PUNCT_REMOVED",
          match: trailingUrlPunctuationPattern,
          replaceWith: ""
        }),
        Object.freeze({
          id: "collapse-protocol-whitespace",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^(https?:\\/\\/|https?:\\/|https?\\/\\/|ttps?:\\/\\/)\\s+",
            flags: "i"
          }),
          replaceWith: "$1"
        }),
        Object.freeze({
          id: "repair-single-protocol-slash",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^([^:]+):\\/([^/])",
            flags: "i"
          }),
          replaceWith: "$1://$2"
        }),
        Object.freeze({
          id: "repair-missing-colon-https",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^https\\/\\/([^/])",
            flags: "i"
          }),
          replaceWith: "https://$1"
        }),
        Object.freeze({
          id: "repair-missing-colon-http",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^http\\/\\/([^/])",
            flags: "i"
          }),
          replaceWith: "http://$1"
        }),
        Object.freeze({
          id: "repair-missing-leading-h-https",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^ttps:\\/\\/",
            flags: "i"
          }),
          replaceWith: "https://"
        }),
        Object.freeze({
          id: "repair-missing-leading-h-http",
          note: "PROTOCOL_REPAIRED",
          match: Object.freeze({
            source: "^ttp:\\/\\/",
            flags: "i"
          }),
          replaceWith: "http://"
        })
      ])
    })
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = defaultPluginPack;
  }

  if (globalScope) {
    globalScope.urlForensicsPipelineDefaultPluginPack = defaultPluginPack;
  }
}(typeof globalThis !== "undefined" ? globalThis : this));
