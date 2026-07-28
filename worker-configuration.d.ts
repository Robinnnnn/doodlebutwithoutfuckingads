declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ASSETS: Fetcher;
    POLL_CREATE_RATE_LIMITER: RateLimit;
    POLL_READ_RATE_LIMITER: RateLimit;
    POLL_RESPONSE_RATE_LIMITER: RateLimit;
    IMAGES: {
      input(stream: ReadableStream): {
        transform(options: Record<string, unknown>): {
          output(options: {
            format: string;
            quality: number;
          }): Promise<{ response(): Response }>;
        };
      };
    };
  }
}
