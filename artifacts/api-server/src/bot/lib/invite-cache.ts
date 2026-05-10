import { type Client, type Guild } from "discord.js";
import { logger } from "../../lib/logger";

export interface InviteInfo {
  uses: number;
  inviterId: string | null;
}

// Map<guildId, Map<inviteCode, InviteInfo>>
const cache = new Map<string, Map<string, InviteInfo>>();

export function getCache(): Map<string, Map<string, InviteInfo>> {
  return cache;
}

export async function cacheGuildInvites(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map<string, InviteInfo>();
    for (const invite of invites.values()) {
      map.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviter?.id ?? null,
      });
    }
    cache.set(guild.id, map);
    logger.info({ guildId: guild.id, count: map.size }, "Cached guild invites");
  } catch (err) {
    logger.warn({ err, guildId: guild.id }, "Could not cache invites (missing permission?)");
  }
}

export async function cacheAllGuildInvites(client: Client<true>): Promise<void> {
  await Promise.allSettled(
    [...client.guilds.cache.values()].map((guild) => cacheGuildInvites(guild)),
  );
}

export function setInviteInfo(
  guildId: string,
  code: string,
  uses: number,
  inviterId: string | null,
): void {
  const guildMap = cache.get(guildId) ?? new Map<string, InviteInfo>();
  guildMap.set(code, { uses, inviterId });
  cache.set(guildId, guildMap);
}

export function deleteInvite(guildId: string, code: string): void {
  cache.get(guildId)?.delete(code);
}
