import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register/register.dto";

type JwtPayload = {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) { }

  async register(dto: RegisterDto) {
    const user = await this.usersService.createUser(dto.email, dto.password);
    const payload: JwtPayload = { sub: user.id, email: user.email, roles: user.roles };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user,
    };
  }

  async login(user: { id: string; email: string; roles: string[] }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}