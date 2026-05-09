import { and, eq, sql } from "drizzle-orm";
import { db, memberInvitesTable, usersTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import type { MemberInvite } from "@workspace/db";

export async function recordMemberInvite(
  memberId: string,
  guildId: string,
  inviterId: string,
  inviteCode: string,
): Promise<void> {
  await db
    .insert(memberInvitesTable)
    .values({ memberId, guildId, inviterId, inviteCode })
    .onConflictDoUpdate({
      target: [memberInvitesTable.memberId, memberInvitesTable.guildId],
      set: { inviterId, inviteCode, joinedAt: new Date() },
    });

  await db
    .insert(usersTable)
    .values({ discordId: inviterId, invites: 1, rtk: 1 })
    .onConflictDoUpdate({
      target: usersTable.discordId,
      set: {
        invites: sql`${usersTable.invites} + 1`,
        rtk: sql`${usersTable.rtk} + 1`,
      },
    });

  logger.info({ memberId, guildId, inviterId, inviteCode }, "Invite recorded, +1 RTK to inviter");
}

export async function getMemberInvite(
  memberId: string,
  guildId: string,
): Promise<MemberInvite | null> {
  const rows = await db
    .select()
    .from(memberInvitesTable)
    .where(
      and(
        eq(memberInvitesTable.memberId, memberId),
        eq(memberInvitesTable.guildId, guildId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function handleMemberLeave(
  memberId: string,
  guildId: string,
): Promise<{ inviterId: string } | null> {
  const record = await getMemberInvite(memberId, guildId);
  if (!record) return null;

  await db
    .update(usersTable)
    .set({
      invites: sql`GREATEST(${usersTable.invites} - 1, 0)`,
      rtk: sql`GREATEST(${usersTable.rtk} - 1, 0)`,
    })
    .where(eq(usersTable.discordId, record.inviterId));

  await db
    .delete(memberInvitesTable)
    .where(
      and(
        eq(memberInvitesTable.memberId, memberId),
        eq(memberInvitesTable.guildId, guildId),
      ),
    );

  logger.info(
    { memberId, guildId, inviterId: record.inviterId },
    "Member left, -1 RTK from inviter",
  );

  return { inviterId: record.inviterId };
}
