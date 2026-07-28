import { sql } from "drizzle-orm";
import {
  integer,
  index,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const polls = sqliteTable("polls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  organizer: text("organizer").notNull(),
  location: text("location").notNull().default(""),
  note: text("note").notNull().default(""),
  timezone: text("timezone").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const pollOptions = sqliteTable(
  "poll_options",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    startsAt: text("starts_at").notNull(),
  },
  (table) => [
    index("poll_options_poll_idx").on(table.pollId, table.startsAt),
  ],
);

export const responses = sqliteTable(
  "responses",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    voterToken: text("voter_token").notNull(),
    name: text("name").notNull(),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("responses_poll_voter_idx").on(
      table.pollId,
      table.voterToken,
    ),
  ],
);

export const votes = sqliteTable(
  "votes",
  {
    responseId: text("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("yes"),
  },
  (table) => [primaryKey({ columns: [table.responseId, table.optionId] })],
);
