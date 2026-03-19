/**
 * Local alias for Express.Multer.File.
 *
 * With `isolatedModules` + `emitDecoratorMetadata` both enabled, TypeScript
 * cannot emit decorator metadata for global namespace types (like
 * `Express.Multer.File`). Using this locally-imported interface instead
 * resolves the TS1272 error in decorated method signatures.
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
  stream: NodeJS.ReadableStream;
}
