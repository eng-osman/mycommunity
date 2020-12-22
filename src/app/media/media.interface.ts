export interface Media {
  id?: string;
  type: 'photo' | 'video' | 'voice' | 'files';
  url: string | string[];
  thumbnails?: string[];
  mediaHash: string;
}
