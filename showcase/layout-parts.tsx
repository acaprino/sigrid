// The layout parts in the showcase (Components view): a piece of a page laid out with `Column`, `Cluster`, `Split`,
// `Grid`, `Cell`, `Spacer`, `Section`, `ScrollArea`, `Page` and `Text` and no class of its own, as an app writes it.
// The frame around it (the showcase's `Section`, `Row`) is the showcase's. Under the page, the three things one part
// asks for itself (`Cell`): two columns of a grid, its own line in a row and the room the others leave; and a page of
// a few large parts, told apart by the large steps of the scale.
import { Avatar, Badge, Button, Card, Cell, Cluster, Grid, Icon, Input, Column, Page as LayoutPage, ScrollArea, Section as LayoutSection, Spacer, Split, Text, TextList, Textarea } from '../src/primitives'
import { Code, Row, Section } from './parts'

const FILES = ['src/retry.ts', 'src/charge.ts', 'src/webhooks.ts', 'src/dunning.ts', 'test/retry.spec.ts', 'test/charge.spec.ts', 'test/webhooks.spec.ts', 'README.md']

export function LayoutParts() {
  return (
    <Section
      id="layout"
      title="Column, Cluster, Split, Grid, Cell, Section, ScrollArea, Page, Text and TextList"
      note={
        <>
          A screen laid out with no class of the app's own. Every space is a step of the scale (<Code>xs</Code> to <Code>xl</Code> where the work is,{' '}
          <Code>2xl</Code> to <Code>4xl</Code> between the few large parts of a page read once); the parts take no class and no style.
        </>
      }
    >
      <Row label="a page">
        <div data-sample="layout" className="w-full max-w-4xl rounded-lg bg-paper shadow-xs">
          <LayoutPage>
            <Split>
              <Column gap="xs">
                <Text variant="kicker">Pre-map</Text>
                <Text as="p">billing-service, the tree and its languages</Text>
              </Column>
              <Cluster>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
                <Button size="sm">Analyse</Button>
              </Cluster>
            </Split>
            <Grid>
              <LayoutSection level={3} title="Files" icon={<Icon name="structure" />} end={<Badge variant="secondary">{FILES.length}</Badge>}>
                <ScrollArea aria-label="Files of billing-service" bounded>
                  <Column as="ul" gap="xs">
                    {FILES.map((file) => (
                      <li key={file}>
                        <Text pre>{file}</Text>
                      </li>
                    ))}
                  </Column>
                </ScrollArea>
              </LayoutSection>
              <LayoutSection level={3} title="Languages" icon={<Icon name="labels" />}>
                <Column gap="xs">
                  <Cluster>
                    <Text>TypeScript</Text>
                    <Spacer />
                    <Text variant="muted">82%</Text>
                  </Cluster>
                  <Cluster>
                    <Text>Markdown</Text>
                    <Spacer />
                    <Text variant="muted">18%</Text>
                  </Cluster>
                  <Text variant="caption">Counted on the files of the last commit.</Text>
                </Column>
              </LayoutSection>
            </Grid>
          </LayoutPage>
        </div>
      </Row>
      <Row label="text: cut, monospace, a status, a list">
        <div data-sample="layout-text" className="w-full max-w-sm rounded-lg bg-paper shadow-xs">
          <Column pad="lg" gap="md">
            <Column gap="xs">
              <Text truncate variant="strong">
                billing-service, the tree, its languages and every file of the last commit
              </Text>
              <Text truncate mono title="C:/work/billing-service/src/webhooks/retry-with-backoff.ts">
                C:/work/billing-service/src/webhooks/retry-with-backoff.ts
              </Text>
            </Column>
            <Text mono>C:/work/billing-service/logs/2026-11-25T09-41-07-run-42.log</Text>
            <Cluster gap="lg">
              <Text tone="success" variant="note">
                Up to date
              </Text>
              <Text tone="warning" variant="note">
                Needs a build
              </Text>
              <Text tone="danger" variant="note">
                Could not be read
              </Text>
              <Text tone="info" variant="note">
                Checked today
              </Text>
            </Cluster>
            <Cluster>
              <Text>Installed</Text>
              <Spacer />
              <Text variant="muted" aria-hidden="true">
                –
              </Text>
              <Text srOnly>Not installed here</Text>
            </Cluster>
            <Text as="div" variant="soft">
              <TextList aria-label="Open questions" items={['Which plan is retried first?', 'Who is told when a charge fails twice?']} />
            </Text>
            <Text as="div" variant="soft">
              <TextList ordered aria-label="Steps" items={['Read the webhook', 'Charge again', 'Tell the owner']} />
            </Text>
          </Column>
        </div>
      </Row>
      <Row label="a link in a line, fields for code, a short field">
        <div data-sample="layout-fields" className="w-full max-w-sm rounded-lg bg-paper shadow-xs">
          <Column pad="lg" gap="md">
            <Text as="p" variant="soft">
              Built from{' '}
              <Button variant="link" size="inline">
                billing-service
              </Button>{' '}
              this morning.
            </Text>
            <Button variant="link" size="inline">
              <Text truncate>a-plugin-with-a-very-long-name-that-does-not-fit-on-one-line-of-this-card</Text>
            </Button>
            <Input mono aria-label="Folder" defaultValue="C:/work/billing-service" />
            <Input short="xs" inputMode="decimal" aria-label="Budget" defaultValue="250" />
            <Textarea mono maxRows={4} aria-label="Changelog" defaultValue={'1.2.0\n- retries with backoff\n- a webhook for failed charges\n1.1.0\n- dunning\n1.0.0\n- first release'} />
          </Column>
        </div>
      </Row>
      <Row label="a cell of two columns">
        <div data-sample="layout-span" className="w-full max-w-4xl rounded-lg bg-paper shadow-xs">
          <LayoutPage>
            <Grid min="sm">
              <Cell span={2}>
                <Card variant="quiet">
                  <Text variant="kicker">Retries by day</Text>
                  <Text as="p" variant="soft">
                    A chart asks for more room than a number: this cell is two columns wide where the grid has two, and one where it has one.
                  </Text>
                </Card>
              </Cell>
              <Card variant="quiet">
                <Text variant="kicker">Charged</Text>
                <Text variant="strong">1 284</Text>
              </Card>
              <Card variant="quiet">
                <Text variant="kicker">Retried</Text>
                <Text variant="strong">112</Text>
              </Card>
              <Card variant="quiet">
                <Text variant="kicker">Failed</Text>
                <Text variant="strong">37</Text>
              </Card>
              <Cell span="full">
                <Text variant="note">Counted on the last 30 days. This line is a whole row of the grid at any width.</Text>
              </Cell>
            </Grid>
          </LayoutPage>
        </div>
      </Row>
      <Row label="a part's own place">
        <div data-sample="layout-cell" className="w-full max-w-4xl rounded-lg bg-paper shadow-xs">
          <LayoutPage>
            <Cluster align="start" wrap={false} gap="md">
              <Avatar name="Ada Moretti" decorative />
              <Cell grow>
                <Column gap="xs">
                  <Text variant="strong">Ada Moretti</Text>
                  <Text as="p" variant="soft">
                    The row lines its parts up at the top, so the picture stays beside the name however long the message runs. The words take the room
                    the picture and the button leave, and the button alone sits at the foot of the row.
                  </Text>
                </Column>
              </Cell>
              <Cell align="end">
                <Button variant="outline" size="sm">
                  Reply
                </Button>
              </Cell>
            </Cluster>
          </LayoutPage>
        </div>
      </Row>
      <Row label="a few large parts">
        <div data-sample="layout-room" className="w-full max-w-4xl rounded-lg bg-paper shadow-xs">
          <Column gap="3xl" pad="2xl">
            <Column gap="xs">
              <Text variant="kicker">Welcome</Text>
              <Text variant="strong">Billing is connected</Text>
              <Text variant="muted">Two things to set before the first charge.</Text>
            </Column>
            <Grid min="sm" gap="2xl">
              <Column align="start">
                <Text variant="strong">Retry rules</Text>
                <Text as="p" variant="soft">
                  When a failed charge is tried again, and how many times.
                </Text>
                <Button variant="outline" size="sm">
                  Set the rules
                </Button>
              </Column>
              <Column align="start">
                <Text variant="strong">Receipts</Text>
                <Text as="p" variant="soft">
                  What a customer is sent after each charge.
                </Text>
                <Button variant="outline" size="sm">
                  Choose a template
                </Button>
              </Column>
            </Grid>
          </Column>
        </div>
      </Row>
    </Section>
  )
}
