// Signup: Signing in or up, then the few questions of a first setup, one at a time: a plan, a workspace, a check. The form, the path of steps and the question before what cannot be undone are assemblies of the toolkit; the app holds the answers.
import { useState } from 'react'
import { useDesktopGuard, useMedia } from '@acaprino/sigrid'
import { Button, Card, Column, Input, Page, Text } from '@acaprino/sigrid/primitives'
import { ConfirmDialog, DescriptionList, Empty, FormField, Toasts, type ToastItem } from '@acaprino/sigrid/components'
import { AppShell, TitleBar, Toolbar, ToolbarBrand, WindowControls } from '@acaprino/sigrid/layout'
import { AuthForm, ChoiceCard, ChoiceCards, ChoiceGroup, Wizard, type AuthMode, type WizardStep } from '@acaprino/sigrid/assemblies'
import { DRAG_REGION, readHost, useWindowControls } from '@acaprino/sigrid/tauri'

type Stage = 'account' | 'setup' | 'in'
type Plan = 'free' | 'team' | 'company'
const PLANS: Record<Plan, { name: string; note: string; price: string }> = {
  free: { name: 'Free', note: 'One person, three projects', price: '0' },
  team: { name: 'Team', note: 'Ten people, every project', price: '12' },
  company: { name: 'Company', note: 'Everyone, with single sign-on', price: '29' },
}
// Where the app runs: a Tauri window of its own on a computer, or a browser (or a phone, where the system draws the window).
const HOST = readHost()

export function App() {
  const [stage, setStage] = useState<Stage>('account')
  const [mode, setMode] = useState<AuthMode>('signUp')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(0)
  const [plan, setPlan] = useState<Plan>('team')
  const [workspace, setWorkspace] = useState('')
  const [asking, setAsking] = useState(false)
  const [notices, setNotices] = useState<ToastItem[]>([])
  // Under this width the frame is laid out as on a phone.
  const narrow = useMedia('(width < 620px)')
  // A window of its own on a computer: the app draws the window's bar, and takes the browser's own keys away.
  const ownWindow = HOST.ownWindow && !narrow
  useDesktopGuard(ownWindow)
  const windowControls = useWindowControls({ enabled: ownWindow })
  const say = (text: string) => setNotices((list) => [...list, { id: crypto.randomUUID(), text }])

  const steps: WizardStep[] = [
    { id: 'plan', label: 'Plan', title: 'Choose a plan', description: 'It can be changed at any time.' },
    { id: 'workspace', label: 'Workspace', title: 'Name your workspace', description: 'Where your projects live.', canContinue: workspace.trim() !== '' },
    { id: 'check', label: 'Check', title: 'Check and start' },
  ]

  const account = (
    <Column gap="lg" pad="lg" align="center">
      <AuthForm
        mode={mode}
        // Another form starts clean: no address the link was sent to.
        onModeChange={(next) => {
          setMode(next)
          setSentTo(undefined)
        }}
        busy={busy}
        sentTo={sentTo}
        askName
        description={mode === 'signUp' ? 'Two minutes, and no card.' : undefined}
        providers={[{ id: 'acme', name: 'Acme', icon: 'key' }]}
        onProvider={() => setStage('setup')}
        onForgot={() => setMode('link')}
        onSubmit={(values, sent) => {
          // The app talks to its server here; this one only waits a moment.
          setBusy(true)
          setTimeout(() => {
            setBusy(false)
            setEmail(values.email)
            if (sent === 'link') setSentTo(values.email)
            else setStage(sent === 'signUp' ? 'setup' : 'in')
          }, 800)
        }}
      />
    </Column>
  )

  const setup = (
    <Column gap="lg" pad="lg" width="prose">
      <Wizard
        label="Setup"
        steps={steps}
        current={step}
        onCurrentChange={setStep}
        finishLabel="Start"
        onFinish={() => {
          setStage('in')
          say(`${workspace} is ready`)
        }}
      >
        {(now) =>
          now.id === 'plan' ? (
            <ChoiceGroup id="signup-plan" label="Plan" hint="Per person, each month." level={4}>
              <ChoiceCards labelledBy="signup-plan">
                {(Object.keys(PLANS) as Plan[]).map((id) => (
                  <ChoiceCard key={id} choice={plan === id} name={PLANS[id].name} note={PLANS[id].note} detail={PLANS[id].price} onChoose={() => setPlan(id)} />
                ))}
              </ChoiceCards>
            </ChoiceGroup>
          ) : now.id === 'workspace' ? (
            <FormField label="Name" help="Your team sees it at the top of every page.">
              <Input value={workspace} placeholder="Northwind" autoComplete="organization" onChange={(event) => setWorkspace(event.target.value)} />
            </FormField>
          ) : (
            <Card variant="quiet">
              <DescriptionList
                aria-label="What you chose"
                items={[
                  { name: 'Account', value: email || 'Acme' },
                  { name: 'Plan', value: PLANS[plan].name },
                  { name: 'Workspace', value: workspace },
                ]}
              />
            </Card>
          )
        }
      </Wizard>
    </Column>
  )

  const signedIn = (
    <Page>
      <Empty
        fill
        title="You are in"
        description={workspace ? `${workspace}, on the ${PLANS[plan].name} plan.` : 'Welcome back.'}
        action={
          <Button variant="outline" onClick={() => setAsking(true)}>
            Delete the account
          </Button>
        }
      />
      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title="Delete the account?"
        description="The workspace and its projects are deleted with it. This cannot be undone."
        confirmLabel="Delete the account"
        onConfirm={() => {
          setAsking(false)
          setStage('account')
          setStep(0)
          setWorkspace('')
          say('The account was deleted')
        }}
      />
    </Page>
  )

  return (
    <>
      <AppShell
        desktop={ownWindow}
        contentLabel="Signup"
        titleBar={
          <TitleBar dragProps={ownWindow ? DRAG_REGION : undefined} windowControls={ownWindow ? <WindowControls {...windowControls} /> : undefined}>
            <Toolbar aria-label="Signup">
              <ToolbarBrand name="Signup" />
            </Toolbar>
          </TitleBar>
        }
      >
        {stage === 'account' ? account : stage === 'setup' ? setup : signedIn}
        {stage === 'account' ? (
          <Column pad="lg" align="center">
            <Text variant="note">An example: nothing is sent anywhere.</Text>
          </Column>
        ) : null}
      </AppShell>
      <Toasts items={notices} durationMs={5000} onDismiss={(id) => setNotices((list) => list.filter((notice) => notice.id !== id))} />
    </>
  )
}
