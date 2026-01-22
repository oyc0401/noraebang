import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../prisma/prisma.service";
import { AuthResponseDto, ProfileResponseDto } from "./dto";
import { JwtPayload } from "./strategies/jwt.strategy";

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60; // 15분
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7일

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async anonymousLogin(deviceId?: string): Promise<AuthResponseDto> {
    const finalDeviceId = deviceId || uuidv4();

    let user = await this.prisma.user.findUnique({
      where: { deviceId: finalDeviceId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { deviceId: finalDeviceId },
      });
    }

    const tokens = await this.generateTokens(user.id, finalDeviceId);

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceId: finalDeviceId,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthResponseDto> {
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException("User not found or logged out");
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const tokens = await this.generateTokens(
      user.id,
      user.deviceId ?? undefined,
      user.email ?? undefined,
    );

    const hashedRefreshToken = await bcrypt.hash(tokens.refreshToken, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      deviceId: user.deviceId ?? "",
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
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
      deviceId: user.deviceId ?? undefined,
      email: user.email ?? undefined,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async logout(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private async generateTokens(
    userId: number,
    deviceId?: string,
    email?: string,
  ) {
    const accessPayload: JwtPayload = {
      sub: userId,
      deviceId,
      email,
      type: "access",
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      deviceId,
      email,
      type: "refresh",
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
