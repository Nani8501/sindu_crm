/**
 * Frontend Unit Tests for Classroom UI Components
 * Uses JSDOM to simulate browser environment
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('Classroom Frontend UI', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Load the teacher HTML file
        const html = fs.readFileSync(
            path.join(__dirname, '../../public/classroom/teacher.html'),
            'utf8'
        );

        dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'http://localhost:3000/classroom/teacher.html?id=CL-TEST-001'
        });

        document = dom.window.document;
        window = dom.window;
    });

    afterEach(() => {
        dom.window.close();
    });

    describe('Teacher Interface - DOM Elements', () => {
        test('should have classroom header', () => {
            const header = document.querySelector('.classroom-header');
            expect(header).not.toBeNull();
        });

        test('should have classroom title element', () => {
            const title = document.getElementById('classroomTitle');
            expect(title).not.toBeNull();
        });

        test('should have participant count display', () => {
            const participantCount = document.getElementById('participantCount');
            expect(participantCount).not.toBeNull();
            expect(participantCount.textContent).toBe('0');
        });

        test('should have video grid container', () => {
            const videoGrid = document.getElementById('videoGrid');
            expect(videoGrid).not.toBeNull();
            expect(videoGrid.classList.contains('video-grid')).toBe(true);
        });

        test('should have sidebar with tabs', () => {
            const sidebar = document.querySelector('.classroom-sidebar');
            expect(sidebar).not.toBeNull();

            const tabs = document.querySelectorAll('.sidebar-tab');
            expect(tabs.length).toBeGreaterThan(0);
        });

        test('should have toolbar buttons', () => {
            const micBtn = document.getElementById('micBtn');
            const cameraBtn = document.getElementById('cameraBtn');
            const screenShareBtn = document.getElementById('screenShareBtn');
            const endClassBtn = document.getElementById('endClassBtn');

            expect(micBtn).not.toBeNull();
            expect(cameraBtn).not.toBeNull();
            expect(screenShareBtn).not.toBeNull();
            expect(endClassBtn).not.toBeNull();
        });

        test('should have screen share request modal', () => {
            const modal = document.getElementById('screenShareRequestModal');
            expect(modal).not.toBeNull();
            expect(modal.classList.contains('modal')).toBe(true);
        });

        test('should have remote control modal', () => {
            const modal = document.getElementById('remoteControlModal');
            expect(modal).not.toBeNull();
        });
    });

    describe('Teacher Interface - Tab Switching', () => {
        test('should switch tabs on click', () => {
            const tabs = document.querySelectorAll('.sidebar-tab');
            const chatTab = Array.from(tabs).find(tab => tab.dataset.tab === 'chat');

            // Simulate click
            chatTab.click();

            // Check if chat tab is active
            expect(chatTab.classList.contains('active')).toBe(true);

            // Check if chat content is visible
            const chatTabContent = document.getElementById('chatTab');
            expect(chatTabContent.style.display).not.toBe('none');
        });
    });

    describe('Teacher Interface - URL Parameters', () => {
        test('should extract classroom ID from URL', () => {
            const urlParams = new dom.window.URLSearchParams(dom.window.location.search);
            const classroomId = urlParams.get('id');

            expect(classroomId).toBe('CL-TEST-001');
        });
    });
});

describe('Student Frontend UI', () => {
    let dom;
    let document;
    let window;

    beforeEach(() => {
        // Load the student HTML file
        const html = fs.readFileSync(
            path.join(__dirname, '../../public/classroom/student.html'),
            'utf8'
        );

        dom = new JSDOM(html, {
            runScripts: 'dangerously',
            url: 'http://localhost:3000/classroom/student.html?id=CL-TEST-001'
        });

        document = dom.window.document;
        window = dom.window;
    });

    afterEach(() => {
        dom.window.close();
    });

    describe('Student Interface - DOM Elements', () => {
        test('should have classroom container', () => {
            const container = document.querySelector('.classroom-container');
            expect(container).not.toBeNull();
        });

        test('should have request buttons', () => {
            const raiseHandBtn = document.getElementById('raiseHandBtn');
            const requestMicBtn = document.getElementById('requestMicBtn');
            const requestCameraBtn = document.getElementById('requestCameraBtn');
            const requestScreenShareBtn = document.getElementById('requestScreenShareBtn');
            const leaveClassBtn = document.getElementById('leaveClassBtn');

            expect(raiseHandBtn).not.toBeNull();
            expect(requestMicBtn).not.toBeNull();
            expect(requestCameraBtn).not.toBeNull();
            expect(requestScreenShareBtn).not.toBeNull();
            expect(leaveClassBtn).not.toBeNull();
        });

        test('should have remote control request modal', () => {
            const modal = document.getElementById('remoteControlRequestModal');
            expect(modal).not.toBeNull();
        });

        test('should have remote control active notice', () => {
            const notice = document.getElementById('remoteControlActiveNotice');
            expect(notice).not.toBeNull();
        });

        test('should have remote cursor element', () => {
            const cursor = document.getElementById('remoteCursor');
            expect(cursor).not.toBeNull();
            expect(cursor.classList.contains('remote-cursor')).toBe(true);
        });

        test('should have chat interface', () => {
            const chatMessages = document.getElementById('chatMessages');
            const chatInput = document.getElementById('chatInput');
            const sendChatBtn = document.getElementById('sendChatBtn');

            expect(chatMessages).not.toBeNull();
            expect(chatInput).not.toBeNull();
            expect(sendChatBtn).not.toBeNull();
        });
    });
});

describe('Classroom CSS - Style Validation', () => {
    test('should load classroom CSS file', () => {
        const cssPath = path.join(__dirname, '../../public/css/classroom.css');
        expect(fs.existsSync(cssPath)).toBe(true);
    });

    test('classroom CSS should contain required classes', () => {
        const css = fs.readFileSync(
            path.join(__dirname, '../../public/css/classroom.css'),
            'utf8'
        );

        // Check for essential classes
        expect(css).toContain('.classroom-container');
        expect(css).toContain('.video-grid');
        expect(css).toContain('.video-card');
        expect(css).toContain('.classroom-sidebar');
        expect(css).toContain('.classroom-toolbar');
        expect(css).toContain('.modal');
        expect(css).toContain('.remote-cursor');
    });

    test('should have responsive media queries', () => {
        const css = fs.readFileSync(
            path.join(__dirname, '../../public/css/classroom.css'),
            'utf8'
        );

        expect(css).toContain('@media');
        expect(css).toContain('max-width');
    });
});
