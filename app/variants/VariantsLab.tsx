"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

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
    <b>doodle</b>
    <b>butwithout</b>
    <strong>fucking</strong>
    <span>ads</span>
    <i>.</i>
  </span>
);

const DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1½ hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
];

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

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function formatSlotRange(value: string, durationMinutes: number) {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "";
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${dayFormatter.format(start)} · ${timeFormatter.format(
    start,
  )} – ${timeFormatter.format(end)}`;
}

function durationLabel(minutes: number) {
  return DURATIONS.find((d) => d.value === minutes)?.label || `${minutes} min`;
}

function useCreateForm() {
  const [draft, setDraft] = useState<CreateDraft>({
    title: "",
    organizer: "Gemma",
    location: "",
    note: "",
    durationMinutes: 120,
    options: initialTimes(),
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof CreateDraft>(
    key: K,
    value: CreateDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateOption(index: number, value: string) {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === index ? value : option,
      ),
    }));
  }

  function addOption() {
    setDraft((current) => ({
      ...current,
      options: [
        ...current.options,
        toLocalInput(
          new Date(
            new Date(current.options.at(-1) || Date.now()).getTime() +
              86_400_000,
          ),
        ),
      ],
    }));
  }

  function removeOption(index: number) {
    setDraft((current) => ({
      ...current,
      options: current.options.filter((_, i) => i !== index),
    }));
  }

  function detailsValid() {
    return Boolean(draft.title.trim() && draft.organizer.trim());
  }

  async function submit(event: FormEvent, optionsOverride?: string[]) {
    event.preventDefault();
    setError("");

    const source = optionsOverride ?? draft.options;
    const futureOptions = source
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((date) => date.getTime() > Date.now());

    if (!detailsValid()) {
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

  return {
    draft,
    update,
    updateOption,
    addOption,
    removeOption,
    detailsValid,
    creating,
    error,
    setError,
    submit,
  };
}

type Form = ReturnType<typeof useCreateForm>;

function DetailsFields({ form }: { form: Form }) {
  const { draft, update } = form;
  return (
    <>
      <label className="vl-field">
        <span>
          Event name <span className="required-marker">*</span>
        </span>
        <input
          value={draft.title}
          onChange={(event) => update("title", event.target.value)}
          placeholder={nextMonthCraftNight()}
          autoComplete="off"
          required
        />
      </label>

      <div className="two-fields">
        <label className="vl-field">
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
        <label className="vl-field">
          Place
          <input
            value={draft.location}
            onChange={(event) => update("location", event.target.value)}
            placeholder="Narnia"
            autoComplete="off"
          />
        </label>
      </div>

      <label className="vl-field">
        A quick note
        <input
          value={draft.note}
          onChange={(event) => update("note", event.target.value)}
          placeholder="Bring wine"
          autoComplete="off"
        />
      </label>
    </>
  );
}

function LengthLine({ form }: { form: Form }) {
  const { draft, update } = form;
  return (
    <p className="vl-length-line">
      Each option is
      <select
        value={draft.durationMinutes}
        onChange={(event) =>
          update("durationMinutes", Number(event.target.value))
        }
        aria-label="Length of each option"
      >
        {DURATIONS.map((duration) => (
          <option key={duration.value} value={duration.value}>
            {duration.label}
          </option>
        ))}
      </select>
      long
    </p>
  );
}

function AddTimeButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="vl-add" onClick={onClick}>
      <span aria-hidden="true">＋</span> Add another time
    </button>
  );
}

function SubmitArea({ form }: { form: Form }) {
  return (
    <>
      {form.error && <p className="form-error">{form.error}</p>}
      <button className="primary-button vl-create" disabled={form.creating}>
        <span>
          {form.creating ? "Making your poll…" : "Create & get the link"}
        </span>
        <span aria-hidden="true">↗</span>
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Variant 1 — polished list: same structure as today, but fixed       */
/* ------------------------------------------------------------------ */

function VariantList() {
  const form = useCreateForm();
  const { draft, updateOption, removeOption, addOption } = form;

  return (
    <form className="create-card vl-card" onSubmit={(e) => form.submit(e)}>
      <div className="form-heading">
        <h2>What are we planning?</h2>
      </div>

      <DetailsFields form={form} />

      <div className="vl-section">
        <p className="micro-label">Pick some times</p>
        <LengthLine form={form} />

        <div className="vl-slot-list">
          {draft.options.map((option, index) => (
            <div className="vl-slot" key={index}>
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
                  onClick={() => removeOption(index)}
                >
                  ×
                </button>
              )}
              <span className="vl-slot-hint" aria-hidden="true">
                {formatSlotRange(option, draft.durationMinutes)}
              </span>
            </div>
          ))}
        </div>

        <AddTimeButton onClick={addOption} />
      </div>

      <SubmitArea form={form} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Variant 2 — slot chips: friendly cards, tap to edit inline          */
/* ------------------------------------------------------------------ */

function VariantChips() {
  const form = useCreateForm();
  const { draft, updateOption, removeOption, addOption } = form;
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <form className="create-card vl-card" onSubmit={(e) => form.submit(e)}>
      <div className="form-heading">
        <h2>What are we planning?</h2>
      </div>

      <DetailsFields form={form} />

      <div className="vl-section">
        <p className="micro-label">Pick some times</p>
        <LengthLine form={form} />

        <div className="vl-chip-list">
          {draft.options.map((option, index) => {
            const label = formatSlotRange(option, draft.durationMinutes);
            const open = editing === index;
            return (
              <div className={`vl-chip ${open ? "open" : ""}`} key={index}>
                <button
                  type="button"
                  className="vl-chip-face"
                  onClick={() => setEditing(open ? null : index)}
                  aria-expanded={open}
                >
                  <span className="vl-chip-when">
                    {label ? (
                      <>
                        <strong>{label.split(" · ")[0]}</strong>
                        <span>{label.split(" · ")[1]}</span>
                      </>
                    ) : (
                      <strong>Pick a date & time</strong>
                    )}
                  </span>
                  <span className="vl-chip-actions">
                    <span className="vl-chip-edit">{open ? "Done" : "Edit"}</span>
                    {draft.options.length > 2 && (
                      <span
                        role="button"
                        tabIndex={-1}
                        className="vl-chip-remove"
                        aria-label={`Remove time option ${index + 1}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeOption(index);
                          setEditing(null);
                        }}
                      >
                        ×
                      </span>
                    )}
                  </span>
                </button>
                {open && (
                  <div className="vl-chip-editor">
                    <input
                      aria-label={`Edit time option ${index + 1}`}
                      type="datetime-local"
                      value={option}
                      min={toLocalInput(new Date())}
                      onChange={(event) =>
                        updateOption(index, event.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AddTimeButton onClick={addOption} />
      </div>

      <SubmitArea form={form} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Variant 3 — calendar-first: tap days, one default time + length     */
/* ------------------------------------------------------------------ */

const START_TIMES = Array.from({ length: 15 }, (_, i) => {
  const hour = i + 8;
  const label = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(
    new Date(2026, 0, 1, hour),
  );
  return { value: `${pad(hour)}:00`, label };
});

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

function monthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const cursor = new Date(first);
  cursor.setDate(first.getDate() - first.getDay());
  const weeks: (Date | null)[][] = [];
  do {
    const week: (Date | null)[] = [];
    for (let day = 0; day < 7; day += 1) {
      week.push(
        cursor.getMonth() === view.getMonth() &&
          cursor.getFullYear() === view.getFullYear()
          ? new Date(cursor)
          : null,
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (
    cursor.getFullYear() === view.getFullYear() &&
    cursor.getMonth() === view.getMonth()
  );
  return weeks;
}

function VariantCalendar() {
  const form = useCreateForm();
  const { draft } = form;
  const [view, setView] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState("18:00");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function toggleDay(key: string) {
    setDays((current) =>
      current.includes(key)
        ? current.filter((day) => day !== key)
        : [...current, key].sort(),
    );
  }

  function shiftMonth(offset: number) {
    setView(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  const nowMonth = new Date();
  const canGoBack =
    view.getFullYear() > nowMonth.getFullYear() ||
    (view.getFullYear() === nowMonth.getFullYear() &&
      view.getMonth() > nowMonth.getMonth());

  const selectedOptions = days.map((day) => `${day}T${time}`);
  const weeks = monthGrid(view);

  return (
    <form
      className="create-card vl-card"
      onSubmit={(e) => form.submit(e, selectedOptions)}
    >
      <div className="form-heading">
        <h2>What are we planning?</h2>
      </div>

      <DetailsFields form={form} />

      <div className="vl-section">
        <p className="micro-label">Tap the days that could work</p>

        <div className="vl-cal">
          <div className="vl-cal-head">
            <button
              type="button"
              className="vl-cal-nav"
              onClick={() => shiftMonth(-1)}
              disabled={!canGoBack}
              aria-label="Previous month"
            >
              ←
            </button>
            <strong>
              {new Intl.DateTimeFormat(undefined, {
                month: "long",
                year: "numeric",
              }).format(view)}
            </strong>
            <button
              type="button"
              className="vl-cal-nav"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
            >
              →
            </button>
          </div>
          <div className="vl-cal-grid">
            {["S", "M", "T", "W", "T", "F", "S"].map((dow, index) => (
              <span className="vl-cal-dow" key={index}>
                {dow}
              </span>
            ))}
            {weeks.flat().map((date, index) => {
              if (!date) return <span key={index} />;
              const key = dateKey(date);
              const past = date.getTime() < today.getTime();
              const selected = days.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  className={`vl-cal-day ${selected ? "selected" : ""}`}
                  disabled={past}
                  aria-pressed={selected}
                  aria-label={dayFormatter.format(date)}
                  onClick={() => toggleDay(key)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="vl-cal-settings">
          <label className="vl-inline-field">
            Start time
            <select value={time} onChange={(e) => setTime(e.target.value)}>
              {START_TIMES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="vl-inline-field">
            Length
            <div className="vl-segments" role="group" aria-label="Length">
              {[60, 120, 180, 240].map((minutes) => (
                <button
                  type="button"
                  key={minutes}
                  className={
                    draft.durationMinutes === minutes ? "active" : ""
                  }
                  onClick={() => form.update("durationMinutes", minutes)}
                >
                  {durationLabel(minutes).replace(" hours", "h").replace(" hour", "h")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {days.length > 0 && (
          <div className="vl-chip-list">
            {days.map((day) => {
              const value = `${day}T${time}`;
              const label = formatSlotRange(value, draft.durationMinutes);
              return (
                <div className="vl-chip" key={day}>
                  <div className="vl-chip-face static">
                    <span className="vl-chip-when">
                      <strong>{label.split(" · ")[0]}</strong>
                      <span>{label.split(" · ")[1]}</span>
                    </span>
                    <span className="vl-chip-actions">
                      <button
                        type="button"
                        className="vl-chip-remove"
                        aria-label={`Remove ${label}`}
                        onClick={() => toggleDay(day)}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SubmitArea form={form} />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Variant 4 — two-step flow: details first, times second              */
/* ------------------------------------------------------------------ */

function VariantSteps() {
  const form = useCreateForm();
  const { draft, updateOption, removeOption, addOption, setError } = form;
  const [step, setStep] = useState<1 | 2>(1);
  const [editing, setEditing] = useState<number | null>(null);

  function goNext() {
    if (!form.detailsValid()) {
      setError("Add an event name and your name to keep going.");
      return;
    }
    setError("");
    setStep(2);
  }

  return (
    <form className="create-card vl-card" onSubmit={(e) => form.submit(e)}>
      <div className="vl-progress" aria-label={`Step ${step} of 2`}>
        <span className={`vl-progress-dot ${step >= 1 ? "active" : ""}`} />
        <span className={`vl-progress-dot ${step >= 2 ? "active" : ""}`} />
        <span className="vl-progress-label">
          Step {step} of 2 · {step === 1 ? "The details" : "The times"}
        </span>
      </div>

      {step === 1 ? (
        <>
          <div className="form-heading">
            <h2>What are we planning?</h2>
          </div>
          <DetailsFields form={form} />
          {form.error && <p className="form-error">{form.error}</p>}
          <button
            type="button"
            className="primary-button vl-create"
            onClick={goNext}
          >
            <span>Next: pick some times</span>
            <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <>
          <div className="form-heading">
            <div>
              <h2>When could it happen?</h2>
              <p className="vl-step-context">
                {draft.title || nextMonthCraftNight()} ·{" "}
                {durationLabel(draft.durationMinutes)}
                {draft.location ? ` · ${draft.location}` : ""}
              </p>
            </div>
          </div>

          <LengthLine form={form} />

          <div className="vl-chip-list">
            {draft.options.map((option, index) => {
              const label = formatSlotRange(option, draft.durationMinutes);
              const open = editing === index;
              return (
                <div className={`vl-chip ${open ? "open" : ""}`} key={index}>
                  <button
                    type="button"
                    className="vl-chip-face"
                    onClick={() => setEditing(open ? null : index)}
                    aria-expanded={open}
                  >
                    <span className="vl-chip-when">
                      {label ? (
                        <>
                          <strong>{label.split(" · ")[0]}</strong>
                          <span>{label.split(" · ")[1]}</span>
                        </>
                      ) : (
                        <strong>Pick a date & time</strong>
                      )}
                    </span>
                    <span className="vl-chip-actions">
                      <span className="vl-chip-edit">
                        {open ? "Done" : "Edit"}
                      </span>
                      {draft.options.length > 2 && (
                        <span
                          role="button"
                          tabIndex={-1}
                          className="vl-chip-remove"
                          aria-label={`Remove time option ${index + 1}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            removeOption(index);
                            setEditing(null);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </span>
                  </button>
                  {open && (
                    <div className="vl-chip-editor">
                      <input
                        aria-label={`Edit time option ${index + 1}`}
                        type="datetime-local"
                        value={option}
                        min={toLocalInput(new Date())}
                        onChange={(event) =>
                          updateOption(index, event.target.value)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <AddTimeButton onClick={addOption} />

          {form.error && <p className="form-error">{form.error}</p>}
          <div className="vl-navrow">
            <button
              type="button"
              className="vl-back"
              onClick={() => setStep(1)}
            >
              ← Back
            </button>
            <button className="primary-button" disabled={form.creating}>
              <span>
                {form.creating ? "Making your poll…" : "Create & get the link"}
              </span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Lab shell                                                           */
/* ------------------------------------------------------------------ */

const VARIANTS = [
  {
    id: "list",
    name: "Polished list",
    blurb:
      "Same structure as today, but fixed: no divider, no numerals, full-width rows, and every slot shows a humanized range (“Wed, Jul 29 · 6:00 – 8:00 PM”) so the length setting actually makes sense.",
    component: VariantList,
  },
  {
    id: "chips",
    name: "Slot chips",
    blurb:
      "Each option is a friendly card instead of a raw datetime input. Tap a card to edit it inline. The end time is always visible, so “2 hours” is never a mystery.",
    component: VariantChips,
  },
  {
    id: "calendar",
    name: "Calendar-first",
    blurb:
      "No typing datetimes at all: tap days on a mini calendar, pick one default start time and length, and every selected day becomes an option. Matches how people actually think about scheduling.",
    component: VariantCalendar,
  },
  {
    id: "steps",
    name: "Two-step flow",
    blurb:
      "The form is really two questions — what, then when. Step 1 collects the details, step 2 gets the full card for times, with a summary line so you never lose context.",
    component: VariantSteps,
  },
];

export default function VariantsLab() {
  const [active, setActive] = useState(0);
  const variant = VARIANTS[active];
  const ActiveVariant = variant.component;

  return (
    <main className="vl-page">
      <nav className="topbar">
        <Link href="/" aria-label="doodlebutwithoutfuckingads home">
          {brand}
        </Link>
        <span className="vl-lab-pill">Variant lab</span>
      </nav>

      <div className="vl-shell">
        <h1 className="vl-title">Four ways to fix the bottom half.</h1>

        <div className="vl-switcher" role="tablist" aria-label="Variants">
          {VARIANTS.map((item, index) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={index === active}
              className={`vl-tab ${index === active ? "active" : ""}`}
              onClick={() => setActive(index)}
            >
              <span>{pad(index + 1)}</span> {item.name}
            </button>
          ))}
        </div>

        <p className="vl-blurb">{variant.blurb}</p>
        <p className="vl-note">
          These are fully wired up — hitting “Create & get the link” makes a
          real poll.
        </p>

        <ActiveVariant key={variant.id} />
      </div>
    </main>
  );
}
