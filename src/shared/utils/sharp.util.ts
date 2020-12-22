import { LoggerService } from '@shared/services';
import * as sharp from 'sharp';

const Logger = new LoggerService('SharpUtils');
export async function manipulateImage(buffer: Buffer): Promise<Buffer> {
  try {
    const output = await sharp(buffer)
      .jpeg({
        quality: 88,
      })
      .toBuffer({ resolveWithObject: false });
    const inputBufferSize = buffer.byteLength;
    const outputBufferSize = output.byteLength;
    Logger.logDebug({
      inputBufferSize,
      outputBufferSize,
      ratio: inputBufferSize / outputBufferSize,
    });
    return output;
  } catch (error) {
    Logger.error(error.message, error);
    Logger.warn('returning the original buffer instead');
    return buffer;
  }
}
