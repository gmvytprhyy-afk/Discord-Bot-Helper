import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  type ChatInputCommandInteraction,
  type SlashCommandBuilder,
} from "discord.js";
import { logger } from "../lib/logger";
import { pingCommand } from "./commands/ping";
import { helpCommand } from "./commands/help";
import { registerSlashCommands } from "./register-commands";

export interface BotCommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands = new Collection<string, BotCommand>();

const allCommands: BotCommand[] = [pingCommand, helpCommand];

for (const command of allCommands) {
  commands.set(command.data.name, command);
}

export function createBot(): Client {
  const token = process.env["DISCORD_BOT_TOKEN"];
  if (!token) {
    throw new Error("DISCORD_BOT_TOKEN environment variable is required.");
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info({ tag: readyClient.user.tag }, "Discord bot is online");

    try {
      await registerSlashCommands(readyClient.user.id);
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn({ commandName: interaction.commandName }, "Unknown command");
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, commandName: interaction.commandName }, "Command error");
      const msg = { content: "Something went wrong running that command.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === "!ping") {
      await message.reply("Pong!");
    }
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to log in to Discord");
    process.exit(1);
  });

  return client;
}
