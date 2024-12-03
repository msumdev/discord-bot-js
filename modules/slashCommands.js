const { Routes } = require('discord-api-types/v9');
const { REST } = require('@discordjs/rest');

require('dotenv').config();

module.exports = class SlashCommands {

    static rest = new REST({ version: '9' }).setToken(process.env.TOKEN);
    static commands = [{
        name: 'jmovie',
        description: 'A command to play movies',
        options: [
            {
                name: 'search',
                description: 'Searches for a movie',
                type: 3
            },
            {
                name: 'stop',
                description: 'Stops the current playing movie',
                type: 5,
                required: false
            },
            {
                name: 'makeschedule',
                description: 'Make a movie schedule',
                type: 5,
                required: false
            }
        ]
    }, {
        name: 'jshow',
        description: 'A command to play tv shows',
        options: [
            {
                name: 'search',
                description: 'Searches for tv shows',
                type: 3
            },
            {
                name: 'stop',
                description: 'Stops the current playing movie',
                type: 5,
                required: false
            }
        ]
    }, {
        name: 'selfiecontest',
        description: 'A command to draw a random selfie from the selfie channel',
        options: [
            {
                name: 'draw',
                description: 'Searches for tv shows',
                type: 5
            }
        ]
    }, {
        name: 'jyt',
        description: 'A command for playing music from youtube',
        options: [
            {
                name: 'play',
                description: 'Plays a youtube link',
                type: 3
            }
        ]
    }];

    static async register(client_id) {
        console.log('Started refreshing application (/) commands.');

        await SlashCommands.rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: SlashCommands.commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    }
};