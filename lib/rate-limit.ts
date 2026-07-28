export type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type EnforceRateLimitOptions = {
  binding?: RateLimitBinding;
  request: Request;
  scope: string;
  retryAfterSeconds?: number;
};

export const RATE_LIMIT_WINDOW_SECONDS = 60;

function connectingIp(request: Request) {
  const value = request.headers.get("cf-connecting-ip")?.trim();

  // Cloudflare sets this header at the edge. Do not fall back to forwarded
  // headers, which a client can spoof. Local requests without it fail open.
  if (!value || value.length > 64 || /[\s,]/.test(value)) return null;
  return value;
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createRateLimitKey(request: Request, scope: string) {
  const ip = connectingIp(request);
  if (!ip) return null;

  return `${scope}:${await hash(ip)}`;
}

export async function enforceRateLimit({
  binding,
  request,
  scope,
  retryAfterSeconds = RATE_LIMIT_WINDOW_SECONDS,
}: EnforceRateLimitOptions) {
  if (!binding) return null;

  const key = await createRateLimitKey(request, scope);
  if (!key) return null;

  try {
    const { success } = await binding.limit({ key });
    if (success) return null;
  } catch (error) {
    // A rate-limiter outage should not take the scheduler down with it.
    console.warn("Rate limiter unavailable; allowing the request.", error);
    return null;
  }

  return Response.json(
    {
      error: "Too many requests. Please wait a minute and try again.",
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
