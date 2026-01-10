import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Request } from "express";

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const providedToken = req.header("x-internal-token");
    const expectedToken =
      this.configService.get<string>("INTERNAL_API_TOKEN") ?? "";

    if (!expectedToken) {
      throw new UnauthorizedException(
        "INTERNAL_API_TOKEN is not configured on the server",
      );
    }

    if (!providedToken || providedToken !== expectedToken) {
      throw new UnauthorizedException("Invalid internal token");
    }

    return true;
  }
}
