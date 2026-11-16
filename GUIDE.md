# The honest guide

So you found a little Go + React app that drives an Android TV over ADB. Neat.
Before you point it at something, read this — it takes two minutes and might
save you a very awkward conversation.

## What this actually is

A weekend-project experiment. It works, it's useful, and it is **not** a
polished product. There's no audit, no support contract, no warranty, and no
guarantee that a future Android update won't break something. Treat it like a
power tool you built in your garage, not like software you'd install on a
customer's network.

## The one rule

**Only use this on devices you own, or devices you have explicit permission to
control.** That's it. That's the whole rule.

ADB is not a remote control protocol. It's a debugging bridge with a shell
attached. "Pairing" with someone else's TV, phone, or set-top box without their
consent is unauthorized access in most jurisdictions, and "I was just testing"
is not a defence. If you're doing a demo for a friend, ask first and disconnect
afterwards.

## The token is not a security boundary

`TOKEN` stops a casual neighbor from poking the API. It does not encrypt
anything, it travels in headers and query strings, and it's stored in the
browser's `localStorage` in plain text. If someone can reach the server, assume
they can eventually control the device. The real boundary is your network.

So:

- Keep the server on a trusted LAN. Don't port-forward it.
- Don't put it on public Wi-Fi, hotel networks, or anything you don't control.
- If you need remote access, use a VPN or a private tunnel (Tailscale, WireGuard,
  SSH port-forward). Never a public URL.
- Set `TOKEN` even on your own LAN. It costs nothing:

  ```bash
  DEVICE=192.168.1.10:5555 TOKEN="$(openssl rand -hex 16)" ./bin/adb-remote
  ```

- The same applies to ADB itself: port `5555` is remote shell access. Don't
  expose it either.

## What it stores in your browser

Everything client-side lives in `localStorage` under `adbremote.*`:

| Key | What |
| --- | --- |
| `adbremote.prefs` | theme, terminal font size, screenshot interval, toggles |
| `adbremote.addr` | last device address you typed |
| `adbremote.addresses` | the last few addresses (history chips) |
| `adbremote.base` / `adbremote.token` | optional API base URL and auth token |

Clear site data if you're on a shared machine. The token is readable by any
script running on the same origin, so don't run random extensions against it.

## A sane setup

1. Put the server on the same LAN as the TV, on a machine you control.
2. Give it a token. Run it as a normal user, not root.
3. Open the app, go to **Settings → Client**, paste the token, save.
4. Use it. Close the tab when you're done if you're feeling tidy.
5. If the TV is shared, run `adb disconnect` (or hit Disconnect in Settings)
   when you're finished.

## If something goes wrong

This thing can reboot a device, install APKs, and run shell commands as the
shell user (and `su 0` if the device is rooted). That's the point. It also means
a bad command is a bad command — there's no undo. Keep backups of anything
important, and don't run it against a device you can't physically recover.

## Contributing / reporting

Found a security problem? Open an issue without exploit details, or contact the
repo owner directly. Please don't test against devices that aren't yours.

---

Have fun, be careful, and don't be the reason someone has to write a "we've
disabled ADB on the office TV" email.
