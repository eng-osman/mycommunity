import * as aws from 'aws-sdk';
import * as fileType from 'file-type';
import { PathLike } from 'fs';
import { Env, generateUnique } from '.';
import { manipulateImage } from './sharp.util';
// Set S3 endpoint to DigitalOcean Spaces
const endpoint = Env('DO_SPACES_ENDPOINT');
export const CDNEndpoint = Env('DO_SPACES_CDN_ENDPOINT');
export const Bucket = Env('DO_SPACES_BUCKET_NAME', 'klliq-static-xx1');
const spacesEndpoint = new aws.Endpoint(endpoint);
const key = Env('DO_SPACES_API_KEY');
const secret = Env('DO_SPACES_API_SECRET');
export const S3 = new aws.S3({
  endpoint: spacesEndpoint as any,
  accessKeyId: key,
  secretAccessKey: secret,
});

export function makeCDNUrl(fileKey: string): string {
  return `https://${CDNEndpoint}/${fileKey}`;
}

export async function uploadToS3(dirName: PathLike, file: Buffer, name?: string) {
  const type = fileType(file);
  let mime = type ? type.mime : 'application/octet-stream';
  const ext = type ? type.ext : 'unknown';
  const fileName = `${dirName}/${name ? name : generateUnique(32)}.${ext}`;
  let body = file;
  if (isImage(ext)) {
    body = await manipulateImage(file);
    mime = 'image/jpeg';
  }
  const res = await S3.upload({
    ACL: 'public-read',
    Bucket,
    Key: fileName,
    Body: body,
    ContentType: mime,
  }).promise();
  const url = makeCDNUrl(res.Key);
  return url;
}

export const isImage = (ext: string): boolean => ['jpeg', 'jpg', 'png'].includes(ext);

export function getMediaDirName(type: 'photo' | 'voice' | 'video' | 'files') {
  switch (type) {
    case 'photo':
      return 'photos';
    case 'video':
      return 'videos';
    case 'voice':
      return 'clips';
    case 'files':
      return 'files';
  }
}
