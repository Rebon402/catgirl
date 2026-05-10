import { Client, WebhookClient } from "discord.js";
import { Command } from "./Command";

interface AlexConfig {
	allow: Array<string>;
	profanitySureness: 0 | 1 | 2;
	noBinary: boolean;
}

interface guildCache {
	bannedWordConfig: Array<string>;
	alexConfig: AlexConfig;
}

export interface ExtendedClient extends Client {
	commands: Command[];
	cache: { [key: string]: guildCache };
	config: {
		token: string;
		dbPath: string;
		debugHook: WebhookClient | undefined;
		homeGuild: string;
		filterChannelId?: string;
		filterUserId?: string;
	};
}
