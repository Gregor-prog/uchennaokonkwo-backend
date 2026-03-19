import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { PostStatus } from '../../common/enums/post-status.enum';

export class MultilingualContentItem {
  @IsString()
  language: string;

  @IsString()
  title: string;

  @IsString()
  content: string;
}

export class CreatePostDto {
  @IsString()
  @MinLength(3, { message: 'Title must be at least 3 characters.' })
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subcontent?: string;

  @IsString()
  @MinLength(10, { message: 'Content must be at least 10 characters.' })
  content: string;

  /**
   * Multilingual content arrives as a JSON string when sent via
   * multipart/form-data. @Transform parses it into an object array.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  multilingualContent?: MultilingualContentItem[];

  @IsOptional()
  @IsEnum(PostStatus, { message: 'status must be DRAFT, PUBLISHED, or ARCHIVED.' })
  status?: PostStatus;
}
