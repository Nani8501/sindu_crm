module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    collectCoverageFrom: [
        'models/**/*.js',
        'routes/**/*.js',
        'services/**/*.js',
        'sockets/**/*.js',
        'middleware/**/*.js',
        '!**/node_modules/**'
    ],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 10000,
    verbose: true,
    transformIgnorePatterns: [
        "node_modules/(?!parse5|jsdom|@mediasoup)"
    ],
};
