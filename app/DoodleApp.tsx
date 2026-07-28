"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  calendarDays,
  localDateFromKey,
  localDateKey,
  monthKeyForDate,
  optionAtDefaultTime,
  shiftMonth,
} from "../lib/calendar";

type AvailabilityStatus = "yes" | "if-needed";

type Availability = {
  optionId: string;
  status: AvailabilityStatus;
};

type PollOption = {
  id: string;
  startsAt: string;
  yesVoters: string[];
  ifNeededVoters: string[];
};

type PollParticipant = {
  id: string;
  name: string;
  availabilities: Availability[];
};

type Poll = {
  id: string;
  title: string;
  organizer: string;
  location: string;
  note: string;
  timezone: string;
  durationMinutes: number;
  options: PollOption[];
  participants: PollParticipant[];
  responseCount: number;
  myResponse: {
    id: string;
    name: string;
    availabilities: Availability[];
  } | null;
};

type StoredResponse = {
  token: string;
  name: string;
  availability: Record<string, AvailabilityStatus>;
  submitted: boolean;
};

type LegacyStoredResponse = Partial<StoredResponse> & {
  selectedIds?: string[];
};

type CreateDraft = {
  title: string;
  organizer: string;
  location: string;
  note: string;
  durationMinutes: number;
  options: string[];
};

const brand = (
  <span className="brand" aria-label="doodlebutwithoutfuckingads.com">
    <b>doodle</b><b>butwithout</b><strong>fucking</strong><span>ads</span><i>.</i><em>com</em>
  </span>
);

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5h10M6 4.5V3.25A.75.75 0 016.75 2.5h2.5a.75.75 0 01.75.75V4.5M12.25 4.5l-.4 8.1a1 1 0 01-1 .9H5.15a1 1 0 01-1-.9l-.4-8.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5.5"
        y="5.5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10.5 5.5V4A1.5 1.5 0 009 2.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconList() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 3h6M5 7h6M5 11h6M2.5 3h.01M2.5 7h.01M2.5 11h.01"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="4" height="4" rx="0.7" stroke="currentColor" />
      <rect x="8" y="2" width="4" height="4" rx="0.7" stroke="currentColor" />
      <rect x="2" y="8" width="4" height="4" rx="0.7" stroke="currentColor" />
      <rect x="8" y="8" width="4" height="4" rx="0.7" stroke="currentColor" />
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 14L14 4M7 4h7v7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 8h11M9.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const draftStorageKey = "doodlebutwithoutfuckingads:create-draft";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toLocalInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialTimes() {
  const first = new Date();
  first.setDate(first.getDate() + 2);
  first.setHours(18, 0, 0, 0);
  const second = new Date(first);
  second.setDate(second.getDate() + 1);
  return [toLocalInput(first), toLocalInput(second)];
}

function nextMonthCraftNight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const month = new Intl.DateTimeFormat(undefined, { month: "long" }).format(
    next,
  );
  return `${month} craft night`;
}

function makeToken() {
  return crypto.randomUUID();
}

function normalizeStoredResponse(
  value: LegacyStoredResponse | null,
): StoredResponse {
  const legacyAvailability = Object.fromEntries(
    (value?.selectedIds || [])
      .filter((optionId): optionId is string => typeof optionId === "string")
      .map((optionId) => [optionId, "yes" as const]),
  );
  const availability = Object.fromEntries(
    Object.entries(value?.availability || legacyAvailability).filter(
      (entry): entry is [string, AvailabilityStatus] =>
        entry[1] === "yes" || entry[1] === "if-needed",
    ),
  );
  return {
    token: typeof value?.token === "string" ? value.token : makeToken(),
    name: typeof value?.name === "string" ? value.name : "",
    availability,
    submitted: Boolean(value?.submitted),
  };
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const CREATE_DURATIONS = [
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" },
  { value: 1440, label: "All day" },
];

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});
const calendarMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});
const calendarDayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

function durationLabel(minutes: number) {
  if (minutes >= 1440) return "All day";
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${Math.floor(minutes / 60)}½ hours`;
}

function formatSlotRange(value: string, durationMinutes: number) {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  const day = dayFormatter.format(start);
  if (durationMinutes >= 1440) {
    return { day, time: "All day" };
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    day,
    time: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

function sortOptions(options: string[]) {
  return [...options].sort((a, b) => {
    const aTime = Date.parse(a);
    const bTime = Date.parse(b);
    const aInvalid = Number.isNaN(aTime);
    const bInvalid = Number.isNaN(bTime);
    if (aInvalid && bInvalid) return 0;
    if (aInvalid) return 1;
    if (bInvalid) return -1;
    return aTime - bTime;
  });
}

function PollSkeleton() {
  return (
    <main className="poll-page">
      <nav className="topbar">{brand}</nav>
      <div className="poll-shell loading-shell" aria-label="Loading poll">
        <div className="loading-line short" />
        <div className="loading-line title" />
        <div className="loading-line" />
        <div className="loading-cards">
          <div />
          <div />
          <div />
        </div>
      </div>
    </main>
  );
}

function CreatePoll() {
  const [draft, setDraft] = useState<CreateDraft>({
    title: "",
    organizer: "Gemma",
    location: "",
    note: "",
    durationMinutes: 120,
    options: [],
  });
  const [ready, setReady] = useState(false);
  const [titlePlaceholder, setTitlePlaceholder] = useState("Craft night");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState("");
  const [calendarSelection, setCalendarSelection] = useState<string[]>([]);

  useEffect(() => {
    // Dates, local timezone, and locale formatting only exist on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitlePlaceholder(nextMonthCraftNight());
    const saved = localStorage.getItem(draftStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CreateDraft;
        if (parsed.options?.length) {
          const known = CREATE_DURATIONS.some(
            (item) => item.value === parsed.durationMinutes,
          );
          setDraft({
            ...parsed,
            durationMinutes: known ? parsed.durationMinutes : 120,
            options: sortOptions(parsed.options),
          });
          setReady(true);
          return;
        }
      } catch {
        localStorage.removeItem(draftStorageKey);
      }
    }
    setDraft((current) => ({
      ...current,
      options: sortOptions(initialTimes()),
    }));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft, ready]);

  function update<K extends keyof CreateDraft>(
    key: K,
    value: CreateDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateOption(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    }));
  }

  function toggleEditor(index: number) {
    if (editing === index) {
      setDraft((current) => ({
        ...current,
        options: sortOptions(current.options),
      }));
      setEditing(null);
      return;
    }

    const target = draft.options[index];
    const sorted = sortOptions(draft.options);
    setDraft((current) => ({
      ...current,
      options: sortOptions(current.options),
    }));
    setEditing(sorted.indexOf(target));
  }

  function removeOption(index: number) {
    setDraft((current) => ({
      ...current,
      options: sortOptions(current.options.filter((_, i) => i !== index)),
    }));
    setEditing(null);
  }

  function openCalendar() {
    if (calendarOpen) {
      setCalendarOpen(false);
      setCalendarSelection([]);
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCalendarMonth(monthKeyForDate(tomorrow));
    setCalendarSelection([]);
    setEditing(null);
    setCalendarOpen(true);
  }

  function toggleCalendarDate(dateKey: string) {
    setCalendarSelection((current) => {
      if (current.includes(dateKey)) {
        return current.filter((key) => key !== dateKey);
      }
      if (draft.options.length + current.length >= 30) return current;
      return [...current, dateKey].sort();
    });
  }

  function addCalendarDates() {
    if (!calendarSelection.length) return;
    setDraft((current) => {
      const existing = new Set(
        current.options.map((option) => option.slice(0, 10)),
      );
      const availableSlots = Math.max(0, 30 - current.options.length);
      const additions = calendarSelection
        .filter((dateKey) => !existing.has(dateKey))
        .slice(0, availableSlots)
        .map((dateKey) =>
          optionAtDefaultTime(
            dateKey,
            current.durationMinutes >= 1440,
          ),
        );
      return {
        ...current,
        options: sortOptions([...current.options, ...additions]),
      };
    });
    setCalendarSelection([]);
    setCalendarOpen(false);
    setEditing(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const futureOptions = draft.options
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => date.getTime() > Date.now());

    if (!draft.title.trim() || !draft.organizer.trim()) {
      setError("Add an event name and your name to keep going.");
      return;
    }
    if (futureOptions.length < 2) {
      setError("Add at least two future times so people have a real choice.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          options: futureOptions.map((date) => date.toISOString()),
        }),
      });
      const payload = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        throw new Error(payload.error || "The poll could not be created.");
      }
      localStorage.removeItem(draftStorageKey);
      window.location.href = `/p/${payload.id}`;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The poll could not be created.",
      );
      setCreating(false);
    }
  }

  const todayKey = localDateKey(new Date());
  const currentMonthKey = monthKeyForDate(new Date());
  const existingDateKeys = new Set(
    draft.options.map((option) => option.slice(0, 10)),
  );
  const visibleCalendarDays =
    calendarOpen && calendarMonth ? calendarDays(calendarMonth) : [];
  const calendarSelectionSet = new Set(calendarSelection);

  return (
    <main className="create-page">
      <nav className="topbar create-nav">
        {brand}
        <Link href="/sample" className="text-link desktop-sample-link">
          View a sample
        </Link>
      </nav>

      <section className="create-hero">
        <div className="hero-copy">
          <h1>
            Find a time.
            <br />
            <em>Skip the circus.</em>
          </h1>
          <p className="hero-subtitle">
            a truly tiny group scheduler with no accounts, no ads, and no
            bullshit 😇{" "}
            <Link href="/sample" className="mobile-sample-link">
              View a sample
            </Link>
          </p>
        </div>

        <form className="create-card" onSubmit={submit}>
          <div className="form-heading">
            <h2>What are we planning?</h2>
          </div>

          <div className="two-fields">
            <label>
              <span>
                Event name <span className="required-marker">*</span>
              </span>
              <input
                value={draft.title}
                onChange={(event) => update("title", event.target.value)}
                placeholder={titlePlaceholder}
                autoComplete="off"
                required
              />
            </label>
            <label>
              Duration
              <select
                value={draft.durationMinutes}
                onChange={(event) =>
                  update("durationMinutes", Number(event.target.value))
                }
              >
                {CREATE_DURATIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="two-fields">
            <label>
              <span>
                Your name <span className="required-marker">*</span>
              </span>
              <input
                value={draft.organizer}
                onChange={(event) => update("organizer", event.target.value)}
                placeholder="Gemma"
                autoComplete="name"
                required
              />
            </label>
            <label>
              Place
              <input
                value={draft.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="Narnia"
                autoComplete="off"
              />
            </label>
          </div>

          <div className="form-section">
            <p className="section-label">Pick some times</p>
            <div className="slot-chip-list">
              {!ready
                ? [0, 1].map((index) => (
                    <div
                      className="slot-chip slot-chip-skeleton"
                      key={index}
                      aria-hidden="true"
                    >
                      <div className="slot-chip-row">
                        <div className="slot-chip-face">
                          <span className="slot-chip-when">
                            <strong>&nbsp;</strong>
                            <span>&nbsp;</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                : draft.options.map((option, index) => {
                    const label = formatSlotRange(
                      option,
                      draft.durationMinutes,
                    );
                    const open = editing === index;
                    return (
                      <div
                        className={`slot-chip ${open ? "open" : ""}`}
                        key={index}
                      >
                        <div className="slot-chip-row">
                          <button
                            type="button"
                            className="slot-chip-face"
                            onClick={() => toggleEditor(index)}
                            aria-expanded={open}
                          >
                            {label ? (
                              <span className="slot-chip-when">
                                <strong>{label.day}</strong>
                                <span>{label.time}</span>
                              </span>
                            ) : (
                              <span className="slot-chip-when">
                                <strong>Pick a date & time</strong>
                              </span>
                            )}
                            <span className="slot-chip-edit">
                              {open ? "Done" : "Edit"}
                            </span>
                          </button>
                          {open && (
                            <button
                              type="button"
                              className="slot-chip-action danger"
                              aria-label={`Remove time option ${index + 1}`}
                              onClick={() => removeOption(index)}
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                        {open && (
                          <div className="slot-chip-editor">
                            <input
                              aria-label={`Edit time option ${index + 1}`}
                              type={
                                draft.durationMinutes >= 1440
                                  ? "date"
                                  : "datetime-local"
                              }
                              value={
                                draft.durationMinutes >= 1440
                                  ? option.slice(0, 10)
                                  : option
                              }
                              min={
                                draft.durationMinutes >= 1440
                                  ? toLocalInput(new Date()).slice(0, 10)
                                  : toLocalInput(new Date())
                              }
                              onChange={(event) => {
                                const next =
                                  draft.durationMinutes >= 1440
                                    ? `${event.target.value}T00:00`
                                    : event.target.value;
                                updateOption(index, next);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>

            <div className="calendar-picker-shell">
              <button
                type="button"
                className="add-slot"
                onClick={openCalendar}
                disabled={!ready || draft.options.length >= 30}
                aria-expanded={calendarOpen}
                aria-controls="multi-date-calendar"
              >
                <span aria-hidden="true">{calendarOpen ? "×" : "＋"}</span>
                {calendarOpen ? "Close calendar" : "Add another time"}
              </button>

              {calendarOpen && calendarMonth && (
                <div
                  className="calendar-picker"
                  id="multi-date-calendar"
                  aria-label="Choose future dates"
                >
                  <div className="calendar-picker-header">
                    <button
                      type="button"
                      aria-label="Previous month"
                      disabled={calendarMonth <= currentMonthKey}
                      onClick={() =>
                        setCalendarMonth((current) =>
                          shiftMonth(current, -1),
                        )
                      }
                    >
                      <IconChevron direction="left" />
                    </button>
                    <strong>
                      {calendarMonthFormatter.format(
                        localDateFromKey(calendarMonth),
                      )}
                    </strong>
                    <button
                      type="button"
                      aria-label="Next month"
                      onClick={() =>
                        setCalendarMonth((current) =>
                          shiftMonth(current, 1),
                        )
                      }
                    >
                      <IconChevron direction="right" />
                    </button>
                  </div>

                  <div className="calendar-weekdays" aria-hidden="true">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (weekday) => (
                        <span key={weekday}>{weekday}</span>
                      ),
                    )}
                  </div>

                  <div className="calendar-days">
                    {visibleCalendarDays.map((day) => {
                      const existing = existingDateKeys.has(day.key);
                      const selected = calendarSelectionSet.has(day.key);
                      const unavailable = day.key <= todayKey;
                      const label = calendarDayFormatter.format(day.date);
                      return (
                        <button
                          type="button"
                          className={[
                            !day.inCurrentMonth ? "outside-month" : "",
                            existing ? "existing" : "",
                            selected ? "selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={day.key}
                          disabled={unavailable || existing}
                          aria-label={`${label}${existing ? ", already added" : unavailable ? ", unavailable" : ""}`}
                          aria-pressed={selected}
                          onClick={() => toggleCalendarDate(day.key)}
                        >
                          <span>{day.date.getDate()}</span>
                          {existing && <i aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="calendar-key">
                    <span>
                      <i className="calendar-key-existing" /> Already added
                    </span>
                    <span>
                      <i className="calendar-key-selected" /> New selection
                    </span>
                  </div>

                  <div className="calendar-picker-footer">
                    <p>
                      {calendarSelection.length
                        ? `${calendarSelection.length} ${
                            calendarSelection.length === 1 ? "date" : "dates"
                          } selected`
                        : draft.durationMinutes >= 1440
                          ? "Choose one or more all-day dates."
                          : "New dates start at 6:00 PM."}
                    </p>
                    <button
                      type="button"
                      className="calendar-submit"
                      disabled={!calendarSelection.length}
                      onClick={addCalendarDates}
                    >
                      Add{" "}
                      {calendarSelection.length
                        ? `${calendarSelection.length} ${
                            calendarSelection.length === 1 ? "date" : "dates"
                          }`
                        : "dates"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <label>
              A quick note
              <input
                value={draft.note}
                onChange={(event) => update("note", event.target.value)}
                placeholder="Bring wine"
                autoComplete="off"
              />
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button create-button" disabled={creating}>
            <span>
              {creating ? "Making your poll…" : "Create Poll"}
            </span>
            <IconArrowUpRight />
          </button>
        </form>
      </section>
    </main>
  );
}

function PollView({ pollId }: { pollId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [response, setResponse] = useState<StoredResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(true);
  const [notice, setNotice] = useState("");
  const [noneChosen, setNoneChosen] = useState(false);
  const [resultsView, setResultsView] = useState<"list" | "grid">("list");

  const storageKey = `doodlebutwithoutfuckingads:response:${pollId}`;

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let stored = normalizeStoredResponse(null);
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        stored = normalizeStoredResponse(
          JSON.parse(raw) as LegacyStoredResponse,
        );
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    // Restore this browser's anonymous voter token after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResponse(stored);
  }, [storageKey]);

  const loadPoll = useCallback(
    async (token: string) => {
      setStatus("loading");
      try {
        const request = await fetch(
          `/api/polls/${encodeURIComponent(pollId)}?voter=${encodeURIComponent(token)}`,
        );
        if (!request.ok) {
          setStatus("missing");
          return;
        }
        const data = (await request.json()) as Poll;
        setPoll(data);
        const mine = data.myResponse;
        setResponse((current) => {
          if (!current) return current;
          if (!mine) return current;
          return {
            ...current,
            name: mine.name,
            availability: Object.fromEntries(
              mine.availabilities.map((availability) => [
                availability.optionId,
                availability.status,
              ]),
            ),
            submitted: true,
          };
        });
        if (mine) {
          setNoneChosen(mine.availabilities.length === 0);
          setEditing(false);
        } else {
          // Keep a locally-saved sample vote when the server is ephemeral.
          try {
            const raw = localStorage.getItem(storageKey);
            const stored = raw
              ? normalizeStoredResponse(
                  JSON.parse(raw) as LegacyStoredResponse,
                )
              : null;
            setEditing(!stored?.submitted);
            setNoneChosen(
              Boolean(
                stored?.submitted &&
                  Object.keys(stored.availability).length === 0,
              ),
            );
          } catch {
            setEditing(true);
            setNoneChosen(false);
          }
        }
        setStatus("ready");
      } catch {
        setStatus("missing");
      }
    },
    [pollId, storageKey],
  );

  useEffect(() => {
    if (response?.token && status === "loading") {
      // The poll request synchronizes this client view with shared D1 state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPoll(response.token);
    }
  }, [loadPoll, response?.token, status]);

  useEffect(() => {
    if (response) localStorage.setItem(storageKey, JSON.stringify(response));
  }, [response, storageKey]);

  function toggleOption(optionId: string) {
    if (!editing) setEditing(true);
    setNoneChosen(false);
    setResponse((current) => {
      if (!current) return current;
      const availability = { ...current.availability };
      const currentStatus = availability[optionId];
      if (!currentStatus) {
        availability[optionId] = "yes";
      } else if (currentStatus === "yes") {
        availability[optionId] = "if-needed";
      } else {
        delete availability[optionId];
      }
      return {
        ...current,
        availability,
      };
    });
    setNotice("");
  }

  function pickNone() {
    if (!editing) setEditing(true);
    setNoneChosen(true);
    setResponse((current) =>
      current ? { ...current, availability: {} } : current,
    );
    setNotice("");
  }

  async function saveResponse(event: FormEvent) {
    event.preventDefault();
    if (!response || !response.name.trim()) {
      setNotice("Add your name so the group knows who voted.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const request = await fetch(
        `/api/polls/${encodeURIComponent(pollId)}/responses`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            token: response.token,
            name: response.name.trim(),
            availabilities: Object.entries(response.availability).map(
              ([optionId, status]) => ({ optionId, status }),
            ),
          }),
        },
      );
      if (!request.ok) {
        const payload = (await request.json()) as { error?: string };
        throw new Error(payload.error || "Your response could not be saved.");
      }
      const submittedResponse = { ...response, submitted: true };
      setResponse(submittedResponse);
      localStorage.setItem(storageKey, JSON.stringify(submittedResponse));
      await loadPoll(response.token);
      setEditing(false);
      setNotice("You’re in. Your response is saved.");
    } catch (caught) {
      setNotice(
        caught instanceof Error
          ? caught.message
          : "Your response could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/p/${pollId}`,
    );
    setNotice("Copied to clipboard");
  }

  if (status === "loading" || !response) return <PollSkeleton />;

  if (status === "missing" || !poll) {
    return (
      <main className="missing-page">
        <nav className="topbar">{brand}</nav>
        <section>
          <p className="eyebrow">Nothing to vote on here</p>
          <h1>This poll took a wrong turn.</h1>
          <p>The link may be incomplete, or the poll is no longer available.</p>
          <Link className="primary-button" href="/">
            Make a new poll <IconArrowUpRight />
          </Link>
        </section>
      </main>
    );
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: poll.timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: poll.timezone,
  });
  const showingResults = response.submitted && !editing;
  const participantRows = [...poll.participants];
  if (response.submitted && !poll.myResponse) {
    participantRows.unshift({
      id: "current-response",
      name: response.name,
      availabilities: Object.entries(response.availability).map(
        ([optionId, status]) => ({ optionId, status }),
      ),
    });
  }
  const participantStatus = (
    participant: PollParticipant,
    optionId: string,
  ) =>
    participant.availabilities.find(
      (availability) => availability.optionId === optionId,
    )?.status;
  const optionTotals = (optionId: string) => ({
    yes: participantRows.filter(
      (participant) => participantStatus(participant, optionId) === "yes",
    ).length,
    ifNeeded: participantRows.filter(
      (participant) =>
        participantStatus(participant, optionId) === "if-needed",
    ).length,
  });
  const displayOptions = showingResults
    ? [...poll.options].sort((first, second) => {
        const firstTotals = optionTotals(first.id);
        const secondTotals = optionTotals(second.id);
        return (
          secondTotals.yes - firstTotals.yes ||
          secondTotals.ifNeeded - firstTotals.ifNeeded ||
          first.startsAt.localeCompare(second.startsAt)
        );
      })
    : poll.options;
  const responseStatuses = Object.values(response.availability);
  const responseYesCount = responseStatuses.filter(
    (status) => status === "yes",
  ).length;
  const responseIfNeededCount = responseStatuses.filter(
    (status) => status === "if-needed",
  ).length;

  return (
    <main className="poll-page">
      <nav className="topbar poll-nav">
        <Link href="/" aria-label="doodlebutwithoutfuckingads home">
          {brand}
        </Link>
        <div className="nav-actions">
          <button
            className="share-button"
            type="button"
            onClick={copyLink}
          >
            Copy poll link
            <IconCopy />
          </button>
        </div>
      </nav>

      <div className="poll-shell">
        <header className="poll-intro">
          <div className="poll-title-block">
            <p className="eyebrow">You’re invited</p>
            <h1>{poll.title}</h1>
          </div>
          <div className="poll-meta">
            {poll.location && (
              <div>
                <span className="meta-icon" aria-hidden="true">
                  ✦
                </span>
                <span>{poll.location}</span>
              </div>
            )}
            <div>
              <span className="meta-icon" aria-hidden="true">
                ✦
              </span>
              <span>{durationLabel(poll.durationMinutes)}</span>
            </div>
            <div>
              <span className="meta-icon" aria-hidden="true">
                ✦
              </span>
              <span>Organized by {poll.organizer}</span>
            </div>
          </div>
          {poll.note && <p className="poll-note">“{poll.note}”</p>}
        </header>

        <section className="vote-section">
          <div className="section-heading">
            <div>
              <h2>
                {showingResults
                  ? "Everyone’s availability"
                  : "What works for you?"}
              </h2>
              {!showingResults && (
                <p className="availability-hint">
                  Tap once for Yes, twice for If needed.
                </p>
              )}
            </div>
            {showingResults && (
              <div
                className="results-view-toggle"
                role="group"
                aria-label="Results view"
              >
                <button
                  type="button"
                  className={resultsView === "list" ? "active" : ""}
                  aria-pressed={resultsView === "list"}
                  onClick={() => setResultsView("list")}
                >
                  <IconList />
                  List
                </button>
                <button
                  type="button"
                  className={resultsView === "grid" ? "active" : ""}
                  aria-pressed={resultsView === "grid"}
                  onClick={() => setResultsView("grid")}
                >
                  <IconGrid />
                  Grid
                </button>
              </div>
            )}
          </div>

          {poll.options.length ? (
            showingResults && resultsView === "grid" ? (
              <div className="availability-grid-wrap">
                <table className="availability-grid">
                  <thead>
                    <tr>
                      <th scope="col">Participants</th>
                      {displayOptions.map((option) => {
                        const date = new Date(option.startsAt);
                        const end = new Date(
                          date.getTime() + poll.durationMinutes * 60_000,
                        );
                        return (
                          <th scope="col" key={option.id}>
                            <span>{formatter.format(date)}</span>
                            <strong>
                              {poll.durationMinutes >= 1440
                                ? "All day"
                                : `${timeFormatter.format(date)} – ${timeFormatter.format(end)}`}
                            </strong>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {participantRows.map((participant) => {
                      const isCurrent =
                        participant.id === "current-response" ||
                        participant.id === poll.myResponse?.id;
                      return (
                        <tr key={participant.id}>
                          <th scope="row">
                            <span className="grid-participant">
                              <span className="grid-avatar" aria-hidden="true">
                                {initials(participant.name)}
                              </span>
                              <span>
                                {participant.name}
                                {isCurrent && <small>You</small>}
                              </span>
                            </span>
                          </th>
                          {displayOptions.map((option) => {
                            const status = participantStatus(
                              participant,
                              option.id,
                            );
                            const label =
                              status === "yes"
                                ? "Yes"
                                : status === "if-needed"
                                  ? "If needed"
                                  : "Unavailable";
                            return (
                              <td key={option.id}>
                                <span
                                  className={`grid-status ${status || "unavailable"}`}
                                  aria-label={`${participant.name}: ${label}`}
                                  role="img"
                                  title={label}
                                >
                                  {status === "yes"
                                    ? "✓"
                                    : status === "if-needed"
                                      ? "~"
                                      : "×"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div
                  className="availability-legend"
                  aria-label="Availability key"
                >
                  <span>
                    <i className="yes" aria-hidden="true">✓</i> Yes
                  </span>
                  <span>
                    <i className="if-needed" aria-hidden="true">~</i> If needed
                  </span>
                  <span>
                    <i className="unavailable" aria-hidden="true">×</i>{" "}
                    Unavailable
                  </span>
                </div>
              </div>
            ) : (
              <div className="option-grid">
                {displayOptions.map((option) => {
                  const status = response.availability[option.id];
                  const date = new Date(option.startsAt);
                  const end = new Date(
                    date.getTime() + poll.durationMinutes * 60_000,
                  );
                  const timeLabel =
                    poll.durationMinutes >= 1440
                      ? "All day"
                      : `${timeFormatter.format(date)} – ${timeFormatter.format(end)}`;
                  const yesVoters = participantRows.filter(
                    (participant) =>
                      participantStatus(participant, option.id) === "yes",
                  );
                  const ifNeededVoters = participantRows.filter(
                    (participant) =>
                      participantStatus(participant, option.id) ===
                      "if-needed",
                  );
                  const totalResponses =
                    yesVoters.length + ifNeededVoters.length;
                  const nextStatus =
                    status === "yes"
                      ? "If needed"
                      : status === "if-needed"
                        ? "Unavailable"
                        : "Yes";
                  return (
                    <button
                      className={`option-card ${status === "yes" ? "selected" : ""} ${status === "if-needed" ? "if-needed" : ""}`}
                      type="button"
                      key={option.id}
                      aria-pressed={Boolean(status)}
                      aria-label={`${formatter.format(date)}, ${timeLabel}. ${status === "yes" ? "Yes" : status === "if-needed" ? "If needed" : "Unavailable"}. Select for ${nextStatus}.`}
                      onClick={() => toggleOption(option.id)}
                    >
                      <div className="option-choice">
                        <span className="fake-checkbox" aria-hidden="true">
                          {status === "yes"
                            ? "✓"
                            : status === "if-needed"
                              ? "~"
                              : ""}
                        </span>
                        <div>
                          <span className="option-date">
                            {formatter.format(date)}
                          </span>
                          <strong>{timeLabel}</strong>
                          {status && (
                            <span className="availability-choice-label">
                              {status === "yes" ? "Yes" : "If needed"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="vote-tally">
                        <div className="avatar-stack" aria-hidden="true">
                          {[...yesVoters, ...ifNeededVoters]
                            .slice(0, 3)
                            .map((participant, index) => (
                              <span
                                className={`avatar avatar-${(index % 3) + 1}`}
                                key={participant.id}
                              >
                                {initials(participant.name)}
                              </span>
                            ))}
                        </div>
                        <span>
                          {totalResponses
                            ? `${yesVoters.length} yes · ${ifNeededVoters.length} if needed`
                            : "No responses yet"}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {!showingResults && (
                  <button
                    className={`option-card none-card ${noneChosen ? "selected" : ""}`}
                    type="button"
                    aria-pressed={noneChosen}
                    onClick={pickNone}
                  >
                    <div className="option-choice">
                      <span className="fake-checkbox" aria-hidden="true">
                        {noneChosen ? "✓" : ""}
                      </span>
                      <div>
                        <span className="option-date">No fit</span>
                        <strong>None of the above</strong>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            )
          ) : (
            <div className="empty-options">
              <span>◷</span>
              <h3>There aren’t any upcoming times left.</h3>
              <p>Past options stay out of the way automatically.</p>
            </div>
          )}
        </section>

        <form className="response-bar" onSubmit={saveResponse}>
          <h2 className="response-heading">
            {response.submitted && !editing
              ? "Your response is saved."
              : "Who are you?"}
          </h2>

          {response.submitted && !editing ? (
            <div className="saved-response">
              <span className="saved-check">✓</span>
              <span>
                <strong>{response.name}</strong>
                <small>
                  {responseStatuses.length
                    ? `${responseYesCount} yes · ${responseIfNeededCount} if needed`
                    : "Can’t make these times"}
                </small>
              </span>
              <button type="button" onClick={() => setEditing(true)}>
                Edit response
              </button>
            </div>
          ) : (
            <div className="name-entry">
              <label>
                <span>Your name</span>
                <input
                  value={response.name}
                  onChange={(event) =>
                    setResponse((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Obama"
                  autoComplete="name"
                />
              </label>
              <button
                className="primary-button"
                disabled={saving || poll.options.length === 0}
              >
                <span className="button-label">
                  <span className={saving ? "is-hidden" : undefined}>
                    {response.submitted ? "Update response" : "Submit response"}
                  </span>
                  <span
                    className={saving ? undefined : "is-hidden"}
                    aria-live="polite"
                  >
                    Saving…
                  </span>
                </span>
                <IconArrowRight />
              </button>
              <p>
                Your name is only shown to this group. No emails. No
                accounts.
              </p>
            </div>
          )}
        </form>

        {notice && (
          <div className="toast" role="status">
            <span>✦</span> {notice}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DoodleApp({
  initialPollId,
}: {
  initialPollId: string | null;
}) {
  if (initialPollId) return <PollView pollId={initialPollId} />;
  return <CreatePoll />;
}
