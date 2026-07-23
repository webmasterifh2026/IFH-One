import packageJson from '../../package.json';

export const APP_NAME = 'IFH One';
export const APP_VERSION = packageJson.version;
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE || new Date().toISOString().split('T')[0];
export const GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT || 'main';
export const GIT_BRANCH = process.env.NEXT_PUBLIC_GIT_BRANCH || 'main';
export const ENVIRONMENT = process.env.NODE_ENV || 'production';
