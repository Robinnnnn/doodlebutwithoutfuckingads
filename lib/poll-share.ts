export type PollShareData = {
  title: string;
  organizer: string;
  timezone: string;
  optionStarts: string[];
};

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
