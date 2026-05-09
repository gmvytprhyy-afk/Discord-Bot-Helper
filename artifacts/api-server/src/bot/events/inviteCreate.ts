import { Events, type Invite } from "discord.js";
import { logger } from "../../lib/logger";
import { setInviteUses } from "../lib/invite-cache";
import type { BotEvent } from "../index";

export const inviteCreateEvent: BotEvent = {
  name: Events.InviteCreate,
  execute(inv: unknown) {
    const invite = inv as Invite;
    if (!invite.guild) return;
    setInviteUses(invite.guild.id, invite.code, invite.uses ?? 0);
    logger.info({ code: invite.code, guildId: invite.guild.id }, "Invite created, cache updated");
  },
};
