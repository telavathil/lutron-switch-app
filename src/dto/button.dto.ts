import { IsString, IsNotEmpty, IsNumber, IsEnum, IsArray, ValidateNested, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum LEDLogicType {
  SCENE = 'scene',
  ROOM = 'room',
  LOCAL_LOAD = 'local-load',
}

export class LoadActionDto {
  @IsString()
  @IsNotEmpty()
  loadFullPath: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  commandLevel: number;

  @IsNumber()
  @Min(0)
  fadeTime: number;

  @IsNumber()
  @Min(0)
  delay: number;
}

export class ButtonLogicDto {
  @IsEnum(LEDLogicType)
  ledLogicType: LEDLogicType;

  @IsNumber()
  @IsOptional()
  sceneNumber?: number;

  // Single Action button actions
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  pressActions?: LoadActionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  releaseActions?: LoadActionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  doubleTapActions?: LoadActionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  holdActions?: LoadActionDto[];

  // Toggle button actions
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  onActions?: LoadActionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoadActionDto)
  @IsOptional()
  offActions?: LoadActionDto[];
}

export class UpdateButtonDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsOptional()
  alignment?: string;

  @IsString()
  @IsOptional()
  fontType?: string;

  @IsNumber()
  @IsOptional()
  fontSize?: number;

  @ValidateNested()
  @Type(() => ButtonLogicDto)
  logic: ButtonLogicDto;
}
