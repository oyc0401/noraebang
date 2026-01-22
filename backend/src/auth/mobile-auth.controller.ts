import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { ACCESS_TOKEN_EXPIRES_IN } from "./constants";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { CurrentUserData } from "./decorators/current-user.decorator";
import {
  MobileAnonymousLoginDto,
  MobileAuthResponseDto,
  MobileDeviceChallengeDto,
  MobileDeviceChallengeResponseDto,
  MobileLogoutResponseDto,
  ProfileResponseDto,
  RefreshTokenDto,
} from "./dto";
import { JwtAuthGuard } from "./guards";

@ApiTags("Auth (Mobile)")
@Controller("auth/mobile")
export class MobileAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("challenge")
  @ApiOperation({
    summary: "앱 기기 nonce 발급",
    description: "등록된 기기 ID에 대해 1회용 nonce를 발급합니다.",
  })
  @ApiResponse({ status: 200, type: MobileDeviceChallengeResponseDto })
  async requestChallenge(
    @Body() dto: MobileDeviceChallengeDto,
  ): Promise<MobileDeviceChallengeResponseDto> {
    return this.authService.requestMobileChallenge(dto.deviceId);
  }

  @Post("anonymous")
  @ApiOperation({
    summary: "앱 익명 로그인",
    description: "deviceId + 서명 기반으로 토큰 발급",
  })
  @ApiResponse({ status: 200, type: MobileAuthResponseDto })
  async anonymousLogin(
    @Body() dto: MobileAnonymousLoginDto,
  ): Promise<MobileAuthResponseDto> {
    const { tokens, deviceSecret } =
      await this.authService.anonymousMobileLogin(dto);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      deviceSecret,
    };
  }

  @Post("refresh")
  @ApiOperation({
    summary: "앱 토큰 갱신",
    description: "본문의 Refresh token으로 새 토큰 발급",
  })
  @ApiResponse({ status: 200, type: MobileAuthResponseDto })
  async refresh(
    @Body() dto: RefreshTokenDto | undefined,
  ): Promise<MobileAuthResponseDto> {
    const refreshToken = dto?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "앱 프로필 조회",
    description: "모바일 클라이언트에서 현재 사용자 정보 조회",
  })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getProfile(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProfileResponseDto> {
    return this.authService.getProfile(user.id);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "앱 로그아웃",
    description: "모바일 토큰 무효화",
  })
  @ApiResponse({ status: 200, type: MobileLogoutResponseDto })
  async logout(
    @CurrentUser() user: CurrentUserData,
  ): Promise<MobileLogoutResponseDto> {
    await this.authService.logout(user.id, user.sessionId);
    return { success: true };
  }
}
