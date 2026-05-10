import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  type Client,
  type TextChannel,
} from "discord.js";
import { eq, and } from "drizzle-orm";
import { db, panelsTable, shopItemsTable } from "@workspace/db";
import { logger } from "../../lib/logger";
import type { ShopItem } from "@workspace/db";

function parseColor(hex: string | null | undefined): number {
  if (!hex) return 0x5865f2;
  const parsed = parseInt(hex.replace(/^#/, ""), 16);
  return isNaN(parsed) ? 0x5865f2 : parsed;
}

export function buildShopEmbed(
  title: string,
  description: string | null | undefined,
  items: ShopItem[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .setDescription(
      description ?? "Browse today's available items. Select one below to purchase with RTK.",
    );

  if (items.length > 0) {
    embed.addFields(
      items.map((item) => ({
        name: `${item.name} — ${item.price} RTK`,
        value: item.description ?? "No description provided",
        inline: false,
      })),
    );
  } else {
    embed.addFields({ name: "No items available", value: "Check back later!", inline: false });
  }

  return embed;
}

export function buildSellEmbed(
  title: string,
  description: string | null | undefined,
  items: ShopItem[],
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xfee75c)
    .setDescription(
      description ??
        "Want to sell something? Select an item below and a staff ticket will be created.",
    );

  if (items.length > 0) {
    embed.addFields(
      items.map((item) => ({
        name: item.name,
        value: item.description ?? "No description provided",
        inline: false,
      })),
    );
  } else {
    embed.addFields({ name: "No items listed", value: "Check back later!", inline: false });
  }

  return embed;
}

export function buildPostEmbed(
  title: string,
  description: string | null | undefined,
  imageUrl: string | null | undefined,
  color: string | null | undefined,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(parseColor(color));

  if (description) embed.setDescription(description);
  if (imageUrl) embed.setImage(imageUrl);
  embed.setTimestamp();

  return embed;
}

export function buildSelectMenu(
  customId: string,
  placeholder: string,
  items: ShopItem[],
): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder);

  if (items.length === 0) {
    menu.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("No items available")
        .setValue("none")
        .setDescription("There are no items right now"),
    );
    menu.setDisabled(true);
  } else {
    const limited = items.slice(0, 25);
    menu.addOptions(
      limited.map((item) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(item.name)
          .setValue(item.id.toString())
          .setDescription(
            item.price != null
              ? `${item.price} RTK${item.description ? ` — ${item.description.slice(0, 50)}` : ""}`
              : item.description?.slice(0, 100) ?? "Select to create a sell ticket",
          ),
      ),
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export async function refreshPanel(
  guildId: string,
  type: "shop" | "sell",
  client: Client,
): Promise<void> {
  const panels = await db
    .select()
    .from(panelsTable)
    .where(and(eq(panelsTable.guildId, guildId), eq(panelsTable.type, type)))
    .limit(1);

  const panel = panels[0];
  if (!panel?.messageId) return;

  const items = await db
    .select()
    .from(shopItemsTable)
    .where(
      and(
        eq(shopItemsTable.guildId, guildId),
        eq(shopItemsTable.type, type === "shop" ? "buy" : "sell"),
        eq(shopItemsTable.isActive, true),
      ),
    );

  try {
    const channel = (await client.channels.fetch(panel.channelId)) as TextChannel;
    const message = await channel.messages.fetch(panel.messageId);

    const embed =
      type === "shop"
        ? buildShopEmbed(panel.title, panel.description, items)
        : buildSellEmbed(panel.title, panel.description, items);

    const row = buildSelectMenu(
      type === "shop" ? "shop_select" : "sell_select",
      type === "shop" ? "Select an item to buy…" : "Select an item to sell…",
      items,
    );

    await message.edit({ embeds: [embed], components: [row] });
    logger.info({ guildId, type }, "Panel refreshed");
  } catch (err) {
    logger.error({ err, guildId, type }, "Failed to refresh panel");
  }
}
