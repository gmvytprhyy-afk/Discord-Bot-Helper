import { eq, sql } from "drizzle-orm";
import { db, usersTable, type DiscordUser } from "@workspace/db";
import { logger } from "../../lib/logger";

export async function getUser(discordId: string): Promise<DiscordUser | null> {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.discordId, discordId))
    .limit(1);

  return rows[0] ?? null;
}

export async function createUser(discordId: string): Promise<DiscordUser> {
  const rows = await db
    .insert(usersTable)
    .values({ discordId, rtk: 0, messages: 0, invites: 0 })
    .onConflictDoNothing()
    .returning();

  if (rows[0]) {
    logger.info({ discordId }, "New user created");
    return rows[0];
  }

  const existing = await getUser(discordId);
  if (!existing) throw new Error(`Failed to create or fetch user ${discordId}`);
  return existing;
}

export async function getOrCreateUser(discordId: string): Promise<DiscordUser> {
  const user = await getUser(discordId);
  return user ?? createUser(discordId);
}

export async function addRTK(discordId: string, amount: number): Promise<DiscordUser> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const rows = await db
    .update(usersTable)
    .set({ rtk: sql`${usersTable.rtk} + ${amount}` })
    .where(eq(usersTable.discordId, discordId))
    .returning();

  if (!rows[0]) throw new Error(`User ${discordId} not found`);
  logger.info({ discordId, amount, newRtk: rows[0].rtk }, "RTK added");
  return rows[0];
}

export async function removeRTK(discordId: string, amount: number): Promise<DiscordUser> {
  if (amount <= 0) throw new Error("Amount must be positive");

  const user = await getOrCreateUser(discordId);
  if (user.rtk < amount) throw new Error("Insufficient RTK balance");

  const rows = await db
    .update(usersTable)
    .set({ rtk: sql`${usersTable.rtk} - ${amount}` })
    .where(eq(usersTable.discordId, discordId))
    .returning();

  if (!rows[0]) throw new Error(`User ${discordId} not found`);
  logger.info({ discordId, amount, newRtk: rows[0].rtk }, "RTK removed");
  return rows[0];
}

const MESSAGES_PER_RTK = 100;

export interface IncrementMessagesResult {
  messages: number;
  earnedRTK: boolean;
  totalRtk: number;
}

export async function incrementMessages(
  discordId: string,
): Promise<IncrementMessagesResult> {
  return db.transaction(async (tx) => {
    const upserted = await tx
      .insert(usersTable)
      .values({ discordId, messages: 1 })
      .onConflictDoUpdate({
        target: usersTable.discordId,
        set: { messages: sql`${usersTable.messages} + 1` },
      })
      .returning();

    const row = upserted[0]!;

    if (row.messages >= MESSAGES_PER_RTK) {
      const rewarded = await tx
        .update(usersTable)
        .set({
          messages: 0,
          rtk: sql`${usersTable.rtk} + 1`,
        })
        .where(eq(usersTable.discordId, discordId))
        .returning();

      const rewardedRow = rewarded[0]!;
      logger.info(
        { discordId, totalRtk: rewardedRow.rtk },
        "RTK awarded for 100 messages",
      );
      return { messages: 0, earnedRTK: true, totalRtk: rewardedRow.rtk };
    }

    return { messages: row.messages, earnedRTK: false, totalRtk: row.rtk };
  });
}

export async function incrementInvites(discordId: string, count = 1): Promise<DiscordUser> {
  const rows = await db
    .insert(usersTable)
    .values({ discordId, invites: count })
    .onConflictDoUpdate({
      target: usersTable.discordId,
      set: { invites: sql`${usersTable.invites} + ${count}` },
    })
    .returning();

  return rows[0]!;
}
