import { ExtendedClient } from '../interfaces/ExtendedClient';
import { errorHandler } from '../utils/errorHandler';
import { initSqlite } from './sqlite';

export const connectDb = async (bot: ExtendedClient) => {
  try {
    await initSqlite(bot.config.dbPath);
  } catch (err) {
    await errorHandler(bot, err, 'database connection');
  }
};
