import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from 'src/jwt/jwt.service';
import { User } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { AllowedRoles } from './role.guard';

@Injectable()
export class AuthGuard implements CanActivate {
  // true를 리턴하면 request를 진행시키고 false면 request를 멈추게 한다.
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<AllowedRoles>(
      'roles',
      context.getHandler(),
    );
    if (!roles) {
      return true;
    }
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const token = gqlContext.token;
    if (!token) {
      return false;
    }
    try {
      const decoded = this.jwtService.verify(token);
      if (typeof decoded !== 'object' || !decoded.hasOwnProperty('id')) {
        return false;
      }
      const { user, ok } = await this.usersService.findById(decoded['id']);
      if (!user) {
        return false;
      }
      gqlContext['user'] = user;
      return roles.includes('Any') || roles.includes(user.role);
    } catch {}
  }
}
// authentication은 누가 자원을 요청하는지 확인하는 과정
// authorization 권한
