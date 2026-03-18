import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Playlist Exporter',
    description: 'Export playlists from Spotify and Apple Music as JSON or CSV',
    permissions: ['storage'],
    web_accessible_resources: [
      {
        resources: ['spotify-interceptor.js', 'apple-music-interceptor.js'],
        matches: ['*://open.spotify.com/*', '*://music.apple.com/*'],
      },
    ],
  },
});
