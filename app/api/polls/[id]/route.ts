import { ensureSchema, getD1 } from "../../../../db";

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
  const existing = await db
    .prepare("SELECT id FROM polls WHERE id = 'sample'")
    .first();
  if (existing) return;

  const now = new Date();
  const first = new Date(now);
  first.setDate(first.getDate() + ((6 - first.getDay() + 7) % 7 || 7));
  first.setHours(18, 0, 0, 0);
  const dates = [0, 1, 7, 8, 14, 15].map((offset) => {
    const date = new Date(first);
    date.setDate(date.getDate() + offset);
    return date.toISOString();
  });

  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO polls
          (id, title, organizer, location, note, timezone, duration_minutes)
         VALUES ('sample', 'August craft night', 'Gianna', 'The long table at Robin’s', 'Bring a project—or just bring yourself.', 'America/Los_Angeles', 240)`,
      ),
    ...dates.map((startsAt, index) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO poll_options (id, poll_id, starts_at) VALUES (?, 'sample', ?)",
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
    await ensureSchema();
    const { id } = await context.params;
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

    const responseCountRow = await db
      .prepare("SELECT COUNT(*) AS count FROM responses WHERE poll_id = ?")
      .bind(id)
      .first<{ count: number }>();

    const token = new URL(request.url).searchParams.get("voter")?.slice(0, 100);
    let myResponse: { name: string; optionIds: string[] } | null = null;
    if (token) {
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
        voteCount: Number(option.vote_count || 0),
        voters: option.voter_names ? option.voter_names.split("||") : [],
      })),
      myResponse,
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
