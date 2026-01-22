import { ExecutionContext, createParamDecorator } from "@nestjs/common";

export interface CurrentUserData {
  id: number;
  email?: string;
  sessionId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
