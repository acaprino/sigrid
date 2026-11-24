# Design laws

How a screen made with the toolkit is designed and reviewed: twenty laws of how people use an interface, in the order
they are applied, each with what the toolkit already does for it and what is left to the app. The laws are Jon
Yablonski's Laws of UX, with progressive disclosure, recognition over recall and the default effect; the procedure
follows Charles Liu's `charles-design-laws` (MIT). `DESIGN.md` holds the rules of the look (R1 to R14), which a
program checks; these are about the use of a screen, and are checked by reading it and by using it.

## What is Sigrid's own

The laws are everybody's: a screen that follows them is clear, and looks like no one in particular. What makes an app
of the suite look like the suite is somewhere else, and no law may be used to take it away.

- **The sheet on the window's ground.** The title bar and the sidebar are the window; the work is one sheet laid on
  it, with a corner (`AppShell frame="sheet"`, Xiox's). No box inside the sheet repeats it.
- **Ink first, one accent.** The gray theme's accent is the ink itself. An app has one accent, and it says where the
  person is and what to press, nothing else (R2).
- **The chosen row.** A tint, stronger text and a short bar at its start (R1). Never a filled block of the accent,
  never an outline.
- **Lines and space, not boxes.** A group is told by the space around it, then by a hairline. A surface is flat; a
  shadow is only for what floats over the page (a menu, a dialog, a notice).
- **Keys as words.** A key is plain text beside its action and at the foot of the window, never a boxed cap (R5).
- **A fact by its form.** A level, a state or a kind is told by the form of its mark and by a word, never by a colour
  alone. A colour the person gave to a thing is an 8px dot (R10).
- **Still.** No glass, no gradient, no glow, nothing that loops. Motion answers a gesture, is short, and can be off.

A change that makes a screen clearer and keeps these is right. A change that makes it look like another product's
toolkit (a pill-shaped button, a coloured shadow, a second accent, a badge above every title) is wrong even when a law
seems to allow it.

## The procedure

Walk the steps in order on the screen as drawn, at 390px first when the app runs on a phone, then at the width most
people use. A later step never rescues an earlier one: a polished screen nobody can finish is still unfinished.

1. **Name the job.** One sentence for what the screen is for. The tasks people come to do, most used first. Every
   element, every question, every step. What a task needs and is not there.
2. **Cut what does not help.**
3. **Take work off people.**
4. **Group what belongs together.**
5. **Point the eye at one thing.**
6. **Carry people to the end.**
7. **Polish last.**
8. **Verify.** Five seconds on the screen, then away: its job and its one action can be named. Each task done as a
   new person: what was typed, chosen and remembered is counted. A task left halfway opens where it stopped.

## The laws, and where they live in the toolkit

| Step | Law | The toolkit does | The app does |
|---|---|---|---|
| 2 | Pareto: most use comes from few features | The `actions` region is read to its end, where the main action goes (`docs/patterns.md`); `OverflowList` cuts from the end | Ranks its actions by use; the top one is the solid button, the rest shrink into a menu |
| 2 | Occam: fewer parts are easier | No decoration to add: no eyebrow, no illustration in `Empty`, no caption under a heading | Covers each element in turn: if every task still works, it goes. A key shown on a control in sight is not repeated at the foot |
| 2 | Progressive disclosure | `Disclosure`: one row that opens in place and keeps what was written; `Inspector` for the details of one thing | Keeps in view what most people need on most visits; never hides a price, a required field or what a delete removes |
| 2 | Cognitive load | Units inside the field (`InputGroupText`); `Count`, `Badge` and `Steps` say their fact in words | Names, not codes. An icon alone only where everyone reads it the same way; otherwise the word. One task per screen |
| 2 | Prägnanz: the simplest form is read first | One edge per surface (R4), one radius per size (R7), one icon set, flat fills | Draws nothing of its own |
| 3 | Tesler: the app carries what it can | `DateField`, `DurationField`, `Combobox`, `Select`: controls that hold the format | Fills in what it knows, shown and editable. Asks only what it cannot know |
| 3 | Default effect | A component chooses nothing by itself: the value is the app's | Preselects what is best for most people; never what costs, shares or signs up; nothing where a wrong guess hurts |
| 3 | Recognition over recall | `CommandPalette` lists the commands before a letter is typed; `Combobox` and `ChipsInput` suggest; `ToolbarTitle` says where the person is | Puts recents first. Up to five choices are a `RadioGroup` or a `ToggleGroup`, never a closed `Select`. Never makes people carry a value from one screen to the next |
| 3 | Paradox of the active user: nobody reads the manual | `Empty` says what to do first and offers it; `FormField`'s `help` sits by its control; `Tooltip` names an icon | No tour before the first action |
| 3 | Parkinson: a task fills the time it is given | `Input` passes `autocomplete` to the field | Sets `autocomplete` on every field the system can fill; says how long a long task takes |
| 4 | Proximity | `FormField` (6px from a label to its control), `SidebarGroup` (2px between rows, 12px before a group), `Section`, the `gap` steps of `Column` and `Cluster` | Leaves between two groups at least twice the gap inside one |
| 4 | Common region | `Panel`, the sheet, `ToolbarGroup`, `Inspector` | One region, one group. Never a region in a region in a region |
| 4 | Uniform connectedness | `Steps` joins its dots with a line filled up to the current one | Draws no line between unrelated things |
| 4 | Similarity | One look per role: the `Button` variants, `link` underlined at rest like a link in a text, `destructive` for a delete only | Uses one variant for one role on a screen: `outline` for the second action, `ghost` for the third |
| 5 | Von Restorff: the odd one is seen | One solid button per view (R3); the accent kept for it and for where the person is (R2) | Has exactly one solid action per view, a dialog over it included |
| 5 | Serial position: first and last are remembered | The `actions` region ends on the main action; the sidebar opens on the main views | Orders by hand with the two most used at the ends; a list sorted by its data keeps its sort |
| 6 | Goal gradient | `Steps`, `Progress`, `ProgressSegments`, `ProgressRing` | Shows how far along and what is left on every step; counts work already done |
| 6 | Zeigarnik: the unfinished stays in mind | `Steps` keeps done, current and to come apart; `OverflowList` says «+2» | Saves as people go; opens where they stopped; takes a finished list away |
| 6 | Peak-end | `Empty` as the end of a task: what happened, what is next, one action. `Toasts` with Undo for one action that can be taken back | Ends a task of several steps on its result, never on a notice alone. Fixes the worst moment first |
| 7 | Aesthetic-usability | Every control has its hover, focus, pressed and disabled states, and a button its busy one (`loading`); no browser default reaches the screen | Judges steps 2 to 6 before the looks |

## Where the toolkit chooses otherwise

- **An icon on every navigation row, heading and menu entry (R6).** Occam's razor counts «an icon beside every
  label» among the usual extras. Here it is a function: the suite is made for people who find a row by its drawing
  before its word, and a row without one keeps the slot so the words stay in one column. An icon never stands alone
  where its meaning is not common to everyone.
- **A notice at the end of an action (R12).** Peak-end asks never to end on a notice that fades. One action that can
  be taken back is done at once and says so in a notice with Undo, which is faster than asking first. A task of
  several steps is a different thing and ends on its result.
- **The accent on the chosen row and on what is unread (R2).** Von Restorff asks for one thing that stands out. The
  solid button is that one; the tint of the chosen row is quieter than it and says where the person is, which is the
  other thing a person with little attention to spare must not lose.

## A review, written down

Open with the job and the tasks, then what is missing, then one row for each fix:

| Severity | Law | Where | Before | After |
|---|---|---|---|---|
| broken, friction or polish | The law whose rule names the problem | The screen and the file | What is there | What replaces it |

`broken`: a task fails or ends wrong. `friction`: it works, slower or harder than it needs to. `polish`: only the
looks. Sort by severity, then by the rank of the task.
