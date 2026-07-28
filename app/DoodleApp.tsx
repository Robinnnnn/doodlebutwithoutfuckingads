"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type PollOption = {
  id: string;
  startsAt: string;
  voteCount: number;
  voters: string[];
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
  responseCount: number;
  myResponse: {
    name: string;
    optionIds: string[];
  } | null;
};

type StoredResponse = {
  token: string;
  name: string;
  selectedIds: string[];
  submitted: boolean;
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
  <span className="brand" aria-label="doodlebutwithoutfuckingads">
    <b>doodle</b><span>butwithout</span><strong>fuckingads</strong><i>.</i>
  </span>
);

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

function makeToken() {
  return crypto.randomUUID();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${Math.floor(minutes / 60)}½ hours`;
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
    organizer: "",
    location: "",
    note: "",
    durationMinutes: 120,
    options: initialTimes(),
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(draftStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as CreateDraft;
      if (parsed.options?.length) {
        // Restore the device-local draft after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(parsed);
      }
    } catch {
      localStorage.removeItem(draftStorageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(draftStorageKey, JSON.stringify(draft));
  }, [draft]);

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
      window.location.href = `/p/${payload.id}?created=1`;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The poll could not be created.",
      );
      setCreating(false);
    }
  }

  return (
    <main className="create-page">
      <nav className="topbar create-nav">
        {brand}
        <Link href="/p/sample" className="text-link">
          View a sample
        </Link>
      </nav>

      <section className="create-hero">
        <div className="hero-copy">
          <p className="eyebrow">Free, fast, and without fucking ads</p>
          <h1>
            Find a time.
            <br />
            <em>Skip the circus.</em>
          </h1>
          <p className="hero-subtitle">
            a truly tiny group scheduler with no accounts, no ads, and no
            bullshit 😇
          </p>
          <div
            className="promise-row"
            aria-label="doodlebutwithoutfuckingads benefits"
          >
            <span>✦ No sign-up</span>
            <span>✦ No email gate</span>
            <span>✦ No past times</span>
          </div>
        </div>

        <form className="create-card" onSubmit={submit}>
          <div className="form-heading">
            <span className="step-number">01</span>
            <div>
              <p className="micro-label">New poll</p>
              <h2>What are we planning?</h2>
            </div>
          </div>

          <label>
            Event name
            <input
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="August craft night"
              autoComplete="off"
            />
          </label>

          <div className="two-fields">
            <label>
              Your name
              <input
                value={draft.organizer}
                onChange={(event) => update("organizer", event.target.value)}
                placeholder="Gianna"
                autoComplete="name"
              />
            </label>
            <label>
              Place <span className="optional">optional</span>
              <input
                value={draft.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="Robin’s place"
                autoComplete="off"
              />
            </label>
          </div>

          <label>
            A quick note <span className="optional">optional</span>
            <input
              value={draft.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Bring a project—or just bring yourself."
              autoComplete="off"
            />
          </label>

          <div className="form-divider" />

          <div className="time-heading">
            <div>
              <p className="micro-label">Options</p>
              <h3>When could it happen?</h3>
            </div>
            <label className="duration-field">
              Length
              <select
                value={draft.durationMinutes}
                onChange={(event) =>
                  update("durationMinutes", Number(event.target.value))
                }
              >
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1½ hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </label>
          </div>

          <div className="time-list">
            {draft.options.map((option, index) => (
              <div className="time-row" key={index}>
                <span>{pad(index + 1)}</span>
                <input
                  aria-label={`Time option ${index + 1}`}
                  type="datetime-local"
                  value={option}
                  min={toLocalInput(new Date())}
                  onChange={(event) => updateOption(index, event.target.value)}
                />
                {draft.options.length > 2 && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Remove time option ${index + 1}`}
                    onClick={() =>
                      update(
                        "options",
                        draft.options.filter((_, i) => i !== index),
                      )
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-time"
            onClick={() =>
              update("options", [
                ...draft.options,
                toLocalInput(
                  new Date(
                    new Date(draft.options.at(-1) || Date.now()).getTime() +
                      86_400_000,
                  ),
                ),
              ])
            }
          >
            <span>＋</span> Add another time
          </button>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button create-button" disabled={creating}>
            <span>{creating ? "Making your poll…" : "Create & get the link"}</span>
            <span aria-hidden="true">↗</span>
          </button>
        </form>
      </section>

      <footer className="landing-footer">
        <span>Exactly what it says on the tin.</span>
        <span>Made for humans who just need a time.</span>
      </footer>
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

  const storageKey = `doodlebutwithoutfuckingads:response:${pollId}`;

  useEffect(() => {
    let stored: StoredResponse = {
      token: makeToken(),
      name: "",
      selectedIds: [],
      submitted: false,
    };
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        stored = { ...stored, ...(JSON.parse(raw) as StoredResponse) };
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
        setResponse((current) => {
          if (!current) return current;
          if (!data.myResponse) return current;
          return {
            ...current,
            name: data.myResponse.name,
            selectedIds: data.myResponse.optionIds,
            submitted: true,
          };
        });
        setEditing(!data.myResponse);
        setStatus("ready");
      } catch {
        setStatus("missing");
      }
    },
    [pollId],
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
    setResponse((current) => {
      if (!current) return current;
      return {
        ...current,
        selectedIds: current.selectedIds.includes(optionId)
          ? current.selectedIds.filter((id) => id !== optionId)
          : [...current.selectedIds, optionId],
      };
    });
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
            optionIds: response.selectedIds,
          }),
        },
      );
      if (!request.ok) {
        const payload = (await request.json()) as { error?: string };
        throw new Error(payload.error || "Your response could not be saved.");
      }
      setResponse((current) =>
        current ? { ...current, submitted: true } : current,
      );
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
    setNotice("Poll link copied.");
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
            Make a new poll <span>↗</span>
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

  return (
    <main className="poll-page">
      <nav className="topbar poll-nav">
        <Link href="/" aria-label="doodlebutwithoutfuckingads home">
          {brand}
        </Link>
        <div className="nav-actions">
          <span className="no-account-pill">No account needed</span>
          <button className="share-button" type="button" onClick={copyLink}>
            Copy poll link <span aria-hidden="true">↗</span>
          </button>
        </div>
      </nav>

      <div className="poll-shell">
        <header className="poll-intro">
          <div className="poll-title-block">
            <p className="eyebrow">You’re invited</p>
            <h1>{poll.title}</h1>
            <div className="host-line">
              <span className="avatar host-avatar">
                {initials(poll.organizer)}
              </span>
              <span>
                Organized by <strong>{poll.organizer}</strong>
              </span>
            </div>
          </div>
          <div className="poll-meta">
            {poll.location && (
              <div>
                <span className="meta-icon">⌖</span>
                <span>{poll.location}</span>
              </div>
            )}
            <div>
              <span className="meta-icon">◷</span>
              <span>{durationLabel(poll.durationMinutes)}</span>
            </div>
            <div>
              <span className="meta-icon">◎</span>
              <span>{poll.timezone.replaceAll("_", " ")}</span>
            </div>
          </div>
          {poll.note && <p className="poll-note">“{poll.note}”</p>}
        </header>

        <section className="vote-section">
          <div className="section-heading">
            <div>
              <span className="step-number">01</span>
              <div>
                <p className="micro-label">Your availability</p>
                <h2>What works for you?</h2>
              </div>
            </div>
            <p>
              {poll.responseCount === 0
                ? "Be the first to vote"
                : `${poll.responseCount} ${
                    poll.responseCount === 1 ? "person has" : "people have"
                  } voted`}
            </p>
          </div>

          {poll.options.length ? (
            <div className="option-grid">
              {poll.options.map((option) => {
                const selected = response.selectedIds.includes(option.id);
                const date = new Date(option.startsAt);
                return (
                  <button
                    className={`option-card ${selected ? "selected" : ""}`}
                    type="button"
                    key={option.id}
                    aria-pressed={selected}
                    onClick={() => toggleOption(option.id)}
                  >
                    <div className="option-choice">
                      <span className="fake-checkbox" aria-hidden="true">
                        {selected ? "✓" : ""}
                      </span>
                      <div>
                        <span className="option-date">
                          {formatter.format(date)}
                        </span>
                        <strong>{timeFormatter.format(date)}</strong>
                      </div>
                    </div>
                    <div className="vote-tally">
                      <div className="avatar-stack" aria-hidden="true">
                        {option.voters.slice(0, 3).map((voter, index) => (
                          <span
                            className={`avatar avatar-${(index % 3) + 1}`}
                            key={`${voter}-${index}`}
                          >
                            {initials(voter)}
                          </span>
                        ))}
                      </div>
                      <span>
                        {option.voteCount
                          ? `${option.voteCount} yes`
                          : "No votes yet"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-options">
              <span>◷</span>
              <h3>There aren’t any upcoming times left.</h3>
              <p>Past options stay out of the way automatically.</p>
            </div>
          )}
        </section>

        <form className="response-bar" onSubmit={saveResponse}>
          <div className="response-label">
            <span className="step-number">02</span>
            <div>
              <p className="micro-label">That’s it</p>
              <h2>
                {response.submitted && !editing
                  ? "Your response is saved."
                  : "Who’s voting?"}
              </h2>
            </div>
          </div>

          {response.submitted && !editing ? (
            <div className="saved-response">
              <span className="saved-check">✓</span>
              <span>
                <strong>{response.name}</strong>
                <small>
                  {response.selectedIds.length
                    ? `${response.selectedIds.length} ${
                        response.selectedIds.length === 1 ? "time" : "times"
                      } selected`
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
                  placeholder="e.g. Robin"
                  autoComplete="name"
                />
              </label>
              <button
                className="primary-button"
                disabled={saving || poll.options.length === 0}
              >
                <span>{saving ? "Saving…" : response.submitted ? "Update response" : "Submit response"}</span>
                <span aria-hidden="true">→</span>
              </button>
              <p>Your name is only shown to this group. No email gate. No account.</p>
            </div>
          )}
        </form>

        {notice && (
          <div className="toast" role="status">
            <span>✦</span> {notice}
          </div>
        )}
      </div>

      <footer className="poll-footer">
        <span>{brand}</span>
        <span>Scheduling, without the nonsense.</span>
      </footer>
    </main>
  );
}

export default function DoodleApp({
  initialPollId,
}: {
  initialPollId: string | null;
}) {
  const [pollId] = useState<string | null>(initialPollId);

  const page = useMemo(() => {
    if (pollId) return <PollView pollId={pollId} />;
    return <CreatePoll />;
  }, [pollId]);

  return page;
}
