const { sequelize, User } = require('./models');
const bcrypt = require('bcryptjs');

async function resetAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        const adminEmail = 'admin@sindhusoftwaretraining.in';
        const hashedPassword = await bcrypt.hash('admin123', 10);

        const [updated] = await User.update({ password: hashedPassword }, {
            where: { email: adminEmail }
        });

        if (updated) {
            console.log('Admin password reset successfully');
        } else {
            console.log('Admin user not found');
        }
    } catch (error) {
        console.error('Error resetting admin password:', error);
    } finally {
        await sequelize.close();
    }
}

resetAdmin();
