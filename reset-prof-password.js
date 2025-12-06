const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function resetPassword() {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { email: 'prof@test.com' } });
        if (user) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            user.password = hashedPassword;
            await user.save();
            console.log('Password reset successfully for prof@test.com');
        } else {
            console.log('User not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetPassword();
