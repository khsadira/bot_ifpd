const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const { MessageEmbed  } = require('discord.js');

const ifpdRoleID = "920116931925786647"

function reworkTime(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);          
    var minutes = totalMinutes % 60;

    return hours + "h" + minutes
}

async function getAgentMatricule(guild, userID) {
    var user = await guild.members.fetch(userID).catch(error => {
        return undefined
    });;

    if (user && user.nickname && user.nickname.length > 5 && user.roles.cache.has(ifpdRoleID) != -1) {
        return (user.nickname[1] + user.nickname[2]).toString()
    }

    return undefined;
}

async function getAgentEmbed(agentData, agentID, guild) {
    var agentMatricule = await getAgentMatricule(guild, agentID)
    var time = await reworkTime(agentData.time)
    var totaltime = await reworkTime(agentData.totaltime)

    return new MessageEmbed()
                .setTitle('Agent ' + agentMatricule)
                .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                .setColor(0x0000FF)
                .setDescription("<@" + agentID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + agentData.nbservice + "\n\n**Total**\n- Temps en service: " + totaltime + "\n- Nombre de service: " + agentData.totalnbservice)
                .setFooter(agentID)
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('service')
		.setDescription("Montre les temps et nombre de services de la semaine."),
	async execute(interaction) {
		if (interaction.guildId == "804748960786022400" && interaction.guild.members.cache.get(interaction.user.id).roles.cache.has(ifpdRoleID)) {
            var agentsMetaTmp = fs.readFileSync('agents_meta.json').toString()
            var agentsMeta = JSON.parse(agentsMetaTmp)
            var embed = await getAgentEmbed(agentsMeta[interaction.user.id], interaction.user.id, interaction.guild)
			return interaction.reply({ embeds:[embed], ephemeral: true });
		} else {
			return interaction.reply({ content: `Tu n'as pas l'autorisation pour utiliser cette commande.`, ephemeral: true });
		}
	}
};