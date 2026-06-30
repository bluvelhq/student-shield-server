import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { DeviceType } from 'prisma/generated/prisma/enums';

export class DeviceDto {
  @ApiProperty({
    enum: DeviceType,
    example: DeviceType.MOBILE_PHONE,
    description: 'Type of the device',
  })
  @IsEnum(DeviceType)
  @IsNotEmpty()
  type: DeviceType;

  @ApiProperty({
    example: 'My iPhone',
    description: 'Name of the device',
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    example: 'iPhone 14 Pro',
    description: 'Model of the device',
  })
  @IsString()
  @IsOptional()
  model: string;

  @ApiProperty({
    example: 'Apple',
    description: 'Brand of the device',
  })
  @IsString()
  @IsOptional()
  brand: string;

  @ApiProperty({
    example: 'iOS',
    description: 'OS of the device',
  })
  @IsString()
  @IsOptional()
  os: string;

  @ApiProperty({
    example: 'iPhone 14 Pro',
    description: 'Serial code of the device',
  })
  @IsString()
  @IsOptional()
  serialCode: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customDeviceFieldsKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customDeviceFieldsValues?: string[];
}
