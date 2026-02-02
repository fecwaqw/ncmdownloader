# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Netease Cloud Music playlist downloader - a CLI tool that authenticates with Netease Music, fetches playlist details, and downloads songs with ID3 tags (title, artist, album, album artwork).

## Commands

```bash
# Install dependencies
pnpm install

# Run the downloader
node main.js
```

## Architecture

- **main.js**: Entry point. Orchestrates: authentication → playlist ID prompt → fetch songs → concurrent download loop with retry → ID3 tagging. Tracks failed songs/lyrics and outputs summary at end.
- **download.js**: Download utilities using `follow-redirects` for HTTP/HTTPS requests with retry and timeout. Exports `download()`, `downloadBuffer()`, and `downloadLyric()`.
- **config.yml**: Configuration file with all download settings.

## Key Dependencies

- **NeteaseCloudMusicApi**: `ncmApi` for all API calls (user_account, playlist_detail, playlist_track_all, song_url_v1)
- **browser-id3-writer**: Writes ID3v1/v2 tags to MP3 files
- **follow-redirects**: HTTP redirect handling (up to 5 redirects)
- **progress**: Download progress bar
- **js-yaml**: Parses config.yml
- **p-limit**: Concurrency control for parallel downloads

## Main Flow (main.js)

1. Load config from `config.yml` with validation
2. Authenticate via `ncmApi.user_account()` with cookie
3. Prompt for playlist ID
4. Fetch playlist metadata via `ncmApi.playlist_detail()`
5. Fetch all songs via `ncmApi.playlist_track_all()`
6. Concurrent download loop (limited by `concurrency`):
   - For each song:
     - Get download URL via `ncmApi.song_url_v1()` with bitrate level
     - Download audio file via `download()` with retry/timeout
     - Fetch album cover via `downloadBuffer()` with retry/timeout
     - Apply ID3 tags using `browser-id3-writer`
     - Write tagged file to playlist-named directory
     - Download lyrics via `downloadLyric()` with retry/timeout
7. Output summary of failed songs and lyrics

## Configuration (config.yml)

- **cookie**: Netease Music `MUSIC_U` cookie for authentication
- **maxBitrateLevel**: Bitrate setting - `standard`, `higher`, `exhigh`, `lossless`, `hires`, `jyeffect`, `sky`, `dolby`, `jymaster`
- **concurrency**: Number of concurrent downloads
- **retry**: Number of retry attempts on download failure
- **retryDelay**: Delay between retries in milliseconds
- **timeout**: Request timeout in milliseconds
- **downloadSongs**: Whether to download songs (true/false)
- **downloadLyrics**: Whether to download lyrics (true/false)
