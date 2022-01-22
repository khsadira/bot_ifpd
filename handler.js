const fs = require('fs');
const TOKEN = JSON.parse(fs.readFileSync('config.json')).token

const { Client, Collection, Intents, MessageEmbed  } = require('discord.js');
const { SSL_OP_EPHEMERAL_RSA } = require('constants');
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});

const PUNTOS = {
    "Délit de fuite aggravé": 5,
    "Récolte/Fabrication/Traitement/Vente de drogue": 2,
    "Possession de drogue >= 50": 5,
    "Possession d'argent sale >= 100 000": 5,
    "Braquage de bijouterie": 5,
    "Port d'arme illégal": 5,
    "Braquage de banque Fleeca": 10,
    "Braquage de banque Centrale": 20,
    "Prise d'otage": 10,
    "Tentative de meurtre": 15,
    "Meurtre": 20,
    "Enlèvement/Séquestration/Torture": 10,
    "Assassinat ( Prouvé )": 200
}

const managerRoleID = "920397394078748742"
const hcRoleID = "911602046002659429"
const channelID = "920400572136448040"
const logChanID = "920400579937832961"
const refuseChanID = "920400594697617509"
const serviceChanID = "920116574764036167"
const recapChanID = "920119953787605052"
const logpointChanID = "920400611965562970"
const infoEnServiceChanID = "925445073661984798"
const recapCasierID = "925572240764989440"

const webhookCasier = "920405759194456105"
const botID = "908420302197895178"

const webhookIFPD = "920117139602550804"

const ifpdDiscordID = "804748960786022400"
const casierDiscordID = "908435776113614848"
const ifpdRole = "920116931925786647"


var syntheseServiceChan;
var syntheseServiceRecapChan;
var syntheseServiceChanID = "929561716021411870"
var syntheseServiceRecapChanID = "929543997637156924"

let stickyContent = "```diff\n- INDIVIDU INTERDIT DE PPA -```"
var infoServiceStickyMsg = undefined;
let playerInService = []

var agentsMeta = {}

var GuildIFPD;

function writeAgentMeta() {
    fs.writeFileSync("agents_meta.json", JSON.stringify(agentsMeta), function (err) {
        if (err) throw err;
        console.log('Fichier créé !');
    });
}

async function getAgentMatricule(guild, userID) {
    var user = await guild.members.fetch(userID).catch(error => {
        return undefined
    });;

    if (user && user.nickname && user.nickname.length > 5 && user.roles.cache.has(ifpdRole) != -1) {
        return (user.nickname[1] + user.nickname[2]).toString()
    }

    return undefined;
}

function reworkTime(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);          
    var minutes = totalMinutes % 60;

    return hours + "h" + minutes
}

async function getLittleAgentEmbed(agentData, agentID) {
    var agentMatricule = await getAgentMatricule(GuildIFPD, agentID)
    var time = await reworkTime(agentData.time)

    return new MessageEmbed()
                .setTitle('Agent ' + agentMatricule)
                .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                .setColor(0x0000FF)
                .setDescription("<@" + agentID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + agentData.nbservice)
                .setFooter(agentID)
}

async function getAgentEmbed(agentData, agentID) {
    var agentMatricule = await getAgentMatricule(GuildIFPD, agentID)
    var time = await reworkTime(agentData.time)
    var totaltime = await reworkTime(agentData.totaltime)

    return new MessageEmbed()
                .setTitle('Agent ' + agentMatricule)
                .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                .setColor(0x0000FF)
                .setDescription("<@" + agentID + ">\n\n**Semaine**\n- Temps en service: " + time + "\n- Nombre de service: " + agentData.nbservice + "\n\n**Total**\n- Temps en service: " + totaltime + "\n- Nombre de service: " + agentData.totalnbservice)
                .setFooter(agentID)
}

async function reassignMessage(syntheseServiceChan) {
    let lastMsg = null, lastlastMsg = "B"

    while (lastMsg != lastlastMsg) {
        lastlastMsg = lastMsg

        await syntheseServiceChan.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
            messages.forEach(msg => {
                lastMsg = msg.id
                if (!(msg && msg.embeds && msg.embeds[0] && msg.embeds[0].footer && msg.embeds[0].footer.text && agentsMeta.hasOwnProperty(msg.embeds[0].footer.text))) {
                    msg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        });
    }
}

function writeBotActivity(nbAgent) {
    if (nbAgent <= 1) {
        client.user.setActivity(nbAgent + " agent en service", {type: 'WATCHING'});
    } else {
        client.user.setActivity(nbAgent + " agents en service", {type: 'WATCHING'});
    }
}

function roleIsAllowed(roles) {
    if (roles.cache.has(managerRoleID) || roles.cache.has(hcRoleID)) {
        return true
    }
    return false
}

client.login(TOKEN)

let stickyMeta = {}

async function cleanPpaMessage(channel) {
    let lastMsg = null, lastlastMsg = "B"

    while (lastMsg != lastlastMsg) {
        lastlastMsg = lastMsg

        await channel.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
            messages.forEach(msg => {
                lastMsg = msg.id
                if (msg.content == stickyContent) {
                    msg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        });
    }
}

var puntosMeta = {}

let ppaRecapMsg = undefined;
let pointRecapMsg = undefined;

client.on("ready", async () => {
    console.log("IFPD bot a été démarré.")

    var Guild = client.guilds.cache.get(ifpdDiscordID)
    var stickyChan = Guild.channels.cache.find(channel => channel.id === infoEnServiceChanID)

    await stickyChan.messages.fetch({limit: `100`}).then(messages => {
        messages.forEach(msg => {
            if (msg.author.id == botID) {
                writeBotActivity(0)
                infoServiceStickyMsg = msg
                var descriptionString = "**Nombre d'agent en service: 0**"
                const embed = new MessageEmbed()
                        .setTitle('IFPD: Agents en service')
                        .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                        .setColor(0x0099ff)
                        .setDescription(descriptionString)

                infoServiceStickyMsg.edit({embeds:[embed]})
            }
        });
    });

    const Guilds = client.guilds.cache.map(guild => guild);

    if (fs.existsSync('ppa_meta.txt')) {
        let metaData = fs.readFileSync('ppa_meta.txt').toString()
        for (guild of Guilds) {
            if (guild.id == casierDiscordID) {
                for (var channelID of metaData.split(",")) {
                    if (channelID.length > 0) {
                        let channel = guild.channels.cache.get(channelID)
                        if (channel) {
                            await cleanPpaMessage(channel)
                            stickyMeta[channelID] = {}
                            stickyMeta[channelID].isOn = true
                            stickyMeta[channelID].lastSticky = await channel.send(stickyContent)
                        }
                    }
                }
            }
        }
    }

    if (fs.existsSync('puntos_meta.txt')) {
        let metaData = fs.readFileSync('puntos_meta.txt').toString()
        puntosMeta = JSON.parse(metaData)
    }

    var Guild = client.guilds.cache.get(casierDiscordID)
    var stickyChan = Guild.channels.cache.find(channel => channel.id === recapCasierID)

    await stickyChan.messages.fetch({limit: `100`}).then(messages => {
        messages.forEach(msg => {
            if (msg.author.id == botID && msg.embeds[0].title.indexOf("ppa") != -1) {
                ppaRecapMsg = msg;
                ppaRecapMsg.edit({embeds:[getPpaRecapEmbed()]})
            } else if (msg.author.id == botID && msg.embeds[0].title.indexOf("points") != -1) {
                pointRecapMsg = msg;
                pointRecapMsg.edit({embeds:[getPointRecapEmbed()]})
            }
        });
    });
    
    if (ppaRecapMsg == undefined) {
        ppaRecapMsg = await stickyChan.send({embeds:[getPpaRecapEmbed()]});
    }
    if (pointRecapMsg == undefined) {
        pointRecapMsg = await stickyChan.send({embeds:[getPointRecapEmbed()]});
    }


    GuildIFPD = await client.guilds.cache.get(ifpdDiscordID);
    syntheseServiceChan = await GuildIFPD.channels.cache.find(channel => channel.id === syntheseServiceChanID);
    syntheseServiceRecapChan = await GuildIFPD.channels.cache.find(channel => channel.id === syntheseServiceRecapChanID);

    if (fs.existsSync('agents_meta.json')) {
        let agentsMetaTmp = fs.readFileSync('agents_meta.json').toString();
        agentsMeta = JSON.parse(agentsMetaTmp);

        await reassignMessage(syntheseServiceChan);

        for (var agentID in agentsMeta) {
            var member = await GuildIFPD.members.fetch(agentID).catch(error => {
                return undefined;
            });;

            if (member == undefined) {
                var msg = await client.channels.cache.get(syntheseServiceChanID).messages.fetch(agentsMeta[agentID].messageID).catch(error => {
                    return undefined;
                });
                msg.delete().catch(error => {});
                delete agentsMeta[agentID];
                writeAgentMeta();
                continue;
            }
            
            var agent = agentsMeta[agentID];
            var embed = await getAgentEmbed(agent, agentID);

            if (!(agent.messageID.length > 0)) {
                msg = await syntheseServiceChan.send({embeds:[embed]});
                agent.messageID = msg.id;
                writeAgentMeta();
            } else {
                var msg = await client.channels.cache.get(syntheseServiceChanID).messages.fetch(agent.messageID).catch(error => {
                    if (error.code == 10008) {
                        console.error('Failed to fetch message: ' + agentID);
                    }
                    return undefined;
                });

                if (msg == undefined) {
                    msg = await syntheseServiceChan.send({embeds:[embed]});
                    agent.messageID = msg.id;
                    writeAgentMeta();
                } else {
                    msg.edit({embeds:[embed]});
                }
            }
        }
    }
});

function getPpaRecapEmbed() {
    var Guild = client.guilds.cache.get(casierDiscordID)

    var nameString = ""
    var i = 0;
    for (var channelID in stickyMeta) {
        var channel = Guild.channels.cache.find(channel => channel.id === channelID)
        nameString += "- " + channel.name + "\n"
        i++
    }

    var descriptionString = "**Nombre d'individu: " + i + "**\n" + nameString

    const embed = new MessageEmbed()
        .setTitle('IFPD: Individu interdit de ppa')
        .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
        .setColor(0x0099ff)
        .setDescription(descriptionString)

    return embed
}

function getPointRecapEmbed() {
    var Guild = client.guilds.cache.get(casierDiscordID)

    var descriptionString = ""
    for (var channelID in puntosMeta) {
        if (puntosMeta[channelID] < 200) {
            var channel = Guild.channels.cache.find(channel => channel.id === channelID)
            if (channel != undefined) {
                descriptionString += "- " + channel.name + " : " + puntosMeta[channelID] + "\n"
            }
        }
    }

    const embed = new MessageEmbed()
        .setTitle('IFPD: Recap des points')
        .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
        .setColor(0x0099ff)
        .setDescription(descriptionString)

    return embed
}

function writePuntosDataToFile() {
    fs.writeFileSync("puntos_meta.txt", JSON.stringify(puntosMeta), function (err) {
    if (err) throw err;
    console.log('Fichier créé !');
    });
    pointRecapMsg.edit({embeds:[getPointRecapEmbed()]})
}

function refreshPoints(id, embeds) {
    var currentPoint = 200

    if (id != -1 && puntosMeta[id] !== undefined) {
      currentPoint = puntosMeta[id]
    }
    
    maxPuntos = 0
    for (let key in PUNTOS) {
        if (embeds[0].description.indexOf(key) != -1) {
            if (maxPuntos < PUNTOS[key]) {
                maxPuntos = PUNTOS[key]
            }
        }
    }

    return currentPoint - maxPuntos
}

client.on('messageReactionAdd', async (reaction, user) => {
	if (reaction.partial) {
		try {
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
		}
	}

    if (reaction.message.guildId == casierDiscordID) {
        if (reaction.emoji.name == "checkif" && reaction.message.guild.channels.channelCountWithoutThreads < 495 && reaction.message.channel.id === channelID && roleIsAllowed(reaction.message.guild.members.cache.get(user.id).roles)) {
            try {
                content = reaction.message.embeds[0].description
                contentArr = content.split('\n')
                contentArr.splice(0, 3)
                nomSuspect = contentArr[4].trim().toLowerCase()
                prenomSuspect = contentArr[7].trim().toLowerCase()


                casierID = nomSuspect.replaceAll(" ", "-") + "-" + prenomSuspect.replaceAll(" ", "-")
    
                if (casierID.length >= 1 && casierID.length < 100) {
                    var newEmbeds = reaction.message.embeds

                    categoryID = casierID[0]

                    var channel = reaction.message.guild.channels.cache.find(channel => channel.name === casierID)
                    var logChan = reaction.message.guild.channels.cache.find(channel => channel.id === logChanID)
                    
                    if (channel == undefined) {
                        var category = reaction.message.guild.channels.cache.find(channel => channel.name === categoryID)

                        if (category === undefined) {
                            category = reaction.message.guild.channels.cache.find(channel => channel.name === categoryID.toUpperCase())
                        }
            
                        if (category.children.size >= 50) {
                            category = reaction.message.guild.channels.cache.find(channel => channel.name === "en-attente")
                        }

                        if (category.children.size < 50) {
                            reaction.message.guild.channels.create(casierID, {
                                type: 'text',
                                parent: category.id
                            }).then(chan => {
                                var points = refreshPoints(chan.id, newEmbeds)
                                newEmbeds[0].description += "\n\n**" + points + "/200 points**";
                                puntosMeta[chan.id] = points
                                writePuntosDataToFile()
                                chan.send({content: "Message validé par: <@" + user.id + ">", embeds: newEmbeds})
                                logChan.send({content: "Message validé par: <@" + user.id + ">", embeds: newEmbeds})
                                if (points <= 0) {
                                    chan.send("<@&" + hcRoleID + "> LA FEDE ! LA FEDE !")
                                }
                                reaction.message.delete().catch(error => {
                                    if (error.code !== 10008) {
                                        console.error('Failed to delete the message:', error);
                                    }
                                });
                            })
                        }
                    } else {
                        var points = refreshPoints(channel.id, newEmbeds)
                        newEmbeds[0].description += "\n\n**" + points + "/200 points**";
                        puntosMeta[channel.id] = points
                        writePuntosDataToFile()
                        channel.send({content: "Message validé par: <@" + user.id + ">", embeds: newEmbeds})
                        logChan.send({content: "Message validé par: <@" + user.id + ">", embeds: newEmbeds})
                        if (points <= 0) {
                            channel.send("<@&" + hcRoleID + "> LA FEDE ! LA FEDE !")
                        }
                        reaction.message.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                }
            } catch (e) {
                console.error("Something happen", e.message)
            }
        } else if (reaction.emoji.name == "noif" && reaction.message.channel.id === channelID && roleIsAllowed(reaction.message.guild.members.cache.get(user.id).roles)) {
            var refuseChan = reaction.message.guild.channels.cache.find(channel => channel.id === refuseChanID)

            var newEmbeds = reaction.message.embeds
            refuseChan.send({content: "Message refusé par: <@" + user.id + ">", embeds: newEmbeds})

            reaction.message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }
    }
})

function writePpaDataToFile() {
    str = ""
    for (var channelID in stickyMeta) {
        str += channelID + ","
    }

    fs.writeFileSync("ppa_meta.txt", str, function (err) {
    if (err) throw err;
    console.log('Fichier créé !');
    });
}

client.on('channelDelete', channel => {
    if (channel.guildId == casierDiscordID) {
        delete stickyMeta[channel.id]
        delete puntosMeta[channel.id]
        writePuntosDataToFile()
        writePpaDataToFile()
    }
});

let playerData = []

async function editRecapMessage(agentID) {
    var agent = agentsMeta[agentID]
    var embed = await getAgentEmbed(agentsMeta[agentID], agentID)

    if (agent.messageID != "") {
        var msg = await client.channels.cache.get(syntheseServiceChanID).messages.fetch(agent.messageID).catch(error => {
            if (error.code == 10008) {
                console.error('Failed to fetch message: ' + agentID);
            }
            return undefined
        });

        if (msg == undefined) {
            msg = await syntheseServiceChan.send({embeds:[embed]});
            agent.messageID = msg.id
        } else {
            msg.edit({embeds:[embed]})
        }

        writeAgentMeta()
    } else {
        msg = await syntheseServiceChan.send({embeds:[embed]});
        agent.messageID = msg.id
        writeAgentMeta()
    }
}

async function deleteMessage(syntheseServiceChan, messageID) {
    let lastMsg = null, lastlastMsg = "B"
    
    while (lastMsg != lastlastMsg) {
        lastlastMsg = lastMsg

        await syntheseServiceChan.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
            messages.forEach(msg => {
                lastMsg = msg.id
                if (msg.id == messageID) {
                    msg.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }
            });
        });
    }
}

client.on('messageCreate', async (message) => {
    if (message.guildId == ifpdDiscordID && message.author.id == botID && message.channel.id == recapChanID && message.content == "!recap") {
        message.delete().catch(error => {
            if (error.code !== 10008) {
                console.error('Failed to delete the message:', error);
            }
        });
        let recapData = {}
        const channel = message.guild.channels.cache.get(serviceChanID);

        let lastMsg = null, lastlastMsg = "B"

        while (lastMsg != lastlastMsg) {
            lastlastMsg = lastMsg

            await channel.messages.fetch({ limit: `100`, before: lastMsg }).then(messages => {
                messages.forEach(msg => {
                    lastMsg = msg.id
                    if (msg.embeds && msg.embeds[0]) {
                        embeds = msg.embeds[0]
                        if (embeds.description.indexOf("**Status: **Hors service") != -1) {
                            descs = embeds.description.split("\n")
                            let agentID
                            let serviceTimeStr
    
                            if (descs && descs[0]) {
                                agentID = descs[0].substring(22, descs[0].length-1)
                            }
                            if (recapData[agentID] == undefined) {
                                recapData[agentID] = {}
                                recapData[agentID].serviceTime = 0
                                recapData[agentID].count = 0
                            }
    
                            if (descs && descs[4]) {
                                serviceTimeStr = descs[4].substring(22, descs[4].length).split(":")
    
                                if (serviceTimeStr && serviceTimeStr[0]) {
                                    recapData[agentID].serviceTime += (parseInt(serviceTimeStr[0])*60)
                                }
                                if (serviceTimeStr && serviceTimeStr[1]) {
                                    recapData[agentID].serviceTime += parseInt(serviceTimeStr[1])
                                }
                            }
    
                            recapData[agentID].count++
                        }
                    }
                });
            });
        }


        for (var agentID in recapData) {
            var hours = Math.floor(recapData[agentID].serviceTime / 60);          
            var minutes = recapData[agentID].serviceTime % 60;
            
            if (hours != 0 || minutes != 0) {
                const embed = new MessageEmbed()
                .setTitle('IFPD service')
                .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                .setColor(0x00FF00)
                .setDescription("**Nom de l'agent: **" + "<@"+agentID+">" + "\n**Nombre de service: **" + recapData[agentID].count + "\n**Temps total de service: **" + hours + "h" + minutes)
                .setFooter(agentID);
                await message.channel.send({embeds:[embed]});
            }
        }
    }

});

function getCurrentPoint(id) {
    if (id != -1 && puntosMeta[id] !== undefined) {
        return puntosMeta[id]
    }

    return 200
}

function changePoint(chan, id, points, add) {
    var currentPuntos = 200
    if (id != -1 && puntosMeta[id] !== undefined) {
        currentPuntos = puntosMeta[id]
    }

    let channel = chan.guild.channels.cache.get(logpointChanID)
    
    if (add) {
        puntosMeta[id] = currentPuntos + parseInt(points)
        channel.send("<#" + id + ">: +" + parseInt(points) + " points")
    } else {
        puntosMeta[id] = currentPuntos - parseInt(points)
        channel.send("<#" + id + ">: -" + parseInt(points) + " points")

    }

    if (puntosMeta[id] <= 0) {
        chan.send("<@&" + hcRoleID + "> LA FEDE ! LA FEDE !")
    }
    writePuntosDataToFile()
}

client.on('messageCreate', async (message) => {
    if (message.guildId == casierDiscordID) {
        if (stickyMeta[message.channel.id] && stickyMeta[message.channel.id].isOn && message.content != stickyContent) {
            stickyMeta[message.channel.id].lastSticky.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
            stickyMeta[message.channel.id].lastSticky = await message.channel.send(stickyContent)
        }
    
        if (message.content == "!ppa" && message.author.id == botID) {
            try {
                if (stickyMeta[message.channel.id] === undefined) {
                    stickyMeta[message.channel.id] = {}
                    stickyMeta[message.channel.id].isOn = false
                }
    
                if (stickyMeta[message.channel.id].isOn == false) {
                    stickyMeta[message.channel.id].isOn = true
                    if (stickyMeta[message.channel.id].lastSticky) {
                        stickyMeta[message.channel.id].lastSticky.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                    stickyMeta[message.channel.id].lastSticky = await message.channel.send(stickyContent)
                }
                message.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            } catch(e) {
                console.log(e)
            }
        }
  
        if (message.content == "!unppa" && message.author.id == botID) {
            try {
                if (stickyMeta[message.channel.id] === undefined) {
                    stickyMeta[message.channel.id] = {}
                    stickyMeta[message.channel.id].isOn = false
                    stickyMeta[message.channel.id].lastSticky = await message.channel.send("L'individu n'est plus interdit de PPA")
                    message.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }

                if (stickyMeta[message.channel.id].isOn == true) {
                    stickyMeta[message.channel.id].isOn = false
                    stickyMeta[message.channel.id].lastSticky.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                    message.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });

                    cleanPpaMessage(message.channel)
                    delete stickyMeta[message.channel.id]
                }
            } catch(e) {
                console.log(e)
            }
        }

        if (message.channel.id === channelID && message.author.id == webhookCasier) {
            message.react("<a:checkif:908459106250149888>")
            message.react("<a:noif:908789451470295062>")
        }

        if (message.content === "!cleanOldChan") {
            message.guild.channels.cache.forEach(channel => {
                if (channel.type === "GUILD_TEXT" && channel.parent.id !== "908435776579174400") {
                    channel.messages.fetch({ limit: 1 }).then(messages => {
                        let lastMessage = messages.first();
                        var d = new Date();
                        d.setDate(d.getDate() - 45);

                        if (d.getTime() > lastMessage.createdTimestamp) {
                            channel.delete().catch(error => {
                                if (error.code !== 10008) {
                                    console.error('Failed to delete the message:', error);
                                }
                            });
                        }   
                    })
                }
            });
        }
        if ((message.content == "!ppa" || message.content == "!unppa") && message.author.id == botID) {
            writePpaDataToFile()
            ppaRecapMsg.edit({embeds:[getPpaRecapEmbed()]})
        }

        if (message.content == "!show" && message.author.id == botID) {
            var points = getCurrentPoint(message.channel.id)
            message.channel.send("L'individu a " + points + " points")
            if (points <= 0) {
                message.channel.send("<@&" + hcRoleID + "> LA FEDE ! LA FEDE !")
            }
            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }

        if (message.content.indexOf("!add") != -1 && message.author.id == botID) {
            changePoint(message.channel, message.channel.id, message.content.substring(4), true)
            pointRecapMsg.edit({embeds:[getPointRecapEmbed()]})

            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }

        if (message.content.indexOf("!del") != -1 && message.author.id == botID) {
            changePoint(message.channel, message.channel.id, message.content.substring(4), false)
            pointRecapMsg.edit({embeds:[getPointRecapEmbed()]})

            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }

    } else if (message.guildId == ifpdDiscordID && message.author.id == webhookIFPD) {
        if (message.channel.id == serviceChanID) {
            content = message.content

            let i = content.indexOf(" a pris son service")

            if (i !== -1) {
                let name = content.substring(0, i)

                if (playerData[name] == undefined) {
                    playerData[name] = {}
                }

                playerData[name].isService = true
                playerData[name].start = new Date();

                if (playerData[name].serviceMessage !== undefined) {
                    playerData[name].serviceMessage.delete().catch(error => {
                        if (error.code !== 10008) {
                            console.error('Failed to delete the message:', error);
                        }
                    });
                }

                const embed = new MessageEmbed()
                .setTitle('IFPD service')
                .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                .setColor(0x00FF00)
                .setDescription("**Nom de l'agent: **" + "<@"+name+">" + "\n**Status: **En service\n**Heure de la prise de service: **" + playerData[name].start.getHours() + ":" + playerData[name].start.getMinutes())
                .setFooter(name);

                playerData[name].serviceMessage = await message.channel.send({embeds:[embed]});
                message.delete().catch(error => {
                    if (error.code !== 10008) {
                        console.error('Failed to delete the message:', error);
                    }
                });
            } else {
                i = content.indexOf(" a quitté son service")
                let name = content.substring(0, i)
                if (i !== -1) {
                    if (playerData[name] !== undefined) {
                        playerData[name].isService = false
                        playerData[name].end = new Date();
                        if (playerData[name] !== undefined && playerData[name].serviceMessage) {
                            playerData[name].serviceMessage.delete().catch(error => {
                                if (error.code !== 10008) {
                                    console.error('Failed to delete the message:', error);
                                }
                            });
                        }
                        let time = new Date(playerData[name].end - playerData[name].start)
                        let hours = time.getHours()-1
                        let minutes = time.getMinutes()

                        if (agentsMeta[name] == undefined) {
                            agentsMeta[name] = {
                                "time": 0,
                                "totaltime": 0,
                                "nbservice": 0,
                                "totalnbservice": 0,
                                "messageID": ""
                            };
                        }

                        agentsMeta[name].time += hours*60 + minutes;
                        agentsMeta[name].totaltime += hours*60 + minutes;
                        agentsMeta[name].nbservice++;
                        agentsMeta[name].totalnbservice++;
                        editRecapMessage(name);

                        if (!(hours == 0 && minutes < 5)) {

                            const embed = new MessageEmbed()
                            .setTitle('IFPD service')
                            .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                            .setColor(0xFF0400)
                            .setDescription("**Nom de l'agent: **" + "<@"+name+">" + "\n**Status: **Hors service\n**Heure du début de service: **" + playerData[name].start.getHours() + ":" + playerData[name].start.getMinutes()
                            + "\n**Heure de la fin de service: **" + playerData[name].end.getHours() + ":" + playerData[name].end.getMinutes() + "\n**Temps de service: **" + (hours) + ":" + minutes)
                            .setFooter(name);
            
                            await message.channel.send({embeds:[embed]});
                            if (playerData[name] !== undefined) {
                                delete playerData[name]
                            }
                        }

                        await message.delete().catch(error => {
                            if (error.code !== 10008) {
                                console.error('Failed to delete the message:', error);
                            }
                        });
                    }
                }
            }
        }
    }
});


client.on('messageCreate', async (message) => {
    if (message.guildId == ifpdDiscordID && message.author.id == webhookIFPD && message.channel.id == serviceChanID) {
        var stickyChan =  message.guild.channels.cache.find(channel => channel.id === infoEnServiceChanID)

        content = message.content

        let i = content.indexOf(" a pris son service")

        if (i !== -1) {
            let name = content.substring(0, i)

            if (playerInService.indexOf(name) == -1) {
                playerInService.push(name)
            }
        } else {
            i = content.indexOf(" a quitté son service")
            let name = content.substring(0, i)

            if (i !== -1) {
                var e = playerInService.indexOf(name)
                if (e != -1) {
                    playerInService.splice(e, 1)
                }
            }
        }

        writeBotActivity(playerInService.length)
        var descriptionString = "**Nombre d'agent en service: " + playerInService.length + "**\n"
        for (var agentID of playerInService) {
            descriptionString += "<@" + agentID + ">\n"
        }

        const embed = new MessageEmbed()
                            .setTitle('IFPD: Agents en service')
                            .setThumbnail("https://www.zupimages.net/up/21/45/ofr3.png")
                            .setColor(0x0099ff)
                            .setDescription(descriptionString)
                            
        if (infoServiceStickyMsg == undefined) {
            infoServiceStickyMsg = await stickyChan.send({embeds:[embed]})
        } else {
            infoServiceStickyMsg.edit({embeds:[embed]})
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.guildId == ifpdDiscordID && (message.author.id == botID)) {
        if (message.content.indexOf("!dservice") != -1) {
            var data = message.content.split(" ")
            if (data.length >= 2 && agentsMeta[data[1]]) {
                deleteMessage(syntheseServiceChan, agentsMeta[data[1]].messageID)
                delete agentsMeta[data[1]];
                writeAgentMeta();
            }
            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
        }  else if (message.channel.id == syntheseServiceRecapChanID && message.content == "!rservices") {
            message.delete().catch(error => {
                if (error.code !== 10008) {
                    console.error('Failed to delete the message:', error);
                }
            });
            for (var agentID in agentsMeta) {
                var embed = await getLittleAgentEmbed(agentsMeta[agentID], agentID)
                syntheseServiceRecapChan.send({embeds:[embed]});

                agentsMeta[agentID].time = 0;
                agentsMeta[agentID].nbservice = 0;
                editRecapMessage(agentID);
            }
        }
    }
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
}

client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});