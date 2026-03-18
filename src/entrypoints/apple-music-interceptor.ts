export default defineUnlistedScript(() => {
  const scriptEl = document.currentScript;
  const originalFetch = window.fetch;

  console.log('[playlist-exporter] Apple Music interceptor loaded');

  function extractUrl(input: any): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input instanceof Request) return input.url;
    return '';
  }

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = extractUrl(args[0]);

      if (!url.includes('amp-api.music.apple.com')) return response;
      if (!url.includes('/playlists/')) return response;

      // Detect offset from URL for pagination tracking
      const urlObj = new URL(url);
      const offset = parseInt(urlObj.searchParams.get('offset') ?? '0', 10);
      const isTrackPage = url.includes('/tracks');

      console.log('[playlist-exporter] Apple Music playlist fetch, offset:', offset, 'isTrackPage:', isTrackPage);

      const clone = response.clone();
      clone.json().then((json: any) => {
        try {
          const tracks: Array<{
            title: string;
            artist: string;
            album?: string;
            duration?: number;
          }> = [];
          let playlistTitle: string | undefined;
          let creator: string | undefined;
          let totalCount: number | undefined;

          // Extract playlist metadata from data[0]
          const playlistData = json?.data?.[0];
          if (playlistData?.attributes?.name) {
            playlistTitle = playlistData.attributes.name;
            creator = playlistData.attributes.curatorName;
          }

          // Get total from tracks relationship meta
          const tracksMeta = playlistData?.relationships?.tracks?.meta;
          if (tracksMeta?.total) {
            totalCount = tracksMeta.total;
          }

          // Also check library-playlists in resources for metadata + total
          if (json?.resources?.['library-playlists']) {
            for (const pl of Object.values(json.resources['library-playlists']) as any[]) {
              if (!playlistTitle && pl?.attributes?.name) {
                playlistTitle = pl.attributes.name;
              }
              const relTotal = pl?.relationships?.tracks?.meta?.total;
              if (relTotal) totalCount = relTotal;
            }
          }

          // Also check catalog playlists in resources for metadata
          if (json?.resources?.['playlists']) {
            for (const pl of Object.values(json.resources['playlists']) as any[]) {
              if (!playlistTitle && pl?.attributes?.name) {
                playlistTitle = pl.attributes.name;
              }
              if (!creator && pl?.attributes?.curatorName) {
                creator = pl.attributes.curatorName;
              }
            }
          }

          // Catalog playlists: tracks in relationships with full attributes
          const relationshipTracks =
            json?.data?.[0]?.relationships?.tracks?.data ?? [];
          for (const t of relationshipTracks) {
            const attrs = t?.attributes;
            if (!attrs?.name) continue;
            tracks.push({
              title: attrs.name,
              artist: attrs.artistName,
              album: attrs.albumName,
              duration: attrs.durationInMillis,
            });
          }

          // Library playlists: track data in resources
          if (tracks.length === 0 && json?.resources) {
            const songResources =
              json.resources['library-songs'] ?? json.resources['songs'] ?? {};
            for (const song of Object.values(songResources) as any[]) {
              const attrs = song?.attributes;
              if (!attrs?.name) continue;
              tracks.push({
                title: attrs.name,
                artist: attrs.artistName,
                album: attrs.albumName,
                duration: attrs.durationInMillis,
              });
            }
          }

          // Track-only pages (pagination): data[] contains track items directly
          if (tracks.length === 0 && isTrackPage && Array.isArray(json?.data)) {
            for (const t of json.data) {
              const attrs = t?.attributes;
              if (!attrs?.name) continue;
              tracks.push({
                title: attrs.name,
                artist: attrs.artistName,
                album: attrs.albumName,
                duration: attrs.durationInMillis,
              });
            }
            // Pagination meta on track pages
            if (json?.meta?.total) totalCount = json.meta.total;
          }

          console.log('[playlist-exporter] Apple Music:', tracks.length, 'tracks, offset:', offset, 'total:', totalCount, 'title:', playlistTitle);

          if (tracks.length === 0) return;

          const payload = {
            source: 'apple-music',
            title: playlistTitle,
            creator,
            tracks,
            offset,
            totalCount,
            isTrackPage,
          };

          scriptEl?.dispatchEvent(
            new CustomEvent('playlist-data', {
              detail: JSON.stringify(payload),
            }),
          );
        } catch (e) {
          console.error('[playlist-exporter] Apple Music error:', e);
        }
      });
    } catch (e) {
      console.error('[playlist-exporter] Apple Music fetch error:', e);
    }

    return response;
  };
});
