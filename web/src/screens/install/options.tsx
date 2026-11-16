import type { InstallOptions } from '../../api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

export function InstallFlags({
  options,
  onChange,
}: {
  options: InstallOptions
  onChange: (next: InstallOptions) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Install flags</CardTitle>
        <CardDescription className="text-xs">Applies to every install in this queue.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        <FlagRow
          label="Reinstall"
          flag="-r"
          hint="Replace an existing install and keep its data."
          checked={options.reinstall}
          onChange={(v) => onChange({ ...options, reinstall: v })}
        />
        <Separator className="opacity-60" />
        <FlagRow
          label="Allow downgrade"
          flag="-d"
          hint="Needed when the device has a newer version."
          checked={options.downgrade}
          onChange={(v) => onChange({ ...options, downgrade: v })}
        />
        <Separator className="opacity-60" />
        <FlagRow
          label="Grant all permissions"
          flag="-g"
          hint="Grants every runtime permission at install time."
          checked={options.grantAll}
          onChange={(v) => onChange({ ...options, grantAll: v })}
        />
      </CardContent>
    </Card>
  )
}

function FlagRow({
  label,
  flag,
  hint,
  checked,
  onChange,
}: {
  label: string
  flag: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{label}</span>
          <Badge variant="outline" className="px-1.5 py-0 font-mono text-[10px] text-muted-foreground">
            {flag}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
