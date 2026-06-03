import alex from "alex";
import { EmbedBuilder } from "discord.js";

import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { getAlexConfig } from "../utils/getAlexConfig";

interface AlexConfig {
	allow: Array<string>;
	profanitySureness: 0 | 1 | 2;
	noBinary: boolean;
}

export const checkContent = async (
	bot: ExtendedClient,
	content: string,
	serverId: string
): Promise<EmbedBuilder[]> => {
	try {
		const config = await getAlexConfig(bot, serverId);
		const { allow, profanitySureness, noBinary } =
			config.alexConfig as AlexConfig;
		const rawResult = alex.markdown(content, {
			allow,
			profanitySureness,
			noBinary,
		}).messages;

		if (rawResult.length === 0) {
			return [];
		}

		const uniqueMessages = new Set<string>();
		const embed = new EmbedBuilder()
			.setTitle("Hold up!")
			.setDescription("That's bad")
			.setColor("#2B2D31");

		for (const message of rawResult) {
			const actual = message.actual as string;
			if (actual && !uniqueMessages.has(actual.toLowerCase())) {
				uniqueMessages.add(actual.toLowerCase());
				embed.addFields({
					name: message.reason,
					value: message.note || "see above.",
				});
			}
		}

		return [embed];
	} catch (error) {
		await errorHandler(bot, error, "alexjs check content");
		return [];
	}
};
