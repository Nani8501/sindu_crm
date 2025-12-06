const { User, Course, Assignment, Message, Conversation } = require('../models');
const { Op } = require('sequelize');
const { STUDY_BUDDY_SYSTEM_PROMPT } = require('../config/study-buddy');

class AIService {
    constructor() {
        this.aiUserId = 'ai-assistant';
    }

    async processMessage(messageId, userId, content, isExternal = false, conversationId = null) {
        try {
            console.log(`AI processing message: ${content} from user: ${userId} (External: ${isExternal}, Conv: ${conversationId})`);

            // Simulate thinking delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            let responseContent = "I'm not sure how to help with that yet.";
            const lowerContent = content.toLowerCase();

            if (isExternal) { // Only use external AI if toggle is ON
                try {
                    console.log('Using external AI services with image support');

                    // Enhanced prompt for student-friendly responses
                    const studyBuddyPrompt = `You are an expert Study Buddy AI designed specifically for students. Your goal is to make complex topics easy to understand.

IMPORTANT RULES:
- Use simple, clear language that students can understand
- Break down complex concepts into steps
- Use analogies and real-world examples
- Add emojis to make it engaging (📚 🎓 💡 ✨)
- Be encouraging and supportive
- Keep responses concise but complete

Student's Question: ${content}

Provide a helpful, student-friendly response:`;

                    let aiResponse = null;
                    let imageUrl = null;

                    // Detect if student wants an image
                    const wantsImage = lowerContent.includes('image') ||
                        lowerContent.includes('picture') ||
                        lowerContent.includes('diagram') ||
                        lowerContent.includes('show me') ||
                        lowerContent.includes('visualize') ||
                        lowerContent.includes('draw');

                    // PRIORITY 1: Pollinations.ai - Best for students (with image generation)
                    try {
                        const pollinationsUrl = `https://text.pollinations.ai/${encodeURIComponent(studyBuddyPrompt)}`;
                        const response1 = await fetch(pollinationsUrl);

                        if (response1.ok) {
                            const text = await response1.text();
                            if (text && text.length > 20) {
                                aiResponse = text;
                                console.log('✓ Pollinations.ai (Priority 1) succeeded');

                                // Generate image if requested
                                if (wantsImage) {
                                    const imagePrompt = `Educational diagram: ${content}`;
                                    imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}`;
                                    aiResponse += `\n\n📸 **Visual Explanation:**\n![Generated Image](${imageUrl})`;
                                }
                            }
                        }
                    } catch (err) {
                        console.log('Pollinations.ai failed, trying backup...');
                    }

                    // PRIORITY 2: Google Gemini Flash (Free & Good)
                    if (!aiResponse) {
                        try {
                            // Using public Gemini endpoint if available
                            const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

                            // Note: This requires API key, skipping for now
                            console.log('Gemini requires API key, skipping...');
                        } catch (err) {
                            console.log('Gemini not available');
                        }
                    }

                    // PRIORITY 3: Hugging Face with better model
                    if (!aiResponse) {
                        try {
                            const hfUrl = 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill';
                            const response2 = await fetch(hfUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    inputs: studyBuddyPrompt,
                                    parameters: {
                                        max_length: 300,
                                        temperature: 0.8,
                                        top_p: 0.9
                                    }
                                })
                            });

                            if (response2.ok) {
                                const data = await response2.json();
                                if (data && data[0] && data[0].generated_text) {
                                    aiResponse = data[0].generated_text;
                                    console.log('✓ Hugging Face (Priority 3) succeeded');
                                }
                            }
                        } catch (err) {
                            console.log('Hugging Face failed, trying final backup...');
                        }
                    }

                    // PRIORITY 4: Groq (Fast & Free)
                    if (!aiResponse) {
                        try {
                            // Groq is fast but requires API key, skipping
                            console.log('Groq requires API key, skipping...');
                        } catch (err) {
                            console.log('Groq not available');
                        }
                    }

                    if (aiResponse && aiResponse.length > 10) {
                        responseContent = aiResponse;
                    } else {
                        responseContent = `🤔 I'm having trouble accessing external AI services right now. 

💡 **Quick tip**: Try toggling to 'Internal Data' for CRM-specific questions!

Or ask me things like:
• "How many students?"
• "Show me courses"
• "Help" to see what I can do`;
                    }

                } catch (err) {
                    console.error('External AI error:', err);
                    responseContent = "⚠️ External AI is temporarily unavailable. Try toggling to 'Internal Data' for CRM-specific questions!";
                }
            } else {
                // Internal Data Mode (CRM) - Enhanced Knowledge Base
                console.log('Using internal knowledge base');

                // Greetings
                if (lowerContent.includes('hello') || lowerContent.includes('hi') || lowerContent.includes('hey')) {
                    responseContent = "Hello! 👋 I'm your CRM Assistant. I can help you with:\n\n📊 **Statistics**: Ask about student/professor/course counts\n🔍 **Navigation**: Help you find different sections\n📚 **Information**: Get details about the CRM system\n\nWhat would you like to know?";
                }
                // Student queries
                else if (lowerContent.includes('student')) {
                    if (lowerContent.includes('how many') || lowerContent.includes('count') || lowerContent.includes('number')) {
                        const count = await User.count({ where: { role: 'student' } });
                        responseContent = `📚 There are currently **${count} students** enrolled in the system.`;
                    } else if (lowerContent.includes('list') || lowerContent.includes('show')) {
                        const students = await User.findAll({
                            where: { role: 'student' },
                            limit: 5,
                            attributes: ['id', 'name', 'email']
                        });
                        if (students.length > 0) {
                            const list = students.map(s => `• ${s.name} (${s.email})`).join('\n');
                            responseContent = `Here are some recent students:\n\n${list}\n\n(Showing 5 of ${await User.count({ where: { role: 'student' } })})`;
                        } else {
                            responseContent = "No students found in the system.";
                        }
                    } else {
                        responseContent = "I can tell you about student counts, list students, or provide other student-related information. What would you like to know?";
                    }
                }
                // Professor queries
                else if (lowerContent.includes('professor') || lowerContent.includes('teacher') || lowerContent.includes('instructor')) {
                    if (lowerContent.includes('how many') || lowerContent.includes('count') || lowerContent.includes('number')) {
                        const count = await User.count({ where: { role: 'professor' } });
                        responseContent = `👨‍🏫 There are currently **${count} professors** in the system.`;
                    } else {
                        responseContent = "I can tell you about professor counts and other professor-related information.";
                    }
                }
                // Course queries
                else if (lowerContent.includes('course')) {
                    if (lowerContent.includes('how many') || lowerContent.includes('count') || lowerContent.includes('number')) {
                        const count = await Course.count();
                        responseContent = `📖 There are currently **${count} courses** available in the system.`;
                    } else if (lowerContent.includes('list') || lowerContent.includes('show')) {
                        const courses = await Course.findAll({
                            limit: 5,
                            attributes: ['id', 'title', 'code']
                        });
                        if (courses.length > 0) {
                            const list = courses.map(c => `• ${c.title} (${c.code})`).join('\n');
                            responseContent = `Here are some courses:\n\n${list}\n\n(Showing 5 of ${await Course.count()})`;
                        } else {
                            responseContent = "No courses found in the system.";
                        }
                    } else {
                        responseContent = "I can tell you about course counts, list courses, or provide other course-related information.";
                    }
                }
                // Assignment queries
                else if (lowerContent.includes('assignment')) {
                    const count = await Assignment.count();
                    responseContent = `📝 There are currently **${count} assignments** in the system.`;
                }
                // Help queries
                else if (lowerContent.includes('help') || lowerContent.includes('what can you do') || lowerContent.includes('capabilities')) {
                    responseContent = `🤖 **I'm your CRM Assistant!** Here's what I can help with:\n\n**📊 Statistics:**\n• "How many students?"\n• "Show me course count"\n• "Number of professors"\n\n**📋 Lists:**\n• "List students"\n• "Show courses"\n\n**🔍 Navigation:**\n• "Go to dashboard"\n• "Navigate to courses"\n\n**💡 Tips:**\n• You can toggle to "External AI" for general knowledge questions\n• I'm always learning to help you better!`;
                }
                // Navigation queries
                else if (lowerContent.includes('go to') || lowerContent.includes('navigate') || lowerContent.includes('take me to')) {
                    if (lowerContent.includes('dashboard')) return this.sendResponse(userId, "📍 Navigating to Dashboard...", { action: 'navigate', target: 'overview' }, conversationId);
                    if (lowerContent.includes('user')) return this.sendResponse(userId, "📍 Navigating to User Management...", { action: 'navigate', target: 'users' }, conversationId);
                    if (lowerContent.includes('course')) return this.sendResponse(userId, "📍 Navigating to Course Management...", { action: 'navigate', target: 'courses' }, conversationId);
                    if (lowerContent.includes('assignment')) return this.sendResponse(userId, "📍 Navigating to Assignments...", { action: 'navigate', target: 'assignments' }, conversationId);
                    if (lowerContent.includes('message')) return this.sendResponse(userId, "📍 Navigating to Messages...", { action: 'navigate', target: 'messages' }, conversationId);

                    responseContent = "🧭 I can take you to:\n• Dashboard\n• Users\n• Courses\n• Assignments\n• Messages\n\nWhere would you like to go?";
                }
                // Thank you
                else if (lowerContent.includes('thank') || lowerContent.includes('thanks')) {
                    responseContent = "You're welcome! 😊 Let me know if you need anything else!";
                }
                // Goodbye
                else if (lowerContent.includes('bye') || lowerContent.includes('goodbye') || lowerContent.includes('see you')) {
                    responseContent = "Goodbye! 👋 Feel free to come back anytime you need help!";
                }
                // Compliments / Positive feedback
                else if (lowerContent === 'great' || lowerContent.includes('great job') || lowerContent === 'good' || lowerContent.includes('good job') || lowerContent.includes('awesome') || lowerContent.includes('cool')) {
                    responseContent = "Glad you think so! 😊 Is there anything specific you'd like to check in the CRM right now?";
                }
                // Acknowledgements/Short inputs
                else if (lowerContent === 'ok' || lowerContent === 'okay' || lowerContent === 'sure' || lowerContent === 'alright') {
                    responseContent = "Alright! Just say the word if you need to find students, courses, or stats.";
                }
                // Default fallback with suggestions
                else {
                    // Don't quote long text or very short confusing text
                    const quote = content.length < 50 ? `**"${content}"**` : "that";
                    responseContent = `I understand you're asking about: ${quote}\n\n💡 I can help with:\n• System statistics (students, courses, professors)\n• Navigation around the CRM\n• General information\n\nTry asking "help" to see what I can do, or toggle to **External AI** for broader questions!`;
                }
            }

            await this.sendResponse(userId, responseContent, null, conversationId);

        } catch (error) {
            console.error('AI Service Error:', error);
        }
    }

    async sendResponse(receiverId, content, metadata = null, conversationId = null) {
        try {
            let targetConversationId = conversationId;

            // Fallback if no conversationId provided (legacy support)
            if (!targetConversationId) {
                const { ConversationParticipant } = require('../models');
                // Use a simpler heuristic or just fail for now as we expect ID
                // For safety, let's try to find the direct conversation again
                const conversations = await ConversationParticipant.findAll({
                    where: { userId: receiverId },
                    attributes: ['conversationId']
                });
                const convIds = conversations.map(c => c.conversationId);
                const aiParticipant = await ConversationParticipant.findOne({
                    where: {
                        userId: this.aiUserId,
                        conversationId: { [Op.in]: convIds }
                    }
                });
                if (aiParticipant) targetConversationId = aiParticipant.conversationId;
            }

            if (!targetConversationId) {
                console.error('Could not determine conversation ID for AI response');
                return;
            }

            await Message.create({
                senderId: this.aiUserId,
                conversationId: targetConversationId,
                content: content,
            });

            // Update conversation timestamp
            await Conversation.update(
                { lastMessageAt: new Date() },
                { where: { id: targetConversationId } }
            );

        } catch (error) {
            console.error('Error sending AI response:', error);
        }
    }

    async generateQuiz(topic, count = 5) {
        try {
            const prompt = `
            You are an API that outputs ONLY valid JSON.
            Generate a JSON array of ${count} multiple-choice questions (MCQs) on the topic: "${topic}".
            
            The output must be a valid JSON array. No markdown, no code blocks, no explanations.
            
            Structure:
            [
                {
                    "id": 1,
                    "question": "Question text",
                    "options": ["A", "B", "C", "D"],
                    "correct": 0
                }
            ]
            `;

            const aiUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
            const response = await fetch(aiUrl);

            if (!response.ok) {
                console.error('AI Service HTTP Error:', response.status, response.statusText);
                throw new Error('Failed to fetch from AI service');
            }

            const text = await response.text();

            // Clean up response if it contains markdown code blocks
            let jsonStr = text.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
            } else if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
            }

            try {
                const questions = JSON.parse(jsonStr);
                return questions;
            } catch (parseError) {
                console.error('Failed to parse AI response as JSON:', text);
                throw new Error('AI returned invalid JSON format');
            }

        } catch (error) {
            console.error('Generate Quiz Error:', error);
            throw error;
        }
    }
}

module.exports = new AIService();
