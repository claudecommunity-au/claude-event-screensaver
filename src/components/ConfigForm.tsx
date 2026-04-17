import { useForm, useFieldArray, Controller, type Resolver, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { configInputSchema, type ConfigInput } from '@/lib/schema'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'

export type PasswordFields =
  | { mode: 'create' }
  | { mode: 'edit-optional' }
  | { mode: 'none' }

const passwordSchemaCreate = z
  .object({
    password: z.string().min(4, 'min 4 chars'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const passwordSchemaEdit = z
  .object({
    newPassword: z.string().optional(),
    confirm: z.string().optional(),
  })
  .refine((d) => !d.newPassword || d.newPassword.length >= 4, {
    message: 'min 4 chars',
    path: ['newPassword'],
  })
  .refine((d) => !d.newPassword || d.newPassword === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type CreateFormValues = ConfigInput & { password: string; confirm: string }
type EditFormValues = ConfigInput & { newPassword?: string; confirm?: string }
type FormValues = ConfigInput & {
  password?: string
  confirm?: string
  newPassword?: string
}

export function ConfigForm({
  defaultValues,
  passwordMode,
  onSubmit,
  submitting,
  submitLabel,
}: {
  defaultValues: ConfigInput
  passwordMode: PasswordFields
  onSubmit: (values: { config: ConfigInput; password?: string; newPassword?: string }) => void
  submitting?: boolean
  submitLabel: string
}) {
  const schema =
    passwordMode.mode === 'create'
      ? configInputSchema.and(passwordSchemaCreate)
      : passwordMode.mode === 'edit-optional'
        ? configInputSchema.and(passwordSchemaEdit)
        : configInputSchema

  // zodResolver + RHF generic inference is finicky; cast through any.
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as unknown as Resolver<FormValues>,
    defaultValues: { ...defaultValues } as FormValues,
  })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form

  const agenda = useFieldArray({ control, name: 'agenda' })
  const verbs = useFieldArray({ control, name: 'verbs' as never })
  const goHome = useFieldArray({ control, name: 'go_home_messages' as never })

  const submit = (values: FormValues) => {
    const { password, confirm: _c, newPassword, ...config } = values
    void _c
    onSubmit({
      config: config as ConfigInput,
      password: passwordMode.mode === 'create' ? password : undefined,
      newPassword: passwordMode.mode === 'edit-optional' ? newPassword : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6 max-w-3xl mx-auto p-6 pr-40">
      <div className="fixed top-4 right-4 z-50">
        <Button type="submit" disabled={submitting} className="shadow-lg">
          {submitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input id="subtitle" {...register('subtitle')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Event date</Label>
          <Controller
            control={control}
            name="event_date"
            render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
          />
          {errors.event_date && (
            <p className="text-sm text-destructive">{errors.event_date.message as string}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="venue">Venue</Label>
          <Input id="venue" {...register('venue')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wifi">WiFi</Label>
        <Input id="wifi" {...register('wifi')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="urg">Urgency start (minutes before end)</Label>
        <Input
          id="urg"
          type="number"
          min={0}
          max={240}
          {...register('urgency_start_minutes_before_end', { valueAsNumber: true })}
        />
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Agenda</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => agenda.append({ time: '18:00', label: '' })}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="space-y-2">
          {agenda.fields.map((field, idx) => (
            <div key={field.id} className="flex items-start gap-2">
              <Controller
                control={control}
                name={`agenda.${idx}.time`}
                render={({ field: f }) => <TimePicker value={f.value} onChange={f.onChange} />}
              />
              <Input placeholder="Label" className="flex-1" {...register(`agenda.${idx}.label`)} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={idx === 0}
                onClick={() => agenda.move(idx, idx - 1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={idx === agenda.fields.length - 1}
                onClick={() => agenda.move(idx, idx + 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => agenda.remove(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Thinking words</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => verbs.prepend('' as never)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="space-y-2">
          {verbs.fields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input {...register(`verbs.${idx}` as const)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => verbs.remove(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <details className="space-y-3">
        <summary className="cursor-pointer font-semibold">Go-home messages</summary>
        <div className="mt-3 space-y-2">
          {goHome.fields.map((field, idx) => (
            <div key={field.id} className="flex items-center gap-2">
              <Input {...register(`go_home_messages.${idx}` as const)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => goHome.remove(idx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => goHome.append('' as never)}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </details>

      {passwordMode.mode === 'create' && <PasswordCreateFields form={form} />}
      {passwordMode.mode === 'edit-optional' && <PasswordEditFields form={form} />}

    </form>
  )
}

function PasswordCreateFields({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = form
  return (
    <section className="space-y-3 border-t pt-4">
      <h2 className="font-semibold">Admin password</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" {...register('password' as keyof FormValues)} />
          {(errors as Record<string, { message?: string }>).password?.message && (
            <p className="text-sm text-destructive">
              {(errors as Record<string, { message?: string }>).password!.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">Confirm</Label>
          <Input id="pw2" type="password" {...register('confirm' as keyof FormValues)} />
          {(errors as Record<string, { message?: string }>).confirm?.message && (
            <p className="text-sm text-destructive">
              {(errors as Record<string, { message?: string }>).confirm!.message}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function PasswordEditFields({ form }: { form: UseFormReturn<FormValues> }) {
  const {
    register,
    formState: { errors },
  } = form
  return (
    <section className="space-y-3 border-t pt-4">
      <h2 className="font-semibold">Change password (optional)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="npw">New password</Label>
          <Input id="npw" type="password" {...register('newPassword' as keyof FormValues)} />
          {(errors as Record<string, { message?: string }>).newPassword?.message && (
            <p className="text-sm text-destructive">
              {(errors as Record<string, { message?: string }>).newPassword!.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="npw2">Confirm</Label>
          <Input id="npw2" type="password" {...register('confirm' as keyof FormValues)} />
          {(errors as Record<string, { message?: string }>).confirm?.message && (
            <p className="text-sm text-destructive">
              {(errors as Record<string, { message?: string }>).confirm!.message}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

// type assertion helpers kept for clarity of intent in places above
export type { CreateFormValues, EditFormValues }
