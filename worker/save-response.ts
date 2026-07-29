type ResponsePayload = {
  token?: string;
  name?: string;
  optionIds?: string[];
  availabilities?: Array<{
    optionId?: string;
    status?: string;
  }>;
};

type AvailabilityStatus = "yes" | "if-needed";

export async function handleSaveResponse(
  request: Request,
  db: D1Database,
  pollId: string,
) {
  try {
    const body = (await request.json()) as ResponsePayload;
    const token = body.token?.trim().slice(0, 100) || "";
    const name = body.name?.trim().slice(0, 60) || "";
    const rawAvailabilities = Array.isArray(body.availabilities)
      ? body.availabilities
      : (Array.isArray(body.optionIds) ? body.optionIds : []).map(
          (optionId) => ({ optionId, status: "yes" }),
        );
    const availabilityMap = new Map<string, AvailabilityStatus>();
    for (const availability of rawAvailabilities.slice(0, 30)) {
      if (
        typeof availability?.optionId !== "string" ||
        (availability.status !== "yes" &&
          availability.status !== "if-needed")
      ) {
        continue;
      }
      availabilityMap.set(
        availability.optionId.slice(0, 100),
        availability.status,
      );
    }
    const availabilities = Array.from(
      availabilityMap,
      ([optionId, status]) => ({ optionId, status }),
    );
    const optionIds = availabilities.map(
      (availability) => availability.optionId,
    );

    if (!token || !name) {
      return Response.json(
        { error: "A name is required to save this response." },
        { status: 400 },
      );
    }

    // Sample votes must not pile up for every visitor in production.
    if (pollId === "sample") {
      return Response.json({ ok: true, ephemeral: true });
    }

    const poll = await db
      .prepare("SELECT id FROM polls WHERE id = ?")
      .bind(pollId)
      .first();
    if (!poll) {
      return Response.json({ error: "Poll not found." }, { status: 404 });
    }

    if (optionIds.length) {
      const placeholders = optionIds.map(() => "?").join(", ");
      const valid = await db
        .prepare(
          `SELECT id FROM poll_options
           WHERE poll_id = ? AND id IN (${placeholders}) AND starts_at > ?`,
        )
        .bind(pollId, ...optionIds, new Date().toISOString())
        .all<{ id: string }>();
      if (valid.results.length !== optionIds.length) {
        return Response.json(
          { error: "One of those times is no longer available." },
          { status: 400 },
        );
      }
    }

    const existing = await db
      .prepare(
        "SELECT id FROM responses WHERE poll_id = ? AND voter_token = ?",
      )
      .bind(pollId, token)
      .first<{ id: string }>();
    const responseId = existing?.id || crypto.randomUUID();

    const statements = existing
      ? [
          db
            .prepare(
              "UPDATE responses SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .bind(name, responseId),
          db.prepare("DELETE FROM votes WHERE response_id = ?").bind(responseId),
        ]
      : [
          db
            .prepare(
              "INSERT INTO responses (id, poll_id, voter_token, name) VALUES (?, ?, ?, ?)",
            )
            .bind(responseId, pollId, token, name),
        ];

    await db.batch([
      ...statements,
      ...availabilities.map(({ optionId, status }) =>
        db
          .prepare(
            "INSERT INTO votes (response_id, option_id, status) VALUES (?, ?, ?)",
          )
          .bind(responseId, optionId, status),
      ),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The response could not be saved.",
      },
      { status: 500 },
    );
  }
}
