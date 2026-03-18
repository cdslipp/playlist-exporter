# Playlist Exporter

A Chrome extension that exports playlists from Spotify and Apple Music.

## Features

- Works on **Spotify** and **Apple Music** web players
- Export as **JSPF** (open standard) or **CSV**
- Copy playlist data as JSON to clipboard
- All processing happens locally in your browser

## Install

Install from the [Chrome Web Store](https://chrome.google.com/webstore) (coming soon).

### From source

```bash
bun install
bun run dev
```

Load the unpacked extension from `.output/chrome-mv3` in `chrome://extensions`.

## Export Formats

- **JSPF** — [JSON Shareable Playlist Format](https://www.xspf.org/jspf), an open standard for playlist interchange
- **CSV** — simple spreadsheet-friendly format with title, artist, album, and duration columns

## Usage

1. Open a playlist on [Spotify](https://open.spotify.com) or [Apple Music](https://music.apple.com)
2. Click the extension icon
3. Export as JSPF, CSV, or copy JSON to clipboard

## Built With

- [WXT](https://wxt.dev) — next-gen browser extension framework
- [Svelte 5](https://svelte.dev)
