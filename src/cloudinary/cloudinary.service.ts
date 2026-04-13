import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
  ) {}

  /**
   * Uploads an image file buffer to Cloudinary.
   * Returns the secure_url and public_id.
   */
  async uploadImage(
    file: Express.Multer.File,
  ): Promise<{ url: string; publicId: string }> {
    const result = await this.cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error || !result)
          throw error || new Error('Cloudinary upload failed');
        return result;
      },
    );
    // The above is not directly awaitable; use a Promise wrapper:
    return new Promise((resolve, reject) => {
      const upload = this.cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error || !result)
            return reject(error || new Error('Cloudinary upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      upload.end(file.buffer);
    });
  }

  /**
   * Deletes an asset from Cloudinary by its public_id.
   * Safe to call even if the asset no longer exists.
   */
  async delete(publicId: string): Promise<void> {
    await this.cloudinary.uploader.destroy(publicId);
  }

  /**
   * Deletes multiple assets in parallel.
   * Errors on individual items are swallowed to avoid blocking a bulk operation.
   */
  async deleteMany(publicIds: string[]): Promise<void> {
    await Promise.allSettled(publicIds.map((id) => this.delete(id)));
  }
}
