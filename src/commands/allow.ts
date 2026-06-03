import {
	CommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { Command } from "../interfaces/Command";
import ServerConfig from "../database/models/ServerConfig";
import { ExtendedClient } from "../interfaces/ExtendedClient";

interface AlexConfig {
	allow: Array<string>;
	profanitySureness: 0 | 1 | 2;
	noBinary: boolean;
}

const createDefaultAlexConfig = (): AlexConfig => ({
	allow: [],
	profanitySureness: 1,
	noBinary: false,
});

const listSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("list")
		.setDescription("the allow list");
};

const addSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("add")
		.setDescription("add group id to the allow list")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("id")
				.setDescription("Id of the word group")
				.setRequired(true)
		);
};

const deleteSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("delete")
		.setDescription("delete group id from the allow list")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("id")
				.setDescription("Id of the word group")
				.setRequired(true)
		);
};

export const allow: Command = {
	data: new SlashCommandBuilder()
		.setName("allow")
		.setDescription("allow certain group of words")
		.addSubcommand(addSubCommand)
		.addSubcommand(deleteSubCommand)
		.addSubcommand(listSubCommand),
	run: async (bot, interaction) => {
		if (!interaction.guildId) {
			await interaction.reply("This command can only be used in a server.");
			return;
		}

		if (interaction.options.getSubcommand() === "add") {
			interaction.reply(
				await addWord(bot, interaction, interaction.options.getString("id")!)
			);
		} else if (interaction.options.getSubcommand() === "delete") {
			interaction.reply(
				await deleteWord(bot, interaction, interaction.options.getString("id")!)
			);
		} else {
			const query = await getOrCreateServerConfig(interaction.guildId);

			const bannedWords = query.alexConfig?.allow ?? [];

			interaction.reply(
				`see here: <https://github.com/retextjs/retext-equality/blob/main/rules.md>\n\`\`\`\n${bannedWords}\n\`\`\``
			);
		}
	},
};

async function getOrCreateServerConfig(serverId: string) {
	const existing = await ServerConfig.findOne({ serverId });
	if (existing) {
		return existing;
	}

	return ServerConfig.create({
		serverId,
		alexConfig: createDefaultAlexConfig(),
		bannedWordConfig: [],
	});
}

async function addWord(
	bot: ExtendedClient,
	interaction: CommandInteraction,
	wordToAdd: string
) {
	const guildId = interaction.guildId as string;
	const guildQuery = await getOrCreateServerConfig(guildId);

	const words = guildQuery.alexConfig?.allow ?? [];

	if (!words!.includes(wordToAdd)) {
		const updated = await ServerConfig.findOneAndUpdate(
			{
				serverId: guildId,
			},
			{
				$push: { "alexConfig.allow": wordToAdd },
			},
			{ new: true }
		);
		if (!updated) {
			return "Could not update allow list. Please try again.";
		}

		const cache = bot.cache[guildId];
		bot.cache[guildId] = {
			alexConfig: updated!.alexConfig as AlexConfig,
			bannedWordConfig:
				cache?.bannedWordConfig ?? (guildQuery.bannedWordConfig as Array<string>) ?? [],
		};

		return `Successfully added the word "${wordToAdd}" to the allow list.`;
	} else {
		return `The word "${wordToAdd}" already exists in the allow list.`;
	}
}

async function deleteWord(
	bot: ExtendedClient,
	interaction: CommandInteraction,
	wordToDelete: string
) {
	const guildId = interaction.guildId as string;
	const guildQuery = await getOrCreateServerConfig(guildId);

	const words = guildQuery.alexConfig?.allow ?? [];

	const index = words!.indexOf(wordToDelete);
	if (index !== -1) {
		const updated = await ServerConfig.findOneAndUpdate(
			{
				serverId: guildId,
			},
			{
				$pull: { "alexConfig.allow": wordToDelete },
			},
			{ new: true }
		);
		if (!updated) {
			return "Could not update allow list. Please try again.";
		}

		const cache = bot.cache[guildId];
		bot.cache[guildId] = {
			alexConfig: updated!.alexConfig as AlexConfig,
			bannedWordConfig:
				cache?.bannedWordConfig ?? (guildQuery.bannedWordConfig as Array<string>) ?? [],
		};

		return `Successfully deleted the word "${wordToDelete}" from the allow list.`;
	} else {
		return `The word "${wordToDelete}" does not exist in the allow list.`;
	}
}
