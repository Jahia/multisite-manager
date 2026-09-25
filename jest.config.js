module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src/javascript'],
    testMatch: ['**/*.spec.js', '**/*.spec.jsx'],
    // The module federation remotes are resolved by the app shell at runtime, not by jest
    moduleNameMapper: {
        '^@jahia/jcontent$': '<rootDir>/src/javascript/__mocks__/jcontent.js',
        '\.(scss|css)$': '<rootDir>/src/javascript/__mocks__/style.js'
    }
};
