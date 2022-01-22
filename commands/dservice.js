const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "920115183014252584"
const serviceChanID = "929561716021411870"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('dservice')
		.setDescription("Supprime un agent de la DB.")
        .addStringOption(option => option.setName('agentid').setDescription("Selectionner l'ID de l'agent à effacer").setRequired(true)),
	async execute(interaction) {
		if (interaction.guildId == "804748960786022400" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
			const channel = interaction.guild.channels.cache.get(serviceChanID)

			channel.send("!dservice" + " " + interaction.options.getString("agentid"))
			return interaction.reply({ content: `Tu as supprimé un agent de la DB.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};