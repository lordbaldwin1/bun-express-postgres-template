import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    email: text("email").unique().notNull(),
    hashedPassword: text("hashed_password")
      .notNull()
      .default("unset"),
  });
  
  export type NewUser = typeof users.$inferInsert;
  export type User = typeof users.$inferSelect;
  
  export const refreshTokens = pgTable("refresh_tokens", {
    token: text("token").primaryKey(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
  });
  
  export type NewRefreshToken = typeof refreshTokens.$inferInsert;
  export type RefreshToken = typeof refreshTokens.$inferSelect;