/**
 * Teacher Classroom Client
 * Handles WebRTC connections, media streams, and classroom controls
 */

class TeacherClassroom {
    constructor(classroomId, token) {
        this.classroomId = classroomId;
        this.token = token;
        this.socket = null;
        this.device = null;
        this.sendTransport = null;
        this.recvTransport = null;
        this.producers = new Map(); // type -> producer
        this.consumers = new Map(); // consumerId -> consumer
        this.participants = new Map(); // userId -> participant data
        this.isConnected = false;
    }

    async init() {
        try {
            this.updateUI(); // Start timer immediately

            await this.connectSocket();
            await this.joinClassroom();
            this.setupEventListeners();
            await this.initMediasoup();
            await this.startLocalMedia();
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

            // Timeout after 5 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    reject(new Error('Socket connection timed out'));
                }
            }, 5000);

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
                    if (p.userId !== this.socket.id) {
                        this.addParticipantToList(p.userId, p.name, p.role, p.producers);
                    }
                });

                resolve(response);
            });
        });
    }

    async initMediasoup() {
        // Get router capabilities
        const { rtpCapabilities } = await this.socketRequest('getRouterRtpCapabilities', {
            classroomId: this.classroomId
        });

        // Create device
        this.device = new mediasoupClient.Device();
        await this.device.load({ routerRtpCapabilities: rtpCapabilities });

        // Create transports
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

    async startLocalMedia() {
        try {
            // Start camera
            await this.startCamera();
            // Start microphone
            await this.startMicrophone();
        } catch (error) {
            console.error('Error starting media:', error);
            this.showError('Failed to access camera/microphone: ' + error.message);
        }
    }

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720 }
            });
            const track = stream.getVideoTracks()[0];

            const producer = await this.sendTransport.produce({
                track,
                encodings: [
                    { maxBitrate: 500000 },
                    { maxBitrate: 1000000 },
                    { maxBitrate: 2000000 }
                ]
            });

            this.producers.set('video', producer);
            this.displayLocalVideo(stream);

            const btn = document.getElementById('cameraBtn');
            btn.classList.add('active');
            btn.innerHTML = '📹 <span>Camera On</span>';
        } catch (error) {
            console.error('Camera error:', error);
            throw error;
        }
    }

    async startMicrophone() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const track = stream.getAudioTracks()[0];

            const producer = await this.sendTransport.produce({ track });
            this.producers.set('audio', producer);

            const btn = document.getElementById('micBtn');
            btn.classList.add('active');
            btn.innerHTML = '🎤 <span>Mic On</span>';
        } catch (error) {
            console.error('Microphone error:', error);
            throw error;
        }
    }

    async toggleCamera() {
        const producer = this.producers.get('video');
        const btn = document.getElementById('cameraBtn');
        const videoCard = document.getElementById('video-local');

        if (!producer) {
            try {
                await this.startCamera();
            } catch (error) {
                this.showError('Failed to start camera: ' + error.message);
            }
        } else {
            try {
                // For camera, we close the producer instead of pausing
                producer.close();
                this.producers.delete('video');
                await this.socketRequest('closeProducer', { producerId: producer.id, source: 'video' });

                // Update UI
                btn.classList.remove('active');
                btn.innerHTML = '📹 <span>Camera Off</span>';

                // Show placeholder
                if (videoCard) {
                    const video = videoCard.querySelector('video');
                    const placeholder = videoCard.querySelector('.video-placeholder');
                    if (video) video.style.display = 'none';
                    if (placeholder) placeholder.style.display = 'flex';
                }
            } catch (error) {
                console.error('Toggle camera error:', error);
                // Revert is hard here as we closed producer, but we can alert
                this.showError('Failed to turn off camera: ' + error.message);
            }
        }
    }

    async toggleMicrophone() {
        const producer = this.producers.get('audio');
        const btn = document.getElementById('micBtn');

        if (!producer) {
            try {
                await this.startMicrophone();
            } catch (error) {
                this.showError('Failed to start microphone: ' + error.message);
            }
        } else {
            try {
                if (producer.paused) {
                    producer.resume();
                    btn.classList.add('active');
                    btn.innerHTML = '🎤 <span>Mic On</span>';
                    await this.socketRequest('resumeProducer', { producerId: producer.id });
                } else {
                    producer.pause();
                    btn.classList.remove('active');
                    btn.innerHTML = '🎤 <span>Mic Off</span>';
                    await this.socketRequest('pauseProducer', { producerId: producer.id });
                }
            } catch (error) {
                console.error('Toggle mic error:', error);
                this.showError('Failed to toggle microphone: ' + error.message);
                // Revert UI on error
                if (producer.paused) {
                    btn.classList.remove('active');
                    btn.innerHTML = '🎤 <span>Mic Off</span>';
                } else {
                    btn.classList.add('active');
                    btn.innerHTML = '🎤 <span>Mic On</span>';
                }
            }
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

            // Update UI
            const btn = document.getElementById('screenShareBtn');
            btn.classList.add('active');
            btn.innerHTML = '🖥️ <span>Stop Sharing</span>';

            // Display local screen share
            this.displayLocalScreenShare(stream);

        } catch (error) {
            console.error('Screen share error:', error);
        }
    }

    async stopScreenShare() {
        const producer = this.producers.get('screen');
        if (producer) {
            try {
                await this.socketRequest('closeProducer', {
                    producerId: producer.id,
                    source: 'screen'
                });
                producer.close();
            } catch (e) {
                console.warn('Error closing screen producer:', e);
            }
            this.producers.delete('screen');
        }

        // Update UI
        const btn = document.getElementById('screenShareBtn');
        btn.classList.remove('active');
        btn.innerHTML = '🖥️ <span>Share Screen</span>';

        // Remove local screen share video
        const videoCard = document.getElementById('video-local-screen');
        if (videoCard) videoCard.remove();
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

    displayLocalVideo(stream) {
        const videoGrid = document.getElementById('videoGrid');
        let videoCard = document.getElementById('video-local');

        if (!videoCard) {
            videoCard = document.createElement('div');
            videoCard.id = 'video-local';
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <video autoplay playsinline muted></video>
                <div class="video-overlay">
                    <span class="participant-name">You (Teacher)</span>
                    <div class="video-icons"></div>
                </div>
                <div class="video-placeholder" style="display: none;">
                    <div class="avatar-placeholder">You</div>
                </div>
            `;
            videoGrid.prepend(videoCard);
        }

        const video = videoCard.querySelector('video');
        video.srcObject = stream;
        video.play().catch(e => console.error('Error playing local video:', e));
        video.style.display = 'block';
        videoCard.querySelector('.video-placeholder').style.display = 'none';
    }

    displayLocalScreenShare(stream) {
        const videoGrid = document.getElementById('videoGrid');
        let videoCard = document.getElementById('video-local-screen');

        if (!videoCard) {
            videoCard = document.createElement('div');
            videoCard.id = 'video-local-screen';
            videoCard.className = 'video-card screen-share';
            videoCard.innerHTML = `
                <video autoplay playsinline muted></video>
                <div class="video-overlay">
                    <span class="participant-name">You (Screen)</span>
                    <div class="video-icons">
                        <span class="video-icon screen-sharing">🖥️</span>
                    </div>
                </div>
            `;
            // Insert after local video
            const localVideo = document.getElementById('video-local');
            if (localVideo && localVideo.nextSibling) {
                videoGrid.insertBefore(videoCard, localVideo.nextSibling);
            } else {
                videoGrid.appendChild(videoCard);
            }
        }

        const video = videoCard.querySelector('video');
        video.srcObject = stream;
    }

    displayRemoteVideo(userId, stream, isScreen = false) {
        const videoGrid = document.getElementById('videoGrid');
        let videoCard = document.getElementById(`video-${userId}`);

        if (!videoCard) {
            videoCard = document.createElement('div');
            videoCard.id = `video-${userId}`;
            videoCard.className = `video-card ${isScreen ? 'screen-share' : ''}`;

            videoCard.innerHTML = `
                <video autoplay playsinline></video>
                <div class="video-overlay">
                    <span class="participant-name">${name}</span>
                    <div class="video-icons">
                        ${isScreen ? `
                            <button class="control-btn" onclick="classroom.requestRemoteControl('${userId}')" title="Request Remote Control">
                                <i class="ri-gamepad-line"></i>
                            </button>
                            <span class="video-icon screen-sharing">🖥️</span>
                        ` : ''}
                    </div>
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

    addParticipantToList(userId, name, role, producers = {}) {
        // Store participant data including producers
        const existing = this.participants.get(userId);
        this.participants.set(userId, {
            userId,
            name,
            role,
            producers: producers || (existing ? existing.producers : {})
        });

        const listDiv = document.getElementById('participantsList');
        const item = document.createElement('div');
        item.className = 'participant-item';
        item.id = `participant-${userId}`;

        // Determine initial icon states
        const hasAudio = producers && producers.audio;
        const hasVideo = producers && producers.video;

        item.innerHTML = `
            <div class="participant-info">
                <div class="participant-avatar">${name.charAt(0).toUpperCase()}</div>
                <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${name}
                        <div class="participant-status-icons">
                            <i class="ri-mic-${hasAudio ? 'line' : 'off-line'}" 
                               id="status-mic-${userId}" 
                               style="font-size: 14px; color: ${hasAudio ? '#10b981' : '#ef4444'};"></i>
                            <i class="ri-camera-${hasVideo ? 'line' : 'off-line'}" 
                               id="status-cam-${userId}" 
                               style="font-size: 14px; color: ${hasVideo ? '#10b981' : '#ef4444'};"></i>
                        </div>
                    </div>
                    <small style="opacity: 0.7;">${role}</small>
                </div>
            </div>
            ${role === 'student' ? `
                <div class="participant-controls">
                    <button onclick="classroom.muteStudent('${userId}')">Mute</button>
                    <button onclick="classroom.kickStudent('${userId}')" style="background: #ef4444;">Kick</button>
                </div>
            ` : ''}
        `;
        listDiv.appendChild(item);

        this.updateParticipantCount();
    }

    updateParticipantStatus(userId, kind, isActive) {
        const participant = this.participants.get(userId);
        if (!participant) return;

        // Update internal state
        if (!participant.producers) participant.producers = {};
        if (isActive) {
            // We might not have the ID here, but we know it exists/is active
            // For visual update, we just need to know it's active
        } else {
            // If closed/paused
        }

        // Update UI
        const iconId = kind === 'audio' ? `status-mic-${userId}` : `status-cam-${userId}`;
        const icon = document.getElementById(iconId);
        if (icon) {
            icon.className = kind === 'audio'
                ? `ri-mic-${isActive ? 'line' : 'off-line'}`
                : `ri-camera-${isActive ? 'line' : 'off-line'}`;
            icon.style.color = isActive ? '#10b981' : '#ef4444';
        }
    }

    removeParticipant(userId) {
        this.participants.delete(userId);

        const videoCard = document.getElementById(`video-${userId}`);
        if (videoCard) videoCard.remove();

        const participantItem = document.getElementById(`participant-${userId}`);
        if (participantItem) participantItem.remove();

        this.updateParticipantCount();
    }

    updateParticipantCount() {
        const count = Array.from(this.participants.values()).filter(p => p.role === 'student').length;
        document.getElementById('participantCount').textContent = count;
    }

    muteStudent(userId) {
        this.socket.emit('mute-user', { userId, kind: 'audio' });
    }

    kickStudent(userId) {
        if (confirm('Are you sure you want to remove this student?')) {
            this.socket.emit('kick-user', { userId });
        }
    }

    requestRemoteControl(studentId) {
        if (confirm('Request remote control of this student\'s screen?')) {
            this.socket.emit('request-remote-control', { studentId });
        }
    }

    startRemoteControl(studentId) {
        const student = this.participants.get(studentId);
        if (!student) return;

        const modal = document.getElementById('remoteControlModal');
        document.getElementById('controlledStudentName').textContent = student.name;
        modal.classList.add('active');

        // Setup input listeners
        const videoCard = document.getElementById(`video-${studentId}`);
        if (videoCard) {
            const video = videoCard.querySelector('video');

            // Mouse movement
            videoCard.onmousemove = (e) => {
                const rect = video.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                this.socket.emit('remote-mouse-move', { x, y });
            };

            // Clicks
            videoCard.onclick = (e) => {
                this.socket.emit('remote-mouse-click', { button: 'left' });
            };

            // Keyboard
            document.onkeydown = (e) => {
                if (modal.classList.contains('active')) {
                    this.socket.emit('remote-keyboard', { key: e.key });
                    e.preventDefault();
                }
            };
        }

        document.getElementById('stopRemoteControlBtn').onclick = () => {
            this.socket.emit('stop-remote-control');
            this.stopRemoteControlUI();
        };
    }

    stopRemoteControlUI() {
        const modal = document.getElementById('remoteControlModal');
        modal.classList.remove('active');

        // Remove listeners
        document.onkeydown = null;
        const videoCards = document.querySelectorAll('.video-card');
        videoCards.forEach(card => {
            card.onmousemove = null;
            card.onclick = null;
        });
    }

    async endClass() {
        if (!confirm('Are you sure you want to end this class?')) return;

        try {
            await fetch(`/api/classroom/${this.classroomId}/end`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });

            alert('Class ended successfully');
            window.location.href = '/professor/dashboard.html';
        } catch (error) {
            this.showError('Failed to end class: ' + error.message);
        }
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

            // Update status icon
            if (kind === 'audio' || kind === 'video') {
                this.updateParticipantStatus(userId, kind, true);

                // Update internal state
                const p = this.participants.get(userId);
                if (p) {
                    if (!p.producers) p.producers = {};
                    p.producers[kind] = producerId;
                }
            }
        });

        this.socket.on('producer-closed', ({ userId, kind, source }) => {
            if (kind === 'audio' || kind === 'video') {
                this.updateParticipantStatus(userId, kind, false);

                // Update internal state
                const p = this.participants.get(userId);
                if (p && p.producers) {
                    p.producers[kind] = null;
                }
            }
        });

        this.socket.on('producer-paused', ({ userId, producerId }) => {
            // Find kind based on producerId
            const p = this.participants.get(userId);
            if (p && p.producers) {
                if (p.producers.audio === producerId) this.updateParticipantStatus(userId, 'audio', false);
                if (p.producers.video === producerId) this.updateParticipantStatus(userId, 'video', false);
            }
        });

        this.socket.on('producer-resumed', ({ userId, producerId }) => {
            // Find kind based on producerId
            const p = this.participants.get(userId);
            if (p && p.producers) {
                if (p.producers.audio === producerId) this.updateParticipantStatus(userId, 'audio', true);
                if (p.producers.video === producerId) this.updateParticipantStatus(userId, 'video', true);
            }
        });

        this.socket.on('screen-share-request', ({ userId, userName }) => {
            this.showScreenShareApproval(userId, userName);
        });

        this.socket.on('chat-message', ({ userId, userName, message, timestamp }) => {
            this.addChatMessage(userName, message, timestamp);
        });

        this.socket.on('remote-control-approved', ({ studentId, studentName }) => {
            this.startRemoteControl(studentId);
        });

        this.socket.on('remote-control-rejected', ({ studentId }) => {
            alert('Remote control request rejected by student.');
        });

        this.socket.on('remote-control-stopped', () => {
            this.stopRemoteControlUI();
        });

        // UI event listeners
        document.getElementById('micBtn').addEventListener('click', () => this.toggleMicrophone());
        document.getElementById('cameraBtn').addEventListener('click', () => this.toggleCamera());
        document.getElementById('screenShareBtn').addEventListener('click', () => {
            if (this.producers.has('screen')) {
                this.stopScreenShare();
            } else {
                this.startScreenShare();
            }
        });
        document.getElementById('endClassBtn').addEventListener('click', () => this.endClass());

        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });

        // Sidebar Tabs
        document.querySelectorAll('.sidebar-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and content
                document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const tabId = tab.dataset.tab + 'Tab';
                const content = document.getElementById(tabId);
                if (content) {
                    content.style.display = 'block';
                    content.classList.add('active');
                }
            });
        });
    }

    showScreenShareApproval(userId, userName) {
        const modal = document.getElementById('screenShareRequestModal');
        document.getElementById('requesterName').textContent = userName;
        modal.classList.add('active');

        document.getElementById('approveScreenShareBtn').onclick = () => {
            this.socket.emit('approve-screen-share', { userId });
            modal.classList.remove('active');
        };

        document.getElementById('rejectScreenShareBtn').onclick = () => {
            this.socket.emit('reject-screen-share', { userId });
            modal.classList.remove('active');
        };
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
        // Update duration timer
        const startTime = Date.now();
        setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const el = document.getElementById('duration');
            if (el) {
                el.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
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
        window.location.href = '/professor/dashboard.html';
        return;
    }

    try {
        // Get token from API
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

        // Initialize classroom
        classroom = new TeacherClassroom(classroomId, data.token);
        await classroom.init();

    } catch (error) {
        console.error('Failed to initialize:', error);
        alert('Failed to join classroom: ' + error.message);
        window.location.href = '/professor/dashboard.html';
    }
});
