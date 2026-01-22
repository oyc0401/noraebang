import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  MobileAnonymousLoginDto,
  ProfileResponseDto,
} from "./dto";
import {
  ACCESS_TOKEN_EXPIRES_IN,
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
  ) {}

  async anonymousLogin(): Promise<AuthTokens> {
    const user = await this.prisma.user.create({
      data: {},
    });

    return this.generateAndStoreTokens(user.id, user.email ?? undefined);
  }

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

    return this.generateAndStoreTokens(user.id, user.email ?? undefined);
  }

  async anonymousMobileLogin(
    dto: MobileAnonymousLoginDto,
  ): Promise<{ tokens: AuthTokens; deviceSecret?: string }> {
    const deviceId = dto.deviceId?.trim();
    const nonce = dto.nonce?.trim();
    const signature = dto.signature?.trim();

    if (!deviceId) {
      throw new BadRequestException("Device ID is required");
    }

    if (!nonce) {
      throw new BadRequestException("Nonce is required");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { deviceId },
    });

    if (existingUser) {
      if (!existingUser.deviceSecret) {
        throw new UnauthorizedException("Device secret not registered");
      }

      if (!signature) {
        throw new UnauthorizedException("Signature is required");
      }

      const isValidSignature = this.verifyDeviceSignature(
        existingUser.deviceSecret,
        nonce,
        signature,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException("Invalid device signature");
      }

      const tokens = await this.generateAndStoreTokens(
        existingUser.id,
        existingUser.email ?? undefined,
      );

      return { tokens };
    }

    const deviceSecret = this.generateDeviceSecret();
    const newUser = await this.prisma.user.create({
      data: {
        deviceId,
        deviceSecret,
      },
    });

    const tokens = await this.generateAndStoreTokens(
      newUser.id,
      newUser.email ?? undefined,
    );

    return { tokens, deviceSecret };
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

  async logout(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  private async generateTokens(
    userId: number,
    email?: string,
  ): Promise<AuthTokens> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      type: "access",
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
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

  private async generateAndStoreTokens(
    userId: number,
    email?: string,
  ): Promise<AuthTokens> {
    const tokens = await this.generateTokens(userId, email);
    await this.storeRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  private async storeRefreshToken(
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: hashedRefreshToken,
        lastLoginAt: new Date(),
      },
    });
  }

  private generateDeviceSecret(): string {
    return randomBytes(32).toString("hex");
  }

  private verifyDeviceSignature(
    deviceSecret: string,
    nonce: string,
    signature: string,
  ): boolean {
    try {
      const expected = this.createDeviceSignature(deviceSecret, nonce);
      const provided = Buffer.from(signature, "hex");

      if (expected.length !== provided.length) {
        return false;
      }

      return timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }

  private createDeviceSignature(deviceSecret: string, nonce: string): Buffer {
    return createHmac("sha256", deviceSecret).update(nonce).digest();
  }
}
