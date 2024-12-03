const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');

const Api = require('../api.js');

require('dotenv').config();

module.exports = class TvShow {

    static mediaListResponse = [];

    static async handle(interaction) {
        if (interaction.type == 'APPLICATION_COMMAND') {
            if (interaction.commandName === 'jshow') {
                if (interaction.options.get('search')) {
                    let searchValue = interaction.options.get('search').value;
                    TvShow.mediaListResponse["current"] = [];

                    if (searchValue) {
                        await interaction.reply("Loading...");

                        let response = await Api.get(`/api/show/search/${searchValue}`);
                        let showList = [];

                        TvShow.mediaListResponse['results'] = response.data.items;

                        if (TvShow.mediaListResponse['results'].length > 0) {
                            TvShow.mediaListResponse['results'].forEach((show, index) => {
                                if (index > 24) {
                                    return false;
                                }

                                if (show['released']) {
                                    let year = new Date(show['released']);
                                    var showLabel = `${show['title']} (${show['year']} - ${year.getFullYear()})`
                                } else {
                                    var showLabel = `${show['title']}`;
                                }

                                showList.push({
                                    "label": `${showLabel}`,
                                    "value": `${show['id']}`,
                                    "default": false
                                });
                            })
    
                            let selectMenu = new MessageActionRow()
                                .addComponents(
                                    new MessageSelectMenu()
                                        .setCustomId('tvshow-select-menu')
                                        .setPlaceholder(`Showing ${showList.length} Results`)
                                        .addOptions(showList)
                                )
    
                            return await interaction.editReply({ content: `I found the following:`, components: [selectMenu] })
                        } else { 
                            return await interaction.editReply(`Ah fuck, I couldn't find anything.`)
                        }
                    }
                } else if (interaction.options.get('stop')) {
                    let stopDecision = interaction.options.get('stop').value;
                    let serverId = interaction.member.guild.id;

                    if (stopDecision) {
                        await Api.get(`/api/media/stop/${serverId}`);

                        return await interaction.reply(`Ended stream.`);
                    } else {
                        return await interaction.reply(`Okay then?`);
                    }
                } else {
                    return await interaction.reply(`Select a valid option.`)
                }
            }
        } else if (interaction.type == 'MESSAGE_COMPONENT') {
            if (interaction.customId == 'tvshow-select-menu') {
                let tvShowId = interaction.values[0];

                let tvShowDetails = TvShow.mediaListResponse['results'].find( ({id}) => id === tvShowId)

                if (!tvShowDetails) {
                    return await interaction.reply("Please re-request the tv show (/jshow).")
                }

                let tvShowSlug = tvShowDetails['url'].replace('/shows/', '');
                let response = await Api.get(`/api/show/seasons/${tvShowSlug}`);
                let seasonList = [];

                TvShow.mediaListResponse['show'] = response.data.item;
                TvShow.mediaListResponse['seasons'] = response.data.seasons;

                if (TvShow.mediaListResponse['seasons'].length > 0) {
                    TvShow.mediaListResponse['seasons'].forEach((season, index) => {
                        if (index > 24) {
                            return false;
                        }

                        let seasonLabel = season['year'] ? `${season['title']} (${season['year']})` : `${season['title']}`
                        seasonList.push({
                            "label": `${seasonLabel}`,
                            "value": `${season['id']}`,
                            "default": false
                        });
                    })

                    let selectMenu = new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                                .setCustomId('tvshow-seasons-select-menu')
                                .setPlaceholder(`Showing ${seasonList.length} Results`)
                                .addOptions(seasonList)
                        )

                    return await interaction.reply({ content: `Listing seasons for: ${response.data.item.title}`, components: [selectMenu] })
                } else { 
                    return await interaction.editReply(`Ah fuck, I couldn't find anything.`)
                }
            } else if(interaction.customId == 'tvshow-seasons-select-menu') {
                let seasonId = interaction.values[0];

                let seasonShowDetails = TvShow.mediaListResponse['seasons'].find( ({id}) => id === seasonId)

                if (!seasonShowDetails) {
                    return await interaction.reply("Please re-request the tv show (/jshow).")
                }

                let showArray = seasonShowDetails['url'].replace('/shows/', '').split("/");
                let tvShowSlug = showArray[0];
                let tvShowSeason = showArray[1].split('-')[1];
                let response = await Api.get(`/api/show/episodes/${tvShowSlug}/${tvShowSeason}`);

                let episodeList = [];

                TvShow.mediaListResponse['episodes'] = response.data.episodes;

                if (TvShow.mediaListResponse['episodes'].length > 0) {
                    TvShow.mediaListResponse['episodes'].forEach((episode, index) => {
                        if (index > 24) {
                            return false;
                        }

                        episodeList.push({
                            "label": `Episode ` + (index + 1),
                            "value": `${episode['id']}`,
                            "default": false
                        });
                    })

                    let selectMenu = new MessageActionRow()
                        .addComponents(
                            new MessageSelectMenu()
                                .setCustomId('tvshow-episodes-select-menu')
                                .setPlaceholder(`Showing ${episodeList.length} Results`)
                                .addOptions(episodeList)
                        )

                    return await interaction.reply({ content: `Listing episodes for: ${response.data.item.description}`, components: [selectMenu] })
                } else { 
                    return await interaction.editReply(`Ah fuck, I couldn't find anything.`)
                }
            } else if(interaction.customId == 'tvshow-episodes-select-menu') {
                let serverId = interaction.member.guild.id;
                let episodeId = interaction.values[0];

                let episodeShowDetails = TvShow.mediaListResponse['episodes'].find( ({id}) => id === episodeId)

                if (!episodeShowDetails) {
                    return await interaction.reply("Please re-request the tv show (/jshow).")
                }

                let showArray = episodeShowDetails['url'].replace('/shows/', '').split("/");
                let tvShowSlug = showArray[0];
                let tvShowSeason = showArray[1].split('-')[1];
                let tvShowEpisode = showArray[2].split('-')[1];

                let response = await Api.get(`/api/show/play/${serverId}/${tvShowSlug}/${tvShowSeason}/${tvShowEpisode}`);

                let streamLink = `https://###/${serverId}/${response.data['stream_path']}`;
                let roleNotify = `${response.data['role_notify']}`;

                let showTitle = episodeShowDetails['year'] ? `${episodeShowDetails['title']} (${episodeShowDetails['year']})` : `${episodeShowDetails['title']}`
                let messageEmbed = new MessageEmbed()
                    .setColor(`#00d5ff`)
                    .setTitle(`Now Playing: ${TvShow.mediaListResponse['show'].title} - Season ${tvShowSeason} - Episode ${tvShowEpisode}`)
                    .setDescription(episodeShowDetails['description'])
                    .addFields([
                        { "name": `Rating`, "value": `${TvShow.mediaListResponse['show'].rating}` },
                        { "name": `IMDB Link`, "value": `https://www.imdb.com/title/${TvShow.mediaListResponse['show'].imdb_id}/` },
                        { "name": `Stream Link`, "value": `${streamLink} <@&${roleNotify}>` }
                    ])
                    .setThumbnail(`https://###${episodeShowDetails['images']['poster']}`)
                    .setURL(streamLink)

                    return await interaction.reply({ embeds: [messageEmbed] })
            }
        }
    }
};