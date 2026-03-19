import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CLOUDINARY = 'CLOUDINARY';

/**
 * Configures the Cloudinary SDK once at startup using env vars and exposes
 * the configured `v2` instance as an injectable token.
 */
export const CloudinaryProvider = {
  provide: CLOUDINARY,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    cloudinary.config({
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
    return cloudinary;
  },
};
