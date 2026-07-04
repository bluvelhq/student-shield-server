import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';
import { PlanType } from 'prisma/generated/prisma/enums';
import { Type } from 'class-transformer';

export class PlanDto {
  @IsNotEmpty()
  @IsEnum(PlanType)
  type: PlanType;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  fee: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  maxDevices: number;

  @IsString()
  @IsOptional()
  summary: string;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  benefits: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
