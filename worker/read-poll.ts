import {
  samplePollDefaults,
  samplePollParticipants,
} from "../lib/sample-poll";

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
};

type VoteRow = {
  response_id: string;
  name: string;
  option_id: string | null;
  status: string | null;
};

function samplePollData() {
  const defaults = samplePollDefaults();
  const participants = samplePollParticipants();
  return {
    id: "sample",
    title: defaults.title,
    organizer: defaults.organizer,
    location: defaults.location,
    note: defaults.note,
    timezone: defaults.timezone,
    durationMinutes: defaults.durationMinutes,
    responseCount: participants.length,
    options: defaults.options.map((startsAt, index) => {
      const id = `sample-${index + 1}`;
      return {
        id,
        startsAt,
        yesVoters: participants
          .filter((participant) =>
            participant.availabilities.some(
              (availability) =>
                availability.optionId === id && availability.status === "yes",
            ),
          )
          .map((participant) => participant.name),
        ifNeededVoters: participants
          .filter((participant) =>
            participant.availabilities.some(
              (availability) =>
                availability.optionId === id &&
                availability.status === "if-needed",
            ),
          )
          .map((participant) => participant.name),
      };
    }),
    participants,
    myResponse: null,
    ephemeral: true,
  };
}

export async function getPollData(
  db: D1Database,
  id: string,
  token: string | null = null,
) {
    if (id === "sample") return samplePollData();

    const poll = await db
      .prepare(
        `SELECT id, title, organizer, location, note, timezone, duration_minutes
         FROM polls WHERE id = ?`,
      )
      .bind(id)
      .first<PollRow>();

    if (!poll) {
      return null;
    }

    const optionRows = await db
      .prepare(
        `SELECT id, starts_at
         FROM poll_options
         WHERE poll_id = ? AND starts_at > ?
         ORDER BY starts_at ASC`,
      )
      .bind(id, new Date().toISOString())
      .all<OptionRow>();

    const validOptionIds = new Set(
      optionRows.results.map((option) => option.id),
    );
    const participantMap = new Map<
      string,
      {
        id: string;
        name: string;
        availabilities: Array<{
          optionId: string;
          status: "yes" | "if-needed";
        }>;
      }
    >();

    const voteRows = await db
        .prepare(
          `SELECT
             r.id AS response_id,
             r.name,
             v.option_id,
             v.status
           FROM responses r
           LEFT JOIN votes v ON v.response_id = r.id
           WHERE r.poll_id = ?
           ORDER BY r.updated_at ASC, r.id ASC`,
        )
        .bind(id)
        .all<VoteRow>();

    for (const row of voteRows.results) {
      let participant = participantMap.get(row.response_id);
      if (!participant) {
        participant = {
          id: row.response_id,
          name: row.name,
          availabilities: [],
        };
        participantMap.set(row.response_id, participant);
      }
      if (
        row.option_id &&
        validOptionIds.has(row.option_id) &&
        (row.status === "yes" || row.status === "if-needed")
      ) {
        participant.availabilities.push({
          optionId: row.option_id,
          status: row.status,
        });
      }
    }
    const participants = Array.from(participantMap.values());

    let myResponse: {
      id: string;
      name: string;
      availabilities: Array<{
        optionId: string;
        status: "yes" | "if-needed";
      }>;
    } | null = null;
    if (token) {
      const mine = await db
        .prepare(
          `SELECT r.id, r.name, v.option_id, v.status
           FROM responses r
           LEFT JOIN votes v ON v.response_id = r.id
           WHERE r.poll_id = ? AND r.voter_token = ?`,
        )
        .bind(id, token)
        .all<{
          id: string;
          name: string;
          option_id: string | null;
          status: string | null;
        }>();
      if (mine.results.length) {
        myResponse = {
          id: mine.results[0].id,
          name: mine.results[0].name,
          availabilities: mine.results.flatMap((row) =>
            row.option_id &&
            validOptionIds.has(row.option_id) &&
            (row.status === "yes" || row.status === "if-needed")
              ? [
                  {
                    optionId: row.option_id,
                    status: row.status,
                  },
                ]
              : [],
          ),
        };
      }
    }

    return {
      id: poll.id,
      title: poll.title,
      organizer: poll.organizer,
      location: poll.location,
      note: poll.note,
      timezone: poll.timezone,
      durationMinutes: poll.duration_minutes,
      responseCount: participants.length,
      options: optionRows.results.map((option: OptionRow) => ({
        id: option.id,
        startsAt: option.starts_at,
        yesVoters: participants
          .filter((participant) =>
            participant.availabilities.some(
              (availability) =>
                availability.optionId === option.id &&
                availability.status === "yes",
            ),
          )
          .map((participant) => participant.name),
        ifNeededVoters: participants
          .filter((participant) =>
            participant.availabilities.some(
              (availability) =>
                availability.optionId === option.id &&
                availability.status === "if-needed",
            ),
          )
          .map((participant) => participant.name),
      })),
      participants,
      myResponse,
    };
}

export async function handleReadPoll(
  request: Request,
  db: D1Database,
  id: string,
) {
  try {
    const token =
      new URL(request.url).searchParams.get("voter")?.slice(0, 100) || null;
    const poll = await getPollData(db, id, token);
    if (!poll) {
      return Response.json({ error: "Poll not found." }, { status: 404 });
    }
    return Response.json(poll);
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
