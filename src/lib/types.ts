export interface Track {
  title: string;
  artist: string;
  album?: string;
  duration?: number; // milliseconds
}

export interface PlaylistData {
  source: 'spotify' | 'apple-music';
  title: string;
  creator?: string;
  tracks: Track[];
  totalCount?: number; // expected total (for pagination progress)
  detectedAt: number;
}

// Content script → background messages
export type ContentMessage =
  | { type: 'PLAYLIST_DETECTED'; payload: PlaylistData }
  | { type: 'PLAYLIST_PAGE'; payload: { source: string; tracks: Track[] } };

// Popup → background messages
export type PopupMessage = { type: 'GET_PLAYLIST' };
