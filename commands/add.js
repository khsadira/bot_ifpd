const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "911602046002659429"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add')
		.setDescription("Interdit l'individu à avoir le PPA.")
		.addChannelOption(option => option.setName('target').setDescription("Selectionner le casier de l'individu").setRequired(true))
        .addIntegerOption(option => option.setName('points').setDescription("Selectionner le nombre de points à rajouter au casier de l'individu").setRequired(true)),
	async execute(interaction) {
		if (interaction.guildId == "908435776113614848" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
			const channel = interaction.options.getChannel('target');

			if (channel.parent.id == "920396329090437221" || channel.parent.id == "920396373772345396") {
				return interaction.reply({ content: `Tu dois spécifier un casier valide.`, ephemeral: true });
			}

			channel.send("!add" + " " + interaction.options.getInteger("points"))
			return interaction.reply({ content: `Tu as ajouté des points au casier: ${channel.name}`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};