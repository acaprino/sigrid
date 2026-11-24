// A list the user puts in order: each row has a handle that moves it, with the pointer, a finger or the keyboard. The
// behaviour is dnd-kit's (`@dnd-kit/core` and `@dnd-kit/sortable`, npm dependencies, pinned: THIRD_PARTY.md); the form
// is the toolkit's. It has its own entry of the package (`./reorder`), so an app with no such list does not load it.
// - The handle is the only thing that drags: the rest of the row keeps its presses, its fields and its text.
//   With the keyboard: Space takes the row, the arrows move it, Space puts it down, Escape puts it back. Screen
//   readers hear where it is at each step, in the app's words (`words.reorder`). While a row is taken, Escape is
//   the list's: a dialog or a sheet the list is in stays open.
// - The row taken is raised on the sheet colour with the `float` elevation and no border (R4), and follows the pointer
//   up and down only. The others make room for it: at once, or sliding in 200ms where the app has motion on
//   (`animated`, or `MotionProvider`), never with reduced motion.
// - The list is the app's: `onReorder` gives the new order and the app keeps it. Nothing is kept here.
import * as React from "react"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type Announcements, type DragEndEvent, type UniqueIdentifier } from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import { cn } from "../lib/utils"
import { Button, QUIET_ICON } from "../primitives/button"
import { useMotion } from "../internal/motion"
import { useWords } from "../words"

export type ReorderListProps<Item> = {
  /** Name of the list for screen readers («Columns»). */
  "aria-label": string
  items: readonly Item[]
  /** What tells an item from the others. */
  itemId: (item: Item) => string
  /** The name of an item: of its handle («Move Inbox»), and what screen readers hear while it moves. */
  itemName: (item: Item) => string
  /** The new order, and the place the item left and the one it took, counted from 0. */
  onReorder: (items: Item[], move: { from: number; to: number }) => void
  /** What a row shows beside its handle. */
  children: (item: Item) => React.ReactNode
  /** The rows slide to make room (off by default, never with prefers-reduced-motion). */
  animated?: boolean | undefined
  className?: string | undefined
}

/** `items` with the one at `from` moved to `to`. */
export function moveItem<Item>(items: readonly Item[], from: number, to: number): Item[] {
  return arrayMove([...items], from, to)
}

const ROW = "relative flex min-h-(--row-height) items-center gap-2 rounded-md pe-3 text-sm text-ink pointer-coarse:min-h-11"

function ReorderRow({ id, name, moving, children }: { id: string; name: string; moving: boolean; children: React.ReactNode }) {
  const words = useWords()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, attributes: { roleDescription: words.reorder.role } })
  return (
    <li
      ref={setNodeRef}
      data-slot="reorder-row"
      data-dragging={isDragging ? "" : undefined}
      // Up and down only: the row keeps its place across.
      style={{ transform: CSS.Translate.toString(transform ? { ...transform, x: 0 } : null), transition: moving ? transition : undefined }}
      className={cn(ROW, isDragging && "z-10 bg-raised shadow-float")}
    >
      <Button
        ref={setActivatorNodeRef}
        variant="ghost"
        size="icon-xs"
        data-slot="reorder-handle"
        {...attributes}
        {...listeners}
        aria-label={words.reorder.handle(name)}
        className={cn("touch-none", QUIET_ICON)}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </Button>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </li>
  )
}

function ReorderList<Item>({ items, itemId, itemName, onReorder, children, animated, className, ...props }: ReorderListProps<Item>) {
  const words = useWords()
  const moving = useMotion(animated) !== null
  const ids = React.useMemo(() => items.map(itemId), [items, itemId])
  // A small move before a drag starts, so a press on the handle is still a press.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const at = (id: UniqueIdentifier) => ids.indexOf(String(id))
  const name = (id: UniqueIdentifier) => {
    const item = items[at(id)]
    return item === undefined ? "" : itemName(item)
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => words.reorder.taken(name(active.id), at(active.id) + 1, ids.length),
    onDragOver: ({ active, over }) => (over ? words.reorder.moved(name(active.id), at(over.id) + 1, ids.length) : undefined),
    onDragEnd: ({ active, over }) => (over ? words.reorder.put(name(active.id), at(over.id) + 1, ids.length) : words.reorder.back(name(active.id))),
    onDragCancel: ({ active }) => words.reorder.back(name(active.id)),
  }
  // A row is taken: until it is put down or put back, Escape means «put it back» and nothing else.
  const taken = React.useRef(false)
  const id = React.useId()
  const end = ({ active, over }: DragEndEvent) => {
    taken.current = false
    if (!over || active.id === over.id) return
    const from = at(active.id)
    const to = at(over.id)
    if (from < 0 || to < 0) return
    onReorder(moveItem(items, from, to), { from, to })
  }
  return (
    <DndContext id={id} sensors={sensors} collisionDetection={closestCenter} onDragStart={() => { taken.current = true }} onDragCancel={() => { taken.current = false }} onDragEnd={end} accessibility={{ announcements, screenReaderInstructions: { draggable: words.reorder.instructions } }}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul
          role="list"
          data-slot="reorder-list"
          {...props}
          // The key still reaches the library, which listens on the document; what the list is in does not hear it.
          onKeyDown={(event) => {
            if (taken.current && event.key === "Escape") event.stopPropagation()
          }}
          className={cn("flex flex-col gap-0.5", className)}
        >
          {items.map((item) => {
            const id = itemId(item)
            return (
              <ReorderRow key={id} id={id} name={itemName(item)} moving={moving}>
                {children(item)}
              </ReorderRow>
            )
          })}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export { ReorderList }
