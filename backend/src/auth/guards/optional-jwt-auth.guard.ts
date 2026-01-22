import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(
    _err: Error | undefined,
    user: TUser | false,
    _info: Error | undefined,
    _context: ExecutionContext,
    _status?: unknown,
  ): TUser | undefined {
    return user || undefined;
  }
}
