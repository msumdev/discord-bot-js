const { MessageEmbed } = require('discord.js');

require('dotenv').config();

module.exports = class SelfieContest {

    static selfies = [];

    static async handle(interaction, client) {
        if (interaction.type == 'APPLICATION_COMMAND') {
            if (interaction.commandName === 'selfiecontest') {
                if (interaction.options.get('draw')) {
                    let channel = client.channels.cache.get("###");

                    await channel.messages.fetch({ limit: 100 }).then(messages => {
                        messages.forEach(message => this.selfies.push(message));
                    });

                    let winningIndex = Math.floor(Math.random() * (this.selfies.length - 0 + 1)) + 0;

                    this.selfies.forEach(async (message, index) => {
                        if (index == winningIndex) {
                            let messageEmbed = new MessageEmbed()
                                .setColor(`#00d5ff`)
                                .setTitle(`Winner - ${message.author.username}#${message.author.discriminator}`)
                                .setDescription(`<@${message.author.id}> PogU 1 year nitro`)
                                .setImage(message.attachments.first().url)

                            return await interaction.reply({ embeds: [messageEmbed] })
                        }
                    });
                }
            }
        }
    }
};