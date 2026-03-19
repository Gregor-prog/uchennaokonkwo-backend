import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';

/**
 * All fields from CreatePostDto become optional.
 * Validation rules from CreatePostDto are still enforced if a field is present.
 */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
