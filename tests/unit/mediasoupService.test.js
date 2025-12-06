const mediasoupService = require('../../services/mediasoupService');
const config = require('../../config/mediasoup');

// Mock mediasoup module
jest.mock('mediasoup', () => ({
    createWorker: jest.fn(() => Promise.resolve({
        pid: 12345,
        on: jest.fn(),
        createRouter: jest.fn(() => Promise.resolve({
            id: 'test-router-id',
            rtpCapabilities: {
                codecs: [
                    { kind: 'audio', mimeType: 'audio/opus' },
                    { kind: 'video', mimeType: 'video/VP8' }
                ]
            },
            createWebRtcTransport: jest.fn(() => Promise.resolve({
                id: 'test-transport-id',
                iceParameters: {},
                iceCandidates: [],
                dtlsParameters: {},
                connect: jest.fn(() => Promise.resolve()),
                produce: jest.fn(() => Promise.resolve({
                    id: 'test-producer-id',
                    kind: 'video',
                    on: jest.fn(),
                    pause: jest.fn(() => Promise.resolve()),
                    resume: jest.fn(() => Promise.resolve()),
                    close: jest.fn()
                })),
                consume: jest.fn(() => Promise.resolve({
                    id: 'test-consumer-id',
                    producerId: 'test-producer-id',
                    kind: 'video',
                    rtpParameters: {},
                    on: jest.fn()
                }))
            })),
            close: jest.fn()
        }))
    }))
}));

describe('MediasoupService', () => {
    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        jest.clearAllMocks();
    });

    describe('Worker Initialization', () => {
        test('should initialize workers based on CPU count', async () => {
            const mediasoup = require('mediasoup');
            await mediasoupService.initWorkers();

            // Should create workers (mocked to create at least one)
            expect(mediasoup.createWorker).toHaveBeenCalled();
        });

        test('should get next worker in round-robin fashion', () => {
            const worker1 = mediasoupService.getNextWorker();
            const worker2 = mediasoupService.getNextWorker();

            // Should return worker objects
            expect(worker1).toBeDefined();
            expect(worker2).toBeDefined();
        });
    });

    describe('Router Management', () => {
        test('should create router for classroom', async () => {
            const classroomId = 'CL-20251201-12345';
            const router = await mediasoupService.createRouter(classroomId);

            expect(router).toBeDefined();
            expect(router.id).toBe('test-router-id');
        });

        test('should get existing router', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);

            const router = mediasoupService.getRouter(classroomId);
            expect(router).toBeDefined();
        });

        test('should get router RTP capabilities', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);

            const capabilities = mediasoupService.getRouterRtpCapabilities(classroomId);
            expect(capabilities).toBeDefined();
            expect(capabilities.codecs).toBeDefined();
            expect(Array.isArray(capabilities.codecs)).toBe(true);
        });

        test('should throw error for non-existent router', () => {
            expect(() => {
                mediasoupService.getRouterRtpCapabilities('non-existent-classroom');
            }).toThrow('Router not found');
        });

        test('should close router and cleanup resources', async () => {
            const classroomId = 'CL-20251201-12345';
            const router = await mediasoupService.createRouter(classroomId);

            await mediasoupService.closeRouter(classroomId);

            // Router should be removed
            expect(mediasoupService.getRouter(classroomId)).toBeUndefined();
        });
    });

    describe('Transport Management', () => {
        test('should create WebRTC transport', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);

            const transport = await mediasoupService.createWebRtcTransport(classroomId);

            expect(transport).toBeDefined();
            expect(transport.id).toBe('test-transport-id');
            expect(transport.iceParameters).toBeDefined();
            expect(transport.dtlsParameters).toBeDefined();
        });

        test('should throw error when creating transport without router', async () => {
            await expect(
                mediasoupService.createWebRtcTransport('non-existent-classroom')
            ).rejects.toThrow('Router not found');
        });

        test('should connect transport with DTLS parameters', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);
            const transport = await mediasoupService.createWebRtcTransport(classroomId);

            const dtlsParameters = { role: 'client', fingerprints: [] };
            await mediasoupService.connectTransport(transport.id, dtlsParameters);

            // Should complete without error
            expect(true).toBe(true);
        });
    });

    describe('Producer Management', () => {
        test('should create producer', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);
            const transport = await mediasoupService.createWebRtcTransport(classroomId);

            const producer = await mediasoupService.produce(
                transport.id,
                'video',
                { codecs: [] },
                { userId: 'test-user', source: 'camera' }
            );

            expect(producer).toBeDefined();
            expect(producer.id).toBe('test-producer-id');
            expect(producer.kind).toBe('video');
        });

        test('should pause producer', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);
            const transport = await mediasoupService.createWebRtcTransport(classroomId);
            const producer = await mediasoupService.produce(transport.id, 'video', {});

            await mediasoupService.pauseProducer(producer.id);

            // Should complete without error
            expect(true).toBe(true);
        });

        test('should resume producer', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);
            const transport = await mediasoupService.createWebRtcTransport(classroomId);
            const producer = await mediasoupService.produce(transport.id, 'video', {});

            await mediasoupService.resumeProducer(producer.id);

            // Should complete without error
            expect(true).toBe(true);
        });

        test('should close producer', async () => {
            const classroomId = 'CL-20251201-12345';
            await mediasoupService.createRouter(classroomId);
            const transport = await mediasoupService.createWebRtcTransport(classroomId);
            const producer = await mediasoupService.produce(transport.id, 'video', {});

            await mediasoupService.closeProducer(producer.id);

            // Producer should be removed
            expect(mediasoupService.getProducer(producer.id)).toBeUndefined();
        });
    });

    describe('Consumer Management', () => {
        test('should create consumer', async () => {
            const classroomId = 'CL-20251201-12345';
            const router = await mediasoupService.createRouter(classroomId);

            const transport1 = await mediasoupService.createWebRtcTransport(classroomId);
            const transport2 = await mediasoupService.createWebRtcTransport(classroomId);
            const producer = await mediasoupService.produce(transport1.id, 'video', {});

            // Mock the router's canConsume method
            router.canConsume = jest.fn(() => true);

            const consumer = await mediasoupService.consume(
                transport2.id,
                producer.id,
                { codecs: [] }
            );

            expect(consumer).toBeDefined();
            expect(consumer.id).toBe('test-consumer-id');
            expect(consumer.producerId).toBe('test-producer-id');
        });
    });
});
