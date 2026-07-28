import { ensureSchema, getD1 } from "../../../db";
import { createPollSlug } from "../../../lib/poll-slug";

type CreatePollPayload = {
  title?: string;
  organizer?: string;
  location?: string;
  note?: string;
  timezone?: string;
  durationMinutes?: number;
  options?: string[];
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isPollIdCollision(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed: polls.id")
  );
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = (await request.json()) as CreatePollPayload;
    const title = clean(body.title, 100);
    const organizer = clean(body.organizer, 60);
    const location = clean(body.location, 160);
    const note = clean(body.note, 240);
    const timezone = clean(body.timezone, 80) || "UTC";
    const durationMinutes = Math.min(
      720,
      Math.max(15, Number(body.durationMinutes) || 60),
    );
    const options = Array.from(
      new Set(
        (Array.isArray(body.options) ? body.options : [])
          .map((value) => new Date(value))
          .filter(
            (date) =>
              !Number.isNaN(date.getTime()) && date.getTime() > Date.now(),
          )
          .map((date) => date.toISOString()),
      ),
    )
      .sort()
      .slice(0, 30);

    if (!title || !organizer || options.length < 2) {
      return Response.json(
        { error: "An event name, organizer, and two future times are required." },
        { status: 400 },
      );
    }

    const db = getD1();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const id = createPollSlug();

      try {
        await db.batch([
          db
            .prepare(
              `INSERT INTO polls
                (id, title, organizer, location, note, timezone, duration_minutes)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              id,
              title,
              organizer,
              location,
              note,
              timezone,
              durationMinutes,
            ),
          ...options.map((startsAt) =>
            db
              .prepare(
                "INSERT INTO poll_options (id, poll_id, starts_at) VALUES (?, ?, ?)",
              )
              .bind(crypto.randomUUID(), id, startsAt),
          ),
        ]);

        return Response.json({ id }, { status: 201 });
      } catch (error) {
        if (isPollIdCollision(error)) continue;
        throw error;
      }
    }

    return Response.json(
      { error: "A unique poll link could not be made. Please try again." },
      { status: 503 },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The poll could not be created.",
      },
      { status: 500 },
    );
  }
}
