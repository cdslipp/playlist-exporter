import type { PlaylistData } from './types';

export function exportJspf(playlist: PlaylistData): string {
  return JSON.stringify(
    {
      playlist: {
        title: playlist.title,
        creator: playlist.creator,
        track: playlist.tracks.map((t) => ({
          title: t.title,
          creator: t.artist,
          album: t.album,
          duration: t.duration,
        })),
      },
    },
    null,
    2,
  );
}
