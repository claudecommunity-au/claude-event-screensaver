import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5))

export function TimePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [h = '', m = ''] = value.split(':')
  const update = (nh: string, nm: string) => {
    if (nh && nm) onChange(`${nh}:${nm}`)
  }
  return (
    <div className="flex items-center gap-1">
      <Select value={h} onValueChange={(nh) => update(nh, m || '00')}>
        <SelectTrigger className="w-[72px]">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((hh) => (
            <SelectItem key={hh} value={hh}>
              {hh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={m} onValueChange={(nm) => update(h || '00', nm)}>
        <SelectTrigger className="w-[72px]">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {MINUTES.map((mm) => (
            <SelectItem key={mm} value={mm}>
              {mm}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
