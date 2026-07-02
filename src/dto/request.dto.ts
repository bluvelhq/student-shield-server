import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { UrgencySla } from 'prisma/generated/prisma/enums';

export class RequestDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
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
