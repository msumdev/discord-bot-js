require('dotenv').config();

module.exports = class MessageEvent {

    static async handle(message) {
        let attachments = []

        if (!message.author.bot || !message.attachments || message.guild) {
            message.attachments.forEach(attachment => {
                attachments.push(attachment);
            });
            
            if (!attachments) return;

            if (message.guild.channels.cache.get(process.env.LOGGING_CHANNEL)) {
                // console.log(message.guild.id);
            }
        }
    }
};