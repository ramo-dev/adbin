import { Eye, EyeOff } from 'lucide-react'

import type { ServerConfig } from '../../api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SettingsBlock, SettingsRow, SettingsSection } from './parts'

export function ClientCard({
  config,
  base,
  onBase,
  token,
  onToken,
  showToken,
  onToggleToken,
  onSave,
}: {
  config: ServerConfig | null
  base: string
  onBase: (v: string) => void
  token: string
  onToken: (v: string) => void
  showToken: boolean
  onToggleToken: () => void
  onSave: () => void
}) {
  return (
    <SettingsSection
      id="client"
      title="Client"
      description="Where this app sends its requests. Leave the base empty when served by the Go server."
    >
      <SettingsRow title="API base URL" htmlFor="base" description="Optional override for remote hosting.">
        <Input
          id="base"
          className="h-8 w-[280px] max-w-full font-mono text-xs"
          value={base}
          onChange={(e) => onBase(e.target.value)}
          placeholder="(same origin)"
        />
      </SettingsRow>

      <SettingsRow
        title="Auth token"
        htmlFor="token"
        description={
          config?.tokenRequired ? 'This server requires a token.' : 'No token configured on the server.'
        }
      >
        <div className="flex gap-2">
          <Input
            id="token"
            type={showToken ? 'text' : 'password'}
            className="h-8 w-[190px] font-mono text-xs"
            value={token}
            onChange={(e) => onToken(e.target.value)}
            placeholder="optional"
            autoComplete="off"
          />
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={onToggleToken}
            title={showToken ? 'Hide token' : 'Show token'}
          >
            {showToken ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      </SettingsRow>

      <SettingsBlock>
        <Button size="sm" onClick={onSave}>
          Save client settings
        </Button>
      </SettingsBlock>
    </SettingsSection>
  )
}
