import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

/** Maximum individual file size: 5 MB. */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum images that can be uploaded in a single request. */
export const MAX_FILES_PER_REQUEST = 10;

/** Allowed MIME types. */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * Cloudinary storage for post images.
 *
 * Uploaded files land in the "posts" folder on Cloudinary.
 * Auto-quality and format optimisation is applied via a named transform.
 *
 * After a successful upload multer attaches to the file object:
 *   file.path      → Cloudinary secure_url  (stored as Media.url)
 *   file.filename  → Cloudinary public_id   (stored as Media.cloudinaryPublicId)
 */
/** Shared fileFilter — reused by all upload configurations. */
const imageFileFilter: MulterOptions['fileFilter'] = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(
      new BadRequestException(
        'Unsupported file type. Allowed: jpg, jpeg, png, gif, webp.',
      ),
      false,
    );
  }
  cb(null, true);
};

/** Shared limits — reused by all upload configurations. */
const imageLimits: MulterOptions['limits'] = {
  fileSize: MAX_FILE_SIZE,
  files: MAX_FILES_PER_REQUEST,
};

/** Cloudinary storage for post images — lands in the "posts" folder. */
const postsCloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  } as object,
});

export const postsMulterOptions: MulterOptions = {
  storage: postsCloudinaryStorage,
  fileFilter: imageFileFilter,
  limits: imageLimits,
};

/** Cloudinary storage for project images — lands in the "projects" folder. */
const projectsCloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'projects',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  } as object,
});

export const projectsMulterOptions: MulterOptions = {
  storage: projectsCloudinaryStorage,
  fileFilter: imageFileFilter,
  limits: imageLimits,
};
