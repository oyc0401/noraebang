import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import {
  MobileAnonymousLoginDto,
  ProfileResponseDto,
} from "./dto";
import {
  ACCESS_TOKEN_EXPIRES_IN,
  MOBILE_CHALLENGE_TTL_SECONDS,
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
    const secretKey = this.configService.get<string>("DEVICE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("DEVICE_SECRET_KEY is not defined");
    }
    this.deviceSecretKey = createHash("sha256").update(secretKey).digest();
  }

  private readonly deviceSecretKey: Buffer;

  async anonymousLogin(): Promise<AuthTokens> {
    const user = await this.prisma.user.create({
      data: {},
    });

    return this.createSessionAndTokens(user.id, user.email ?? undefined);
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

    const isValid = await bcrypt.compare(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
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

      await this.consumeDeviceChallenge(existingUser.id, deviceId, nonce);

      const decryptedSecret = this.decryptDeviceSecret(existingUser.deviceSecret);
      const isValidSignature = this.verifyDeviceSignature(
        decryptedSecret,
        nonce,
        signature,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException("Invalid device signature");
      }

      const tokens = await this.createSessionAndTokens(
        existingUser.id,
        existingUser.email ?? undefined,
      );

      return { tokens };
    }

    const deviceSecret = this.generateDeviceSecret();
    const encryptedSecret = this.encryptDeviceSecret(deviceSecret);
    const newUser = await this.prisma.user.create({
      data: {
        deviceId,
        deviceSecret: encryptedSecret,
      },
    });

    const tokens = await this.createSessionAndTokens(
      newUser.id,
      newUser.email ?? undefined,
    );

    return { tokens, deviceSecret };
  }

  async requestMobileChallenge(deviceId: string): Promise<{
    nonce: string;
    expiresIn: number;
  }> {
    const normalizedId = deviceId?.trim();
    if (!normalizedId) {
      throw new BadRequestException("Device ID is required");
    }

    const user = await this.prisma.user.findUnique({
      where: { deviceId: normalizedId },
      select: { id: true, deviceSecret: true },
    });

    if (!user || !user.deviceSecret) {
      throw new UnauthorizedException("Device secret not registered");
    }

    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + MOBILE_CHALLENGE_TTL_SECONDS * 1000,
    );
    const nonceHash = this.hashNonce(nonce);

    await this.prisma.deviceChallenge.deleteMany({
      where: { deviceId: normalizedId },
    });

    await this.prisma.deviceChallenge.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        deviceId: normalizedId,
        nonceHash,
        expiresAt,
      },
    });

    return { nonce, expiresIn: MOBILE_CHALLENGE_TTL_SECONDS };
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
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async createSessionAndTokens(
    userId: number,
    email?: string,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const tokens = await this.generateTokens(userId, sessionId, email);
    await this.storeSession(sessionId, userId, tokens.refreshToken);
    return tokens;
  }

  private async rotateSessionTokens(
    sessionId: string,
    userId: number,
    email?: string,
  ): Promise<AuthTokens> {
    const tokens = await this.generateTokens(userId, sessionId, email);
    await this.storeSession(sessionId, userId, tokens.refreshToken);
    return tokens;
  }

  private async storeSession(
    sessionId: string,
    userId: number,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRES_IN * 1000);

    await this.prisma.$transaction([
      this.prisma.userSession.upsert({
        where: { id: sessionId },
        update: {
          refreshTokenHash: hashedRefreshToken,
          refreshTokenLastUsedAt: now,
          refreshTokenExpiresAt: expiresAt,
        },
        create: {
          id: sessionId,
          userId,
          refreshTokenHash: hashedRefreshToken,
          refreshTokenLastUsedAt: now,
          refreshTokenExpiresAt: expiresAt,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { lastLoginAt: now },
      }),
    ]);
  }

  private async consumeDeviceChallenge(
    userId: number,
    deviceId: string,
    nonce: string,
  ): Promise<void> {
    const nonceHash = this.hashNonce(nonce);
    const challenge = await this.prisma.deviceChallenge.findFirst({
      where: {
        deviceId,
        userId,
        nonceHash,
        usedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      throw new UnauthorizedException("Device challenge required");
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      await this.prisma.deviceChallenge
        .update({
          where: { id: challenge.id },
          data: { usedAt: new Date() },
        })
        .catch(() => undefined);
      throw new UnauthorizedException("Device challenge expired");
    }

    await this.prisma.deviceChallenge
      .update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
      })
      .catch(() => undefined);
  }

  private generateDeviceSecret(): string {
    return randomBytes(32).toString("hex");
  }

  private encryptDeviceSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.deviceSecretKey, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString("base64");
  }

  private decryptDeviceSecret(payload: string): string {
    const buffer = Buffer.from(payload, "base64");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", this.deviceSecretKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }

  private hashNonce(nonce: string): string {
    return createHash("sha256").update(nonce).digest("hex");
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
