import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { ACCESS_TOKEN_COOKIE } from "../constants";
import { getCookieValue } from "../utils/cookies";

export interface JwtPayload {
  sub: number;
  email?: string;
  type: "access" | "refresh";
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }
    super({
      jwtFromRequest: (req: Request) => {
        const cookieToken = getCookieValue(req, ACCESS_TOKEN_COOKIE);
        if (cookieToken) {
          return cookieToken;
        }
        return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
      },
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Access token required");
    }
    return {
      id: payload.sub,
      email: payload.email,
    };
  }
}
