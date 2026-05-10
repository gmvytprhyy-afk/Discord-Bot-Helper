import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  type TextChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { getPanelByChannel, upsertPanel, setPanelMessage } from "../db/shop";
import { buildPostEmbed } from "../lib/panel-builder";
import type { BotCommand } from "../index";

export const editPostCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("editpost")
    .setDescription("Edit the post panel in this channel (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) =>
      o.setName("title").setDescription("New title").setRequired(false),
    )
    .addStringOption((o) =>
      o.setName("description").setDescription("New body text").setRequired(false),
    )
    .addStringOption((o) =>
      o.setName("image").setDescription("New image URL").setRequired(false),
    )
    .addStringOption((o) =>
      o
        .setName("color")
        .setDescription("New hex color, e.g. 5865F2 or #FF5733")
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

    const newTitle = interaction.options.getString("title");
    const newDescription = interaction.options.getString("description");
    const newImage = interaction.options.getString("image");
    const newColor = interaction.options.getString("color");

    if (!newTitle && !newDescription && !newImage && !newColor) {
      await interaction.reply({
        content: "❌ Provide at least one field to update (title, description, image, or color).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const existing = await getPanelByChannel(interaction.channelId, "post");

    if (!existing) {
      await interaction.editReply({
        content:
          "❌ No post panel found in this channel. Use `/createpostpanel` first.",
      });
      return;
    }

    const title = newTitle ?? existing.title;
    const description = newDescription ?? existing.description ?? undefined;
    const imageUrl = newImage ?? existing.imageUrl ?? undefined;
    const color = (newColor?.replace(/^#/, "")) ?? existing.color ?? undefined;

    const panel = await upsertPanel(
      existing.guildId,
      existing.channelId,
      "post",
      title,
      description,
      imageUrl,
      color,
    );

    const embed = buildPostEmbed(title, description ?? null, imageUrl ?? null, color ?? null);

    try {
      const channel = interaction.channel as TextChannel;
      if (existing.messageId) {
        const msg = await channel.messages.fetch(existing.messageId).catch(() => null);
        if (msg) {
          await msg.edit({ embeds: [embed] });
        } else {
          // Original message was deleted — re-post
          const newMsg = await channel.send({ embeds: [embed] });
          await setPanelMessage(panel.id, newMsg.id);
        }
      } else {
        const newMsg = await channel.send({ embeds: [embed] });
        await setPanelMessage(panel.id, newMsg.id);
      }
    } catch (err) {
      logger.error({ err, channelId: interaction.channelId }, "Failed to update post panel message");
      await interaction.editReply({ content: "❌ Could not update the embed. It may have been deleted." });
      return;
    }

    logger.info({ channelId: interaction.channelId }, "Post panel updated");
    await interaction.editReply({ content: "✅ Post panel updated!" });
  },
};
