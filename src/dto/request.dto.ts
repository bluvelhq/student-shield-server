import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { UrgencySla } from 'prisma/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';

export class RequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The type of the request',
    example: 'Business',
  })
  type: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The title of the request',
    example: 'New Business',
  })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(UrgencySla)
  @IsNotEmpty()
  urgency: UrgencySla;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsString()
  @IsOptional()
  desiredSubdomain?: string;

  @IsString()
  @IsOptional()
  websiteConceptDescription?: string;

  @IsNumber()
  @IsOptional()
  websitePageCount?: number;

  @IsBoolean()
  @IsOptional()
  preferHosting?: boolean;

  @IsString()
  @IsOptional()
  receipt?: string;
}
