import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { api } from '../../api'
import { usePrefs } from '../../lib/prefs'

import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

import { TERMINAL_THEME } from './theme'

export type Phase = 'connecting' | 'open' | 'closed'

export type TerminalController = {
  hostRef: RefObject<HTMLDivElement>
  termRef: RefObject<Terminal>
  phase: Phase
  root: boolean
  setRoot: (value: boolean) => void
  userClosed: boolean
  reconnect: () => void
  focus: () => void
  copy: () => Promise<void>
  paste: () => Promise<void>
  insert: (cmd: string) => void
}

const FONT = "'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace"

export function useTerminal(disabled: boolean): TerminalController {
  const prefs = usePrefs()
  const [root, setRoot] = useState(false)
  const [phase, setPhase] = useState<Phase>('connecting')
  const [generation, setGeneration] = useState(0)
  const [userClosed, setUserClosed] = useState(false)
  const [ready, setReady] = useState(false)

  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sizeRef = useRef({ cols: 0, rows: 0 })
  const syncRef = useRef<() => void>(() => {})
  const startedRef = useRef(false)

  const fontSize = prefs.terminalFontSize

  // Build the terminal once per device session. The mono font is loaded first
  // so xterm measures real cell metrics instead of fallback glyph widths.
  useEffect(() => {
    if (disabled || !hostRef.current) return
    const host = hostRef.current
    let cancelled = false
    let term: Terminal | null = null
    let ro: ResizeObserver | null = null
    let timer = 0

    const boot = async () => {
      try {
        await document.fonts.load(`${fontSize}px "IBM Plex Mono"`)
      } catch {
        /* fall back to the system mono font */
      }
      if (cancelled) return

      term = new Terminal({
        fontFamily: FONT,
        fontSize,
        lineHeight: 1.25,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
        convertEol: false,
        allowProposedApi: true,
        theme: TERMINAL_THEME,
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.loadAddon(new WebLinksAddon())
      term.open(host)

      termRef.current = term
      fitRef.current = fit
      startedRef.current = false
      sizeRef.current = { cols: 0, rows: 0 }

      // One fit/resize pipeline for every cause: mount, window resize, font
      // change. Sending a resize only when the grid actually changed keeps the
      // PTY in sync without spamming the socket.
      syncRef.current = () => {
        const t = termRef.current
        const f = fitRef.current
        if (!t || !f) return
        if (host.clientWidth < 40 || host.clientHeight < 40) return
        try {
          f.fit()
        } catch {
          return
        }
        if (t.cols <= 0 || t.rows <= 0) return
        if (t.cols === sizeRef.current.cols && t.rows === sizeRef.current.rows) return
        sizeRef.current = { cols: t.cols, rows: t.rows }
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: t.cols, rows: t.rows }))
        }
      }

      term.onData((data) => {
        const ws = wsRef.current
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }))
        }
      })

      ro = new ResizeObserver(() => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => syncRef.current(), 100)
      })
      ro.observe(host)

      // The card is still settling on the first frame; fit after layout.
      requestAnimationFrame(() => syncRef.current())
      setReady(true)
    }

    void boot()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      ro?.disconnect()
      syncRef.current = () => {}
      setReady(false)
      term?.dispose()
      termRef.current = null
      fitRef.current = null
      sizeRef.current = { cols: 0, rows: 0 }
    }
    // Font size changes are applied in place below; recreating the terminal
    // would drop the session and the scrollback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  // Font size changes from Settings or the toolbar, without a reconnect.
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.fontSize = fontSize
    requestAnimationFrame(() => syncRef.current())
  }, [fontSize])

  // Session lifecycle. Every socket gets its own handlers and identity check so
  // a late event from a closed socket can never write into the new session.
  useEffect(() => {
    if (disabled || !ready) return
    const term = termRef.current
    if (!term) return

    setPhase('connecting')
    setUserClosed(false)

    syncRef.current()
    let cols = term.cols
    let rows = term.rows
    if (!cols || !rows) {
      cols = 100
      rows = 30
    }

    if (startedRef.current) {
      term.write('\r\n\x1b[38;5;240m── new session ──\x1b[0m\r\n')
    }
    startedRef.current = true

    let ws: WebSocket
    try {
      ws = new WebSocket(api.terminalUrl(root, cols, rows))
    } catch (e) {
      term.writeln(`\r\n\x1b[31m${e instanceof Error ? e.message : 'could not open socket'}\x1b[0m`)
      setPhase('closed')
      return
    }
    wsRef.current = ws
    const current = () => wsRef.current === ws

    ws.onopen = () => {
      if (!current()) return
      setPhase('open')
      // The grid may have changed while the socket was connecting; resend it.
      sizeRef.current = { cols: 0, rows: 0 }
      syncRef.current()
    }

    ws.onmessage = (ev) => {
      if (!current() || termRef.current !== term || typeof ev.data !== 'string') return
      let msg: { type?: string; data?: string }
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.type === 'output' && msg.data) {
        term.write(msg.data)
      } else if (msg.type === 'error') {
        term.writeln(`\r\n\x1b[31m${msg.data || 'shell error'}\x1b[0m`)
      } else if (msg.type === 'exit') {
        term.writeln('\r\n\x1b[38;5;244m[session ended]\x1b[0m')
      }
    }

    ws.onclose = () => {
      if (!current()) return
      wsRef.current = null
      setPhase('closed')
    }

    ws.onerror = () => {
      if (!current() || termRef.current !== term) return
      term.writeln('\r\n\x1b[31m[socket error]\x1b[0m')
    }

    return () => {
      if (wsRef.current === ws) wsRef.current = null
      ws.onopen = null
      ws.onmessage = null
      ws.onclose = null
      ws.onerror = null
      try {
        ws.close()
      } catch {
        /* ignore */
      }
    }
  }, [root, disabled, generation, ready])

  // Auto-reconnect after an unexpected close.
  useEffect(() => {
    if (phase !== 'closed' || disabled || userClosed || !prefs.terminalReconnect) return
    const id = window.setTimeout(() => setGeneration((g) => g + 1), 1500)
    return () => window.clearTimeout(id)
  }, [phase, disabled, userClosed, prefs.terminalReconnect])

  const reconnect = useCallback(() => {
    setUserClosed(false)
    setGeneration((g) => g + 1)
  }, [])

  const focus = useCallback(() => termRef.current?.focus(), [])

  const copy = useCallback(async () => {
    const term = termRef.current
    if (!term) return
    const text = term.getSelection() || ''
    if (!text) {
      term.write('\x1b[38;5;244m(nothing selected)\x1b[0m\r\n')
      return
    }
    await navigator.clipboard.writeText(text)
    term.write('\x1b[38;5;244m(copied)\x1b[0m\r\n')
  }, [])

  const paste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) termRef.current?.paste(text)
    } catch {
      termRef.current?.write('\x1b[31m(clipboard blocked by the browser)\x1b[0m\r\n')
    }
  }, [])

  const insert = useCallback((cmd: string) => {
    termRef.current?.paste(cmd)
    termRef.current?.focus()
  }, [])

  return {
    hostRef,
    termRef,
    phase,
    root,
    setRoot,
    userClosed,
    reconnect,
    focus,
    copy,
    paste,
    insert,
  }
}
