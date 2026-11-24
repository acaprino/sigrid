// The parts of the flows a person goes through: the question before what cannot be undone (`ConfirmDialog`), a path
// of steps (`Wizard`), the form to sign in or up (`AuthForm`) and pictures looked at one at a time (`Lightbox`). Met
// through the roles and the words.
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, test, vi } from 'vitest'
import { WordsProvider } from '../src'
import { ConfirmDialog } from '../src/components'
import { AuthForm, Lightbox, Wizard, type AuthMode, type WizardStep } from '../src/assemblies'
import { settle } from './helpers'

describe('ConfirmDialog', () => {
  test('a named question with what is lost, «Cancel» in focus, and the action by its verb in red', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Delete the project?" description="Its 14 tasks go too. This cannot be undone." confirmLabel="Delete the project" onConfirm={onConfirm} />)
    await settle()
    await act(async () => void (await new Promise((done) => requestAnimationFrame(() => done(null)))))
    const dialog = screen.getByRole('dialog', { name: 'Delete the project?' })
    expect(within(dialog).getByText('Its 14 tasks go too. This cannot be undone.')).toBeTruthy()
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    expect(document.activeElement).toBe(cancel)
    const action = within(dialog).getByRole('button', { name: 'Delete the project' })
    expect(action.getAttribute('data-variant')).toBe('destructive')
    fireEvent.click(cancel)
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(action)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('while it is being done neither button acts again; an action that destroys nothing is the solid button', async () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Send to 240 people?" confirmLabel="Send" destructive={false} busy onConfirm={onConfirm} />)
    await settle()
    const action = screen.getByRole('button', { name: 'Send' })
    expect(action.getAttribute('data-variant')).toBe('default')
    expect(action.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Cancel' }).disabled).toBe(true)
  })
})

describe('Wizard', () => {
  const STEPS: WizardStep[] = [
    { id: 'plan', label: 'Plan', title: 'Choose a plan' },
    { id: 'account', label: 'Account', description: 'An address is all we need.' },
    { id: 'done', label: 'Check' },
  ]
  function Flow({ onFinish = () => {}, block = false }: { onFinish?: () => void; block?: boolean }) {
    const [at, setAt] = React.useState(0)
    return (
      <Wizard label="Signup" steps={STEPS.map((step, index) => (block && index === 0 ? { ...step, canContinue: false } : step))} current={at} onCurrentChange={setAt} onFinish={onFinish} finishLabel="Create the account">
        {(step) => <p>Body of {step.id}</p>}
      </Wizard>
    )
  }

  test('one step on the screen, with the path above it; «Back» is off on the first step and never leaves its place', () => {
    render(<Flow />)
    expect(screen.getByRole('list', { name: 'Signup' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Choose a plan' })).toBeTruthy()
    expect(screen.getByText('Body of plan')).toBeTruthy()
    expect(screen.queryByText('Body of account')).toBeNull()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Back' }).disabled).toBe(true)
  })

  test('«Continue» goes on, the title of the new step takes the focus, and the last step has the app\'s own word', () => {
    const onFinish = vi.fn()
    render(<Flow onFinish={onFinish} />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    const title = screen.getByRole('heading', { name: 'Account' })
    expect(document.activeElement).toBe(title)
    expect(screen.getByText('An address is all we need.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(onFinish).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create the account' }))
    expect(onFinish).toHaveBeenCalledTimes(1)
    // Back, and a step already done in the path, lead back.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Body of account')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Plan/ }))
    expect(screen.getByText('Body of plan')).toBeTruthy()
  })

  test('a step not answered yet keeps the person there', () => {
    render(<Flow block />)
    const next = screen.getByRole<HTMLButtonElement>('button', { name: 'Continue' })
    expect(next.disabled).toBe(true)
    fireEvent.submit(next.closest('form')!)
    expect(screen.getByText('Body of plan')).toBeTruthy()
  })
})

describe('AuthForm', () => {
  const write = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label, { exact: false, selector: 'input' }), { target: { value } })

  test('signing in: an address and a password, sent as written; one solid button', () => {
    const onSubmit = vi.fn()
    render(<AuthForm mode="signIn" onSubmit={onSubmit} />)
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeTruthy()
    write('Email', ' ada@example.com ')
    write('Password', 'x')
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'x' }, 'signIn')
  })

  test('what is wrong is said under its field, the focus goes to the first, and nothing is sent', () => {
    const onSubmit = vi.fn()
    render(<AuthForm mode="signUp" askName onSubmit={onSubmit} />)
    write('Email', 'ada')
    write('Password', 'short')
    fireEvent.click(screen.getByRole('button', { name: 'Create your account' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Write your name.')).toBeTruthy()
    expect(screen.getByText('Write an address like name@example.com.')).toBeTruthy()
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByLabelText('Name', { exact: false, selector: 'input' }))
    // Written in again, a field is no longer wrong.
    write('Name', 'Ada')
    expect(screen.queryByText('Write your name.')).toBeNull()
    write('Email', 'ada@example.com')
    write('Password', 'long enough')
    fireEvent.click(screen.getByRole('button', { name: 'Create your account' }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'long enough', name: 'Ada' }, 'signUp')
  })

  test('the link form asks for an address alone, and then says where to look', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<AuthForm mode="link" onSubmit={onSubmit} />)
    expect(screen.queryByLabelText('Password', { exact: false, selector: 'input' })).toBeNull()
    write('Email', 'ada@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Send me a link' }))
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ada@example.com' }, 'link')
    rerender(<AuthForm mode="link" sentTo="ada@example.com" onSubmit={onSubmit} />)
    expect(screen.getByRole('status').textContent).toContain('We sent a link to ada@example.com.')
  })

  test('the accounts kept elsewhere come first, then «or»; the links lead to the other form; a refusal is a note', () => {
    const onProvider = vi.fn()
    const onModeChange = vi.fn<(mode: AuthMode) => void>()
    const onForgot = vi.fn()
    render(<AuthForm mode="signIn" onSubmit={() => {}} providers={[{ id: 'acme', name: 'Acme', icon: 'key' }]} onProvider={onProvider} onModeChange={onModeChange} onForgot={onForgot} error="That address and password do not match" />)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Acme' }))
    expect(onProvider).toHaveBeenCalledWith('acme')
    expect(screen.getByText('or')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('That address and password do not match')
    fireEvent.click(screen.getByRole('button', { name: 'Create your account' }))
    expect(onModeChange).toHaveBeenCalledWith('signUp')
    fireEvent.click(screen.getByRole('button', { name: 'Forgot your password?' }))
    expect(onForgot).toHaveBeenCalledTimes(1)
    // One solid button: the form's own.
    expect(document.querySelectorAll('[data-slot="auth-form"] [data-variant="default"]')).toHaveLength(1)
  })

  test("the words are the app's", () => {
    render(
      <WordsProvider words={{ auth: { signIn: 'Accedi', email: 'Indirizzo' } }}>
        <AuthForm mode="signIn" onSubmit={() => {}} />
      </WordsProvider>,
    )
    expect(screen.getByRole('form', { name: 'Accedi' })).toBeTruthy()
    expect(screen.getByLabelText('Indirizzo', { exact: false, selector: 'input' })).toBeTruthy()
  })
})

describe('Lightbox', () => {
  const IMAGES = [
    { id: 'a', src: 'a.png', alt: 'The roof', caption: 'From the north' },
    { id: 'b', src: 'b.png', alt: 'The door' },
  ]
  function Box() {
    const [at, setAt] = React.useState(0)
    return <Lightbox open onOpenChange={() => {}} title="Photos of the site" images={IMAGES} index={at} onIndexChange={setAt} />
  }

  test('one picture with its caption and its place among the others; the buttons and the arrows move, and stop at the ends', async () => {
    render(<Box />)
    await settle()
    const dialog = screen.getByRole('dialog', { name: 'Photos of the site' })
    expect(within(dialog).getByRole('img', { name: 'The roof' })).toBeTruthy()
    expect(within(dialog).getByText('From the north')).toBeTruthy()
    expect(within(dialog).getByRole('status').textContent).toBe('1 of 2')
    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Previous picture' }).disabled).toBe(true)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Next picture' }))
    expect(within(dialog).getByRole('img', { name: 'The door' })).toBeTruthy()
    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Next picture' }).disabled).toBe(true)
    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(within(dialog).getByRole('status').textContent).toBe('2 of 2')
    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(within(dialog).getByRole('img', { name: 'The roof' })).toBeTruthy()
  })
})

describe('the small parts beside them', () => {
  test('a row of tabs that scrolls marks its edges and keeps its tabs from shrinking; a sheet at the foot shows its handle', async () => {
    const { Sheet, SheetContent, SheetTitle, Tabs, TabsList, TabsTrigger } = await import('../src/primitives')
    const { unmount } = render(
      <Tabs value="a" onValueChange={() => {}}>
        <TabsList aria-label="Filters" scroll>
          <TabsTrigger value="a">All</TabsTrigger>
          <TabsTrigger value="b">Open</TabsTrigger>
        </TabsList>
      </Tabs>,
    )
    const list = screen.getByRole('tablist', { name: 'Filters' })
    expect(list.getAttribute('data-scroll-shade')).toBe('x')
    expect(list.className).toMatch(/overflow-x-auto/)
    unmount()
    for (const [side, handles] of [['bottom', 1], ['right', 0]] as const) {
      const sheet = render(
        <Sheet open>
          <SheetContent side={side}>
            <SheetTitle>Details</SheetTitle>
          </SheetContent>
        </Sheet>,
      )
      await settle()
      expect(document.querySelectorAll('[data-slot="sheet-handle"]'), side).toHaveLength(handles)
      sheet.unmount()
    }
  })

  test('the example apps written by hand go out with the package as they are', async () => {
    const { readFileSync, readdirSync } = await import('node:fs')
    const written = readdirSync('showcase/written').filter((name) => name.endsWith('.tsx'))
    expect(written).toContain('signup.tsx')
    for (const name of written) {
      const [about, ...rest] = readFileSync(`showcase/written/${name}`, 'utf8').split('\n')
      const out = readFileSync(`agents/examples/${name}`, 'utf8')
      expect(out.startsWith(`${about}\n`)).toBe(true)
      expect(out.endsWith(rest.join('\n'))).toBe(true)
      // An app, as an app imports the package: nothing from the source by its path, and no class of its own.
      expect(out).not.toMatch(/from '\.\.?\//)
      expect(out).not.toMatch(/className=/)
    }
  })
})
