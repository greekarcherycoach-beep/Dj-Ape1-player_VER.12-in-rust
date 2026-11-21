# Test report (pre-release)

Environment: Linux, Rust 1.100, WebKitGTK 2.52 under Xvfb (software rendering), 4 GB RAM. Windows was compile-checked only.

## Compile
- `cargo check --locked` (Linux debug + release) and `--target x86_64-pc-windows-gnu`: OK, Cargo.lock unchanged.
- Only warning: `unused_mut` at src/main.rs:219 in release (present in the original repo too).

## Rust server (tests/rust_stress.py, against the running app)
- 100k-track library (~70 MB JSON) save + load byte-identical; 5 writers + 8 readers x 45 s: no torn reads.
- Backups stay bounded; corrupt library.json is served from the newest backup; garbage / non-library bodies rejected.
- 2000 media files: readdir/stat/readTags in parallel; Range requests (incl. 2 GB sparse file, 416, garbage); 32 parallel streamers.
- Playlist files: 10 threads overwriting one file -> one complete file, no temp files; unsafe names sanitised/rejected; removeFile limited to .m3u8/.m3u/.pls.
- 40 concurrent recordings; wrong token / wrong Host rejected; 3 x 45 s soak with 24 threads: 0 errors, no fd or thread growth.
- Single instance: 2nd launch exits in 0.13 s, 1st keeps running.

## UI logic (tests/ui_stress*.js, Node + jsdom, synthetic libraries 1k - 250k)
- smartMix / planSet / suggestNext / harmonic / energyRank / rules / duplicate finder: hundreds of random parameter sets, no exceptions or invariant violations (no duplicates, artist limits, correct durations).
- Fixed: O(N^2) BPM-rank estimate (25.7 s at 100k -> 0.1 s); bounded Smart Mix / Set Wizard / Automix worst cases (82 s -> 10.8 s).
- Queue (4000 transitions, shuffle, repeat, Auto DJ), 300 playlists / 2.8 M entries, bulk delete, exports of 100k tracks: OK.
- Note: jsdom retains memory for large `<details>` trees; this is a jsdom artifact (reproduced in a bare page), not an app leak.

## Real WebView (tests/e2e_init.js, debug build, DJAPE_INIT_JS)
- 50k tracks, 9 minutes, 43 cycles of all Dj-mode tools, dialogs, 20 themes, queue, playlists, exports and real library saves: 0 errors; quit() exits cleanly (lock removed).
- With 100k tracks the WebKit process peaked at 2.4-2.7 GB and was OOM-killed on the 4 GB test machine.

## Not tested
Real audio playback / crossfade, installation on Windows, the Inno Setup installer, macOS.
