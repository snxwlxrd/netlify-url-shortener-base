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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseOgTags(html) {
  const og = {};

  const patterns = {
    title: /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    description:
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    image: /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    imageSecure:
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    url: /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    siteName:
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
  };

  for (const [key, regex] of Object.entries(patterns)) {
    const match = html.match(regex);
    if (match && match[1]) og[key] = match[1];
  }

  if (!og.title) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) og.title = titleMatch[1].trim();
  }

  if (!og.description) {
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i
    );
    if (descMatch && descMatch[1]) og.description = descMatch[1];
  }

  if (og.imageSecure) og.image = og.imageSecure;

  return og;
}

async function fetchOgTags(target) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NetlifyShortener/1.0; +og-fetcher)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const text = await res.text();
    const htmlChunk = text.slice(0, 900000);
    return parseOgTags(htmlChunk);
  } catch (e) {
    return null;
  }
}

function renderSeoHtml(og, shortUrl, target) {
  const title = escapeHtml(og?.title || "Klik untuk melanjutkan");
  const description = escapeHtml(og?.description || "");
  const image = og?.image ? escapeHtml(og.image) : "";
  const siteName = escapeHtml(og?.siteName || "");

  const twitterCardType = image ? "summary_large_image" : "summary";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(shortUrl)}">
  <meta property="og:title" content="${title}">
  ${description ? `<meta property="og:description" content="${description}">` : ""}
  ${image ? `<meta property="og:image" content="${image}">` : ""}
  ${siteName ? `<meta property="og:site_name" content="${siteName}">` : ""}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCardType}">
  <meta name="twitter:url" content="${escapeHtml(shortUrl)}">
  <meta name="twitter:title" content="${title}">
  ${description ? `<meta name="twitter:description" content="${description}">` : ""}
  ${image ? `<meta name="twitter:image" content="${image}">` : ""}

  <!-- Noindex: halaman ini tidak perlu di-index search engine -->
  <meta name="robots" content="noindex, nofollow">
</head>
<body>
  <!-- Body minimal, tidak reveal target URL -->
  <p>Loading...</p>
</body>
</html>`;
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
  const shortUrl = req.url;

  if (isCrawler(userAgent)) {
    const og = await fetchOgTags(target);
    const html = renderSeoHtml(og, shortUrl, target);

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
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
