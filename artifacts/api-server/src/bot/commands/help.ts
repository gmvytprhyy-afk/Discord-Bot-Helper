import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { BotCommand } from "../index";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Commands")
      .setColor(0x5865f2)
      .addFields(
        {
          name: "General",
          value: [
            "`/ping` — Check bot latency",
            "`/help` — Show this message",
            "`/balance [user]` — View RTK, messages & invites",
            "`/leaderboard` — Top 10 RTK holders",
            "`/donate @user amount` — Send RTK to someone",
          ].join("\n"),
        },
        {
          name: "Shop & Sell",
          value: [
            "`Shop panel` — Select an item to buy with RTK",
            "`Sell panel` — Select an item to open a sell ticket",
          ].join("\n"),
        },
        {
          name: "Ticket Management (staff)",
          value: [
            "`/claimticket` — Claim this ticket as your own",
            "`/closeticket [reason]` — Close and delete the channel",
            "`/addmember @user` — Add a member to the ticket",
          ].join("\n"),
        },
        {
          name: "Admin Only",
          value: [
            "`/addrtk @user amount` — Give RTK to a user",
            "`/subrtk @user amount` — Remove RTK from a user",
            "`/createshoppanel` — Post the shop panel here",
            "`/createsellpanel` — Post the sell panel here",
            "`/editpanels add-shop-item` — Add a buyable item",
            "`/editpanels remove-shop-item` — Remove a buyable item",
            "`/editpanels add-sell-item` — Add a sellable item",
            "`/editpanels remove-sell-item` — Remove a sellable item",
          ].join("\n"),
        },
        {
          name: "How RTK works",
          value: [
            "• Every **100 messages** → +1 RTK",
            "• **Invite someone** → +1 RTK (removed if they leave)",
            "• Admins can manually add/remove RTK",
          ].join("\n"),
        },
      )
      .setFooter({ text: "Tickets are created as private channels under the Tickets category" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
