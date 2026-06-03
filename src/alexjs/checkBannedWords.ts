import { EmbedBuilder } from "discord.js";
import { ExtendedClient } from "../interfaces/ExtendedClient";
import { errorHandler } from "../utils/errorHandler";
import { getBannedWordConfig } from "../utils/getBannedWordConfig";

export const checkBannedWords = async (
	bot: ExtendedClient,
	content: string,
	serverId: string
): Promise<EmbedBuilder[]> => {
	try {
		const config = await getBannedWordConfig(bot, serverId);
		const checkWords = config.bannedWordConfig as Array<string>;

		if (!checkWords || checkWords.length === 0) {
			return [];
		}

		const matchedWords = new Set<string>();

		for (const word of content.split(" ")) {
			if (!word || matchedWords.has(word.toLowerCase())) {
				continue;
			}

			for (const checkWord of checkWords) {
				const regex = checkWord.startsWith("/") && checkWord.endsWith("/")
					? new RegExp(checkWord.slice(1, -1), "i")
					: new RegExp(`\\b${checkWord}\\b`, "i");

				if (regex.test(word)) {
					matchedWords.add(word.toLowerCase());
					break;
				}
			}
		}

		if (matchedWords.size === 0) {
			return [];
		}

		const embed = new EmbedBuilder()
			.setTitle("Hold up!")
			.setDescription("That's bad")
			.setColor("#2B2D31");

		for (const word of matchedWords) {
			embed.addFields({
				name: `Don't use it, \`${word}\` is offensive.`,
				value: "see above ^",
			});
		}

		return [embed];
	} catch (error) {
		await errorHandler(bot, error, "alexjs check content");
		return [];
	}
};
