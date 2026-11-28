// A key sent again under another name, for a part whose library reads a key otherwise than the part means it (the
// slider's Up as the arrow that grows it, the toggle group's Left and Right swapped where it is written from the right,
// the tree's `a` as `A`): the part stops the key it got and sends this one from the same element. Limit: the new event
// is the page's own (`isTrusted` is false) and carries the key and the four modifiers only, not `code`, `repeat` or
// `location`; whatever listens above the element hears the new key, not the one pressed.

type Modifiers = Pick<KeyboardEvent, 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>

/** Sends `key` as a new keydown from `target`, with the modifiers of the key it stands for; false if a listener prevented it. */
export function resendKey(target: EventTarget, key: string, { shiftKey, ctrlKey, altKey, metaKey }: Modifiers): boolean {
  return target.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, ctrlKey, altKey, metaKey, bubbles: true, cancelable: true }))
}
