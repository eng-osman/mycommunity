export interface UserMetadata {
  id: string;
  mobileNumber: string;
  firstName: string;
  lastName: string;
  country?: string;
  profileImage: string | null;
  gender: string;
  countryCode?: string;
  location?: string;
  isActive?: boolean;
}
