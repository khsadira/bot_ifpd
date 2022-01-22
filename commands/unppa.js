const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "911602046002659429"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unppa')
		.setDescription("Enleve l'interdiction de PPA de l'individu.")
		.addChannelOption(option => option.setName('target').setDescription("Selectionner le casier de l'individu").setRequired(true)),
	async execute(interaction) {
		if (interaction.guildId == "908435776113614848" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
			const channel = interaction.options.getChannel('target');

			if (channel.parent.id == "920396329090437221" || channel.parent.id == "920396373772345396") {
				return interaction.reply({ content: `Tu dois spécifier un casier valide.`, ephemeral: true });
			}

			channel.send("!unppa")
			return interaction.reply({ content: `Tu as autorisé de PPA le casier: ${channel.name}`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};