const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "920115183014252584"
const recapChanID = "929543997637156924"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('rservices')
		.setDescription("Reset les temps et nombre de services de la semaine."),
	async execute(interaction) {
		if (interaction.guildId == "804748960786022400" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
			const channel = interaction.guild.channels.cache.get(recapChanID);
			
			channel.send("!rservices")
			return interaction.reply({ content: `Tu as reset les temps et nombre de services de la semaine.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};