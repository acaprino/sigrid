// The `./table` entry of the package: a table of data that sorts and draws only the rows in sight. It is apart from the
// entry of the assemblies because it brings TanStack Table and TanStack Virtual with it: an app without such a table loads neither.
// The parts a table is drawn with (`Table`, `TableRow`, `TableCell`…) have no library under them and are primitives (`/primitives`).
export { DataTable, nextSort, type DataColumn, type DataSort, type DataTableProps } from './assemblies/DataTable'
