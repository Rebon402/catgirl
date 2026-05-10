import { WebhookClient } from 'discord.js';
import { ExtendedClient } from '../interfaces/ExtendedClient';
import { logHandler } from './logHandler';

export const validateEnv = (bot: ExtendedClient) => {
  if (!process.env.DISCORD_TOKEN) {
    logHandler.log('error', 'Missing "DISCORD_TOKEN" environment variables!');
    process.exit(1);
  }
  if (!process.env.SQLITE_PATH) {
    logHandler.log(
      'error',
      'Missing "SQLITE_PATH" environment variables!',
    );
    process.exit(1);
  }
  if (!process.env.HOME_GUILD) {
    logHandler.log('error', 'Missing "HOME_GUILD" environment variables!');
    process.exit(1);
  }
  const filterChannelId = process.env.FILTER_CHANNEL_ID?.trim();
  const filterUserId = process.env.FILTER_USER_ID?.trim();

  bot.config = {
    token: process.env.DISCORD_TOKEN,
    dbPath: process.env.SQLITE_PATH,
    debugHook: process.env.DEBUG_HOOK
      ? new WebhookClient({
          url: process.env.DEBUG_HOOK,
        })
      : undefined,
    homeGuild: process.env.HOME_GUILD,
    filterChannelId: filterChannelId || undefined,
    filterUserId: filterUserId || undefined,
  };
};
