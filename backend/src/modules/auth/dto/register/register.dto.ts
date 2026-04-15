import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Некорректный формат email' })
  @IsNotEmpty()
  email!: string; 

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Пароль должен быть не менее 6 символов' })
  @MaxLength(72, { message: 'Пароль слишком длинный (bcrypt limit)' })
  password!: string; 
}