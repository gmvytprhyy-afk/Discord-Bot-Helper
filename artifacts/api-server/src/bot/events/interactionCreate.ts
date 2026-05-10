import {
  Events,
  EmbedBuilder,
  MessageFlags,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";
import { logger } from "../../lib/logger";
import { getItemById, createTicket } from "../db/shop";
import { getOrCreateUser, removeRTK } from "../db/users";
import { createTicketChannel } from "../lib/ticket";
import type { BotEvent, BotCommand } from "../index";

async function handleShopSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "❌ Shop can only be used inside a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const selectedId = parseInt(interaction.values[0] ?? "0", 10);
  if (!selectedId) {
    await interaction.editReply({ content: "❌ Invalid selection." });
    return;
  }

  const item = await getItemById(selectedId);
  if (!item || !item.isActive) {
    await interaction.editReply({ content: "❌ This item is no longer available." });
    return;
  }

  const price = item.price ?? 0;
  const user = await getOrCreateUser(interaction.user.id);

  if (user.rtk < price) {
    await interaction.editReply({
      content: `❌ You need **${price} RTK** but only have **${user.rtk} RTK**.`,
    });
    return;
  }

  const updated = await removeRTK(interaction.user.id, price);

  const ticketChannel = await createTicketChannel(interaction.guild, interaction.user.id, "buy", item.name);

  const embed = new EmbedBuilder()
    .setTitle("🛒 Purchase Ticket")
    .setColor(0x57f287)
    .addFields(
      { name: "User", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Item", value: item.name, inline: true },
      { name: "Price Paid", value: `${price} RTK`, inline: true },
      { name: "Remaining Balance", value: `${updated.rtk} RTK`, inline: true },
    )
    .setDescription("Staff — please fulfill this order and delete the channel when done.")
    .setTimestamp();

  await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });

  await createTicket(
    interaction.guild.id,
    interaction.user.id,
    item.name,
    "buy",
    ticketChannel.id,
    price,
  );

  logger.info(
    { userId: interaction.user.id, item: item.name, price },
    "Buy ticket channel created",
  );

  await interaction.editReply({
    content: `✅ **${price} RTK** deducted. Your ticket: <#${ticketChannel.id}>`,
  });
}

async function handleSellSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "❌ Sell panel can only be used inside a server.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const selectedId = parseInt(interaction.values[0] ?? "0", 10);
  if (!selectedId) {
    await interaction.editReply({ content: "❌ Invalid selection." });
    return;
  }

  const item = await getItemById(selectedId);
  if (!item || !item.isActive) {
    await interaction.editReply({ content: "❌ This item is no longer available." });
    return;
  }

  const ticketChannel = await createTicketChannel(
    interaction.guild,
    interaction.user.id,
    "sell",
    item.name,
  );

  const embed = new EmbedBuilder()
    .setTitle("💰 Sell Ticket")
    .setColor(0xfee75c)
    .addFields(
      { name: "User", value: `<@${interaction.user.id}>`, inline: true },
      { name: "Item", value: item.name, inline: true },
      { name: "Description", value: item.description ?? "None provided", inline: false },
    )
    .setDescription(
      "Staff — review this sell request and handle payment manually. Delete channel when done.",
    )
    .setTimestamp();

  await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });

  await createTicket(
    interaction.guild.id,
    interaction.user.id,
    item.name,
    "sell",
    ticketChannel.id,
  );

  logger.info(
    { userId: interaction.user.id, item: item.name },
    "Sell ticket channel created",
  );

  await interaction.editReply({
    content: `✅ Sell ticket opened! Staff will contact you in <#${ticketChannel.id}>`,
  });
}

export const interactionCreateEvent: BotEvent = {
  name: Events.InteractionCreate,
  async execute(i: unknown) {
    const interaction = i as Interaction;

    if (interaction.isStringSelectMenu()) {
      try {
        if (interaction.customId === "shop_select") {
          await handleShopSelect(interaction);
        } else if (interaction.customId === "sell_select") {
          await handleSellSelect(interaction);
        }
      } catch (err) {
        logger.error({ err, customId: interaction.customId }, "Select menu error");
        const text = "Something went wrong. Please try again.";
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: text }).catch(() => null);
        } else {
          await interaction.reply({ content: text, flags: MessageFlags.Ephemeral }).catch(() => null);
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands?.get(interaction.commandName) as
      | BotCommand
      | undefined;

    if (!command) {
      logger.warn({ commandName: interaction.commandName }, "Unknown slash command");
      await interaction.reply({ content: "Unknown command.", flags: MessageFlags.Ephemeral });
      return;
    }

    logger.info(
      { commandName: interaction.commandName, user: interaction.user.tag },
      "Slash command received",
    );

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, commandName: interaction.commandName }, "Command execution error");
      const text = "Something went wrong running that command.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: text, flags: MessageFlags.Ephemeral }).catch(() => null);
      } else {
        await interaction.reply({ content: text, flags: MessageFlags.Ephemeral }).catch(() => null);
      }
    }
  },
};
