const { sequelize, User, Course, CourseEnrollment, Attendance, Session, Assignment, Submission } = require('./models');
const { generateId } = require('./utils/idGenerator');
const bcrypt = require('bcryptjs');

async function seedData() {
    try {
        console.log('Syncing database...');
        await sequelize.sync({ alter: true });

        console.log('Seeding data...');

        // 1. Create Users
        const students = [];
        for (let i = 1; i <= 5; i++) {
            const email = `student${i}@example.com`;
            let user = await User.findOne({ where: { email } });
            if (!user) {
                user = await User.create({
                    id: `202511${i.toString().padStart(2, '0')}S${Math.floor(Math.random() * 10000)}`,
                    name: `Student ${i}`,
                    email,
                    password: 'password123',
                    role: 'student',
                    phone: `123456789${i}`
                });
            }
            students.push(user);
        }

        const professorEmail = 'prof@example.com';
        let professor = await User.findOne({ where: { email: professorEmail } });
        if (!professor) {
            professor = await User.create({
                id: `20251101P${Math.floor(Math.random() * 10000)}`,
                name: 'Professor X',
                email: professorEmail,
                password: 'password123',
                role: 'professor'
            });
        }

        // 2. Create Courses
        const courses = [];
        const courseNames = ['React Mastery', 'Node.js Backend', 'Python for Data Science'];
        for (const name of courseNames) {
            let course = await Course.findOne({ where: { name } });
            if (!course) {
                course = await Course.create({
                    name,
                    description: `Learn ${name} from scratch`,
                    professorId: professor.id,
                    startDate: new Date(),
                    endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                    status: 'active'
                });
            }
            courses.push(course);
        }

        // 3. Create Enrollments (Pending & Approved)
        // Enroll Student 1 & 2 in Course 1 (Approved)
        await CourseEnrollment.findOrCreate({
            where: { courseId: courses[0].id, studentId: students[0].id },
            defaults: { status: 'approved', approvedBy: 'admin', approvalDate: new Date() }
        });
        await CourseEnrollment.findOrCreate({
            where: { courseId: courses[0].id, studentId: students[1].id },
            defaults: { status: 'approved', approvedBy: 'admin', approvalDate: new Date() }
        });

        // Enroll Student 3 in Course 1 (Pending)
        await CourseEnrollment.findOrCreate({
            where: { courseId: courses[0].id, studentId: students[2].id },
            defaults: { status: 'pending' }
        });

        // Enroll Student 4 in Course 2 (Pending)
        await CourseEnrollment.findOrCreate({
            where: { courseId: courses[1].id, studentId: students[3].id },
            defaults: { status: 'pending' }
        });

        // 4. Create Sessions
        const session = await Session.create({
            courseId: courses[0].id,
            professorId: professor.id,
            title: 'Introduction to React',
            description: 'Basics of components and props',
            scheduledAt: new Date(new Date().setDate(new Date().getDate() - 1)), // Yesterday
            duration: 90,
            status: 'completed'
        });

        // 5. Create Attendance
        // Student 1 Present
        await Attendance.create({
            id: `ATT${Math.floor(Math.random() * 10000)}`,
            studentId: students[0].id,
            courseId: courses[0].id,
            sessionId: session.id,
            date: session.scheduledAt,
            status: 'present',
            markedBy: professor.id
        });

        // Student 2 Absent
        await Attendance.create({
            id: `ATT${Math.floor(Math.random() * 10000)}`,
            studentId: students[1].id,
            courseId: courses[0].id,
            sessionId: session.id,
            date: session.scheduledAt,
            status: 'absent',
            markedBy: professor.id
        });

        // 6. Create Assignments & Submissions
        const assignment = await Assignment.create({
            courseId: courses[0].id,
            title: 'React Components',
            description: 'Build a simple card component',
            dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            totalPoints: 100
        });

        // Student 1 Submission (High Score)
        await Submission.create({
            assignmentId: assignment.id,
            studentId: students[0].id,
            content: 'Link to github repo...',
            submittedAt: new Date(),
            grade: 95,
            feedback: 'Excellent work!'
        });

        // Student 2 Submission (Average Score)
        await Submission.create({
            assignmentId: assignment.id,
            studentId: students[1].id,
            content: 'Link to github repo...',
            submittedAt: new Date(),
            grade: 75,
            feedback: 'Good effort, but needs improvement.'
        });

        console.log('Data seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
}

seedData();
