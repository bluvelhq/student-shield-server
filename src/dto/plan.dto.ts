import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PlanType } from 'prisma/generated/prisma/enums';

export class PlanDto {
  @IsNotEmpty()
  @IsEnum(PlanType)
  type: PlanType;

  @IsNumber()
  @IsNotEmpty()
  fee: number;

  @IsNumber()
  @IsNotEmpty()
  maxDevices: number;

  @IsString()
  @IsOptional()
  summary: string;

  @IsArray()
  @IsNotEmpty()
  @IsString({ each: true })
  benefits: string[];
}
