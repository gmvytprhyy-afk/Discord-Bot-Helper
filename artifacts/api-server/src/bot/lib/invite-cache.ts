import { type Client, type Guild } from "discord.js";
import { logger } from "../../lib/logger";

// Map<guildId, Map<inviteCode, uses>>
const cache = new Map<string, Map<string, number>>();

export function getCache(): Map<string, Map<string, number>> {
  return cache;
}

export async function cacheGuildInvites(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map<string, number>();
    for (const invite of invites.values()) {
      map.set(invite.code, invite.uses ?? 0);
    }
    cache.set(guild.id, map);
    logger.info({ guildId: guild.id, count: map.size }, "Cached guild invites");
  } catch (err) {
    logger.warn({ err, guildId: guild.id }, "Could not cache invites for guild (missing permission?)");
  }
}

export async function cacheAllGuildInvites(client: Client<true>): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
}

export function setInviteUses(guildId: string, code: string, uses: number): void {
  const guildMap = cache.get(guildId) ?? new Map<string, number>();
  guildMap.set(code, uses);
  cache.set(guildId, guildMap);
}

export function deleteInvite(guildId: string, code: string): void {
  cache.get(guildId)?.delete(code);
}
