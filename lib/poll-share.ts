import "server-only";

import { ensureSchema, getD1 } from "../db";
import { samplePollDefaults } from "./sample-poll";

type PollShareRow = {
  title: string;
  organizer: string;
  timezone: string;
};

type PollOptionShareRow = {
  starts_at: string;
};

export type PollShareData = {
  title: string;
  organizer: string;
  timezone: string;
  optionStarts: string[];
};

const MAX_POLL_ID_LENGTH = 100;

function cleanShareText(value: string, maxLength: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export async function getPollShareData(
  rawId: string,
): Promise<PollShareData | null> {
  const id = rawId.slice(0, MAX_POLL_ID_LENGTH);
  if (!id || id !== rawId) return null;

  if (id === "sample") {
    const sample = samplePollDefaults();
    return {
      title: sample.title,
      organizer: sample.organizer,
      timezone: sample.timezone,
      optionStarts: sample.options,
    };
  }

  try {
    await ensureSchema();
    const db = getD1();
    const poll = await db
      .prepare(
        "SELECT title, organizer, timezone FROM polls WHERE id = ?",
      )
      .bind(id)
      .first<PollShareRow>();

    if (!poll) return null;

    const options = await db
      .prepare(
        `SELECT starts_at
         FROM poll_options
         WHERE poll_id = ? AND starts_at > ?
         ORDER BY starts_at ASC
         LIMIT 30`,
      )
      .bind(id, new Date().toISOString())
      .all<PollOptionShareRow>();

    return {
      title: cleanShareText(poll.title, 100),
      organizer: cleanShareText(poll.organizer, 60),
      timezone: cleanShareText(poll.timezone, 80) || "UTC",
      optionStarts: options.results.map((option) => option.starts_at),
    };
  } catch {
    return null;
  }
}

function dateFormatter(
  timezone: string,
  options: Intl.DateTimeFormatOptions,
) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: timezone,
    });
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      timeZone: "UTC",
    });
  }
}

export function formatPollOptionSummary(poll: PollShareData) {
  const dates = poll.optionStarts
    .map((startsAt) => new Date(startsAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) return "Open the poll to see the latest options";

  const countLabel =
    dates.length === 1 ? "1 option" : `${dates.length} options`;
  const dayKey = dateFormatter(poll.timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const compactDate = dateFormatter(poll.timezone, {
    month: "short",
    day: "numeric",
  });

  if (dates.length === 1) {
    const dateAndTime = dateFormatter(poll.timezone, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(dates[0]);
    return `${countLabel} · ${dateAndTime}`;
  }

  const first = dates[0];
  const last = dates[dates.length - 1];
  if (dayKey.format(first) === dayKey.format(last)) {
    return `${countLabel} · ${dateFormatter(poll.timezone, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(first)}`;
  }

  return `${countLabel} · ${compactDate.format(first)} – ${compactDate.format(last)}`;
}
