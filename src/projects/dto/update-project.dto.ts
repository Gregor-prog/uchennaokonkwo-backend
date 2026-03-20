import {
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectStatus } from '../../common/enums/project-status.enum';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ProjectStatus, {
    message: 'status must be PLANNED, ONGOING, COMPLETED, or SUSPENDED.',
  })
  status?: ProjectStatus;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  constituentName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be a valid decimal degree between -90 and 90.' })
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be a valid decimal degree between -180 and 180.' })
  longitude?: number;
}
