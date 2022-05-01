import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  // true를 리턴하면 request를 진행시키고 false면 request를 멈추게 한다.
  canActivate(context: ExecutionContext) {
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const user = gqlContext['user'];
    if (!user) {
      return false;
    } else {
      return true;
    }
  }
}
// authentication은 누가 자원을 요청하는지 확인하는 과정
// authorization 권한
