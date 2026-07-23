const packageJson = require('./package.json');

const APP_NAME = 'IFH One';
const APP_VERSION = packageJson.version || '3.0.2';
const APP_DESCRIPTION = 'Enterprise Procurement Management System';

function getBuildInfo() {
  return {
    name: APP_NAME,
    version: APP_VERSION,
    description: APP_DESCRIPTION,
    environment: process.env.NODE_ENV || 'development',
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    commit: process.env.GIT_COMMIT_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'main',
    branch: process.env.GIT_BRANCH || process.env.RAILWAY_GIT_BRANCH || 'main',
  };
}

module.exports = {
  APP_NAME,
  APP_VERSION,
  APP_DESCRIPTION,
  getBuildInfo,
};
