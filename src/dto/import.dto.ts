import { IsString, IsNotEmpty } from 'class-validator';

export class ImportProjectDto {
  @IsString()
  @IsNotEmpty()
  projectName: string;
}
