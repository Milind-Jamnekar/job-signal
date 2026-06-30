import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSearchDto {
  @IsArray()
  @IsString({ each: true })
  keywords!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSalary?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFreshnessScore?: number;
}
