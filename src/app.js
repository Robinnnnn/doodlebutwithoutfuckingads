import "./styles.css";
import {
  calendarDays,
  localDateFromKey,
  localDateKey,
  monthKeyForDate,
  optionAtDefaultTime,
  shiftMonth,
} from "./calendar.js";

const app = document.querySelector("#app");
const draftStorageKey = "doodlebutwithoutfuckingads:create-draft";
const createDurations = [
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
  { value: 300, label: "5 hours" },
  { value: 1440, label: "All day" },
];

const brand = `
  <span class="brand" aria-label="doodlebutwithoutfuckingads.com">
    <b>doodle</b><b>butwithout</b><strong>fucking</strong><span>ads</span><i>.</i><em>com</em>
  </span>
`;

const iconTrash = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 4.5h10M6 4.5V3.25A.75.75 0 016.75 2.5h2.5a.75.75 0 01.75.75V4.5M12.25 4.5l-.4 8.1a1 1 0 01-1 .9H5.15a1 1 0 01-1-.9l-.4-8.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const iconCopy = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10.5 5.5V4A1.5 1.5 0 009 2.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const iconList = `
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M5 3h6M5 7h6M5 11h6M2.5 3h.01M2.5 7h.01M2.5 11h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>
`;

const iconGrid = `
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="4" height="4" rx="0.7" stroke="currentColor"/>
    <rect x="8" y="2" width="4" height="4" rx="0.7" stroke="currentColor"/>
    <rect x="2" y="8" width="4" height="4" rx="0.7" stroke="currentColor"/>
    <rect x="8" y="8" width="4" height="4" rx="0.7" stroke="currentColor"/>
  </svg>
`;

const iconArrowUpRight = `
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M4 14L14 4M7 4h7v7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

const iconArrowRight = `
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 8h11M9.5 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

function iconChevron(direction) {
  const path =
    direction === "left" ? "M10 3.5L5.5 8l4.5 4.5" : "M6 3.5L10.5 8 6 12.5";
  return `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="${path}" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The app still works when browser storage is unavailable.
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove when browser storage is unavailable.
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toLocalInput(date) {
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

function normalizeStoredResponse(value) {
  const legacyAvailability = Object.fromEntries(
    (value?.selectedIds || [])
      .filter((optionId) => typeof optionId === "string")
      .map((optionId) => [optionId, "yes"]),
  );
  const availability = Object.fromEntries(
    Object.entries(value?.availability || legacyAvailability).filter(
      ([, status]) => status === "yes" || status === "if-needed",
    ),
  );
  return {
    token: typeof value?.token === "string" ? value.token : makeToken(),
    name: typeof value?.name === "string" ? value.name : "",
    availability,
    submitted: Boolean(value?.submitted),
  };
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function durationLabel(minutes) {
  if (minutes >= 1440) return "All day";
  if (minutes < 60) return `${minutes} min`;
  if (minutes === 60) return "1 hour";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${Math.floor(minutes / 60)}½ hours`;
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

function formatSlotRange(value, durationMinutes) {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  const day = dayFormatter.format(start);
  if (durationMinutes >= 1440) return { day, time: "All day" };
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return {
    day,
    time: `${timeFormatter.format(start)} – ${timeFormatter.format(end)}`,
  };
}

function sortOptions(options) {
  return [...options].sort((first, second) => {
    const firstTime = Date.parse(first);
    const secondTime = Date.parse(second);
    const firstInvalid = Number.isNaN(firstTime);
    const secondInvalid = Number.isNaN(secondTime);
    if (firstInvalid && secondInvalid) return 0;
    if (firstInvalid) return 1;
    if (secondInvalid) return -1;
    return firstTime - secondTime;
  });
}

function readBootstrap() {
  const element = document.querySelector("#app-bootstrap");
  if (!element) return {};
  try {
    return JSON.parse(element.textContent || "{}");
  } catch {
    return {};
  }
}

let createState = null;
let pollState = null;
let noticeTimer = null;

function loadCreateDraft() {
  const fallback = {
    title: "",
    organizer: "Gemma",
    location: "",
    note: "",
    durationMinutes: 120,
    options: initialTimes(),
  };
  const raw = safeStorageGet(draftStorageKey);
  if (!raw) return fallback;
  try {
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.options) || !saved.options.length) return fallback;
    const knownDuration = createDurations.some(
      (item) => item.value === saved.durationMinutes,
    );
    return {
      title: typeof saved.title === "string" ? saved.title : "",
      organizer:
        typeof saved.organizer === "string" ? saved.organizer : "Gemma",
      location: typeof saved.location === "string" ? saved.location : "",
      note: typeof saved.note === "string" ? saved.note : "",
      durationMinutes: knownDuration ? saved.durationMinutes : 120,
      options: sortOptions(saved.options.filter((value) => typeof value === "string")),
    };
  } catch {
    safeStorageRemove(draftStorageKey);
    return fallback;
  }
}

function persistCreateDraft() {
  safeStorageSet(draftStorageKey, JSON.stringify(createState.draft));
}

function calendarTemplate() {
  if (!createState.calendarOpen || !createState.calendarMonth) return "";
  const { draft, calendarMonth, calendarSelection } = createState;
  const todayKey = localDateKey(new Date());
  const currentMonthKey = monthKeyForDate(new Date());
  const existingDateKeys = new Set(
    draft.options.map((option) => option.slice(0, 10)),
  );
  const selection = new Set(calendarSelection);
  const days = calendarDays(calendarMonth);

  return `
    <div class="calendar-picker" id="multi-date-calendar" aria-label="Choose future dates">
      <div class="calendar-picker-header">
        <button
          type="button"
          data-create-action="previous-month"
          aria-label="Previous month"
          ${calendarMonth <= currentMonthKey ? "disabled" : ""}
        >${iconChevron("left")}</button>
        <strong>${escapeHtml(
          calendarMonthFormatter.format(localDateFromKey(calendarMonth)),
        )}</strong>
        <button type="button" data-create-action="next-month" aria-label="Next month">
          ${iconChevron("right")}
        </button>
      </div>
      <div class="calendar-weekdays" aria-hidden="true">
        ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          .map((weekday) => `<span>${weekday}</span>`)
          .join("")}
      </div>
      <div class="calendar-days">
        ${days
          .map((day) => {
            const existing = existingDateKeys.has(day.key);
            const selected = selection.has(day.key);
            const unavailable = day.key <= todayKey;
            const classes = [
              !day.inCurrentMonth ? "outside-month" : "",
              existing ? "existing" : "",
              selected ? "selected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const suffix = existing
              ? ", already added"
              : unavailable
                ? ", unavailable"
                : "";
            return `
              <button
                type="button"
                class="${classes}"
                data-create-action="toggle-calendar-date"
                data-date-key="${day.key}"
                ${unavailable || existing ? "disabled" : ""}
                aria-label="${escapeHtml(calendarDayFormatter.format(day.date) + suffix)}"
                aria-pressed="${selected}"
              >
                <span>${day.date.getDate()}</span>
                ${existing ? '<i aria-hidden="true"></i>' : ""}
              </button>
            `;
          })
          .join("")}
      </div>
      <div class="calendar-key">
        <span><i class="calendar-key-existing"></i> Already added</span>
        <span><i class="calendar-key-selected"></i> New selection</span>
      </div>
      <div class="calendar-picker-footer">
        <p>${
          calendarSelection.length
            ? `${calendarSelection.length} ${
                calendarSelection.length === 1 ? "date" : "dates"
              } selected`
            : draft.durationMinutes >= 1440
              ? "Choose one or more all-day dates."
              : "New dates start at 6:00 PM."
        }</p>
        <button
          type="button"
          class="calendar-submit"
          data-create-action="add-calendar-dates"
          ${calendarSelection.length ? "" : "disabled"}
        >
          Add ${
            calendarSelection.length
              ? `${calendarSelection.length} ${
                  calendarSelection.length === 1 ? "date" : "dates"
                }`
              : "dates"
          }
        </button>
      </div>
    </div>
  `;
}

function slotTemplate(option, index) {
  const label = formatSlotRange(option, createState.draft.durationMinutes);
  const open = createState.editing === index;
  const inputType =
    createState.draft.durationMinutes >= 1440 ? "date" : "datetime-local";
  const inputValue =
    createState.draft.durationMinutes >= 1440 ? option.slice(0, 10) : option;
  const minimum =
    createState.draft.durationMinutes >= 1440
      ? toLocalInput(new Date()).slice(0, 10)
      : toLocalInput(new Date());

  return `
    <div class="slot-chip ${open ? "open" : ""}">
      <div class="slot-chip-row">
        <button
          type="button"
          class="slot-chip-face"
          data-create-action="toggle-editor"
          data-option-index="${index}"
          aria-expanded="${open}"
        >
          ${
            label
              ? `<span class="slot-chip-when"><strong>${escapeHtml(
                  label.day,
                )}</strong><span>${escapeHtml(label.time)}</span></span>`
              : '<span class="slot-chip-when"><strong>Pick a date &amp; time</strong></span>'
          }
          <span class="slot-chip-edit">${open ? "Done" : "Edit"}</span>
        </button>
        ${
          open
            ? `<button
                type="button"
                class="slot-chip-action danger"
                data-create-action="remove-option"
                data-option-index="${index}"
                aria-label="Remove time option ${index + 1}"
              >${iconTrash}</button>`
            : ""
        }
      </div>
      ${
        open
          ? `<div class="slot-chip-editor">
              <input
                aria-label="Edit time option ${index + 1}"
                data-option-input="${index}"
                type="${inputType}"
                value="${escapeHtml(inputValue)}"
                min="${escapeHtml(minimum)}"
              />
            </div>`
          : ""
      }
    </div>
  `;
}

function renderCreate() {
  const { draft, creating, error, calendarOpen } = createState;
  app.innerHTML = `
    <main class="create-page">
      <nav class="topbar create-nav">
        ${brand}
        <a href="/sample" class="text-link desktop-sample-link">View a sample</a>
      </nav>
      <section class="create-hero">
        <div class="hero-copy">
          <h1>Find a time.<br /><em>Skip the circus.</em></h1>
          <p class="hero-subtitle">
            a truly tiny group scheduler with no accounts, no ads, and no bullshit 😇
            <a href="/sample" class="mobile-sample-link">View a sample</a>
          </p>
        </div>
        <form class="create-card" data-create-form>
          <div class="form-heading"><h2>What are we planning?</h2></div>
          <div class="two-fields">
            <label>
              <span>Event name <span class="required-marker">*</span></span>
              <input
                data-draft-field="title"
                value="${escapeHtml(draft.title)}"
                placeholder="${escapeHtml(nextMonthCraftNight())}"
                autocomplete="off"
                required
              />
            </label>
            <label>
              Duration
              <select data-draft-field="durationMinutes">
                ${createDurations
                  .map(
                    (item) =>
                      `<option value="${item.value}" ${
                        item.value === draft.durationMinutes ? "selected" : ""
                      }>${item.label}</option>`,
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="two-fields">
            <label>
              <span>Your name <span class="required-marker">*</span></span>
              <input
                data-draft-field="organizer"
                value="${escapeHtml(draft.organizer)}"
                placeholder="Gemma"
                autocomplete="name"
                required
              />
            </label>
            <label>
              Place
              <input
                data-draft-field="location"
                value="${escapeHtml(draft.location)}"
                placeholder="Narnia"
                autocomplete="off"
              />
            </label>
          </div>
          <div class="form-section">
            <p class="section-label">Pick some times</p>
            <div class="slot-chip-list">
              ${draft.options.map(slotTemplate).join("")}
            </div>
            <div class="calendar-picker-shell">
              <button
                type="button"
                class="add-slot"
                data-create-action="toggle-calendar"
                ${draft.options.length >= 30 ? "disabled" : ""}
                aria-expanded="${calendarOpen}"
                aria-controls="multi-date-calendar"
              >
                <span aria-hidden="true">${calendarOpen ? "×" : "＋"}</span>
                ${calendarOpen ? "Close calendar" : "Add another time"}
              </button>
              ${calendarTemplate()}
            </div>
          </div>
          <div class="form-section">
            <label>
              A quick note
              <input
                data-draft-field="note"
                value="${escapeHtml(draft.note)}"
                placeholder="Bring wine"
                autocomplete="off"
              />
            </label>
          </div>
          ${
            error
              ? `<p class="form-error" role="alert">${escapeHtml(error)}</p>`
              : ""
          }
          <button class="primary-button create-button" ${creating ? "disabled" : ""}>
            <span>${creating ? "Making your poll…" : "Create Poll"}</span>
            ${iconArrowUpRight}
          </button>
        </form>
      </section>
    </main>
  `;
  bindCreateEvents();
}

function addCalendarDates() {
  if (!createState.calendarSelection.length) return;
  const existing = new Set(
    createState.draft.options.map((option) => option.slice(0, 10)),
  );
  const availableSlots = Math.max(0, 30 - createState.draft.options.length);
  const additions = createState.calendarSelection
    .filter((dateKey) => !existing.has(dateKey))
    .slice(0, availableSlots)
    .map((dateKey) =>
      optionAtDefaultTime(
        dateKey,
        createState.draft.durationMinutes >= 1440,
      ),
    );
  createState.draft.options = sortOptions([
    ...createState.draft.options,
    ...additions,
  ]);
  createState.calendarSelection = [];
  createState.calendarOpen = false;
  createState.editing = null;
  persistCreateDraft();
  renderCreate();
}

async function submitCreate(event) {
  event.preventDefault();
  createState.error = "";
  const futureOptions = createState.draft.options
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => date.getTime() > Date.now());

  if (
    !createState.draft.title.trim() ||
    !createState.draft.organizer.trim()
  ) {
    createState.error = "Add an event name and your name to keep going.";
    renderCreate();
    return;
  }
  if (futureOptions.length < 2) {
    createState.error =
      "Add at least two future times so people have a real choice.";
    renderCreate();
    return;
  }

  createState.creating = true;
  renderCreate();
  try {
    const response = await fetch("/api/polls", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...createState.draft,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        options: futureOptions.map((date) => date.toISOString()),
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.id) {
      throw new Error(payload.error || "The poll could not be created.");
    }
    safeStorageRemove(draftStorageKey);
    window.location.assign(`/p/${encodeURIComponent(payload.id)}`);
  } catch (error) {
    createState.error =
      error instanceof Error
        ? error.message
        : "The poll could not be created.";
    createState.creating = false;
    renderCreate();
  }
}

function bindCreateEvents() {
  const form = app.querySelector("[data-create-form]");
  form?.addEventListener("submit", submitCreate);

  app.querySelectorAll("[data-draft-field]").forEach((input) => {
    const eventName = input.tagName === "SELECT" ? "change" : "input";
    input.addEventListener(eventName, () => {
      const field = input.dataset.draftField;
      createState.draft[field] =
        field === "durationMinutes" ? Number(input.value) : input.value;
      persistCreateDraft();
      if (field === "durationMinutes") renderCreate();
    });
  });

  app.querySelectorAll("[data-option-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.optionInput);
      createState.draft.options[index] =
        createState.draft.durationMinutes >= 1440
          ? `${input.value}T00:00`
          : input.value;
      persistCreateDraft();
    });
  });

  app.querySelectorAll("[data-create-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.createAction;
      const index = Number(button.dataset.optionIndex);
      if (action === "toggle-editor") {
        if (createState.editing === index) {
          createState.draft.options = sortOptions(createState.draft.options);
          createState.editing = null;
        } else {
          const target = createState.draft.options[index];
          createState.draft.options = sortOptions(createState.draft.options);
          createState.editing = createState.draft.options.indexOf(target);
        }
      } else if (action === "remove-option") {
        createState.draft.options = sortOptions(
          createState.draft.options.filter((_, optionIndex) => optionIndex !== index),
        );
        createState.editing = null;
      } else if (action === "toggle-calendar") {
        createState.calendarOpen = !createState.calendarOpen;
        createState.calendarSelection = [];
        createState.editing = null;
        if (createState.calendarOpen) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          createState.calendarMonth = monthKeyForDate(tomorrow);
        }
      } else if (action === "previous-month") {
        createState.calendarMonth = shiftMonth(createState.calendarMonth, -1);
      } else if (action === "next-month") {
        createState.calendarMonth = shiftMonth(createState.calendarMonth, 1);
      } else if (action === "toggle-calendar-date") {
        const dateKey = button.dataset.dateKey;
        if (createState.calendarSelection.includes(dateKey)) {
          createState.calendarSelection = createState.calendarSelection.filter(
            (key) => key !== dateKey,
          );
        } else if (
          createState.draft.options.length +
            createState.calendarSelection.length <
          30
        ) {
          createState.calendarSelection = [
            ...createState.calendarSelection,
            dateKey,
          ].sort();
        }
      } else if (action === "add-calendar-dates") {
        addCalendarDates();
        return;
      }
      persistCreateDraft();
      renderCreate();
    });
  });
}

function initCreate() {
  createState = {
    draft: loadCreateDraft(),
    creating: false,
    error: "",
    editing: null,
    calendarOpen: false,
    calendarMonth: "",
    calendarSelection: [],
  };
  renderCreate();
}

function pollSkeleton() {
  app.innerHTML = `
    <main class="poll-page">
      <nav class="topbar">${brand}</nav>
      <div class="poll-shell loading-shell" aria-label="Loading poll">
        <div class="loading-line short"></div>
        <div class="loading-line title"></div>
        <div class="loading-line"></div>
        <div class="loading-cards"><div></div><div></div><div></div></div>
      </div>
    </main>
  `;
}

function renderMissing() {
  app.innerHTML = `
    <main class="missing-page">
      <nav class="topbar">${brand}</nav>
      <section>
        <p class="eyebrow">Nothing to vote on here</p>
        <h1>This poll took a wrong turn.</h1>
        <p>The link may be incomplete, or the poll is no longer available.</p>
        <a class="primary-button" href="/">
          Make a new poll ${iconArrowUpRight}
        </a>
      </section>
    </main>
  `;
}

function participantStatus(participant, optionId) {
  return participant.availabilities.find(
    (availability) => availability.optionId === optionId,
  )?.status;
}

function pollViewModel() {
  const { poll, response } = pollState;
  const showingResults = response.submitted && !pollState.editing;
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
  const optionTotals = (optionId) => ({
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

  return { showingResults, participantRows, displayOptions };
}

function optionCardsTemplate(view, formatter, pollTimeFormatter) {
  return `
    <div class="option-grid">
      ${view.displayOptions
        .map((option) => {
          const status = pollState.response.availability[option.id];
          const date = new Date(option.startsAt);
          const end = new Date(
            date.getTime() + pollState.poll.durationMinutes * 60_000,
          );
          const timeLabel =
            pollState.poll.durationMinutes >= 1440
              ? "All day"
              : `${pollTimeFormatter.format(date)} – ${pollTimeFormatter.format(end)}`;
          const yesVoters = view.participantRows.filter(
            (participant) =>
              participantStatus(participant, option.id) === "yes",
          );
          const ifNeededVoters = view.participantRows.filter(
            (participant) =>
              participantStatus(participant, option.id) === "if-needed",
          );
          const totalResponses = yesVoters.length + ifNeededVoters.length;
          const nextStatus =
            status === "yes"
              ? "If needed"
              : status === "if-needed"
                ? "Unavailable"
                : "Yes";
          const statusLabel =
            status === "yes"
              ? "Yes"
              : status === "if-needed"
                ? "If needed"
                : "Unavailable";
          return `
            <button
              class="option-card ${status === "yes" ? "selected" : ""} ${
                status === "if-needed" ? "if-needed" : ""
              }"
              type="button"
              data-poll-action="toggle-option"
              data-option-id="${escapeHtml(option.id)}"
              aria-pressed="${Boolean(status)}"
              aria-label="${escapeHtml(
                `${formatter.format(date)}, ${timeLabel}. ${statusLabel}. Select for ${nextStatus}.`,
              )}"
            >
              <div class="option-choice">
                <span class="fake-checkbox" aria-hidden="true">${
                  status === "yes" ? "✓" : status === "if-needed" ? "~" : ""
                }</span>
                <div>
                  <span class="option-date">${escapeHtml(
                    formatter.format(date),
                  )}</span>
                  <strong>${escapeHtml(timeLabel)}</strong>
                  ${
                    status
                      ? `<span class="availability-choice-label">${
                          status === "yes" ? "Yes" : "If needed"
                        }</span>`
                      : ""
                  }
                </div>
              </div>
              <div class="vote-tally">
                <div class="avatar-stack" aria-hidden="true">
                  ${[...yesVoters, ...ifNeededVoters]
                    .slice(0, 3)
                    .map(
                      (participant, index) =>
                        `<span class="avatar avatar-${(index % 3) + 1}">${escapeHtml(
                          initials(participant.name),
                        )}</span>`,
                    )
                    .join("")}
                </div>
                <span>${
                  totalResponses
                    ? `${yesVoters.length} yes · ${ifNeededVoters.length} if needed`
                    : "No responses yet"
                }</span>
              </div>
            </button>
          `;
        })
        .join("")}
      ${
        view.showingResults
          ? ""
          : `<button
              class="option-card none-card ${pollState.noneChosen ? "selected" : ""}"
              type="button"
              data-poll-action="pick-none"
              aria-pressed="${pollState.noneChosen}"
            >
              <div class="option-choice">
                <span class="fake-checkbox" aria-hidden="true">${
                  pollState.noneChosen ? "✓" : ""
                }</span>
                <div>
                  <span class="option-date">No fit</span>
                  <strong>None of the above</strong>
                </div>
              </div>
            </button>`
      }
    </div>
  `;
}

function availabilityGridTemplate(view, formatter, pollTimeFormatter) {
  return `
    <div class="availability-grid-wrap">
      <table class="availability-grid">
        <thead>
          <tr>
            <th scope="col">Participants</th>
            ${view.displayOptions
              .map((option) => {
                const date = new Date(option.startsAt);
                const end = new Date(
                  date.getTime() + pollState.poll.durationMinutes * 60_000,
                );
                return `
                  <th scope="col">
                    <span>${escapeHtml(formatter.format(date))}</span>
                    <strong>${
                      pollState.poll.durationMinutes >= 1440
                        ? "All day"
                        : `${escapeHtml(
                            pollTimeFormatter.format(date),
                          )} – ${escapeHtml(pollTimeFormatter.format(end))}`
                    }</strong>
                  </th>
                `;
              })
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${view.participantRows
            .map((participant) => {
              const isCurrent =
                participant.id === "current-response" ||
                participant.id === pollState.poll.myResponse?.id;
              return `
                <tr>
                  <th scope="row">
                    <span class="grid-participant">
                      <span class="grid-avatar" aria-hidden="true">${escapeHtml(
                        initials(participant.name),
                      )}</span>
                      <span>
                        ${escapeHtml(participant.name)}
                        ${isCurrent ? "<small>You</small>" : ""}
                      </span>
                    </span>
                  </th>
                  ${view.displayOptions
                    .map((option) => {
                      const status = participantStatus(participant, option.id);
                      const label =
                        status === "yes"
                          ? "Yes"
                          : status === "if-needed"
                            ? "If needed"
                            : "Unavailable";
                      return `
                        <td>
                          <span
                            class="grid-status ${status || "unavailable"}"
                            aria-label="${escapeHtml(`${participant.name}: ${label}`)}"
                            role="img"
                            title="${label}"
                          >${
                            status === "yes"
                              ? "✓"
                              : status === "if-needed"
                                ? "~"
                                : "×"
                          }</span>
                        </td>
                      `;
                    })
                    .join("")}
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
      <div class="availability-legend" aria-label="Availability key">
        <span><i class="yes" aria-hidden="true">✓</i> Yes</span>
        <span><i class="if-needed" aria-hidden="true">~</i> If needed</span>
        <span><i class="unavailable" aria-hidden="true">×</i> Unavailable</span>
      </div>
    </div>
  `;
}

function voteSectionTemplate(view, formatter, pollTimeFormatter) {
  let options = `
    <div class="empty-options">
      <span>◷</span>
      <h3>There aren’t any upcoming times left.</h3>
      <p>Past options stay out of the way automatically.</p>
    </div>
  `;
  if (pollState.poll.options.length) {
    options =
      view.showingResults && pollState.resultsView === "grid"
        ? availabilityGridTemplate(view, formatter, pollTimeFormatter)
        : optionCardsTemplate(view, formatter, pollTimeFormatter);
  }

  return `
    <section class="vote-section">
      <div class="section-heading">
        <div>
          <h2>${
            view.showingResults
              ? "Everyone’s availability"
              : "What works for you?"
          }</h2>
          ${
            view.showingResults
              ? ""
              : '<p class="availability-hint">Tap once for Yes, twice for If needed.</p>'
          }
        </div>
        ${
          view.showingResults
            ? `<div
                class="results-view-toggle"
                role="group"
                aria-label="Results view"
                data-results-view="${pollState.resultsView}"
              >
                <button
                  type="button"
                  class="${pollState.resultsView === "grid" ? "active" : ""}"
                  data-poll-action="results-grid"
                  aria-pressed="${pollState.resultsView === "grid"}"
                >${iconGrid} Grid</button>
                <button
                  type="button"
                  class="${pollState.resultsView === "list" ? "active" : ""}"
                  data-poll-action="results-list"
                  aria-pressed="${pollState.resultsView === "list"}"
                >${iconList} List</button>
              </div>`
            : ""
        }
      </div>
      ${options}
    </section>
  `;
}

function responseTemplate() {
  const statuses = Object.values(pollState.response.availability);
  const yesCount = statuses.filter((status) => status === "yes").length;
  const ifNeededCount = statuses.filter(
    (status) => status === "if-needed",
  ).length;
  const saved = pollState.response.submitted && !pollState.editing;

  return `
    <form class="response-bar" data-response-form>
      <h2 class="response-heading">${
        saved ? "Your response is saved." : "Who are you?"
      }</h2>
      ${
        saved
          ? `<div class="saved-response">
              <span class="saved-check">✓</span>
              <span>
                <strong>${escapeHtml(pollState.response.name)}</strong>
                <small>${
                  statuses.length
                    ? `${yesCount} yes · ${ifNeededCount} if needed`
                    : "Can’t make these times"
                }</small>
              </span>
              <button type="button" data-poll-action="edit-response">Edit response</button>
            </div>`
          : `<div class="name-entry">
              <label>
                <span>Your name</span>
                <input
                  data-response-name
                  value="${escapeHtml(pollState.response.name)}"
                  placeholder="Obama"
                  autocomplete="name"
                />
              </label>
              <button
                class="primary-button"
                ${pollState.saving || pollState.poll.options.length === 0 ? "disabled" : ""}
              >
                <span class="button-label">
                  <span class="${pollState.saving ? "is-hidden" : ""}">
                    ${
                      pollState.response.submitted
                        ? "Update response"
                        : "Submit response"
                    }
                  </span>
                  <span class="${pollState.saving ? "" : "is-hidden"}" aria-live="polite">
                    Saving…
                  </span>
                </span>
                ${iconArrowRight}
              </button>
              <p>Your name is only shown to this group. No emails. No accounts.</p>
            </div>`
      }
    </form>
  `;
}

function renderPoll() {
  if (!pollState.poll) {
    if (pollState.missing) renderMissing();
    else pollSkeleton();
    return;
  }
  const { poll } = pollState;
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: poll.timezone,
  });
  const pollTimeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: poll.timezone,
  });
  const view = pollViewModel();

  app.innerHTML = `
    <main class="poll-page">
      <nav class="topbar poll-nav">
        <a href="/" aria-label="doodlebutwithoutfuckingads home">${brand}</a>
        <div class="nav-actions">
          <button class="share-button" type="button" data-poll-action="copy-link">
            Copy poll link ${iconCopy}
          </button>
        </div>
      </nav>
      <div class="poll-shell">
        <header class="poll-intro">
          <div class="poll-title-block">
            <p class="eyebrow">You’re invited</p>
            <h1>${escapeHtml(poll.title)}</h1>
          </div>
          <div class="poll-meta">
            ${
              poll.location
                ? `<div><span class="meta-icon" aria-hidden="true">✦</span><span>${escapeHtml(
                    poll.location,
                  )}</span></div>`
                : ""
            }
            <div>
              <span class="meta-icon" aria-hidden="true">✦</span>
              <span>${escapeHtml(durationLabel(poll.durationMinutes))}</span>
            </div>
            <div>
              <span class="meta-icon" aria-hidden="true">✦</span>
              <span>Organized by ${escapeHtml(poll.organizer)}</span>
            </div>
          </div>
          ${
            poll.note
              ? `<p class="poll-note">“${escapeHtml(poll.note)}”</p>`
              : ""
          }
        </header>
        ${voteSectionTemplate(view, formatter, pollTimeFormatter)}
        ${responseTemplate()}
        ${
          pollState.notice
            ? `<div class="toast" role="status"><span>✦</span> ${escapeHtml(
                pollState.notice,
              )}</div>`
            : ""
        }
      </div>
    </main>
  `;
  bindPollEvents();
}

function persistResponse() {
  safeStorageSet(pollState.storageKey, JSON.stringify(pollState.response));
}

function showNotice(message) {
  pollState.notice = message;
  window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => {
    if (!pollState) return;
    pollState.notice = "";
    renderPoll();
  }, 3200);
  renderPoll();
}

async function syncPoll() {
  try {
    const request = await fetch(
      `/api/polls/${encodeURIComponent(pollState.pollId)}?voter=${encodeURIComponent(
        pollState.response.token,
      )}`,
    );
    if (!request.ok) {
      if (!pollState.poll) {
        pollState.missing = true;
        renderMissing();
      }
      return;
    }
    const data = await request.json();
    pollState.poll = data;
    if (data.myResponse) {
      pollState.response = {
        ...pollState.response,
        name: data.myResponse.name,
        availability: Object.fromEntries(
          data.myResponse.availabilities.map((availability) => [
            availability.optionId,
            availability.status,
          ]),
        ),
        submitted: true,
      };
      pollState.noneChosen = data.myResponse.availabilities.length === 0;
      pollState.editing = false;
      persistResponse();
    }
    renderPoll();
  } catch {
    if (!pollState.poll) {
      pollState.missing = true;
      renderMissing();
    }
  }
}

async function saveResponse(event) {
  event.preventDefault();
  if (!pollState.response.name.trim()) {
    showNotice("Add your name so the group knows who voted.");
    return;
  }
  pollState.saving = true;
  pollState.notice = "";
  renderPoll();
  try {
    const request = await fetch(
      `/api/polls/${encodeURIComponent(pollState.pollId)}/responses`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: pollState.response.token,
          name: pollState.response.name.trim(),
          availabilities: Object.entries(pollState.response.availability).map(
            ([optionId, status]) => ({ optionId, status }),
          ),
        }),
      },
    );
    if (!request.ok) {
      const payload = await request.json();
      throw new Error(payload.error || "Your response could not be saved.");
    }
    pollState.response = {
      ...pollState.response,
      name: pollState.response.name.trim(),
      submitted: true,
    };
    pollState.resultsView = "grid";
    persistResponse();
    if (pollState.pollId !== "sample") await syncPoll();
    pollState.editing = false;
    pollState.saving = false;
    showNotice("You’re in. Your response is saved.");
  } catch (error) {
    pollState.saving = false;
    showNotice(
      error instanceof Error
        ? error.message
        : "Your response could not be saved.",
    );
  }
}

async function copyPollLink() {
  const link = `${window.location.origin}/p/${encodeURIComponent(
    pollState.pollId,
  )}`;
  try {
    await navigator.clipboard.writeText(link);
  } catch {
    const input = document.createElement("textarea");
    input.value = link;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  showNotice("Copied to clipboard");
}

function switchResultsView(view, toggle) {
  if (pollState.resultsView === view) return;
  pollState.resultsView = view;
  window.clearTimeout(pollState.resultsViewTimer);

  if (!toggle) {
    renderPoll();
    return;
  }

  toggle.dataset.resultsView = view;
  toggle.querySelectorAll("[data-poll-action]").forEach((button) => {
    const active = button.dataset.pollAction === `results-${view}`;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const reduceMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  pollState.resultsViewTimer = window.setTimeout(
    renderPoll,
    reduceMotion ? 0 : 180,
  );
}

function bindPollEvents() {
  app.querySelector("[data-response-form]")?.addEventListener(
    "submit",
    saveResponse,
  );
  app.querySelector("[data-response-name]")?.addEventListener("input", (event) => {
    pollState.response.name = event.currentTarget.value;
    persistResponse();
  });
  app.querySelectorAll("[data-poll-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.pollAction;
      if (action === "toggle-option") {
        if (!pollState.editing) pollState.editing = true;
        pollState.noneChosen = false;
        const optionId = button.dataset.optionId;
        const current = pollState.response.availability[optionId];
        if (!current) pollState.response.availability[optionId] = "yes";
        else if (current === "yes") {
          pollState.response.availability[optionId] = "if-needed";
        } else {
          delete pollState.response.availability[optionId];
        }
        pollState.notice = "";
        persistResponse();
        renderPoll();
      } else if (action === "pick-none") {
        if (!pollState.editing) pollState.editing = true;
        pollState.noneChosen = true;
        pollState.response.availability = {};
        pollState.notice = "";
        persistResponse();
        renderPoll();
      } else if (action === "results-list") {
        switchResultsView("list", button.closest(".results-view-toggle"));
      } else if (action === "results-grid") {
        switchResultsView("grid", button.closest(".results-view-toggle"));
      } else if (action === "edit-response") {
        pollState.editing = true;
        renderPoll();
      } else if (action === "copy-link") {
        copyPollLink();
      }
    });
  });
}

function initPoll(pollId, initialPoll, missing) {
  const storageKey = `doodlebutwithoutfuckingads:response:${pollId}`;
  let stored = null;
  const raw = safeStorageGet(storageKey);
  if (raw) {
    try {
      stored = JSON.parse(raw);
    } catch {
      safeStorageRemove(storageKey);
    }
  }
  const response = normalizeStoredResponse(stored);
  pollState = {
    pollId,
    poll: initialPoll || null,
    missing: Boolean(missing),
    response,
    storageKey,
    saving: false,
    editing: !response.submitted,
    notice: "",
    noneChosen:
      response.submitted && Object.keys(response.availability).length === 0,
    resultsView: "grid",
    resultsViewTimer: null,
  };
  persistResponse();
  renderPoll();
  if (!missing && pollId !== "sample") syncPoll();
}

const bootstrap = readBootstrap();
const pathname = window.location.pathname;
if (
  bootstrap.pollId ||
  bootstrap.missing ||
  pathname === "/sample" ||
  pathname.startsWith("/p/")
) {
  const pathPollId =
    pathname === "/sample"
      ? "sample"
      : pathname.startsWith("/p/")
        ? decodeURIComponent(pathname.slice(3).split("/")[0])
        : null;
  initPoll(
    bootstrap.pollId || pathPollId,
    bootstrap.poll || null,
    bootstrap.missing,
  );
} else {
  initCreate();
}
