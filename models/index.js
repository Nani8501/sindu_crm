// Define model relationships
const sequelize = require('../config/database');
const User = require('./User');
const Course = require('./Course');
const { Assignment, Submission } = require('./Assignment');
const Message = require('./Message');
const Session = require('./Session');
const Attendance = require('./Attendance');
const Classroom = require('./Classroom');
const ClassroomParticipant = require('./ClassroomParticipant');
const Quiz = require('./Quiz');
const QuizSubmission = require('./QuizSubmission');
const QuizAccess = require('./QuizAccess');

// Course - Professor relationship
Course.belongsTo(User, { as: 'professor', foreignKey: 'professorId' });
User.hasMany(Course, { as: 'taughtCourses', foreignKey: 'professorId' });

// Course - Student relationship (many-to-many)
const CourseEnrollment = sequelize.define('CourseEnrollment', {
    id: {
        type: require('sequelize').DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseId: {
        type: require('sequelize').DataTypes.INTEGER,
        allowNull: false,
        field: 'course_id'
    },
    studentId: {
        type: require('sequelize').DataTypes.STRING(30),
        allowNull: false,
        field: 'student_id'
    },
    status: {
        type: require('sequelize').DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        comment: 'Enrollment status - pending approval by admin'
    },
    approvedBy: {
        type: require('sequelize').DataTypes.STRING(30),
        allowNull: true,
        field: 'approved_by',
        comment: 'Admin who approved/rejected the enrollment'
    },
    approvalDate: {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true,
        field: 'approval_date'
    }
}, {
    tableName: 'course_enrollments',
    timestamps: true,
    underscored: true
});

Course.belongsToMany(User, {
    through: CourseEnrollment,
    as: 'students',
    foreignKey: 'courseId',
    otherKey: 'studentId'
});

User.belongsToMany(Course, {
    through: CourseEnrollment,
    as: 'enrolledCourses',
    foreignKey: 'studentId',
    otherKey: 'courseId'
});

// Explicit associations for CourseEnrollment to allow eager loading
CourseEnrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
CourseEnrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Assignment - Course relationship
Assignment.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
Course.hasMany(Assignment, { as: 'assignments', foreignKey: 'courseId' });

// Submission - Assignment relationship
Submission.belongsTo(Assignment, { as: 'assignment', foreignKey: 'assignmentId' });
Assignment.hasMany(Submission, { as: 'submissions', foreignKey: 'assignmentId' });

// Submission - User relationship
Submission.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
User.hasMany(Submission, { as: 'submissions', foreignKey: 'studentId' });

// Message - User relationships
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
Message.belongsTo(User, { as: 'receiver', foreignKey: 'receiverId' });

// Conversation Relationships
const Conversation = require('./Conversation');
const ConversationParticipant = require('./ConversationParticipant');

// Conversation - Message
Conversation.hasMany(Message, { as: 'messages', foreignKey: 'conversationId' });
Message.belongsTo(Conversation, { as: 'conversation', foreignKey: 'conversationId' });

// Conversation - User (Many-to-Many through Participants)
Conversation.belongsToMany(User, { through: ConversationParticipant, as: 'participants', foreignKey: 'conversationId' });
User.belongsToMany(Conversation, { through: ConversationParticipant, as: 'conversations', foreignKey: 'userId' });

// Explicit HasMany for direct access to join table
Conversation.hasMany(ConversationParticipant, { foreignKey: 'conversationId' });
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId' });
User.hasMany(ConversationParticipant, { foreignKey: 'userId' });
ConversationParticipant.belongsTo(User, { foreignKey: 'userId' });

// Explicit associations for ConversationParticipant to allow eager loading
ConversationParticipant.belongsTo(Conversation, { foreignKey: 'conversationId' });
ConversationParticipant.belongsTo(User, { foreignKey: 'userId' });

// Message - Reply relationship (self-referential)
Message.belongsTo(Message, { as: 'replyTo', foreignKey: 'replyToId' });
Message.hasMany(Message, { as: 'replies', foreignKey: 'replyToId' });

// Session - Course relationship
Session.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
Course.hasMany(Session, { as: 'sessions', foreignKey: 'courseId' });

// Session - Professor relationship
Session.belongsTo(User, { as: 'professor', foreignKey: 'professorId' });

// Attendance Relationships
Attendance.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
Attendance.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Attendance.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });
Attendance.belongsTo(User, { foreignKey: 'markedBy', as: 'marker' });
Attendance.belongsTo(Classroom, { foreignKey: 'classroomId', as: 'classroom' });

// Classroom Relationships
Classroom.belongsTo(User, { as: 'teacher', foreignKey: 'teacherId' });
Classroom.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
Classroom.hasMany(ClassroomParticipant, { as: 'participants', foreignKey: 'classroomId' });

// ClassroomParticipant Relationships
ClassroomParticipant.belongsTo(Classroom, { as: 'classroom', foreignKey: 'classroomId' });
ClassroomParticipant.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Quiz Relationships
Quiz.belongsTo(Course, { as: 'course', foreignKey: 'courseId' });
Course.hasMany(Quiz, { as: 'quizzes', foreignKey: 'courseId' });
Quiz.belongsTo(User, { as: 'professor', foreignKey: 'professorId' });

// QuizSubmission Relationships
QuizSubmission.belongsTo(Quiz, { as: 'quiz', foreignKey: 'quizId' });
Quiz.hasMany(QuizSubmission, { as: 'submissions', foreignKey: 'quizId' });
QuizSubmission.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
User.hasMany(QuizSubmission, { as: 'quizSubmissions', foreignKey: 'studentId' });

// QuizAccess Relationships
QuizAccess.belongsTo(Quiz, { as: 'quiz', foreignKey: 'quizId' });
Quiz.hasMany(QuizAccess, { as: 'accessTokens', foreignKey: 'quizId' });
QuizAccess.belongsTo(User, { as: 'student', foreignKey: 'studentId' });
User.hasMany(QuizAccess, { as: 'quizAccess', foreignKey: 'studentId' });

// UserActivity Relationships
const UserActivity = require('./UserActivity');
UserActivity.belongsTo(User, { as: 'user', foreignKey: 'userId' });
User.hasOne(UserActivity, { as: 'activity', foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Course,
    Assignment,
    Submission,
    Message,
    Session,
    CourseEnrollment,
    Conversation,
    ConversationParticipant,
    Attendance,
    Classroom,
    ClassroomParticipant,
    Quiz,
    QuizSubmission,
    QuizAccess,
    UserActivity
};
