import {
  Client,
  Collection,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";
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
import { readyEvent } from "./events/ready";
import { messageCreateEvent } from "./events/messageCreate";
import { interactionCreateEvent } from "./events/interactionCreate";

export interface BotCommand {
  data: { name: string; toJSON(): object };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
}

declare module "discord.js" {
  interface Client {
    commands: Collection<string, BotCommand>;
  }
}

const commands: BotCommand[] = [
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
];

const events: BotEvent[] = [
  readyEvent,
  interactionCreateEvent,
  messageCreateEvent,
];

export function createBot(): Client {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = new Collection();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
    logger.info({ name: command.data.name }, "Command loaded");
  }

  for (const event of events) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
    logger.info({ name: event.name }, "Event loaded");
  }

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
    process.exit(1);
  });

  return client;
}
