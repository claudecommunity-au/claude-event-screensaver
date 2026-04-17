import { z } from 'zod'

export const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/
export const dateRe = /^\d{4}-\d{2}-\d{2}$/

export const agendaItemSchema = z.object({
  time: z.string().regex(timeRe, 'HH:MM'),
  label: z.string().min(1, 'required'),
})

export const configInputSchema = z.object({
  subtitle: z.string().default('CODE CURIOUS'),
  event_date: z.string().regex(dateRe, 'YYYY-MM-DD').or(z.literal('')),
  venue: z.string(),
  wifi: z.string(),
  agenda: z.array(agendaItemSchema),
  verbs: z.array(z.string().min(1)),
  go_home_messages: z.array(z.string().min(1)),
  urgency_start_minutes_before_end: z.number().int().min(0).max(240),
})

export type ConfigInput = z.infer<typeof configInputSchema>

export const passwordBlockSchema = z.object({
  algo: z.literal('pbkdf2-sha256'),
  iters: z.number().int(),
  salt: z.string(),
  hash: z.string(),
})

export type PasswordBlock = z.infer<typeof passwordBlockSchema>

export const storedConfigSchema = configInputSchema.extend({
  id: z.string(),
  password: passwordBlockSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type StoredConfig = z.infer<typeof storedConfigSchema>

export type PublicConfig = Omit<StoredConfig, 'password'>

export const DEFAULT_VERBS = [
  'Reticulating splines...',
  'Compiling thoughts...',
  'Grepping for meaning...',
  'Rebasing reality...',
  'Initializing curiosity...',
  'Parsing the void...',
  'Optimizing vibes...',
  'Aligning tokens...',
  'Hydrating the cache...',
  'Unwinding the stack...',
  'Resolving dependencies...',
  'Defragmenting ideas...',
  'Warming up the neurons...',
  'Indexing possibilities...',
  'Negotiating with the compiler...',
  'Untangling spaghetti...',
  'Calibrating enthusiasm...',
  'Consulting the oracle...',
  'Deploying butterflies...',
  'Refactoring the universe...',
]

export const DEFAULT_GO_HOME_MESSAGES = [
  'Time to go home!',
  'Your sofa misses you',
  'The pub is calling...',
  'Last one out gets the light',
  "git commit -m 'gone home'",
]

export const DEFAULT_AGENDA = [
  { time: '18:25', label: 'Anthropic interview' },
  { time: '19:00', label: 'Group discussions' },
  { time: '23:59', label: 'Time to go home!' },
]

export const defaultConfigInput = (): ConfigInput => ({
  subtitle: 'CODE CURIOUS',
  event_date: '',
  venue: 'Granola',
  wifi: '',
  agenda: DEFAULT_AGENDA.map((a) => ({ ...a })),
  verbs: [...DEFAULT_VERBS],
  go_home_messages: [...DEFAULT_GO_HOME_MESSAGES],
  urgency_start_minutes_before_end: 40,
})
