// What an address of mail looks like, for the parts that take one (a message being written, a form to sign in).
// Only its shape: whether the address exists is the server's to say.

/** True for a text shaped as an address (`name@domain.tld`). */
export function isEmailAddress(value: string): boolean {
  return /^[^\s@<>(),;]+@[^\s@<>(),;]+\.[^\s@<>(),;.]+$/.test(value.trim())
}
