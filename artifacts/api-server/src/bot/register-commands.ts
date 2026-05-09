import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger";
import { pingCommand } from "./commands/ping";
import { helpCommand } from "./commands/help";

export async function registerSlashCommands(clientId: string): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is required to register commands.");
  }

  const commands = [pingCommand, helpCommand].map((c) => c.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), { body: commands });

  logger.info({ count: commands.length }, "Slash commands registered");
}
