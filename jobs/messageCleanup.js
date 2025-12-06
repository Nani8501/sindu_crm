const cron = require('node-cron');
const { Op } = require('sequelize');
const Message = require('../models/Message');

/**
 * Cleanup job to automatically delete messages older than 7 days
 * Runs daily at 2:00 AM
 */
class MessageCleanupJob {
    constructor() {
        this.RETENTION_DAYS = 7;
        this.isRunning = false;
    }

    /**
     * Calculate the cutoff date (7 days ago)
     */
    getCutoffDate() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
        return cutoffDate;
    }

    /**
     * Delete messages older than 7 days
     */
    async cleanupOldMessages() {
        if (this.isRunning) {
            console.log('[Message Cleanup] Cleanup already in progress, skipping...');
            return;
        }

        this.isRunning = true;
        const cutoffDate = this.getCutoffDate();

        try {
            console.log(`[Message Cleanup] Starting cleanup for messages older than ${cutoffDate.toISOString()}`);

            const result = await Message.destroy({
                where: {
                    createdAt: {
                        [Op.lt]: cutoffDate
                    }
                }
            });

            console.log(`[Message Cleanup] Successfully deleted ${result} message(s) older than 7 days`);
        } catch (error) {
            console.error('[Message Cleanup] Error during cleanup:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Start the scheduled cleanup job
     * Runs daily at 2:00 AM
     */
    start() {
        console.log('[Message Cleanup] Initializing message cleanup job (runs daily at 2:00 AM)');
        console.log(`[Message Cleanup] Messages older than ${this.RETENTION_DAYS} days will be automatically deleted`);

        // Schedule: Run every day at 2:00 AM
        // Cron format: second minute hour day month weekday
        // '0 2 * * *' = At 02:00 every day
        cron.schedule('0 2 * * *', async () => {
            console.log('[Message Cleanup] Scheduled cleanup triggered');
            await this.cleanupOldMessages();
        });

        // Optional: Run cleanup on startup (commented out by default)
        // Uncomment the next line if you want to run cleanup immediately when server starts
        // this.cleanupOldMessages();
    }

    /**
     * Manually trigger cleanup (for testing or manual execution)
     */
    async runNow() {
        console.log('[Message Cleanup] Manual cleanup triggered');
        await this.cleanupOldMessages();
    }
}

module.exports = new MessageCleanupJob();
