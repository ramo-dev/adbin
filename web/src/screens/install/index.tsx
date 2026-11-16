import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HardDrive, Loader2, PackagePlus } from 'lucide-react'
import { toast } from 'sonner'

import { api, type Info, type InstallOptions, type InstallResult, type Upload } from '../../api'
import { usePrefs } from '../../lib/prefs'
import type { Notify } from '../../lib/runner'
import { Dropzone } from '@/components/dropzone'
import { ScreenHeader } from '@/components/screen-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ACCEPT, loadOptions, loadRecent, newKey, saveOptions, saveRecent } from './helpers'
import { InstallFlags } from './options'
import { QueueRow } from './queue'
import { RecentCard } from './recent'
import { PushCard, UrlCard } from './sources'
import type { QueueItem, Recent } from './types'

export function InstallScreen({
  info,
  notify,
  disabled,
}: {
  info: Info | null
  notify: Notify
  disabled: boolean
}) {
  const prefs = usePrefs()
  const [options, setOptions] = useState<InstallOptions>(loadOptions)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [recent, setRecent] = useState<Recent[]>(loadRecent)
  const controllers = useRef(new Map<string, AbortController>())
  const installLock = useRef(false)

  useEffect(() => saveOptions(options), [options])

  const patch = useCallback((key: string, next: Partial<QueueItem>) => {
    setQueue((q) => q.map((it) => (it.key === key ? { ...it, ...next } : it)))
  }, [])

  const remember = useCallback((entry: Recent) => {
    setRecent((r) => {
      const next = [entry, ...r].slice(0, 8)
      saveRecent(next)
      return next
    })
  }, [])

  const addFiles = useCallback(
    (files: File[]) => {
      if (disabled) {
        notify('connect a device first', 'err')
        return
      }
      for (const file of files) {
        const key = newKey()
        setQueue((q) => [
          { key, name: file.name, size: file.size, status: 'uploading', progress: 0 },
          ...q,
        ])
        const ctrl = new AbortController()
        controllers.current.set(key, ctrl)
        api
          .uploadApk(file, (ratio) => patch(key, { progress: ratio }), ctrl.signal)
          .then(({ files: uploaded }) => {
            const up = uploaded[0]
            if (!up) throw new Error('upload returned no file')
            patch(key, {
              status: 'ready',
              progress: 1,
              upload: up,
              name: up.name,
              size: up.size,
              error: up.metaError,
            })
          })
          .catch((e: unknown) => {
            if (e instanceof DOMException && e.name === 'AbortError') return
            patch(key, { status: 'error', error: e instanceof Error ? e.message : 'upload failed' })
          })
          .finally(() => controllers.current.delete(key))
      }
    },
    [disabled, notify, patch]
  )

  const addUpload = useCallback((up: Upload) => {
    setQueue((q) => [
      {
        key: newKey(),
        name: up.name,
        size: up.size,
        status: 'ready',
        progress: 1,
        upload: up,
        error: up.metaError,
      },
      ...q,
    ])
  }, [])

  const removeItem = useCallback((item: QueueItem) => {
    controllers.current.get(item.key)?.abort()
    controllers.current.delete(item.key)
    if (item.upload) void api.discardApk(item.upload.id).catch(() => {})
    setQueue((q) => q.filter((it) => it.key !== item.key))
  }, [])

  const clearFinished = () => {
    for (const it of queue) {
      if (it.status === 'done' || it.status === 'error' || it.status === 'conflict') removeItem(it)
    }
  }

  const installOne = useCallback(
    async (item: QueueItem): Promise<boolean> => {
      if (!item.upload) return false
      const meta = item.upload.meta
      patch(item.key, { status: 'installing', progress: 0, error: undefined, result: undefined })
      const record = (res: InstallResult, ok: boolean) =>
        remember({
          name: res.name || item.name,
          label: res.label || meta.label || item.name,
          package: res.package || meta.package,
          at: Date.now(),
          ok,
        })
      try {
        const res = await api.installApk(item.upload.id, options)
        if (res.ok) {
          patch(item.key, { status: 'done', progress: 1, result: res })
          record(res, true)
          return true
        }
        const msg = res.error || res.output || 'install failed'
        const conflict = /UPDATE_INCOMPATIBLE|signatures do not match/i.test(msg)
        patch(item.key, {
          status: conflict ? 'conflict' : 'error',
          progress: 0,
          result: res,
          error: msg,
        })
        record(res, false)
        return false
      } catch (e) {
        patch(item.key, {
          status: 'error',
          progress: 0,
          error: e instanceof Error ? e.message : 'install failed',
        })
        return false
      }
    },
    [options, patch, remember]
  )

  const installAll = async () => {
    if (installLock.current) return
    const ready = queue.filter((it) => it.status === 'ready' && it.upload)
    if (!ready.length) return
    installLock.current = true
    let ok = 0
    try {
      for (const item of ready) {
        if (await installOne(item)) ok++
      }
      if (ok) toast.success(`installed ${ok} package${ok === 1 ? '' : 's'}`)
    } finally {
      installLock.current = false
    }
  }

  const uninstallAndRetry = async (item: QueueItem) => {
    const pkg = item.upload?.meta.package
    if (!pkg) return
    try {
      await api.uninstall(pkg)
      await installOne(item)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'uninstall failed', 'err')
    }
  }

  const readyCount = useMemo(() => queue.filter((it) => it.status === 'ready').length, [queue])
  const active = queue.some((it) => it.status === 'installing')

  return (
    <section className="space-y-6">
      <ScreenHeader
        title="Install"
        description="Drop APKs or split bundles, inspect them, then install. Files are staged on the server and removed after an hour."
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="size-4" />
            {info?.storageFree ? (
              <span>
                <span className="font-medium text-foreground">{info.storageFree}</span> free of{' '}
                {info.storageTotal}
              </span>
            ) : (
              <span>storage unknown</span>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="space-y-4">
          <Dropzone
            onFiles={addFiles}
            accept={ACCEPT}
            disabled={disabled}
            title="Drop APKs here"
            hint={
              <>
                or click to browse ·{' '}
                <span className="font-mono text-[11px]">.apk .xapk .apkm .apks</span> · multiple files welcome
              </>
            }
            icon={<PackagePlus className="size-5" />}
          />

          <InstallFlags options={options} onChange={setOptions} />
          <UrlCard disabled={disabled} notify={notify} onFetched={addUpload} />
          <PushCard disabled={disabled} notify={notify} />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <div className="space-y-1">
                <CardTitle className="text-sm">Queue</CardTitle>
                <CardDescription className="text-xs">
                  {queue.length ? `${queue.length} item${queue.length === 1 ? '' : 's'}` : 'Nothing staged yet.'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearFinished} disabled={!queue.length}>
                  Clear
                </Button>
                <Button size="sm" onClick={installAll} disabled={disabled || !readyCount || active}>
                  {active ? <Loader2 className="animate-spin" /> : <PackagePlus />}
                  Install {readyCount || ''}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {!queue.length && (
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-[13px] text-muted-foreground">
                  Add an APK to see its package, version and icon before installing.
                </div>
              )}
              {queue.map((item) => (
                <QueueRow
                  key={item.key}
                  item={item}
                  disabled={disabled}
                  confirm={prefs.confirmDestructive}
                  onRemove={() => removeItem(item)}
                  onRetry={() => void installOne(item)}
                  onUninstallRetry={() => void uninstallAndRetry(item)}
                />
              ))}
            </CardContent>
          </Card>

          <RecentCard recent={recent} />
        </div>
      </div>
    </section>
  )
}
