/**
 * Student Classroom Client
 * Simplified interface for students with permission-based controls
 */

class StudentClassroom {
    constructor(classroomId, token) {
        this.classroomId = classroomId;
        this.token = token;
        this.socket = null;
        this.device = null;
        this.sendTransport = null;
        this.recvTransport = null;
        this.producers = new Map();
        this.consumers = new Map();
        this.participants = new Map();
        this.isConnected = false;
        this.permissions = {
            canSpeak: false,
            canVideo: false,
            canScreenShare: false
        };
    }

    async init() {
        try {
            await this.connectSocket();
            await this.joinClassroom();
            this.setupEventListeners();
            await this.initMediasoup();
            this.updateUI();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize classroom: ' + error.message);
        }
    }

    connectSocket() {
        return new Promise((resolve, reject) => {
            this.socket = io({
                auth: { token: this.token }
            });

            this.socket.on('connect', () => {
                console.log('Socket connected');
                this.isConnected = true;
                this.updateConnectionStatus('Connected');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                this.updateConnectionStatus('Connection failed');
                reject(error);
            });

            this.socket.on('disconnect', () => {
                this.isConnected = false;
                this.updateConnectionStatus('Disconnected');
            });
        });
    }

    async joinClassroom() {
        return new Promise((resolve, reject) => {
            this.socket.emit('join-classroom', { classroomId: this.classroomId }, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                console.log('Joined classroom:', response);
                document.getElementById('classroomTitle').textContent = response.classroom.title;

                // Add existing participants
                response.participants.forEach(p => {
                    this.addParticipantToList(p.userId, p.name, p.role);
                });

                resolve(response);
            });
        });
    }

    async initMediasoup() {
        const { rtpCapabilities } = await this.socketRequest('getRouterRtpCapabilities', {
            classroomId: this.classroomId
        });

        this.device = new mediasoupClient.Device();
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });

        await this.createSendTransport();
        await this.createReceiveTransport();
    }

    async createSendTransport() {
        const transportParams = await this.socketRequest('createTransport', {
            classroomId: this.classroomId,
            direction: 'send'
        });

        this.sendTransport = this.device.createSendTransport(transportParams.params);

        this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await this.socketRequest('connectTransport', {
                    transportId: this.sendTransport.id,
                    dtlsParameters
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });

        this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
                const { id } = await this.socketRequest('produce', {
                    transportId: this.sendTransport.id,
                    kind,
                    rtpParameters,
                    appData
                });
                callback({ id });
            } catch (error) {
                errback(error);
            }
        });
    }

    async createReceiveTransport() {
        const transportParams = await this.socketRequest('createTransport', {
            classroomId: this.classroomId,
            direction: 'receive'
        });

        this.recvTransport = this.device.createRecvTransport(transportParams.params);

        this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
                await this.socketRequest('connectTransport', {
                    transportId: this.recvTransport.id,
                    dtlsParameters
                });
                callback();
            } catch (error) {
                errback(error);
            }
        });
    }

    async requestMicrophone() {
        // Students don't auto-start, they request permission
        alert('Microphone request sent to teacher (Feature in development)');
        // In production, this would send a permission request to teacher
    }

    async requestCamera() {
        alert('Camera request sent to teacher (Feature in development)');
    }

    async requestScreenShare() {
        try {
            await this.socketRequest('request-screen-share', {});
            alert('Screen share request sent to teacher. Please wait for approval.');
        } catch (error) {
            this.showError('Failed to request screen share: ' + error.message);
        }
    }

    async startScreenShare() {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { width: 1920, height: 1080 }
            });
            const track = stream.getVideoTracks()[0];

            track.onended = () => this.stopScreenShare();

            const producer = await this.sendTransport.produce({
                track,
                appData: { source: 'screen' }
            });

            this.producers.set('screen', producer);
            document.getElementById('requestScreenShareBtn').textContent = '🖥️ Stop Sharing';
        } catch (error) {
            console.error('Screen share error:', error);
        }
    }

    async stopScreenShare() {
        const producer = this.producers.get('screen');
        if (producer) {
            await this.socketRequest('closeProducer', {
                producerId: producer.id,
                source: 'screen'
            });
            producer.close();
            this.producers.delete('screen');
            document.getElementById('requestScreenShareBtn').textContent = '🖥️ Request Screen Share';
        }
    }

    async consumeMedia(producerId, userId, kind, source) {
        try {
            const consumerParams = await this.socketRequest('consume', {
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities
            });

            const consumer = await this.recvTransport.consume(consumerParams.params);
            this.consumers.set(consumer.id, consumer);

            await this.socketRequest('resumeConsumer', { consumerId: consumer.id });

            const stream = new MediaStream([consumer.track]);
            this.displayRemoteVideo(userId, stream, source === 'screen');
        } catch (error) {
            console.error('Consume error:', error);
        }
    }

    displayRemoteVideo(userId, stream, isScreen = false) {
        const videoGrid = document.getElementById('videoGrid');
        let videoCard = document.getElementById(`video-${userId}`);

        if (!videoCard) {
            videoCard = document.createElement('div');
            videoCard.id = `video-${userId}`;
            videoCard.className = `video-card ${isScreen ? 'screen-share' : ''}`;

            const participant = this.participants.get(userId);
            const name = participant ? participant.name : 'Unknown';

            videoCard.innerHTML = `
                <video autoplay playsinline></video>
                <div class="video-overlay">
                    <span class="participant-name">${name}${isScreen ? ' (Screen)' : ''}</span>
                    <div class="video-icons"></div>
                </div>
            `;
            videoGrid.appendChild(videoCard);
        }

        const video = videoCard.querySelector('video');
        video.srcObject = stream;

        if (isScreen) {
            videoCard.classList.add('screen-share');
        }
    }

    addParticipantToList(userId, name, role) {
        this.participants.set(userId, { userId, name, role });

        const listDiv = document.getElementById('participantsList');
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.id = `participant-${userId}`;
        item.innerHTML = `
            <div class="participant-info">
                <div class="participant-avatar">${name.charAt(0).toUpperCase()}</div>
                <div>
                    <div>${name}</div>
                    <small style="opacity: 0.7;">${role}</small>
                </div>
            </div>
        `;
        listDiv.appendChild(item);
    }

    removeParticipant(userId) {
        this.participants.delete(userId);

        const videoCard = document.getElementById(`video-${userId}`);
        if (videoCard) videoCard.remove();

        const participantItem = document.getElementById(`participant-${userId}`);
        if (participantItem) participantItem.remove();
    }

    raiseHand() {
        this.socket.emit('raise-hand', {});
        alert('Hand raised! Teacher has been notified.');
    }

    leaveClassroom() {
        if (!confirm('Are you sure you want to leave the classroom?')) return;

        if (this.socket) {
            this.socket.disconnect();
        }

        window.location.href = '/student/dashboard.html';
    }

    setupEventListeners() {
        // Socket events
        this.socket.on('user-joined', ({ userId, name, role }) => {
            console.log('User joined:', name);
            this.addParticipantToList(userId, name, role);
        });

        this.socket.on('user-left', ({ userId }) => {
            console.log('User left:', userId);
            this.removeParticipant(userId);
        });

        this.socket.on('new-producer', ({ producerId, userId, kind, source }) => {
            console.log('New producer:', userId, kind, source);
            this.consumeMedia(producerId, userId, kind, source);
        });

        this.socket.on('screen-share-approved', () => {
            alert('Screen share approved! Starting...');
            this.startScreenShare();
        });

        this.socket.on('screen-share-rejected', () => {
            alert('Screen share request was rejected by the teacher.');
        });

        this.socket.on('remote-control-request', ({ teacherId, teacherName }) => {
            this.showRemoteControlRequest(teacherId, teacherName);
        });

        this.socket.on('remote-mouse-move', (data) => {
            this.handleRemoteMouseMove(data);
        });

        this.socket.on('remote-mouse-click', (data) => {
            this.handleRemoteClick(data);
        });

        this.socket.on('remote-keyboard', (data) => {
            this.handleRemoteKeyboard(data);
        });

        this.socket.on('remote-control-stopped', () => {
            this.hideRemoteControlNotice();
        });

        this.socket.on('chat-message', ({ userId, userName, message, timestamp }) => {
            this.addChatMessage(userName, message, timestamp);
        });

        this.socket.on('kicked-from-classroom', ({ reason }) => {
            alert('You have been removed from the classroom: ' + reason);
            window.location.href = '/student/dashboard.html';
        });

        // UI event listeners
        document.getElementById('raiseHandBtn').addEventListener('click', () => this.raiseHand());
        document.getElementById('requestMicBtn').addEventListener('click', () => this.requestMicrophone());
        document.getElementById('requestCameraBtn').addEventListener('click', () => this.requestCamera());
        document.getElementById('requestScreenShareBtn').addEventListener('click', () => this.requestScreenShare());
        document.getElementById('leaveClassBtn').addEventListener('click', () => this.leaveClassroom());

        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });
    }

    showRemoteControlRequest(teacherId, teacherName) {
        const modal = document.getElementById('remoteControlRequestModal');
        document.getElementById('teacherName').textContent = teacherName;
        modal.classList.add('active');

        document.getElementById('approveRemoteControlBtn').onclick = () => {
            this.socket.emit('approve-remote-control', { teacherId });
            modal.classList.remove('active');
            this.showRemoteControlNotice();
        };

        document.getElementById('denyRemoteControlBtn').onclick = () => {
            this.socket.emit('reject-remote-control', { teacherId });
            modal.classList.remove('active');
        };
    }

    showRemoteControlNotice() {
        const notice = document.getElementById('remoteControlActiveNotice');
        notice.style.display = 'flex';

        document.getElementById('stopRemoteControlStudentBtn').onclick = () => {
            this.socket.emit('stop-remote-control', {});
            this.hideRemoteControlNotice();
        };
    }

    hideRemoteControlNotice() {
        document.getElementById('remoteControlActiveNotice').style.display = 'none';
        document.getElementById('remoteCursor').classList.remove('active');
    }

    handleRemoteMouseMove({ x, y }) {
        const cursor = document.getElementById('remoteCursor');
        // Scale normalized coordinates to window dimensions
        cursor.style.left = (x * window.innerWidth) + 'px';
        cursor.style.top = (y * window.innerHeight) + 'px';
        cursor.classList.add('active');
    }

    handleRemoteClick({ button, type }) {
        // Simulate click at current cursor position
        const cursor = document.getElementById('remoteCursor');
        const rect = cursor.getBoundingClientRect();
        const element = document.elementFromPoint(rect.left, rect.top);

        if (element) {
            element.click();
        }
    }

    handleRemoteKeyboard({ key, type }) {
        // Simulate keyboard input on focused element
        const focused = document.activeElement;
        if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
            if (type === 'keydown' && key.length === 1) {
                focused.value += key;
            }
        }
    }

    sendChat() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (!message) return;

        this.socket.emit('chat-message', { message });
        input.value = '';
    }

    addChatMessage(userName, message, timestamp) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';
        messageDiv.innerHTML = `
            <div class="chat-sender">${userName}</div>
            <div>${message}</div>
            <small style="opacity: 0.5;">${new Date(timestamp).toLocaleTimeString()}</small>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    updateConnectionStatus(status) {
        document.getElementById('connectionStatus').textContent = status;
    }

    updateUI() {
        // Additional UI updates can be added here
    }

    showError(message) {
        alert(message);
    }

    socketRequest(event, data) {
        return new Promise((resolve, reject) => {
            this.socket.emit(event, data, (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                } else {
                    resolve(response);
                }
            });
        });
    }
}

// Initialize on page load
let classroom;

window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const classroomId = urlParams.get('id');

    if (!classroomId) {
        alert('No classroom ID provided');
        window.location.href = '/student/dashboard.html';
        return;
    }

    try {
        const response = await fetch(`/api/classroom/${classroomId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to join classroom');
        }

        classroom = new StudentClassroom(classroomId, data.token);
        await classroom.init();

    } catch (error) {
        console.error('Failed to initialize:', error);
        alert('Failed to join classroom: ' + error.message);
        window.location.href = '/student/dashboard.html';
    }
});
