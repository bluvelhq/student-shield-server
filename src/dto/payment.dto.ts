import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class Payment {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reference: string;
}
