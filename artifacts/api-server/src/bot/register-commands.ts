import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger";
import { pingCommand } from "./commands/ping";
import { helpCommand } from "./commands/help";
import { balanceCommand } from "./commands/balance";
import { leaderboardCommand } from "./commands/leaderboard";
import { donateCommand } from "./commands/donate";
import { addRtkCommand } from "./commands/addrtk";
import { subRtkCommand } from "./commands/subrtk";
import { createShopPanelCommand } from "./commands/createShopPanel";
import { createSellPanelCommand } from "./commands/createSellPanel";
import { createPostPanelCommand } from "./commands/createPostPanel";
import { editPostCommand } from "./commands/editpost";
import { editPanelsCommand } from "./commands/editPanels";
import { closeTicketCommand } from "./commands/closeticket";
import { claimTicketCommand } from "./commands/claimticket";
import { addMemberCommand } from "./commands/addmember";

export async function registerSlashCommands(clientId: string): Promise<void> {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN is required to register commands.");
  }

  const body = [
    pingCommand,
    helpCommand,
    balanceCommand,
    leaderboardCommand,
    donateCommand,
    addRtkCommand,
    subRtkCommand,
    createShopPanelCommand,
    createSellPanelCommand,
    createPostPanelCommand,
    editPostCommand,
    editPanelsCommand,
    closeTicketCommand,
    claimTicketCommand,
    addMemberCommand,
  ].map((c) => c.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationCommands(clientId), { body });

  logger.info({ count: body.length }, "Slash commands registered globally");
}
