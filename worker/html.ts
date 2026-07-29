import { formatPollOptionSummary } from "../lib/poll-share";

const productName = "doodlebutwithoutfuckingads";
const defaultTitle =
  "doodlebutwithoutfuckingads — find a time, skip the circus";
const defaultDescription =
  "a truly tiny group scheduler with no accounts, no ads, and no bullshit 😇";

type PollPreview = {
  title: string;
  organizer: string;
  timezone: string;
  options: Array<{ startsAt: string }>;
};

type AssetEnv = {
  ASSETS: Fetcher;
};

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function cleanShareText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function safeJson(value: unknown) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function metaTag(name: string, content: string, property = false) {
  return `<meta ${property ? "property" : "name"}="${escapeAttribute(name)}" content="${escapeAttribute(content)}" />`;
}

function pageMetadata(
  request: Request,
  poll: PollPreview | null,
  pollId: string | null,
  missing: boolean,
) {
  const origin = new URL(request.url).origin;
  const path = pollId ? `/p/${encodeURIComponent(pollId)}` : null;
  const imagePath = path ? `${path}/opengraph-image` : "/og.png";
  const title =
    pollId && poll
      ? `${cleanShareText(poll.title, 100)} — ${productName}`
      : pollId && missing
        ? `Poll unavailable — ${productName}`
        : defaultTitle;
  const description =
    pollId && poll
      ? `Help ${cleanShareText(poll.organizer, 60)} find a time. ${formatPollOptionSummary({
          title: poll.title,
          organizer: poll.organizer,
          timezone: poll.timezone,
          optionStarts: poll.options.map((option) => option.startsAt),
        })}.`
      : pollId && missing
        ? "This poll link may be incomplete or no longer available."
        : defaultDescription;
  const imageAlt =
    pollId && poll
      ? `${cleanShareText(poll.title, 100)}, organized by ${cleanShareText(poll.organizer, 60)}`
      : `${productName} — Find a time. Skip the circus.`;
  const image = new URL(imagePath, origin).toString();

  return [
    `<title>${escapeAttribute(title)}</title>`,
    metaTag("description", description),
    path ? `<link rel="canonical" href="${escapeAttribute(new URL(path, origin).toString())}" />` : "",
    missing ? metaTag("robots", "noindex, nofollow") : "",
    metaTag("og:title", title, true),
    metaTag("og:description", description, true),
    metaTag("og:type", "website", true),
    path ? metaTag("og:url", new URL(path, origin).toString(), true) : "",
    metaTag("og:site_name", productName, true),
    metaTag("og:image", image, true),
    metaTag("og:image:width", "1200", true),
    metaTag("og:image:height", "630", true),
    metaTag("og:image:alt", imageAlt, true),
    metaTag("twitter:card", "summary_large_image"),
    metaTag("twitter:title", title),
    metaTag("twitter:description", description),
    metaTag("twitter:image", image),
    metaTag("twitter:image:alt", imageAlt),
  ]
    .filter(Boolean)
    .join("\n    ");
}

export async function renderAppHtml({
  request,
  env,
  poll = null,
  pollId = null,
  missing = false,
}: {
  request: Request;
  env: AssetEnv;
  poll?: PollPreview | null;
  pollId?: string | null;
  missing?: boolean;
}) {
  const assetUrl = new URL("/", request.url);
  const shell = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (!shell.ok) return shell;

  const bootstrap = {
    poll,
    pollId,
    missing,
  };
  const html = (await shell.text())
    .replace(
      "<!--APP_META-->",
      pageMetadata(request, poll, pollId, missing),
    )
    .replace(
      "<!--APP_BOOTSTRAP-->",
      `<script type="application/json" id="app-bootstrap">${safeJson(bootstrap)}</script>`,
    );
  const headers = new Headers(shell.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set(
    "cache-control",
    pollId ? "private, no-store" : "public, max-age=0, must-revalidate",
  );

  return new Response(html, {
    status: missing ? 404 : 200,
    headers,
  });
}
