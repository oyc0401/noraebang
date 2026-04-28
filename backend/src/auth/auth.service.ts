import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MobileAnonymousLoginDto, ProfileResponseDto } from "./dto";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MOBILE_REFRESH_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "./constants";
import { JwtPayload } from "./strategies/jwt.strategy";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const refreshPepper = this.configService.get<string>(
      "REFRESH_TOKEN_PEPPER",
    );
    if (!refreshPepper) {
      throw new Error("REFRESH_TOKEN_PEPPER is not defined");
    }
    this.refreshTokenPepper = createHash("sha256")
      .update(refreshPepper)
      .digest();
  }

  private readonly refreshTokenPepper: Buffer;

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>("JWT_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Invalid token type");
    }

    if (!payload.sessionId) {
      throw new UnauthorizedException("Session identifier is missing");
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException("Session not found");
    }

    if (!session.user || !session.refreshTokenHash) {
      throw new UnauthorizedException("User not found or logged out");
    }

    if (
      !session.refreshTokenExpiresAt ||
      session.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const providedHash = this.hashRefreshToken(refreshToken);
    const storedHash = Buffer.from(session.refreshTokenHash, "hex");
    if (
      storedHash.length !== providedHash.length ||
      !timingSafeEqual(storedHash, providedHash)
    ) {
      await this.prisma.userSession
        .delete({ where: { id: session.id } })
        .catch(() => undefined);
      throw new UnauthorizedException("Invalid refresh token");
    }

    return this.rotateSessionTokens(
      session.id,
      session.userId,
      session.user.email ?? undefined,
    );
  }

  async anonymousMobileLogin(
    _dto: MobileAnonymousLoginDto,
  ): Promise<{ tokens: AuthTokens }> {
    const user = await this.prisma.user.create({
      data: {},
    });

    const tokens = await this.createSessionAndTokens(
      user.id,
      user.email ?? undefined,
      MOBILE_REFRESH_TOKEN_EXPIRES_IN,
    );

    return { tokens };
  }

  async getProfile(userId: number): Promise<ProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email ?? undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async logout(userId: number, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.prisma.userSession
        .delete({
          where: { id: sessionId },
        })
        .catch(() => undefined);
      return;
    }

    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  private async generateTokens(
    userId: number,
    sessionId: string,
    email?: string,
    refreshTtlSeconds = REFRESH_TOKEN_EXPIRES_IN,
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      type: "access",
      sessionId,
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      type: "refresh",
      sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: refreshTtlSeconds,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSessionAndTokens(
    userId: number,
    email?: string,
    refreshTtlSeconds = REFRESH_TOKEN_EXPIRES_IN,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const tokens = await this.generateTokens(
      userId,
      sessionId,
      email,
      refreshTtlSeconds,
    );
    await this.storeSession(
      sessionId,
      userId,
      tokens.refreshToken,
      refreshTtlSeconds,
    );
    return tokens;
  }

  private async rotateSessionTokens(
    sessionId: string,
    userId: number,
    email?: string,
    refreshTtlSeconds = REFRESH_TOKEN_EXPIRES_IN,
  ): Promise<AuthTokens> {
    const tokens = await this.generateTokens(
      userId,
      sessionId,
      email,
      refreshTtlSeconds,
    );
    await this.storeSession(
      sessionId,
      userId,
      tokens.refreshToken,
      refreshTtlSeconds,
    );
    return tokens;
  }

  private async storeSession(
    sessionId: string,
    userId: number,
    refreshToken: string,
    refreshTtlSeconds = REFRESH_TOKEN_EXPIRES_IN,
  ): Promise<void> {
    const hashedRefreshToken =
      this.hashRefreshToken(refreshToken).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + refreshTtlSeconds * 1000);

    await this.prisma.$transaction([
      this.prisma.userSession.upsert({
        where: { id: sessionId },
        update: {
          refreshTokenHash: hashedRefreshToken,
          refreshTokenExpiresAt: expiresAt,
        },
        create: {
          id: sessionId,
          userId,
          refreshTokenHash: hashedRefreshToken,
          refreshTokenExpiresAt: expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: now },
      }),
    ]);
  }

  private hashRefreshToken(token: string): Buffer {
    return createHmac("sha256", this.refreshTokenPepper).update(token).digest();
  }
}
