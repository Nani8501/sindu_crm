// Utility function to generate custom user IDs
// Format: YYYYMMDD + Role Letter + Random5Digits + Sequence3Digits
// Example: 20251122P12345001 (Professor)

/**
 * Generate a custom user ID
 * @param {string} role - User role ('admin', 'professor', 'student')
 * @returns {string} Custom user ID
 */
function generateUserId(role) {
    // Get current date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    // Role letter
    const roleLetters = {
        'admin': 'A',
        'professor': 'P',
        'student': 'S'
    };
    const roleLetter = roleLetters[role.toLowerCase()] || 'U'; // U for Unknown

    // Generate random 5-digit number
    const randomPart = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');

    // Generate sequence based on timestamp (last 3 digits of milliseconds + random)
    const sequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

    // Combine all parts
    return `${datePart}${roleLetter}${randomPart}${sequence}`;
}

module.exports = { generateUserId };
