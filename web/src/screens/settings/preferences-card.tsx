import { setPrefs, usePrefs, type Theme } from '../../lib/prefs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SettingsRow, SettingsSection } from './parts'

export function PreferencesCard() {
  const prefs = usePrefs()

  return (
    <SettingsSection
      id="preferences"
      title="Preferences"
      description="Stored in this browser only."
    >
      <SettingsRow title="Theme" description="Follow the system or pin a mode.">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={prefs.theme}
          onValueChange={(v) => v && setPrefs({ theme: v as Theme })}
          className="w-[210px]"
        >
          <ToggleGroupItem value="dark" className="flex-1 text-xs">
            Dark
          </ToggleGroupItem>
          <ToggleGroupItem value="light" className="flex-1 text-xs">
            Light
          </ToggleGroupItem>
          <ToggleGroupItem value="system" className="flex-1 text-xs">
            System
          </ToggleGroupItem>
        </ToggleGroup>
      </SettingsRow>

      <SettingsRow title="Terminal font size" description="Applies to the shell and its scrollback.">
        <Select
          value={String(prefs.terminalFontSize)}
          onValueChange={(v) => setPrefs({ terminalFontSize: Number(v) })}
        >
          <SelectTrigger size="sm" className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[12, 13, 14, 16, 18].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow title="Screen refresh" description="How often the screenshot preview updates.">
        <Select
          value={String(prefs.screenshotInterval)}
          onValueChange={(v) => setPrefs({ screenshotInterval: Number(v) })}
        >
          <SelectTrigger size="sm" className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="600">Fast · 0.6s</SelectItem>
            <SelectItem value="1200">Normal · 1.2s</SelectItem>
            <SelectItem value="2500">Slow · 2.5s</SelectItem>
            <SelectItem value="5000">Battery · 5s</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        title="Confirm destructive actions"
        description="Ask before rebooting or discarding an upload."
      >
        <Switch
          checked={prefs.confirmDestructive}
          onCheckedChange={(v) => setPrefs({ confirmDestructive: v })}
        />
      </SettingsRow>

      <SettingsRow
        title="Reconnect the terminal"
        description="Retry automatically when the shell socket drops."
      >
        <Switch
          checked={prefs.terminalReconnect}
          onCheckedChange={(v) => setPrefs({ terminalReconnect: v })}
        />
      </SettingsRow>
    </SettingsSection>
  )
}
