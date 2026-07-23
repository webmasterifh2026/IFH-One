import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import packageJson from '../../package.json';

@Controller()
export class VersionController {
  @Public()
  @Get('version')
  getVersion() {
    return {
      application: 'IFH One',
      version: packageJson.version,
      environment: process.env.NODE_ENV || 'development',
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
      commit:
        process.env.GIT_COMMIT_SHA ||
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        'main',
      branch:
        process.env.GIT_BRANCH || process.env.RAILWAY_GIT_BRANCH || 'main',
    };
  }
}
