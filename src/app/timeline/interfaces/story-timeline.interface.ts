export interface StoryTimeline {
  user: {
    id: number | string;
    mobileNumber: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
  };
  media: Array<{ id: number; url: string; type: string; thumbnails?: string[] }>;
}
