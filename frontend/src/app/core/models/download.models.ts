export interface VideoFormat {
  format_id: string;
  label: string;
  quality: string;
  ext: string;
  type: 'video' | 'audio';
  url?: string;
  audio_url?: string;
  filesize?: number;
  filesizeStr?: string;
  needs_merge: boolean;
  needs_ytdlp?: boolean;
  page_url?: string;
}

export interface CarouselItem {
  index: number;
  kind: 'video' | 'image';
  url: string;
  thumb?: string;
  height?: number;
  width?: number;
  duration?: number;
}

export interface AdSlot {
  slotName: string;
  adUnitId: string;
}

export interface DownloadInfoResponse {
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  formats: VideoFormat[];
  carousel: CarouselItem[];
  platform: 'facebook' | 'instagram' | 'tiktok';
  adsConfig: AdSlot[];
  sessionCount: number;
}

export interface SessionStatus {
  count: number;
  showAds: boolean;
  plan: string;
  loggedIn: boolean;
  remainingFree: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  plan: string;
  createdAt?: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface Download {
  id: string;
  platform: string;
  sourceUrl: string;
  title?: string;
  format?: string;
  hadAds: boolean;
  createdAt: string;
}
