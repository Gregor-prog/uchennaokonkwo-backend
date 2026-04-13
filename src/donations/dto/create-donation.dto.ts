import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateDonationDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters.' })
  @MaxLength(100)
  name!: string;

  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsNumber({}, { message: 'Amount must be a number.' })
  @IsPositive({ message: 'Amount must be greater than zero.' })
  amount!: number;

  /**
   * Optional Cloudinary image URL. Set automatically if an image is uploaded.
   */
  @IsOptional()
  @IsUrl({}, { message: 'ImageUrl must be a valid URL.' })
  ImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  purpose?: string;
}
