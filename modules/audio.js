const { EndBehaviorType, joinVoiceChannel, createAudioResource, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const prism = require('prism-media');
const { pipeline } = require('node:stream');
const { createWriteStream, readFileSync, createReadStream } = require('node:fs');
const { v1: uuidv1 } = require('uuid');
const { AVS, getBearerToken } = require('./alexa/avsApi.js');

module.exports = class Audio {

    static async processAudio(connection, avsApi, audioStream) { 
        const filename = "./audio_files/" + uuidv1() + ".ogg";
        const oggStream = new prism.opus.OggLogicalBitstream({
            opusHead: new prism.opus.OpusHead({
                channelCount: 2,
                sampleRate: 48000,
            }),
            pageSizeControl: {
                maxPackets: 10,
            },
        });
        const out = createWriteStream(filename);

        pipeline(audioStream, oggStream, out, async (err) => {
            if (err) {
                console.warn(`❌ Error recording file ${filename} - ${err.message}`);
            } else {
                var ffmpeg = require('fluent-ffmpeg');
                var newFile = "./audio_files/" + uuidv1() + ".wav";

                ffmpeg(filename).outputOptions([
                    '-acodec pcm_s16le',
                    '-ac 1',
                    '-ar 16000'
                ]).output(newFile)
                    .on('start', function (commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    })
                    .on('error', function (err, stdout, stderr) {
                        console.log('An error occurred: ' + err.message, err, stderr);
                    })
                    .on('progress', function (progress) {
                        console.log('Processing: ' + progress.percent + '% done')
                    })
                    .on('end', async (err, stdout, stderr) => {
                        let file = readFileSync(newFile);

                        let response = await avsApi.userSays(file);
                        let player = createAudioPlayer({
                            behaviors: {
                                noSubscriber: NoSubscriberBehavior.Pause,
                            },
                        });
                        let resource = createAudioResource("/home/discordbot/discord-bot-js/AlexaSaid0.mp3")
                        player.play(resource);
                        connection.subscribe(player);
                    }).run()
            }
        });
    }

    static async handle(client) {
        const guild = client.guilds.cache.get("###");
        const user = guild.members.cache.get("###");
        const currentChannel = user.voice.channel;
        const token = await getBearerToken();
        const avsApi = new AVS(token);

        await avsApi.build();

        if(currentChannel) {
            const connection = joinVoiceChannel({
                channelId: currentChannel.id,
                guildId: guild.id,
                adapterCreator: currentChannel.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            connection.receiver.speaking.on('start', (userId) => {
                if (userId == '###') {
                    var audioStream = connection.receiver.subscribe(`${user.id}`, {
                        end: {
                            behavior: EndBehaviorType.AfterSilence,
                            duration: 100,
                        },
                    });

                    this.processAudio(connection, avsApi, audioStream);
                }
            });
        }
    }
};