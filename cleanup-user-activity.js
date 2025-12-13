const cron = require('node-cron');
const { UserActivity, sequelize } = require('./models');
const { Op } = require('sequelize');

/**
 * Cleanup User Activity Table
 * 
 * For each user:
 * - Keep the most recent activity entry (last_seen_at)
 * - Delete all other entries that are older than 48 hours
 * 
 * This ensures:
 * - We always have the latest "last seen" timestamp for each user
 * - Old entries don't accumulate in the database
 */
async function cleanupUserActivity() {
    try {
        console.log('[Cleanup] Starting user_activity table cleanup...');

        // Calculate the cutoff time (48 hours ago)
        const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
        console.log(`[Cleanup] Cutoff time: ${cutoffTime.toISOString()}`);

        // Get all unique user IDs from user_activity
        const allActivities = await UserActivity.findAll({
            attributes: ['userId'],
            group: ['userId']
        });

        let totalDeleted = 0;

        // For each user, keep only the most recent entry and delete old ones
        for (const activity of allActivities) {
            const userId = activity.userId;

            // Find the most recent entry for this user
            const mostRecent = await UserActivity.findOne({
                where: { userId },
                order: [['lastSeenAt', 'DESC']],
                attributes: ['id', 'lastSeenAt']
            });

            if (!mostRecent) continue;

            // Delete all entries for this user that are:
            // 1. Older than 48 hours
            // 2. NOT the most recent entry
            const deleted = await UserActivity.destroy({
                where: {
                    userId: userId,
                    lastSeenAt: {
                        [Op.lt]: cutoffTime
                    },
                    id: {
                        [Op.ne]: mostRecent.id // Don't delete the most recent entry
                    }
                }
            });

            if (deleted > 0) {
                console.log(`[Cleanup] User ${userId}: Deleted ${deleted} old entries, kept most recent (${mostRecent.lastSeenAt.toISOString()})`);
                totalDeleted += deleted;
            }
        }

        console.log(`[Cleanup] Finished. Total entries deleted: ${totalDeleted}`);
    } catch (error) {
        console.error('[Cleanup] Error cleaning up user_activity:', error);
    }
}

/**
 * Schedule cleanup to run periodically
 * Runs every 6 hours to check for entries older than 48 hours
 */
function scheduleCleanup() {
    // Run every 6 hours (at 00:00, 06:00, 12:00, 18:00)
    cron.schedule('0 */6 * * *', async () => {
        console.log('[Cleanup] Running scheduled user_activity cleanup');
        await cleanupUserActivity();
    });

    console.log('[Cleanup] Scheduled to run every 6 hours');

    // Run immediately on startup
    setTimeout(() => {
        console.log('[Cleanup] Running initial cleanup on startup');
        cleanupUserActivity();
    }, 10000); // Wait 10 seconds after startup
}

module.exports = {
    cleanupUserActivity,
    scheduleCleanup
};

// If this script is run directly (not imported)
if (require.main === module) {
    console.log('Running user_activity cleanup manually...');
    cleanupUserActivity()
        .then(() => {
            console.log('Cleanup completed. Exiting...');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Cleanup failed:', error);
            process.exit(1);
        });
}
