/** True when the request is aimed at a local dev host. */
export function isLocalDevRequest(request: Request) {
  const host = (request.headers.get("host") || "").toLowerCase();
  return (
    host.startsWith("localhost:") ||
    host === "localhost" ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("[::1]")
  );
}

/** Matches the create-form defaults / placeholders. */
export function samplePollDefaults() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    nextMonth,
  );

  const first = new Date();
  first.setDate(first.getDate() + 2);
  first.setHours(18, 0, 0, 0);
  const second = new Date(first);
  second.setDate(second.getDate() + 1);

  return {
    title: `${month} craft night`,
    organizer: "Avery",
    location: "Narnia",
    note: "Bring wine",
    timezone: "America/Los_Angeles",
    durationMinutes: 120,
    options: [first.toISOString(), second.toISOString()],
  };
}

export function samplePollParticipants() {
  return [
    {
      id: "sample-avery",
      name: "Avery",
      availabilities: [
        { optionId: "sample-1", status: "yes" as const },
        { optionId: "sample-2", status: "yes" as const },
      ],
    },
    {
      id: "sample-priya",
      name: "Priya",
      availabilities: [
        { optionId: "sample-1", status: "yes" as const },
        { optionId: "sample-2", status: "if-needed" as const },
      ],
    },
    {
      id: "sample-mateo",
      name: "Mateo",
      availabilities: [
        { optionId: "sample-1", status: "if-needed" as const },
      ],
    },
  ];
}
