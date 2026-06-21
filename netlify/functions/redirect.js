import { getStore } from "@netlify/blobs";

const BLOGSPOT_URL =
  process.env.BLOGSPOT_URL || "https://zaphkielxxi-redirect.blogspot.com";

const TARGET_PARAM = "to";

const CRAWLER_PATTERN =
  /(facebookexternalhit|Facebot|WhatsApp|TelegramBot|Twitterbot|Slackbot|Discordbot|LinkedInBot|Pinterest|Pinterestbot|Googlebot|Google-Read-Aloud|Google-PageRenderer|GoogleImageProxy|GoogleStructuredDataTestingTool|Googlebot-Image|Googlebot-News|Googlebot-Video|AdsBot-Google|mediapartners-Google|bingbot|BingPreview|Applebot|AppleCoreMedia|SkypeUriPreview|Snapchat|Viber|Line\/|WeChat|Bytespider|YandexBot|Yahoo! Slurp|Baiduspider|Sogou|Exabot|facebot|ia_archiver|AhrefsBot|SemrushBot|MJ12bot|DotBot|Curl|python-requests|Go-http-client)/i;

function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_PATTERN.test(userAgent);
}

export default async (req, context) => {
  const code = context.params.code;
  const store = getStore({ name: "links", consistency: "strong" });
  const target = await store.get(code);

  if (!target) {
    return new Response("Link tidak ditemukan.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return new Response("URL tujuan tidak valid.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return new Response("URL tujuan tidak valid.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const userAgent = req.headers.get("user-agent") || "";

  if (isCrawler(userAgent)) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: target,
        "Cache-Control": "public, max-age=86400",
        Vary: "User-Agent",
      },
    });
  }

  const separator = BLOGSPOT_URL.includes("?") ? "&" : "?";
  const interstitial = `${BLOGSPOT_URL}${separator}${TARGET_PARAM}=${encodeURIComponent(target)}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: interstitial,
      "Cache-Control": "public, max-age=86400",
      Vary: "User-Agent",
    },
  });
};

export const config = { path: "/:code" };
