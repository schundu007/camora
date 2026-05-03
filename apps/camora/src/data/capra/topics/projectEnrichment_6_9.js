// Enrichment data for projects 6-9: frontend challenges (no dataModel or apiDesign)

export const enrichment_6_9 = {

  'design-system-library': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Toolchain & Token Foundation',
        description: 'Set up the build toolchain with Vite library mode, configure Tailwind CSS with design tokens, and scaffold Storybook.',
        tasks: [
          'Initialize with Vite library mode: build.lib config exporting UMD + ESM bundles, peer deps React/ReactDOM',
          'Configure Tailwind CSS with a design tokens theme: color palette, spacing scale, typography, border radius, shadows',
          'Set up CSS variables for theming: --color-primary, --color-surface, --color-text in :root and [data-theme="dark"]',
          'Scaffold Storybook 8 with @storybook/react-vite, accessibility addon, dark mode toggle decorator',
          'Configure path aliases, TypeScript strict mode, and eslint-plugin-jsx-a11y for accessibility linting',
        ],
      },
      {
        phase: 2,
        title: 'Core Primitive Components',
        description: 'Build Button, Input, Select, and Checkbox — the primitives everything else is composed from.',
        tasks: [
          'Button: variants (primary, secondary, ghost, destructive), sizes (sm, md, lg), loading spinner, disabled state, polymorphic "as" prop via forwardRef',
          'Input: label, placeholder, helper text, error message, prefix/suffix slots, controlled + uncontrolled modes',
          'Select: built on Radix UI Select primitive — searchable, multi-select, option groups, portal rendering',
          'Checkbox and Radio: Radix UI primitives, indeterminate state for Checkbox, accessible label association',
          'Use cva (class-variance-authority) for variant prop mapping; forward all native HTML attributes via rest spread',
        ],
      },
      {
        phase: 3,
        title: 'Composite Components',
        description: 'Build Modal, Toast, DataTable, and Form components using compound component patterns.',
        tasks: [
          'Modal: Radix UI Dialog, focus trap, Escape-to-close, animate-in/out with Tailwind data-state attributes',
          'Toast: Radix UI Toast with portal, auto-dismiss timer, pause-on-hover, stacking with vertical offset, 4 severity variants',
          'DataTable: compound component <Table><Table.Header><Table.Body><Table.Row><Table.Cell>, sortable column headers, row selection via checkbox',
          'Form: React Hook Form context provider + Zod resolver, <Form.Field> wraps any Input with label/error wiring, <Form.Submit> tracks isSubmitting',
          'Write Storybook stories for all components: Default, all variants, interactive controls, and an a11y audit tab',
        ],
      },
      {
        phase: 4,
        title: 'Documentation & Package Publishing',
        description: 'Write Storybook MDX docs, generate TypeScript declaration files, and configure npm package publishing.',
        tasks: [
          'Write MDX documentation pages per component: usage examples, dos/don\'ts, props table from TypeScript types',
          'Configure vite-plugin-dts to emit .d.ts files alongside the built bundle',
          'Set up package.json exports map: { ".": { import, require, types } } for proper ESM/CJS resolution',
          'Add Chromatic (visual regression testing) to CI — snapshot each story and block PRs on visual diffs',
          'Write a theming guide: how to override CSS variables for a custom brand without modifying source',
        ],
      },
    ],

    fileStructure: `design-system-library/
├── src/
│   ├── tokens/
│   │   ├── colors.ts            # Color palette constants
│   │   ├── spacing.ts           # Spacing scale
│   │   └── index.css            # CSS variable definitions
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.stories.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   │   ├── Input.tsx
│   │   │   ├── Input.stories.tsx
│   │   │   └── index.ts
│   │   ├── Select/
│   │   │   ├── Select.tsx       # Radix UI Select wrapper
│   │   │   ├── Select.stories.tsx
│   │   │   └── index.ts
│   │   ├── Modal/
│   │   │   ├── Modal.tsx        # Radix UI Dialog wrapper
│   │   │   ├── Modal.stories.tsx
│   │   │   └── index.ts
│   │   ├── Toast/
│   │   │   ├── Toast.tsx        # Radix UI Toast
│   │   │   ├── ToastProvider.tsx
│   │   │   ├── useToast.ts
│   │   │   └── index.ts
│   │   ├── DataTable/
│   │   │   ├── DataTable.tsx
│   │   │   ├── DataTable.stories.tsx
│   │   │   └── index.ts
│   │   └── Form/
│   │       ├── Form.tsx
│   │       ├── FormField.tsx
│   │       └── index.ts
│   ├── utils/
│   │   ├── cn.ts                # clsx + twMerge utility
│   │   └── variants.ts          # cva config helpers
│   └── index.ts                 # Public API re-exports
├── .storybook/
│   ├── main.ts
│   ├── preview.ts               # Global decorators + a11y addon
│   └── themes.ts                # Storybook dark/light theme
├── vite.config.ts               # Library build config
├── tailwind.config.ts
├── tsconfig.json
└── package.json`,

    architectureLayers: [
      { name: 'Design Token Layer', description: 'CSS custom properties define the visual language: color, spacing, typography, border radius, shadow. Tokens are the source of truth — all components reference variables, never hard-coded values. Switching themes means changing CSS variable values, not component code.' },
      { name: 'Primitive Layer', description: 'Headless accessibility primitives from Radix UI provide keyboard navigation, ARIA semantics, and focus management for complex interactive components (Select, Dialog, Toast, Checkbox). These handle the hard accessibility work so component authors do not need to reimplement it.' },
      { name: 'Variant System Layer', description: 'class-variance-authority (cva) maps TypeScript enum props to Tailwind class sets. Each component defines its own cva schema with variants and compound variants. This keeps variant logic co-located with the component and generates fully type-checked prop interfaces.' },
      { name: 'Component Layer', description: 'Components are built as forwardRef wrappers that spread native HTML attributes, apply variant classes via cva, and compose Radix UI primitives. Compound components use React Context to share state between parent and children (e.g., Form and Form.Field).' },
      { name: 'Documentation Layer', description: 'Storybook stories serve as living documentation, interactive playground, and automated test surface. The a11y addon runs axe-core on each story, flagging WCAG violations in CI. MDX files provide prose documentation alongside interactive examples.' },
    ],

    codeExamples: {
      typescript: `// src/components/Button/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  // Base classes applied to all variants
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
  'transition-colors focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:     'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:       'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:     'border border-input bg-background hover:bg-accent',
      },
      size: {
        sm: 'h-8  px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';`,
    },

    tradeoffDecisions: [
      {
        choice: 'Accessibility primitives: Radix UI vs Headless UI vs build from scratch',
        picked: 'Radix UI',
        reason: 'Radix UI provides unstyled, fully accessible primitives for every complex component pattern (Dialog, Select, Toast, Popover). Building focus traps, ARIA attributes, and keyboard navigation from scratch for a Select component takes days and has subtle bugs. Radix UI is battle-tested, WAI-ARIA compliant, and framework-agnostic. Headless UI is also good but only for Tailwind CSS projects; Radix UI works with any styling approach.',
      },
      {
        choice: 'Variant system: cva vs manual class strings vs styled-components',
        picked: 'cva (class-variance-authority)',
        reason: 'Manual class strings (long ternary chains) are unreadable and do not generate TypeScript types for variant props. styled-components adds runtime CSS-in-JS overhead and conflicts with Tailwind. cva generates TypeScript types from variant definitions, produces clean Tailwind classes, integrates with twMerge for safe class overrides, and has zero runtime overhead beyond string concatenation.',
      },
      {
        choice: 'Bundle format: ESM only vs dual ESM + CJS',
        picked: 'Dual ESM + CJS via Vite library mode',
        reason: 'Many tools (Jest, older Next.js configs, CRA) still require CJS. Shipping only ESM breaks these consumers. Vite library mode builds both formats in a single pass with one config. The package.json exports map routes modern bundlers to ESM and older tooling to CJS. TypeScript declarations are generated once and shared between both.',
      },
      {
        choice: 'Component documentation: Storybook vs Docusaurus vs custom MDX site',
        picked: 'Storybook',
        reason: 'Storybook co-locates stories with component code, automatically generates interactive prop controls from TypeScript types, runs the a11y addon for automated accessibility testing, and integrates with Chromatic for visual regression CI. Docusaurus is better for prose-heavy documentation sites. Storybook is the industry standard for component libraries specifically.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Compound Component Pattern with Context',
        detail: 'Compound components like <Form><Form.Field name="email"><Input /></Form.Field></Form> share state through React Context rather than prop drilling. The parent component creates a context with shared state (register, errors, isSubmitting). Child components (Form.Field, Form.Submit) consume this context. This creates a composable API where consumers can rearrange children without breaking functionality. The key is exporting child components as static properties on the parent: Form.Field = FormField.',
      },
      {
        topic: 'WAI-ARIA Patterns and Keyboard Navigation',
        detail: 'Each interactive component type has a defined ARIA pattern. For a listbox (Select): role="listbox" on the container, role="option" on each item, aria-selected on the active option, aria-activedescendant pointing to the focused option ID. Keyboard: Up/Down arrows move focus, Enter/Space select, type-ahead jumps to matching option. Focus must be managed programmatically (element.focus()) on open and on selection. Radix UI implements all this, but understanding it is what interviewers test.',
      },
      {
        topic: 'CSS-in-JS vs Tailwind vs CSS Modules for Component Libraries',
        detail: 'CSS-in-JS (styled-components, Emotion) generates unique class names at runtime, enabling dynamic styling based on props — but adds bundle size and can conflict with SSR hydration. CSS Modules generate static unique class names at build time — great for isolation but verbose. Tailwind utility classes are the most portable: they work in any consumer project without requiring the consumer to install a CSS runtime. The tradeoff is utility class verbosity, solved by cva for variant management.',
      },
      {
        topic: 'Peer Dependencies and Bundle Size',
        detail: 'A component library should declare React and ReactDOM as peerDependencies (not dependencies). This prevents duplicate React instances when the consumer already has React installed — duplicate React causes hooks to fail with "Invalid hook call." Similarly, do not bundle Tailwind CSS into the library output; consumers should have it installed. Only bundle code that is truly unique to the library. Use bundlesize or size-limit in CI to prevent accidental bundle bloat.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Forgetting to forward refs',
        why: 'Without forwardRef, parent components cannot attach a ref to library components. This breaks focus management (modal.focus()), form library integration (react-hook-form uses refs for field registration), and animation libraries that need DOM access.',
        solution: 'Wrap every component with forwardRef. Set displayName on the forwardRef result for readable React DevTools labels. For compound components, forward the ref to the root element of each sub-component.',
      },
      {
        pitfall: 'Hardcoding colors instead of using CSS variables',
        why: 'bg-blue-500 in Tailwind cannot be overridden by consumers without modifying source. If a consumer brand uses green as the primary color, every blue hardcode requires a fork.',
        solution: 'Map all colors to CSS variables in the Tailwind theme config: colors: { primary: \'var(--color-primary)\' }. Consumers override --color-primary in their stylesheet. This makes theming possible without touching library code.',
      },
      {
        pitfall: 'Testing only with mouse interaction',
        why: 'An accessible component must be fully operable via keyboard alone. A dropdown that only opens on click is broken for keyboard users (and fails WCAG 2.1 Level A). Screen reader users rely on correct ARIA attributes that are not visible in visual testing.',
        solution: 'Write tests using @testing-library/user-event (keyboard events, not just clicks). Run the Storybook a11y addon (axe-core) on every story in CI. Manually test keyboard navigation: Tab, Arrow keys, Enter, Escape, Shift+Tab. Add VoiceOver/NVDA testing for complex components.',
      },
      {
        pitfall: 'Exporting internal implementation details',
        why: 'Exporting every internal helper, hook, and type creates an oversized public API. Consumers depend on internals, making it impossible to refactor without breaking changes.',
        solution: 'Only export from index.ts what consumers need: component, its props type, and any composable sub-components. Keep internal utilities, context objects, and Radix UI primitive props as non-exported. Use barrel exports to control the public surface explicitly.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Consumer overrides className and it conflicts with variant classes',
        impact: 'If a consumer passes className="bg-red-500" to a Button with variant="primary" (which also sets a background color), CSS specificity determines which wins — not always the consumer\'s intent.',
        mitigation: 'Use twMerge in the cn() utility: it intelligently deduplicates conflicting Tailwind classes, keeping the last one (consumer\'s override wins). cn(buttonVariants({ variant }), className) with twMerge ensures the consumer\'s className always takes precedence over variant classes.',
      },
      {
        scenario: 'Modal rendered inside an element with overflow: hidden',
        impact: 'A modal rendered in the DOM as a child of an overflow:hidden container is clipped, appearing partially or fully invisible.',
        mitigation: 'Use Radix UI\'s portal rendering: Dialog.Portal renders the modal content into document.body regardless of DOM nesting. This ensures the overlay and content are never clipped by parent element styles.',
      },
      {
        scenario: 'Multiple Toast notifications stacking incorrectly in Safari',
        impact: 'Safari handles CSS transforms and z-index stacking differently in some cases. Toasts that animate in with transform: translateY may appear behind other toasts or in wrong positions.',
        mitigation: 'Test all animation states in Safari explicitly. Use Radix UI Toast\'s built-in swipe-to-dismiss and stacking logic, which is tested cross-browser. Avoid custom CSS animations that override Radix UI\'s data-state attribute animations without testing in Safari and Firefox.',
      },
      {
        scenario: 'TypeScript generics for DataTable column definitions',
        impact: 'A DataTable that accepts columns={[{ key: "name", render: (row) => row.name }]} needs the row type to be inferred from the data prop. Without generics, row is typed as unknown and consumers lose type safety.',
        mitigation: 'Make DataTable generic: function DataTable<T>({ data, columns }: DataTableProps<T>). Column type: { key: keyof T, header: string, render?: (row: T) => React.ReactNode }. TypeScript infers T from the data prop and validates column keys and render functions automatically.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How do you handle breaking changes in a published component library?',
        answer: 'Follow semantic versioning strictly: breaking API changes bump the major version. Before breaking, publish a deprecation warning in the old API (console.warn in development builds) for one major version cycle. Provide a codemod (jscodeshift transform) that automatically migrates consumer code. Write a migration guide in the changelog. For internal libraries, coordinate with consuming teams before releasing.',
      },
      {
        question: 'How would you implement dark mode support?',
        answer: 'Define all colors as CSS variables with two sets of values: :root for light and [data-theme="dark"] (or .dark) for dark mode. Toggle the attribute on the <html> element. Components reference only CSS variables — they automatically switch when the attribute changes. Support prefers-color-scheme media query for automatic system-preference detection. Store user preference in localStorage and apply it before first paint to prevent flash.',
      },
      {
        question: 'How do you ensure the library works with server-side rendering (Next.js)?',
        answer: 'Avoid accessing browser globals (window, document, localStorage) at module level — only access them inside useEffect or event handlers. Radix UI handles SSR gracefully. For client-only components (ones that must run in the browser), use dynamic imports with ssr: false in Next.js. Test with next build and verify no "document is not defined" errors during the build.',
      },
      {
        question: 'What is the difference between a controlled and uncontrolled component, and which should a library prefer?',
        answer: 'Controlled: state is owned by the parent, passed via value prop, changed via onChange. Uncontrolled: state is owned internally, optionally seeded via defaultValue. Libraries should support both via the "uncontrolled with defaultValue" pattern: if value is provided, component is controlled; if only defaultValue is provided (or neither), it manages its own state internally. This is what native HTML inputs do, and what React Hook Form expects.',
      },
    ],

    extensionIdeas: [
      { idea: 'Figma token sync pipeline', difficulty: 'advanced', description: 'Use the Figma Variables API to export design tokens (colors, spacing, typography) from Figma directly into the library\'s CSS variables file. Run this as a CI step: on merge to main, pull latest tokens from Figma, update tokens/index.css, and open a PR with the diff for review.' },
      { idea: 'Visual regression testing with Chromatic', difficulty: 'beginner', description: 'Connect the Storybook to Chromatic (free tier for open-source). On each PR, Chromatic snapshots every story and diffs against the baseline. Visual changes require explicit approval before merging. Prevents accidental style regressions from Tailwind class changes or CSS variable updates.' },
      { idea: 'CLI scaffold tool for new components', difficulty: 'intermediate', description: 'Build a pnpm exec create-component <Name> CLI that scaffolds the full component structure: Component.tsx with forwardRef and cva, Component.stories.tsx with Default story and controls, index.ts re-export, and adds the export to src/index.ts automatically.' },
      { idea: 'Runtime theme switching with CSS-in-JS tokens', difficulty: 'intermediate', description: 'Add a ThemeProvider component that accepts a theme object and applies it as inline CSS variables on a wrapper element. This enables per-subtree theming (a white-label section of the app uses a different brand color without affecting the rest). Useful for multi-tenant applications.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'virtual-scroll-table': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Virtual Scroll Engine',
        description: 'Set up TanStack Virtual and build the core virtualized row rendering loop.',
        tasks: [
          'Install @tanstack/react-virtual; generate 100K row mock dataset with faker.js',
          'Create useVirtualizer hook wrapper: estimateSize=40, overscan=10, getScrollElement pointing to table body ref',
          'Render only virtualizer.getVirtualItems() rows; set the row wrapper to position:absolute with transform:translateY',
          'Set the scroll container to height:600px overflow-y:auto; set the inner spacer div to height:virtualizer.getTotalSize()',
          'Verify rendering: DevTools should show ~30 DOM rows regardless of 100K dataset size',
        ],
      },
      {
        phase: 2,
        title: 'Sort & Filter System',
        description: 'Build multi-column sort and per-column filter with memoized computation.',
        tasks: [
          'Implement sort state: [{ id: colId, desc: boolean }] — click column header cycles asc → desc → none',
          'Write stable multi-column sort comparator using Array.prototype.sort with reduce over sort state',
          'Build filter state: { [colId]: string | string[] | [min,max] } per column type (text, enum, range)',
          'Memoize the filter → sort pipeline with useMemo; input is raw data, output is displayRows array',
          'Pre-index enum columns on data load: Map<colId, Set<distinctValue>> for O(1) filter set operations',
        ],
      },
      {
        phase: 3,
        title: 'Column Resizing & Pinning',
        description: 'Add drag-to-resize column handles and left-column pinning.',
        tasks: [
          'Store column widths in state: { [colId]: number } with min=50 and max=600 constraints',
          'Attach mousedown to resize handle; track delta via mousemove on document; update width on mouseup',
          'Render table using CSS Grid with grid-template-columns set from column widths state',
          'Implement column pinning: pinned columns use position:sticky with left offset computed from preceding pinned widths',
          'Persist column widths and pinned state to localStorage; restore on mount',
        ],
      },
      {
        phase: 4,
        title: 'Row Selection & Export',
        description: 'Multi-row selection with shift-click range, bulk actions, and CSV export.',
        tasks: [
          'Store selected rows as Set<rowId>; toggle single rows on checkbox click',
          'Implement shift+click range selection: track lastClickedIndex, select all rows between last and current',
          '"Select all" checkbox selects only filtered rows (not all 100K); show count in sticky header bar',
          'Build CSV export: serialize selectedRows (or all filtered rows) to CSV string, trigger Blob download',
          'Add bulk action bar: appears when selection > 0, shows count and action buttons (export, delete, tag)',
        ],
      },
    ],

    fileStructure: `virtual-scroll-table/
├── src/
│   ├── components/
│   │   ├── VirtualTable/
│   │   │   ├── VirtualTable.tsx      # Main component
│   │   │   ├── TableHeader.tsx       # Sticky header with sort/resize
│   │   │   ├── VirtualRow.tsx        # Single virtualized row
│   │   │   ├── ColumnFilter.tsx      # Per-column filter popover
│   │   │   ├── SelectionBar.tsx      # Bulk action bar
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── Checkbox.tsx
│   │       └── Popover.tsx
│   ├── hooks/
│   │   ├── useVirtualTable.ts        # Main table state orchestrator
│   │   ├── useSortFilter.ts          # Sort + filter + memo pipeline
│   │   ├── useColumnResize.ts        # Mouse drag resize logic
│   │   ├── useRowSelection.ts        # Set-based selection + shift-click
│   │   └── useColumnIndex.ts         # Enum pre-indexing
│   ├── utils/
│   │   ├── sort.ts                   # Multi-column stable sort
│   │   ├── filter.ts                 # Filter evaluators per type
│   │   ├── csv.ts                    # Row array → CSV string
│   │   └── mockData.ts               # 100K row generator
│   ├── types/
│   │   └── table.ts                  # ColumnDef, SortState, FilterState
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json`,

    architectureLayers: [
      { name: 'Data Layer', description: 'Raw row data is immutable after load. Sort and filter produce a new displayRows array via memoized computation. The virtualizer receives displayRows.length to know the total scrollable height, but only receives the visible slice for rendering.' },
      { name: 'Virtualization Layer', description: 'TanStack Virtual\'s useVirtualizer calculates which row indices are visible given the current scroll position and container height. It returns virtual items with index, start (pixel offset), and size properties. Only these rows are rendered in the DOM.' },
      { name: 'Sort/Filter Layer', description: 'Sort state and filter state are plain objects stored in useState. A single useMemo computes the filtered-then-sorted displayRows. The memo only re-runs when data, sortState, or filterState changes — not on scroll or resize.' },
      { name: 'Layout Layer', description: 'The table uses CSS Grid for column widths (grid-template-columns: 50px 200px 150px ...). The scroll container has a fixed height with overflow-y: auto. Rows are absolutely positioned within a tall spacer div equal to virtualizer.getTotalSize().' },
      { name: 'Interaction Layer', description: 'Column sorting, filtering, resizing, and row selection are handled by separate hooks. Each hook manages its own state slice and exposes a clean interface. The VirtualTable component composes these hooks without containing business logic itself.' },
    ],

    codeExamples: {
      typescript: `// src/hooks/useSortFilter.ts
import { useMemo } from 'react';
import type { Row, ColumnDef, SortState, FilterState } from '../types/table';

// Pre-built index for O(1) enum filtering
type ColIndex = Map<string, Map<string, Set<number>>>; // colId → value → Set<rowIdx>

export function buildColumnIndex(data: Row[], columns: ColumnDef[]): ColIndex {
  const index: ColIndex = new Map();
  columns.filter(c => c.type === 'enum').forEach(col => {
    const colMap = new Map<string, Set<number>>();
    data.forEach((row, i) => {
      const val = String(row[col.id] ?? '');
      if (!colMap.has(val)) colMap.set(val, new Set());
      colMap.get(val)!.add(i);
    });
    index.set(col.id, colMap);
  });
  return index;
}

export function useSortFilter(
  data: Row[],
  columns: ColumnDef[],
  sortState: SortState[],
  filterState: FilterState,
  colIndex: ColIndex,
): Row[] {
  return useMemo(() => {
    // ── FILTER ────────────────────────────────────────────────
    let indices: number[] | null = null; // null = all rows pass

    for (const [colId, filterVal] of Object.entries(filterState)) {
      if (!filterVal) continue;
      const col = columns.find(c => c.id === colId);
      if (!col) continue;

      let passing: Set<number>;

      if (col.type === 'enum' && Array.isArray(filterVal)) {
        // Set intersection across selected enum values
        passing = new Set<number>();
        const colMap = colIndex.get(colId);
        if (colMap) {
          (filterVal as string[]).forEach(v =>
            colMap.get(v)?.forEach(i => passing.add(i)));
        }
      } else if (col.type === 'text' && typeof filterVal === 'string') {
        const needle = filterVal.toLowerCase();
        passing = new Set(
          data.reduce<number[]>((acc, row, i) => {
            if (String(row[colId] ?? '').toLowerCase().includes(needle)) acc.push(i);
            return acc;
          }, []),
        );
      } else {
        continue;
      }

      // Intersect with previously passing indices
      if (indices === null) {
        indices = [...passing];
      } else {
        indices = indices.filter(i => passing.has(i));
      }
    }

    const filtered = indices === null ? data : indices.map(i => data[i]);

    // ── SORT ─────────────────────────────────────────────────
    if (sortState.length === 0) return filtered;

    return [...filtered].sort((a, b) => {
      for (const { id, desc } of sortState) {
        const va = a[id], vb = b[id];
        const cmp =
          va == null ? 1 : vb == null ? -1 :
          typeof va === 'number' && typeof vb === 'number' ? va - vb :
          String(va).localeCompare(String(vb));
        if (cmp !== 0) return desc ? -cmp : cmp;
      }
      return 0;
    });
  }, [data, sortState, filterState, colIndex, columns]);
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Virtualization: TanStack Virtual vs react-window vs custom implementation',
        picked: 'TanStack Virtual',
        reason: 'react-window has not been actively maintained and lacks variable-height row support. TanStack Virtual is actively maintained, supports variable-height rows (useful for expandable rows), integrates with TanStack Table if needed, and has a smaller API surface. Custom implementation is possible but requires handling scroll jank, overscan, and resize observer correctly — weeks of work.',
      },
      {
        choice: 'Column layout: CSS Grid vs absolute positioning vs table element',
        picked: 'CSS Grid with grid-template-columns',
        reason: 'The HTML <table> element with <col> widths does not work well with virtual scrolling because the tbody must be the scroll container. Absolute positioning requires calculating column offsets manually. CSS Grid expresses column widths declaratively, handles sticky columns via position:sticky natively, and updates all rows simultaneously when column widths change — just update the grid-template-columns value on the container.',
      },
      {
        choice: 'Filter pre-indexing: build at load vs recompute on filter',
        picked: 'Build index once at data load, stored in useMemo with data as dependency',
        reason: 'Without pre-indexing, filtering 100K rows for an enum value requires scanning every row on every filter change. Pre-building a Map<value, Set<rowIndex>> reduces enum filtering from O(n) to O(matching rows). The index build cost (O(n)) is paid once at load time, not on every keystroke. For text filters, the regex/includes scan is still O(n) but unavoidable without a full-text index.',
      },
      {
        choice: 'Row selection storage: array vs Set<id>',
        picked: 'Set<rowId>',
        reason: 'An array requires O(n) indexOf/includes checks for each row\'s selected state — with 100K rows, rendering becomes O(n²). A Set provides O(1) has() lookups. Each row only checks whether its ID is in the Set during rendering. "Select all" fills the Set with all filtered row IDs; clearing empties it. Set size gives the selection count instantly.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Layout Thrashing and Batch DOM Reads',
        detail: 'Layout thrashing occurs when JavaScript alternates between reading layout properties (offsetHeight, getBoundingClientRect) and writing DOM styles, forcing the browser to recompute layout on every read. In a virtual scroll table, reading row heights to calculate scroll offsets then writing translateY causes thrashing. Mitigation: batch all reads first (requestAnimationFrame read phase), then apply all writes (requestAnimationFrame write phase). TanStack Virtual uses ResizeObserver for height measurement, which batches callbacks outside the synchronous layout cycle.',
      },
      {
        topic: 'Stable Sort and Multi-Column Priority',
        detail: 'JavaScript\'s Array.prototype.sort is guaranteed stable in all modern engines (Chrome 70+, Firefox, Safari). A multi-column sort applies comparators in priority order: if column A comparison returns 0 (equal), fall through to column B. This means clicking "sort by department, then by name" sorts by department first and breaks ties by name. The sort state array order determines priority: sortState[0] is primary, sortState[1] is secondary.',
      },
      {
        topic: 'ResizeObserver for Dynamic Row Heights',
        detail: 'When rows have variable heights (expandable sections, wrapped text), the virtualizer needs accurate height measurements to compute scroll positions. TanStack Virtual supports measureElement: passing the DOM element to the virtualizer after mount triggers a ResizeObserver measurement. If row height changes (expand/collapse), the ResizeObserver fires and the virtualizer recalculates total height and visible items. This is more accurate than estimateSize alone.',
      },
      {
        topic: 'Accessible Data Tables at Scale',
        detail: 'A virtual scroll table breaks the native <table> accessibility model: screen readers expect all rows in the DOM to announce row count and navigate by row. With virtual scrolling, only ~30 rows are in the DOM. Mitigation: use role="grid" with aria-rowcount={totalRows} and aria-rowindex on each visible row. This tells screen readers the full extent of the table even when rows are not in the DOM. Column headers need aria-sort with "ascending"/"descending"/"none" to announce sort state.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Forgetting to set a fixed height on the scroll container',
        why: 'Without a fixed height, the scroll container expands to fit all content — no scrollbar appears, and TanStack Virtual renders all 100K rows at once, crashing the browser tab.',
        solution: 'Set height: 600px (or a percentage with a max-height) and overflow-y: auto on the scroll container. Pass the scroll container\'s ref to useVirtualizer via getScrollElement. The virtualizer needs a bounded container to calculate the visible window.',
      },
      {
        pitfall: 'Sorting the original data array with Array.prototype.sort',
        why: 'Array.prototype.sort mutates the array in place. If the raw data array is stored in state or a ref, mutating it causes subtle bugs: filters applied after sorting see sorted data, undo is broken, and React\'s render cycle may not detect the mutation.',
        solution: 'Always sort a copy: [...filtered].sort(...). The filtered array itself is a new array created by filter(), so spreading it is safe. Never mutate the original data array from props or a data-fetching hook.',
      },
      {
        pitfall: 'Re-indexing on every filter keystroke',
        why: 'Building the column index inside the filter useMemo (not a separate memo) re-builds the Map<value, Set<index>> on every keystroke, costing O(n) on every filter interaction.',
        solution: 'Build the column index in a separate useMemo with only data and columns as dependencies. The index is built once per data load. The filter useMemo references the index via closure without triggering its rebuild.',
      },
      {
        pitfall: 'Shift+click range selection using displayed row indices instead of data IDs',
        why: 'When the table is filtered, displayed row indices (0, 1, 2...) do not correspond to original data indices. Shift+clicking rows 0 and 5 in a filtered view should select the 6 filtered rows, not rows 0-5 in the original dataset.',
        solution: 'Maintain lastClickedRowId (not index). On shift+click, find both IDs in the displayRows array, select all IDs between them. The range is always computed against the current displayRows (filtered) array, not the full dataset.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Column resize below the minimum width',
        impact: 'Dragging a column to 0px or negative width causes the CSS grid to break, pushing adjacent columns out of alignment.',
        mitigation: 'Clamp the new width to [minWidth, maxWidth] during mousemove: const newWidth = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, startWidth + delta)). Apply the clamp before setting state. Display a visual "stop" indicator (column handle turns red) when the minimum is reached.',
      },
      {
        scenario: 'Scroll position lost after filter clears rows',
        impact: 'User scrolls to row 50,000, applies a filter that reduces the table to 100 rows, then clears the filter. The scroll position stays at 50,000px (row 50,000) — blank space with no rows.',
        mitigation: 'Reset scroll to 0 whenever the filter state changes and displayRows.length changes significantly. Use the scroll container ref: scrollContainer.current.scrollTop = 0 inside a useEffect that watches filterState.',
      },
      {
        scenario: 'Select all after filtering, then filter changes',
        impact: 'User selects all 100 filtered rows. User changes the filter to a different set. The 100 previously selected rows are still in the Set even though they are not visible. The selection count shows 100 but no checkboxes are checked.',
        mitigation: 'Clear the selection whenever the filter changes (useEffect on filterState). Or compute the "effective selection" as the intersection of selectedIds and the current displayRows IDs — only count rows that are both selected and currently visible in the filter.',
      },
      {
        scenario: 'CSV export of 100K rows blocks the UI',
        impact: 'Serializing 100K rows to a CSV string synchronously in the main thread freezes the UI for 2-5 seconds.',
        mitigation: 'Move CSV generation to a Web Worker. Post the row data to the worker, receive the CSV string back, then trigger the download. While the worker runs, show a progress indicator. This keeps the UI responsive during export.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you handle variable row heights in the virtual table?',
        answer: 'Pass measureElement to useVirtualizer: after each row renders, call virtualizer.measureElement(rowElement) to record its actual height. TanStack Virtual maintains a size cache per row index. On the first render, estimateSize provides a guess (e.g., 40px). After measurement, the cache has the actual size and total height is recalculated. For expandable rows, call measureElement after expansion animation completes.',
      },
      {
        question: 'How would you implement infinite scroll loading instead of a pre-loaded dataset?',
        answer: 'Maintain a pages array of loaded data. Track a hasNextPage flag. Render a sentinel row at the bottom of the virtual list. When the sentinel\'s virtual item index is within the overscan buffer of the last loaded row, fetch the next page and append to the data array. Show a skeleton row as the last item while loading. This pattern works seamlessly with TanStack Virtual because it only observes total row count changes.',
      },
      {
        question: 'What would you do differently to support 1 million rows?',
        answer: 'Pre-loading 1M rows into memory (~200MB for typical row objects) is impractical. Switch to server-side pagination: the virtualizer only knows the total count (from the API) and fetches pages on demand as the user scrolls. Maintain a sparse page cache: pages loaded stay in memory, pages outside a recent window are evicted. This is the approach used by AG Grid\'s infinite row model.',
      },
      {
        question: 'How do you prevent performance regressions as the component grows?',
        answer: 'Set up a performance budget with Lighthouse CI: fail builds if JS parse time or rendering FPS drops below thresholds. Use React DevTools Profiler to identify which component re-renders on each interaction. Memoize row components with React.memo keyed by row ID and selected state to prevent re-renders of unaffected rows. Track bundle size with size-limit — the virtual table logic should be under 30KB gzipped.',
      },
    ],

    extensionIdeas: [
      { idea: 'Column drag-to-reorder', difficulty: 'intermediate', description: 'Add @dnd-kit to the table header. Each column header is a draggable. Drag a column header to a new position to reorder. Update the columns array order in state. The CSS Grid template-columns string is derived from the ordered columns array, so all rows reorder automatically.' },
      { idea: 'Inline cell editing', difficulty: 'intermediate', description: 'Double-click a cell to enter edit mode: replace the cell content with an input pre-filled with the current value. On blur or Enter, validate against the column type and commit the change. On Escape, revert. Track dirty rows and show a "save changes" button in the bulk action bar.' },
      { idea: 'Column grouping with nested headers', difficulty: 'advanced', description: 'Support two-row headers where multiple columns share a parent group header. Define columns as a tree: { id: "contact", header: "Contact", children: [firstName, lastName, email] }. The header row spans group headers across their child columns using CSS Grid column spans. Sort and filter still target leaf column IDs.' },
      { idea: 'Server-side aggregation with grouping rows', difficulty: 'advanced', description: 'Add a group-by feature: select a column to group rows by its distinct values. Each group shows a summary row (count, sum, avg) followed by the group\'s individual rows in a collapsible section. Groups are rendered as virtual items with a different height estimate than regular rows.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'multi-step-form-wizard': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Form Architecture & Schema',
        description: 'Set up React Hook Form with Zod schemas for each step and a master schema.',
        tasks: [
          'Install react-hook-form, zod, @hookform/resolvers; define per-step Zod schemas as named exports',
          'Compose master schema from step schemas using z.object().merge() for full-form type inference',
          'Initialize useForm with the master schema resolver and defaultValues covering all fields',
          'Build useFormWizard hook: manages currentStep, completedSteps Set, and navigation functions',
          'Type the complete form data with z.infer<typeof masterSchema> for end-to-end type safety',
        ],
      },
      {
        phase: 2,
        title: 'Step Components & Conditional Logic',
        description: 'Build each step as an isolated component and implement conditional step visibility.',
        tasks: [
          'Create StepRegistry: array of { id, title, schema, component, condition? } objects',
          'Implement getActiveSteps(formData): filters StepRegistry by evaluating each step\'s condition function',
          'Build each step component: renders its fields, receives register/control/errors from RHF context',
          'On "Next" click: trigger(currentStepFields) → only validates current step\'s schema fields',
          'Clear hidden step data on condition change: useEffect watches formData, resets fields of steps whose condition just became false',
        ],
      },
      {
        phase: 3,
        title: 'Progress Indicator & Navigation',
        description: 'Build the visual progress stepper and allow backward navigation without data loss.',
        tasks: [
          'Build ProgressStepper component: renders step titles as nodes with completed/current/upcoming states',
          'Completed steps show a checkmark; current step shows step number highlighted; upcoming steps are muted',
          'Allow clicking completed step nodes to jump back to that step (re-renders that step\'s component)',
          'Forward navigation requires passing validation; backward navigation is always allowed',
          'Add URL sync: ?step=2 in the URL so browser back/forward works and links are shareable',
        ],
      },
      {
        phase: 4,
        title: 'Auto-Save Draft & Review Step',
        description: 'Persist form progress to localStorage and build the final review step.',
        tasks: [
          'Debounce RHF watch() output (2 seconds); serialize to localStorage on change with { formId, data, step, savedAt }',
          'On mount, check for saved draft; show "Resume saved draft?" toast with restore or discard actions',
          'Build ReviewStep component: renders each completed step\'s data in read-only sections with "Edit" links',
          'Final submit: handleSubmit validates all steps at once, calls onSubmit, clears localStorage draft',
          'Add field-level error recovery: if submission fails (API error), show server errors mapped to specific fields using setError()',
        ],
      },
    ],

    fileStructure: `multi-step-form-wizard/
├── src/
│   ├── wizard/
│   │   ├── FormWizard.tsx        # Main wizard container
│   │   ├── ProgressStepper.tsx  # Step indicator component
│   │   ├── StepWrapper.tsx      # Wraps each step with nav buttons
│   │   ├── ReviewStep.tsx       # Final read-only review
│   │   ├── useFormWizard.ts     # Step navigation + state hook
│   │   └── useAutoSave.ts       # Debounced localStorage persistence
│   ├── steps/
│   │   ├── PersonalInfoStep.tsx
│   │   ├── EmploymentStep.tsx   # Conditional on applicationType
│   │   ├── EducationStep.tsx
│   │   ├── DocumentsStep.tsx
│   │   └── index.ts             # Step registry definition
│   ├── schemas/
│   │   ├── personalInfo.ts      # Zod schema for step 1
│   │   ├── employment.ts
│   │   ├── education.ts
│   │   ├── documents.ts
│   │   └── master.ts            # Merged master schema + type export
│   ├── components/
│   │   ├── FormField.tsx        # Label + Input + Error wrapper
│   │   └── FieldArray.tsx       # Dynamic field array wrapper
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json`,

    architectureLayers: [
      { name: 'Schema Layer', description: 'Each step has a Zod schema that validates its fields. Schemas are composed into a master schema. TypeScript types are inferred from the master schema, ensuring form data is typed end-to-end without manual type definitions.' },
      { name: 'Form State Layer', description: 'A single React Hook Form instance spans all steps. All field values live in one form object. Per-step validation triggers only the current step\'s fields using trigger([...stepFieldNames]). The full form data is always available for conditional step evaluation.' },
      { name: 'Step Registry Layer', description: 'Steps are defined as data objects in an array, not hardcoded JSX. Each entry has an id, title, Zod schema, React component, and optional condition function. getActiveSteps() filters this array based on current form data — conditionals are evaluated here, not scattered in component JSX.' },
      { name: 'Navigation Layer', description: 'useFormWizard manages currentStep index, completedSteps Set, and the active steps array. Navigation functions (next, back, jumpTo) update these states. The active steps array is recalculated when form data changes, keeping conditional steps in sync.' },
      { name: 'Persistence Layer', description: 'useAutoSave watches form values with RHF\'s watch() and debounces writes to localStorage. Draft restoration happens on mount before the form renders. Draft clearing happens on successful submission.' },
    ],

    codeExamples: {
      typescript: `// src/wizard/useFormWizard.ts
import { useState, useCallback, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { type StepDefinition, getActiveSteps } from '../steps';
import type { MasterFormData } from '../schemas/master';

export interface WizardState {
  currentStepIndex: number;
  activeSteps: StepDefinition[];
  completedSteps: Set<string>;
  isFirstStep: boolean;
  isLastStep: boolean;
  progress: number; // 0-100
}

export function useFormWizard() {
  const { trigger, getValues, watch } = useFormContext<MasterFormData>();
  const formData = watch(); // re-evaluates active steps on any field change

  const activeSteps = useMemo(
    () => getActiveSteps(formData),
    // Stable JSON string avoids re-computing on unrelated field changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(formData)],
  );

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const currentStep = activeSteps[currentStepIndex];

  const next = useCallback(async () => {
    if (!currentStep) return;

    // Validate only the current step's fields
    const fieldsToValidate = Object.keys(currentStep.schema.shape) as Array<
      keyof MasterFormData
    >;
    const valid = await trigger(fieldsToValidate);
    if (!valid) return; // errors are shown inline, do not advance

    setCompletedSteps(prev => new Set([...prev, currentStep.id]));

    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex(i => i + 1);
    }
  }, [currentStep, currentStepIndex, activeSteps.length, trigger]);

  const back = useCallback(() => {
    if (currentStepIndex > 0) setCurrentStepIndex(i => i - 1);
  }, [currentStepIndex]);

  const jumpTo = useCallback(
    (stepId: string) => {
      const idx = activeSteps.findIndex(s => s.id === stepId);
      if (idx !== -1 && completedSteps.has(stepId)) {
        setCurrentStepIndex(idx);
      }
    },
    [activeSteps, completedSteps],
  );

  return {
    currentStep,
    currentStepIndex,
    activeSteps,
    completedSteps,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === activeSteps.length - 1,
    progress: Math.round((completedSteps.size / activeSteps.length) * 100),
    next,
    back,
    jumpTo,
  };
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Form state: single RHF instance vs per-step instances with manual merge',
        picked: 'Single React Hook Form instance across all steps',
        reason: 'Per-step instances require manually merging data on "Next" and distributing values back on "Back." A single instance keeps all data in one controlled object, enabling: free backward navigation without data loss, conditional step evaluation against the full form state, and a single handleSubmit at the end. The only tradeoff is that per-step validation must use trigger([...fieldNames]) instead of handleSubmit.',
      },
      {
        choice: 'Validation trigger: trigger() vs handleSubmit() per step',
        picked: 'trigger(stepFieldNames) on Next click',
        reason: 'handleSubmit() validates the entire form and calls the submit handler. Using it per step would validate future steps before the user has filled them — showing errors on fields they have not seen yet. trigger(fieldNames) validates only the specified fields, showing errors only for the current step. This matches the UX expectation of progressive validation.',
      },
      {
        choice: 'Draft storage: localStorage vs sessionStorage vs IndexedDB',
        picked: 'localStorage',
        reason: 'sessionStorage is cleared when the tab closes — a user opening the form in a new tab finds no draft. IndexedDB supports larger data but is async and more complex to use. localStorage is synchronous (simple to read on mount before first render), supported everywhere, and sufficient for typical form data sizes (under 5MB). For multi-file upload forms, use IndexedDB for the file data and localStorage for the metadata.',
      },
      {
        choice: 'Conditional step clearing: automatic vs manual',
        picked: 'Automatic: useEffect watches form data, clears hidden step fields via setValue(field, undefined)',
        reason: 'If a user fills the EmploymentStep (condition: applicationType === "full-time"), then changes applicationType to "contract" (hiding the step), the employment data should be cleared. Otherwise, stale data from hidden steps is included in the final submission. Automatic clearing via useEffect ensures the submitted data is always consistent with the visible steps.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Zod Schema Composition and Partial Validation',
        detail: 'Each step\'s schema is a z.object() with its field definitions. The master schema merges them: z.object({}).merge(step1Schema).merge(step2Schema). This generates a single TypeScript type covering all fields. For partial validation (step 1 only), use step1Schema.safeParse(formValues) or React Hook Form\'s trigger() which uses the schema resolver internally. The resolver runs the full schema but only surfaces errors for triggered fields.',
      },
      {
        topic: 'Focus Management Between Steps',
        detail: 'When transitioning to a new step, focus should move to the first input of that step or to the first error field if validation failed. This is a WCAG 2.1 success criterion for keyboard and screen reader users. Implement with a ref on the step container and step.focus() in a useEffect that runs after the step index changes. For error focus: React Hook Form\'s setFocus(fieldName) programmatically focuses the named field after failed validation.',
      },
      {
        topic: 'URL Synchronization for Shareable Step Links',
        detail: 'Syncing the current step to the URL (?step=2) enables browser Back/Forward navigation and shareable links. Use URLSearchParams to read step on mount and set step on navigation. The challenge is that URL step 2 is only valid if steps 0 and 1 are completed. On initial load with a step URL param, either restore the draft (which includes completed step data) or redirect to step 0. Without a draft, a deep link to step 3 is meaningless.',
      },
      {
        topic: 'React Hook Form Performance with Many Fields',
        detail: 'RHF uses uncontrolled inputs (refs) by default, which means form values are read from the DOM on submit rather than stored in React state. This avoids re-renders on every keystroke. Using watch() to observe values for conditional step logic re-renders the form on every change. Mitigate by using useWatch() on only the specific fields that drive conditional logic, rather than watch() on all fields. Or, debounce the conditional evaluation with a 200ms delay.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Validating the entire form on each "Next" click',
        why: 'Validating all steps on step 1\'s "Next" click shows error messages on fields in steps 2-5 that the user has not filled yet. This is confusing and frustrating.',
        solution: 'Use trigger([...currentStepFieldNames]) to validate only the current step\'s fields. React Hook Form\'s trigger() accepts an array of field names and only touches those fields\' error state, leaving other fields untouched.',
      },
      {
        pitfall: 'Not clearing conditional step data on hide',
        why: 'If Step 3 (employment info) is hidden when the user selects "student" but its data is not cleared, the submission payload includes employment fields the user never intentionally filled — potentially stale data from a previous visit.',
        solution: 'In a useEffect watching formData, detect when a step\'s condition transitions from true to false and call setValue() to reset each of that step\'s fields to their default values or undefined.',
      },
      {
        pitfall: 'Auto-save serializing File objects to localStorage',
        why: 'File objects (from file input fields) cannot be serialized to JSON — they become empty objects {}. Auto-save that includes file fields produces a corrupt draft that cannot be restored.',
        solution: 'Exclude file fields from the auto-save serialization. For file uploads, store file metadata (name, size, type) in localStorage and the actual file in IndexedDB or re-upload on draft restore.',
      },
      {
        pitfall: 'Progress indicator showing wrong count when conditional steps appear/disappear',
        why: 'If the total step count changes as the user fills the form (a new step appears based on a selection), the progress percentage jumps backward — 75% can become 60% when a new step appears.',
        solution: 'Base the progress bar on completedSteps.size / totalPossibleSteps (the maximum possible steps, not the current active count). This ensures progress only moves forward. Or display "Step 2 of 4" instead of a percentage so the total is explicitly visible to the user.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Browser tab closed mid-form, then reopened',
        impact: 'Form data is lost unless auto-save has run. The user must start over, likely abandoning the form.',
        mitigation: 'Auto-save triggers on every field change (debounced 2s). On tab close/refresh (beforeunload event), force a synchronous localStorage write of the current form state without debounce — this is the last chance to save. On next open, detect the draft and offer restoration.',
      },
      {
        scenario: 'User completes step 3, goes back to step 1, changes a field that hides step 2',
        impact: 'Step 2 is now hidden and its data is cleared. Step 3 was marked as completed but it was step 3 of a 4-step form; now it is step 3 of a 3-step form. The completedSteps Set still contains step 2\'s id.',
        mitigation: 'When a step is hidden (condition becomes false), remove it from completedSteps. Recalculate currentStepIndex against the new activeSteps array — if the current step\'s id is still in activeSteps, keep it; otherwise go back to the last completed active step.',
      },
      {
        scenario: 'Submission API returns field-level validation errors',
        impact: 'Server-side validation catches issues that client-side Zod cannot (e.g., "email already registered"). Without displaying these errors next to the relevant fields, the user cannot identify what to fix.',
        mitigation: 'Map server error response to RHF\'s setError(): { email: "already in use" } → setError("email", { message: "already in use" }). Also navigate back to the step containing the errored field so it is visible. Show a summary banner: "Please fix the errors on step 1 before continuing."',
      },
      {
        scenario: 'Two browser tabs have the same form open simultaneously',
        impact: 'Both tabs auto-save to the same localStorage key. The user\'s progress in Tab A overwrites Tab B\'s progress. When Tab A restores the draft, it gets Tab B\'s (possibly different) state.',
        mitigation: 'Include a sessionId in the localStorage key: form-draft-{formId}-{sessionId}. Generate sessionId with crypto.randomUUID() per tab. On mount, show all available drafts (from different sessions) and let the user pick which to restore. This is rare but critical for long multi-day form sessions.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you support saving progress to the server instead of localStorage?',
        answer: 'Replace the localStorage write with a debounced API call: PATCH /api/form-drafts/:draftId with the current form data. On mount, fetch the draft from the API instead of localStorage. Use optimistic updates so the UI feels instant. Handle conflicts: if the server draft is newer than the local state (another device saved more recently), show a merge prompt. This is especially important for mobile users who switch devices.',
      },
      {
        question: 'How do you handle a file upload step in a multi-step form?',
        answer: 'Upload files immediately when selected (not on final submit): POST /api/uploads returns a { fileId, url }. Store the fileId in the form data instead of the File object. On final submit, include the fileIds in the payload — the server associates the pre-uploaded files with the submission. Benefits: upload errors surface immediately (not at the end), large files upload while the user fills other steps, and localStorage draft can safely serialize fileIds.',
      },
      {
        question: 'How would you implement a "save for later" feature (email link to resume)?',
        answer: 'On "Save for later" click: POST /api/form-drafts with current form data and user email. Server stores the draft in PostgreSQL with a UUID token. Sends an email with a link: /form/resume?token={uuid}. On visiting the link, fetch the draft by token, populate the form, and navigate to the saved step. Expire draft tokens after 30 days.',
      },
      {
        question: 'How do you test a multi-step form wizard?',
        answer: 'Unit tests with React Testing Library: test each step component independently with mock form context values. Integration tests: render the full wizard, simulate filling step 1 and clicking Next, verify step 2 renders. Test conditional steps: fill the field that triggers the condition, verify the new step appears. Test auto-save: mock localStorage, fill a field, advance timers, verify localStorage.setItem was called with the correct data. E2E tests (Playwright/Cypress) for the happy path and error paths.',
      },
    ],

    extensionIdeas: [
      { idea: 'Animated step transitions with Framer Motion', difficulty: 'beginner', description: 'Wrap each step in an AnimatePresence block with slide-in-from-right on forward navigation and slide-in-from-left on backward navigation. Add a progress bar that smoothly fills between steps using layout animation. This transforms the feel from "tab switching" to "wizard navigation."' },
      { idea: 'Collaborative form filling (two users filling simultaneously)', difficulty: 'advanced', description: 'Use a CRDT (Yjs) or operational transform to sync field values between two users in real time via WebSocket. Each user\'s cursor position is shown with a colored indicator next to the field they are currently editing. Useful for joint applications (joint bank account, shared rental application).' },
      { idea: 'Form analytics and drop-off tracking', difficulty: 'intermediate', description: 'Track time spent per step, field interaction counts, and where users abandon the form. On step exit, POST { step, timeSpent, fieldInteractions } to an analytics endpoint. Display a funnel chart in an admin dashboard showing completion rate per step. Identify bottleneck steps where users drop off most.' },
      { idea: 'Dynamic form builder from JSON schema', difficulty: 'advanced', description: 'Accept a JSON Form Schema (JSON Schema + UI hints) as a prop and generate the entire wizard — steps, fields, validation, and conditional logic — from configuration. Makes the wizard reusable across different form types without code changes. Implement a visual form builder UI that generates the JSON schema.' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  'infinite-image-gallery': {
    implementationSteps: [
      {
        phase: 1,
        title: 'Masonry Layout Engine',
        description: 'Implement the JavaScript masonry layout algorithm with responsive column counts.',
        tasks: [
          'Use ResizeObserver on the gallery container to detect width changes and compute column count (1-4)',
          'Track column heights array; place each new image in the shortest column (O(n) per image)',
          'Position images with position:absolute, top = shortest column height, left = column index * (columnWidth + gap)',
          'Update container height to Math.max(...columnHeights) after each placement batch',
          'Debounce ResizeObserver callback (100ms) to avoid layout recalculation on every pixel of resize',
        ],
      },
      {
        phase: 2,
        title: 'Lazy Loading with Intersection Observer',
        description: 'Build the lazy loading system that loads images 200px before they enter the viewport.',
        tasks: [
          'Create IntersectionObserver with rootMargin="200px 0px" to trigger early pre-load',
          'Each image starts as a skeleton placeholder div with the correct aspect-ratio CSS property set from image metadata',
          'On intersection: set the <img> src attribute, observe onLoad to mark as loaded and remove skeleton',
          'Unobserve images after first load to free observer resources',
          'Add blur-up effect: load a 20px thumbnail first, display blurred, then swap for full resolution on load',
        ],
      },
      {
        phase: 3,
        title: 'Infinite Scroll & API Pagination',
        description: 'Implement cursor-based pagination that fetches more images as the user scrolls toward the bottom.',
        tasks: [
          'Place a sentinel div at the bottom of the gallery; observe it with IntersectionObserver',
          'On sentinel intersection: fetch next page (cursor-based: ?after={lastImageId}&limit=20)',
          'Append new images to the existing column state; run masonry placement for new images only',
          'Show skeleton loading cards during fetch using the last page\'s image count as placeholder count',
          'Handle end-of-content: when API returns hasNextPage: false, remove sentinel observer and show "End of gallery"',
        ],
      },
      {
        phase: 4,
        title: 'Lightbox with Zoom & Keyboard Navigation',
        description: 'Full-screen lightbox with smooth open animation, zoom, pan, and keyboard controls.',
        tasks: [
          'Build lightbox overlay with backdrop blur; animate open from thumbnail position using FLIP technique',
          'Implement mouse wheel and pinch-to-zoom: track scale (1x to 5x), clamp pan position within zoomed bounds',
          'Keyboard: ArrowLeft/ArrowRight to navigate, Escape to close, +/- to zoom in/out',
          'Preload next and previous images on lightbox open for instant navigation',
          'Add swipe gesture support with touch events: horizontal swipe > 50px triggers navigation',
        ],
      },
    ],

    fileStructure: `infinite-image-gallery/
├── src/
│   ├── gallery/
│   │   ├── Gallery.tsx           # Main gallery container
│   │   ├── MasonryGrid.tsx       # Layout engine component
│   │   ├── GalleryImage.tsx      # Single image with lazy load
│   │   ├── ImageSkeleton.tsx     # Aspect-ratio placeholder
│   │   └── LoadingSentinel.tsx   # Infinite scroll trigger
│   ├── lightbox/
│   │   ├── Lightbox.tsx          # Full-screen overlay
│   │   ├── ZoomPan.tsx           # Zoom and pan logic
│   │   └── LightboxNav.tsx       # Arrow navigation
│   ├── hooks/
│   │   ├── useMasonry.ts         # Column placement algorithm
│   │   ├── useLazyImage.ts       # Intersection Observer per image
│   │   ├── useInfiniteGallery.ts # Pagination + data fetching
│   │   ├── useZoomPan.ts         # Touch and mouse zoom state
│   │   └── useKeyboardNav.ts     # Lightbox keyboard handler
│   ├── api/
│   │   └── images.ts             # Fetch images with cursor pagination
│   ├── utils/
│   │   └── flip.ts               # FLIP animation helpers
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
└── package.json`,

    architectureLayers: [
      { name: 'Data Layer', description: 'Image metadata (id, url, width, height, alt, author) is fetched from a paginated API using cursor-based pagination. Each page appends to the local image array. The original aspect ratio from metadata is used to compute placeholder heights before images load — preventing layout shift.' },
      { name: 'Layout Engine Layer', description: 'The masonry algorithm maintains a columnHeights array. Each image is placed in the shortest column. Position is computed as absolute pixel coordinates (top, left). This gives the Pinterest-style flow (left-to-right filling) rather than CSS columns\' top-to-bottom filling.' },
      { name: 'Loading Layer', description: 'Two Intersection Observers work in parallel: one per image (triggers lazy loading 200px before viewport), and one on the bottom sentinel (triggers next page fetch). Images start as aspect-ratio-correct skeleton placeholders, preventing layout shift when images load.' },
      { name: 'Interaction Layer', description: 'Clicking any image opens the lightbox. The lightbox tracks currently viewed image index within the full loaded array. Zoom/pan state is maintained in a separate hook. Keyboard events are attached via useEffect on document while the lightbox is open.' },
      { name: 'Animation Layer', description: 'The FLIP (First, Last, Invert, Play) technique animates the lightbox open: record the thumbnail\'s bounding rect (First), measure the full-screen position (Last), apply a transform to make it start from the thumbnail position (Invert), then remove the transform with a CSS transition (Play).' },
    ],

    codeExamples: {
      typescript: `// src/hooks/useMasonry.ts
import { useState, useCallback, useRef, useEffect } from 'react';

export interface ImageMeta {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface PositionedImage extends ImageMeta {
  top: number;
  left: number;
  colWidth: number;
}

const GAP = 12;

export function useMasonry(images: ImageMeta[], containerRef: React.RefObject<HTMLDivElement>) {
  const [positioned, setPositioned] = useState<PositionedImage[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  const columnCount = useRef(4);

  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container || images.length === 0) return;

    const containerWidth = container.offsetWidth;
    const cols = containerWidth < 640 ? 1
                : containerWidth < 1024 ? 2
                : containerWidth < 1280 ? 3 : 4;
    columnCount.current = cols;

    const colWidth = (containerWidth - GAP * (cols - 1)) / cols;
    const colHeights = new Array<number>(cols).fill(0);
    const result: PositionedImage[] = [];

    for (const img of images) {
      // Find shortest column
      const shortestCol = colHeights.indexOf(Math.min(...colHeights));
      const top = colHeights[shortestCol];
      const left = shortestCol * (colWidth + GAP);
      const scaledHeight = (img.height / img.width) * colWidth;

      result.push({ ...img, top, left, colWidth });
      colHeights[shortestCol] += scaledHeight + GAP;
    }

    setPositioned(result);
    setContainerHeight(Math.max(...colHeights));
  }, [images, containerRef]);

  // Re-layout on container resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      layout();
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [layout, containerRef]);

  // Re-layout when images array changes
  useEffect(() => { layout(); }, [layout]);

  return { positioned, containerHeight };
}`,
    },

    tradeoffDecisions: [
      {
        choice: 'Masonry layout: CSS columns vs CSS Grid with grid-row-end: span vs JavaScript positioning',
        picked: 'JavaScript absolute positioning',
        reason: 'CSS columns fill top-to-bottom in each column, so images appear in reading order (all of column 1, then column 2) — not the left-to-right Pinterest flow. CSS Grid with grid-row-end: span requires knowing the image height in grid units before rendering, which requires images to have loaded. JavaScript positioning gives full control: place images in the shortest column in source order, which is the expected masonry behavior.',
      },
      {
        choice: 'Infinite scroll trigger: scroll event vs Intersection Observer',
        picked: 'Intersection Observer',
        reason: 'Scroll events fire hundreds of times per second, requiring debouncing and manual scroll position math. Intersection Observer fires only when an element\'s visibility crosses a threshold — no math, no debouncing, works with any scroll container (not just window). The rootMargin parameter ("200px 0px") pre-triggers the load 200px before the sentinel is visible, hiding the loading latency from users.',
      },
      {
        choice: 'Lightbox animation: CSS transitions vs FLIP vs Web Animations API',
        picked: 'FLIP technique with CSS transitions',
        reason: 'A simple fade-in appears jarring because it ignores where the image came from. FLIP (First-Last-Invert-Play) creates a physically grounded animation: the image appears to grow from the thumbnail to fill the screen. CSS transitions handle the animation after the transform is applied. Web Animations API is more precise but more complex. FLIP with requestAnimationFrame to force reflow is the standard approach for this pattern.',
      },
      {
        choice: 'Placeholder strategy: colored div vs skeleton vs blurhash',
        picked: 'Aspect-ratio skeleton with optional blurhash',
        reason: 'An empty div with no height causes layout shift when the image loads (images above collapse to 0 height then suddenly jump). A skeleton with the correct aspect ratio (set from image metadata) holds space before loading, preventing shift. Blurhash provides a colorful preview that matches the image\'s dominant colors — better UX but requires a blurhash string from the API and a decode step.',
      },
    ],

    deepDiveTopics: [
      {
        topic: 'Preventing Cumulative Layout Shift (CLS)',
        detail: 'CLS occurs when images load and push other content down. For masonry, the cause is images that have no reserved space. Mitigation: use image metadata (width, height from the API) to set aspect-ratio: width/height on the placeholder before the image loads. The placeholder occupies exactly the space the image will occupy. When the image loads, it replaces the placeholder with no geometry change. This is why image APIs always return dimensions alongside URLs.',
      },
      {
        topic: 'FLIP Animation Technique',
        detail: 'FLIP: First — record the thumbnail\'s getBoundingClientRect() before opening. Last — apply the full-screen styles and record the new getBoundingClientRect(). Invert — apply a CSS transform that moves the element back to the First position (translateX, translateY, scaleX, scaleY). Play — remove the transform with a CSS transition. The browser interpolates the transform removal, creating the appearance of the image growing from the thumbnail. The trick is forcing a reflow between Invert and Play with element.getBoundingClientRect() or requestAnimationFrame.',
      },
      {
        topic: 'Touch Gesture Handling for Zoom and Swipe',
        detail: 'Touch events provide touches (all touches) and changedTouches (touches that changed). For pinch-to-zoom: track two touch points, compute distance between them on touchmove, compare to initial distance to get the scale ratio. For swipe: track touchstart X position, compute delta on touchend, trigger navigation if delta > 50px. Prevent default on touchmove when zoomed to prevent the browser\'s native scroll conflicting with pan behavior.',
      },
      {
        topic: 'Memory Management for Large Image Galleries',
        detail: 'Loading 1000 images means 1000 <img> elements in the DOM, each holding decoded image data in memory. After a certain threshold (~200 images), memory pressure causes the browser to slow down or crash on mobile. Virtualization: unmount images that scroll far out of the viewport (> 3x viewport height away) and replace with their placeholder. Restore when they return to the viewport. This keeps DOM size and memory usage bounded regardless of gallery size.',
      },
    ],

    commonPitfalls: [
      {
        pitfall: 'Running masonry layout before images are in the DOM',
        why: 'The layout algorithm computes positions based on aspect ratios from metadata (not actual rendered sizes). If image metadata is unavailable or incorrect, placeholders have wrong heights and images overlap or leave gaps after loading.',
        solution: 'Always require width and height from the API for each image. Never run masonry without dimensions. If dimensions are missing for some images, fetch them by creating a temporary Image() object and reading naturalWidth/naturalHeight on load before adding to the positioned array.',
      },
      {
        pitfall: 'Recalculating the entire masonry layout when new images load',
        why: 'Appending page 2 (20 new images) and re-running the full layout algorithm repositions all 20 existing images. This causes a jarring re-layout where images jump to new positions as pagination loads.',
        solution: 'Maintain running columnHeights state. When new images arrive, continue the layout from the current column heights state — only position the new images. Existing images do not move. This requires passing the current columnHeights into the layout function and returning the updated heights.',
      },
      {
        pitfall: 'Opening the lightbox without trapping focus',
        why: 'Without focus trapping, a keyboard user pressing Tab while the lightbox is open will navigate behind the overlay to page content. For screen reader users, the backdrop is announced but the lightbox content may not be.',
        solution: 'Implement focus trap: on lightbox open, find all focusable elements within the lightbox (buttons, links, role="button"), cycle Tab through them, and block Tab/Shift+Tab from reaching elements behind the overlay. Radix UI Dialog does this automatically. For a custom implementation, use the focus-trap-react library.',
      },
      {
        pitfall: 'Fetching the next page multiple times when the sentinel is visible during a slow network',
        why: 'The sentinel intersects while page 2 is still loading. The observer fires again before the loading state is set, triggering a duplicate fetch for page 2.',
        solution: 'Set a isLoading ref (not state — to avoid race conditions with closure values) to true immediately on fetch start, before the async call. Check isLoading at the top of the fetch function and return early if true. Only set isLoading to false after the response is processed and images are appended.',
      },
    ],

    edgeCases: [
      {
        scenario: 'Images with extreme aspect ratios (1:10 panoramas or 10:1 banners)',
        impact: 'A very tall image placed in a column makes that column dramatically taller than others, causing the gallery to look unbalanced for hundreds of pixels.',
        mitigation: 'Clamp image aspect ratios to a reasonable range (e.g., minimum 0.5 and maximum 2.0) when placing in the masonry grid. Display the cropped version in the gallery (object-fit: cover with the clamped dimensions) and show the full image only in the lightbox.',
      },
      {
        scenario: 'Network error during page fetch',
        impact: 'The sentinel observer fires, fetch fails, isLoading is reset to false, and the sentinel is still visible — triggering another immediate fetch. The gallery enters a rapid retry loop.',
        mitigation: 'On fetch error, increment a retryCount and apply exponential backoff before the next attempt (1s, 2s, 4s). After 3 failures, stop retrying automatically and show an "Error loading more images — retry" button. Only resume automatic fetching when the user manually retries or scrolls away and back.',
      },
      {
        scenario: 'Gallery images change while the lightbox is open',
        impact: 'User opens image at index 5. New page loads and 20 images are prepended (unusual but possible). The image at index 5 is now a different image. Lightbox navigation arrows skip to a different image than the user expects.',
        mitigation: 'Track the lightbox by image ID, not array index. Derive the current index from the ID on each render: images.findIndex(img => img.id === lightboxImageId). Navigation changes the ID, not the index. Prepending images does not change the ID of the currently viewed image.',
      },
      {
        scenario: 'ResizeObserver fires in an infinite loop',
        impact: 'useMasonry\'s layout function changes the container\'s height (setContainerHeight), which triggers a ResizeObserver callback, which calls layout, which changes height — infinite loop causing CPU spike.',
        mitigation: 'ResizeObserver reports changes to the observed element itself. Only observe the outer gallery container, not the inner positioned div whose height changes. The outer container\'s width changes on window resize but not when the inner content height changes. Alternatively, debounce the observer callback to break the loop.',
      },
    ],

    interviewFollowups: [
      {
        question: 'How would you implement virtualization for a gallery with 10,000 images?',
        answer: 'Track which images are in the visible viewport + a buffer (2x viewport above and below). Replace out-of-buffer images with their placeholder divs (maintaining height so the layout does not shift). Use IntersectionObserver with a large rootMargin to observe the placeholders — when a placeholder re-enters the buffer, restore the <img> element. The column heights state never changes, so the layout remains stable as images are virtualized in and out.',
      },
      {
        question: 'How do you handle the gallery on mobile with touch scrolling?',
        answer: 'The masonry layout uses ResizeObserver to switch to 1 or 2 columns on narrow screens. Touch scrolling is handled natively by the browser (overflow-y: auto on the container). The Intersection Observer\'s rootMargin should be tuned for mobile: "300px 0px" to preload further ahead compensating for slower network. The lightbox needs separate touch handling for swipe navigation, being careful not to conflict with the scroll container\'s native touch behavior.',
      },
      {
        question: 'How would you add search/filtering to the gallery?',
        answer: 'Add a search input and tag filter chips above the gallery. On filter change, reset the images array and cursor, re-fetch page 1 with the filter parameters. The masonry layout resets (columnHeights back to all zeros). This is a destructive re-render — use a key prop on the MasonryGrid tied to the filter state to force a clean remount rather than trying to reconcile the positioned images array.',
      },
      {
        question: 'What image loading optimization techniques would you apply for production?',
        answer: 'Serve images via a CDN with automatic WebP conversion (Cloudinary, Imgix). Use srcset with multiple resolutions for responsive loading: the browser picks the optimal size for the device pixel ratio. Set loading="lazy" as a native fallback alongside the Intersection Observer approach. Add fetchpriority="high" on above-the-fold images (first 8) to prioritize their loading. Use Cache-Control: max-age=31536000 on image URLs with content-hash fingerprinting for long-term caching.',
      },
    ],

    extensionIdeas: [
      { idea: 'Drag-to-upload with instant masonry insertion', difficulty: 'intermediate', description: 'Make the gallery a drop zone. On file drop, read image dimensions using URL.createObjectURL + a temporary Image element. Insert a placeholder at the correct masonry position immediately. Upload to S3 in the background. Replace the placeholder with the uploaded image URL on completion. Show upload progress in the placeholder.' },
      { idea: 'Image similarity clustering', difficulty: 'advanced', description: 'Use a ML embedding model (CLIP via a Python microservice) to compute image embeddings. Cluster similar images together. Add a "Similar images" section in the lightbox showing the 6 most similar images from the gallery. This is the core feature of visual search engines like Pinterest Lens.' },
      { idea: 'Keyboard-navigable gallery without lightbox', difficulty: 'beginner', description: 'Add tabIndex={0} and role="button" to each gallery image. Arrow key navigation moves focus between images in reading order. Enter/Space opens the lightbox. Focused images show a visible focus ring. This makes the entire gallery operable without a mouse, meeting WCAG 2.1 Level AA.' },
      { idea: 'Shareable gallery collections', difficulty: 'intermediate', description: 'Allow users to select images and save them as a named collection. Each collection has a shareable URL (/gallery/collections/:slug). Shared collections are read-only for non-owners. Collections are stored in PostgreSQL with an images join table. The gallery renders the collection images in masonry order.' },
    ],
  },
};
