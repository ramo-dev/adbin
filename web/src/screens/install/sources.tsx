import { useState } from 'react'
import { FolderDown, Link2, Loader2, UploadCloud } from 'lucide-react'

import { api, type Upload } from '../../api'
import type { Notify } from '../../lib/runner'
import { Dropzone } from '@/components/dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'

export function UrlCard({
  disabled,
  notify,
  onFetched,
}: {
  disabled: boolean
  notify: Notify
  onFetched: (upload: Upload) => void
}) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const fetch = async () => {
    const target = url.trim()
    if (!target) return
    setBusy(true)
    try {
      const { file } = await api.fetchApk(target)
      onFetched(file)
      setUrl('')
      notify('downloaded, ready to install')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'download failed', 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Link2 className="size-4 text-muted-foreground" />
          From a URL
        </CardTitle>
        <CardDescription className="text-xs">
          The server downloads it, then you install from the queue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="h-8 font-mono text-xs"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/app.apk"
            onKeyDown={(e) => e.key === 'Enter' && fetch()}
            disabled={disabled || busy}
          />
          <Button size="sm" onClick={fetch} disabled={disabled || busy || !url.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Link2 />}
            Fetch
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function PushCard({ disabled, notify }: { disabled: boolean; notify: Notify }) {
  const [dir, setDir] = useState('/sdcard/Download')
  const [pushing, setPushing] = useState<{ name: string; progress: number }[]>([])

  const push = (files: File[]) => {
    if (disabled) {
      notify('connect a device first', 'err')
      return
    }
    for (const file of files) {
      const key = `${file.name}-${Date.now()}`
      setPushing((p) => [...p, { name: key, progress: 0 }])
      api
        .pushFile(file, dir.trim() || '/sdcard/Download', (ratio) =>
          setPushing((p) => p.map((x) => (x.name === key ? { ...x, progress: ratio } : x)))
        )
        .then((res) => {
          const remote = res.pushed[0]?.remote
          notify(remote ? `pushed to ${remote}` : 'file pushed')
          setPushing((p) => p.filter((x) => x.name !== key))
        })
        .catch((e: unknown) => {
          notify(e instanceof Error ? e.message : 'push failed', 'err')
          setPushing((p) => p.filter((x) => x.name !== key))
        })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FolderDown className="size-4 text-muted-foreground" />
          Send a file to the device
        </CardTitle>
        <CardDescription className="text-xs">
          Anything else — configs, logs, APKs for another installer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label htmlFor="push-dir" className="shrink-0 text-xs text-muted-foreground">
            Destination
          </Label>
          <Input
            id="push-dir"
            className="h-8 font-mono text-xs"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            placeholder="/sdcard/Download"
          />
        </div>
        <Dropzone
          onFiles={push}
          disabled={disabled}
          title="Drop any file"
          hint="pushed with adb push"
          className="py-8"
          icon={<UploadCloud className="size-5" />}
        />
        {pushing.map((p) => (
          <div key={p.name} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-mono">{p.name.replace(/-\d+$/, '')}</span>
              <span className="tabular-nums text-muted-foreground">{Math.round(p.progress * 100)}%</span>
            </div>
            <Progress value={p.progress * 100} />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
