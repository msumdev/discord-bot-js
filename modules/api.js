const axios = require('axios');

require('dotenv').config();

module.exports = class Api {

    static webApiHeaders = {
        headers: {
            'auth-bypass': process.env.WEB_API_AUTH
        }
    };

    static async get(url) {
        return await axios.get(process.env.WEB_API_URL + url, Api.webApiHeaders);
    }
};