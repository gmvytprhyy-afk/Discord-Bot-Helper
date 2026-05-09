import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memberInvitesTable = pgTable(
  "member_invites",
  {
    memberId: text("member_id").notNull(),
    guildId: text("guild_id").notNull(),
    inviterId: text("inviter_id").notNull(),
    inviteCode: text("invite_code").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.guildId] })],
);

export const insertMemberInviteSchema = createInsertSchema(
  memberInvitesTable,
).omit({ joinedAt: true });

export type InsertMemberInvite = z.infer<typeof insertMemberInviteSchema>;
export type MemberInvite = typeof memberInvitesTable.$inferSelect;
