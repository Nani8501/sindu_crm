const mediasoup = require('mediasoup');
const config = require('../config/mediasoup');

class MediasoupService {
    constructor() {
        this.workers = [];
        this.nextWorkerIdx = 0;
        this.routers = new Map(); // classroomId -> router
        this.transports = new Map(); // transportId -> transport
        this.producers = new Map(); // producerId -> producer
        this.consumers = new Map(); // consumerId -> consumer
    }

    /**
     * Initialize mediasoup workers (one per CPU core)
     */
    async initWorkers() {
        const { numWorkers } = config;
        console.log(`🔧 Initializing ${numWorkers} mediasoup workers...`);

        for (let i = 0; i < numWorkers; i++) {
            const worker = await mediasoup.createWorker({
                logLevel: config.worker.logLevel,
                logTags: config.worker.logTags,
                rtcMinPort: config.worker.rtcMinPort,
                rtcMaxPort: config.worker.rtcMaxPort
            });

            worker.on('died', () => {
                console.error(`❌ Mediasoup worker ${worker.pid} died, exiting...`);
                setTimeout(() => process.exit(1), 2000);
            });

            this.workers.push(worker);
            console.log(`✅ Worker ${i + 1}/${numWorkers} created (PID: ${worker.pid})`);
        }

        console.log('✅ All mediasoup workers initialized');
    }

    /**
     * Get next worker (round-robin)
     */
    getNextWorker() {
        const worker = this.workers[this.nextWorkerIdx];
        this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
        return worker;
    }

    /**
     * Create a router for a classroom
     */
    async createRouter(classroomId) {
        const worker = this.getNextWorker();
        const router = await worker.createRouter({
            mediaCodecs: config.router.mediaCodecs
        });

        this.routers.set(classroomId, router);
        console.log(`✅ Router created for classroom ${classroomId}`);
        return router;
    }

    /**
     * Get router for classroom
     */
    getRouter(classroomId) {
        return this.routers.get(classroomId);
    }

    /**
     * Get router RTP capabilities
     */
    getRouterRtpCapabilities(classroomId) {
        const router = this.getRouter(classroomId);
        if (!router) {
            throw new Error(`Router not found for classroom ${classroomId}`);
        }
        return router.rtpCapabilities;
    }

    /**
     * Create WebRTC transport
     */
    async createWebRtcTransport(classroomId) {
        const router = this.getRouter(classroomId);
        if (!router) {
            throw new Error(`Router not found for classroom ${classroomId}`);
        }

        const transport = await router.createWebRtcTransport({
            listenIps: config.webRtcTransport.listenIps,
            enableUdp: config.webRtcTransport.enableUdp,
            enableTcp: config.webRtcTransport.enableTcp,
            preferUdp: config.webRtcTransport.preferUdp,
            initialAvailableOutgoingBitrate: config.webRtcTransport.initialAvailableOutgoingBitrate
        });

        this.transports.set(transport.id, transport);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters
        };
    }

    /**
     * Connect transport
     */
    async connectTransport(transportId, dtlsParameters) {
        const transport = this.transports.get(transportId);
        if (!transport) {
            throw new Error(`Transport ${transportId} not found`);
        }

        await transport.connect({ dtlsParameters });
    }

    /**
     * Create producer (publish stream)
     */
    async produce(transportId, kind, rtpParameters, appData = {}) {
        const transport = this.transports.get(transportId);
        if (!transport) {
            throw new Error(`Transport ${transportId} not found`);
        }

        const producer = await transport.produce({
            kind,
            rtpParameters,
            appData
        });

        this.producers.set(producer.id, producer);

        producer.on('transportclose', () => {
            console.log(`Producer ${producer.id} closed (transport closed)`);
            this.producers.delete(producer.id);
        });

        return {
            id: producer.id,
            kind: producer.kind
        };
    }

    /**
     * Create consumer (subscribe to stream)
     */
    async consume(transportId, producerId, rtpCapabilities) {
        const transport = this.transports.get(transportId);
        const producer = this.producers.get(producerId);

        if (!transport) {
            throw new Error(`Transport ${transportId} not found`);
        }
        if (!producer) {
            throw new Error(`Producer ${producerId} not found`);
        }

        const router = transport.appData.router || Array.from(this.routers.values())[0];

        // Check if can consume
        if (!router.canConsume({ producerId, rtpCapabilities })) {
            throw new Error('Cannot consume');
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false
        });

        this.consumers.set(consumer.id, consumer);

        consumer.on('transportclose', () => {
            console.log(`Consumer ${consumer.id} closed (transport closed)`);
            this.consumers.delete(consumer.id);
        });

        consumer.on('producerclose', () => {
            console.log(`Consumer ${consumer.id} closed (producer closed)`);
            this.consumers.delete(consumer.id);
        });

        return {
            id: consumer.id,
            producerId: consumer.producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters
        };
    }

    /**
     * Pause producer
     */
    async pauseProducer(producerId) {
        const producer = this.producers.get(producerId);
        if (!producer) {
            throw new Error(`Producer ${producerId} not found`);
        }
        await producer.pause();
    }

    /**
     * Resume producer
     */
    async resumeProducer(producerId) {
        const producer = this.producers.get(producerId);
        if (!producer) {
            throw new Error(`Producer ${producerId} not found`);
        }
        await producer.resume();
    }

    /**
     * Close producer
     */
    async closeProducer(producerId) {
        const producer = this.producers.get(producerId);
        if (!producer) {
            return; // Already closed
        }
        producer.close();
        this.producers.delete(producerId);
    }

    /**
     * Close transport
     */
    async closeTransport(transportId) {
        const transport = this.transports.get(transportId);
        if (!transport) {
            return; // Already closed
        }
        transport.close();
        this.transports.delete(transportId);
    }

    /**
     * Clean up classroom resources
     */
    async closeRouter(classroomId) {
        const router = this.routers.get(classroomId);
        if (router) {
            router.close();
            this.routers.delete(classroomId);
            console.log(`✅ Router closed for classroom ${classroomId}`);
        }
    }

    /**
     * Get producer by ID
     */
    getProducer(producerId) {
        return this.producers.get(producerId);
    }

    /**
     * Get all producers for a specific user in a classroom
     */
    getProducersByAppData(filter) {
        const producers = [];
        for (const [id, producer] of this.producers) {
            let match = true;
            for (const [key, value] of Object.entries(filter)) {
                if (producer.appData[key] !== value) {
                    match = false;
                    break;
                }
            }
            if (match) {
                producers.push(producer);
            }
        }
        return producers;
    }
}

// Singleton instance
const mediasoupService = new MediasoupService();

module.exports = mediasoupService;
