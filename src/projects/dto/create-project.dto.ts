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

export class CreateProjectDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsEnum(ProjectStatus, {
    message: 'status must be PLANNED, ONGOING, COMPLETED, or SUSPENDED.',
  })
  status: ProjectStatus;

  @IsString()
  @MinLength(2, { message: 'Constituent name must be at least 2 characters.' })
  @MaxLength(100)
  constituentName: string;

  /** Decimal degrees, e.g. 6.4541 */
  @Type(() => Number)
  @IsLatitude({ message: 'latitude must be a valid decimal degree between -90 and 90.' })
  latitude: number;

  /** Decimal degrees, e.g. 7.5087 */
  @Type(() => Number)
  @IsLongitude({ message: 'longitude must be a valid decimal degree between -180 and 180.' })
  longitude: number;
}
