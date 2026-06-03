import ServerConfig from "../database/models/ServerConfig";
import { ExtendedClient } from "../interfaces/ExtendedClient";

interface AlexConfig {
	allow: Array<string>;
	profanitySureness: 0 | 1 | 2;
	noBinary: boolean;
}

interface ServerCache {
	alexConfig: AlexConfig;
	bannedWordConfig: Array<string>;
}

export const getBannedWordConfig = async (
	bot: ExtendedClient,
	serverId: string
): Promise<ServerCache> => {
	if (bot.cache[serverId]) {
		return bot.cache[serverId];
	}

	const config = await ServerConfig.findOne({ serverId });

	if (config) {
		const cache: ServerCache = {
			alexConfig: config.alexConfig as AlexConfig,
			bannedWordConfig: config.bannedWordConfig!,
		};
		bot.cache[serverId] = cache;
		return cache;
	}

	const newConfig = await ServerConfig.create({
		serverId,
		alexConfig: {
			profanitySureness: 1,
			noBinary: false,
			allow: [],
		},
		bannedWordConfig: [],
	});

	const cache: ServerCache = {
		alexConfig: newConfig.alexConfig as AlexConfig,
		bannedWordConfig: newConfig.bannedWordConfig!,
	};
	bot.cache[serverId] = cache;
	return cache;
};
