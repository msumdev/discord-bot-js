const axios = require('axios');
const http2 = require('http2');
const FormData = require('form-data')
const httpParser = require('http-message-parser')
const { getAxiosErrOutput } = require('./axiosHandling');
const { v1: uuidv1 } = require('uuid');
const util = require('util');
const fs = require('fs');

require('dotenv').config();

const getBearerToken = async () => {
    let response = await axios.post('https://api.amazon.com/auth/O2/token', {
        "client_id": process.env.AVS_CLIENT_ID,
        "client_secret": process.env.AVS_CLIENT_SECRET,
        "refresh_token": process.env.AVS_REFRESH_TOKEN,
        "grant_type": "refresh_token"
    });

    return response.data.access_token;
}

const sendCapabilities = async (token, retryDelay = 0.5) => {
    let axiosResponse = null;
    let requestParameters = {
        url: 'https://api.amazonalexa.com/v1/devices/@self/capabilities',
        method: 'PUT',
        headers: {
          authorization: `Bearer ${token}`
        },
        data: {
          envelopeVersion: '20160207',
          capabilities: [
            {
              type: 'AlexaInterface',
              interface: 'SpeechRecognizer',
              version: '2.0'
            }
          ]
        }
    }

    try {
        axiosResponse = await axios(requestParameters)
    } catch (err) {
        throw new Error(`SendCapabilities failed: ${getAxiosErrOutput(err)}`)
    }

    if (axiosResponse.status === 500) {
        retryDelay = retryDelay * 2

        if (retryDelay > 256) {
            throw new Error('Too much retry, giving up!')
        }
  
        return new Promise((resolve, reject) => {
            setTimeout(
                () => SendCapabilities(token, retryDelay).then(resolve).catch(reject),
                retryDelay * 1000
            )
        })
    } else if (axiosResponse.status !== 204) {
        throw new Error(`SendCapabilities expected status code 204, got ${axiosResponse.status}: ${getAxiosShortenedOutput(axiosResponse.data)}`)
    }
};

class AVS {
    constructor (token) {
        this.token = token;
        this.messageId = 0
        this.client = null;
        this.context = [ { header: { namespace: 'SpeechRecognizer', name: 'RecognizerState' }, payload: { } }, { header: { namespace: 'Speaker', name: 'VolumeState' }, payload: { volume: 10, muted: false } }, { header: { namespace: 'Alerts', name: 'AlertsState' }, payload: { allAlerts: [], activeAlerts: [] } }, { header: { namespace: 'SpeechSynthesizer', name: 'SpeechState' }, payload: { token: '', offsetInMilliseconds: 0, playerActivity: 'FINISHED' } }, { header: { namespace: 'AudioPlayer', name: 'PlaybackState' }, payload: { token: '', offsetInMilliseconds: 0, playerActivity: 'IDLE' } } ];
    }
  
    build () {
        return new Promise((resolve, reject) => {
            this.client = http2.connect('https://alexa.eu.gateway.devices.a2z.com')

            this.client.on('error', (err) => console.log(`Client Error ${err}`))
            this.client.on('socketError', (err) => console.log(`Client Socket Error ${err}`))
            this.client.on('goaway', (err) => console.log(`Client GoAway ${err}`))
            this.client.on('response', (headers, flags) => console.log(`Client response: ${JSON.stringify(headers, null, 2)}`))
            this.client.on('data', (chunk) => console.log('Client data'))
            this.client.on('end', (chunk) => console.log('Client end'))
          
            let requestOptions = {
                ':method': 'GET',
                ':scheme': 'https',
                ':path': '/v20160207/directives',
                authorization: 'Bearer ' + this.token
            }
      
            let request = this.client.request(requestOptions)
    
            request.on('error', (e) => console.log(`Downchannel error ${e}`))
            request.on('socketError', (e) => console.log(`Downchannel socket error ${e}`))
            request.on('goaway', (e) => console.log(`Downchannel goaway ${e}`))
            request.on('response', (headers, flags) => {
                resolve()
            })
            request.on('data', (chunk) => console.log(`Downchannel data received ${chunk}`))
            request.on('end', () => console.log('Downchannel closed'))
            request.end()
        });
    }
  
    start () {
        return Promise.resolve()
    }

    async synchronize() {
        const metadata = JSON.stringify({
            context: [{
                header: {
                    namespace: "SpeechSynthesizer",
                    name: "SpeechState"
                },
            payload: {
                token: this.token,
                    offsetInMilliseconds: 0,
                    playerActivity: "FINISHED"
                }
            }],
            event: {
                header: {
                    namespace: 'System',
                    name: 'SynchronizeState',
                    messageId: uuidv1(),
                },
                payload: {}
            }
        })

        const form = new FormData()
        form.append('metadata', metadata)
    
        const request = {
            ':method': 'POST',
            ':scheme': 'https',
            ':path': '/v20160207/events',
            authorization: `Bearer ${this.token}`
        }

        const parsedMessage = await this.postForm(this.client, request, form);
    }
  
    async userSays (audio) {
        const metadata = JSON.stringify({
            context: this.context,
            event: {
                header: {
                    namespace: 'SpeechRecognizer',
                    name: 'Recognize',
                    messageId: uuidv1(),
                    dialogRequestId: uuidv1()
                },
                payload: {
                    profile: 'CLOSE_TALK',
                    format: 'AUDIO_L16_RATE_16000_CHANNELS_1'
                }
            }
        })

  
        const form = new FormData()
        form.append('metadata', metadata)
        form.append('audio', audio, { contentType: 'application/octet-stream' })
    
        const request = {
            ':method': 'POST',
            ':scheme': 'https',
            ':path': '/v20160207/events',
            authorization: `Bearer ${this.token}`
        }
    
        const parsedMessage = await this.postForm(this.client, request, form);

        if (parsedMessage) {
            // log the json part of the message
            for (const multipartIndex in parsedMessage.multipart) {
            const part = parsedMessage.multipart[multipartIndex]
            if (part.headers['Content-Type'] && part.headers['Content-Type'].indexOf('application/json') === 0) {
                console.log(`UserSays response, multipart ${multipartIndex} Body: ${part.body.toString('utf8')}`)
            } else {
                console.log(`UserSays response, multipart ${multipartIndex}: ${util.inspect(part)}`)
            }
            }
      
            const contentPayload = parsedMessage.multipart.reduce((acc, part) => {
              if (part.headers && part.headers['Content-ID']) {
                console.log(`Found Content Payload with CID ${part.headers['Content-ID']}`)
                acc[part.headers['Content-ID']] = part.body
              }
              return acc
            }, {})
      
            const directivePayload = parsedMessage.multipart.reduce((acc, part) => {
              if (part.headers && part.headers['Content-Type'].indexOf('application/json') === 0) {
                console.log(`Found JSON Payload of type ${part.headers['Content-Type']}`)
                const partJson = JSON.parse(part.body.toString('utf8'))
                if (partJson.directive) {
                  acc.push(partJson.directive)
                }
              }
              return acc
            }, [])
      
            const audioBuffers = []
            directivePayload.forEach(directive => {
              if (directive.header && directive.header.namespace === 'SpeechSynthesizer' && directive.header.name === 'Speak') {
                console.log(`Found SpeechSynthesizer/Speak directive ${util.inspect(directive)}`)
                if (directive.payload.url.indexOf('cid:') === 0) {
                  const lookupContentId = `<${directive.payload.url.substr(4)}>`
                  if (contentPayload[lookupContentId]) {
                    audioBuffers.push({ format: directive.payload.format, payload: contentPayload[lookupContentId] })
                  } else {
                    throw new Error(`Directive payload ${lookupContentId} not found in response.`)
                  }
                } else {
                  throw new Error(`Directive payload url ${directive.payload.url} not supported.`)
                }
              }
            })
            if (audioBuffers && audioBuffers.length > 0) {
              audioBuffers.forEach((ab, index) => {
                fs.writeFileSync(`AlexaSaid${index}.mp3`, ab.payload)
              })
            }
            return audioBuffers
          } else {
            console.log('UserSays response is empty')
          }
    }

    async postForm(client, options, data) {
        return new Promise((resolve, reject) => {
            let payload = data.getBuffer()
            let outdata;

            options['content-type'] = `multipart/form-data; boundary=${data.getBoundary()}`

            let request = client.request(options)
    
            request.on('error', (err) => {
                return reject(err);
            });
            request.on('socketError', (err) => {
                return reject(err);
            })
            request.on('response', (headers, flags) => {
                console.log(`HTTP2 request to ${options[':path']} got response: ${JSON.stringify(headers, null, 2)}`)
            })
            request.on('data', (chunk) => {
                outdata = outdata ? Buffer.concat([outdata, chunk]) : chunk;
            })
            request.on('end', () => {
                if (outdata && outdata.length) {
                    const parsedMessage = httpParser(outdata)
                    resolve(parsedMessage)
                } else {
                    resolve()
                }
            })
    
            request.write(payload)
            request.end()
        });
    }
  
    Stop () {
      debug('Stop called')
      return Promise.resolve()
    }
  
    Clean () {
      debug('Clean called')
      this.client.destroy()
      this.client = null
      this.token = null
      return Promise.resolve()
    }
  }

module.exports = {
    AVS,
    getBearerToken,
    sendCapabilities
}