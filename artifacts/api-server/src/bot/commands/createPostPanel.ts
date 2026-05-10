import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { upsertPanel, setPanelMessage } from "../db/shop";
import { buildPostEmbed } from "../lib/panel-builder";
import type { BotCommand } from "../index";

export const createPostPanelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("createpostpanel")
    .setDescription("Post a rich announcement embed in this channel (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("title").setDescription("Embed title").setRequired(true),
    )
    .addStringOption((o) =>
      o.setName("description").setDescription("Embed body text").setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName("image")
        .setDescription("Image URL to display in the embed")
        .setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName("color")
        .setDescription("Hex color code, e.g. 5865F2 or #FF5733")
        .setRequired(false),
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

    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description") ?? undefined;
    const imageUrl = interaction.options.getString("image") ?? undefined;
    const color = interaction.options.getString("color")?.replace(/^#/, "") ?? undefined;

    const guildId = interaction.guildId!;
    const channelId = interaction.channelId;

    const panel = await upsertPanel(guildId, channelId, "post", title, description, imageUrl, color);
    const embed = buildPostEmbed(title, description ?? null, imageUrl ?? null, color ?? null);

    const channel = interaction.channel as TextChannel;
    const message = await channel.send({ embeds: [embed] });

    await setPanelMessage(panel.id, message.id);

    logger.info({ guildId, channelId, messageId: message.id }, "Post panel created");

    await interaction.editReply({ content: `✅ Post panel created in <#${channelId}>!` });
  },
};
