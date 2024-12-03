require('dotenv').config();

const Api = require('./api.js');

module.exports = class PermissionValidator {

    static async validate(server_id, client_id) {
        let response = await Api.get(`/api/discord/permissions/${client_id}`);
        let verified = false;

        response.data.forEach((item) => {
            if (item['server_id'] == server_id || item['server_id'] == '*') {
                verified = true;

                return;
            }
        });

        return verified;
    }
};