import {
  ChannelType,
  PermissionFlagsBits,
  type OverwriteResolvable,
  type Guild,
  type GuildTextBasedChannel,
} from "discord.js";
import { logger } from "../../lib/logger";

async function getOrCreateTicketsCategory(guild: Guild) {
  await guild.channels.fetch();
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === "tickets",
  );
  if (existing) return existing;

  const created = await guild.channels.create({
    name: "Tickets",
    type: ChannelType.GuildCategory,
  });
  logger.info({ guildId: guild.id }, "Created Tickets category");
  return created;
}

export async function createTicketChannel(
  guild: Guild,
  userId: string,
  type: "buy" | "sell",
  itemName: string,
): Promise<GuildTextBasedChannel> {
  const category = await getOrCreateTicketsCategory(guild);

  const safeName = `${type}-${itemName}-${userId}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 99);

  // Deny @everyone, allow the ticket opener
  const permissionOverwrites: OverwriteResolvable[] = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Allow the bot itself
  const botMember = guild.members.me;
  if (botMember) {
    permissionOverwrites.push({
      id: botMember.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  // Allow all roles that have Moderator-level permissions (ManageMessages or higher)
  const staffRoles = guild.roles.cache.filter(
    (role) =>
      !role.managed && // exclude bot-managed roles
      role.id !== guild.id && // exclude @everyone
      (role.permissions.has(PermissionFlagsBits.ManageMessages) ||
        role.permissions.has(PermissionFlagsBits.ManageChannels) ||
        role.permissions.has(PermissionFlagsBits.Administrator)),
  );

  for (const [roleId] of staffRoles) {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await guild.channels.create({
    name: safeName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });

  logger.info(
    { guildId: guild.id, channelId: channel.id, type, itemName, staffRolesAdded: staffRoles.size },
    "Ticket channel created",
  );

  return channel as GuildTextBasedChannel;
}
