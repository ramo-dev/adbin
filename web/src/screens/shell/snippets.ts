export type SnippetGroup = {
  group: string
  items: string[]
}

export const SNIPPETS: SnippetGroup[] = [
  {
    group: 'Device',
    items: [
      'getprop ro.product.model',
      'wm size',
      'dumpsys battery',
      'uptime',
      'getprop ro.build.version.release',
    ],
  },
  {
    group: 'Packages',
    items: [
      'pm list packages -3',
      'pm path com.example.app',
      'dumpsys package com.example.app',
      'pm clear',
    ],
  },
  {
    group: 'Files',
    items: ['ls -la /sdcard/Download', 'df -h /data', 'du -sh /sdcard/*', 'ls -la /data/local/tmp'],
  },
  {
    group: 'Network',
    items: ['ip addr show wlan0', 'settings get global http_proxy', 'ping -c 3 1.1.1.1'],
  },
  {
    group: 'Power',
    items: ['input keyevent KEYCODE_WAKEUP', 'input keyevent KEYCODE_SLEEP', 'reboot'],
  },
]
