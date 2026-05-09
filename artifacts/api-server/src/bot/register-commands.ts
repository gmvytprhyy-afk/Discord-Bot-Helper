import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger";
import { pingCommand } from "./commands/ping";
import { helpCommand } from "./commands/help";
import { addRtkCommand } from "./commands/addrtk";
import { subRtkCommand } from "./commands/subrtk";
import { createShopPanelCommand } from "./commands/createShopPanel";
import { createSellPanelCommand } from "./commands/createSellPanel";
import { editPanelsCommand } from "./commands/editPanels";

export async function registerSlashCommands(clientId: string): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is required to register commands.");
  }

  const body = [
    pingCommand,
    helpCommand,
    addRtkCommand,
    subRtkCommand,
    createShopPanelCommand,
    createSellPanelCommand,
    editPanelsCommand,
  ].map((c) => c.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), { body });

  logger.info({ count: body.length }, "Slash commands registered globally");
}
