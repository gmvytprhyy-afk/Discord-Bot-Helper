import { Events, type GuildMember, type PartialGuildMember } from "discord.js";
import { logger } from "../../lib/logger";
import { cacheGuildInvites } from "../lib/invite-cache";
import { handleMemberLeave } from "../db/invites";
import type { BotEvent } from "../index";

export const guildMemberRemoveEvent: BotEvent = {
  name: Events.GuildMemberRemove,
  async execute(m: unknown) {
    const member = m as GuildMember | PartialGuildMember;
    const { guild } = member;

    try {
      const result = await handleMemberLeave(member.id, guild.id);

      if (result) {
        logger.info(
          { memberId: member.id, guildId: guild.id, inviterId: result.inviterId },
          "Removed invite RTK from inviter after member left",
        );
      }

      await cacheGuildInvites(guild).catch(() => null);
    } catch (err) {
      logger.error({ err, memberId: member.id, guildId: guild.id }, "Error handling member leave");
    }
  },
};
