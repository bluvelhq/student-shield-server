import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminDto {
  @IsEmail()
  @IsString()
  email: string;

  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  firstName: string;

  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  lastName: string;
}
