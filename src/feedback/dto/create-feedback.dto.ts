import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';

export enum FeedbackType {
  SUGGESTION = 'SUGGESTION',
  COMPLIMENT = 'COMPLIMENT',
  CRITICISM  = 'CRITICISM',
}

export class CreateFeedbackDto {
  @IsEnum(FeedbackType, {
    message: 'type must be SUGGESTION, COMPLIMENT, or CRITICISM.',
  })
  type: FeedbackType;

  @IsString()
  @MinLength(5, { message: 'Message must be at least 5 characters.' })
  @MaxLength(2000)
  message: string;
}
