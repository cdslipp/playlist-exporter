import type { PlaylistData, ContentMessage, PopupMessage } from '../lib/types';

function badgeText(n: number, complete: boolean): string {
  // For 3+ digit numbers, drop the ↓ arrow to keep badge readable
  // (background color already shows green=complete vs amber=loading)
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 100) return String(n);
  return complete ? String(n) : `${n}↓`;
}

function updateBadge(playlist: PlaylistData) {
  const have = playlist.tracks.length;
  const total = playlist.totalCount ?? have;
  const complete = have >= total;

  chrome.action.setBadgeText({ text: badgeText(have, complete) });
  chrome.action.setBadgeBackgroundColor({ color: complete ? '#22c55e' : '#f59e0b' });
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(
    (message: ContentMessage | PopupMessage, _sender, sendResponse) => {
      if (message.type === 'PLAYLIST_DETECTED') {
        const playlist = message.payload;
        chrome.storage.local.set({ playlist });
        updateBadge(playlist);
        return false;
      }

      if (message.type === 'PLAYLIST_PAGE') {
        chrome.storage.local.get('playlist', (result) => {
          const existing: PlaylistData | undefined = result.playlist;
          if (existing) {
            existing.tracks = [...existing.tracks, ...message.payload.tracks];
            chrome.storage.local.set({ playlist: existing });
            updateBadge(existing);
          }
          sendResponse({ ok: true });
        });
        return true;
      }

      if (message.type === 'GET_PLAYLIST') {
        chrome.storage.local.get('playlist', (result) => {
          sendResponse(result.playlist ?? null);
        });
        return true;
      }

    },
  );
});
