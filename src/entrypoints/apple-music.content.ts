import type { Track, PlaylistData } from '../lib/types';

export default defineContentScript({
  matches: ['*://music.apple.com/*'],
  runAt: 'document_start',
  async main() {
    console.log('[playlist-exporter] Apple Music content script loaded');

    // Accumulator for pagination
    let metadata: { title: string; creator?: string } | null = null;
    let allTracks: Track[] = [];
    let totalCount = 0;

    const { script } = await injectScript('/apple-music-interceptor.js', {
      keepInDom: true,
    });

    script.addEventListener('playlist-data', (event) => {
      try {
        const raw = JSON.parse((event as CustomEvent).detail);
        const offset: number = raw.offset ?? 0;

        const tracks: Track[] = (raw.tracks ?? []).map((t: any) => ({
          title: t.title ?? '',
          artist: t.artist ?? '',
          album: t.album,
          duration: t.duration,
        }));

        // Update metadata if present
        if (raw.title) {
          metadata = { title: raw.title, creator: raw.creator };
        }
        if (raw.totalCount) {
          totalCount = raw.totalCount;
        }

        if (raw.isTrackPage && offset > 0) {
          // Paginated track page — append at offset
          while (allTracks.length < offset) {
            allTracks.push({ title: '', artist: '' });
          }
          allTracks.splice(offset, tracks.length, ...tracks);
          console.log('[playlist-exporter] Apple Music page: offset', offset, '+', tracks.length, '→ accumulated:', allTracks.length, '/', totalCount);
        } else {
          // Initial playlist load — reset tracks
          allTracks = tracks;
          console.log('[playlist-exporter] Apple Music initial:', tracks.length, 'tracks, total:', totalCount);
        }

        // Send accumulated state to background
        const payload: PlaylistData = {
          source: 'apple-music',
          title: metadata?.title ?? 'Unknown Playlist',
          creator: metadata?.creator,
          tracks: allTracks.filter((t) => t.title !== ''),
          totalCount: totalCount || allTracks.length,
          detectedAt: Date.now(),
        };

        console.log('[playlist-exporter] Sending to background:', payload.title, '-', payload.tracks.length, '/', payload.totalCount, 'tracks');
        browser.runtime.sendMessage({ type: 'PLAYLIST_DETECTED', payload });
      } catch (e) {
        console.error('[playlist-exporter] Apple Music content error:', e);
      }
    });
  },
});
