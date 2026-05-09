import { Events, type Invite } from "discord.js";
import { logger } from "../../lib/logger";
import { deleteInvite } from "../lib/invite-cache";
import type { BotEvent } from "../index";

export const inviteDeleteEvent: BotEvent = {
  name: Events.InviteDelete,
  execute(inv: unknown) {
    const invite = inv as Invite;
    if (!invite.guild) return;
    deleteInvite(invite.guild.id, invite.code);
    logger.info({ code: invite.code, guildId: invite.guild.id }, "Invite deleted, cache updated");
  },
};
