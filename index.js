const { Client, Intents, Message } = require('discord.js');
const Movie = require('./modules/media/movie.js');
const TvShow = require('./modules/media/tvShow.js');
const Audio = require('./modules/audio.js');
const SlashCommands = require('./modules/slashCommands.js');
const MessageEvent = require('./modules/events/messageEvent.js');
const PermissionValidator = require('./modules/permissionValidator.js');
const SelfieContest = require('./modules/selfiecontest.js');
const { AVS, getBearerToken } = require('./modules/alexa/avsApi');

require('dotenv').config();

const client = new Client({ intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_VOICE_STATES
]});

(async () => {
    try {
        const avsToken = await getBearerToken();
        let avsApi = new AVS(avsToken);
        let buildResponse = await avsApi.build();
    
        // let file = fs.readFileSync('/home/alexa/files/test.wav');
        // let response = await avsApi.userSays(file);

        await SlashCommands.register();

        client.on('ready', async () => {
            console.log(`Logged in as ${client.user.tag}!`);

            await Audio.handle(client);
        });

        client.on('messageCreate', async message => {
            await MessageEvent.handle(message);
        })

        client.on('interactionCreate', async interaction => {
            if (await PermissionValidator.validate(interaction.member.guild.id, interaction.member.id)) {
                await Movie.handle(interaction);
                await TvShow.handle(interaction);
                await SelfieContest.handle(interaction, client);
            }
        });
    } catch (error) {
        console.error(error);
    }
})();

client.login(process.env.TOKEN);
