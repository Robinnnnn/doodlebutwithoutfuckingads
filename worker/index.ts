/** Cloudflare Worker entry point for doodlebutwithoutfuckingads. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  enforceRateLimit,
  type RateLimitBinding,
} from "../lib/rate-limit";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  POLL_CREATE_RATE_LIMITER?: RateLimitBinding;
  POLL_READ_RATE_LIMITER?: RateLimitBinding;
  POLL_RESPONSE_RATE_LIMITER?: RateLimitBinding;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function rateLimitApiRequest(request: Request, env: Env, pathname: string) {
  const method = request.method.toUpperCase();
  const rule =
    method === "POST" && pathname === "/api/polls"
      ? {
          binding: env.POLL_CREATE_RATE_LIMITER,
          scope: "poll-create",
        }
      : method === "GET" && /^\/api\/polls\/[^/]+$/.test(pathname)
        ? {
            binding: env.POLL_READ_RATE_LIMITER,
            scope: "poll-read",
          }
        : method === "POST" &&
            /^\/api\/polls\/[^/]+\/responses$/.test(pathname)
          ? {
              binding: env.POLL_RESPONSE_RATE_LIMITER,
              scope: "poll-response",
            }
          : null;

  if (!rule) return null;
  return enforceRateLimit({ ...rule, request });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.hostname === "www.doodlebutwithoutfuckingads.com") {
      url.hostname = "doodlebutwithoutfuckingads.com";
      return Response.redirect(url, 308);
    }

    const rateLimited = await rateLimitApiRequest(request, env, url.pathname);
    if (rateLimited) return rateLimited;

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
