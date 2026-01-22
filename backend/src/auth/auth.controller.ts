import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import type { CookieOptions } from "express";
import { AuthService } from "./auth.service";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_EXPIRES_IN,
} from "./constants";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { CurrentUserData } from "./decorators/current-user.decorator";
import {
  AuthResponseDto,
  ProfileResponseDto,
  RefreshTokenDto,
} from "./dto";
import { JwtAuthGuard } from "./guards";
import { getCookieValue } from "./utils/cookies";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("anonymous")
  @ApiOperation({ summary: "익명 로그인", description: "새 익명 사용자 생성 및 토큰 발급" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async anonymousLogin(@Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const tokens = await this.authService.anonymousLogin();
    this.setAuthCookies(res, tokens);
    return tokens;
  }

  @Post("refresh")
  @ApiOperation({ summary: "토큰 갱신", description: "Refresh token으로 새 토큰 발급" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(
    @Body() dto: RefreshTokenDto | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken =
      dto?.refreshToken ?? getCookieValue(req, REFRESH_TOKEN_COOKIE);

    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(res, tokens);
    return tokens;
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
  async logout(
    @CurrentUser() user: CurrentUserData,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id);
    this.clearAuthCookies(res);
  }

  private readonly baseCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };

  private setAuthCookies(res: Response, tokens: AuthResponseDto): void {
    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      ...this.baseCookieOptions,
      maxAge: ACCESS_TOKEN_EXPIRES_IN * 1000,
    });
    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      ...this.baseCookieOptions,
      maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.baseCookieOptions);
    res.clearCookie(REFRESH_TOKEN_COOKIE, this.baseCookieOptions);
  }

}
