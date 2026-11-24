// The `./virtual` entry of the package: a long list of which only the rows in sight are drawn. It is apart from the
// main entry because it brings TanStack Virtual with it: an app with short lists does not load it.
export { VirtualList, type VirtualListProps } from './assemblies/virtual-list'
