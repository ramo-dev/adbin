import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type RebootMode = 'system' | 'recovery' | 'bootloader'

export function RebootDialog({
  open,
  onOpenChange,
  mode,
  onMode,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: RebootMode
  onMode: (mode: RebootMode) => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reboot the device?</AlertDialogTitle>
          <AlertDialogDescription>
            The TV will drop off ADB. Wireless debugging may need to be re-enabled on the device
            before you can reconnect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label>Mode</Label>
          <Select value={mode} onValueChange={(v) => onMode(v as RebootMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">System (normal restart)</SelectItem>
              <SelectItem value="recovery">Recovery</SelectItem>
              <SelectItem value="bootloader">Bootloader</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reboot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
