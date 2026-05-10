import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { getActiveItems, upsertPanel, setPanelMessage } from "../db/shop";
import { buildSellEmbed, buildSelectMenu } from "../lib/panel-builder";
import type { BotCommand } from "../index";

export const createSellPanelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("createsellpanel")
    .setDescription("Create or replace the sell panel in this channel (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("title").setDescription("Panel title").setRequired(false),
    )
    .addStringOption((o) =>
      o.setName("description").setDescription("Panel description").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "❌ Administrator permission required.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (interaction.channel?.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "❌ This command can only be used in a text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const title = interaction.options.getString("title") ?? "💰 Sell Items";
    const description = interaction.options.getString("description") ?? undefined;
    const guildId = interaction.guildId!;
    const channelId = interaction.channelId;

    const panel = await upsertPanel(guildId, channelId, "sell", title, description);
    const items = await getActiveItems(guildId, "sell");

    const embed = buildSellEmbed(title, description ?? null, items);
    const row = buildSelectMenu("sell_select", "Select an item to sell…", items);

    const channel = interaction.channel as TextChannel;
    const message = await channel.send({ embeds: [embed], components: [row] });

    await setPanelMessage(panel.id, message.id);

    logger.info({ guildId, channelId, messageId: message.id }, "Sell panel created");

    await interaction.editReply({ content: `✅ Sell panel created in <#${channelId}>!` });
  },
};
