# Desktop client (Tauri v2)

The desktop client is a native window around the same Next.js app, so there is exactly one
implementation of the UI, the Drive integration and the AI agent.

```
tauri/
├── package.json            tauri CLI scripts
├── src-tauri/
│   ├── Cargo.toml          Rust deps (tauri 2, reqwest, tokio)
│   ├── tauri.conf.json     bundle + CSP + windows
│   ├── build.rs
│   └── src/main.rs         window bootstrap (GOLIATH_APP_URL)
└── ui-shell/index.html     dark bootstrap page shown before the workspace loads
```

## Prerequisites

- Rust stable (`rustup`), MSVC build tools on Windows
- Node 20+
- `@tauri-apps/cli` (installed by `npm install` in `tauri/`)

## Development

```bash
# terminal 1
cd goliath && npm run dev          # Next.js on :3000

# terminal 2
cd goliath/tauri && npm install && npm run dev
```

`tauri.conf.json` sets `devUrl` to `http://localhost:3000`, so the window loads the running dev
server with hot reload.

## Production bundle

Two options:

**A. Point at a hosted workspace (simplest).**
Set `GOLIATH_APP_URL=https://goliath.example.com` and run `npm run build` in `tauri/`. The window
loads the deployed app; no local server is required.

**B. Bundle the Next.js server as a sidecar (offline-capable).**
1. `cd goliath && npm run build`
2. Add the Node server as a Tauri external binary
   (`tauri/src-tauri/sidecars/goliath-server`) that runs `npm start` against the bundled `.next`.
3. In `main.rs`, spawn the sidecar, poll `http://127.0.0.1:3000/api/health`, then open the window at
   that URL and shut the sidecar down on exit.

Option B is not implemented yet — it needs a Node sidecar build step and a Rust process supervisor.
Until then, the desktop client requires option A or the dev server.

## What works in the shell today

- Native window, dark background matching the graphite theme, 1024×700 minimum
- `GOLIATH_APP_URL` override
- CSP restricted to self, `localhost:3000`, `*.googleapis.com` and `*.supabase.co`
- Windows NSIS/MSI bundle targets

## Large downloads

The web download path buffers in memory. When the desktop sidecar lands, add a Tauri command that
streams a Drive response straight to disk (`reqwest` + `tokio::io::copy`) and register it in the
transfer dock — the API route already supports `Range`, so resumable disk writes are straightforward.