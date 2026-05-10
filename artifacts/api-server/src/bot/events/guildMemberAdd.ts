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

    const cachedUses = getCache().get(guild.id) ?? new Map<string, { uses: number; inviterId: string | null }>();

    let currentInvites;
    try {
      currentInvites = await guild.invites.fetch();
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, "Cannot fetch invites on member join");
      return;
    }

    let usedCode: string | null = null;
    let inviterId: string | null = null;

    // Check for invites where the use count increased
    for (const invite of currentInvites.values()) {
      const cached = cachedUses.get(invite.code);
      const prevUses = cached?.uses ?? 0;
      const currUses = invite.uses ?? 0;

      if (currUses > prevUses) {
        usedCode = invite.code;
        inviterId = invite.inviter?.id ?? cached?.inviterId ?? null;
        break;
      }
    }

    // Handle one-time invites (max-uses=1): they get deleted after use and won't
    // appear in currentInvites. Detect them by finding codes that vanished from cache.
    if (!usedCode) {
      for (const [code, info] of cachedUses.entries()) {
        if (!currentInvites.has(code) && info.inviterId) {
          usedCode = code;
          inviterId = info.inviterId;
          logger.info({ code, guildId: guild.id }, "Detected one-time invite use (deleted after use)");
          break;
        }
      }
    }

    // Refresh the cache now that we've read it
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
        .send(`👋 Welcome to **${guild.name}**! You were invited by **${inviterName}**.`)
        .catch(() => null);
    } catch (err) {
      logger.error({ err, memberId: member.id }, "Failed to record member invite");
    }
  },
};
