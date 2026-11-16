# ADBIN

A small Go + Vite PWA that turns any browser into a remote control for Android
TV devices over ADB. One binary serves the API and the built frontend.

> **Experiment, not a product.** Use it only on devices you own or have explicit
> permission to control. ADB is remote shell access — keep it on your LAN, set a
> token, and read [GUIDE.md](GUIDE.md) before you point it at anything.

## Features

- **Remote**: D-pad, OK, back, home, menu, power, media keys, volume, info.
  Hold a D-pad button to repeat.
- **Text**: type or paste text/URLs into the focused field on the device.
- **Screen**: screenshot preview (tap the image to send a touch), live refresh.
- **Apps**: list apps with icons, search, launch, uninstall.
- **Install**: drag-and-drop `.apk`, `.xapk`, `.apkm` or `.apks` (split
  bundles are expanded and installed with `adb install-multiple`), fetch from a
  URL, inspect package/version/icon before installing, reinstall/downgrade/grant
  flags, a retry queue, and `adb push` for arbitrary files.
- **Shell**: a real PTY in the browser (xterm.js over a WebSocket): interactive
  `sh`, colours, job control, root via `su 0`, resize, snippets.
- **Settings**: device info and storage, mDNS discovery, client API base/token,
  theme and terminal preferences, adb restart, icon-cache clearing, reboot.
- **PWA**: installable when served over HTTPS (or `localhost`).

## Requirements

- Go 1.22+
- Node 22+ and pnpm 11.25+ (`corepack prepare pnpm@11.25.0 --activate`)
- `adb` in `PATH` (or set `ADB_PATH`)
- A device reachable over ADB. For TCP:

  ```bash
  # once, with USB attached
  adb tcpip 5555
  # then, on any host
  adb connect 192.168.1.10:5555
  ```

  `adb tcpip 5555` persists until the device reboots. Android 11+ devices with
  Wireless debugging can also use `adb pair` instead.

## Build and run

```bash
cd web && pnpm install && pnpm build && cd ..
go build -o bin/adb-remote .
DEVICE=192.168.1.10:5555 TOKEN=change-me ./bin/adb-remote
```

Open <http://localhost:8080>. `DEVICE` is optional: when empty the first
connected device is used. `TOKEN` is optional but recommended; when set, the
frontend sends it as `X-Auth-Token` (configure it under Settings).

## Development

Run the API and the Vite dev server separately:

```bash
# terminal 1
ADDR=:8080 go run .

# terminal 2
cd web && pnpm dev
```

Vite runs on <http://localhost:5173> and proxies `/api` (including the terminal
WebSocket) to `:8080`.

The codebase is split by responsibility: `internal/adb` (device operations),
`internal/apk` (APK/bundle inspection), `internal/server` (HTTP handlers), and
`web/src/{api,components,lib,screens}`.

## Configuration

| Env | Default | Purpose |
| --- | --- | --- |
| `ADDR` | `:8080` | Listen address |
| `DEVICE` | first device | adb serial or `host:port` |
| `TOKEN` | empty | Require `X-Auth-Token` / `?token=` on `/api/*` |
| `ADB_PATH` | `adb` | Path to the adb binary |

## API

| Method | Path | Body |
| --- | --- | --- |
| GET | `/api/health` | – |
| GET | `/api/status` | – |
| GET | `/api/info` | – |
| GET | `/api/config` | – (server/runtime diagnostics) |
| POST | `/api/connect` | `{"addr":"host:port"}` |
| POST | `/api/disconnect` | `{"addr":"host:port"}` |
| GET | `/api/discover` | – (mDNS `_adb._tcp`) |
| POST | `/api/key` | `{"key":"KEYCODE_DPAD_UP"}` |
| POST | `/api/text` | `{"text":"hello"}` |
| POST | `/api/tap` | `{"x":100,"y":200}` |
| POST | `/api/swipe` | `{"x1":0,"y1":0,"x2":100,"y2":100,"duration":300}` |
| GET | `/api/apps?all=1` | – |
| GET | `/api/apps/icon?pkg=…&v=…` | – (PNG) |
| POST | `/api/apps/launch` | `{"package":"com.example"}` |
| POST | `/api/apps/uninstall` | `{"package":"com.example"}` |
| GET | `/api/screenshot` | – (PNG) |
| POST | `/api/apk/upload` | multipart `apk` (APK or split bundle) |
| POST | `/api/apk/url` | `{"url":"https://…/app.apk"}` |
| POST | `/api/apk/install` | `{"id":"…","reinstall":true,"downgrade":false,"grantAll":false}` |
| POST | `/api/apk/discard` | `{"id":"…"}` |
| POST | `/api/push` | multipart `file` + `dir=/sdcard/Download` |
| POST | `/api/install` | legacy one-shot: `{"url":"…"}` or multipart `apk` |
| POST | `/api/shell` | `{"cmd":"getprop ro.product.model"}` |
| GET | `/api/ws/terminal?cols=80&rows=24&root=1` | WebSocket: `{"type":"input","data":"…"}` / `{"type":"resize","cols":80,"rows":24}` |
| POST | `/api/adb/restart` | – |
| POST | `/api/device/reboot` | `{"mode":"recovery"}` (empty = system) |
| POST | `/api/cache/clear` | – |

Every action is a plain HTTP call, so the same API can back an agent/MCP tool
later without changing the UI.

## Security

ADB over TCP is remote shell access. Keep the server on a trusted LAN, set
`TOKEN`, and do not expose port 5555 or this server to the internet without a
VPN or tunnel.

## PWA notes

Service workers only register in a secure context. `http://localhost` counts as
secure; a LAN IP over plain HTTP does not. For installable PWA over the LAN, put
Caddy or another TLS terminator in front of the Go server (or use a tunnel).

## Known limits

- Screenshots use `screencap`, which can take several seconds on low-end TVs.
  The preview is a periodic frame, not video. Real mirroring would need the
  scrcpy server + H.264 (a future milestone).
- App icons are rendered on-device with a tiny embedded DEX (`PackageManager`),
  so adaptive/vector icons work.
- The frontend is embedded at build time: rebuild after changing `web/`.

## License

MIT — see [LICENSE](LICENSE). Do whatever you want with it, just keep the
copyright notice. Use it only on devices you own or have permission to control
(see [GUIDE.md](GUIDE.md)).
