import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  type ChatInputCommandInteraction,
  type GuildChannel,
  type TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { getTicketByChannelId, updateTicketStatus } from "../db/shop";
import type { BotCommand } from "../index";

function isInTicketsCategory(channel: GuildChannel): boolean {
  if (!channel.parentId) return false;
  const parent = channel.guild.channels.cache.get(channel.parentId);
  return !!parent && parent.name.toLowerCase() === "tickets";
}

async function tryLogClosure(
  channel: GuildChannel,
  closer: string,
  ticketOwner: string,
  itemName: string,
  ticketType: string,
  reason: string | null,
): Promise<void> {
  const logChannel = channel.guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && c.name.toLowerCase() === "ticket-logs",
  ) as TextChannel | undefined;

  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle("🔒 Ticket Closed")
    .setColor(0xed4245)
    .addFields(
      { name: "Channel", value: `#${channel.name}`, inline: true },
      { name: "Type", value: ticketType, inline: true },
      { name: "Item", value: itemName, inline: true },
      { name: "Opened by", value: `<@${ticketOwner}>`, inline: true },
      { name: "Closed by", value: `<@${closer}>`, inline: true },
    );

  if (reason) embed.addFields({ name: "Reason", value: reason });
  embed.setTimestamp();

  await logChannel.send({ embeds: [embed] });
}

export const closeTicketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("closeticket")
    .setDescription("Close and delete this ticket channel")
    .addStringOption((o) =>
      o.setName("reason").setDescription("Reason for closing").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as GuildChannel;

    if (!isInTicketsCategory(channel)) {
      await interaction.reply({
        content: "❌ This command can only be used inside a ticket channel.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You need Manage Channels permission.", ephemeral: true });
      return;
    }

    const reason = interaction.options.getString("reason");
    const ticket = await getTicketByChannelId(channel.id);

    const embed = new EmbedBuilder()
      .setTitle("🔒 Ticket Closing")
      .setColor(0xed4245)
      .setDescription(
        `This ticket is being closed by <@${interaction.user.id}>.\nChannel will be deleted in **5 seconds**.`,
      );

    if (reason) embed.addFields({ name: "Reason", value: reason });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });

    if (ticket) {
      await updateTicketStatus(channel.id, "closed");
      await tryLogClosure(
        channel,
        interaction.user.id,
        ticket.userId,
        ticket.itemName,
        ticket.type,
        reason,
      );
    }

    logger.info({ channelId: channel.id, closedBy: interaction.user.id }, "Ticket closed");

    setTimeout(() => {
      channel.delete(`Ticket closed by ${interaction.user.tag}`).catch((err) => {
        logger.error({ err, channelId: channel.id }, "Failed to delete ticket channel");
      });
    }, 5000);
  },
};
