import { Body, Controller, Delete, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { GoogleAuthGuard } from '../auth/guards/google-oauth.guard';
// import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
// import { CurrentUser } from 'src/common/decorators/current-user.decorator';
// import { DeleteMeDto } from '../auth/dto/delete/delete-me.dto';
// import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

}
