import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { AppLogger } from '../common/logger/logger.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private logger: AppLogger,
    private configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`Login success for email: ${loginDto.email}`);
      return result;
    } catch (error) {
      this.logger.error(`Login failure for email: ${loginDto.email}`);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.sub || req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await this.authService.logout(req.user.sub, token);
    }
    this.logger.log(`Logout success for user: ${req.user.email}`);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Req() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return { success: false };
    return this.authService.heartbeat(req.user.sub, token);
  }

  /**
   * Emergency unlock: POST /api/auth/unlock
   * Body: { email: string, secret: string }
   * Uses AUTH_SECRET as the unlock passphrase — no JWT required.
   * Resets failedLoginAttempts to 0 and sets status to ACTIVE.
   */
  @Public()
  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  async unlockAccount(
    @Body() body: { email: string; secret: string; newPassword?: string },
  ) {
    const expected = this.configService.get<string>('AUTH_SECRET');
    if (!body.secret || body.secret !== expected) {
      throw new UnauthorizedException('Invalid unlock secret');
    }
    return this.authService.unlockAccount(body.email, body.newPassword);
  }
}
