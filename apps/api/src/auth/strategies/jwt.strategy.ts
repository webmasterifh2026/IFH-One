import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('AUTH_SECRET') || 'fallback_secret',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    const user = await this.authService.validateUserById(
      payload.sub,
      token ?? undefined,
    );
    if (!user) throw new UnauthorizedException();
    return {
      sub: user.id,
      id: user.id,
      name: user.fullName,
      email: user.email,
      roles: user.userRoles.map(
        (ur: { role: { name: string } }) => ur.role.name,
      ),
      permissions: payload.permissions || [],
    };
  }
}
