<script lang="ts">
  import { onMount } from 'svelte';
  import type { PlaylistData } from '../../lib/types';
  import { exportJspf } from '../../lib/export-jspf';
  import { exportCsv } from '../../lib/export-csv';

  let playlist: PlaylistData | null = $state(null);
  let loading = $state(true);

  let trackCount = $derived(playlist?.tracks.length ?? 0);
  let totalCount = $derived(playlist?.totalCount ?? trackCount);
  let isComplete = $derived(trackCount >= totalCount);

  function slugify(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJspf() {
    if (!playlist) return;
    const slug = slugify(playlist.title);
    download(exportJspf(playlist), `${slug}.jspf`, 'application/json');
  }

  function downloadCsv() {
    if (!playlist) return;
    const slug = slugify(playlist.title);
    download(exportCsv(playlist), `${slug}.csv`, 'text/csv');
  }

  let copyLabel = $state('Copy JSON');

  async function copyJson() {
    if (!playlist) return;
    const data = {
      source: playlist.source,
      title: playlist.title,
      creator: playlist.creator,
      tracks: playlist.tracks.map(({ title, artist, album }) => ({ title, artist, album }))
    };
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    copyLabel = 'Copied!';
    setTimeout(() => (copyLabel = 'Copy JSON'), 1500);
  }

  onMount(async () => {
    const result: PlaylistData | null = await browser.runtime.sendMessage({ type: 'GET_PLAYLIST' });
    playlist = result;
    loading = false;
  });
</script>

<main>
  {#if loading}
    <div class="center">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  {:else if playlist}
    <div class="header">
      <span class="badge" class:spotify={playlist.source === 'spotify'} class:apple={playlist.source === 'apple-music'}>
        {playlist.source === 'spotify' ? 'Spotify' : 'Apple Music'}
      </span>
      <h1>{playlist.title}</h1>
      {#if playlist.creator}
        <p class="creator">by {playlist.creator}</p>
      {/if}
      <p class="count">
        {#if isComplete}
          {trackCount} tracks
        {:else}
          {trackCount} / {totalCount} tracks — scroll playlist to load more
        {/if}
      </p>
    </div>

    <div class="tracks">
      {#each playlist.tracks as track, i (i)}
        <div class="track">
          <span class="track-title">{track.title}</span>
          <span class="track-artist">{track.artist}</span>
        </div>
      {/each}
    </div>

    <div class="actions">
      <button class="export" onclick={downloadJspf}>JSON</button>
      <button class="export" onclick={downloadCsv}>CSV</button>
      <button class="copy" onclick={copyJson}>{copyLabel}</button>
    </div>
  {:else}
    <div class="center">
      <h1>Playlist Exporter</h1>
      <p class="instructions">Open a playlist on Spotify or Apple Music to get started.</p>
    </div>
  {/if}
</main>

<style>
  main {
    width: 400px;
    min-height: 240px;
    padding: 20px;
    font-size: 15px;
  }

  .center {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    text-align: center;
  }

  h1 {
    font-size: 1.3em;
    margin: 6px 0;
    line-height: 1.3;
  }

  .badge {
    display: inline-block;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 8px;
    border-radius: 4px;
    color: white;
  }

  .badge.spotify {
    background: #1db954;
  }

  .badge.apple {
    background: #fc3c44;
  }

  .creator {
    font-size: 0.9em;
    margin: 0;
    opacity: 0.7;
  }

  .count {
    font-size: 0.85em;
    margin: 4px 0 8px;
    opacity: 0.6;
  }

  .tracks {
    max-height: 320px;
    overflow-y: auto;
    border: 1px solid rgba(128, 128, 128, 0.2);
    border-radius: 6px;
    margin-bottom: 12px;
  }

  .track {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
    font-size: 0.9em;
  }

  .track:last-child {
    border-bottom: none;
  }

  .track-title {
    font-weight: 500;
  }

  .track-artist {
    font-size: 0.85em;
    opacity: 0.6;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .actions button {
    flex: 1;
    padding: 10px 14px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 500;
  }

  .export {
    background: #3b82f6;
    color: white;
  }

  .export:hover {
    background: #2563eb;
  }

  .copy {
    background: #7c3aed;
    color: white;
  }

  .copy:hover {
    background: #6d28d9;
  }

  .instructions {
    font-size: 0.9em;
    opacity: 0.7;
    max-width: 240px;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid rgba(128, 128, 128, 0.2);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
