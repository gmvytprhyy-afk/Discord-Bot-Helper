import { Events, type GuildMember } from "discord.js";
import { logger } from "../../lib/logger";
import { getCache, cacheGuildInvites } from "../lib/invite-cache";
import { recordMemberInvite } from "../db/invites";
import type { BotEvent } from "../index";

export const guildMemberAddEvent: BotEvent = {
  name: Events.GuildMemberAdd,
  async execute(m: unknown) {
    const member = m as GuildMember;
    const { guild } = member;

    const cachedUses = getCache().get(guild.id) ?? new Map<string, number>();

    let currentInvites;
    try {
      currentInvites = await guild.invites.fetch();
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, "Cannot fetch invites on member join");
      return;
    }

    let usedCode: string | null = null;
    let inviterId: string | null = null;

    for (const invite of currentInvites.values()) {
      const prevUses = cachedUses.get(invite.code) ?? 0;
      const currUses = invite.uses ?? 0;

      if (currUses > prevUses) {
        usedCode = invite.code;
        inviterId = invite.inviter?.id ?? null;
        break;
      }
    }

    await cacheGuildInvites(guild);

    if (!usedCode || !inviterId) {
      logger.info(
        { memberId: member.id, guildId: guild.id },
        "Could not determine invite used (vanity URL or unknown)",
      );
      return;
    }

    try {
      await recordMemberInvite(member.id, guild.id, inviterId, usedCode);

      const inviterMember = await guild.members.fetch(inviterId).catch(() => null);
      const inviterName = inviterMember?.user.username ?? inviterId;

      await member
        .send(
          `👋 Welcome to **${guild.name}**! You were invited by **${inviterName}**.`,
        )
        .catch(() => null);
    } catch (err) {
      logger.error({ err, memberId: member.id }, "Failed to record member invite");
    }
  },
};
