import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { CurrentUserData } from "./decorators/current-user.decorator";
import {
  AuthResponseDto,
  ProfileResponseDto,
  RefreshTokenDto,
} from "./dto";
import { JwtAuthGuard } from "./guards";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("anonymous")
  @ApiOperation({ summary: "익명 로그인", description: "새 익명 사용자 생성 및 토큰 발급" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async anonymousLogin(): Promise<AuthResponseDto> {
    return this.authService.anonymousLogin();
  }

  @Post("refresh")
  @ApiOperation({ summary: "토큰 갱신", description: "Refresh token으로 새 토큰 발급" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "프로필 조회", description: "현재 로그인한 사용자 정보 조회" })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  async getProfile(
    @CurrentUser() user: CurrentUserData,
  ): Promise<ProfileResponseDto> {
    return this.authService.getProfile(user.id);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "로그아웃", description: "Refresh token 무효화" })
  @ApiResponse({ status: 200 })
  async logout(@CurrentUser() user: CurrentUserData): Promise<void> {
    return this.authService.logout(user.id);
  }
}
