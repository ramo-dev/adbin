import { Download, LayoutGrid, Monitor, Play, Settings, Terminal, type LucideIcon } from 'lucide-react'

export type Tab = 'apps' | 'remote' | 'screen' | 'install' | 'shell' | 'settings'

export const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'apps', label: 'Apps', icon: LayoutGrid },
  { id: 'remote', label: 'Remote', icon: Play },
  { id: 'screen', label: 'Screen', icon: Monitor },
  { id: 'install', label: 'Install', icon: Download },
  { id: 'shell', label: 'Shell', icon: Terminal },
  { id: 'settings', label: 'Settings', icon: Settings },
]
