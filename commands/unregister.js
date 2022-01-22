const { SlashCommandBuilder } = require('@discordjs/builders');

const hcRoleID = "920115183014252584"
const syntheseServiceChanID = "926283646271389767"

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unregister')
		.setDescription("Supprime les logs de service d'un agent.")
        .addUserOption(option => option.setName('target').setDescription('to show the targeted user\'s tag')),
	async execute(interaction) {
		if (interaction.guildId == "804748960786022400" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(hcRoleID)) {
            const user = interaction.options.getUser('target');

            var agentsMetaTmp = fs.readFileSync('agents_meta.json').toString()
            var agentsMeta = JSON.parse(agentsMetaTmp)

            var id = user.id
            var msgID = ""

            for (var key in data) {
                if (key == id) {
                    msgID = data[key].messageID
                    delete data[id]
                }
            }

            var msg = await interaction.guild.channels.cache.get(syntheseServiceChanID).messages.fetch(msgID).catch(error => {
                if (error.code == 10008) {
                    console.error('Failed to fetch message: ' + msgID);
                }
                return undefined
            });

            msg.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });

            fs.writeFileSync("agents_meta.json", JSON.stringify(agentsMeta), function (err) {
                if (err) throw err;
                console.log('Fichier créé !');
            });

			return interaction.reply({ content: `Tu as supprimé les logs de service de l'agent.`, ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};