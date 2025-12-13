/**
 * Student Classroom Client (P2P Mesh)
 */

class StudentClassroom {
    constructor(classroomId, token) {
        this.classroomId = classroomId;
        this.token = token;
        this.socket = null;
        this.peers = new Map(); // userId -> RTCPeerConnection
        this.localStream = null;
        this.localScreenStream = null;
        this.participants = new Map();
        this.isConnected = false;

        // ICE Servers (STUN/TURN) - Using Google's public STUN for now
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    async init() {
        try {
            await this.connectSocket();
            await this.joinClassroom();
            this.setupEventListeners();
            this.setupUI();
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
                // Clean up peers
                this.peers.forEach(peer => peer.close());
                this.peers.clear();
            });
        });
    }

    async joinClassroom() {
        return new Promise((resolve, reject) => {
            this.socket.emit('join-classroom', { classroomId: this.classroomId }, async (response) => {
                if (response.error) {
                    reject(new Error(response.error));
                    return;
                }

                console.log('Joined classroom:', response);
                document.getElementById('classroomTitle').textContent = response.classroom.title;

                // Existing participants
                if (response.participants) {
                    for (const p of response.participants) {
                        this.addParticipantToList(p.userId, p.name, p.role);
                        // Initiate P2P connection to existing peers
                        await this.createPeerConnection(p.userId, true);
                    }
                }

                resolve(response);
            });
        });
    }

    async createPeerConnection(targetUserId, initiator = false) {
        if (this.peers.has(targetUserId)) return this.peers.get(targetUserId);

        console.log(`Creating PeerConnection to ${targetUserId} (Initiator: ${initiator})`);

        const peer = new RTCPeerConnection(this.iceServers);
        this.peers.set(targetUserId, peer);

        // Add local tracks if any
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localStream);
            });
        }
        if (this.localScreenStream) {
            this.localScreenStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localScreenStream);
            });
        }

        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('signal', {
                    to: this.participants.get(targetUserId)?.socketId, // We need socket ID
                    signal: { type: 'candidate', candidate: event.candidate }
                });
            }
        };

        // Handle incoming tracks
        peer.ontrack = (event) => {
            console.log(`Received track from ${targetUserId}:`, event.streams[0]);
            this.displayRemoteVideo(targetUserId, event.streams[0]);
        };

        // Create offer if initiator
        if (initiator) {
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                // We need to resolve socketId first. In a real app we'd map userId->socketId better.
                // For now, let's assume the server handles 'to: userId' mapping or we stored it.
                // My socket server expects 'to: socketId'.
                // Refactor: Let's store socketId in participants map.
                const targetSocketId = this.participants.get(targetUserId)?.socketId;
                if (targetSocketId) {
                    this.socket.emit('signal', {
                        to: targetSocketId,
                        signal: { type: 'offer', sdp: peer.localDescription }
                    });
                }
            } catch (err) {
                console.error('Error creating offer:', err);
            }
        }

        return peer;
    }

    async handleSignal(userId, signal) {
        if (!this.peers.has(userId)) {
            // Incoming offer from a user we haven't connected to yet
            // Add them to list if not exists (should be added by user-connected event usually)
            // But user-connected might come after signal? No, signal comes after.
            // If we don't have a peer, create one (not initiator)
            await this.createPeerConnection(userId, false);
        }

        const peer = this.peers.get(userId);

        if (signal.type === 'offer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            const targetSocketId = this.participants.get(userId)?.socketId;
            if (targetSocketId) {
                this.socket.emit('signal', {
                    to: targetSocketId,
                    signal: { type: 'answer', sdp: peer.localDescription }
                });
            }
        } else if (signal.type === 'answer') {
            await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate') {
            await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

    setupEventListeners() {
        // Socket events
        this.socket.on('user-connected', ({ userId, name, role, socketId }) => {
            console.log('User connected:', name);
            this.addParticipantToList(userId, name, role, socketId);
            // Wait for them to call us (if we follow strict initiator logic), or just create peer
            // In Mesh, usually the new joiner initiates to everyone. 
            // So existing users just wait.
            // But let's support bi-directional check.
        });

        this.socket.on('user-disconnected', ({ userId }) => {
            console.log('User disconnected:', userId);
            this.removeParticipant(userId);
        });

        this.socket.on('signal', ({ from, userId, signal }) => {
            // 'from' is socketId, 'userId' is user ID.
            // We might need to ensure participant exists?
            if (!this.participants.has(userId)) {
                // If checking participants, we might need to add them temporarily or fetch info?
                // For simplified P2P, user-connected should have fired.
            }
            this.handleSignal(userId, signal);
        });

        this.socket.on('chat-message', ({ userId, userName, message, timestamp }) => {
            this.addChatMessage(userName, message, timestamp);
        });

        // Chat UI
        document.getElementById('sendChatBtn').addEventListener('click', () => this.sendChat());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChat();
        });

        // Buttons
        document.getElementById('requestMicBtn').addEventListener('click', () => this.toggleMic());
        document.getElementById('requestCameraBtn').addEventListener('click', () => this.toggleCamera());
        document.getElementById('leaveClassBtn').addEventListener('click', () => this.leaveClassroom());
    }

    setupUI() {
        // Update button labels for self-control
        document.getElementById('requestMicBtn').innerHTML = '🎤 <span>Unmute Mic</span>';
        document.getElementById('requestCameraBtn').innerHTML = '📹 <span>Turn On Camera</span>';
    }

    async toggleMic() {
        if (!this.localStream) await this.startLocalStream();

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('requestMicBtn');
            btn.innerHTML = audioTrack.enabled ? '🎤 <span>Mute Mic</span>' : '🎤 <span>Unmute Mic</span>';
            btn.classList.toggle('active', audioTrack.enabled);
        }
    }

    async toggleCamera() {
        if (!this.localStream) await this.startLocalStream();

        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = document.getElementById('requestCameraBtn');
            btn.innerHTML = videoTrack.enabled ? '📹 <span>Turn Off Camera</span>' : '📹 <span>Turn On Camera</span>';
            btn.classList.toggle('active', videoTrack.enabled);
        }
    }

    async startLocalStream() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

            // Mute by default? Let's keep them unmuted but respecting initial toggle state if complex.
            // For now, let's just default to enabled=true (active).

            // Add tracks to all existing peers
            this.localStream.getTracks().forEach(track => {
                this.peers.forEach(peer => {
                    peer.addTrack(track, this.localStream);
                });
            });

            // Display local video
            this.displayLocalVideo(this.localStream);

            document.getElementById('requestMicBtn').innerHTML = '🎤 <span>Mute Mic</span>';
            document.getElementById('requestMicBtn').classList.add('active');
            document.getElementById('requestCameraBtn').innerHTML = '📹 <span>Turn Off Camera</span>';
            document.getElementById('requestCameraBtn').classList.add('active');

        } catch (err) {
            console.error('Error accessing media', err);
            alert('Could not access microphone/camera');
        }
    }

    displayLocalVideo(stream) {
        // Same as remote but 'self'
        this.displayRemoteVideo('self', stream);
    }

    displayRemoteVideo(userId, stream) {
        const videoGrid = document.getElementById('videoGrid');
        let videoCard = document.getElementById(`video-${userId}`);

        if (!videoCard) {
            videoCard = document.createElement('div');
            videoCard.id = `video-${userId}`;
            videoCard.className = 'video-card';

            const name = userId === 'self' ? 'You' : (this.participants.get(userId)?.name || 'Unknown');

            videoCard.innerHTML = `
                <video autoplay playsinline ${userId === 'self' ? 'muted' : ''}></video>
                <div class="video-overlay">
                    <span class="participant-name">${name}</span>
                </div>
            `;
            videoGrid.appendChild(videoCard);
        }

        const video = videoCard.querySelector('video');
        if (video.srcObject !== stream) {
            video.srcObject = stream;
        }
    }

    addParticipantToList(userId, name, role, socketId) {
        this.participants.set(userId, { userId, name, role, socketId });
        // ... (UI logic from before) ...
        const listDiv = document.getElementById('participantsList');
        if (!document.getElementById(`participant-${userId}`)) {
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
    }

    removeParticipant(userId) {
        if (this.peers.has(userId)) {
            this.peers.get(userId).close();
            this.peers.delete(userId);
        }
        this.participants.delete(userId);
        const videoCard = document.getElementById(`video-${userId}`);
        if (videoCard) videoCard.remove();
        const listItem = document.getElementById(`participant-${userId}`);
        if (listItem) listItem.remove();
    }

    // ... Copy Chat Logic from before ...
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

    leaveClassroom() {
        if (this.socket) this.socket.disconnect();
        window.location.href = '/student/dashboard.html';
    }

    showError(msg) { alert(msg); }
}

// Init logic
let classroom;
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const classroomId = urlParams.get('id');
    if (!classroomId) {
        window.location.href = '/student/dashboard.html';
        return;
    }

    // Fetch token first
    try {
        const response = await fetch(`/api/classroom/${classroomId}/join`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message);

        classroom = new StudentClassroom(classroomId, data.token);
        await classroom.init();
    } catch (e) {
        alert(e.message);
        window.location.href = '/student/dashboard.html';
    }
});
