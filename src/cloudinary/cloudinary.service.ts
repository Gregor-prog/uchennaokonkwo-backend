import { Inject, Injectable } from '@nestjs/common';
import { UploadApiResponse, v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: typeof CloudinaryType,
  ) {}

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
