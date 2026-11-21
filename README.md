# Dj Ape1 – Rust build

Native desktop shell (Rust + WebView) around the `Dj Ape1` music-library UI (`assets/index.html`).
It implements the `window.desktop` bridge the UI expects: folder/file pickers, drag & drop with
real paths, tag reading (lofty), audio streaming with seek, library save + rotating backups,
folder watching, MP3/FLAC recorder output, tray icon, close-to-tray, autostart, crash recovery.

## Build locally

```bash
cargo run --release
```

Linux needs: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev libxdo-dev`.
Windows needs the WebView2 runtime (preinstalled on Windows 10/11).

## Build on GitHub

1. Create a repo and push this folder (including `Cargo.lock`).
2. **Actions → Build** compiles Windows / Linux / macOS and uploads the binaries as artifacts.
3. To publish a release: `git tag v1.0.0 && git push origin v1.0.0`.

## Windows 10 installer

The `windows-installer` job builds `DjApe1-Setup-<version>.exe` (Inno Setup, per-user install, no admin needed,
installs the WebView2 runtime if missing). Download it from the run's artifacts or from the GitHub Release.

## Data location

| Mode | Path |
|---|---|
| Installed | `%APPDATA%\DjApe1` (Windows) · `~/.local/share/DjApe1` (Linux) · `~/Library/Application Support/DjApe1` (macOS) |
| Portable | put an empty file named `portable` next to the executable → data goes in `./data` |

Contains `library.json`, `backups/`, `prefs.json`, `djape1.log`, `webview/` (UI settings).

## Architecture

```
assets/index.html   the UI (unchanged except "djfile://local/" → local URL at runtime)
assets/bridge.js    injected before the page; provides window.desktop
src/main.rs         window, tray, IPC, drag & drop, lifecycle
src/server.rs       127.0.0.1 HTTP server: UI, audio streaming (Range), RPC
src/state.rs        prefs, library + backups, recorder files, watcher
src/tags.rs         tag reading
```

The server listens on `127.0.0.1:47381` (falls back to a random port if busy); every endpoint needs
a random per-run token and a valid `Host` header.

## Notes

- Only one instance runs at a time (they share the data folder): launching it again brings the running window to the front.
- Playlists can be saved to a folder you choose (M3U8 / PLS). The file is rewritten atomically (`writeText`) whenever the
  playlist changes, and only `.m3u8/.m3u/.pls` files can be written or deleted through that command (`removeFile`).
- The UI power button (and Ctrl+Q) calls `window.desktop.quit()` → flush the library → exit, even with "close to tray" on.
- The single-instance guard uses loopback port `47382` (std only, no extra crate, so `cargo build --locked` keeps working).

## Tests

`tests/` contains the stress / soak scripts used before release (see `tests/TEST-REPORT.md`):

| File | What it does |
|---|---|
| `rust_stress.py` | hits the running app's HTTP server: 100k-track library save/load, concurrent writers/readers, backups, corrupt-file recovery, Range streaming, playlist file writes, path-traversal and Host checks, soak with fd/thread/RSS checks |
| `e2e_init.js` | run **inside the real WebView** of a debug build: `DJAPE_INIT_JS=tests/e2e_init.js DJAPE_TOKEN=x cargo run` — big library, Dj-mode tools, dialogs, themes, queue, real library saves, then `quit()` |
| `harness.js`, `ui_stress*.js`, `soak.js` | the same checks in Node + jsdom (needs `npm i jsdom fake-indexeddb @sinonjs/fake-timers`) |

