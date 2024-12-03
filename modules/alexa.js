const { joinVoiceChannel } = require('@discordjs/voice');
const prism = require('prism-media');
const { pipeline } = require('node:stream');
const { createWriteStream } = require('node:fs');

require('dotenv').config();

module.exports = class Alexa {

    static async handle(client) {
        let guild = client.guilds.cache.get("###");
        let user = guild.members.cache.get("###");
        let currentChannel = user.voice.channel;

        if(currentChannel) {
            let connection = joinVoiceChannel({
                channelId: currentChannel.id,
                guildId: guild.id,
                adapterCreator: currentChannel.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            // let audioStream = connection.receiver.subscribe(`${user.id}`);

            // let oggStream = new prism.opus.OggLogicalBitstream({
            //     opusHead: new prism.opus.OpusHead({
            //         channelCount: 2,
            //         sampleRate: 48000,
            //     }),
            //     pageSizeControl: {
            //         maxPackets: 10,
            //     },
            // });

            // let filename = "user_audio.ogg";
            // const out = createWriteStream(filename);

            // console.log(`👂 Started recording ${filename}`);

            // pipeline(audioStream, oggStream, out, (err) => {
            //     if (err) {
            //         console.warn(`❌ Error recording file user_audio.ogg - ${err.message}`);
            //     } else {
            //         console.log(`✅ Recorded user_audio.ogg`);
            //     }
            // });
        }
    }
};