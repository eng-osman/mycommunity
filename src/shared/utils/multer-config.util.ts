import { BadRequestException } from '@nestjs/common';
import { LoggerService } from '@shared/services';
import { memoryStorage, Options } from 'multer';
import { extname } from 'path';
const Logger = new LoggerService('Multer');
export const MulterConfig = (_path: string, limit = 5, fileTypes: RegExp): Options => ({
  storage: memoryStorage(),
  limits: { fieldSize: limit * 1000 * 1000, fileSize: limit * 1000 * 1000, files: 5 },
  fileFilter: (_req, file, cb) => {
    const mimeType = fileTypes.test(file.mimetype);
    const extName = fileTypes.test(extname(file.originalname).toLowerCase());
    if (mimeType && extName) {
      return cb(null, true);
    }
    Logger.logDebug(
      'Got a Bad File with mimetype',
      file.mimetype,
      'and ext',
      extName,
      {
        name: file.filename,
        size: file.size,
      },
      fileTypes,
    );
    cb(
      new BadRequestException(`File upload only supports the following filetypes: ${fileTypes}`),
      false,
    );
  },
});
