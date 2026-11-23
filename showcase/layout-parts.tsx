// The layout parts in the showcase (Components view): a piece of a page laid out with `Stack`, `Cluster`, `Split`,
// `Grid`, `Spacer`, `Section`, `ScrollArea`, `Page` and `Text` and no class of its own, as an app writes it. The frame
// around it (the showcase's `Section`, `Row`) is the showcase's.
import { Badge, Button, Cluster, Grid, Icon, Page as LayoutPage, ScrollArea, Section as LayoutSection, Spacer, Split, Stack, Text } from '../src/index'
import { Code, Row, Section } from './parts'

const FILES = ['src/retry.ts', 'src/charge.ts', 'src/webhooks.ts', 'src/dunning.ts', 'test/retry.spec.ts', 'test/charge.spec.ts', 'test/webhooks.spec.ts', 'README.md']

export function LayoutParts() {
  return (
    <Section
      id="layout"
      title="Stack, Cluster, Split, Grid, Section, ScrollArea, Page and Text"
      note={
        <>
          A screen laid out with no class of the app's own. Every space is a step of the scale (<Code>xs</Code> to <Code>xl</Code>); the parts take no
          class and no style.
        </>
      }
    >
      <Row label="a page">
        <div data-sample="layout" className="w-full max-w-4xl rounded-lg bg-paper shadow-xs">
          <LayoutPage>
            <Split>
              <Stack gap="xs">
                <Text variant="kicker">Pre-map</Text>
                <Text as="p">billing-service, the tree and its languages</Text>
              </Stack>
              <Cluster>
                <Button variant="outline" size="sm">
                  Refresh
                </Button>
                <Button size="sm">Analyse</Button>
              </Cluster>
            </Split>
            <Grid>
              <LayoutSection title="Files" icon={<Icon name="structure" />} end={<Badge variant="secondary">{FILES.length}</Badge>}>
                <ScrollArea aria-label="Files of billing-service" bounded>
                  <Stack as="ul" gap="xs">
                    {FILES.map((file) => (
                      <li key={file}>
                        <Text pre>{file}</Text>
                      </li>
                    ))}
                  </Stack>
                </ScrollArea>
              </LayoutSection>
              <LayoutSection title="Languages" icon={<Icon name="labels" />}>
                <Stack gap="xs">
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
                </Stack>
              </LayoutSection>
            </Grid>
          </LayoutPage>
        </div>
      </Row>
    </Section>
  )
}
