export default defineUnlistedScript(() => {
  const scriptEl = document.currentScript;
  const originalFetch = window.fetch;

  console.log('[playlist-exporter] Spotify interceptor loaded');

  function extractUrl(input: any): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    if (input instanceof Request) return input.url;
    return '';
  }

  async function extractBody(args: any[]): Promise<string | null> {
    const init = args[1];
    if (init?.body && typeof init.body === 'string') return init.body;
    if (args[0] instanceof Request) {
      try {
        return await args[0].clone().text();
      } catch {
        return null;
      }
    }
    return null;
  }

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    let url = '';
    let bodyStr: string | null = null;

    try {
      url = extractUrl(args[0]);
      bodyStr = await extractBody(args);
    } catch {
      // fall through
    }

    const response = await originalFetch.apply(this, args);

    try {
      if (!url.includes('api-partner.spotify.com/pathfinder/')) {
        return response;
      }

      let operationName = '';
      let offset = 0;
      if (bodyStr) {
        try {
          const bodyJson = JSON.parse(bodyStr);
          operationName = bodyJson.operationName ?? '';
          offset = bodyJson.variables?.offset ?? 0;
        } catch {
          // not JSON
        }
      }

      const opLower = operationName.toLowerCase();
      // Only care about fetchPlaylist and fetchPlaylistContents
      if (opLower !== 'fetchplaylist' && opLower !== 'fetchplaylistcontents') {
        return response;
      }

      console.log('[playlist-exporter]', operationName, 'offset:', offset);
      const clone = response.clone();
      clone.json().then((json: any) => {
        try {
          const playlistV2 = json?.data?.playlistV2;
          if (!playlistV2) return;

          const items = playlistV2.content?.items ?? [];
          const tracks = items
            .map((item: any) => {
              const data = item?.itemV2?.data;
              if (!data?.name) return null;
              return {
                title: data.name,
                artist: (data.artists?.items ?? [])
                  .map((a: any) => a?.profile?.name)
                  .filter(Boolean)
                  .join(', '),
                album: data.albumOfTrack?.name,
                duration: data.trackDuration?.totalMilliseconds,
              };
            })
            .filter(Boolean);

          const payload = {
            operationName,
            offset,
            source: 'spotify',
            title: playlistV2.name,
            creator: playlistV2.ownerV2?.data?.name,
            tracks,
            totalCount: playlistV2.content?.totalCount,
          };

          console.log('[playlist-exporter]', operationName, '→', tracks.length, 'tracks, offset:', offset, 'total:', payload.totalCount);

          scriptEl?.dispatchEvent(
            new CustomEvent('playlist-data', {
              detail: JSON.stringify(payload),
            }),
          );
        } catch (e) {
          console.error('[playlist-exporter] Error processing response:', e);
        }
      });
    } catch (e) {
      console.error('[playlist-exporter] Error in fetch wrapper:', e);
    }

    return response;
  };
});
