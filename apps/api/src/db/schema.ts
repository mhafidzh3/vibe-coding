import { pgTable, serial, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
}));

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
  userId: serial("user_id").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return [
    index("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_refresh_token_hash").on(table.refreshTokenHash),
    index("idx_sessions_expires_at").on(table.expiresAt),
    index("idx_sessions_refresh_expires_at").on(table.refreshTokenExpiresAt),
    index("idx_sessions_user_id").on(table.userId),
  ];
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
