import { IsInt, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'prisma/generated/prisma/enums';
import { Type } from 'class-transformer';

export class SubscriberDto {
  @IsString()
  @ApiProperty({
    description: 'The email of the subscriber',
    example: 'studentshield@st.ug.edu.gh',
  })
  email: string;

  @IsString()
  @ApiProperty({
    description: 'The first name of the subscriber',
    example: 'John',
  })
  firstName: string;

  @IsString()
  @ApiProperty({
    description: 'The last name of the subscriber',
    example: 'Doe',
  })
  lastName: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The student ID of the subscriber',
    example: '123456789',
  })
  studentId?: string;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @ApiProperty({
    description: 'The level of the subscriber',
    example: 100,
  })
  level?: number;

  @IsString()
  @ApiProperty({
    description: 'The phone number of the subscriber',
    example: '+233540000000',
  })
  phone: string;

  @IsString()
  @ApiProperty({
    description: 'The residence of the subscriber',
    example: 'Legon Hall',
  })
  residence: string;

  @IsEnum(Gender)
  @ApiProperty({
    description: 'The gender of the subscriber',
    enum: Gender,
    example: Gender.MALE,
  })
  gender: Gender;
}
