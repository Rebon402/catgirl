import {
	CommandInteraction,
	SlashCommandBuilder,
	SlashCommandStringOption,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { Command } from "../interfaces/Command";

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

const addSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("add")
		.setDescription("add word to the banned list")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("word")
				.setDescription("word you want to add")
				.setRequired(true)
		);
};

const clearSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("clear")
		.setDescription("clear all words in the banned list");
};

const listSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("list")
		.setDescription("the banned list");
};

const deleteSubCommand = () => {
	return new SlashCommandSubcommandBuilder()
		.setName("delete")
		.setDescription("delete word from the banned list")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("word")
				.setDescription("banned word")
				.setRequired(true)
		);
};

export const bannedword: Command = {
	data: new SlashCommandBuilder()
		.setName("bannedword")
		.setDescription("edit list of the banned words")
		.addSubcommand(listSubCommand)
		.addSubcommand(addSubCommand)
		.addSubcommand(clearSubCommand)
		.addSubcommand(deleteSubCommand),
	run: async (bot, interaction) => {
		if (!interaction.guildId) {
			await interaction.reply("This command can only be used in a server.");
			return;
		}

		if (interaction.options.getSubcommand() === "add") {
			interaction.reply(
				await addWord(bot, interaction, interaction.options.getString("word")!)
			);
		} else if (interaction.options.getSubcommand() === "delete") {
			interaction.reply(
				await deleteWord(
					bot,
					interaction,
					interaction.options.getString("word")!
				)
			);
		} else if (interaction.options.getSubcommand() === "clear") {
			interaction.reply(await clearWords(bot, interaction));
		} else {
			const query = await getOrCreateServerConfig(interaction.guildId);

			const bannedWords = query.bannedWordConfig ?? [];

			interaction.reply(`\`\`\`\n${bannedWords}\n\`\`\``);
		}
	},
};

import ServerConfig from "../database/models/ServerConfig";
import { ExtendedClient } from "../interfaces/ExtendedClient";

async function clearWords(
	bot: ExtendedClient,
	interaction: CommandInteraction
) {
	const guildId = interaction.guildId as string;
	const guildQuery = await getOrCreateServerConfig(guildId);

	const updated = await ServerConfig.findOneAndUpdate(
		{
			serverId: guildId,
		},
		{
			$set: { bannedWordConfig: [] },
		},
		{ new: true }
	);
	if (!updated) {
		return "Could not update banned list. Please try again.";
	}

	const cache = bot.cache[guildId];
	bot.cache[guildId] = {
		alexConfig:
			(cache?.alexConfig as AlexConfig) ??
			(guildQuery.alexConfig as AlexConfig) ??
			createDefaultAlexConfig(),
		bannedWordConfig: updated!.bannedWordConfig!,
	};

	return `Successfully deleted the all words in the banned list.`;
}

async function deleteWord(
	bot: ExtendedClient,
	interaction: CommandInteraction,
	wordToDelete: string
) {
	const guildId = interaction.guildId as string;
	const guildQuery = await getOrCreateServerConfig(guildId);

	const words = guildQuery.bannedWordConfig as Array<string>;

	const index = words!.indexOf(wordToDelete);
	if (index !== -1) {
		const updated = await ServerConfig.findOneAndUpdate(
			{
				serverId: guildId,
			},
			{
				$pull: { bannedWordConfig: wordToDelete },
			},
			{ new: true }
		);
		if (!updated) {
			return "Could not update banned list. Please try again.";
		}

		const cache = bot.cache[guildId];
		bot.cache[guildId] = {
			alexConfig:
				(cache?.alexConfig as AlexConfig) ??
				(guildQuery.alexConfig as AlexConfig) ??
				createDefaultAlexConfig(),
			bannedWordConfig: updated!.bannedWordConfig!,
		};

		return `Successfully deleted the word "${wordToDelete}" from the banned list.`;
	} else {
		return `The word "${wordToDelete}" does not exist in the banned list.`;
	}
}

async function addWord(
	bot: ExtendedClient,
	interaction: CommandInteraction,
	wordToAdd: string
) {
	const guildId = interaction.guildId as string;
	const guildQuery = await getOrCreateServerConfig(guildId);

	const words = guildQuery.bannedWordConfig as Array<string>;

	if (!words!.includes(wordToAdd)) {
		const updated = await ServerConfig.findOneAndUpdate(
			{
				serverId: guildId,
			},
			{
				$push: { bannedWordConfig: wordToAdd },
			},
			{ new: true }
		);
		if (!updated) {
			return "Could not update banned list. Please try again.";
		}

		const cache = bot.cache[guildId];
		bot.cache[guildId] = {
			alexConfig:
				(cache?.alexConfig as AlexConfig) ??
				(guildQuery.alexConfig as AlexConfig) ??
				createDefaultAlexConfig(),
			bannedWordConfig: updated!.bannedWordConfig!,
		};

		return `Successfully added the word "${wordToAdd}" to the banned list.`;
	} else {
		return `The word "${wordToAdd}" already exists in the banned list.`;
	}
}

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
