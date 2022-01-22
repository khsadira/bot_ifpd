const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "920115183014252584"
const recapChanID = "920119953787605052"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('recap')
		.setDescription("Fais un recap des services de la semaine."),
	async execute(interaction) {
		if (interaction.guildId == "804748960786022400" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
			const channel = interaction.guild.channels.cache.get(recapChanID)

			channel.send("!recap")
			return interaction.reply({ content: `Tu as fait un recap de la semaine.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};