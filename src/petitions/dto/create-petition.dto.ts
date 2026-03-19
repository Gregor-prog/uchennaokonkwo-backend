import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreatePetitionDto {
  @IsString()
  @MinLength(3, { message: 'Topic must be at least 3 characters.' })
  @MaxLength(150)
  topic: string;

  @IsString()
  @MinLength(2, { message: 'Constituent name must be at least 2 characters.' })
  @MaxLength(100)
  constituentName: string;

  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters.' })
  @MaxLength(2000)
  message: string;
}
