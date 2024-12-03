const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require('discord.js');

const Api = require('../api.js');

require('dotenv').config();

module.exports = class Movie {

    static movieListResponse = [];

    static async handle(interaction) {
        if (interaction.type == 'APPLICATION_COMMAND') {
            if (interaction.commandName === 'jmovie') {
                if (interaction.options.get('search')) {
                    let searchValue = interaction.options.get('search').value;

                    if (searchValue) {
                        await interaction.reply("Loading...");

                        let response = await Api.get(`/api/movie/search/${searchValue}`);
                        let movieList = [];

                        Movie.movieListResponse = response.data.items;

                        if (Movie.movieListResponse.length > 0) {
                            Movie.movieListResponse.forEach((movie, index) => {
                                if (index > 24) {
                                    return false;
                                }
    
                                let movieLabel = movie['year'] ? `${movie['title']} (${movie['year']})` : `${movie['title']}`
                                movieList.push({
                                    "label": `${movieLabel}`,
                                    "value": `${movie['id']}`,
                                    "default": false
                                });
                            })
    
                            let selectMenu = new MessageActionRow()
                                .addComponents(
                                    new MessageSelectMenu()
                                        .setCustomId('movie-select-menu')
                                        .setPlaceholder(`Showing ${movieList.length} Results`)
                                        .addOptions(movieList)
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
            if (interaction.customId == 'movie-select-menu') {
                let serverId = interaction.member.guild.id;
                let movieId = interaction.values[0];

                let movieDetails = Movie.movieListResponse.find( ({id}) => id === movieId)
    
                if (!movieDetails) {
                    return await interaction.reply("Please re-request the movie (/jmovie).")
                }

                let response = await Api.get(`/api/movie/play/${serverId}/${movieId}`);

                let streamLink = `https://###/${serverId}/${response.data['stream_path']}`;
                let roleNotify = `${response.data['role_notify']}`;

                let movieTitle = movieDetails['year'] ? `${movieDetails['title']} (${movieDetails['year']})` : `${movieDetails['title']}`
                let messageEmbed = new MessageEmbed()
                    .setColor(`#00d5ff`)
                    .setTitle(`Now Playing: ${movieTitle}`)
                    .setDescription(movieDetails['description'])
                    .addFields([
                        { "name": `Rating`, "value": `${movieDetails['rating']}` },
                        { "name": `IMDB Link`, "value": `https://www.imdb.com/title/${movieDetails['imdb_id']}/` },
                        { "name": `Stream Link`, "value": `${streamLink} <@&${roleNotify}>` }
                    ])
                    .setThumbnail(`https://###${movieDetails['images']['poster']}`)
                    .setURL(streamLink)
    
                    return await interaction.reply({ embeds: [messageEmbed] })
            }
        }
    }
};