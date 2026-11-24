// The form a person signs in or signs up with, the same in every app, in three forms: `signIn` (an address and a
// password), `signUp` (the same, and a name when the app asks for one) and `link` (an address alone: the app sends a
// link that opens the account, and the form then says to look in the inbox).
// It asks for as little as it can: every field more costs people who would have signed up; what else the app needs
// is asked after, when they are in (a `Wizard`).
// Above the fields, when the app offers them, the accounts kept elsewhere («Continue with Acme»), each with its logo;
// then the word «or», then the fields. One solid button (R3): the form's own. The way to the other form, and to a
// forgotten password, are links under it.
// What is wrong is said under the field it is about, when the form is sent, and the focus goes to the first such
// field; a failure the server reports (`error`) is a note above the fields. While the app works (`busy`) the button
// waits in its place. The form knows no server: it gives the app what was written and the app answers.
import * as React from 'react'
import { cn } from '../lib/utils'
import { useWords } from '../words'
import { isEmailAddress } from '../internal/email'
import { Icon, type IconName } from '../icons'
import { Button } from '../primitives/button'
import { Input } from '../primitives/input'
import { Logo } from '../primitives/logo'
import { FormField } from '../components/form-field'
import { InputGroup, InputGroupButton } from '../components/input-group'
import { Note } from '../components/note'

/** Which form it is: signing in, signing up, or asking for a link that opens the account. */
export type AuthMode = 'signIn' | 'signUp' | 'link'

/** What the person wrote. `name` only when asked for; no `password` in the `link` form. */
export type AuthValues = { email: string; password?: string; name?: string }

/** An account kept elsewhere that the app lets a person go on with. */
export type AuthProvider = {
  id: string
  /** Its name («Acme»), said by its button («Continue with Acme»). */
  name: string
  /** The address of its logo (an SVG or a PNG the app serves). */
  logo?: string | undefined
  /** One of Sigrid's icons, drawn while the logo loads, or in its place. */
  icon?: IconName | undefined
}

/** The least characters a new password has, when the app does not say. */
export const AUTH_PASSWORD_MIN = 8

export type AuthFormProps = {
  mode: AuthMode
  /** The person asks for another form (the links under the button). Absent: no such links. */
  onModeChange?: ((mode: AuthMode) => void) | undefined
  /** The form was sent with nothing wrong in it. */
  onSubmit: (values: AuthValues, mode: AuthMode) => void
  /** The app is working on it: the button waits in its place. */
  busy?: boolean | undefined
  /** What the server answered when it refused («That address and password do not match»): a note above the fields. */
  error?: string | undefined
  /** In the `link` form, the address the link was sent to: the form then says where to look. Absent: the field. */
  sentTo?: string | undefined
  /** Signing up, also ask for a name. */
  askName?: boolean | undefined
  /** The accounts kept elsewhere, above the fields. */
  providers?: readonly AuthProvider[] | undefined
  onProvider?: ((id: string) => void) | undefined
  /** «Forgot your password?», under the password of the `signIn` form. Absent: no link. */
  onForgot?: (() => void) | undefined
  /** The least characters of a new password. Default 8. */
  passwordMin?: number | undefined
  /** The title of the form. Absent: the toolkit's words for its `mode`. */
  title?: string | undefined
  /** A line under the title: what signing up gives. */
  description?: string | undefined
  /** Its buttons answer the press. Absent: as `MotionProvider` says. */
  animated?: boolean | undefined
  className?: string | undefined
}

type Wrong = { name?: string; email?: string; password?: string }

/** The form a person signs in or signs up with. */
function AuthForm({ mode, onModeChange, onSubmit, busy = false, error, sentTo, askName = false, providers, onProvider, onForgot, passwordMin = AUTH_PASSWORD_MIN, title, description, animated, className }: AuthFormProps) {
  const words = useWords().auth
  const id = React.useId()
  const form = React.useRef<HTMLFormElement>(null)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [shown, setShown] = React.useState(false)
  // What was wrong when the form was last sent; a field is cleared of it as soon as it is written in again.
  const [wrong, setWrong] = React.useState<Wrong>({})
  const withName = mode === 'signUp' && askName
  const withPassword = mode !== 'link'
  const heading = title ?? (mode === 'signIn' ? words.signIn : mode === 'signUp' ? words.signUp : words.link)
  const action = mode === 'signIn' ? words.signIn : mode === 'signUp' ? words.signUp : words.sendLink

  const send = () => {
    if (busy) return
    const found: Wrong = {}
    if (withName && name.trim() === '') found.name = words.missingName
    if (!isEmailAddress(email)) found.email = words.invalidEmail
    // Signing in, any password is sent: only the server knows the right one. A new one has a least length.
    if (withPassword && (mode === 'signUp' ? password.length < passwordMin : password === '')) found.password = words.shortPassword(mode === 'signUp' ? passwordMin : 1)
    setWrong(found)
    const first = (['name', 'email', 'password'] as const).find((field) => found[field] !== undefined)
    if (first) {
      form.current?.ownerDocument.getElementById(`${id}-${first}`)?.focus()
      return
    }
    onSubmit({ email: email.trim(), ...(withPassword ? { password } : {}), ...(withName ? { name: name.trim() } : {}) }, mode)
  }

  const other = (to: AuthMode, question: string, link: string) => (
    <p data-slot="auth-form-other" className="text-sm text-ink-soft">
      {question}{' '}
      <Button type="button" variant="link" size="sm" className="h-auto min-w-0 p-0" onClick={() => onModeChange?.(to)}>
        {link}
      </Button>
    </p>
  )

  if (mode === 'link' && sentTo !== undefined) {
    return (
      <div data-slot="auth-form" data-mode={mode} role="status" className={cn('flex w-full max-w-sm min-w-0 flex-col gap-4', className)}>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-ink">{words.sentTitle}</h1>
          <p className="text-sm text-ink-soft wrap-anywhere">{words.sentText(sentTo)}</p>
        </div>
        {onModeChange ? (
          <Button type="button" variant="outline" animated={animated} className="self-start" onClick={() => onModeChange('link')}>
            {words.another}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <form
      ref={form}
      data-slot="auth-form"
      data-mode={mode}
      aria-labelledby={`${id}-title`}
      noValidate
      className={cn('flex w-full max-w-sm min-w-0 flex-col gap-4', className)}
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <div className="flex flex-col gap-1">
        <h1 id={`${id}-title`} className="text-xl font-semibold text-ink">
          {heading}
        </h1>
        {description ? <p className="text-sm text-ink-soft">{description}</p> : null}
      </div>
      {providers && providers.length > 0 ? (
        <>
          <div data-slot="auth-form-providers" className="flex flex-col gap-2">
            {providers.map((provider) => (
              <Button key={provider.id} type="button" variant="outline" disabled={busy} animated={animated} className="w-full" onClick={() => onProvider?.(provider.id)}>
                {provider.logo !== undefined ? <Logo src={provider.logo} icon={provider.icon} decorative /> : provider.icon !== undefined ? <Icon name={provider.icon} /> : null}
                {words.continueWith(provider.name)}
              </Button>
            ))}
          </div>
          <div data-slot="auth-form-or" className="flex items-center gap-3 text-xs text-ink-mute">
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
            {words.or}
            <span aria-hidden="true" className="h-px flex-1 bg-line" />
          </div>
        </>
      ) : null}
      {error ? <Note tone="error" title={error} /> : null}
      {withName ? (
        <FormField id={`${id}-name`} label={words.name} error={wrong.name} required>
          <Input value={name} autoComplete="name" disabled={busy} onChange={(event) => { setName(event.target.value); setWrong((now) => ({ ...now, name: undefined })) }} />
        </FormField>
      ) : null}
      <FormField id={`${id}-email`} label={words.email} error={wrong.email} required>
        <Input type="email" inputMode="email" value={email} autoComplete="email" disabled={busy} onChange={(event) => { setEmail(event.target.value); setWrong((now) => ({ ...now, email: undefined })) }} />
      </FormField>
      {withPassword ? (
        <div className="flex flex-col gap-1.5">
          <FormField id={`${id}-password`} label={words.password} error={wrong.password} required>
            <InputGroup
              type={shown ? 'text' : 'password'}
              value={password}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              disabled={busy}
              onChange={(event) => { setPassword(event.target.value); setWrong((now) => ({ ...now, password: undefined })) }}
              end={<InputGroupButton label={words.show} pressed={shown} onClick={() => setShown(!shown)} />}
            />
          </FormField>
          {mode === 'signIn' && onForgot ? (
            <Button type="button" variant="link" size="sm" className="h-auto min-w-0 self-start p-0" onClick={onForgot}>
              {words.forgot}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Button type="submit" loading={busy} animated={animated} className="w-full">
        {action}
      </Button>
      {onModeChange ? (mode === 'signUp' ? other('signIn', words.haveAccount, words.signIn) : other('signUp', words.noAccount, words.signUp)) : null}
    </form>
  )
}

export { AuthForm }
