import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { logger } from "../../lib/logger";
import { addItem, removeItem } from "../db/shop";
import { refreshPanel } from "../lib/panel-builder";
import type { BotCommand } from "../index";

export const editPanelsCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("editpanels")
    .setDescription("Add or remove items from shop/sell panels (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("add-shop-item")
        .setDescription("Add an item to the daily shop")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true))
        .addIntegerOption((o) =>
          o.setName("price").setDescription("Price in RTK").setRequired(true).setMinValue(1),
        )
        .addStringOption((o) =>
          o.setName("description").setDescription("Short description").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove-shop-item")
        .setDescription("Remove an item from the daily shop")
        .addStringOption((o) => o.setName("name").setDescription("Exact item name").setRequired(true)),
    )
    .addSubcommand((sub) =>
      sub
        .setName("add-sell-item")
        .setDescription("Add an item to the sell panel")
        .addStringOption((o) => o.setName("name").setDescription("Item name").setRequired(true))
        .addStringOption((o) =>
          o.setName("description").setDescription("Short description").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove-sell-item")
        .setDescription("Remove an item from the sell panel")
        .addStringOption((o) => o.setName("name").setDescription("Exact item name").setRequired(true)),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ Administrator permission required.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;
    const name = interaction.options.getString("name", true);

    if (sub === "add-shop-item") {
      const price = interaction.options.getInteger("price", true);
      const description = interaction.options.getString("description") ?? undefined;
      await addItem(guildId, name, "buy", price, description);
      await refreshPanel(guildId, "shop", interaction.client);
      logger.info({ guildId, name, price }, "Shop item added");
      await interaction.editReply({ content: `✅ Added **${name}** (${price} RTK) to the shop. Panel updated.` });

    } else if (sub === "remove-shop-item") {
      const removed = await removeItem(guildId, name, "buy");
      if (!removed) {
        await interaction.editReply({ content: `❌ No active shop item found named **${name}**.` });
        return;
      }
      await refreshPanel(guildId, "shop", interaction.client);
      logger.info({ guildId, name }, "Shop item removed");
      await interaction.editReply({ content: `✅ Removed **${name}** from the shop. Panel updated.` });

    } else if (sub === "add-sell-item") {
      const description = interaction.options.getString("description") ?? undefined;
      await addItem(guildId, name, "sell", undefined, description);
      await refreshPanel(guildId, "sell", interaction.client);
      logger.info({ guildId, name }, "Sell item added");
      await interaction.editReply({ content: `✅ Added **${name}** to the sell panel. Panel updated.` });

    } else if (sub === "remove-sell-item") {
      const removed = await removeItem(guildId, name, "sell");
      if (!removed) {
        await interaction.editReply({ content: `❌ No active sell item found named **${name}**.` });
        return;
      }
      await refreshPanel(guildId, "sell", interaction.client);
      logger.info({ guildId, name }, "Sell item removed");
      await interaction.editReply({ content: `✅ Removed **${name}** from the sell panel. Panel updated.` });
    }
  },
};
