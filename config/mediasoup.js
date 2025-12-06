const os = require('os');

module.exports = {
    // Number of mediasoup workers (one per CPU core)
    numWorkers: Object.keys(os.cpus()).length,

    // Worker settings
    worker: {
        rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 40000,
        rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 49999,
        logLevel: process.env.MEDIASOUP_LOG_LEVEL || 'warn',
        logTags: [
            'info',
            'ice',
            'dtls',
            'rtp',
            'srtp',
            'rtcp'
        ]
    },

    // Router settings
    router: {
        mediaCodecs: [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/VP9',
                clockRate: 90000,
                parameters: {
                    'profile-id': 2,
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/h264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '4d0032',
                    'level-asymmetry-allowed': 1,
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/h264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1,
                    'x-google-start-bitrate': 1000
                }
            }
        ]
    },

    // WebRTC transport settings
    webRtcTransport: {
        listenIps: [
            {
                ip: '0.0.0.0',
                announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000
    },

    // TURN server configuration (optional, for NAT traversal)
    turnServer: process.env.TURN_SERVER_URL ? {
        urls: [process.env.TURN_SERVER_URL],
        username: process.env.TURN_USERNAME,
        credential: process.env.TURN_PASSWORD
    } : null,

    // Simulcast encoding for teacher's video stream (3 layers)
    simulcastEncodings: [
        { scaleResolutionDownBy: 4, maxBitrate: 500000 },   // Low quality
        { scaleResolutionDownBy: 2, maxBitrate: 1000000 },  // Medium quality
        { scaleResolutionDownBy: 1, maxBitrate: 2000000 }   // High quality
    ]
};
