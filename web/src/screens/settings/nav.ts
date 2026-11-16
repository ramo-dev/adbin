import {
  Cpu,
  MonitorSmartphone,
  Radar,
  Server,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'

export type SettingsNavItem = { id: string; label: string; icon: LucideIcon }

export const NAV_GROUPS: { title: string; items: SettingsNavItem[] }[] = [
  {
    title: 'Device',
    items: [
      { id: 'device', label: 'General', icon: MonitorSmartphone },
      { id: 'connection', label: 'Connection', icon: Radar },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
      { id: 'client', label: 'Client', icon: Server },
    ],
  },
  {
    title: 'System',
    items: [{ id: 'server', label: 'Server', icon: Cpu }],
  },
]
