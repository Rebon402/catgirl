import { EmbedBuilder, Message } from 'discord.js';
import { checkContent } from '../alexjs/checkContent';
import { checkBannedWords } from '../alexjs/checkBannedWords';
import { stripSpecialCharacters } from '../alexjs/stripSpecialCharacters';
import { ExtendedClient } from '../interfaces/ExtendedClient';
import { errorHandler } from '../utils/errorHandler';
import Warnings from '../database/models/Warnings';
import Statistics from '../database/models/Statistics';

export const onMessage = async (bot: ExtendedClient, message: Message) => {
	try {
		if (message.author.bot || !message.content || !message.guild) {
			return;
		}
		const isAlwaysFilteredUser =
			bot.config.filterUserId && message.author.id === bot.config.filterUserId;
		if (
			!isAlwaysFilteredUser &&
			bot.config.filterChannelId &&
			message.channel.id !== bot.config.filterChannelId
		) {
			return;
		}

		const triggeredWarnings: EmbedBuilder[] = [];
		const cleaned = stripSpecialCharacters(message.content);
		triggeredWarnings.push(
			...(await checkContent(bot, cleaned, message.guild.id)),
		);
		triggeredWarnings.push(
			...(await checkBannedWords(bot, cleaned, message.guild.id)),
		);

		if (triggeredWarnings.length > 0) {
			for (const warning of triggeredWarnings) {
				warning
					.setColor('#2B2D31')
					.setDescription(
						`That's bad. Please be mindful in <#${message.channel.id}> and be more respectful.`,
					)
					.addFields([
						{
							name: 'TIP: ',
							value:
								'please edit or delete the above word(s) in your message then i will leave',
						},
					]);
			}

			const sent = await message.reply({
				embeds: triggeredWarnings.slice(0, 1),
			});

			await Warnings.create({
				serverId: message.guild.id,
				messageId: message.id,
				channelId: message.channel.id,
				warningId: sent.id,
			});

			await Statistics.findOneAndUpdate(
				{
					serverId: message.guild.id,
				},
				{ $inc: { totalTriggers: 1 } },
				{ upsert: true },
			).exec();
		}
	} catch (error) {
		await errorHandler(bot, error, 'on message');
	}
};
