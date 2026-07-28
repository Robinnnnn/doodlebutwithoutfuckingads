import { env } from "cloudflare:workers";
import { ensureSchema, getD1 } from "../../../../db";
import { enforceRateLimit } from "../../../../lib/rate-limit";
import {
  isLocalDevRequest,
  samplePollDefaults,
} from "../../../../lib/sample-poll";

type PollRow = {
  id: string;
  title: string;
  organizer: string;
  location: string;
  note: string;
  timezone: string;
  duration_minutes: number;
};

type OptionRow = {
  id: string;
  starts_at: string;
  vote_count: number;
  voter_names: string | null;
};

async function ensureSamplePoll() {
  const db = getD1();
  const defaults = samplePollDefaults();

  await db.batch([
    db
      .prepare("DELETE FROM votes WHERE response_id IN (SELECT id FROM responses WHERE poll_id = 'sample')"),
    db.prepare("DELETE FROM responses WHERE poll_id = 'sample'"),
    db.prepare("DELETE FROM poll_options WHERE poll_id = 'sample'"),
    db.prepare("DELETE FROM polls WHERE id = 'sample'"),
    db
      .prepare(
        `INSERT INTO polls
          (id, title, organizer, location, note, timezone, duration_minutes)
         VALUES ('sample', ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        defaults.title,
        defaults.organizer,
        defaults.location,
        defaults.note,
        defaults.timezone,
        defaults.durationMinutes,
      ),
    ...defaults.options.map((startsAt, index) =>
      db
        .prepare(
          "INSERT INTO poll_options (id, poll_id, starts_at) VALUES (?, 'sample', ?)",
        )
        .bind(`sample-${index + 1}`, startsAt),
    ),
  ]);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const rateLimited = await enforceRateLimit({
      binding: env.POLL_READ_RATE_LIMITER,
      request,
      scope: "poll-read",
    });
    if (rateLimited) return rateLimited;

    await ensureSchema();
    const localDev = isLocalDevRequest(request);
    // Rebuild sample so copy/times always match the create form defaults.
    if (id === "sample") await ensureSamplePoll();

    const db = getD1();
    const poll = await db
      .prepare(
        `SELECT id, title, organizer, location, note, timezone, duration_minutes
         FROM polls WHERE id = ?`,
      )
      .bind(id)
      .first<PollRow>();

    if (!poll) {
      return Response.json({ error: "Poll not found." }, { status: 404 });
    }

    const ephemeralSample = id === "sample" && !localDev;

    const options = await db
      .prepare(
        `SELECT
           o.id,
           o.starts_at,
           COUNT(v.response_id) AS vote_count,
           GROUP_CONCAT(r.name, '||') AS voter_names
         FROM poll_options o
         LEFT JOIN votes v ON v.option_id = o.id
         LEFT JOIN responses r ON r.id = v.response_id
         WHERE o.poll_id = ? AND o.starts_at > ?
         GROUP BY o.id, o.starts_at
         ORDER BY o.starts_at ASC`,
      )
      .bind(id, new Date().toISOString())
      .all<OptionRow>();

    const responseCountRow = ephemeralSample
      ? { count: 0 }
      : await db
          .prepare("SELECT COUNT(*) AS count FROM responses WHERE poll_id = ?")
          .bind(id)
          .first<{ count: number }>();

    const token = new URL(request.url).searchParams.get("voter")?.slice(0, 100);
    let myResponse: { name: string; optionIds: string[] } | null = null;
    if (token && !ephemeralSample) {
      const mine = await db
        .prepare(
          `SELECT r.name, v.option_id
           FROM responses r
           LEFT JOIN votes v ON v.response_id = r.id
           WHERE r.poll_id = ? AND r.voter_token = ?`,
        )
        .bind(id, token)
        .all<{ name: string; option_id: string | null }>();
      if (mine.results.length) {
        myResponse = {
          name: mine.results[0].name,
          optionIds: mine.results
            .map((row: { option_id: string | null }) => row.option_id)
            .filter(
              (optionId: string | null): optionId is string =>
                Boolean(optionId),
            ),
        };
      }
    }

    return Response.json({
      id: poll.id,
      title: poll.title,
      organizer: poll.organizer,
      location: poll.location,
      note: poll.note,
      timezone: poll.timezone,
      durationMinutes: poll.duration_minutes,
      responseCount: Number(responseCountRow?.count || 0),
      options: options.results.map((option: OptionRow) => ({
        id: option.id,
        startsAt: option.starts_at,
        voteCount: ephemeralSample ? 0 : Number(option.vote_count || 0),
        voters: ephemeralSample
          ? []
          : option.voter_names
            ? option.voter_names.split("||")
            : [],
      })),
      myResponse,
      ephemeral: ephemeralSample || undefined,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "The poll could not be loaded.",
      },
      { status: 500 },
    );
  }
}
