import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation';

// Example for importing in app module later
export const configModuleOptions = {
  isGlobal: true,
  validate: validateEnv,
  envFilePath: [
    '.env.local',
    `.env.${process.env.NODE_ENV || 'development'}`,
    '.env',
  ],
};
