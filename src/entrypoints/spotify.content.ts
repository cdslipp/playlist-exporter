import type { Track, PlaylistData } from '../lib/types';

export default defineContentScript({
  matches: ['*://open.spotify.com/*'],
  runAt: 'document_start',
  async main() {
    console.log('[playlist-exporter] Spotify content script loaded');

    // Accumulator — builds up the playlist across multiple API responses
    let metadata: { title: string; creator?: string } | null = null;
    let allTracks: Track[] = [];
    let totalCount = 0;

    const { script } = await injectScript('/spotify-interceptor.js', {
      keepInDom: true,
    });

    script.addEventListener('playlist-data', (event) => {
      try {
        const raw = JSON.parse((event as CustomEvent).detail);
        const opName: string = raw.operationName ?? '';
        const offset: number = raw.offset ?? 0;

        const tracks: Track[] = (raw.tracks ?? []).map((t: any) => ({
          title: t.title ?? '',
          artist: t.artist ?? '',
          album: t.album,
          duration: t.duration,
        }));

        if (opName === 'fetchPlaylist') {
          // This has metadata + first batch of tracks — reset everything
          metadata = { title: raw.title ?? 'Unknown Playlist', creator: raw.creator };
          allTracks = tracks;
          totalCount = raw.totalCount ?? tracks.length;
          console.log('[playlist-exporter] fetchPlaylist: set metadata, got', tracks.length, '/', totalCount, 'tracks');
        } else if (opName === 'fetchPlaylistContents') {
          // Paginated content — place tracks at correct offset
          if (raw.totalCount) totalCount = raw.totalCount;

          // Grow array if needed and splice tracks in at offset
          while (allTracks.length < offset) {
            allTracks.push({ title: '', artist: '' });
          }
          allTracks.splice(offset, tracks.length, ...tracks);

          console.log('[playlist-exporter] fetchPlaylistContents: offset', offset, '+', tracks.length, '→ total accumulated:', allTracks.length, '/', totalCount);
        } else {
          return; // skip other ops
        }

        // Send current accumulated state to background
        const payload: PlaylistData = {
          source: 'spotify',
          title: metadata?.title ?? 'Unknown Playlist',
          creator: metadata?.creator,
          tracks: allTracks.filter((t) => t.title !== ''),
          totalCount,
          detectedAt: Date.now(),
        };

        console.log('[playlist-exporter] Sending to background:', payload.title, '-', payload.tracks.length, 'tracks');
        browser.runtime.sendMessage({ type: 'PLAYLIST_DETECTED', payload });
      } catch (e) {
        console.error('[playlist-exporter] Error in content script:', e);
      }
    });
  },
});
