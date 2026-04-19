// Coding categories, category map, and topics data

export const codingCategories = [
    { id: 'arrays', name: 'Arrays & Strings', icon: 'code', color: '#ef4444' },
    { id: 'two-pointers', name: 'Two Pointers & Sliding Window', icon: 'arrowRight', color: '#f59e0b' },
    { id: 'searching', name: 'Searching & Sorting', icon: 'search', color: '#eab308' },
    { id: 'stacks-queues', name: 'Stacks & Queues', icon: 'layers', color: '#22c55e' },
    { id: 'linked-lists', name: 'Linked Lists', icon: 'link', color: '#14b8a6' },
    { id: 'trees', name: 'Trees & Graphs', icon: 'gitBranch', color: '#06b6d4' },
    { id: 'dp', name: 'Dynamic Programming', icon: 'grid', color: '#3b82f6' },
    { id: 'advanced', name: 'Advanced Patterns', icon: 'puzzle', color: '#8b5cf6' },
  ];

export const codingCategoryMap = {
    'arrays-hashing': 'arrays',
    'matrix': 'arrays',
    'intervals': 'arrays',
    'two-pointers': 'two-pointers',
    'sliding-window': 'two-pointers',
    'binary-search': 'searching',
    'sorting': 'searching',
    'search-algorithms': 'searching',
    'stacks': 'stacks-queues',
    'queues': 'stacks-queues',
    'linked-lists': 'linked-lists',
    'trees': 'trees',
    'graphs': 'trees',
    'tries': 'trees',
    'heaps': 'trees',
    'dynamic-programming': 'dp',
    'backtracking': 'advanced',
    'greedy': 'advanced',
    'bit-manipulation': 'advanced',
    'math-geometry': 'advanced',
    'recursion': 'advanced',
  };

  // DSA Topics with content
export const codingTopics = [
    {
      id: 'arrays-hashing',
      title: 'Arrays & Hashing',
      icon: 'code',
      color: '#ef4444',
      questions: 57,
      description: 'Foundation of most coding interviews. Master array manipulation and hash map usage.',

visualizations: [
        {
          title: 'Hash Map: Array to Buckets',
          language: 'python',
          description: 'Shows how an array is mapped through a hash function into key-value buckets for O(1) lookup.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="30" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Array</text><g><rect x="20" y="40" width="45" height="32" rx="4" fill="#f0fdf4" stroke="#e2e8f0" stroke-width="1.5"/><text x="42" y="61" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">2</text><rect x="65" y="40" width="45" height="32" rx="4" fill="#f0fdf4" stroke="#e2e8f0" stroke-width="1.5"/><text x="87" y="61" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">7</text><rect x="110" y="40" width="45" height="32" rx="4" fill="#f0fdf4" stroke="#e2e8f0" stroke-width="1.5"/><text x="132" y="61" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">11</text><rect x="155" y="40" width="45" height="32" rx="4" fill="#f0fdf4" stroke="#e2e8f0" stroke-width="1.5"/><text x="177" y="61" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">15</text></g><rect x="100" y="95" width="100" height="30" rx="6" fill="#10b981" stroke="#059669" stroke-width="1.5"/><text x="150" y="115" font-family="sans-serif" font-size="12" fill="white" text-anchor="middle">hash(key) % n</text><line x1="110" y1="72" x2="140" y2="95" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah1)"/><line x1="155" y1="72" x2="155" y2="95" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah1)"/><text x="280" y="30" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Hash Map Buckets</text><g><rect x="280" y="42" width="195" height="28" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="290" y="61" font-family="monospace" font-size="11" fill="#64748b">0:</text><text x="310" y="61" font-family="monospace" font-size="11" fill="#1e293b">15 → idx 3</text></g><g><rect x="280" y="74" width="195" height="28" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="290" y="93" font-family="monospace" font-size="11" fill="#64748b">1:</text><text x="310" y="93" font-family="monospace" font-size="11" fill="#1e293b">11 → idx 2</text></g><g><rect x="280" y="106" width="195" height="28" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="290" y="125" font-family="monospace" font-size="11" fill="#64748b">2:</text><text x="310" y="125" font-family="monospace" font-size="11" fill="#10b981" font-weight="bold">2 → idx 0</text></g><g><rect x="280" y="138" width="195" height="28" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="290" y="157" font-family="monospace" font-size="11" fill="#64748b">3:</text><text x="310" y="157" font-family="monospace" font-size="11" fill="#10b981" font-weight="bold">7 → idx 1</text></g><line x1="200" y1="110" x2="278" y2="85" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah1)"/><text x="20" y="210" font-family="sans-serif" font-size="11" fill="#64748b">Two Sum: target=9 → need 9-2=7 → found at bucket[3] → indices [0,1]</text><rect x="20" y="220" width="460" height="22" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="30" y="236" font-family="monospace" font-size="11" fill="#10b981">O(1) lookup per element → O(n) total instead of O(n²) brute force</text></svg>'
        }
      ],

      introduction: `Arrays and Hash Maps are the foundation of nearly every coding interview. Understanding these data structures deeply will help you solve 40-50% of all LeetCode problems.

**Why This Matters:**
- Arrays provide O(1) random access and are the basis for most algorithms
- Hash Maps (dictionaries) provide O(1) average lookup, insertion, and deletion
- Together, they let you reduce O(n²) brute force solutions to O(n)

**Key Insight:** When you see a problem requiring "find if X exists" or "count occurrences," your first thought should be hash maps.`,

      whenToUse: [
        'Need O(1) lookup for previously seen elements (Two Sum pattern)',
        'Counting frequency of elements (anagram, character counting)',
        'Finding duplicates or unique elements',
        'Need to remember "what you\'ve seen so far" while iterating',
        'Grouping elements by some property (Group Anagrams)',
        'Need range sum queries (Prefix Sums)'
      ],

      keyPatterns: ['Two-pass counting', 'Frequency maps', 'Index mapping', 'Prefix sums', 'Value-to-index mapping', 'Grouping by key'],
      timeComplexity: 'O(n) average with hash maps',
      spaceComplexity: 'O(n) for hash map storage',

      approach: [
        'Identify what you need to track: indices, counts, or previous values',
        'Choose the right key-value mapping: value→index, value→count, or transformed_value→list',
        'Decide if you need one pass (build + query simultaneously) or two passes (build then query)',
        'Handle edge cases: empty array, single element, all duplicates',
        'Consider if sorting helps (often O(n log n) is acceptable)'
      ],

      commonProblems: [
        // Easy
        { name: 'Two Sum', difficulty: 'Easy' },
        { name: 'Contains Duplicate', difficulty: 'Easy' },
        { name: 'Valid Anagram', difficulty: 'Easy' },
        { name: 'Move Zeroes', difficulty: 'Easy' },
        { name: 'Majority Element', difficulty: 'Easy' },
        { name: 'Remove Duplicates from Sorted Array', difficulty: 'Easy' },
        { name: 'Best Time to Buy and Sell Stock', difficulty: 'Easy' },
        { name: 'Design HashMap', difficulty: 'Easy' },
        { name: 'Design HashSet', difficulty: 'Easy' },
        { name: 'Maximum Number of Balloons', difficulty: 'Easy' },
        { name: 'Number of Good Pairs', difficulty: 'Easy' },
        { name: 'Isomorphic Strings', difficulty: 'Easy' },
        { name: 'Ransom Note', difficulty: 'Easy' },
        { name: 'Contains Duplicate II', difficulty: 'Easy' },
        { name: 'Range Sum Query - Immutable', difficulty: 'Easy' },
        { name: 'Monotonic Array', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays II', difficulty: 'Easy' },
        { name: 'Merge Sorted Array', difficulty: 'Easy' },
        { name: 'Plus One', difficulty: 'Easy' },
        { name: 'Pascal\'s Triangle', difficulty: 'Easy' },
        { name: 'Pascal\'s Triangle II', difficulty: 'Easy' },
        { name: 'Missing Number', difficulty: 'Easy' },
        { name: 'Single Number', difficulty: 'Easy' },
        { name: 'Find All Numbers Disappeared in an Array', difficulty: 'Easy' },
        { name: 'Third Maximum Number', difficulty: 'Easy' },
        { name: 'Word Pattern', difficulty: 'Easy' },
        { name: 'Check if the Sentence Is Pangram', difficulty: 'Easy' },
        { name: 'Count Binary Substrings', difficulty: 'Easy' },
        { name: 'Jewels and Stones', difficulty: 'Easy' },
        { name: 'Find the Difference', difficulty: 'Easy' },
        { name: 'First Unique Character in a String', difficulty: 'Easy' },
        { name: 'Longest Common Prefix', difficulty: 'Easy' },
        // Medium
        { name: 'Two Sum II', difficulty: 'Medium' },
        { name: 'Group Anagrams', difficulty: 'Medium' },
        { name: 'Top K Frequent Elements', difficulty: 'Medium' },
        { name: 'Top K Frequent Words', difficulty: 'Medium' },
        { name: 'Product of Array Except Self', difficulty: 'Medium' },
        { name: 'Longest Consecutive Sequence', difficulty: 'Medium' },
        { name: 'Subarray Sum Equals K', difficulty: 'Medium' },
        { name: 'Encode and Decode Strings', difficulty: 'Medium' },
        { name: 'Encode and Decode TinyURL', difficulty: 'Medium' },
        { name: 'Reorganize String', difficulty: 'Medium' },
        { name: 'Split Array into Consecutive Subsequences', difficulty: 'Medium' },
        { name: 'Number of Matching Subsequences', difficulty: 'Medium' },
        { name: 'Rotate Array', difficulty: 'Medium' },
        { name: 'Increasing Triplet Subsequence', difficulty: 'Medium' },
        { name: 'Number of Zero-Filled Subarrays', difficulty: 'Medium' },
        { name: 'Best Time to Buy and Sell Stock II', difficulty: 'Medium' },
        { name: 'Maximum Subarray', difficulty: 'Medium' },
        { name: 'Maximum Sum Circular Subarray', difficulty: 'Medium' },
        { name: 'Maximum Product Subarray', difficulty: 'Medium' },
        { name: 'Subarray Sums Divisible by K', difficulty: 'Medium' },
        { name: 'Continuous Subarray Sum', difficulty: 'Medium' },
        { name: 'Contiguous Array', difficulty: 'Medium' },
        { name: 'Set Matrix Zeroes', difficulty: 'Medium' },
        { name: 'Spiral Matrix', difficulty: 'Medium' },
        { name: 'Spiral Matrix II', difficulty: 'Medium' },
        { name: 'Rotate Image', difficulty: 'Medium' },
        { name: 'Valid Sudoku', difficulty: 'Medium' },
        { name: 'Game of Life', difficulty: 'Medium' },
        { name: 'Search a 2D Matrix', difficulty: 'Medium' },
        { name: 'Search a 2D Matrix II', difficulty: 'Medium' },
        { name: 'Prison Cells After N Days', difficulty: 'Medium' },
        { name: 'Maximum Consecutive Ones III', difficulty: 'Medium' },
        { name: 'Snakes and Ladders', difficulty: 'Medium' },
        { name: 'Verifying an Alien Dictionary', difficulty: 'Easy' },
        { name: 'Most Common Word', difficulty: 'Easy' },
        { name: 'Letter Combinations of a Phone Number', difficulty: 'Medium' },
        { name: 'Next Permutation', difficulty: 'Medium' },
        { name: 'Reorder Data in Log Files', difficulty: 'Medium' },
        { name: 'Kth Largest Element in an Array', difficulty: 'Medium' },
        { name: 'Restore IP Addresses', difficulty: 'Medium' },
        { name: 'Sort Colors', difficulty: 'Medium' },
        { name: '3Sum', difficulty: 'Medium' },
        { name: '4Sum', difficulty: 'Medium' },
        { name: 'Container With Most Water', difficulty: 'Medium' },
        { name: 'Find All Duplicates in an Array', difficulty: 'Medium' },
        { name: 'Find the Duplicate Number', difficulty: 'Medium' },
        { name: 'Merge Accounts', difficulty: 'Medium' },
        { name: 'Accounts Merge', difficulty: 'Medium' },
        { name: 'Brick Wall', difficulty: 'Medium' },
        { name: 'Custom Sort String', difficulty: 'Medium' },
        { name: 'Find Original Array From Doubled Array', difficulty: 'Medium' },
        { name: 'Insert Delete GetRandom O(1)', difficulty: 'Medium' },
        { name: 'Longest Substring Without Repeating Characters', difficulty: 'Medium' },
        { name: 'Minimum Size Subarray Sum', difficulty: 'Medium' },
        { name: 'Longest Repeating Character Replacement', difficulty: 'Medium' },
        { name: 'Permutation in String', difficulty: 'Medium' },
        { name: 'Find All Anagrams in a String', difficulty: 'Medium' },
        { name: 'Array of Doubled Pairs', difficulty: 'Medium' },
        { name: 'Repeated DNA Sequences', difficulty: 'Medium' },
        { name: 'Minimum Operations to Reduce X to Zero', difficulty: 'Medium' },
        { name: 'Shortest Unsorted Continuous Subarray', difficulty: 'Medium' },
        { name: 'Daily Temperatures', difficulty: 'Medium' },
        // Hard
        { name: 'First Missing Positive', difficulty: 'Hard' },
        { name: 'Trapping Rain Water', difficulty: 'Hard' },
        { name: 'Sliding Window Maximum', difficulty: 'Hard' },
        { name: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
        { name: 'Minimum Window Substring', difficulty: 'Hard' },
        { name: 'Palindrome Pairs', difficulty: 'Hard' },
        { name: 'Longest Duplicate Substring', difficulty: 'Hard' },
        { name: 'Subarrays with K Different Integers', difficulty: 'Hard' },
        { name: 'Substring with Concatenation of All Words', difficulty: 'Hard' },
        { name: 'Count of Smaller Numbers After Self', difficulty: 'Hard' },
        { name: 'Reverse Pairs', difficulty: 'Hard' },
        { name: 'Max Value of Equation', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is an array?', difficulty: 'Easy', answer: 'An array is a contiguous block of memory storing elements of the same type, accessible by index in O(1) time. Elements are stored sequentially, enabling direct memory address calculation: address = base + (index × element_size).' },
        { question: 'Explain the concept of an array index.', difficulty: 'Easy', answer: 'An array index is a zero-based (in most languages) integer that identifies an element\'s position. It maps directly to memory offset, enabling O(1) random access. Index bounds are [0, length-1]; accessing outside causes undefined behavior or exceptions.' },
        { question: 'What is the time complexity of accessing an element in an array?', difficulty: 'Easy', answer: 'O(1) constant time. The memory address is calculated directly: base_address + (index × element_size). This is why arrays excel at random access compared to linked lists which require O(n) traversal.' },
        { question: 'How do you find the length of an array in various programming languages?', difficulty: 'Easy', answer: 'Python: len(arr), JavaScript: arr.length, Java: arr.length, C++: sizeof(arr)/sizeof(arr[0]) for static arrays or vector.size(), Go: len(arr). Dynamic languages store length as metadata; C requires manual tracking.' },
        { question: 'What are the limitations of arrays?', difficulty: 'Easy', answer: 'Fixed size (static arrays), expensive insertion/deletion O(n), contiguous memory requirement (fragmentation issues), homogeneous types only, no built-in bounds checking in C/C++, and memory waste if allocated size exceeds usage.' },
        { question: 'What is a slice operation in the context of arrays, and how is it useful?', difficulty: 'Easy', answer: 'A slice extracts a subarray using start:end notation (e.g., arr[1:4]). It creates a view or copy of elements in range [start, end). Useful for processing portions of data, implementing sliding windows, and avoiding manual index loops.' },
        { question: 'Explain the concept of a dynamic array.', difficulty: 'Easy', answer: 'A dynamic array (ArrayList, vector, list) automatically resizes when capacity is exceeded. It doubles capacity on overflow (amortized O(1) append), copies elements to new memory, and provides O(1) random access with flexible sizing. Examples: Python list, Java ArrayList, C++ vector.' },
        // Mid
        { question: 'What is a two-dimensional array, and how is it different from a regular array?', difficulty: 'Medium', answer: 'A 2D array is an array of arrays, creating a matrix structure accessed via two indices: arr[row][col]. Stored in row-major (C, Python) or column-major (Fortran) order. Used for grids, matrices, and graph adjacency matrices. Memory layout affects cache performance.' },
        { question: 'What is the difference between an array and a linked list?', difficulty: 'Medium', answer: 'Arrays: O(1) access, O(n) insert/delete, contiguous memory, better cache locality. Linked Lists: O(n) access, O(1) insert/delete at known position, non-contiguous memory, extra pointer overhead. Choose arrays for random access; linked lists for frequent insertions.' },
        { question: 'How can you reverse the elements of an array in-place?', difficulty: 'Medium', answer: 'Use two pointers at start and end, swap elements, move pointers inward until they meet. Time: O(n), Space: O(1). Code: for i in range(len(arr)//2): arr[i], arr[n-1-i] = arr[n-1-i], arr[i]. This is the optimal in-place solution.' },
        { question: 'What are some common use cases for arrays in software development?', difficulty: 'Medium', answer: 'Storing collections (users, products), implementing stacks/queues, matrix operations, lookup tables, buffers for I/O, image pixel data, hash table buckets, dynamic programming memoization, and as building blocks for other data structures.' },
        { question: 'What is the difference between a static array and a dynamic array?', difficulty: 'Medium', answer: 'Static arrays have compile-time fixed size allocated on stack (faster but limited). Dynamic arrays resize at runtime, allocated on heap, with amortized O(1) append via capacity doubling. Trade-off: static is faster but inflexible; dynamic handles unknown sizes.' },
        { question: 'Explain the concept of a sparse array.', difficulty: 'Medium', answer: 'A sparse array has mostly zero/default values. Instead of storing all elements, use a hash map {index: value} or coordinate list. Saves memory from O(n) to O(k) where k is non-zero count. Used in sparse matrices, document-term matrices, and graph adjacency.' },
        { question: 'What is a jagged array, and how is it different from a regular two-dimensional array?', difficulty: 'Medium', answer: 'A jagged array has rows of varying lengths (array of arrays with different sizes). Unlike rectangular 2D arrays where all rows have equal length, jagged arrays save memory for non-uniform data. Example: representing a triangle where row i has i+1 elements.' },
        { question: 'How can you find the maximum and minimum elements in an array efficiently?', difficulty: 'Medium', answer: 'Single pass O(n): track min and max while iterating. Optimized: compare pairs, reducing comparisons from 2n to 3n/2. Use min/max heap for streaming data. For sorted arrays, min=arr[0], max=arr[n-1]. Built-in: max(arr), min(arr) in Python.' },
        { question: 'What is the concept of a circular array, and why might it be useful?', difficulty: 'Medium', answer: 'A circular array wraps around using modulo: index % length. Useful for circular buffers, round-robin scheduling, implementing circular queues with O(1) operations, and problems like "maximum sum circular subarray". Eliminates need for shifting elements.' },
        { question: 'What are some potential challenges with cache locality when working with large arrays?', difficulty: 'Medium', answer: 'Non-sequential access causes cache misses. Row-major vs column-major mismatch hurts performance. Large arrays may not fit in cache. Solutions: access sequentially, use blocking/tiling for matrices, prefer row-wise iteration in C/Python, consider cache line size (64 bytes).' },
        { question: 'How can you find the intersection of two arrays efficiently?', difficulty: 'Medium', answer: 'Hash set approach O(n+m): add smaller array to set, check larger array against it. Sorted arrays: two pointers O(n+m) after O(n log n) sort. For frequent queries, sort once then binary search. Handle duplicates by using Counter/multiset.' },
        { question: 'What are some common mistakes or pitfalls to avoid when working with arrays?', difficulty: 'Medium', answer: 'Off-by-one errors (bounds), modifying array while iterating, forgetting zero-indexing, integer overflow in index calculations, shallow vs deep copy confusion, not handling empty arrays, assuming sorted input, and memory leaks with dynamic allocation.' },
        { question: 'Explain the concept of a multidimensional array. How does it differ from a two-dimensional array?', difficulty: 'Medium', answer: 'Multidimensional arrays extend beyond 2D: 3D for volumetric data (x,y,z), 4D for video (x,y,z,time), nD for tensors in ML. Accessed via multiple indices arr[i][j][k]. Memory grows exponentially with dimensions. Flatten to 1D for storage optimization.' },
        { question: 'What is the difference between an array and a list in Python?', difficulty: 'Medium', answer: 'Python list: dynamic, heterogeneous types, built-in methods, slower. array.array: homogeneous types, more memory efficient, faster numeric operations. NumPy array: optimized for numerical computing, vectorized operations, broadcasting. Use list for general purpose; arrays for performance-critical numeric work.' },
        { question: 'How can you efficiently remove duplicate elements from an unsorted array?', difficulty: 'Medium', answer: 'Hash set O(n): seen = set(); result = [x for x in arr if not (x in seen or seen.add(x))]. Preserves order. Alternative: sort first O(n log n) then remove adjacent duplicates. For sorted arrays: two-pointer in-place O(n). Trade-off between time, space, and order preservation.' },
        { question: 'What is a rolling array or sliding window in the context of array manipulation?', difficulty: 'Medium', answer: 'Rolling array: reuse array space in DP by keeping only necessary previous states (e.g., dp[i%2] instead of dp[i]). Sliding window: maintain a window [left, right] that moves through array for subarray problems. Both optimize space to O(1) or O(k) from O(n).' },
        // Senior
        { question: 'What are the benefits and drawbacks of using arrays in low-level systems programming?', difficulty: 'Hard', answer: 'Benefits: predictable memory layout, cache efficiency, zero overhead, direct hardware mapping, DMA compatibility. Drawbacks: manual memory management, buffer overflows, no bounds checking, fragmentation with large allocations, fixed size limitations. Critical for embedded systems, drivers, and performance-critical code.' },
        { question: 'Explain the concept of a bit array or bitset. How is it different from a regular array?', difficulty: 'Hard', answer: 'A bit array stores boolean values as individual bits, using 8x less memory than byte arrays. Operations use bitwise AND/OR/XOR. Used for Bloom filters, prime sieves, set membership, and flags. Access: (arr[i/8] >> (i%8)) & 1. Trade-off: more CPU ops for memory savings.' },
        { question: 'How do you implement a resizable array (dynamic array) from scratch?', difficulty: 'Hard', answer: 'Maintain array, size, and capacity. On append: if size == capacity, allocate 2x capacity array, copy elements, free old array. Amortized O(1) append proven via aggregate analysis. Shrink at 1/4 capacity to avoid thrashing. Handle edge cases: empty, single element, capacity overflow.' },
        { question: 'Explain the concept of a circular buffer and its applications.', difficulty: 'Hard', answer: 'A circular buffer uses fixed-size array with head/tail pointers wrapping via modulo. O(1) enqueue/dequeue without shifting. Applications: producer-consumer queues, audio/video streaming buffers, network packet buffers, command history (shell), and real-time data logging. Lock-free variants exist for concurrency.' },
        { question: 'What is a bitmask, and how can it be used with arrays?', difficulty: 'Hard', answer: 'A bitmask is an integer where each bit represents a boolean state. With arrays: track visited elements (2^n subsets), represent sets compactly, filter elements (arr[i] if mask & (1<<i)), implement DP over subsets. Example: traveling salesman uses dp[mask][i] where mask encodes visited cities.' }
      ],

      commonMistakes: [
        'Using nested loops when a hash map would give O(n) solution',
        'Forgetting that hash map keys must be immutable (use tuple instead of list)',
        'Not handling the case where the same element appears twice in Two Sum',
        'Modifying a collection while iterating over it',
        'Assuming hash map operations are always O(1) - they\'re O(n) worst case'
      ],

      tips: [
        'Use hash maps for O(1) lookups instead of nested loops',
        'Consider sorting when order doesn\'t matter for O(n log n) solution',
        'Prefix sums enable O(1) range queries after O(n) preprocessing',
        'For counting problems, defaultdict or Counter in Python simplifies code',
        'When grouping, use sorted string or tuple as the hash key'
      ],

      interviewTips: [
        'Always clarify: Are there duplicates? Are elements sorted? What to return if no solution?',
        'Start with brute force O(n²) then optimize to O(n) with hash map',
        'Verbalize your thought process: "I need O(1) lookup, so I\'ll use a hash map"',
        'For Two Sum variants, clarify if same element can be used twice',
        'Mention space-time tradeoff: hash map uses extra space for faster lookup'
      ],

      codeExamples: [
        {
          title: 'Two Sum - Classic Hash Map Pattern',
          language: 'python',
          description: 'Find two numbers that add up to target. O(n) time, O(n) space.',
          code: `def two_sum(nums, target):
    seen = {}  # value -> index
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Key insight: Store what you've seen, check for complement`
        },
        {
          title: 'Group Anagrams - Sorted String as Key',
          language: 'python',
          description: 'Group words that are anagrams. O(n * k log k) where k is max word length.',
          code: `def group_anagrams(strs):
    groups = defaultdict(list)
    for s in strs:
        # Sort characters to create canonical form
        key = tuple(sorted(s))
        groups[key].append(s)
    return list(groups.values())

# Alternative: Use character count tuple as key for O(n*k)`
        },
        {
          title: 'Subarray Sum Equals K - Prefix Sum + Hash Map',
          language: 'python',
          description: 'Count subarrays with sum equal to k. O(n) time, O(n) space.',
          code: `def subarray_sum(nums, k):
    count = 0
    prefix_sum = 0
    # Map: prefix_sum -> count of occurrences
    seen = {0: 1}  # Empty prefix has sum 0

    for num in nums:
        prefix_sum += num
        # If (prefix_sum - k) exists, we found subarrays
        if prefix_sum - k in seen:
            count += seen[prefix_sum - k]
        seen[prefix_sum] = seen.get(prefix_sum, 0) + 1

    return count`
        }
      ,
        {
          title: 'Two Sum - Classic Hash Map Pattern',
          language: 'javascript',
          description: 'Find two numbers that add up to target. O(n) time, O(n) space.',
          code: `function twoSum(nums, target) {
    const seen = new Map(); // value -> index
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement), i];
        }
        seen.set(nums[i], i);
    }
    return [];
}

// Key insight: Store what you've seen, check for complement`
        },
        {
          title: 'Two Sum - Classic Hash Map Pattern',
          language: 'java',
          description: 'Find two numbers that add up to target. O(n) time, O(n) space.',
          code: `public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // value -> index
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i};
        }
        seen.put(nums[i], i);
    }
    return new int[]{};
}

// Key insight: Store what you've seen, check for complement`
        },
        {
          title: 'Group Anagrams - Sorted String as Key',
          language: 'javascript',
          description: 'Group words that are anagrams. O(n * k log k) where k is max word length.',
          code: `function groupAnagrams(strs) {
    const groups = new Map();
    for (const s of strs) {
        // Sort characters to create canonical form
        const key = [...s].sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(s);
    }
    return [...groups.values()];
}

// Alternative: Use character count as key for O(n*k)`
        },
        {
          title: 'Group Anagrams - Sorted String as Key',
          language: 'java',
          description: 'Group words that are anagrams. O(n * k log k) where k is max word length.',
          code: `public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        // Sort characters to create canonical form
        char[] chars = s.toCharArray();
        Arrays.sort(chars);
        String key = new String(chars);
        groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}

// Alternative: Use character count array as key for O(n*k)`
        },
        {
          title: 'Subarray Sum Equals K - Prefix Sum + Hash Map',
          language: 'javascript',
          description: 'Count subarrays with sum equal to k. O(n) time, O(n) space.',
          code: `function subarraySum(nums, k) {
    let count = 0;
    let prefixSum = 0;
    const seen = new Map([[0, 1]]); // Empty prefix has sum 0

    for (const num of nums) {
        prefixSum += num;
        // If (prefixSum - k) exists, we found subarrays
        if (seen.has(prefixSum - k)) {
            count += seen.get(prefixSum - k);
        }
        seen.set(prefixSum, (seen.get(prefixSum) || 0) + 1);
    }
    return count;
}`
        },
        {
          title: 'Subarray Sum Equals K - Prefix Sum + Hash Map',
          language: 'java',
          description: 'Count subarrays with sum equal to k. O(n) time, O(n) space.',
          code: `public int subarraySum(int[] nums, int k) {
    int count = 0, prefixSum = 0;
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1); // Empty prefix has sum 0

    for (int num : nums) {
        prefixSum += num;
        // If (prefixSum - k) exists, we found subarrays
        if (seen.containsKey(prefixSum - k)) {
            count += seen.get(prefixSum - k);
        }
        seen.merge(prefixSum, 1, Integer::sum);
    }
    return count;
}`
        }
      ]
    },
    {
      id: 'binary-search',
      title: 'Binary Search',
      icon: 'search',
      color: '#f59e0b',
      questions: 23,
      description: 'Divide and conquer on sorted data. Essential for O(log n) solutions.',

visualizations: [
        {
          title: 'Binary Search: L, M, R Pointers',
          language: 'python',
          description: 'Shows a sorted array with Left, Mid, and Right pointers narrowing the search space to find the target.',
          svg: '<svg viewBox="0 0 500 210" xmlns="http://www.w3.org/2000/svg" style="background:white"><text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Binary Search — Target = 23</text><g><rect x="20" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="42" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">2</text><rect x="68" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="90" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">5</text><rect x="116" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="138" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">8</text><rect x="164" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="186" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">12</text><rect x="212" y="55" width="44" height="36" rx="4" fill="#fef3c7" stroke="#f59e0b" stroke-width="2.5"/><text x="234" y="78" font-family="monospace" font-size="12" fill="#f59e0b" font-weight="bold" text-anchor="middle">16</text><rect x="260" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="282" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">19</text><rect x="308" y="55" width="44" height="36" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2.5"/><text x="330" y="78" font-family="monospace" font-size="12" fill="#10b981" font-weight="bold" text-anchor="middle">23</text><rect x="356" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="378" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">34</text><rect x="404" y="55" width="44" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="426" y="78" font-family="monospace" font-size="12" fill="#1e293b" text-anchor="middle">45</text></g><polygon points="42,50 36,40 48,40" fill="#10b981"/><text x="42" y="36" font-family="sans-serif" font-size="11" fill="#10b981" text-anchor="middle" font-weight="bold">L</text><polygon points="234,50 228,40 240,40" fill="#f59e0b"/><text x="234" y="36" font-family="sans-serif" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">M</text><polygon points="426,50 420,40 432,40" fill="#ef4444"/><text x="426" y="36" font-family="sans-serif" font-size="11" fill="#ef4444" text-anchor="middle" font-weight="bold">R</text><text x="20" y="115" font-family="sans-serif" font-size="12" fill="#1e293b">Step 1: M=16 &lt; 23 → search right half (L=M+1)</text><text x="20" y="135" font-family="sans-serif" font-size="12" fill="#1e293b">Step 2: New L=19, M=23 = target → found at index 6!</text><line x1="20" y1="150" x2="460" y2="150" stroke="#e2e8f0" stroke-width="1"/><rect x="20" y="162" width="435" height="24" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="30" y="179" font-family="sans-serif" font-size="11" fill="#10b981">Halves search space each step → O(log n) time, O(1) space</text></svg>'
        }
      ],

      introduction: `Binary Search is a fundamental algorithm that reduces search time from O(n) to O(log n) by repeatedly dividing the search space in half. It's one of the most important patterns to master.

**The Key Insight:**
Binary search works on any **monotonic** property—not just sorted arrays. If you can define a predicate function that goes from False to True (or True to False) as you move through the search space, you can binary search.

**Why It's Powerful:**
- Reduces search from O(n) to O(log n)—for 1 billion elements, that's 30 operations vs 1 billion
- Works on answer spaces ("What's the minimum X such that condition holds?")
- Can find boundaries (leftmost/rightmost occurrence)`,

      whenToUse: [
        'Searching in a sorted array or matrix',
        'Finding the boundary where a condition changes from False to True',
        '"Minimum/Maximum value that satisfies condition" problems',
        'Rotated sorted array problems',
        'Problems asking for O(log n) time complexity',
        'When you need to search an "answer space" rather than an array'
      ],

      keyPatterns: ['Standard binary search', 'Left/right boundary', 'Rotated arrays', 'Search in 2D matrix', 'Binary search on answer', 'Peak finding'],
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1) iterative, O(log n) recursive',

      approach: [
        'Define your search space: [left, right] inclusive or [left, right) exclusive',
        'Define the invariant: what property must hold throughout the search',
        'Calculate mid: use left + (right - left) // 2 to avoid overflow',
        'Determine which half to eliminate based on your condition',
        'Handle the termination: when left meets right, you have your answer',
        'Return appropriately: index, value, or "not found"'
      ],

      commonProblems: [
        // Easy
        { name: 'Binary Search', difficulty: 'Easy' },
        { name: 'First Bad Version', difficulty: 'Easy' },
        { name: 'Search Insert Position', difficulty: 'Easy' },
        { name: 'Guess Number Higher or Lower', difficulty: 'Easy' },
        { name: 'Valid Perfect Square', difficulty: 'Easy' },
        { name: 'Sqrt(x)', difficulty: 'Easy' },
        { name: 'Arranging Coins', difficulty: 'Easy' },
        { name: 'Count Negative Numbers in a Sorted Matrix', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays II', difficulty: 'Easy' },
        { name: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium' },
        // Medium
        { name: 'Search in Rotated Sorted Array', difficulty: 'Medium' },
        { name: 'Search in Rotated Sorted Array II', difficulty: 'Medium' },
        { name: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium' },
        { name: 'Find Minimum in Rotated Sorted Array II', difficulty: 'Hard' },
        { name: 'Find Peak Element', difficulty: 'Medium' },
        { name: 'Peak Index in a Mountain Array', difficulty: 'Medium' },
        { name: 'Find in Mountain Array', difficulty: 'Hard' },
        { name: 'Search a 2D Matrix', difficulty: 'Medium' },
        { name: 'Search a 2D Matrix II', difficulty: 'Medium' },
        { name: 'Koko Eating Bananas', difficulty: 'Medium' },
        { name: 'Capacity To Ship Packages Within D Days', difficulty: 'Medium' },
        { name: 'Minimum Number of Days to Make m Bouquets', difficulty: 'Medium' },
        { name: 'Find the Smallest Divisor Given a Threshold', difficulty: 'Medium' },
        { name: 'Magnetic Force Between Two Balls', difficulty: 'Medium' },
        { name: 'Find K Closest Elements', difficulty: 'Medium' },
        { name: 'Time Based Key-Value Store', difficulty: 'Medium' },
        { name: 'Random Pick with Weight', difficulty: 'Medium' },
        { name: 'Find First and Last Position of Element', difficulty: 'Medium' },
        { name: 'Single Element in a Sorted Array', difficulty: 'Medium' },
        { name: 'Find Right Interval', difficulty: 'Medium' },
        { name: 'Minimum Limit of Balls in a Bag', difficulty: 'Medium' },
        { name: 'Maximum Value at a Given Index in a Bounded Array', difficulty: 'Medium' },
        { name: 'Minimize Maximum of Array', difficulty: 'Medium' },
        // Hard
        { name: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
        { name: 'Split Array Largest Sum', difficulty: 'Hard' },
        { name: 'Aggressive Cows', difficulty: 'Hard' },
        { name: 'Book Allocation Problem', difficulty: 'Hard' },
        { name: 'Painters Partition Problem', difficulty: 'Hard' },
        { name: 'Minimize Max Distance to Gas Station', difficulty: 'Hard' },
        { name: 'Kth Smallest Number in Multiplication Table', difficulty: 'Hard' },
        { name: 'Find K-th Smallest Pair Distance', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is binary search, and what are its prerequisites?', difficulty: 'Easy', answer: 'Binary search is a divide-and-conquer algorithm that finds a target in a sorted collection by repeatedly halving the search space. Prerequisites: the data must have a monotonic property (typically sorted). Compare the middle element with the target; if equal, found; if target is smaller, search left half; if larger, search right half. Time O(log n), space O(1) iterative or O(log n) recursive. It reduces 1 billion elements to about 30 comparisons.' },
        { question: 'What is the time and space complexity of binary search?', difficulty: 'Easy', answer: 'Time complexity is O(log n) because each comparison halves the search space. After k comparisons, the search space is n/2^k; solving n/2^k = 1 gives k = log2(n). Space complexity is O(1) for iterative implementation (just left, right, mid variables) or O(log n) for recursive due to the call stack. This makes binary search vastly superior to linear search O(n) for large sorted datasets.' },
        { question: 'How do you calculate the middle index safely in binary search?', difficulty: 'Easy', answer: 'Use mid = left + (right - left) // 2 instead of mid = (left + right) // 2. The naive formula can cause integer overflow when left + right exceeds the maximum integer value (relevant in C/C++/Java with 32-bit ints). The safe formula subtracts first, avoiding overflow. In Python this is not an issue due to arbitrary precision integers, but it is still good practice for portability and interview correctness.' },
        { question: 'What is the difference between binary search and linear search?', difficulty: 'Easy', answer: 'Linear search checks elements one by one, O(n) time, works on unsorted data, O(1) space. Binary search halves the search space each step, O(log n) time, requires sorted/monotonic data, O(1) space iterative. For n=1,000,000: linear needs up to 1M comparisons; binary needs about 20. Linear search is simpler and preferred for small or unsorted datasets. Binary search is essential when data is sorted and performance matters.' },
        { question: 'What are the two main templates for binary search?', difficulty: 'Easy', answer: 'Template 1 — Find exact match: while left <= right, return mid when found, move left = mid + 1 or right = mid - 1. Terminates when left > right. Template 2 — Find boundary: while left < right, move left = mid + 1 or right = mid. Returns the first position satisfying a condition. Template 2 is more versatile—it handles leftmost/rightmost occurrence, insertion point, and "binary search on answer" problems. Choosing the wrong template is a common source of bugs.' },
        // Mid
        { question: 'What is "binary search on answer" and when do you use it?', difficulty: 'Medium', answer: 'Binary search on answer searches a range of possible answers rather than an array. You define a feasibility function: given a candidate answer, can we achieve it? If the feasibility is monotonic (once true, stays true), binary search finds the optimal boundary. Examples: Koko Eating Bananas (minimum speed), Split Array Largest Sum (minimize max sum), Capacity to Ship Packages (minimum capacity). Pattern: define lo/hi for answer range, write canAchieve(mid), binary search for the boundary. Very powerful for optimization problems.' },
        { question: 'How do you find the leftmost and rightmost occurrence of a target?', difficulty: 'Medium', answer: 'Leftmost: use while left < right with right = mid (not mid-1) when nums[mid] >= target, left = mid + 1 when nums[mid] < target. Returns leftmost index >= target. Rightmost: use while left < right with left = mid (using mid = left + (right - left + 1) // 2 to avoid infinite loop) when nums[mid] <= target. Alternatively, find leftmost of target+1 and subtract 1. These are critical for "Find First and Last Position" problems. The key insight is that when you find the target, instead of returning immediately, you continue searching to find the boundary.' },
        { question: 'How does binary search work on a rotated sorted array?', difficulty: 'Medium', answer: 'A rotated sorted array like [4,5,6,7,0,1,2] has two sorted halves. At each step, determine which half is sorted by comparing nums[left] with nums[mid]. If the left half is sorted (nums[left] <= nums[mid]), check if target falls in [left, mid); if yes, search left, else search right. If the right half is sorted, check if target falls in (mid, right]; if yes, search right, else search left. This handles the rotation by always having one guaranteed sorted half to compare against. Time remains O(log n).' },
        { question: 'What is the difference between binary search on arrays vs binary search on answer spaces?', difficulty: 'Medium', answer: 'Array binary search: search for a specific value in a sorted array, comparing arr[mid] with target. Answer space binary search: search for an optimal value in a range [lo, hi], using a feasibility function to determine which half to eliminate. Array search returns an index; answer search returns a value. Answer search is more general—it applies to optimization problems where you ask "what is the minimum X such that condition holds?" The feasibility function replaces direct comparison, making it applicable to a wider range of problems.' },
        { question: 'How do you apply binary search to a 2D sorted matrix?', difficulty: 'Medium', answer: 'Two approaches depending on matrix properties. If rows and columns are independently sorted (Search a 2D Matrix II): start from top-right corner, go left if too large, down if too small. O(m+n) time. If the matrix is fully sorted row-wise (Search a 2D Matrix): treat it as a 1D array of m*n elements, map index to row=mid/n, col=mid%n. O(log(m*n)) time. The fully sorted case is a direct application of standard binary search with coordinate mapping.' },
        { question: 'What are common variations of binary search problems in interviews?', difficulty: 'Medium', answer: 'Key variations include: (1) Find exact match in sorted array, (2) Find first/last occurrence, (3) Find insertion position (bisect_left), (4) Search in rotated sorted array, (5) Find peak element in mountain array, (6) Binary search on answer (Koko, Ship Packages, Split Array), (7) Find minimum in rotated array, (8) Search in infinite sorted array (exponential search first), (9) Find K closest elements, (10) Median of two sorted arrays. Categories 1-4 are most common; category 6 is increasingly popular at top companies.' },
        // Senior
        { question: 'Explain exponential search and when it is preferred over binary search.', difficulty: 'Hard', answer: 'Exponential search finds the range containing the target by doubling the index (1, 2, 4, 8, ...) until arr[i] >= target, then binary searches within [i/2, i]. Total time: O(log k) where k is the position of the target. Preferred when: (1) target is near the beginning (outperforms binary search), (2) array size is unknown or infinite (unbounded search), (3) data is accessed sequentially (good cache performance). Combines advantages of linear scan for nearby elements with binary search for distant ones.' },
        { question: 'How does fractional cascading optimize binary search on multiple sorted arrays?', difficulty: 'Hard', answer: 'Fractional cascading answers "find x in k sorted arrays of size n each." Naive approach: k binary searches, O(k log n). Fractional cascading: merge every other element from each array into the next, creating shortcuts between arrays. After finding x in the first array O(log n), subsequent searches take O(1) each using the shortcuts. Total: O(log n + k) instead of O(k log n). Used in computational geometry (layered range trees) and database indexing. The name comes from "cascading" results through arrays with "fractional" element propagation.' },
        { question: 'What is the connection between binary search and the bisection method in numerical analysis?', difficulty: 'Hard', answer: 'The bisection method is the continuous analog of binary search. It finds roots of continuous functions f(x) on [a,b] where f(a) and f(b) have opposite signs (by intermediate value theorem, a root exists). Repeatedly halve the interval by evaluating f(mid). Convergence rate: one bit of precision per iteration, O(log((b-a)/epsilon)) iterations for epsilon accuracy. Binary search on answer is essentially discrete bisection. Both exploit monotonicity to halve the search space. The key theoretical connection: any problem with a monotonic predicate can be solved with this paradigm.' }
      ],

      commonMistakes: [
        'Off-by-one errors: confusing inclusive [left, right] vs exclusive [left, right) bounds',
        'Infinite loops from wrong mid calculation or boundary updates',
        'Using left + right instead of left + (right - left) // 2 (integer overflow)',
        'Not handling empty arrays or single-element arrays',
        'Forgetting that binary search requires monotonic property, not just "sorted"',
        'Returning wrong value when element not found'
      ],

      tips: [
        'Use left + (right - left) // 2 to avoid integer overflow',
        'Identify if you need leftmost or rightmost occurrence',
        'Binary search works on any monotonic function, not just arrays',
        'For "minimum that satisfies condition" problems, search the answer space',
        'Draw out the invariant: what must be true about left and right at each step?'
      ],

      interviewTips: [
        'Clarify: Is the array sorted? What to return if not found?',
        'State your loop invariant explicitly: "left will always be ≤ answer, right will always be ≥ answer"',
        'Test your code with: empty array, single element, element not present, duplicates',
        'Know both templates: find exact match vs find boundary',
        'For "binary search on answer" problems, identify the range of possible answers first'
      ],

      codeExamples: [
        {
          title: 'Template 1: Find Exact Match',
          language: 'python',
          description: 'Standard binary search. Returns index or -1 if not found.',
          code: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1  # Not found`
        },
        {
          title: 'Template 2: Find Left Boundary',
          language: 'python',
          description: 'Find leftmost position where target could be inserted.',
          code: `def search_left(nums, target):
    left, right = 0, len(nums)

    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid

    return left  # First position >= target`
        },
        {
          title: 'Binary Search on Answer: Koko Eating Bananas',
          language: 'python',
          description: 'Search the answer space instead of an array.',
          code: `def min_eating_speed(piles, h):
    def can_finish(speed):
        hours = sum((p + speed - 1) // speed for p in piles)
        return hours <= h

    left, right = 1, max(piles)

    while left < right:
        mid = left + (right - left) // 2
        if can_finish(mid):
            right = mid      # Try smaller speed
        else:
            left = mid + 1   # Need faster speed

    return left`
        },
        {
          title: 'Search in Rotated Sorted Array',
          language: 'python',
          description: 'Binary search when array is rotated at an unknown pivot.',
          code: `def search_rotated(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid

        # Left half is sorted
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # Right half is sorted
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1`
        }
      ,
        {
          title: 'Template 1: Find Exact Match',
          language: 'javascript',
          description: 'Standard binary search. Returns index or -1 if not found.',
          code: `function binarySearch(nums, target) {
    let left = 0, right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1; // Not found
}`
        },
        {
          title: 'Template 1: Find Exact Match',
          language: 'java',
          description: 'Standard binary search. Returns index or -1 if not found.',
          code: `public int binarySearch(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        else if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1; // Not found
}`
        },
        {
          title: 'Template 2: Find Left Boundary',
          language: 'javascript',
          description: 'Find leftmost position where target could be inserted.',
          code: `function searchLeft(nums, target) {
    let left = 0, right = nums.length;

    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] < target) left = mid + 1;
        else right = mid;
    }
    return left; // First position >= target
}`
        },
        {
          title: 'Template 2: Find Left Boundary',
          language: 'java',
          description: 'Find leftmost position where target could be inserted.',
          code: `public int searchLeft(int[] nums, int target) {
    int left = 0, right = nums.length;

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] < target) left = mid + 1;
        else right = mid;
    }
    return left; // First position >= target
}`
        },
        {
          title: 'Binary Search on Answer: Koko Eating Bananas',
          language: 'javascript',
          description: 'Search the answer space instead of an array.',
          code: `function minEatingSpeed(piles, h) {
    function canFinish(speed) {
        return piles.reduce((hrs, p) => hrs + Math.ceil(p / speed), 0) <= h;
    }

    let left = 1, right = Math.max(...piles);
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);
        if (canFinish(mid)) right = mid;    // Try smaller speed
        else left = mid + 1;                // Need faster speed
    }
    return left;
}`
        },
        {
          title: 'Binary Search on Answer: Koko Eating Bananas',
          language: 'java',
          description: 'Search the answer space instead of an array.',
          code: `public int minEatingSpeed(int[] piles, int h) {
    int left = 1, right = Arrays.stream(piles).max().getAsInt();

    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canFinish(piles, mid, h)) right = mid;
        else left = mid + 1;
    }
    return left;
}

private boolean canFinish(int[] piles, int speed, int h) {
    int hours = 0;
    for (int p : piles) hours += (p + speed - 1) / speed;
    return hours <= h;
}`
        },
        {
          title: 'Search in Rotated Sorted Array',
          language: 'javascript',
          description: 'Binary search when array is rotated at an unknown pivot.',
          code: `function searchRotated(nums, target) {
    let left = 0, right = nums.length - 1;

    while (left <= right) {
        const mid = left + Math.floor((right - left) / 2);
        if (nums[mid] === target) return mid;

        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}`
        },
        {
          title: 'Search in Rotated Sorted Array',
          language: 'java',
          description: 'Binary search when array is rotated at an unknown pivot.',
          code: `public int searchRotated(int[] nums, int target) {
    int left = 0, right = nums.length - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;

        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            if (nums[left] <= target && target < nums[mid]) right = mid - 1;
            else left = mid + 1;
        } else {
            if (nums[mid] < target && target <= nums[right]) left = mid + 1;
            else right = mid - 1;
        }
    }
    return -1;
}`
        }
      ]
    },
    {
      id: 'two-pointers',
      title: 'Two Pointers',
      icon: 'chevronsRight',
      color: '#3b82f6',
      questions: 18,
      description: 'Efficient technique for sorted arrays and linked lists. Reduces O(n²) to O(n).',

visualizations: [
        {
          title: 'Two Pointers: Converging on Sorted Array',
          language: 'python',
          description: 'Shows left (green) and right (red) pointers moving toward the center on a sorted array to find a target sum.',
          svg: '<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah2" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Sorted Array — Target Sum = 12</text><g><rect x="30" y="50" width="50" height="40" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2.5"/><text x="55" y="76" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">1</text><rect x="85" y="50" width="50" height="40" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="110" y="76" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">3</text><rect x="140" y="50" width="50" height="40" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="165" y="76" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">5</text><rect x="195" y="50" width="50" height="40" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="220" y="76" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">7</text><rect x="250" y="50" width="50" height="40" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="275" y="76" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">9</text><rect x="305" y="50" width="50" height="40" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="330" y="76" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">11</text><rect x="360" y="50" width="50" height="40" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="2.5"/><text x="385" y="76" font-family="monospace" font-size="14" fill="#ef4444" font-weight="bold" text-anchor="middle">15</text></g><polygon points="55,44 49,34 61,34" fill="#10b981"/><text x="55" y="30" font-family="sans-serif" font-size="11" fill="#10b981" text-anchor="middle" font-weight="bold">L</text><polygon points="385,44 379,34 391,34" fill="#ef4444"/><text x="385" y="30" font-family="sans-serif" font-size="11" fill="#ef4444" text-anchor="middle" font-weight="bold">R</text><line x1="80" y1="70" x2="120" y2="70" stroke="#10b981" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#ah2)"/><line x1="355" y1="70" x2="320" y2="70" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#ah2)"/><text x="20" y="120" font-family="sans-serif" font-size="12" fill="#1e293b">Step 1: L=1 + R=15 = 16 &gt; 12 → move R left</text><text x="20" y="140" font-family="sans-serif" font-size="12" fill="#1e293b">Step 2: L=1 + R=11 = 12 = target → found!</text><rect x="20" y="158" width="420" height="24" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="30" y="175" font-family="sans-serif" font-size="11" fill="#10b981">sum &lt; target → move L right | sum &gt; target → move R left | O(n) time</text></svg>'
        }
      ],

      introduction: `Two Pointers is a technique that uses two index variables to traverse a data structure, typically reducing time complexity from O(n²) to O(n). It's essential for array and linked list problems.

**Three Main Variants:**
1. **Opposite Direction**: Start from both ends, move toward center (e.g., Two Sum on sorted array)
2. **Same Direction**: Both pointers move in same direction at different speeds (e.g., slow/fast for cycle detection)
3. **Sliding Window**: Special case where pointers define a window (covered separately)

**The Key Insight:**
Two pointers work when you can eliminate possibilities by moving one pointer—either the current pair is optimal, or moving a pointer will definitely not make it worse.`,

      whenToUse: [
        'Sorted array problems where you need pairs that meet a condition',
        'Detecting cycles in linked lists (Floyd\'s algorithm)',
        'Finding the middle of a linked list',
        'Removing duplicates from sorted array in-place',
        'Problems involving palindromes',
        'Three Sum or K-Sum problems (fix one pointer, two-pointer on rest)'
      ],

      keyPatterns: ['Opposite ends', 'Same direction (fast/slow)', 'Sliding window variant', 'Three pointers', 'Partition', 'Merge two sorted'],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',

      approach: [
        'Identify if array is sorted or needs to be sorted first',
        'Determine pointer strategy: opposite ends or same direction',
        'Define the condition that moves each pointer',
        'Ensure pointers eventually meet (termination)',
        'Handle duplicates if the problem requires unique results',
        'Consider edge cases: empty array, single element, all same elements'
      ],

      commonProblems: [
        // Easy
        { name: 'Valid Palindrome', difficulty: 'Easy' },
        { name: 'Valid Palindrome II', difficulty: 'Easy' },
        { name: 'Remove Duplicates from Sorted Array', difficulty: 'Easy' },
        { name: 'Move Zeroes', difficulty: 'Easy' },
        { name: 'Squares of a Sorted Array', difficulty: 'Easy' },
        { name: 'Merge Sorted Array', difficulty: 'Easy' },
        { name: 'Remove Element', difficulty: 'Easy' },
        { name: 'Linked List Cycle', difficulty: 'Easy' },
        { name: 'Middle of the Linked List', difficulty: 'Easy' },
        { name: 'Happy Number', difficulty: 'Easy' },
        { name: 'Backspace String Compare', difficulty: 'Easy' },
        { name: 'Is Subsequence', difficulty: 'Easy' },
        { name: 'Reverse String', difficulty: 'Easy' },
        { name: 'Reverse Vowels of a String', difficulty: 'Easy' },
        // Medium
        { name: 'Two Sum II - Input Array Is Sorted', difficulty: 'Medium' },
        { name: 'Three Sum', difficulty: 'Medium' },
        { name: 'Three Sum Closest', difficulty: 'Medium' },
        { name: 'Four Sum', difficulty: 'Medium' },
        { name: 'Container With Most Water', difficulty: 'Medium' },
        { name: 'Remove Duplicates from Sorted Array II', difficulty: 'Medium' },
        { name: 'Linked List Cycle II', difficulty: 'Medium' },
        { name: 'Sort Colors (Dutch National Flag)', difficulty: 'Medium' },
        { name: 'Partition Labels', difficulty: 'Medium' },
        { name: 'Boats to Save People', difficulty: 'Medium' },
        { name: 'Remove Nth Node From End of List', difficulty: 'Medium' },
        { name: 'Rotate List', difficulty: 'Medium' },
        { name: 'Swap Nodes in Pairs', difficulty: 'Medium' },
        { name: 'Longest Word in Dictionary through Deleting', difficulty: 'Medium' },
        { name: 'Interval List Intersections', difficulty: 'Medium' },
        { name: 'Find the Duplicate Number', difficulty: 'Medium' },
        { name: 'Next Permutation', difficulty: 'Medium' },
        { name: 'String Compression', difficulty: 'Medium' },
        { name: 'Pair with Target Sum', difficulty: 'Easy' },
        { name: 'Triplet Sum to Zero', difficulty: 'Medium' },
        { name: 'Triplet Sum Close to Target', difficulty: 'Medium' },
        { name: 'Triplets with Smaller Sum', difficulty: 'Medium' },
        { name: 'Subarrays with Product Less than K', difficulty: 'Medium' },
        { name: 'Comparing Strings containing Backspaces', difficulty: 'Medium' },
        // Hard
        { name: 'Trapping Rain Water', difficulty: 'Hard' },
        { name: 'Minimum Window Sort', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is the two-pointer technique, and why is it useful?', difficulty: 'Easy', answer: 'The two-pointer technique uses two index variables to traverse a data structure simultaneously, typically reducing time complexity from O(n^2) to O(n). It works by maintaining two positions that move toward each other or in the same direction based on a condition. Common in sorted array problems (Two Sum II), linked list problems (cycle detection), and string problems (palindromes). The key insight is that moving one pointer can eliminate many possibilities at once, avoiding the need for nested loops.' },
        { question: 'What are the main variants of the two-pointer technique?', difficulty: 'Easy', answer: 'Three main variants: (1) Opposite direction: pointers start at both ends and move inward (Two Sum on sorted array, Container With Most Water, palindrome check). (2) Same direction: both start at the beginning; one moves faster (fast/slow for cycle detection, finding middle of linked list, removing duplicates). (3) Two separate inputs: one pointer per input (merge two sorted arrays, intersect two lists). Each variant solves different problem types but shares the core principle of eliminating possibilities efficiently.' },
        { question: 'How does the fast/slow pointer technique work for cycle detection?', difficulty: 'Easy', answer: 'Floyd\'s cycle detection uses a slow pointer moving 1 step and a fast pointer moving 2 steps per iteration. If there is a cycle, the fast pointer will eventually "lap" the slow pointer and they will meet inside the cycle. If there is no cycle, the fast pointer reaches the end (null). Time: O(n), Space: O(1). To find the cycle start: after they meet, reset one pointer to the head and move both one step at a time; they meet at the cycle entrance. This works because of the mathematical relationship between distances.' },
        { question: 'When should you use two pointers vs hash maps?', difficulty: 'Easy', answer: 'Two pointers: when data is sorted or order matters, when O(1) space is required, for pair/triplet problems on sorted arrays, for in-place operations. Hash maps: when data is unsorted and sorting is not acceptable, when you need O(1) lookup by value, for frequency counting. Two Sum on unsorted array: hash map O(n) time, O(n) space. Two Sum on sorted array: two pointers O(n) time, O(1) space. In interviews, knowing both approaches shows depth.' },
        // Mid
        { question: 'How does the two-pointer technique solve the Three Sum problem?', difficulty: 'Medium', answer: 'Sort the array first O(n log n). Fix one element with an outer loop (index i), then use opposite-direction two pointers (left = i+1, right = n-1) on the remaining elements to find pairs summing to -nums[i]. If sum < target, move left right; if sum > target, move right left. Skip duplicates for both the outer loop and inner pointers to avoid duplicate triplets. Total time: O(n^2), which is optimal for Three Sum. The sorting enables the two-pointer approach by creating a monotonic relationship between pointer positions and sum values.' },
        { question: 'How do you prove correctness of the opposite-direction two-pointer approach?', difficulty: 'Medium', answer: 'The proof relies on the sorted property and elimination argument. For Two Sum II: left starts at smallest, right at largest. If sum > target, moving right left decreases sum (only way to reduce). If sum < target, moving left right increases sum. We never skip a valid pair because: when we move right left, all pairs with the current right and any left\' > left would also be too large. Similarly for moving left. This "no valid pair skipped" invariant guarantees we find the answer if it exists. The argument generalizes to Container With Most Water and similar problems.' },
        { question: 'How do you use two pointers for in-place array modification?', difficulty: 'Medium', answer: 'Use a slow (write) pointer and fast (read) pointer. The fast pointer scans through the array; when it finds an element to keep, it writes it at the slow pointer position and increments slow. Examples: Remove Duplicates from Sorted Array (keep first occurrence), Move Zeroes (keep non-zeros at front), Remove Element (keep elements != val). After processing, slow gives the new length. This achieves O(n) time, O(1) space, and maintains relative order. Key insight: the slow pointer always points to where the next valid element should go.' },
        { question: 'How does the two-pointer technique apply to linked list problems?', difficulty: 'Medium', answer: 'Several patterns: (1) Find middle: slow moves 1, fast moves 2; when fast reaches end, slow is at middle. (2) Detect cycle: Floyd\'s algorithm with fast/slow. (3) Find kth from end: advance fast k steps, then move both until fast reaches end; slow is at kth from end. (4) Detect intersection: find lengths, advance longer list by difference, then move together. (5) Palindrome check: find middle, reverse second half, compare with two pointers. These all exploit the O(1) extra space property of pointer manipulation.' },
        { question: 'What is the Dutch National Flag algorithm, and how does it use three pointers?', difficulty: 'Medium', answer: 'The Dutch National Flag (Sort Colors) uses three pointers to partition an array into three groups in a single pass: low (boundary of 0s), mid (current element), high (boundary of 2s). Process: if arr[mid]=0, swap with low, advance both; if arr[mid]=1, advance mid; if arr[mid]=2, swap with high, decrement high (don\'t advance mid since swapped element is unprocessed). O(n) time, O(1) space, single pass. Generalizes to any three-way partition. Named after the Dutch flag which has three colored stripes.' },
        { question: 'How do you handle duplicates in two-pointer problems?', difficulty: 'Medium', answer: 'For problems requiring unique results (Three Sum): sort the input, then skip duplicates by checking if current == previous. For the outer loop: if nums[i] == nums[i-1], continue. For inner pointers: after finding a valid pair, advance left while nums[left] == nums[left+1] and right while nums[right] == nums[right-1]. For Remove Duplicates: slow pointer advances only when fast finds a new value. Key principle: sorting groups duplicates together, making them easy to skip with a simple equality check against the previous element.' },
        // Senior
        { question: 'What is the mathematical proof behind Floyd\'s cycle detection finding the cycle start?', difficulty: 'Hard', answer: 'Let L = distance from head to cycle start, C = cycle length, K = distance from cycle start to meeting point. When slow and fast meet: slow traveled L + K, fast traveled L + K + mC (m full cycles). Since fast moves twice as fast: 2(L + K) = L + K + mC, so L + K = mC, thus L = mC - K = (m-1)C + (C-K). This means L and C-K differ by a multiple of C. So starting from both head and meeting point, moving one step at a time, they meet at the cycle start after L steps. This elegant proof underlies many linked list algorithms.' },
        { question: 'How can two pointers be applied to the Trapping Rain Water problem?', difficulty: 'Hard', answer: 'Use left and right pointers with left_max and right_max tracking maximum heights seen from each side. At each step, process the side with the smaller max: if left_max < right_max, water at left is determined by left_max (right side is guaranteed to be at least right_max high), so water[left] = left_max - height[left]; advance left. Otherwise process right similarly. This works because the water at any position is determined by the minimum of the maximum heights on both sides, and we always have accurate information for the side with the smaller max. O(n) time, O(1) space.' },
        { question: 'How do you extend two pointers to K-Sum problems?', difficulty: 'Hard', answer: 'K-Sum is solved by recursively reducing to Two Sum. For K-Sum: sort the array, fix one element with an outer loop, then solve (K-1)-Sum on the remaining elements. Base case: Two Sum uses opposite-direction two pointers O(n). Total complexity: O(n^(K-1)). For 4-Sum: O(n^3), for 5-Sum: O(n^4). Skip duplicates at each level. Alternative for large K: use hash maps for O(n^ceil(K/2)) time. The recursive structure makes the implementation clean and generalizable to any K, though in practice K > 4 is rare in interviews.' }
      ],

      commonMistakes: [
        'Forgetting to skip duplicates in Three Sum (leads to duplicate triplets)',
        'Wrong pointer movement condition causing infinite loop',
        'Not handling edge case when array is empty or has one element',
        'Moving wrong pointer in container/water problems',
        'Confusing when to use two pointers vs binary search'
      ],

      tips: [
        'Works best on sorted arrays or when relative order matters',
        'Fast/slow pointers detect cycles in linked lists',
        'For three sum, fix one pointer and use two-pointer on remainder',
        'Consider what condition moves each pointer',
        'For K-Sum: recursively reduce to Two Sum with fixed pointers'
      ],

      interviewTips: [
        'Ask: Is the array sorted? If not, is sorting acceptable?',
        'For opposite-direction: explain why moving the pointer is correct',
        'Verbalize: "I move left because we need a larger sum" or similar',
        'For Three Sum: explicitly handle duplicates to avoid TLE or wrong answer',
        'Draw the pointers on an example to show your approach'
      ],

      codeExamples: [
        {
          title: 'Two Sum II (Sorted Array) - Opposite Direction',
          language: 'python',
          description: 'Find two numbers that sum to target in sorted array.',
          code: `def two_sum_sorted(numbers, target):
    left, right = 0, len(numbers) - 1

    while left < right:
        current_sum = numbers[left] + numbers[right]
        if current_sum == target:
            return [left + 1, right + 1]  # 1-indexed
        elif current_sum < target:
            left += 1   # Need larger sum
        else:
            right -= 1  # Need smaller sum

    return []  # No solution`
        },
        {
          title: 'Three Sum - Fix One, Two-Pointer on Rest',
          language: 'python',
          description: 'Find all unique triplets that sum to zero.',
          code: `def three_sum(nums):
    nums.sort()
    result = []

    for i in range(len(nums) - 2):
        # Skip duplicates for first element
        if i > 0 and nums[i] == nums[i-1]:
            continue

        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total == 0:
                result.append([nums[i], nums[left], nums[right]])
                # Skip duplicates
                while left < right and nums[left] == nums[left+1]:
                    left += 1
                while left < right and nums[right] == nums[right-1]:
                    right -= 1
                left += 1
                right -= 1
            elif total < 0:
                left += 1
            else:
                right -= 1

    return result`
        },
        {
          title: 'Container With Most Water - Greedy Two Pointers',
          language: 'python',
          description: 'Find max water between two lines. Move the shorter line.',
          code: `def max_area(height):
    left, right = 0, len(height) - 1
    max_water = 0

    while left < right:
        width = right - left
        h = min(height[left], height[right])
        max_water = max(max_water, width * h)

        # Move the shorter line (only way to potentially increase area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1

    return max_water`
        },
        {
          title: 'Fast/Slow Pointers - Linked List Cycle',
          language: 'python',
          description: 'Detect if linked list has a cycle using Floyd\'s algorithm.',
          code: `def has_cycle(head):
    if not head or not head.next:
        return False

    slow = head
    fast = head.next

    while slow != fast:
        if not fast or not fast.next:
            return False
        slow = slow.next       # Move 1 step
        fast = fast.next.next  # Move 2 steps

    return True  # They met, cycle exists`
        }
      ,
        {
          title: 'Two Sum II (Sorted Array) - Opposite Direction',
          language: 'javascript',
          description: 'Find two numbers that sum to target in sorted array.',
          code: `function twoSumSorted(numbers, target) {
    let left = 0, right = numbers.length - 1;

    while (left < right) {
        const sum = numbers[left] + numbers[right];
        if (sum === target) return [left + 1, right + 1]; // 1-indexed
        else if (sum < target) left++;   // Need larger sum
        else right--;                    // Need smaller sum
    }
    return []; // No solution
}`
        },
        {
          title: 'Two Sum II (Sorted Array) - Opposite Direction',
          language: 'java',
          description: 'Find two numbers that sum to target in sorted array.',
          code: `public int[] twoSumSorted(int[] numbers, int target) {
    int left = 0, right = numbers.length - 1;

    while (left < right) {
        int sum = numbers[left] + numbers[right];
        if (sum == target) return new int[]{left + 1, right + 1};
        else if (sum < target) left++;
        else right--;
    }
    return new int[]{};
}`
        },
        {
          title: 'Three Sum - Fix One, Two-Pointer on Rest',
          language: 'javascript',
          description: 'Find all unique triplets that sum to zero.',
          code: `function threeSum(nums) {
    nums.sort((a, b) => a - b);
    const result = [];

    for (let i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] === nums[i - 1]) continue; // Skip dupes

        let left = i + 1, right = nums.length - 1;
        while (left < right) {
            const total = nums[i] + nums[left] + nums[right];
            if (total === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                while (left < right && nums[left] === nums[left + 1]) left++;
                while (left < right && nums[right] === nums[right - 1]) right--;
                left++; right--;
            } else if (total < 0) left++;
            else right--;
        }
    }
    return result;
}`
        },
        {
          title: 'Three Sum - Fix One, Two-Pointer on Rest',
          language: 'java',
          description: 'Find all unique triplets that sum to zero.',
          code: `public List<List<Integer>> threeSum(int[] nums) {
    Arrays.sort(nums);
    List<List<Integer>> result = new ArrayList<>();

    for (int i = 0; i < nums.length - 2; i++) {
        if (i > 0 && nums[i] == nums[i - 1]) continue;

        int left = i + 1, right = nums.length - 1;
        while (left < right) {
            int total = nums[i] + nums[left] + nums[right];
            if (total == 0) {
                result.add(Arrays.asList(nums[i], nums[left], nums[right]));
                while (left < right && nums[left] == nums[left + 1]) left++;
                while (left < right && nums[right] == nums[right - 1]) right--;
                left++; right--;
            } else if (total < 0) left++;
            else right--;
        }
    }
    return result;
}`
        },
        {
          title: 'Container With Most Water - Greedy Two Pointers',
          language: 'javascript',
          description: 'Find max water between two lines. Move the shorter line.',
          code: `function maxArea(height) {
    let left = 0, right = height.length - 1;
    let maxWater = 0;

    while (left < right) {
        const width = right - left;
        const h = Math.min(height[left], height[right]);
        maxWater = Math.max(maxWater, width * h);

        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxWater;
}`
        },
        {
          title: 'Container With Most Water - Greedy Two Pointers',
          language: 'java',
          description: 'Find max water between two lines. Move the shorter line.',
          code: `public int maxArea(int[] height) {
    int left = 0, right = height.length - 1;
    int maxWater = 0;

    while (left < right) {
        int width = right - left;
        int h = Math.min(height[left], height[right]);
        maxWater = Math.max(maxWater, width * h);

        if (height[left] < height[right]) left++;
        else right--;
    }
    return maxWater;
}`
        },
        {
          title: 'Fast/Slow Pointers - Linked List Cycle',
          language: 'javascript',
          description: 'Detect if linked list has a cycle using Floyd\'s algorithm.',
          code: `function hasCycle(head) {
    if (!head || !head.next) return false;

    let slow = head;
    let fast = head.next;

    while (slow !== fast) {
        if (!fast || !fast.next) return false;
        slow = slow.next;       // Move 1 step
        fast = fast.next.next;  // Move 2 steps
    }
    return true; // They met, cycle exists
}`
        },
        {
          title: 'Fast/Slow Pointers - Linked List Cycle',
          language: 'java',
          description: 'Detect if linked list has a cycle using Floyd\'s algorithm.',
          code: `public boolean hasCycle(ListNode head) {
    if (head == null || head.next == null) return false;

    ListNode slow = head;
    ListNode fast = head.next;

    while (slow != fast) {
        if (fast == null || fast.next == null) return false;
        slow = slow.next;       // Move 1 step
        fast = fast.next.next;  // Move 2 steps
    }
    return true; // They met, cycle exists
}`
        }
      ]
    },
    {
      id: 'sliding-window',
      title: 'Sliding Window',
      icon: 'chevronsRight',
      color: '#8b5cf6',
      questions: 16,
      description: 'Process subarrays/substrings efficiently. Key for substring and subarray problems.',

visualizations: [
        {
          title: 'Sliding Window on Array',
          language: 'python',
          description: 'Shows a window bracket sliding right across an array, expanding and contracting to find the optimal subarray.',
          svg: '<svg viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg" style="background:white"><text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Sliding Window — Max Sum of K=3</text><g><rect x="30" y="45" width="48" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="54" y="68" font-family="monospace" font-size="13" fill="#94a3b8" text-anchor="middle">2</text><rect x="82" y="45" width="48" height="36" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="106" y="68" font-family="monospace" font-size="13" fill="#3b82f6" font-weight="bold" text-anchor="middle">5</text><rect x="134" y="45" width="48" height="36" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="158" y="68" font-family="monospace" font-size="13" fill="#3b82f6" font-weight="bold" text-anchor="middle">1</text><rect x="186" y="45" width="48" height="36" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="210" y="68" font-family="monospace" font-size="13" fill="#3b82f6" font-weight="bold" text-anchor="middle">8</text><rect x="238" y="45" width="48" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="262" y="68" font-family="monospace" font-size="13" fill="#94a3b8" text-anchor="middle">3</text><rect x="290" y="45" width="48" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="314" y="68" font-family="monospace" font-size="13" fill="#94a3b8" text-anchor="middle">7</text><rect x="342" y="45" width="48" height="36" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="366" y="68" font-family="monospace" font-size="13" fill="#94a3b8" text-anchor="middle">4</text></g><rect x="78" y="38" width="160" height="50" rx="8" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-dasharray="6,3"/><text x="158" y="105" font-family="sans-serif" font-size="12" fill="#3b82f6" text-anchor="middle" font-weight="bold">Window: sum = 14</text><line x1="240" y1="63" x2="290" y2="63" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,3"/><text x="265" y="58" font-family="sans-serif" font-size="10" fill="#3b82f6">slide →</text><text x="20" y="135" font-family="sans-serif" font-size="12" fill="#1e293b">Window slides: add right element, remove left element</text><text x="20" y="155" font-family="monospace" font-size="11" fill="#64748b">[2,5,1]=8 → [5,1,8]=14 → [1,8,3]=12 → [8,3,7]=18 → [3,7,4]=14</text><rect x="20" y="172" width="370" height="24" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="1"/><text x="30" y="189" font-family="sans-serif" font-size="11" fill="#10b981">Max sum = 18 | Each element visited once → O(n)</text></svg>'
        }
      ],

      introduction: `Sliding Window is one of the most important patterns for string and subarray problems. It processes contiguous elements efficiently by maintaining a "window" that slides across the data.

**Two Types:**
1. **Fixed-Size Window**: Window size is constant (e.g., "max sum of k consecutive elements")
2. **Variable-Size Window**: Window expands and shrinks based on conditions (e.g., "shortest substring containing all characters")

**The Key Insight:**
Instead of recomputing the entire window from scratch at each step, we incrementally update by adding the new element and removing the old one. This reduces O(n*k) to O(n).

**Template for Variable Window:**
Expand the right pointer to include more elements. When a condition is violated, shrink from the left until valid again. Track the optimal window throughout.`,

      whenToUse: [
        'Finding max/min sum of k consecutive elements (fixed window)',
        'Longest/shortest substring with some property',
        'Counting subarrays/substrings that satisfy a condition',
        'Problems involving contiguous sequences',
        'Character frequency constraints in substrings',
        '"At most K distinct elements" type problems'
      ],

      keyPatterns: ['Fixed size window', 'Variable size window', 'Window with constraints', 'Character frequency', 'At most K distinct', 'Minimum window'],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(k) where k is window size or character set',

      approach: [
        'Identify if it\'s fixed or variable window',
        'For fixed: initialize window, then slide by adding right and removing left',
        'For variable: expand right pointer, shrink left when constraint violated',
        'Use hash map to track counts or positions of elements in window',
        'Update answer at each valid window state',
        'Handle edge cases: empty string, window larger than input'
      ],

      commonProblems: [
        // Easy
        { name: 'Best Time to Buy and Sell Stock', difficulty: 'Easy' },
        { name: 'Contains Duplicate II', difficulty: 'Easy' },
        { name: 'Maximum Average Subarray I', difficulty: 'Easy' },
        { name: 'Minimum Recolors to Get K Consecutive Black Blocks', difficulty: 'Easy' },
        // Medium
        { name: 'Longest Substring Without Repeating Characters', difficulty: 'Medium' },
        { name: 'Longest Repeating Character Replacement', difficulty: 'Medium' },
        { name: 'Permutation in String', difficulty: 'Medium' },
        { name: 'Find All Anagrams in a String', difficulty: 'Medium' },
        { name: 'Fruit Into Baskets', difficulty: 'Medium' },
        { name: 'Max Consecutive Ones III', difficulty: 'Medium' },
        { name: 'Grumpy Bookstore Owner', difficulty: 'Medium' },
        { name: 'Maximum Points from Cards', difficulty: 'Medium' },
        { name: 'Minimum Size Subarray Sum', difficulty: 'Medium' },
        { name: 'Maximum Number of Vowels in a Substring', difficulty: 'Medium' },
        { name: 'Get Equal Substrings Within Budget', difficulty: 'Medium' },
        { name: 'Longest Turbulent Subarray', difficulty: 'Medium' },
        { name: 'Count Number of Nice Subarrays', difficulty: 'Medium' },
        { name: 'Replace the Substring for Balanced String', difficulty: 'Medium' },
        { name: 'Max Sum of Rectangle No Larger Than K', difficulty: 'Hard' },
        { name: 'Binary Subarrays With Sum', difficulty: 'Medium' },
        { name: 'Number of Substrings Containing All Three Characters', difficulty: 'Medium' },
        { name: 'Longest Subarray of 1s After Deleting One Element', difficulty: 'Medium' },
        { name: 'Maximum Erasure Value', difficulty: 'Medium' },
        { name: 'Frequency of the Most Frequent Element', difficulty: 'Medium' },
        { name: 'Longest Nice Subarray', difficulty: 'Medium' },
        { name: 'Maximum Sum of Almost Unique Subarray', difficulty: 'Medium' },
        { name: 'K Radius Subarray Averages', difficulty: 'Medium' },
        { name: 'Maximum Length of Repeated Subarray', difficulty: 'Medium' },
        { name: 'Subarray Product Less Than K', difficulty: 'Medium' },
        { name: 'Longest Substring with At Least K Repeating Characters', difficulty: 'Medium' },
        { name: 'Longest Substring with At Most K Distinct Characters', difficulty: 'Medium' },
        { name: 'Longest Substring with At Most Two Distinct Characters', difficulty: 'Medium' },
        // Hard
        { name: 'Minimum Window Substring', difficulty: 'Hard' },
        { name: 'Sliding Window Maximum', difficulty: 'Hard' },
        { name: 'Subarrays with K Different Integers', difficulty: 'Hard' },
        { name: 'Substring with Concatenation of All Words', difficulty: 'Hard' },
        { name: 'Minimum Window Subsequence', difficulty: 'Hard' },
        { name: 'Count Subarrays With Fixed Bounds', difficulty: 'Hard' },
        { name: 'Shortest Subarray with Sum at Least K', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is the sliding window technique, and why is it efficient?', difficulty: 'Easy', answer: 'Sliding window maintains a contiguous range of elements (a "window") that moves through the data structure. Instead of recalculating the entire range from scratch at each position, it incrementally updates by adding the new element entering the window and removing the element leaving it. This reduces O(n*k) brute force to O(n) for many subarray/substring problems. The name comes from visualizing a window frame sliding along the data. It works because adjacent windows share most of their elements, making incremental updates much cheaper than full recomputation.' },
        { question: 'What is the difference between fixed-size and variable-size sliding windows?', difficulty: 'Easy', answer: 'Fixed-size window: window size k is predetermined. Initialize with first k elements, then slide one position at a time, adding right element and removing left. Examples: max sum of k consecutive elements, moving average. Variable-size window: window expands and contracts based on conditions. Right pointer expands to include more elements; left pointer contracts when a constraint is violated. Examples: longest substring without repeating characters, minimum window substring. Fixed windows are simpler; variable windows handle optimization problems where the optimal window size is unknown.' },
        { question: 'How do you implement a basic fixed-size sliding window?', difficulty: 'Easy', answer: 'Step 1: Calculate the initial window (first k elements). Step 2: Slide the window: for each new position, add the incoming element (nums[i]) and remove the outgoing element (nums[i-k]). Step 3: Update the answer at each position. Template: window_sum = sum(nums[:k]); for i in range(k, n): window_sum += nums[i] - nums[i-k]; update answer. Time: O(n), Space: O(1). The key insight is that each slide only changes two elements, so all window properties can be maintained incrementally.' },
        { question: 'What data structures are commonly used with sliding windows?', difficulty: 'Easy', answer: 'Hash map / Counter: track character frequencies in the window (anagram detection, minimum window substring). Deque: maintain monotonic structure for sliding window maximum/minimum in O(1) per operation. Set: track unique elements in the window (longest substring without repeating characters). The choice depends on what property you need to maintain. Hash maps are the most common, enabling O(1) frequency lookups. Deques are used when you need the maximum or minimum within the window efficiently.' },
        // Mid
        { question: 'How does the variable-size sliding window template work?', difficulty: 'Medium', answer: 'Template: left = 0; for right in range(n): expand window by including nums[right] (update state); while window is invalid: contract by removing nums[left], left += 1; update answer with current valid window. The expand-contract cycle ensures every valid window is considered. Key properties: right pointer never moves backward, left pointer never exceeds right, each element is added and removed at most once. This gives amortized O(n) time despite the nested while loop. The "while" (not "if") is critical because multiple contractions may be needed.' },
        { question: 'How do you solve "exactly K" problems using sliding window?', difficulty: 'Medium', answer: 'The trick is: exactly(K) = atMost(K) - atMost(K-1). Write a helper function that counts subarrays/substrings with at most K of some property. Call it twice and subtract. Example: Subarrays with Exactly K Different Integers = atMost(K) - atMost(K-1). The atMost(K) function uses a standard variable-size window. This decomposition works because atMost(K) includes all windows with 0, 1, ..., K of the property, and subtracting atMost(K-1) isolates exactly K. This is one of the most important sliding window tricks for interview problems.' },
        { question: 'How does the sliding window maximum problem use a monotonic deque?', difficulty: 'Medium', answer: 'Maintain a deque storing indices in decreasing order of their values. For each new element: (1) Remove indices from the back that have smaller values (they can never be the maximum while the new element is in the window). (2) Add the new index to the back. (3) Remove the front index if it is outside the window (index <= i - k). (4) The front of the deque is the maximum for the current window. Each element is added and removed from the deque at most once, giving O(n) total time. The deque acts as a "candidates for maximum" list, pruning elements that are dominated.' },
        { question: 'How do you handle the Minimum Window Substring problem?', difficulty: 'Medium', answer: 'Use a variable window with two frequency maps: "need" (target characters) and "have" (window characters). Expand right to include characters; when have[char] == need[char] for a character, increment a "formed" counter. When formed equals number of unique characters needed, the window is valid — try to shrink from left while still valid, tracking the minimum valid window. Key insight: shrink the left pointer to find the smallest valid window for each right position. Time O(|s| + |t|), Space O(|s| + |t|). This is the quintessential variable window problem combining expansion, validation, and contraction.' },
        { question: 'What is the relationship between sliding window and two pointers?', difficulty: 'Medium', answer: 'Sliding window is a specialized form of the two-pointer technique where both pointers move in the same direction (left to right), defining a contiguous range. Two pointers is more general — pointers can move toward each other (opposite direction) or at different speeds (fast/slow). Every sliding window problem uses two pointers, but not every two-pointer problem is a sliding window. The distinguishing feature is that sliding window maintains a contiguous subarray/substring between the pointers, while two pointers may not define a contiguous range.' },
        { question: 'How do you optimize sliding window problems that involve character frequency?', difficulty: 'Medium', answer: 'Use an array of size 26 (or 128 for ASCII) instead of a hash map for O(1) lookups with better constant factors. Track a "matches" counter for the number of characters meeting the required frequency, avoiding the need to iterate over the entire frequency map to check validity. When adding/removing a character, only update the matches counter for that character. This reduces the per-step cost from O(26) to O(1). For "Permutation in String" and "Find All Anagrams," this optimization with a matches counter is the cleanest approach.' },
        // Senior
        { question: 'How can sliding window be combined with other techniques for harder problems?', difficulty: 'Hard', answer: 'Sliding window + binary search: "Longest Subarray with Sum at Most K" on negative numbers (binary search on prefix sums within window). Sliding window + monotonic deque: Sliding Window Maximum, Shortest Subarray with Sum >= K (using deque on prefix sums). Sliding window + hash map + "exactly K" decomposition: Subarrays with K Different Integers. Sliding window + bit manipulation: Longest Nice Subarray. The key is recognizing that the sliding window handles the range management while the auxiliary structure handles the property query. These combinations appear in Hard problems.' },
        { question: 'What is the Rabin-Karp rolling hash, and how does it relate to sliding windows?', difficulty: 'Hard', answer: 'Rabin-Karp uses a rolling hash — a sliding window over a string where the hash is updated incrementally. When the window slides, remove the contribution of the outgoing character and add the incoming one: hash = (hash - old_char * base^(k-1)) * base + new_char. This gives O(1) hash updates per slide, enabling O(n) average-case string matching. The rolling hash is essentially a fixed-size sliding window applied to hashing. Used for pattern matching, detecting repeated substrings, and plagiarism detection. Collisions require verification, giving O(nm) worst case.' },
        { question: 'How do you handle sliding window problems on circular arrays?', difficulty: 'Hard', answer: 'Two approaches: (1) Duplicate the array: append the array to itself, then apply standard sliding window on the 2n-length array with window size constraints. (2) Complement trick: for "maximum sum circular subarray," the minimum non-circular subarray, subtracted from total, gives the maximum circular one. This avoids the 2n expansion. For general circular sliding windows, the duplication approach is more versatile but doubles memory. The complement trick is elegant but only works for specific problems (maximum/minimum sum). Choose based on the problem constraints and whether the property can be complemented.' }
      ],

      commonMistakes: [
        'Not shrinking the window when it becomes invalid',
        'Off-by-one errors when calculating window size (right - left + 1, not right - left)',
        'Forgetting to update the hash map when shrinking the window',
        'Not handling the case where no valid window exists',
        'Confusing "exactly K" vs "at most K" (exactly K = atMost(K) - atMost(K-1))'
      ],

      tips: [
        'Expand window to include elements, shrink to satisfy constraints',
        'Use hash map to track window contents efficiently',
        'For fixed-size windows, add right element and remove left in one step',
        'Track window validity to avoid recomputing from scratch',
        'For "exactly K" problems, use "at most K" minus "at most K-1"'
      ],

      interviewTips: [
        'Identify the window type first: fixed or variable',
        'For variable window, clearly state expand and shrink conditions',
        'Explain what you\'re tracking in your hash map',
        'Walk through an example showing the window expand/shrink',
        'State time complexity: O(n) because each element is added and removed at most once'
      ],

      codeExamples: [
        {
          title: 'Fixed Window: Max Sum of K Elements',
          language: 'python',
          description: 'Find maximum sum of any contiguous subarray of size k.',
          code: `def max_sum_subarray(nums, k):
    if len(nums) < k:
        return 0

    # Calculate initial window sum
    window_sum = sum(nums[:k])
    max_sum = window_sum

    # Slide the window
    for i in range(k, len(nums)):
        window_sum += nums[i] - nums[i - k]  # Add right, remove left
        max_sum = max(max_sum, window_sum)

    return max_sum`
        },
        {
          title: 'Variable Window: Longest Substring Without Repeating',
          language: 'python',
          description: 'Find length of longest substring without repeating characters.',
          code: `def length_of_longest_substring(s):
    char_index = {}  # char -> last seen index
    max_len = 0
    left = 0

    for right, char in enumerate(s):
        # If char in window, shrink window
        if char in char_index and char_index[char] >= left:
            left = char_index[char] + 1

        char_index[char] = right
        max_len = max(max_len, right - left + 1)

    return max_len`
        },
        {
          title: 'Variable Window: Minimum Window Substring',
          language: 'python',
          description: 'Find smallest substring containing all characters of t.',
          code: `def min_window(s, t):
    if not t or not s:
        return ""

    from collections import Counter
    need = Counter(t)
    have = {}
    have_count, need_count = 0, len(need)
    result = ""
    result_len = float('inf')
    left = 0

    for right, char in enumerate(s):
        # Expand window
        have[char] = have.get(char, 0) + 1
        if char in need and have[char] == need[char]:
            have_count += 1

        # Shrink window while valid
        while have_count == need_count:
            # Update result
            if right - left + 1 < result_len:
                result = s[left:right + 1]
                result_len = len(result)

            # Shrink from left
            have[s[left]] -= 1
            if s[left] in need and have[s[left]] < need[s[left]]:
                have_count -= 1
            left += 1

    return result`
        },
        {
          title: 'At Most K Distinct: Fruit Into Baskets',
          language: 'python',
          description: 'Maximum length subarray with at most 2 distinct elements.',
          code: `def total_fruit(fruits):
    count = {}  # fruit -> count in window
    left = 0
    max_fruits = 0

    for right, fruit in enumerate(fruits):
        count[fruit] = count.get(fruit, 0) + 1

        # Shrink while more than 2 distinct fruits
        while len(count) > 2:
            count[fruits[left]] -= 1
            if count[fruits[left]] == 0:
                del count[fruits[left]]
            left += 1

        max_fruits = max(max_fruits, right - left + 1)

    return max_fruits`
        }
      ,
        {
          title: 'Fixed Window: Max Sum of K Elements',
          language: 'javascript',
          description: 'Find maximum sum of any contiguous subarray of size k.',
          code: `function maxSumSubarray(nums, k) {
    if (nums.length < k) return 0;

    let windowSum = nums.slice(0, k).reduce((a, b) => a + b, 0);
    let maxSum = windowSum;

    for (let i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k]; // Add right, remove left
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}`
        },
        {
          title: 'Fixed Window: Max Sum of K Elements',
          language: 'java',
          description: 'Find maximum sum of any contiguous subarray of size k.',
          code: `public int maxSumSubarray(int[] nums, int k) {
    if (nums.length < k) return 0;

    int windowSum = 0;
    for (int i = 0; i < k; i++) windowSum += nums[i];
    int maxSum = windowSum;

    for (int i = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k]; // Add right, remove left
        maxSum = Math.max(maxSum, windowSum);
    }
    return maxSum;
}`
        },
        {
          title: 'Variable Window: Longest Substring Without Repeating',
          language: 'javascript',
          description: 'Find length of longest substring without repeating characters.',
          code: `function lengthOfLongestSubstring(s) {
    const charIndex = new Map(); // char -> last seen index
    let maxLen = 0, left = 0;

    for (let right = 0; right < s.length; right++) {
        if (charIndex.has(s[right]) && charIndex.get(s[right]) >= left) {
            left = charIndex.get(s[right]) + 1;
        }
        charIndex.set(s[right], right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}`
        },
        {
          title: 'Variable Window: Longest Substring Without Repeating',
          language: 'java',
          description: 'Find length of longest substring without repeating characters.',
          code: `public int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> charIndex = new HashMap<>();
    int maxLen = 0, left = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (charIndex.containsKey(c) && charIndex.get(c) >= left) {
            left = charIndex.get(c) + 1;
        }
        charIndex.put(c, right);
        maxLen = Math.max(maxLen, right - left + 1);
    }
    return maxLen;
}`
        },
        {
          title: 'Variable Window: Minimum Window Substring',
          language: 'javascript',
          description: 'Find smallest substring containing all characters of t.',
          code: `function minWindow(s, t) {
    if (!t || !s) return "";

    const need = {};
    for (const c of t) need[c] = (need[c] || 0) + 1;
    const have = {};
    let haveCount = 0, needCount = Object.keys(need).length;
    let result = "", resultLen = Infinity, left = 0;

    for (let right = 0; right < s.length; right++) {
        have[s[right]] = (have[s[right]] || 0) + 1;
        if (s[right] in need && have[s[right]] === need[s[right]]) haveCount++;

        while (haveCount === needCount) {
            if (right - left + 1 < resultLen) {
                result = s.slice(left, right + 1);
                resultLen = result.length;
            }
            have[s[left]]--;
            if (s[left] in need && have[s[left]] < need[s[left]]) haveCount--;
            left++;
        }
    }
    return result;
}`
        },
        {
          title: 'Variable Window: Minimum Window Substring',
          language: 'java',
          description: 'Find smallest substring containing all characters of t.',
          code: `public String minWindow(String s, String t) {
    if (s.isEmpty() || t.isEmpty()) return "";

    Map<Character, Integer> need = new HashMap<>(), have = new HashMap<>();
    for (char c : t.toCharArray()) need.merge(c, 1, Integer::sum);

    int haveCount = 0, needCount = need.size();
    int[] result = {0, Integer.MAX_VALUE}; // start, length
    int left = 0;

    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        have.merge(c, 1, Integer::sum);
        if (need.containsKey(c) && have.get(c).equals(need.get(c))) haveCount++;

        while (haveCount == needCount) {
            if (right - left + 1 < result[1]) { result[0] = left; result[1] = right - left + 1; }
            char lc = s.charAt(left);
            have.merge(lc, -1, Integer::sum);
            if (need.containsKey(lc) && have.get(lc) < need.get(lc)) haveCount--;
            left++;
        }
    }
    return result[1] == Integer.MAX_VALUE ? "" : s.substring(result[0], result[0] + result[1]);
}`
        },
        {
          title: 'At Most K Distinct: Fruit Into Baskets',
          language: 'javascript',
          description: 'Maximum length subarray with at most 2 distinct elements.',
          code: `function totalFruit(fruits) {
    const count = new Map(); // fruit -> count in window
    let left = 0, maxFruits = 0;

    for (let right = 0; right < fruits.length; right++) {
        count.set(fruits[right], (count.get(fruits[right]) || 0) + 1);

        while (count.size > 2) {
            count.set(fruits[left], count.get(fruits[left]) - 1);
            if (count.get(fruits[left]) === 0) count.delete(fruits[left]);
            left++;
        }
        maxFruits = Math.max(maxFruits, right - left + 1);
    }
    return maxFruits;
}`
        },
        {
          title: 'At Most K Distinct: Fruit Into Baskets',
          language: 'java',
          description: 'Maximum length subarray with at most 2 distinct elements.',
          code: `public int totalFruit(int[] fruits) {
    Map<Integer, Integer> count = new HashMap<>();
    int left = 0, maxFruits = 0;

    for (int right = 0; right < fruits.length; right++) {
        count.merge(fruits[right], 1, Integer::sum);

        while (count.size() > 2) {
            count.merge(fruits[left], -1, Integer::sum);
            if (count.get(fruits[left]) == 0) count.remove(fruits[left]);
            left++;
        }
        maxFruits = Math.max(maxFruits, right - left + 1);
    }
    return maxFruits;
}`
        }
      ]
    },
    {
      id: 'stacks',
      title: 'Stacks',
      icon: 'layers',
      color: '#22c55e',
      questions: 34,
      description: 'LIFO structure for parsing, backtracking, and monotonic stack patterns.',

visualizations: [
        {
          title: 'Stack (LIFO) vs Queue (FIFO)',
          language: 'python',
          description: 'Split diagram showing Stack push/pop from the top and Queue enqueue/dequeue from opposite ends.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah3" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="100" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">Stack (LIFO)</text><rect x="55" y="170" width="90" height="28" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="100" y="189" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">A</text><rect x="55" y="138" width="90" height="28" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="100" y="157" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">B</text><rect x="55" y="106" width="90" height="28" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="100" y="125" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">C</text><rect x="55" y="74" width="90" height="28" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="100" y="93" font-family="monospace" font-size="12" fill="#10b981" font-weight="bold" text-anchor="middle">D ← top</text><line x1="160" y1="55" x2="160" y2="88" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah3)"/><text x="175" y="65" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">push</text><line x1="175" y1="88" x2="175" y2="55" stroke="#ef4444" stroke-width="1.5" marker-end="url(#ah3)"/><text x="192" y="85" font-family="sans-serif" font-size="10" fill="#ef4444" font-weight="bold">pop</text><line x1="240" y1="30" x2="240" y2="220" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4,4"/><text x="380" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">Queue (FIFO)</text><rect x="290" y="95" width="50" height="40" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="315" y="120" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">A</text><rect x="345" y="95" width="50" height="40" rx="4" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/><text x="370" y="120" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">B</text><rect x="400" y="95" width="50" height="40" rx="4" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="425" y="120" font-family="monospace" font-size="12" fill="#3b82f6" font-weight="bold" text-anchor="middle">C</text><line x1="462" y1="115" x2="455" y2="115" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah3)"/><text x="470" y="110" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">enq</text><line x1="290" y1="115" x2="272" y2="115" stroke="#ef4444" stroke-width="1.5" marker-end="url(#ah3)"/><text x="270" y="110" font-family="sans-serif" font-size="10" fill="#ef4444" font-weight="bold" text-anchor="end">deq</text><text x="315" y="150" font-family="sans-serif" font-size="10" fill="#64748b">front</text><text x="425" y="150" font-family="sans-serif" font-size="10" fill="#64748b" text-anchor="middle">back</text><text x="20" y="235" font-family="sans-serif" font-size="11" fill="#64748b">Stack: last in = first out (undo, DFS) | Queue: first in = first out (BFS, scheduling)</text></svg>'
        }
      ],

      introduction: `Stacks follow Last-In-First-Out (LIFO) principle. They're essential for problems involving nested structures, parsing, and finding relationships between elements.

**Key Applications:**
1. **Matching Brackets**: Validate nested structures (parentheses, HTML tags)
2. **Monotonic Stack**: Find next greater/smaller element in O(n)
3. **Expression Evaluation**: Parse and compute mathematical expressions
4. **Undo Operations**: Track state changes for backtracking

**The Monotonic Stack Pattern:**
A monotonic stack maintains elements in increasing or decreasing order. When a new element breaks the monotonicity, we pop elements and process them. This lets us find "next greater" or "next smaller" elements in O(n) total time.`,

      whenToUse: [
        'Validating or matching nested structures (brackets, tags)',
        'Finding next greater/smaller element for each position',
        'Expression parsing and evaluation',
        'Tracking previous state in iterative solutions',
        'Converting recursive to iterative (DFS)',
        'Histogram-type problems (largest rectangle, trapping rain water)'
      ],

      keyPatterns: ['Valid parentheses', 'Monotonic stack', 'Expression evaluation', 'Backtracking state', 'Next greater element', 'Calculator'],
      timeComplexity: 'O(n) for most operations',
      spaceComplexity: 'O(n)',

      approach: [
        'Identify if you need LIFO order processing',
        'For brackets: push opening, pop and match closing',
        'For monotonic: decide increasing or decreasing based on finding "next greater" or "next smaller"',
        'For expressions: use operator precedence and two-stack approach',
        'Always check empty stack before popping',
        'Consider what state to store: index, value, or both'
      ],

      commonProblems: [
        // Easy
        { name: 'Valid Parentheses', difficulty: 'Easy' },
        { name: 'Next Greater Element I', difficulty: 'Easy' },
        { name: 'Implement Stack using Queues', difficulty: 'Easy' },
        { name: 'Implement Queue using Stacks', difficulty: 'Easy' },
        { name: 'Baseball Game', difficulty: 'Easy' },
        { name: 'Remove All Adjacent Duplicates In String', difficulty: 'Easy' },
        { name: 'Backspace String Compare', difficulty: 'Easy' },
        { name: 'Make The String Great', difficulty: 'Easy' },
        // Medium
        { name: 'Min Stack', difficulty: 'Medium' },
        { name: 'Daily Temperatures', difficulty: 'Medium' },
        { name: 'Evaluate Reverse Polish Notation', difficulty: 'Medium' },
        { name: 'Decode String', difficulty: 'Medium' },
        { name: 'Next Greater Element II', difficulty: 'Medium' },
        { name: 'Online Stock Span', difficulty: 'Medium' },
        { name: 'Car Fleet', difficulty: 'Medium' },
        { name: 'Asteroid Collision', difficulty: 'Medium' },
        { name: 'Remove K Digits', difficulty: 'Medium' },
        { name: 'Simplify Path', difficulty: 'Medium' },
        { name: 'Generate Parentheses', difficulty: 'Medium' },
        { name: 'Score of Parentheses', difficulty: 'Medium' },
        { name: 'Minimum Add to Make Parentheses Valid', difficulty: 'Medium' },
        { name: 'Minimum Remove to Make Valid Parentheses', difficulty: 'Medium' },
        { name: 'Validate Stack Sequences', difficulty: 'Medium' },
        { name: '132 Pattern', difficulty: 'Medium' },
        { name: 'Remove All Adjacent Duplicates in String II', difficulty: 'Medium' },
        { name: 'Flatten Nested List Iterator', difficulty: 'Medium' },
        { name: 'Exclusive Time of Functions', difficulty: 'Medium' },
        { name: 'Sum of Subarray Minimums', difficulty: 'Medium' },
        { name: 'Sum of Subarray Ranges', difficulty: 'Medium' },
        { name: 'Maximum Width Ramp', difficulty: 'Medium' },
        { name: 'Longest Valid Parentheses', difficulty: 'Hard' },
        { name: 'Trapping Rain Water', difficulty: 'Hard' },
        // Medium
        { name: 'Buildings With an Ocean View', difficulty: 'Medium' },
        { name: 'Reverse Substrings Between Each Pair of Parentheses', difficulty: 'Medium' },
        { name: 'Maximum Nesting Depth of Two Valid Parentheses Strings', difficulty: 'Medium' },
        { name: 'Reverse Polish Notation', difficulty: 'Medium' },
        // Hard
        { name: 'Largest Rectangle in Histogram', difficulty: 'Hard' },
        { name: 'Maximal Rectangle', difficulty: 'Hard' },
        { name: 'Basic Calculator', difficulty: 'Hard' },
        { name: 'Basic Calculator II', difficulty: 'Medium' },
        { name: 'Basic Calculator III', difficulty: 'Hard' },
        { name: 'Number of Atoms', difficulty: 'Hard' },
        { name: 'Tag Validator', difficulty: 'Hard' },
        { name: 'Remove Invalid Parentheses', difficulty: 'Hard' },
        { name: 'Parsing A Boolean Expression', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is the purpose of a stack data structure, and can you provide a real-world analogy?', difficulty: 'Easy', answer: 'Stack provides LIFO (Last In First Out) access—last element added is first removed. Real-world: stack of plates (remove top first), browser back button (most recent page), undo operations. Used for function calls, expression evaluation, backtracking. O(1) push/pop/peek operations.' },
        { question: 'Explain the difference between a stack and a queue.', difficulty: 'Easy', answer: 'Stack: LIFO, push/pop from same end (top), like plates. Queue: FIFO (First In First Out), enqueue at back, dequeue from front, like line at store. Stack for depth-first, recursion, undo. Queue for breadth-first, scheduling, buffering. Both O(1) operations.' },
        { question: 'What are the advantages and disadvantages of using a stack?', difficulty: 'Easy', answer: 'Advantages: simple O(1) operations, natural for recursion/backtracking, memory efficient, easy implementation. Disadvantages: only top element accessible, no random access, limited functionality compared to arrays, fixed size (if array-based). Best for LIFO access patterns.' },
        { question: 'How does a call stack work in programming, and why is it important?', difficulty: 'Easy', answer: 'Call stack tracks function invocations. On call: push stack frame (return address, parameters, locals). On return: pop frame, resume at return address. Manages execution context, enables recursion, provides automatic memory management for locals. Stack overflow occurs when depth exceeds limit.' },
        { question: 'Explain the concept of recursion and how it relates to the stack data structure.', difficulty: 'Easy', answer: 'Recursion: function calls itself with smaller subproblems until base case. Each call pushes frame onto call stack storing state. Stack naturally handles nested calls—LIFO matches unwinding order. Deep recursion risks stack overflow. Iterative + explicit stack often equivalent.' },
        // Mid
        { question: 'Describe a situation where using a stack was critical to solving a problem.', difficulty: 'Medium', answer: 'Valid parentheses: push opening brackets, pop and match closing brackets. If mismatch or stack non-empty at end, invalid. DFS traversal, expression evaluation (operators and operands), undo/redo systems, browser history, syntax parsing. Stack\'s LIFO matches nested/hierarchical structures.' },
        { question: 'What happens when a stack overflows, and how can developers prevent it?', difficulty: 'Medium', answer: 'Stack overflow: exceeds allocated memory, causes crash/undefined behavior. Causes: deep/infinite recursion, large stack allocations. Prevention: limit recursion depth, use iteration with explicit stack, increase stack size (OS setting), use heap for large data, tail call optimization.' },
        { question: 'Explain how a stack can be implemented using an array and potential challenges.', difficulty: 'Medium', answer: 'Array-based: maintain top pointer, push increments and stores, pop decrements and returns. Challenges: fixed capacity (overflow if full), resizing needs O(n) copy. Dynamic array amortizes resize cost. Alternative: linked list (no size limit but pointer overhead). Array more cache-efficient.' },
        { question: 'What is a stack frame, and how does it relate to the call stack?', difficulty: 'Medium', answer: 'Stack frame: memory block for single function invocation containing return address, parameters, local variables, saved registers. Created on call, destroyed on return. Call stack = sequence of frames. Frame pointer references current frame. Debuggers use frames for stack traces.' },
        { question: 'Discuss the use of a stack in parsing expressions.', difficulty: 'Medium', answer: 'Shunting-yard algorithm converts infix to postfix using operator stack. Respect precedence: pop higher/equal precedence before pushing. Parentheses: push on open, pop to output on close. For evaluation: push operands, pop operands for operators, push result. Enables complex expression handling.' },
        { question: 'Can you explain the significance of a min stack and how it can be implemented?', difficulty: 'Medium', answer: 'Min stack supports O(1) getMin in addition to standard ops. Implementation: maintain auxiliary stack tracking minimum at each level. On push: push min(value, current_min). On pop: pop both stacks. Alternative: push (value, min_so_far) tuples. Common interview problem testing stack design.' },
        { question: 'Explain the use of a stack in handling undo functionality in applications.', difficulty: 'Medium', answer: 'Undo stack stores previous states/operations. Action: push state or inverse operation. Undo: pop and apply (restore state or execute inverse). Redo: use second stack—undo pops to redo stack. Memory concern: limit stack size, store deltas instead of full states.' },
        { question: 'Explain the concept of tail call optimization and how it\'s related to stack usage.', difficulty: 'Medium', answer: 'Tail call: recursive call is last operation in function. TCO: compiler reuses current frame instead of pushing new one—O(1) space instead of O(n). Effectively converts recursion to iteration. Not all languages support (Python doesn\'t, Scheme requires). Enables infinite recursion without overflow.' },
        { question: 'Discuss the role of a stack in expression evaluation or postfix notation.', difficulty: 'Medium', answer: 'Postfix (RPN): operators follow operands (3 4 + = 7). Evaluation: push operands; on operator, pop operands, compute, push result. No parentheses needed—order explicit. Stack naturally handles: process left to right, LIFO gives correct operand pairing. Used in calculators, compilers.' },
        { question: 'Discuss scenarios where a double-ended queue (deque) is more appropriate than a stack.', difficulty: 'Medium', answer: 'Deque: add/remove both ends O(1). Better than stack for: sliding window maximum (monotonic deque), palindrome checking, work-stealing (steal from opposite end), BFS with priority at both ends. Stack suffices for pure LIFO; deque adds flexibility without overhead.' },
        { question: 'Explain the concept of recursion depth and its relationship with stack usage.', difficulty: 'Medium', answer: 'Recursion depth: maximum nested calls before returning. Each level uses stack frame. Depth × frame size ≤ stack limit. Deep recursion risks overflow. Python default limit ~1000. Reduce by: tail recursion, memoization (prunes branches), iterative conversion. Balanced tree: O(log n); linear: O(n).' },
        // Senior
        { question: 'What is the role of a stack in managing memory in low-level languages like C?', difficulty: 'Hard', answer: 'Stack segment: automatic storage for locals and call management. Grows/shrinks with function calls. Fast allocation (just move stack pointer). No fragmentation. Limited size (typically 1-8MB). Scope-based lifetime. Contrast with heap: manual management, larger, fragmented. Stack for short-lived, sized data.' },
        { question: 'Discuss the role of a stack in handling function calls and memory allocation.', difficulty: 'Hard', answer: 'Function call: push return address, parameters (calling convention dependent), allocate locals by decrementing stack pointer. Function body accesses via frame pointer offsets. Return: restore stack pointer, pop return address, jump back. Enables nested calls, recursion. Hardware support (CALL/RET instructions).' },
        { question: 'Explain the concept of a stackless or coroutine model in programming.', difficulty: 'Hard', answer: 'Stackless: coroutines don\'t use call stack for suspension; state saved in heap objects. Enables millions of concurrent coroutines (Go goroutines, Python asyncio). Lower memory per coroutine. Traditional: one stack per thread (MB each). Stackless trades some flexibility for massive concurrency.' },
        { question: 'Explain the concept of a stack pointer in computer architecture.', difficulty: 'Hard', answer: 'Stack pointer (SP/ESP/RSP): CPU register pointing to current top of stack. Push: decrement SP, store value. Pop: load value, increment SP (or reverse on some architectures). Frame pointer (BP/EBP/RBP): stable reference within frame. Hardware support makes stack operations single instructions.' },
        { question: 'Explain how a stack can be used to implement a simple state machine.', difficulty: 'Hard', answer: 'Stack tracks nested states (e.g., parsing nested structures). Push state on entering context, pop on exit. Current state = stack top. Enables hierarchical states: menu → submenu → dialog. DFA doesn\'t need stack; PDA (pushdown automata) uses stack for context-free grammars.' },
        { question: 'Explain the use of a monotonic stack in algorithms and provide an example.', difficulty: 'Hard', answer: 'Monotonic stack maintains increasing/decreasing order. On push, pop elements violating order (they found their "answer"). Example: Next Greater Element—maintain decreasing stack; on larger element, pop smaller ones (current is their answer). O(n) total—each element pushed/popped once. Also: histogram area, daily temperatures.' },
        { question: 'Discuss the concept of stack smashing or buffer overflow vulnerabilities.', difficulty: 'Hard', answer: 'Stack smashing: overwrite return address via buffer overflow to redirect execution. Attack: overflow local buffer → overwrite saved return address → jump to injected code. Mitigations: stack canaries (detect overwrite), ASLR (randomize addresses), NX bit (non-executable stack), bounds checking.' },
        { question: 'Explain the potential impact of stack-based memory allocation on performance.', difficulty: 'Hard', answer: 'Stack allocation: extremely fast (pointer adjustment), automatic deallocation, excellent cache locality, no fragmentation. Limitations: size limits, scope-based lifetime only. Performance impact: stack access faster than heap (simpler, cached). Large allocations or deep recursion hurt—use heap. Balance stack simplicity with heap flexibility.' },
        { question: 'What are the potential challenges in multi-threaded applications with shared stacks?', difficulty: 'Hard', answer: 'Each thread needs own stack (automatic in most systems). Shared data on stacks: dangling pointers after function returns. Challenges: stack size per thread (memory usage), stack overflow detection per thread. Don\'t share stack pointers across threads. Use thread-local storage or heap for shared data.' }
      ],

      commonMistakes: [
        'Not checking if stack is empty before peek/pop',
        'For brackets: only checking counts, not order',
        'Monotonic stack: forgetting to handle remaining elements after iteration',
        'Using wrong monotonicity (increasing vs decreasing)',
        'Not storing both index and value when both are needed'
      ],

      tips: [
        'Monotonic stack finds next greater/smaller element in O(n)',
        'Use stack to track state in DFS/backtracking',
        'For calculator problems, use two stacks: numbers and operators',
        'Valid parentheses needs matching order, not just counts',
        'Store indices on stack when you need both position and value'
      ],

      interviewTips: [
        'Explain LIFO property and why it fits the problem',
        'For monotonic stack: clarify if finding next greater or smaller',
        'Walk through an example showing push/pop operations',
        'Mention time complexity: O(n) because each element pushed/popped once',
        'For calculator: clarify supported operators and edge cases'
      ],

      codeExamples: [
        {
          title: 'Valid Parentheses',
          language: 'python',
          description: 'Check if brackets are balanced and properly nested.',
          code: `def is_valid(s):
    stack = []
    matching = {')': '(', '}': '{', ']': '['}

    for char in s:
        if char in '({[':
            stack.append(char)
        elif char in ')}]':
            if not stack or stack[-1] != matching[char]:
                return False
            stack.pop()

    return len(stack) == 0`
        },
        {
          title: 'Daily Temperatures - Monotonic Decreasing Stack',
          language: 'python',
          description: 'For each day, find days until warmer temperature.',
          code: `def daily_temperatures(temps):
    n = len(temps)
    result = [0] * n
    stack = []  # Indices of temps waiting for warmer day

    for i, temp in enumerate(temps):
        # Pop all temps smaller than current
        while stack and temps[stack[-1]] < temp:
            prev_idx = stack.pop()
            result[prev_idx] = i - prev_idx
        stack.append(i)

    return result  # Remaining stack elements stay 0`
        },
        {
          title: 'Largest Rectangle in Histogram',
          language: 'python',
          description: 'Find largest rectangle that can be formed in histogram.',
          code: `def largest_rectangle(heights):
    stack = []  # Indices of increasing heights
    max_area = 0
    heights.append(0)  # Sentinel to trigger final calculation

    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)

    heights.pop()  # Remove sentinel
    return max_area`
        },
        {
          title: 'Basic Calculator (with +, -, parentheses)',
          language: 'python',
          description: 'Evaluate expression with +, -, and nested parentheses.',
          code: `def calculate(s):
    stack = []
    result = 0
    number = 0
    sign = 1

    for char in s:
        if char.isdigit():
            number = number * 10 + int(char)
        elif char == '+':
            result += sign * number
            number = 0
            sign = 1
        elif char == '-':
            result += sign * number
            number = 0
            sign = -1
        elif char == '(':
            stack.append(result)
            stack.append(sign)
            result = 0
            sign = 1
        elif char == ')':
            result += sign * number
            number = 0
            result *= stack.pop()  # Sign before parenthesis
            result += stack.pop()  # Result before parenthesis

    return result + sign * number`
        }
      ,
        {
          title: 'Valid Parentheses',
          language: 'javascript',
          description: 'Check if brackets are balanced and properly nested.',
          code: `function isValid(s) {
    const stack = [];
    const matching = { ')': '(', '}': '{', ']': '[' };

    for (const char of s) {
        if ('({['.includes(char)) {
            stack.push(char);
        } else if (')}]'.includes(char)) {
            if (!stack.length || stack[stack.length - 1] !== matching[char]) return false;
            stack.pop();
        }
    }
    return stack.length === 0;
}`
        },
        {
          title: 'Valid Parentheses',
          language: 'java',
          description: 'Check if brackets are balanced and properly nested.',
          code: `public boolean isValid(String s) {
    Deque<Character> stack = new ArrayDeque<>();
    Map<Character, Character> matching = Map.of(')', '(', '}', '{', ']', '[');

    for (char c : s.toCharArray()) {
        if (c == '(' || c == '{' || c == '[') {
            stack.push(c);
        } else {
            if (stack.isEmpty() || stack.peek() != matching.get(c)) return false;
            stack.pop();
        }
    }
    return stack.isEmpty();
}`
        },
        {
          title: 'Daily Temperatures - Monotonic Decreasing Stack',
          language: 'javascript',
          description: 'For each day, find days until warmer temperature.',
          code: `function dailyTemperatures(temps) {
    const result = new Array(temps.length).fill(0);
    const stack = []; // Indices of temps waiting for warmer day

    for (let i = 0; i < temps.length; i++) {
        while (stack.length && temps[stack[stack.length - 1]] < temps[i]) {
            const prevIdx = stack.pop();
            result[prevIdx] = i - prevIdx;
        }
        stack.push(i);
    }
    return result;
}`
        },
        {
          title: 'Daily Temperatures - Monotonic Decreasing Stack',
          language: 'java',
          description: 'For each day, find days until warmer temperature.',
          code: `public int[] dailyTemperatures(int[] temps) {
    int[] result = new int[temps.length];
    Deque<Integer> stack = new ArrayDeque<>(); // Indices

    for (int i = 0; i < temps.length; i++) {
        while (!stack.isEmpty() && temps[stack.peek()] < temps[i]) {
            int prevIdx = stack.pop();
            result[prevIdx] = i - prevIdx;
        }
        stack.push(i);
    }
    return result;
}`
        },
        {
          title: 'Largest Rectangle in Histogram',
          language: 'javascript',
          description: 'Find largest rectangle that can be formed in histogram.',
          code: `function largestRectangle(heights) {
    const stack = [];
    let maxArea = 0;
    heights.push(0); // Sentinel

    for (let i = 0; i < heights.length; i++) {
        while (stack.length && heights[stack[stack.length - 1]] > heights[i]) {
            const height = heights[stack.pop()];
            const width = stack.length ? i - stack[stack.length - 1] - 1 : i;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    heights.pop(); // Remove sentinel
    return maxArea;
}`
        },
        {
          title: 'Largest Rectangle in Histogram',
          language: 'java',
          description: 'Find largest rectangle that can be formed in histogram.',
          code: `public int largestRectangleArea(int[] heights) {
    Deque<Integer> stack = new ArrayDeque<>();
    int maxArea = 0;

    for (int i = 0; i <= heights.length; i++) {
        int h = (i == heights.length) ? 0 : heights[i];
        while (!stack.isEmpty() && heights[stack.peek()] > h) {
            int height = heights[stack.pop()];
            int width = stack.isEmpty() ? i : i - stack.peek() - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }
    return maxArea;
}`
        },
        {
          title: 'Basic Calculator (with +, -, parentheses)',
          language: 'javascript',
          description: 'Evaluate expression with +, -, and nested parentheses.',
          code: `function calculate(s) {
    const stack = [];
    let result = 0, number = 0, sign = 1;

    for (const char of s) {
        if (char >= '0' && char <= '9') {
            number = number * 10 + Number(char);
        } else if (char === '+') {
            result += sign * number; number = 0; sign = 1;
        } else if (char === '-') {
            result += sign * number; number = 0; sign = -1;
        } else if (char === '(') {
            stack.push(result); stack.push(sign);
            result = 0; sign = 1;
        } else if (char === ')') {
            result += sign * number; number = 0;
            result *= stack.pop(); // sign before parenthesis
            result += stack.pop(); // result before parenthesis
        }
    }
    return result + sign * number;
}`
        },
        {
          title: 'Basic Calculator (with +, -, parentheses)',
          language: 'java',
          description: 'Evaluate expression with +, -, and nested parentheses.',
          code: `public int calculate(String s) {
    Deque<Integer> stack = new ArrayDeque<>();
    int result = 0, number = 0, sign = 1;

    for (char c : s.toCharArray()) {
        if (Character.isDigit(c)) {
            number = number * 10 + (c - '0');
        } else if (c == '+') {
            result += sign * number; number = 0; sign = 1;
        } else if (c == '-') {
            result += sign * number; number = 0; sign = -1;
        } else if (c == '(') {
            stack.push(result); stack.push(sign);
            result = 0; sign = 1;
        } else if (c == ')') {
            result += sign * number; number = 0;
            result *= stack.pop();
            result += stack.pop();
        }
    }
    return result + sign * number;
}`
        }
      ]
    },
    {
      id: 'linked-lists',
      title: 'Linked Lists',
      icon: 'link',
      color: '#a855f7',
      questions: 31,
      description: 'Pointer manipulation fundamentals. Practice reversing, merging, and cycle detection.',

visualizations: [
        {
          title: 'Singly Linked List',
          language: 'python',
          description: 'Chain of nodes connected by next pointers, ending with null.',
          svg: '<svg viewBox="0 0 500 180" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah4" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="25" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Singly Linked List</text><text x="25" y="65" font-family="sans-serif" font-size="11" fill="#10b981" font-weight="bold">head</text><line x1="50" y1="68" x2="50" y2="82" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah4)"/><g><rect x="30" y="85" width="55" height="40" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="57" y="110" font-family="monospace" font-size="15" fill="#10b981" font-weight="bold" text-anchor="middle">1</text><line x1="88" y1="105" x2="115" y2="105" stroke="#64748b" stroke-width="2" marker-end="url(#ah4)"/></g><g><rect x="120" y="85" width="55" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="147" y="110" font-family="monospace" font-size="15" fill="#1e293b" text-anchor="middle">2</text><line x1="178" y1="105" x2="205" y2="105" stroke="#64748b" stroke-width="2" marker-end="url(#ah4)"/></g><g><rect x="210" y="85" width="55" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="237" y="110" font-family="monospace" font-size="15" fill="#1e293b" text-anchor="middle">3</text><line x1="268" y1="105" x2="295" y2="105" stroke="#64748b" stroke-width="2" marker-end="url(#ah4)"/></g><g><rect x="300" y="85" width="55" height="40" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="327" y="110" font-family="monospace" font-size="15" fill="#1e293b" text-anchor="middle">4</text><line x1="358" y1="105" x2="385" y2="105" stroke="#64748b" stroke-width="2" marker-end="url(#ah4)"/></g><rect x="390" y="95" width="50" height="22" rx="4" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5"/><text x="415" y="111" font-family="monospace" font-size="11" fill="#ef4444" text-anchor="middle">null</text><text x="20" y="155" font-family="sans-serif" font-size="11" fill="#64748b">Each node stores data + pointer to next node | Traversal O(n) | Insert/Delete at known pos O(1)</text></svg>'
        }
      ],

      introduction: `Linked Lists test your ability to manipulate pointers and think about data structures. Unlike arrays, linked lists don't have random access but allow O(1) insertion/deletion at known positions.

**Key Concepts:**
- **Singly Linked**: Each node points to next (forward traversal only)
- **Doubly Linked**: Each node points to both next and previous
- **Dummy Head**: A fake head node that simplifies edge cases

**Critical Insight:**
Most linked list problems become easier if you:
1. Use a dummy head to avoid special-casing empty list or head changes
2. Draw out the pointer changes before coding
3. Consider fast/slow pointer technique for cycle detection and finding middle`,

      whenToUse: [
        'Problems requiring in-place modification without extra space',
        'Detecting cycles in sequences (Floyd\'s algorithm)',
        'Finding middle element efficiently',
        'Merging sorted sequences',
        'Reversing or reordering elements',
        'LRU Cache implementation (doubly linked + hash map)'
      ],

      keyPatterns: ['Fast/slow pointers', 'Dummy head', 'Reversal', 'Merge two lists', 'Find middle', 'Detect cycle', 'Reverse K-group'],
      timeComplexity: 'O(n) traversal',
      spaceComplexity: 'O(1) for in-place operations',

      approach: [
        'Always consider using a dummy head node',
        'Draw the pointer changes on paper first',
        'For reversal: track prev, curr, and next_temp',
        'For cycle detection: use fast/slow (Floyd\'s algorithm)',
        'For finding middle: slow moves 1, fast moves 2',
        'Handle edge cases: null head, single node, two nodes'
      ],

      commonProblems: [
        // Easy
        { name: 'Reverse Linked List', difficulty: 'Easy' },
        { name: 'Merge Two Sorted Lists', difficulty: 'Easy' },
        { name: 'Linked List Cycle', difficulty: 'Easy' },
        { name: 'Middle of the Linked List', difficulty: 'Easy' },
        { name: 'Delete Node in a Linked List', difficulty: 'Medium' },
        { name: 'Remove Duplicates from Sorted List', difficulty: 'Easy' },
        { name: 'Palindrome Linked List', difficulty: 'Easy' },
        { name: 'Intersection of Two Linked Lists', difficulty: 'Easy' },
        { name: 'Remove Linked List Elements', difficulty: 'Easy' },
        { name: 'Convert Binary Number in a Linked List to Integer', difficulty: 'Easy' },
        // Medium
        { name: 'Remove Nth Node From End of List', difficulty: 'Medium' },
        { name: 'Reorder List', difficulty: 'Medium' },
        { name: 'Add Two Numbers', difficulty: 'Medium' },
        { name: 'Add Two Numbers II', difficulty: 'Medium' },
        { name: 'Copy List with Random Pointer', difficulty: 'Medium' },
        { name: 'Linked List Cycle II', difficulty: 'Medium' },
        { name: 'Remove Duplicates from Sorted List II', difficulty: 'Medium' },
        { name: 'Rotate List', difficulty: 'Medium' },
        { name: 'Swap Nodes in Pairs', difficulty: 'Medium' },
        { name: 'Partition List', difficulty: 'Medium' },
        { name: 'Sort List', difficulty: 'Medium' },
        { name: 'Insertion Sort List', difficulty: 'Medium' },
        { name: 'Odd Even Linked List', difficulty: 'Medium' },
        { name: 'Split Linked List in Parts', difficulty: 'Medium' },
        { name: 'Design Linked List', difficulty: 'Medium' },
        { name: 'Design Browser History', difficulty: 'Medium' },
        { name: 'LRU Cache', difficulty: 'Medium' },
        { name: 'Flatten a Multilevel Doubly Linked List', difficulty: 'Medium' },
        { name: 'Next Greater Node In Linked List', difficulty: 'Medium' },
        { name: 'Remove Zero Sum Consecutive Nodes from Linked List', difficulty: 'Medium' },
        { name: 'Swapping Nodes in a Linked List', difficulty: 'Medium' },
        { name: 'Design Front Middle Back Queue', difficulty: 'Medium' },
        // Hard
        { name: 'Reverse Nodes in K-Group', difficulty: 'Hard' },
        { name: 'Merge K Sorted Lists', difficulty: 'Hard' },
        { name: 'LFU Cache', difficulty: 'Hard' },
        { name: 'All O\'one Data Structure', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a Linked List?', difficulty: 'Easy', answer: 'A linked list is a linear data structure where elements (nodes) contain data and pointer(s) to other nodes. Unlike arrays, elements aren\'t contiguous in memory. Enables O(1) insertion/deletion at known positions but O(n) access. Types: singly, doubly, circular. Used when frequent insertions/deletions needed.' },
        { question: 'What are the types of Linked Lists?', difficulty: 'Easy', answer: 'Singly linked: each node points to next, one-way traversal. Doubly linked: nodes point to both next and previous, bidirectional. Circular: last node points to first (singly or doubly). Variants: sorted, with sentinel/dummy nodes, skip lists. Choice depends on operations needed.' },
        { question: 'How do you insert an element at the beginning of a singly linked list?', difficulty: 'Easy', answer: 'Create new node, set new_node.next = head, update head = new_node. O(1) time. No traversal needed—just pointer manipulation. Handle empty list: same process, head was null. Common operation; doubly linked list also updates new_node.prev if needed.' },
        { question: 'How do you delete a node from a singly linked list?', difficulty: 'Easy', answer: 'Find predecessor of target node O(n), set prev.next = target.next, free/discard target. O(1) if predecessor known. Deleting head: update head = head.next. Challenge: can\'t find predecessor from target alone (need traversal or doubly linked). Handle single-node and empty cases.' },
        { question: 'What are some common use cases for linked lists?', difficulty: 'Easy', answer: 'Implementation of stacks/queues, LRU cache (with hash map), undo functionality, polynomial representation, memory allocation (free lists), adjacency lists for graphs, music playlists (next/previous), browser history. Best when: frequent insert/delete, unknown size, no random access needed.' },
        { question: 'What is the time complexity of inserting and deleting a node in a singly linked list?', difficulty: 'Easy', answer: 'Insert at head: O(1). Insert at tail: O(n) without tail pointer, O(1) with. Insert at position: O(n) to find position + O(1) to insert. Delete: O(n) to find predecessor + O(1) to remove. With doubly linked or given predecessor reference: O(1) for the operation itself.' },
        // Mid
        { question: 'Explain a Doubly Linked List and its advantages over a Singly Linked List.', difficulty: 'Medium', answer: 'Doubly linked: each node has prev and next pointers. Advantages: O(1) delete with node reference (access predecessor directly), bidirectional traversal, easier reversal, simpler certain algorithms. Disadvantages: extra memory per node, more complex insert/delete code. Used in LRU cache, browser history.' },
        { question: 'What is a circular linked list, and where is it used?', difficulty: 'Medium', answer: 'Circular: last node points to first (no null terminator). Can be singly or doubly circular. Uses: round-robin scheduling, circular buffers, representing cycles (Josephus problem), media players (repeat playlist). Any node can be starting point. Detection: fast/slow pointers will meet.' },
        { question: 'How do you detect if a linked list has a cycle (loop)?', difficulty: 'Medium', answer: 'Floyd\'s algorithm: slow pointer moves 1 step, fast moves 2 steps. If cycle exists, they meet inside cycle. If fast reaches null, no cycle. O(n) time, O(1) space. Alternative: hash set of visited nodes O(n) space. To find cycle start: after meeting, reset one to head, both move 1 step until they meet again.' },
        { question: 'What is the difference between an array and a linked list?', difficulty: 'Medium', answer: 'Array: contiguous memory, O(1) random access, O(n) insert/delete (shifting), fixed size (or amortized resize), better cache locality. Linked list: scattered memory, O(n) access, O(1) insert/delete at known position, dynamic size, pointer overhead. Arrays for access-heavy; lists for modification-heavy.' },
        { question: 'When would you choose a linked list over an array or vice versa?', difficulty: 'Medium', answer: 'Linked list: frequent insertions/deletions at arbitrary positions, unknown final size, implementing deques/stacks efficiently, no random access needed. Array: random access required, memory efficiency matters, cache performance critical, size known/stable. Most cases: arrays preferred due to cache efficiency.' },
        { question: 'Explain the concept of a dummy or sentinel node in a linked list.', difficulty: 'Medium', answer: 'Dummy/sentinel: placeholder node before actual head (or after tail). Simplifies code by eliminating null checks for empty list and head modification cases. Operations always have valid prev/next. Common in LRU cache, merge operations. After processing, return dummy.next as actual head.' },
        { question: 'What is a self-adjusting linked list, and why might it be useful?', difficulty: 'Medium', answer: 'Self-adjusting: reorganizes based on access patterns. Move-to-front: accessed element moved to head (O(1) for repeated access). Transpose: swap with predecessor. Approximates optimal static ordering over time. Useful for caches, frequently accessed data. Trade-off: extra movement overhead vs faster access for hot items.' },
        { question: 'Discuss the concept of a doubly linked list with a tail pointer.', difficulty: 'Medium', answer: 'Tail pointer: maintain reference to last node in addition to head. Enables O(1) append (vs O(n) traversal). Combined with doubly linked: O(1) operations at both ends—perfect for deque implementation. Must update tail on deletions/insertions affecting it. LRU cache uses this pattern.' },
        { question: 'What is a circular doubly linked list?', difficulty: 'Medium', answer: 'Combines circular and doubly linked: last.next = first, first.prev = last. Full bidirectional navigation, no null pointers. Any node accesses entire list. Used in: OS process scheduling, navigation (wrap around), certain cache implementations. Insertion/deletion uniform anywhere. Detect full cycle when returning to start.' },
        { question: 'What is the runner or two-pointer technique in linked lists?', difficulty: 'Medium', answer: 'Two pointers traverse at different speeds or starting points. Fast/slow (cycle detection, find middle), ahead-by-k (kth from end), two-list (merge, intersection). Middle: slow at middle when fast reaches end. Kth from end: advance fast k steps, then both until fast.next null. O(n) time, O(1) space.' },
        // Senior
        { question: 'Explain the concept of a sparse linked list.', difficulty: 'Hard', answer: 'Sparse list stores only non-default values with their indices, linking consecutive entries. For sparse data (mostly zeros), much more memory-efficient than array. Each node: (index, value, next). Access: traverse to find index. Used in sparse matrices, polynomial representation. Trade-off: O(k) access where k = non-zero elements.' },
        { question: 'Explain memory fragmentation in the context of linked lists.', difficulty: 'Hard', answer: 'Linked list nodes allocated separately scatter across memory (external fragmentation). Poor cache locality: accessing next node likely cache miss. Contrast with arrays: contiguous allocation. Mitigation: pool allocators (pre-allocate node blocks), unrolled linked lists (multiple elements per node). Significant performance impact for large lists.' },
        { question: 'What is the difference between a singly linked list and a skip list?', difficulty: 'Hard', answer: 'Singly linked: O(n) search, single forward pointer. Skip list: multiple levels of forward pointers, O(log n) expected search/insert/delete. Probabilistic balancing (random level assignment). Skip list: practical alternative to balanced trees, simpler implementation, concurrent-friendly. Used in Redis, LevelDB.' },
        { question: 'What is the difference between an intrusive and non-intrusive linked list?', difficulty: 'Hard', answer: 'Non-intrusive: node contains pointer to data, data objects unaware of list. Intrusive: data structure contains list node (next/prev pointers embedded). Intrusive: no separate allocation, better cache locality, element can only be in one list of each type. Used in Linux kernel, game engines. Trade-off: flexibility vs performance.' },
        { question: 'Explain garbage collection in the context of linked lists.', difficulty: 'Hard', answer: 'GC reclaims unreachable nodes automatically. Mark-and-sweep: trace from roots (head), mark reachable, sweep unmarked. Linked structures challenging: scattered memory, pointer chasing. Reference counting: each node tracks references, freed when zero (but cycles leak). Cycle detection needed. Languages without GC require manual deallocation.' }
      ],

      commonMistakes: [
        'Losing reference to nodes (save next before modifying pointers)',
        'Not handling null/empty list edge cases',
        'Forgetting to update the tail.next = None after reversal',
        'Off-by-one in remove Nth from end',
        'Infinite loop from not properly breaking cycle'
      ],

      tips: [
        'Use dummy head to simplify edge cases (empty list, single node)',
        'Draw out pointer changes before coding',
        'Fast/slow pointers: fast moves 2x, finds middle and detects cycles',
        'For reversal, track prev, curr, next pointers',
        'When in doubt, use two passes: first to count, second to operate'
      ],

      interviewTips: [
        'Always ask: singly or doubly linked? Has cycle?',
        'Mention dummy head technique and why it helps',
        'Draw the pointer manipulation on whiteboard',
        'Test with: empty list, single node, two nodes, even/odd length',
        'For complex problems, break into subproblems (find middle, reverse, merge)'
      ],

      codeExamples: [
        {
          title: 'Reverse Linked List',
          language: 'python',
          description: 'Iteratively reverse a singly linked list in O(1) space.',
          code: `def reverse_list(head):
    prev = None
    curr = head

    while curr:
        next_temp = curr.next  # Save next node
        curr.next = prev       # Reverse pointer
        prev = curr            # Move prev forward
        curr = next_temp       # Move curr forward

    return prev  # New head`
        },
        {
          title: 'Detect Cycle - Floyd\'s Algorithm',
          language: 'python',
          description: 'Detect if linked list has a cycle using fast/slow pointers.',
          code: `def has_cycle(head):
    slow = fast = head

    while fast and fast.next:
        slow = slow.next        # Move 1 step
        fast = fast.next.next   # Move 2 steps
        if slow == fast:
            return True

    return False  # Fast reached end, no cycle`
        },
        {
          title: 'Find Middle Node',
          language: 'python',
          description: 'Find middle node using slow/fast pointers.',
          code: `def find_middle(head):
    slow = fast = head

    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next

    return slow  # Middle (for even length, second middle)`
        },
        {
          title: 'Merge Two Sorted Lists',
          language: 'python',
          description: 'Merge two sorted lists into one sorted list.',
          code: `def merge_two_lists(l1, l2):
    dummy = ListNode(0)
    current = dummy

    while l1 and l2:
        if l1.val <= l2.val:
            current.next = l1
            l1 = l1.next
        else:
            current.next = l2
            l2 = l2.next
        current = current.next

    current.next = l1 or l2  # Append remaining
    return dummy.next`
        },
        {
          title: 'Remove Nth Node From End',
          language: 'python',
          description: 'Remove the nth node from end in one pass.',
          code: `def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    slow = fast = dummy

    # Advance fast by n+1 steps
    for _ in range(n + 1):
        fast = fast.next

    # Move both until fast reaches end
    while fast:
        slow = slow.next
        fast = fast.next

    # Skip the nth node
    slow.next = slow.next.next
    return dummy.next`
        }
      ,
        {
          title: 'Reverse Linked List',
          language: 'javascript',
          description: 'Iteratively reverse a singly linked list in O(1) space.',
          code: `function reverseList(head) {
    let prev = null, curr = head;

    while (curr) {
        const nextTemp = curr.next; // Save next node
        curr.next = prev;           // Reverse pointer
        prev = curr;                // Move prev forward
        curr = nextTemp;            // Move curr forward
    }
    return prev; // New head
}`
        },
        {
          title: 'Reverse Linked List',
          language: 'java',
          description: 'Iteratively reverse a singly linked list in O(1) space.',
          code: `public ListNode reverseList(ListNode head) {
    ListNode prev = null, curr = head;

    while (curr != null) {
        ListNode nextTemp = curr.next;
        curr.next = prev;
        prev = curr;
        curr = nextTemp;
    }
    return prev;
}`
        },
        {
          title: 'Detect Cycle - Floyd\'s Algorithm',
          language: 'javascript',
          description: 'Detect if linked list has a cycle using fast/slow pointers.',
          code: `function hasCycle(head) {
    let slow = head, fast = head;

    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
    }
    return false;
}`
        },
        {
          title: 'Detect Cycle - Floyd\'s Algorithm',
          language: 'java',
          description: 'Detect if linked list has a cycle using fast/slow pointers.',
          code: `public boolean hasCycle(ListNode head) {
    ListNode slow = head, fast = head;

    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) return true;
    }
    return false;
}`
        },
        {
          title: 'Find Middle Node',
          language: 'javascript',
          description: 'Find middle node using slow/fast pointers.',
          code: `function findMiddle(head) {
    let slow = head, fast = head;

    while (fast && fast.next) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}`
        },
        {
          title: 'Find Middle Node',
          language: 'java',
          description: 'Find middle node using slow/fast pointers.',
          code: `public ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;

    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;
}`
        },
        {
          title: 'Merge Two Sorted Lists',
          language: 'javascript',
          description: 'Merge two sorted lists into one sorted list.',
          code: `function mergeTwoLists(l1, l2) {
    const dummy = { val: 0, next: null };
    let current = dummy;

    while (l1 && l2) {
        if (l1.val <= l2.val) {
            current.next = l1; l1 = l1.next;
        } else {
            current.next = l2; l2 = l2.next;
        }
        current = current.next;
    }
    current.next = l1 || l2;
    return dummy.next;
}`
        },
        {
          title: 'Merge Two Sorted Lists',
          language: 'java',
          description: 'Merge two sorted lists into one sorted list.',
          code: `public ListNode mergeTwoLists(ListNode l1, ListNode l2) {
    ListNode dummy = new ListNode(0);
    ListNode current = dummy;

    while (l1 != null && l2 != null) {
        if (l1.val <= l2.val) {
            current.next = l1; l1 = l1.next;
        } else {
            current.next = l2; l2 = l2.next;
        }
        current = current.next;
    }
    current.next = (l1 != null) ? l1 : l2;
    return dummy.next;
}`
        },
        {
          title: 'Remove Nth Node From End',
          language: 'javascript',
          description: 'Remove the nth node from end in one pass.',
          code: `function removeNthFromEnd(head, n) {
    const dummy = { val: 0, next: head };
    let slow = dummy, fast = dummy;

    for (let i = 0; i <= n; i++) fast = fast.next;
    while (fast) { slow = slow.next; fast = fast.next; }

    slow.next = slow.next.next;
    return dummy.next;
}`
        },
        {
          title: 'Remove Nth Node From End',
          language: 'java',
          description: 'Remove the nth node from end in one pass.',
          code: `public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head);
    ListNode slow = dummy, fast = dummy;

    for (int i = 0; i <= n; i++) fast = fast.next;
    while (fast != null) { slow = slow.next; fast = fast.next; }

    slow.next = slow.next.next;
    return dummy.next;
}`
        }
      ]
    },
    {
      id: 'trees',
      title: 'Trees',
      icon: 'share',
      color: '#06b6d4',
      questions: 45,
      description: 'Binary trees and BSTs. Master DFS, BFS, and recursive thinking.',

visualizations: [
        {
          title: 'Binary Tree with Traversal Orders',
          language: 'python',
          description: 'A binary tree showing root, children, and leaves with inorder traversal numbers.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah5" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Binary Tree — Inorder Traversal</text><circle cx="250" cy="55" r="22" fill="#f0fdf4" stroke="#10b981" stroke-width="2.5"/><text x="250" y="60" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">4</text><text x="250" y="30" font-family="sans-serif" font-size="10" fill="#10b981">root</text><line x1="233" y1="72" x2="170" y2="108" stroke="#64748b" stroke-width="1.5"/><line x1="267" y1="72" x2="330" y2="108" stroke="#64748b" stroke-width="1.5"/><circle cx="160" cy="120" r="22" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="160" y="125" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">2</text><circle cx="340" cy="120" r="22" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="340" y="125" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">6</text><line x1="145" y1="138" x2="105" y2="168" stroke="#64748b" stroke-width="1.5"/><line x1="175" y1="138" x2="215" y2="168" stroke="#64748b" stroke-width="1.5"/><line x1="325" y1="138" x2="285" y2="168" stroke="#64748b" stroke-width="1.5"/><line x1="355" y1="138" x2="395" y2="168" stroke="#64748b" stroke-width="1.5"/><circle cx="95" cy="182" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><text x="95" y="187" font-family="monospace" font-size="13" fill="#64748b" text-anchor="middle">1</text><circle cx="225" cy="182" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><text x="225" y="187" font-family="monospace" font-size="13" fill="#64748b" text-anchor="middle">3</text><circle cx="275" cy="182" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><text x="275" y="187" font-family="monospace" font-size="13" fill="#64748b" text-anchor="middle">5</text><circle cx="405" cy="182" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/><text x="405" y="187" font-family="monospace" font-size="13" fill="#64748b" text-anchor="middle">7</text><text x="78" y="212" font-family="sans-serif" font-size="9" fill="#94a3b8">leaf</text><text x="208" y="212" font-family="sans-serif" font-size="9" fill="#94a3b8">leaf</text><text x="258" y="212" font-family="sans-serif" font-size="9" fill="#94a3b8">leaf</text><text x="388" y="212" font-family="sans-serif" font-size="9" fill="#94a3b8">leaf</text><text x="20" y="242" font-family="sans-serif" font-size="11" fill="#64748b">Inorder: 1,2,3,4,5,6,7 (sorted!) | Preorder: 4,2,1,3,6,5,7 | Postorder: 1,3,2,5,7,6,4</text></svg>'
        }
      ],

      introduction: `Trees are hierarchical data structures essential for interviews. Most tree problems require recursive thinking—solving for the current node using solutions from subtrees.

**Key Tree Types:**
- **Binary Tree**: Each node has at most 2 children
- **Binary Search Tree (BST)**: Left subtree < node < right subtree
- **Balanced Trees**: AVL, Red-Black (rarely implemented in interviews)
- **N-ary Trees**: Nodes can have any number of children

**Traversal Orders:**
- **Preorder**: Root → Left → Right (copying trees, prefix expressions)
- **Inorder**: Left → Root → Right (BST gives sorted order!)
- **Postorder**: Left → Right → Root (deleting trees, postfix expressions)
- **Level-order (BFS)**: Level by level using queue`,

      whenToUse: [
        'Problems involving hierarchical relationships',
        'When you need to visit all nodes (traversal)',
        'BST for ordered data operations',
        'Path problems (root to leaf, any to any)',
        'Tree construction from traversals',
        'Level-by-level processing'
      ],

      keyPatterns: ['DFS (preorder/inorder/postorder)', 'BFS level-order', 'BST properties', 'Path problems', 'LCA', 'Serialization', 'Tree construction'],
      timeComplexity: 'O(n) to visit all nodes',
      spaceComplexity: 'O(h) where h is height, O(n) worst case',

      approach: [
        'Identify if it\'s a general tree or BST problem',
        'Decide traversal order: preorder (top-down), postorder (bottom-up), or level-order',
        'Define what each recursive call returns',
        'Handle base case: null node returns appropriate value',
        'For BST: leverage the ordering property',
        'For path problems: track current path and result separately'
      ],

      commonProblems: [
        // Easy
        { name: 'Maximum Depth of Binary Tree', difficulty: 'Easy' },
        { name: 'Minimum Depth of Binary Tree', difficulty: 'Easy' },
        { name: 'Invert Binary Tree', difficulty: 'Easy' },
        { name: 'Same Tree', difficulty: 'Easy' },
        { name: 'Symmetric Tree', difficulty: 'Easy' },
        { name: 'Subtree of Another Tree', difficulty: 'Easy' },
        { name: 'Balanced Binary Tree', difficulty: 'Easy' },
        { name: 'Diameter of Binary Tree', difficulty: 'Easy' },
        { name: 'Path Sum', difficulty: 'Easy' },
        { name: 'Binary Tree Paths', difficulty: 'Easy' },
        { name: 'Sum of Left Leaves', difficulty: 'Easy' },
        { name: 'Average of Levels in Binary Tree', difficulty: 'Easy' },
        { name: 'Merge Two Binary Trees', difficulty: 'Easy' },
        { name: 'Search in a Binary Search Tree', difficulty: 'Easy' },
        { name: 'Range Sum of BST', difficulty: 'Easy' },
        { name: 'Univalued Binary Tree', difficulty: 'Easy' },
        { name: 'Leaf-Similar Trees', difficulty: 'Easy' },
        { name: 'Convert Sorted Array to Binary Search Tree', difficulty: 'Easy' },
        { name: 'Closest Binary Search Tree Value', difficulty: 'Easy' },
        { name: 'Cousins in Binary Tree', difficulty: 'Easy' },
        { name: 'N-ary Tree Preorder Traversal', difficulty: 'Easy' },
        { name: 'N-ary Tree Postorder Traversal', difficulty: 'Easy' },
        { name: 'Maximum Depth of N-ary Tree', difficulty: 'Easy' },
        { name: 'Binary Tree Preorder Traversal', difficulty: 'Easy' },
        { name: 'Binary Tree Inorder Traversal', difficulty: 'Easy' },
        { name: 'Binary Tree Postorder Traversal', difficulty: 'Easy' },
        { name: 'Two Sum IV - Input is a BST', difficulty: 'Easy' },
        // Medium
        { name: 'Validate Binary Search Tree', difficulty: 'Medium' },
        { name: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium' },
        { name: 'Lowest Common Ancestor of a BST', difficulty: 'Medium' },
        { name: 'Binary Tree Level Order Traversal', difficulty: 'Medium' },
        { name: 'Binary Tree Level Order Traversal II', difficulty: 'Medium' },
        { name: 'Binary Tree Zigzag Level Order Traversal', difficulty: 'Medium' },
        { name: 'Binary Tree Right Side View', difficulty: 'Medium' },
        { name: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium' },
        { name: 'Construct Binary Tree from Inorder and Postorder', difficulty: 'Medium' },
        { name: 'Kth Smallest Element in a BST', difficulty: 'Medium' },
        { name: 'Count Good Nodes in Binary Tree', difficulty: 'Medium' },
        { name: 'Path Sum II', difficulty: 'Medium' },
        { name: 'Path Sum III', difficulty: 'Medium' },
        { name: 'Sum Root to Leaf Numbers', difficulty: 'Medium' },
        { name: 'Flatten Binary Tree to Linked List', difficulty: 'Medium' },
        { name: 'Populating Next Right Pointers in Each Node', difficulty: 'Medium' },
        { name: 'Populating Next Right Pointers in Each Node II', difficulty: 'Medium' },
        { name: 'Binary Search Tree Iterator', difficulty: 'Medium' },
        { name: 'Delete Node in a BST', difficulty: 'Medium' },
        { name: 'Insert into a Binary Search Tree', difficulty: 'Medium' },
        { name: 'Trim a Binary Search Tree', difficulty: 'Medium' },
        { name: 'House Robber III', difficulty: 'Medium' },
        { name: 'Most Frequent Subtree Sum', difficulty: 'Medium' },
        { name: 'Find Duplicate Subtrees', difficulty: 'Medium' },
        { name: 'All Nodes Distance K in Binary Tree', difficulty: 'Medium' },
        { name: 'Serialize and Deserialize BST', difficulty: 'Medium' },
        { name: 'Recover Binary Search Tree', difficulty: 'Medium' },
        { name: 'Convert BST to Greater Tree', difficulty: 'Medium' },
        { name: 'Construct Binary Search Tree from Preorder', difficulty: 'Medium' },
        { name: 'Maximum Binary Tree', difficulty: 'Medium' },
        { name: 'Maximum Width of Binary Tree', difficulty: 'Medium' },
        { name: 'Distribute Coins in Binary Tree', difficulty: 'Medium' },
        { name: 'Flip Equivalent Binary Trees', difficulty: 'Medium' },
        { name: 'Convert Binary Search Tree to Sorted Doubly Linked List', difficulty: 'Medium' },
        { name: 'Amount of Time for Binary Tree to Be Infected', difficulty: 'Medium' },
        { name: 'Binary Tree Longest Consecutive Sequence', difficulty: 'Medium' },
        { name: 'Bottom View of Binary Tree', difficulty: 'Medium' },
        { name: 'Boundary of Binary Tree', difficulty: 'Medium' },
        { name: 'Closest Leaf in a Binary Tree', difficulty: 'Medium' },
        { name: 'Count Complete Tree Nodes', difficulty: 'Medium' },
        { name: 'Deepest Leaves Sum', difficulty: 'Medium' },
        { name: 'Delete Leaves With a Given Value', difficulty: 'Medium' },
        { name: 'N-ary Tree Level Order Traversal', difficulty: 'Medium' },
        { name: 'Check Completeness of a Binary Tree', difficulty: 'Medium' },
        { name: 'Binary Tree Pruning', difficulty: 'Medium' },
        { name: 'Step-By-Step Directions From a Binary Tree Node to Another', difficulty: 'Medium' },
        { name: 'Even Odd Tree', difficulty: 'Medium' },
        { name: 'Find Bottom Left Tree Value', difficulty: 'Medium' },
        { name: 'Find Largest Value in Each Tree Row', difficulty: 'Medium' },
        { name: 'Add One Row to Tree', difficulty: 'Medium' },
        // Hard
        { name: 'Binary Tree Maximum Path Sum', difficulty: 'Hard' },
        { name: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard' },
        { name: 'Binary Tree Cameras', difficulty: 'Hard' },
        { name: 'Vertical Order Traversal of a Binary Tree', difficulty: 'Hard' },
        { name: 'Smallest String Starting From Leaf', difficulty: 'Medium' },
        { name: 'Maximum Sum BST in Binary Tree', difficulty: 'Hard' },
        { name: 'Cut Off Trees for Golf Event', difficulty: 'Hard' },
        { name: 'Count Nodes Equal to Sum of Descendants', difficulty: 'Medium' },
        { name: 'Longest Path With Different Adjacent Characters', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a tree data structure?', difficulty: 'Easy', answer: 'A tree is a hierarchical data structure with a root node and child nodes forming parent-child relationships. Each node has zero or more children, and there\'s exactly one path between any two nodes. Trees have no cycles. Used for hierarchical data like file systems, org charts, and DOM.' },
        { question: 'Explain the characteristics of a binary tree.', difficulty: 'Easy', answer: 'A binary tree has at most 2 children per node (left and right). Properties: max nodes at level i is 2^i, max nodes in tree of height h is 2^(h+1)-1. Types include full (0 or 2 children), complete (all levels filled except last), and perfect (all leaves at same level).' },
        { question: 'What is a binary search tree (BST)?', difficulty: 'Easy', answer: 'A BST maintains ordering: left subtree values < node < right subtree values. Enables O(log n) search, insert, delete in balanced trees. In-order traversal yields sorted sequence. Degenerates to O(n) linked list if unbalanced. Foundation for sets and maps.' },
        { question: 'What is a balanced binary tree, and why is it important?', difficulty: 'Easy', answer: 'A balanced tree maintains height O(log n) by ensuring subtree heights differ by at most 1 (AVL) or satisfying color constraints (Red-Black). Critical for O(log n) operations; unbalanced trees degrade to O(n). Self-balancing trees auto-rebalance via rotations.' },
        { question: 'Explain the concept of tree traversal.', difficulty: 'Easy', answer: 'Tree traversal visits all nodes systematically. DFS types: preorder (root-left-right) for copying, inorder (left-root-right) for sorted BST output, postorder (left-right-root) for deletion. BFS/level-order uses queue for breadth-first. Time: O(n), Space: O(h) for DFS, O(w) for BFS.' },
        { question: 'What is an in-order traversal of a binary tree?', difficulty: 'Easy', answer: 'In-order visits left subtree, then root, then right subtree (L-N-R). For BST, produces sorted ascending order. Iterative version uses stack: go left until null, pop and process, go right. Used for BST validation, finding kth smallest, and sorted iteration.' },
        { question: 'Explain the concept of a binary heap.', difficulty: 'Easy', answer: 'A binary heap is a complete binary tree satisfying heap property: max-heap (parent ≥ children) or min-heap (parent ≤ children). Stored in array where parent(i)=(i-1)/2, children at 2i+1, 2i+2. O(log n) insert/delete, O(1) peek. Used for priority queues and heapsort.' },
        { question: 'Explain the concept of a self-balancing binary search tree (BST).', difficulty: 'Easy', answer: 'Self-balancing BSTs automatically maintain O(log n) height after insertions/deletions through rotations. Examples: AVL (strict balance, faster lookup), Red-Black (relaxed balance, faster insert/delete), Splay (recently accessed near root). Guarantees worst-case O(log n) operations.' },
        // Mid
        { question: 'What is a Trie data structure, and what are its common applications?', difficulty: 'Medium', answer: 'A Trie (prefix tree) stores strings with shared prefixes in a tree where each edge represents a character. O(m) search/insert where m is string length. Applications: autocomplete, spell checkers, IP routing tables, word games. More space-efficient than storing all prefixes.' },
        { question: 'Explain the concept of a binary tree\'s lowest common ancestor (LCA).', difficulty: 'Medium', answer: 'LCA of nodes p and q is the deepest node that has both as descendants. Algorithm: recursively search left and right subtrees; if both return non-null, current node is LCA; otherwise return the non-null result. BST optimization: compare values to decide direction. O(h) time.' },
        { question: 'What is a binary tree traversal without using recursion?', difficulty: 'Medium', answer: 'Use explicit stack to simulate call stack. Preorder: push root, pop and process, push right then left. Inorder: go left pushing nodes, pop and process, go right. Postorder: use two stacks or track last visited. Morris traversal achieves O(1) space using threaded pointers.' },
        { question: 'How would you find the depth or level of a specific node in a binary tree?', difficulty: 'Medium', answer: 'DFS approach: recursively search with depth counter, return depth when node found. BFS approach: level-order traversal tracking level, return when node found. For root depth, count edges from root. Time: O(n), Space: O(h). Return -1 if node not found.' },
        { question: 'Explain the concept of a binary tree\'s diameter.', difficulty: 'Medium', answer: 'Diameter is the longest path between any two nodes (number of edges). May or may not pass through root. Algorithm: for each node, diameter through it = left_height + right_height. Track maximum globally. O(n) with single DFS computing heights bottom-up. Classic postorder problem.' },
        { question: 'What is a binary tree\'s zigzag level order traversal, and how is it different?', difficulty: 'Medium', answer: 'Zigzag traversal alternates direction each level: left-to-right, then right-to-left. Use BFS with a flag tracking direction, reverse level list when needed, or use deque adding to front/back alternately. Applications: printing trees, certain tree problems. O(n) time and space.' },
        { question: 'What is a binary expression tree, and how is it used in evaluating mathematical expressions?', difficulty: 'Medium', answer: 'Expression tree represents mathematical expressions with operators as internal nodes and operands as leaves. Inorder traversal gives infix notation, postorder gives postfix. Evaluate via postorder: recursively evaluate subtrees, apply operator. Used in compilers and calculators.' },
        { question: 'Explain the concept of a self-balancing BST. Provide examples like AVL, Red-Black trees.', difficulty: 'Medium', answer: 'Self-balancing BSTs maintain O(log n) height. AVL: balance factor |height(left)-height(right)| ≤ 1, uses rotations. Red-Black: nodes colored red/black with rules ensuring balance, used in TreeMap/TreeSet. Splay: moves accessed nodes to root. Trade-offs: AVL stricter balance (faster lookup), Red-Black faster modifications.' },
        { question: 'What is the difference between a binary tree and a binary search tree (BST)?', difficulty: 'Medium', answer: 'Binary tree: each node has ≤2 children, no ordering. BST: adds ordering property (left < node < right). BST enables O(log n) search vs O(n) for general binary tree. BST in-order traversal is sorted. Binary tree is structural; BST adds semantic meaning to positions.' },
        { question: 'What is the difference between a binary heap and a binary search tree (BST)?', difficulty: 'Medium', answer: 'Heap: complete tree, parent compared to children only (partial order), O(1) find-min/max, O(log n) insert/extract, array storage. BST: not necessarily complete, total ordering (left < node < right), O(log n) search/insert/delete, pointer-based. Heap for priority queue; BST for sorted operations.' },
        { question: 'Explain the concept of a Huffman tree and its use in data compression algorithms.', difficulty: 'Medium', answer: 'Huffman tree builds optimal prefix-free codes for compression. Algorithm: create leaf nodes with frequencies, repeatedly merge two lowest-frequency nodes. Shorter codes for frequent symbols. Used in JPEG, MP3, ZIP. Guarantees no code is prefix of another. O(n log n) construction with heap.' },
        // Senior
        { question: 'What is a binary indexed tree (BIT) or Fenwick tree? How is it used?', difficulty: 'Hard', answer: 'Fenwick tree enables O(log n) prefix sum queries and point updates on arrays. Each index stores sum of specific range based on lowest set bit. update(i, delta): add delta to i, i += i & (-i). query(i): sum prefix, i -= i & (-i). Space O(n). Used for range sum queries, inversion count, 2D extensions.' },
        { question: 'Explain the concept of a B-tree and its advantages in database systems.', difficulty: 'Hard', answer: 'B-tree is a self-balancing tree optimized for disk I/O with high branching factor (hundreds of children). Each node holds multiple keys. Minimizes disk seeks by keeping tree shallow. Variants: B+ tree stores data only in leaves with linked leaves for range queries. Standard for databases and filesystems.' },
        { question: 'What is an AVL tree, and how does it maintain balance?', difficulty: 'Hard', answer: 'AVL tree maintains |height(left) - height(right)| ≤ 1 for every node. After insert/delete, check balance factors bottom-up. Rebalance via rotations: LL/RR (single rotation), LR/RL (double rotation). Height guaranteed O(log n). More rigidly balanced than Red-Black, faster lookups but slower modifications.' },
        { question: 'Explain the concept of a Red-Black tree. How does it ensure balance?', difficulty: 'Hard', answer: 'Red-Black tree: nodes are red or black, root is black, no two consecutive reds, black-height (black nodes to leaves) equal for all paths. These properties ensure height ≤ 2log(n+1). Rebalancing via recoloring and rotations. Used in std::map, TreeMap. Less strict than AVL, fewer rotations on insert/delete.' },
        { question: 'What is a segment tree, and how is it used for range queries?', difficulty: 'Hard', answer: 'Segment tree answers range queries (sum, min, max) in O(log n) with O(log n) updates. Each node represents a range, leaves are array elements. Build O(n), query/update O(log n). Supports lazy propagation for range updates. Used for range minimum query, sum queries, computational geometry. Space O(2n).' },
        { question: 'Explain the concept of an N-ary tree and provide examples of scenarios.', difficulty: 'Hard', answer: 'N-ary tree allows unlimited children per node. Examples: file system directories, organizational hierarchies, HTML DOM, game trees. Traversal similar to binary but iterate over children array. Serialization uses parentheses or sentinel. Some problems convert between N-ary and binary (left-child right-sibling).' }
      ],

      commonMistakes: [
        'Confusing preorder vs inorder vs postorder',
        'Not handling null nodes (base case) properly',
        'For BST validation: using parent value instead of range',
        'Modifying tree during traversal without intention',
        'Not considering negative values in path sum problems'
      ],

      tips: [
        'Most tree problems are solved with recursion or BFS',
        'For BST, inorder traversal gives sorted order',
        'Track return values carefully: height, validity, path sum',
        'Level-order uses queue, DFS uses stack (implicit or explicit)',
        'Think about what information flows up vs down the tree'
      ],

      interviewTips: [
        'Ask: Is it a BST or general binary tree?',
        'Clarify what to return: boolean, count, path, or node',
        'State your traversal order and why',
        'Trace through a simple example showing recursive calls',
        'Mention space complexity depends on tree balance'
      ],

      codeExamples: [
        {
          title: 'Maximum Depth (Postorder - Bottom Up)',
          language: 'python',
          description: 'Height is 1 + max of children heights.',
          code: `def max_depth(root):
    if not root:
        return 0
    left_depth = max_depth(root.left)
    right_depth = max_depth(root.right)
    return 1 + max(left_depth, right_depth)`
        },
        {
          title: 'Validate BST (Preorder with Range)',
          language: 'python',
          description: 'Each node must be within valid range.',
          code: `def is_valid_bst(root, min_val=float('-inf'), max_val=float('inf')):
    if not root:
        return True
    if root.val <= min_val or root.val >= max_val:
        return False
    return (is_valid_bst(root.left, min_val, root.val) and
            is_valid_bst(root.right, root.val, max_val))`
        },
        {
          title: 'Level Order Traversal (BFS)',
          language: 'python',
          description: 'Process tree level by level using queue.',
          code: `from collections import deque

def level_order(root):
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level_size = len(queue)
        level = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)

    return result`
        },
        {
          title: 'Lowest Common Ancestor',
          language: 'python',
          description: 'Find LCA of two nodes in binary tree.',
          code: `def lowest_common_ancestor(root, p, q):
    if not root or root == p or root == q:
        return root

    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)

    if left and right:
        return root  # p and q in different subtrees
    return left or right  # Both in same subtree`
        }
      ,
        {
          title: 'Maximum Depth (Postorder - Bottom Up)',
          language: 'javascript',
          description: 'Height is 1 + max of children heights.',
          code: `function maxDepth(root) {
    if (!root) return 0;
    const leftDepth = maxDepth(root.left);
    const rightDepth = maxDepth(root.right);
    return 1 + Math.max(leftDepth, rightDepth);
}`
        },
        {
          title: 'Maximum Depth (Postorder - Bottom Up)',
          language: 'java',
          description: 'Height is 1 + max of children heights.',
          code: `public int maxDepth(TreeNode root) {
    if (root == null) return 0;
    int leftDepth = maxDepth(root.left);
    int rightDepth = maxDepth(root.right);
    return 1 + Math.max(leftDepth, rightDepth);
}`
        },
        {
          title: 'Validate BST (Preorder with Range)',
          language: 'javascript',
          description: 'Each node must be within valid range.',
          code: `function isValidBST(root, min = -Infinity, max = Infinity) {
    if (!root) return true;
    if (root.val <= min || root.val >= max) return false;
    return isValidBST(root.left, min, root.val) &&
           isValidBST(root.right, root.val, max);
}`
        },
        {
          title: 'Validate BST (Preorder with Range)',
          language: 'java',
          description: 'Each node must be within valid range.',
          code: `public boolean isValidBST(TreeNode root) {
    return validate(root, Long.MIN_VALUE, Long.MAX_VALUE);
}

private boolean validate(TreeNode node, long min, long max) {
    if (node == null) return true;
    if (node.val <= min || node.val >= max) return false;
    return validate(node.left, min, node.val) &&
           validate(node.right, node.val, max);
}`
        },
        {
          title: 'Level Order Traversal (BFS)',
          language: 'javascript',
          description: 'Process tree level by level using queue.',
          code: `function levelOrder(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];

    while (queue.length) {
        const levelSize = queue.length;
        const level = [];
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            level.push(node.val);
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        result.push(level);
    }
    return result;
}`
        },
        {
          title: 'Level Order Traversal (BFS)',
          language: 'java',
          description: 'Process tree level by level using queue.',
          code: `public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> result = new ArrayList<>();
    if (root == null) return result;
    Queue<TreeNode> queue = new LinkedList<>();
    queue.offer(root);

    while (!queue.isEmpty()) {
        int levelSize = queue.size();
        List<Integer> level = new ArrayList<>();
        for (int i = 0; i < levelSize; i++) {
            TreeNode node = queue.poll();
            level.add(node.val);
            if (node.left != null) queue.offer(node.left);
            if (node.right != null) queue.offer(node.right);
        }
        result.add(level);
    }
    return result;
}`
        },
        {
          title: 'Lowest Common Ancestor',
          language: 'javascript',
          description: 'Find LCA of two nodes in binary tree.',
          code: `function lowestCommonAncestor(root, p, q) {
    if (!root || root === p || root === q) return root;

    const left = lowestCommonAncestor(root.left, p, q);
    const right = lowestCommonAncestor(root.right, p, q);

    if (left && right) return root;
    return left || right;
}`
        },
        {
          title: 'Lowest Common Ancestor',
          language: 'java',
          description: 'Find LCA of two nodes in binary tree.',
          code: `public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;

    TreeNode left = lowestCommonAncestor(root.left, p, q);
    TreeNode right = lowestCommonAncestor(root.right, p, q);

    if (left != null && right != null) return root;
    return left != null ? left : right;
}`
        }
      ]
    },
    {
      id: 'graphs',
      title: 'Graphs',
      icon: 'share',
      color: '#ec4899',
      questions: 54,
      description: 'DFS, BFS, and shortest path algorithms. Represent as adjacency list.',

visualizations: [
        {
          title: 'Graph with Adjacency List',
          language: 'python',
          description: 'Shows 6 connected nodes as a graph alongside its adjacency list representation.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah6" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Undirected Graph + Adjacency List</text><line x1="80" y1="65" x2="180" y2="65" stroke="#cbd5e1" stroke-width="1.5"/><line x1="80" y1="65" x2="50" y2="140" stroke="#cbd5e1" stroke-width="1.5"/><line x1="80" y1="65" x2="130" y2="140" stroke="#cbd5e1" stroke-width="1.5"/><line x1="180" y1="65" x2="130" y2="140" stroke="#cbd5e1" stroke-width="1.5"/><line x1="180" y1="65" x2="210" y2="140" stroke="#cbd5e1" stroke-width="1.5"/><line x1="50" y1="140" x2="130" y2="140" stroke="#cbd5e1" stroke-width="1.5"/><line x1="130" y1="140" x2="130" y2="210" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="80" cy="65" r="18" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="80" y="70" font-family="monospace" font-size="13" fill="#10b981" font-weight="bold" text-anchor="middle">0</text><circle cx="180" cy="65" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="180" y="70" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">1</text><circle cx="50" cy="140" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="50" y="145" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">2</text><circle cx="130" cy="140" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="130" y="145" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">3</text><circle cx="210" cy="140" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="210" y="145" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">4</text><circle cx="130" cy="210" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="2"/><text x="130" y="215" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">5</text><text x="290" y="50" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e293b">Adjacency List</text><text x="290" y="72" font-family="monospace" font-size="11" fill="#10b981" font-weight="bold">0: [1, 2, 3]</text><text x="290" y="92" font-family="monospace" font-size="11" fill="#1e293b">1: [0, 3, 4]</text><text x="290" y="112" font-family="monospace" font-size="11" fill="#1e293b">2: [0, 3]</text><text x="290" y="132" font-family="monospace" font-size="11" fill="#1e293b">3: [0, 1, 2, 5]</text><text x="290" y="152" font-family="monospace" font-size="11" fill="#1e293b">4: [1]</text><text x="290" y="172" font-family="monospace" font-size="11" fill="#1e293b">5: [3]</text><text x="290" y="210" font-family="sans-serif" font-size="11" fill="#64748b">V=6, E=7</text><text x="290" y="228" font-family="sans-serif" font-size="11" fill="#64748b">DFS/BFS: O(V+E)</text></svg>'
        }
      ],

      introduction: `Graphs model relationships between entities. Master graph traversal and you'll solve 15-20% of interview problems. Grids are graphs too—each cell connects to its neighbors.

**Graph Representations:**
- **Adjacency List**: {node: [neighbors]} - Best for sparse graphs, O(V+E) space
- **Adjacency Matrix**: grid[i][j] = 1 if edge - Best for dense graphs, O(V²) space
- **Edge List**: [(u, v, weight)] - Good for some algorithms like Kruskal's

**Key Algorithms:**
- **DFS**: Explore as deep as possible (recursion/stack)
- **BFS**: Explore level by level (queue) - shortest path in unweighted graphs
- **Topological Sort**: Order tasks with dependencies (DAG only)
- **Union-Find**: Track connected components efficiently
- **Dijkstra's**: Shortest path in weighted graphs`,

      whenToUse: [
        'Finding connected components (Number of Islands)',
        'Shortest path in unweighted graph (BFS)',
        'Detecting cycles in directed graph (Course Schedule)',
        'Ordering with dependencies (Topological Sort)',
        'Shortest path with positive weights (Dijkstra)',
        'Tracking dynamic connectivity (Union-Find)'
      ],

      keyPatterns: ['DFS traversal', 'BFS shortest path', 'Topological sort', 'Union-Find', 'Dijkstra', 'Cycle detection', 'Grid as graph'],
      timeComplexity: 'O(V + E) for traversal',
      spaceComplexity: 'O(V) for visited set',

      approach: [
        'Build adjacency list from edge list if needed',
        'Choose DFS (deep exploration) or BFS (shortest unweighted path)',
        'Track visited nodes to avoid cycles',
        'For grids: treat each cell as node, neighbors as edges',
        'For topological sort: use DFS post-order or Kahn\'s (in-degree)',
        'For weighted shortest path: use Dijkstra with min-heap'
      ],

      commonProblems: [
        // Easy
        { name: 'Find if Path Exists in Graph', difficulty: 'Easy' },
        { name: 'Find the Town Judge', difficulty: 'Easy' },
        { name: 'Find Center of Star Graph', difficulty: 'Easy' },
        // Medium - BFS/DFS
        { name: 'Number of Islands', difficulty: 'Medium' },
        { name: 'Max Area of Island', difficulty: 'Medium' },
        { name: 'Clone Graph', difficulty: 'Medium' },
        { name: 'Pacific Atlantic Water Flow', difficulty: 'Medium' },
        { name: 'Surrounded Regions', difficulty: 'Medium' },
        { name: 'Rotting Oranges', difficulty: 'Medium' },
        { name: 'Walls and Gates', difficulty: 'Medium' },
        { name: '01 Matrix', difficulty: 'Medium' },
        { name: 'Snakes and Ladders', difficulty: 'Medium' },
        { name: 'Open the Lock', difficulty: 'Medium' },
        { name: 'Shortest Path in Binary Matrix', difficulty: 'Medium' },
        { name: 'As Far from Land as Possible', difficulty: 'Medium' },
        { name: 'Shortest Bridge', difficulty: 'Medium' },
        // Medium - Topological Sort
        { name: 'Course Schedule', difficulty: 'Medium' },
        { name: 'Course Schedule II', difficulty: 'Medium' },
        { name: 'Alien Dictionary', difficulty: 'Hard' },
        { name: 'Parallel Courses', difficulty: 'Medium' },
        { name: 'Minimum Height Trees', difficulty: 'Medium' },
        { name: 'Sequence Reconstruction', difficulty: 'Medium' },
        { name: 'Find All Possible Recipes from Given Supplies', difficulty: 'Medium' },
        // Medium - Union Find
        { name: 'Number of Provinces', difficulty: 'Medium' },
        { name: 'Redundant Connection', difficulty: 'Medium' },
        { name: 'Most Stones Removed with Same Row or Column', difficulty: 'Medium' },
        { name: 'Satisfiability of Equality Equations', difficulty: 'Medium' },
        { name: 'Accounts Merge', difficulty: 'Medium' },
        { name: 'Number of Connected Components', difficulty: 'Medium' },
        { name: 'Graph Valid Tree', difficulty: 'Medium' },
        { name: 'Regions Cut By Slashes', difficulty: 'Medium' },
        { name: 'Making A Large Island', difficulty: 'Hard' },
        // Medium - Shortest Path
        { name: 'Network Delay Time', difficulty: 'Medium' },
        { name: 'Cheapest Flights Within K Stops', difficulty: 'Medium' },
        { name: 'Path with Maximum Probability', difficulty: 'Medium' },
        { name: 'Path With Minimum Effort', difficulty: 'Medium' },
        { name: 'Swim in Rising Water', difficulty: 'Hard' },
        { name: 'Find the City With the Smallest Number of Neighbors', difficulty: 'Medium' },
        // Medium - Other
        { name: 'All Paths From Source to Target', difficulty: 'Medium' },
        { name: 'Keys and Rooms', difficulty: 'Medium' },
        { name: 'Is Graph Bipartite?', difficulty: 'Medium' },
        { name: 'Possible Bipartition', difficulty: 'Medium' },
        { name: 'Evaluate Division', difficulty: 'Medium' },
        { name: 'Detect Cycles in 2D Grid', difficulty: 'Medium' },
        { name: 'Minimum Number of Vertices to Reach All Nodes', difficulty: 'Medium' },
        { name: 'Find Eventual Safe States', difficulty: 'Medium' },
        { name: 'Loud and Rich', difficulty: 'Medium' },
        { name: 'Time Needed to Inform All Employees', difficulty: 'Medium' },
        { name: 'Count Sub Islands', difficulty: 'Medium' },
        { name: 'Reorder Routes to Make All Paths Lead to City Zero', difficulty: 'Medium' },
        // Medium
        { name: 'The Maze', difficulty: 'Medium' },
        { name: 'The Maze II', difficulty: 'Medium' },
        { name: 'The Maze III', difficulty: 'Hard' },
        { name: 'Cleaning Robot Reachable Cells', difficulty: 'Medium' },
        // Hard
        { name: 'Word Ladder', difficulty: 'Hard' },
        { name: 'Word Ladder II', difficulty: 'Hard' },
        { name: 'Reconstruct Itinerary', difficulty: 'Hard' },
        { name: 'Critical Connections in a Network', difficulty: 'Hard' },
        { name: 'Min Cost to Connect All Points', difficulty: 'Medium' },
        { name: 'Number of Operations to Make Network Connected', difficulty: 'Medium' },
        { name: 'Longest Increasing Path in a Matrix', difficulty: 'Hard' },
        { name: 'Shortest Path Visiting All Nodes', difficulty: 'Hard' },
        { name: 'Bus Routes', difficulty: 'Hard' },
        { name: 'Cat and Mouse', difficulty: 'Hard' },
        { name: 'Frog Position After T Seconds', difficulty: 'Hard' },
        { name: 'Minimize Malware Spread', difficulty: 'Hard' },
        { name: 'Minimum Cost to Make at Least One Valid Path in a Grid', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a graph data structure, and why is it used in computer science?', difficulty: 'Easy', answer: 'A graph consists of vertices (nodes) and edges connecting them. Models relationships: social networks (users/friendships), maps (locations/roads), dependencies (tasks/prerequisites). More general than trees—allows cycles and multiple paths. Foundation for routing, recommendations, and network analysis.' },
        { question: 'What are some different types of graphs?', difficulty: 'Easy', answer: 'Directed/Undirected (edge direction), Weighted/Unweighted (edge costs), Cyclic/Acyclic (contains cycles), Connected/Disconnected (all vertices reachable), Sparse/Dense (edge count), Bipartite (two-colorable), Complete (all pairs connected), Tree (connected acyclic), DAG (directed acyclic graph).' },
        { question: 'What is a directed graph?', difficulty: 'Easy', answer: 'A directed graph (digraph) has edges with direction from source to destination. Edge (u,v) means u→v but not necessarily v→u. Examples: web links, Twitter follows, dependencies. In-degree = incoming edges, out-degree = outgoing. Enables one-way relationships.' },
        { question: 'What is an undirected graph?', difficulty: 'Easy', answer: 'An undirected graph has bidirectional edges—if (u,v) exists, so does (v,u). Represents symmetric relationships: friendships, roads without one-ways. Degree of vertex = total edges connected. Implemented as directed graph with edges both ways.' },
        { question: 'Explain the differences between a directed graph and an undirected graph.', difficulty: 'Easy', answer: 'Directed: edges have direction (u→v), asymmetric relationships, separate in/out degrees. Undirected: edges bidirectional, symmetric relationships, single degree. Directed for dependencies, web links; undirected for friendships, roads. Storage: undirected needs both directions in adjacency list.' },
        { question: 'What is an unweighted graph?', difficulty: 'Easy', answer: 'Unweighted graphs have edges without associated costs—all edges are equal. BFS finds shortest path (fewest edges). Used when only connectivity matters, not distance. Examples: social connections, maze paths. Simpler algorithms than weighted graphs.' },
        { question: 'What are weighted graphs, and how are they represented in data structures?', difficulty: 'Easy', answer: 'Weighted graphs assign costs/weights to edges. Adjacency list: {u: [(v, weight), ...]}, Adjacency matrix: matrix[u][v] = weight. Used for distances, costs, capacities. Requires Dijkstra/Bellman-Ford for shortest paths instead of BFS.' },
        { question: 'Explain the concept of a sparse graph and a dense graph.', difficulty: 'Easy', answer: 'Sparse: E ≈ V (few edges), use adjacency list O(V+E) space. Dense: E ≈ V² (many edges), adjacency matrix O(V²) acceptable. Social networks are sparse; tournament brackets are dense. Affects algorithm choice—matrix operations faster for dense graphs.' },
        { question: 'What is the degree of a node in a graph, and how is it calculated?', difficulty: 'Easy', answer: 'Degree = number of edges incident to a node. Undirected: count adjacent vertices. Directed: in-degree (incoming), out-degree (outgoing), total degree = in + out. In adjacency list: len(adj[node]). Sum of degrees = 2 × edges (handshaking lemma).' },
        { question: 'What is a cycle in a graph, and why is cycle detection important?', difficulty: 'Easy', answer: 'A cycle is a path that starts and ends at the same vertex. Detection important for: deadlock detection (resource graphs), valid dependency ordering (must be acyclic), infinite loops prevention, tree verification. Detected via DFS tracking visited states or Union-Find.' },
        { question: 'How do you detect cycles in an undirected graph?', difficulty: 'Easy', answer: 'DFS: if neighbor is visited and not parent, cycle exists. Union-Find: if adding edge connects already-connected vertices, cycle found. BFS: track parent, cycle if reaching visited non-parent. For undirected, must distinguish backtracking from cycles.' },
        { question: 'Explain the concept of graph connectivity.', difficulty: 'Easy', answer: 'Connected graph: path exists between any two vertices. Strongly connected (directed): path both ways between any pair. Weakly connected: underlying undirected graph is connected. Connected components: maximal connected subgraphs. Test via DFS/BFS from any node—if all visited, connected.' },
        { question: 'Explain graph traversal algorithms like DFS and BFS.', difficulty: 'Easy', answer: 'DFS: explore deep before backtracking, uses stack/recursion, O(V+E), good for paths, cycles, topological sort. BFS: explore level-by-level using queue, O(V+E), finds shortest path in unweighted graphs. Both visit each vertex once using visited set.' },
        // Mid
        { question: 'How do you perform depth first search (DFS) on a graph?', difficulty: 'Medium', answer: 'Start at source, mark visited, recursively visit unvisited neighbors. Iterative: use stack—push start, while stack not empty: pop, if unvisited mark and push neighbors. Track visited set to avoid revisiting. Returns spanning tree edges. For all components, run from each unvisited vertex.' },
        { question: 'How do you perform breadth first search (BFS) on a graph?', difficulty: 'Medium', answer: 'Use queue: enqueue source, mark visited. While queue not empty: dequeue vertex, process it, enqueue unvisited neighbors (mark them visited). Visits vertices in order of distance from source. Returns shortest path tree for unweighted graphs.' },
        { question: 'What is the time complexity of a DFS on a graph?', difficulty: 'Medium', answer: 'O(V + E) where V = vertices, E = edges. Each vertex visited once O(V), each edge examined once O(E) via adjacency list. With adjacency matrix: O(V²) due to checking all possible edges. Space: O(V) for visited set and recursion stack (worst case for line graph).' },
        { question: 'What is the time complexity of a BFS on a graph?', difficulty: 'Medium', answer: 'O(V + E) with adjacency list—each vertex enqueued/dequeued once, each edge examined once. O(V²) with adjacency matrix. Space: O(V) for queue (worst case: all vertices at same level) and visited set. Same as DFS but different traversal order.' },
        { question: 'What are spanning trees in a graph, and why are they useful?', difficulty: 'Medium', answer: 'Spanning tree: subgraph that connects all vertices with minimum edges (V-1 edges, no cycles). MST adds minimum total weight. Applications: network design, clustering, approximation algorithms. DFS/BFS produce spanning trees. Multiple spanning trees may exist.' },
        { question: 'Explain the concept of graph centrality measures.', difficulty: 'Medium', answer: 'Centrality quantifies node importance. Degree centrality: most connections. Betweenness: lies on many shortest paths (bridges). Closeness: smallest average distance to others. PageRank: importance based on incoming links. Used for influencer detection, network analysis, recommendation.' },
        { question: 'What is an adjacency matrix?', difficulty: 'Medium', answer: 'V×V matrix where matrix[i][j] = 1 (or weight) if edge exists, 0 otherwise. O(V²) space regardless of edges. O(1) edge lookup, O(V) neighbor iteration. Good for dense graphs, matrix operations, checking edge existence. Symmetric for undirected graphs.' },
        { question: 'What is an adjacency list?', difficulty: 'Medium', answer: 'Dictionary/array mapping each vertex to list of neighbors. O(V+E) space. O(degree) neighbor iteration, O(degree) edge lookup. Preferred for sparse graphs and traversal algorithms. Implementation: {v: [neighbors]} or {v: [(neighbor, weight)]} for weighted.' },
        { question: 'What are the advantages of adjacency matrices vs adjacency lists?', difficulty: 'Medium', answer: 'Matrix: O(1) edge lookup, good for dense graphs, enables matrix operations, simpler implementation. List: O(V+E) space (vs O(V²)), faster iteration for sparse graphs, better for most algorithms. Choose matrix when E ≈ V² or need fast edge queries; list for E << V².' },
        { question: 'What is the difference between an unweighted graph and a weighted graph?', difficulty: 'Medium', answer: 'Unweighted: all edges equal, BFS finds shortest path, simpler algorithms. Weighted: edges have costs, need Dijkstra (positive) or Bellman-Ford (negative) for shortest path. Weighted allows modeling distances, costs, capacities. Storage: unweighted just neighbors, weighted includes (neighbor, weight).' },
        { question: 'Explain the difference between an adjacency matrix and an adjacency list.', difficulty: 'Medium', answer: 'Matrix: O(V²) space, O(1) edge check, O(V) neighbor scan, good for dense graphs. List: O(V+E) space, O(degree) edge check, O(degree) neighbor scan, good for sparse graphs. Most real-world graphs are sparse; list preferred for DFS/BFS/Dijkstra.' },
        { question: 'What is a bipartite graph, and how can you determine if a graph is bipartite?', difficulty: 'Medium', answer: 'Bipartite graph: vertices split into two sets with edges only between sets (2-colorable). Test: BFS/DFS coloring—alternate colors; if neighbor has same color, not bipartite. Equivalent: no odd-length cycles. Applications: matching problems, scheduling, conflict detection.' },
        { question: 'Explain the concept of graph isomorphism.', difficulty: 'Medium', answer: 'Two graphs are isomorphic if a bijection exists between vertices preserving edges. Same structure, different labels. Hard problem (no known polynomial algorithm, not proven NP-complete). Practical checks: same V/E counts, degree sequences, verify specific mapping.' },
        { question: 'Discuss the concept of graph coloring.', difficulty: 'Medium', answer: 'Graph coloring assigns colors to vertices so adjacent vertices differ. Chromatic number: minimum colors needed. NP-hard to find optimal; greedy gives upper bound. Applications: scheduling (time slots), register allocation (compilers), map coloring. Bipartite = 2-colorable.' },
        { question: 'What is Dijkstra\'s algorithm, and how does it work?', difficulty: 'Medium', answer: 'Dijkstra finds shortest paths from source in weighted graphs (non-negative weights). Uses min-heap of (distance, vertex). Extract minimum, relax neighbors (update if shorter path found). Greedy: always expands closest unprocessed vertex. O((V+E)log V) with heap.' },
        { question: 'Explain A* search algorithm.', difficulty: 'Medium', answer: 'A* is informed search using f(n) = g(n) + h(n), where g = actual cost from start, h = heuristic estimate to goal. Uses priority queue ordered by f. Optimal if h is admissible (never overestimates). Faster than Dijkstra when good heuristic available. Used in pathfinding, games.' },
        { question: 'What is the time complexity of Dijkstra\'s algorithm?', difficulty: 'Medium', answer: 'With binary heap: O((V + E) log V)—each vertex extracted once O(V log V), each edge relaxed once O(E log V). With Fibonacci heap: O(E + V log V). With array (no heap): O(V²). For dense graphs (E ≈ V²), array version competitive.' },
        { question: 'What is a minimum spanning tree (MST)?', difficulty: 'Medium', answer: 'MST connects all vertices with minimum total edge weight, no cycles, V-1 edges. Not necessarily unique. Algorithms: Kruskal (sort edges, union-find), Prim (grow from vertex, min-heap). Applications: network design, clustering, TSP approximation.' },
        { question: 'What is Kruskal\'s algorithm?', difficulty: 'Medium', answer: 'Kruskal builds MST by sorting all edges, then adding smallest that doesn\'t create cycle (checked via Union-Find). Greedy: always take minimum safe edge. Process: sort edges O(E log E), iterate adding if different components. Returns forest of trees if disconnected.' },
        { question: 'What is the time complexity of Kruskal\'s algorithm?', difficulty: 'Medium', answer: 'O(E log E) or equivalently O(E log V) since E ≤ V². Dominated by sorting edges. Union-Find operations are nearly O(1) with path compression and union by rank—technically O(α(n)) inverse Ackermann. Total: O(E log E + E × α(V)) ≈ O(E log E).' },
        { question: 'What is Prim\'s algorithm?', difficulty: 'Medium', answer: 'Prim grows MST from starting vertex: maintain min-heap of (weight, edge) for crossing edges. Extract minimum, add to tree if endpoint not in tree, add its edges to heap. Similar to Dijkstra but tracks edge weights, not path distances. Better for dense graphs.' },
        { question: 'What is the time complexity of Prim\'s algorithm?', difficulty: 'Medium', answer: 'With binary heap: O((V + E) log V). With Fibonacci heap: O(E + V log V). With adjacency matrix and no heap: O(V²)—good for dense graphs. Comparable to Kruskal for sparse graphs; Prim better for dense or when starting vertex matters.' },
        // Senior
        { question: 'Discuss the concept of topological sorting in directed acyclic graphs (DAGs).', difficulty: 'Hard', answer: 'Topological sort orders vertices so all edges go from earlier to later. Only exists for DAGs (cycle = no valid ordering). Applications: build systems, course prerequisites, task scheduling. Algorithms: DFS post-order (reverse), Kahn\'s (remove zero in-degree vertices). O(V+E). May have multiple valid orderings.' },
        { question: 'How do you perform a topological sort of a graph?', difficulty: 'Hard', answer: 'Kahn\'s: find all zero in-degree vertices, add to queue. Dequeue, add to result, decrease neighbors\' in-degree; enqueue those reaching zero. DFS: recursively visit, add to result after all descendants (post-order), reverse final list. Both O(V+E). Cycle if can\'t process all vertices.' },
        { question: 'Explain the concept of Eulerian paths and Eulerian cycles in graphs.', difficulty: 'Hard', answer: 'Eulerian path visits every edge exactly once; Eulerian cycle returns to start. Exists if: (cycle) all vertices have even degree, (path) exactly 0 or 2 odd-degree vertices. Find via Hierholzer\'s algorithm: traverse edges, merge cycles. Applications: DNA sequencing, circuit design.' },
        { question: 'What is the traveling salesman problem (TSP), and how does it relate to graphs?', difficulty: 'Hard', answer: 'TSP: find shortest Hamiltonian cycle (visit every vertex exactly once, return to start) in weighted graph. NP-hard; brute force O(n!), DP O(n²2^n). Approximations: nearest neighbor, Christofides (1.5x optimal for metric TSP). Fundamental optimization problem with logistics applications.' },
        { question: 'Explain the concept of graph compression and its significance.', difficulty: 'Hard', answer: 'Graph compression reduces storage while preserving queries. Techniques: compact adjacency lists, graph summarization (supernodes), edge sparsification, encoding schemes (WebGraph). Enables large-scale graph analytics, web graph storage, social network analysis. Trade-off between compression ratio and query speed.' },
        { question: 'What is the chromatic polynomial of a graph, and what does it represent?', difficulty: 'Hard', answer: 'Chromatic polynomial P(k) gives number of proper k-colorings. P(k) = 0 for k < chromatic number. Computed via deletion-contraction recursion. Properties reveal graph structure. Example: complete graph K_n has P(k) = k(k-1)(k-2)...(k-n+1). Connects graph theory and algebra.' }
      ],

      commonMistakes: [
        'Forgetting to mark nodes as visited (infinite loops)',
        'Using DFS when BFS is needed for shortest path',
        'Not building adjacency list for undirected graphs (add both directions)',
        'Off-by-one errors in grid boundaries',
        'Using Dijkstra with negative weights (use Bellman-Ford instead)'
      ],

      tips: [
        'Build adjacency list from edge list for easier traversal',
        'BFS finds shortest path in unweighted graphs',
        'Topological sort: DFS with post-order or Kahn\'s algorithm',
        'Union-Find with path compression for connected components',
        'For grids, DFS often simpler; BFS for shortest distance'
      ],

      interviewTips: [
        'Ask: Directed or undirected? Weighted or unweighted? Can have cycles?',
        'State representation: "I\'ll use adjacency list because..."',
        'Explain why DFS vs BFS for the problem',
        'Mention time complexity O(V+E) and why',
        'For grids, clarify 4-directional vs 8-directional movement'
      ],

      codeExamples: [
        {
          title: 'Number of Islands - Grid DFS',
          language: 'python',
          description: 'Count connected components in a grid using DFS.',
          code: `def num_islands(grid):
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
            return
        grid[r][c] = '0'  # Mark visited
        dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)

    return count`
        },
        {
          title: 'Course Schedule - Cycle Detection',
          language: 'python',
          description: 'Detect cycle in directed graph using DFS.',
          code: `def can_finish(num_courses, prerequisites):
    # Build adjacency list
    graph = {i: [] for i in range(num_courses)}
    for course, prereq in prerequisites:
        graph[prereq].append(course)

    # 0: unvisited, 1: visiting, 2: visited
    state = [0] * num_courses

    def has_cycle(course):
        if state[course] == 1:  # Currently visiting -> cycle
            return True
        if state[course] == 2:  # Already completed
            return False

        state[course] = 1  # Mark visiting
        for next_course in graph[course]:
            if has_cycle(next_course):
                return True
        state[course] = 2  # Mark completed
        return False

    return not any(has_cycle(i) for i in range(num_courses))`
        },
        {
          title: 'Topological Sort - Kahn\'s Algorithm',
          language: 'python',
          description: 'Order courses by prerequisites using BFS.',
          code: `from collections import deque

def find_order(num_courses, prerequisites):
    graph = {i: [] for i in range(num_courses)}
    in_degree = [0] * num_courses

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    # Start with courses having no prerequisites
    queue = deque([i for i in range(num_courses) if in_degree[i] == 0])
    order = []

    while queue:
        course = queue.popleft()
        order.append(course)
        for next_course in graph[course]:
            in_degree[next_course] -= 1
            if in_degree[next_course] == 0:
                queue.append(next_course)

    return order if len(order) == num_courses else []`
        },
        {
          title: 'Network Delay Time - Dijkstra',
          language: 'python',
          description: 'Shortest path in weighted graph using min-heap.',
          code: `import heapq

def network_delay_time(times, n, k):
    # Build adjacency list
    graph = {i: [] for i in range(1, n + 1)}
    for u, v, w in times:
        graph[u].append((v, w))

    # Dijkstra with min-heap
    dist = {i: float('inf') for i in range(1, n + 1)}
    dist[k] = 0
    heap = [(0, k)]  # (distance, node)

    while heap:
        d, node = heapq.heappop(heap)
        if d > dist[node]:
            continue
        for neighbor, weight in graph[node]:
            new_dist = d + weight
            if new_dist < dist[neighbor]:
                dist[neighbor] = new_dist
                heapq.heappush(heap, (new_dist, neighbor))

    max_dist = max(dist.values())
    return max_dist if max_dist < float('inf') else -1`
        }
      ,
        {
          title: 'Number of Islands - Grid DFS',
          language: 'javascript',
          description: 'Count connected components in a grid using DFS.',
          code: `function numIslands(grid) {
    if (!grid.length) return 0;
    const rows = grid.length, cols = grid[0].length;
    let count = 0;

    function dfs(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] === '0') return;
        grid[r][c] = '0'; // Mark visited
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1);
    }

    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
            if (grid[r][c] === '1') { count++; dfs(r, c); }
    return count;
}`
        },
        {
          title: 'Number of Islands - Grid DFS',
          language: 'java',
          description: 'Count connected components in a grid using DFS.',
          code: `public int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; dfs(grid, r, c); }
    return count;
}

private void dfs(char[][] grid, int r, int c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length
        || grid[r][c] == '0') return;
    grid[r][c] = '0';
    dfs(grid, r + 1, c); dfs(grid, r - 1, c);
    dfs(grid, r, c + 1); dfs(grid, r, c - 1);
}`
        },
        {
          title: 'Course Schedule - Cycle Detection',
          language: 'javascript',
          description: 'Detect cycle in directed graph using DFS.',
          code: `function canFinish(numCourses, prerequisites) {
    const graph = Array.from({ length: numCourses }, () => []);
    for (const [course, prereq] of prerequisites) graph[prereq].push(course);

    const state = new Array(numCourses).fill(0); // 0:unvisited 1:visiting 2:visited

    function hasCycle(course) {
        if (state[course] === 1) return true;  // Cycle
        if (state[course] === 2) return false;
        state[course] = 1;
        for (const next of graph[course]) if (hasCycle(next)) return true;
        state[course] = 2;
        return false;
    }
    return !Array.from({ length: numCourses }, (_, i) => i).some(hasCycle);
}`
        },
        {
          title: 'Course Schedule - Cycle Detection',
          language: 'java',
          description: 'Detect cycle in directed graph using DFS.',
          code: `public boolean canFinish(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    for (int[] p : prerequisites) graph.get(p[1]).add(p[0]);

    int[] state = new int[numCourses]; // 0:unvisited 1:visiting 2:visited

    for (int i = 0; i < numCourses; i++)
        if (hasCycle(graph, state, i)) return false;
    return true;
}

private boolean hasCycle(List<List<Integer>> graph, int[] state, int course) {
    if (state[course] == 1) return true;
    if (state[course] == 2) return false;
    state[course] = 1;
    for (int next : graph.get(course)) if (hasCycle(graph, state, next)) return true;
    state[course] = 2;
    return false;
}`
        },
        {
          title: 'Topological Sort - Kahn\'s Algorithm',
          language: 'javascript',
          description: 'Order courses by prerequisites using BFS.',
          code: `function findOrder(numCourses, prerequisites) {
    const graph = Array.from({ length: numCourses }, () => []);
    const inDegree = new Array(numCourses).fill(0);

    for (const [course, prereq] of prerequisites) {
        graph[prereq].push(course);
        inDegree[course]++;
    }

    const queue = [];
    for (let i = 0; i < numCourses; i++) if (inDegree[i] === 0) queue.push(i);
    const order = [];

    while (queue.length) {
        const course = queue.shift();
        order.push(course);
        for (const next of graph[course]) {
            if (--inDegree[next] === 0) queue.push(next);
        }
    }
    return order.length === numCourses ? order : [];
}`
        },
        {
          title: 'Topological Sort - Kahn\'s Algorithm',
          language: 'java',
          description: 'Order courses by prerequisites using BFS.',
          code: `public int[] findOrder(int numCourses, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    int[] inDegree = new int[numCourses];
    for (int i = 0; i < numCourses; i++) graph.add(new ArrayList<>());
    for (int[] p : prerequisites) { graph.get(p[1]).add(p[0]); inDegree[p[0]]++; }

    Queue<Integer> queue = new LinkedList<>();
    for (int i = 0; i < numCourses; i++) if (inDegree[i] == 0) queue.offer(i);

    int[] order = new int[numCourses];
    int idx = 0;
    while (!queue.isEmpty()) {
        int course = queue.poll();
        order[idx++] = course;
        for (int next : graph.get(course))
            if (--inDegree[next] == 0) queue.offer(next);
    }
    return idx == numCourses ? order : new int[0];
}`
        },
        {
          title: 'Network Delay Time - Dijkstra',
          language: 'javascript',
          description: 'Shortest path in weighted graph using min-heap.',
          code: `function networkDelayTime(times, n, k) {
    const graph = Array.from({ length: n + 1 }, () => []);
    for (const [u, v, w] of times) graph[u].push([v, w]);

    const dist = new Array(n + 1).fill(Infinity);
    dist[k] = 0;
    const pq = [[0, k]]; // [distance, node]

    while (pq.length) {
        pq.sort((a, b) => a[0] - b[0]);
        const [d, node] = pq.shift();
        if (d > dist[node]) continue;
        for (const [neighbor, weight] of graph[node]) {
            const newDist = d + weight;
            if (newDist < dist[neighbor]) {
                dist[neighbor] = newDist;
                pq.push([newDist, neighbor]);
            }
        }
    }
    const maxDist = Math.max(...dist.slice(1));
    return maxDist === Infinity ? -1 : maxDist;
}`
        },
        {
          title: 'Network Delay Time - Dijkstra',
          language: 'java',
          description: 'Shortest path in weighted graph using min-heap.',
          code: `public int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> graph = new ArrayList<>();
    for (int i = 0; i <= n; i++) graph.add(new ArrayList<>());
    for (int[] t : times) graph.get(t[0]).add(new int[]{t[1], t[2]});

    int[] dist = new int[n + 1];
    Arrays.fill(dist, Integer.MAX_VALUE);
    dist[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> a[0] - b[0]);
    pq.offer(new int[]{0, k});

    while (!pq.isEmpty()) {
        int[] curr = pq.poll();
        if (curr[0] > dist[curr[1]]) continue;
        for (int[] edge : graph.get(curr[1])) {
            int newDist = curr[0] + edge[1];
            if (newDist < dist[edge[0]]) {
                dist[edge[0]] = newDist;
                pq.offer(new int[]{newDist, edge[0]});
            }
        }
    }
    int max = Arrays.stream(dist, 1, n + 1).max().getAsInt();
    return max == Integer.MAX_VALUE ? -1 : max;
}`
        }
      ]
    },
    {
      id: 'dynamic-programming',
      title: 'Dynamic Programming',
      icon: 'chartLine',
      color: '#3b82f6',
      questions: 42,
      description: 'Optimal substructure and overlapping subproblems. Break into smaller problems.',

visualizations: [
        {
          title: 'DP Memoization Grid (Fibonacci)',
          language: 'python',
          description: 'Shows a 2D memoization table with computed cells highlighted green, demonstrating how DP avoids redundant computation.',
          svg: '<svg viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg" style="background:white"><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Dynamic Programming — Fibonacci Memoization</text><text x="20" y="50" font-family="sans-serif" font-size="11" fill="#64748b">dp[i] = dp[i-1] + dp[i-2]</text><g><text x="40" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=0</text><text x="95" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=1</text><text x="150" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=2</text><text x="205" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=3</text><text x="260" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=4</text><text x="315" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=5</text><text x="370" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=6</text><text x="425" y="78" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">i=7</text></g><g><rect x="18" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="40" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">0</text><rect x="73" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="95" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">1</text><rect x="128" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="150" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">1</text><rect x="183" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="205" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">2</text><rect x="238" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="260" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">3</text><rect x="293" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="315" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">5</text><rect x="348" y="85" width="44" height="36" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="370" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">8</text><rect x="403" y="85" width="44" height="36" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2.5"/><text x="425" y="108" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">13</text></g><line x1="73" y1="130" x2="128" y2="130" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/><text x="100" y="145" font-family="sans-serif" font-size="9" fill="#64748b" text-anchor="middle">0+1=1</text><line x1="293" y1="130" x2="403" y2="130" stroke="#10b981" stroke-width="1.5" stroke-dasharray="3,2"/><text x="350" y="145" font-family="sans-serif" font-size="9" fill="#10b981" text-anchor="middle">5+8=13</text><text x="20" y="175" font-family="sans-serif" font-size="12" fill="#1e293b">Without memo: O(2^n) — each call branches into two</text><text x="20" y="195" font-family="sans-serif" font-size="12" fill="#10b981" font-weight="bold">With memo: O(n) — each value computed exactly once</text><rect x="20" y="205" width="440" height="20" rx="4" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1"/><text x="30" y="220" font-family="monospace" font-size="10" fill="#64748b">Key insight: overlapping subproblems + optimal substructure = use DP</text></svg>'
        }
      ],

      introduction: `Dynamic Programming (DP) is one of the most important and challenging topics in coding interviews. It's used when a problem has overlapping subproblems and optimal substructure.

**Two Approaches:**
1. **Top-Down (Memoization)**: Start with the main problem, recursively solve subproblems, cache results
2. **Bottom-Up (Tabulation)**: Start with base cases, build up to the solution iteratively

**Common DP Patterns:**
- **1D DP**: State depends on previous element(s) - dp[i]
- **2D DP**: State depends on two dimensions - dp[i][j]
- **Knapsack**: Include/exclude items with capacity constraint
- **LCS/LIS**: Subsequence problems
- **State Machine**: Multiple states to track (e.g., buy/sell stock)

**Key Insight:** If you can express a problem as "the optimal solution to problem of size n uses optimal solutions to smaller problems," it's likely DP.`,

      whenToUse: [
        'Optimization problems (min/max of something)',
        'Counting problems (number of ways to do something)',
        'Problems with overlapping subproblems',
        '"Can we achieve X?" type problems',
        'Problems involving sequences or grids',
        'When brute force would repeat the same calculations'
      ],

      keyPatterns: ['1D DP', '2D DP', 'Knapsack variants', 'LCS/LIS', 'State machine', 'Interval DP', 'Bitmask DP'],
      timeComplexity: 'Varies: O(n), O(n²), O(n*W)',
      spaceComplexity: 'Can often optimize from O(n) to O(1)',

      approach: [
        'Identify if problem has optimal substructure and overlapping subproblems',
        'Define state: What does dp[i] (or dp[i][j]) represent?',
        'Write recurrence relation: How does dp[i] depend on previous states?',
        'Identify base cases: What are dp[0], dp[1], etc.?',
        'Determine iteration order: Which states need to be computed first?',
        'Consider space optimization: Do we need the full DP table?'
      ],

      commonProblems: [
        // Easy - 1D DP
        { name: 'Climbing Stairs', difficulty: 'Easy' },
        { name: 'Min Cost Climbing Stairs', difficulty: 'Easy' },
        { name: 'Fibonacci Number', difficulty: 'Easy' },
        { name: 'Tribonacci Number', difficulty: 'Easy' },
        { name: 'Divisor Game', difficulty: 'Easy' },
        { name: 'Is Subsequence', difficulty: 'Easy' },
        { name: 'Pascal\'s Triangle', difficulty: 'Easy' },
        { name: 'Pascal\'s Triangle II', difficulty: 'Easy' },
        { name: 'Counting Bits', difficulty: 'Easy' },
        // Medium - House Robber Pattern
        { name: 'House Robber', difficulty: 'Medium' },
        { name: 'House Robber II', difficulty: 'Medium' },
        { name: 'House Robber III', difficulty: 'Medium' },
        { name: 'Delete and Earn', difficulty: 'Medium' },
        // Medium - Knapsack Pattern
        { name: 'Coin Change', difficulty: 'Medium' },
        { name: 'Coin Change 2', difficulty: 'Medium' },
        { name: 'Target Sum', difficulty: 'Medium' },
        { name: 'Partition Equal Subset Sum', difficulty: 'Medium' },
        { name: 'Last Stone Weight II', difficulty: 'Medium' },
        { name: 'Ones and Zeroes', difficulty: 'Medium' },
        { name: 'Profitable Schemes', difficulty: 'Hard' },
        // Medium - Grid DP
        { name: 'Unique Paths', difficulty: 'Medium' },
        { name: 'Unique Paths II', difficulty: 'Medium' },
        { name: 'Minimum Path Sum', difficulty: 'Medium' },
        { name: 'Triangle', difficulty: 'Medium' },
        { name: 'Dungeon Game', difficulty: 'Hard' },
        { name: 'Maximal Square', difficulty: 'Medium' },
        { name: 'Maximal Rectangle', difficulty: 'Hard' },
        { name: 'Cherry Pickup', difficulty: 'Hard' },
        { name: 'Cherry Pickup II', difficulty: 'Hard' },
        // Medium - LIS Pattern
        { name: 'Longest Increasing Subsequence', difficulty: 'Medium' },
        { name: 'Number of Longest Increasing Subsequence', difficulty: 'Medium' },
        { name: 'Russian Doll Envelopes', difficulty: 'Hard' },
        { name: 'Maximum Length of Pair Chain', difficulty: 'Medium' },
        { name: 'Longest String Chain', difficulty: 'Medium' },
        { name: 'Increasing Triplet Subsequence', difficulty: 'Medium' },
        // Medium - String DP
        { name: 'Decode Ways', difficulty: 'Medium' },
        { name: 'Word Break', difficulty: 'Medium' },
        { name: 'Word Break II', difficulty: 'Hard' },
        { name: 'Longest Common Subsequence', difficulty: 'Medium' },
        { name: 'Edit Distance', difficulty: 'Medium' },
        { name: 'Delete Operation for Two Strings', difficulty: 'Medium' },
        { name: 'Minimum ASCII Delete Sum for Two Strings', difficulty: 'Medium' },
        { name: 'Shortest Common Supersequence', difficulty: 'Hard' },
        { name: 'Interleaving String', difficulty: 'Medium' },
        { name: 'Distinct Subsequences', difficulty: 'Hard' },
        // Medium - Palindrome DP
        { name: 'Palindromic Substrings', difficulty: 'Medium' },
        { name: 'Longest Palindromic Substring', difficulty: 'Medium' },
        { name: 'Longest Palindromic Subsequence', difficulty: 'Medium' },
        { name: 'Palindrome Partitioning II', difficulty: 'Hard' },
        { name: 'Minimum Insertions to Make String Palindrome', difficulty: 'Hard' },
        // Medium - Stock Trading
        { name: 'Best Time to Buy and Sell Stock', difficulty: 'Easy' },
        { name: 'Best Time to Buy and Sell Stock II', difficulty: 'Medium' },
        { name: 'Best Time to Buy and Sell Stock III', difficulty: 'Hard' },
        { name: 'Best Time to Buy and Sell Stock IV', difficulty: 'Hard' },
        { name: 'Best Time to Buy and Sell Stock with Cooldown', difficulty: 'Medium' },
        { name: 'Best Time to Buy and Sell Stock with Transaction Fee', difficulty: 'Medium' },
        // Medium - Other
        { name: 'Perfect Squares', difficulty: 'Medium' },
        { name: 'Ugly Number II', difficulty: 'Medium' },
        { name: 'Jump Game', difficulty: 'Medium' },
        { name: 'Jump Game II', difficulty: 'Medium' },
        { name: 'Maximum Subarray', difficulty: 'Medium' },
        { name: 'Maximum Product Subarray', difficulty: 'Medium' },
        { name: 'Integer Break', difficulty: 'Medium' },
        { name: 'Longest Turbulent Subarray', difficulty: 'Medium' },
        { name: 'Stone Game', difficulty: 'Medium' },
        { name: 'Stone Game II', difficulty: 'Medium' },
        { name: 'Predict the Winner', difficulty: 'Medium' },
        { name: 'Partition Array for Maximum Sum', difficulty: 'Medium' },
        { name: 'Count Square Submatrices with All Ones', difficulty: 'Medium' },
        { name: 'Minimum Falling Path Sum', difficulty: 'Medium' },
        { name: 'Minimum Cost For Tickets', difficulty: 'Medium' },
        { name: 'Longest Arithmetic Subsequence', difficulty: 'Medium' },
        { name: 'Longest Arithmetic Subsequence of Given Difference', difficulty: 'Medium' },
        { name: 'Maximum Sum Circular Subarray', difficulty: 'Medium' },
        // Medium
        { name: 'Combination Sum IV', difficulty: 'Medium' },
        { name: '4 Keys Keyboard', difficulty: 'Medium' },
        { name: 'Paint House', difficulty: 'Medium' },
        { name: 'Paint House II', difficulty: 'Hard' },
        { name: 'Paint Fence', difficulty: 'Medium' },
        { name: 'Arithmetic Slices', difficulty: 'Medium' },
        { name: 'Ones and Zeroes', difficulty: 'Medium' },
        { name: 'Out of Boundary Paths', difficulty: 'Medium' },
        { name: 'Knight Dialer', difficulty: 'Medium' },
        { name: 'Domino and Tromino Tiling', difficulty: 'Medium' },
        { name: 'Filling Bookcase Shelves', difficulty: 'Medium' },
        { name: 'Largest Sum of Averages', difficulty: 'Medium' },
        { name: 'Tallest Billboard', difficulty: 'Hard' },
        // Hard
        { name: 'Regular Expression Matching', difficulty: 'Hard' },
        { name: 'Wildcard Matching', difficulty: 'Hard' },
        { name: 'Burst Balloons', difficulty: 'Hard' },
        { name: 'Super Egg Drop', difficulty: 'Hard' },
        { name: 'Longest Valid Parentheses', difficulty: 'Hard' },
        { name: 'Frog Jump', difficulty: 'Hard' },
        { name: 'Scramble String', difficulty: 'Hard' },
        { name: 'Maximum Profit in Job Scheduling', difficulty: 'Hard' },
        { name: 'Strange Printer', difficulty: 'Hard' },
        { name: 'Number of Ways to Rearrange Sticks', difficulty: 'Hard' },
        { name: 'Minimum Difficulty of a Job Schedule', difficulty: 'Hard' },
        { name: 'Concatenated Words', difficulty: 'Hard' },
        { name: 'Find Minimum Time to Finish All Jobs', difficulty: 'Hard' },
        { name: 'Count All Valid Pickup and Delivery Options', difficulty: 'Hard' },
        { name: 'Count Different Palindromic Subsequences', difficulty: 'Hard' },
        { name: 'Arithmetic Slices II - Subsequence', difficulty: 'Hard' },
        { name: 'Freedom Trail', difficulty: 'Hard' },
        { name: 'Stone Game III', difficulty: 'Hard' },
        { name: 'Stone Game IV', difficulty: 'Hard' },
        { name: 'Number of Music Playlists', difficulty: 'Hard' },
        { name: 'Profitable Schemes', difficulty: 'Hard' },
        { name: 'K Inverse Pairs Array', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is dynamic programming, and when is it typically used?', difficulty: 'Easy', answer: 'DP solves complex problems by breaking them into overlapping subproblems, storing solutions to avoid recomputation. Used when problem has optimal substructure (optimal solution uses optimal sub-solutions) and overlapping subproblems. Common patterns: fibonacci, knapsack, LCS, shortest paths. Converts exponential to polynomial time.' },
        { question: 'Explain the concept of memoization in dynamic programming.', difficulty: 'Easy', answer: 'Memoization caches recursive function results to avoid redundant computation. Use hash map or array keyed by state parameters. Top-down approach: solve recursively, check cache before computing, store result after. Transforms O(2^n) fibonacci to O(n). Lazy evaluation—only computes needed subproblems.' },
        { question: 'What is the difference between top-down and bottom-up dynamic programming methods?', difficulty: 'Easy', answer: 'Top-down (memoization): recursive with caching, starts from original problem, computes only needed states, easier to write. Bottom-up (tabulation): iterative, builds from base cases, fills table in order, no recursion overhead, often more space-efficient. Both achieve same time complexity; choice depends on problem structure.' },
        { question: 'Discuss the time and space trade-offs between top-down and bottom-up approaches.', difficulty: 'Easy', answer: 'Time: similar O(states × transition). Top-down has recursion overhead but computes only reachable states. Space: top-down uses O(states) + stack; bottom-up uses O(states) but often reducible (e.g., fibonacci uses O(1) keeping only previous values). Bottom-up preferred when all states needed; top-down when sparse.' },
        // Mid
        { question: 'Discuss the time and space complexity of dynamic programming solutions.', difficulty: 'Medium', answer: 'Time = O(number of states × time per state). States: often O(n), O(n²), or O(n×m). Transitions: usually O(1) to O(n). Space = O(states) for table, reducible if only recent states needed (rolling array). Example: LCS is O(nm) time, O(nm) space reducible to O(min(n,m)).' },
        { question: 'When should you choose dynamic programming over other algorithmic techniques?', difficulty: 'Medium', answer: 'Use DP when: overlapping subproblems exist (vs divide-and-conquer), optimal substructure present, want global optimum (vs greedy\'s local). Signs: counting paths/ways, optimization with constraints, sequence problems. Avoid for: no overlaps (use recursion), greedy works (simpler), need all solutions (use backtracking).' },
        { question: 'How do you optimize a dynamic programming solution further, beyond the basic approach?', difficulty: 'Medium', answer: 'Space optimization: rolling array (keep only needed previous rows). Time: better recurrence (matrix exponentiation for linear recurrence), monotonic queue/stack for range queries, convex hull trick for linear cost functions. State compression: bitmask DP for subsets. Knuth/divide-and-conquer optimization for specific structures.' },
        { question: 'What are the main categories of DP problems, and how do you identify them?', difficulty: 'Medium', answer: '1D DP: state depends on one variable, e.g., Climbing Stairs dp[i] = dp[i-1] + dp[i-2]. 2D DP: state depends on two variables, e.g., LCS dp[i][j]. Knapsack: include/exclude items with capacity constraint. LIS/LCS: subsequence problems with comparison logic. State machine: multiple states per position (stock trading with hold/sell/cooldown). Interval DP: dp[i][j] represents optimal for range [i,j], e.g., Burst Balloons. Bitmask DP: state encoded as bitmask for subset problems. Identifying the category helps select the right template and state definition.' },
        { question: 'Explain the 0/1 Knapsack pattern and how it differs from unbounded knapsack.', difficulty: 'Medium', answer: '0/1 Knapsack: each item can be used at most once. dp[i][w] = max of including item i (dp[i-1][w-weight[i]] + value[i]) or excluding it (dp[i-1][w]). Iterate items in outer loop, capacity in inner loop. Unbounded Knapsack: each item can be used unlimited times. dp[w] = max over all items of dp[w-weight[i]] + value[i]. Key difference: 0/1 needs previous row (or reverse capacity iteration for space optimization); unbounded uses current row (forward iteration). Coin Change is unbounded; Partition Equal Subset Sum is 0/1.' },
        { question: 'How does the state machine pattern work in stock trading DP problems?', difficulty: 'Medium', answer: 'Model each day as having multiple states: hold (own stock), sold (just sold), cooldown, etc. Define dp transitions between states. For Buy/Sell with Cooldown: hold[i] = max(hold[i-1], rest[i-1] - price[i]); sold[i] = hold[i-1] + price[i]; rest[i] = max(rest[i-1], sold[i-1]). For k transactions: dp[k][i] tracks max profit with k transactions up to day i. State machine DP naturally handles complex constraints by making each constraint a separate state dimension. Space often optimizable since each state only depends on the previous day.' },
        // Senior
        { question: 'Provide an example of a real-world problem that can be solved using dynamic programming.', difficulty: 'Hard', answer: 'Route optimization (shortest paths via Bellman-Ford), resource allocation (knapsack for budgeting), text processing (spell check via edit distance, diff algorithms), bioinformatics (DNA sequence alignment via LCS/Needleman-Wunsch), financial modeling (option pricing), speech recognition (Viterbi for HMMs), compiler optimization (optimal BST for parse tables).' },
        { question: 'What is bitmask DP, and when is it applicable?', difficulty: 'Hard', answer: 'Bitmask DP uses a bitmask integer to represent a subset of elements as the DP state. Each bit indicates whether an element is included. dp[mask] represents the optimal solution for the subset encoded by mask. Transitions try adding each element not in the mask. Time: O(2^n * n), suitable for n <= 20. Classic problems: Traveling Salesman (dp[mask][last_city] = min cost visiting cities in mask ending at last_city), Partition into K Equal Subsets, Shortest Superstring. The bitmask efficiently encodes exponential state spaces and enables memoization of subset-based problems.' },
        { question: 'What is interval DP, and how does it differ from standard 2D DP?', difficulty: 'Hard', answer: 'Interval DP computes optimal solutions for contiguous ranges dp[i][j]. The key difference: iteration order goes by interval length (small intervals first), not left-to-right. For each interval [i,j], try all split points k: dp[i][j] = optimal over dp[i][k] + dp[k+1][j] + cost(i,j,k). Classic problems: Matrix Chain Multiplication (minimize multiplications), Burst Balloons (maximize coins), Palindrome Partitioning II (minimize cuts). Time typically O(n^3). The "try all splits" approach is distinctive — it considers all ways to divide the interval and takes the best.' }
      ],

      commonMistakes: [
        'Not clearly defining what dp[i] represents',
        'Wrong base cases or off-by-one errors',
        'Wrong iteration order (filling dp in wrong direction)',
        'Not handling edge cases (empty input, zero, negative)',
        'Forgetting to return the actual answer (often dp[n] or dp[n-1])'
      ],

      tips: [
        'Start with recursion + memoization, then convert to tabulation',
        'Define state clearly: what does dp[i] represent?',
        'Identify base cases and recurrence relation',
        'Look for space optimization by tracking only needed previous states',
        'Draw out the DP table for small examples to verify logic'
      ],

      interviewTips: [
        'Start by identifying subproblems: "The solution to n uses solutions to smaller problems"',
        'Explain your state definition: "dp[i] represents..."',
        'Walk through the recurrence: "dp[i] = dp[i-1] + dp[i-2] because..."',
        'Verify with a small example before coding',
        'Mention potential space optimization even if you don\'t implement it'
      ],

      codeExamples: [
        {
          title: 'Climbing Stairs - Classic 1D DP',
          language: 'python',
          description: 'Number of ways to climb n stairs (1 or 2 steps at a time).',
          code: `def climb_stairs(n):
    if n <= 2:
        return n
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2

    for i in range(3, n + 1):
        dp[i] = dp[i-1] + dp[i-2]

    return dp[n]

# Space optimized: O(1)
def climb_stairs_optimized(n):
    if n <= 2:
        return n
    prev2, prev1 = 1, 2
    for _ in range(3, n + 1):
        prev2, prev1 = prev1, prev2 + prev1
    return prev1`
        },
        {
          title: 'Coin Change - Unbounded Knapsack',
          language: 'python',
          description: 'Minimum coins needed to make amount.',
          code: `def coin_change(coins, amount):
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0  # 0 coins needed for amount 0

    for i in range(1, amount + 1):
        for coin in coins:
            if coin <= i and dp[i - coin] != float('inf'):
                dp[i] = min(dp[i], dp[i - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1`
        },
        {
          title: 'Longest Increasing Subsequence',
          language: 'python',
          description: 'Find length of longest strictly increasing subsequence.',
          code: `def length_of_lis(nums):
    if not nums:
        return 0

    n = len(nums)
    dp = [1] * n  # dp[i] = LIS ending at index i

    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)

    return max(dp)

# O(n log n) solution uses binary search with patience sorting`
        },
        {
          title: 'Longest Common Subsequence - 2D DP',
          language: 'python',
          description: 'Find LCS of two strings.',
          code: `def longest_common_subsequence(text1, text2):
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])

    return dp[m][n]`
        }
      ,
        {
          title: 'Climbing Stairs - Classic 1D DP',
          language: 'javascript',
          description: 'Number of ways to climb n stairs (1 or 2 steps at a time).',
          code: `function climbStairs(n) {
    if (n <= 2) return n;
    const dp = new Array(n + 1).fill(0);
    dp[1] = 1; dp[2] = 2;

    for (let i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}

// Space optimized: O(1)
function climbStairsOptimized(n) {
    if (n <= 2) return n;
    let prev2 = 1, prev1 = 2;
    for (let i = 3; i <= n; i++) [prev2, prev1] = [prev1, prev2 + prev1];
    return prev1;
}`
        },
        {
          title: 'Climbing Stairs - Classic 1D DP',
          language: 'java',
          description: 'Number of ways to climb n stairs (1 or 2 steps at a time).',
          code: `public int climbStairs(int n) {
    if (n <= 2) return n;
    int[] dp = new int[n + 1];
    dp[1] = 1; dp[2] = 2;

    for (int i = 3; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}

// Space optimized: O(1)
public int climbStairsOptimized(int n) {
    if (n <= 2) return n;
    int prev2 = 1, prev1 = 2;
    for (int i = 3; i <= n; i++) {
        int temp = prev1;
        prev1 = prev2 + prev1;
        prev2 = temp;
    }
    return prev1;
}`
        },
        {
          title: 'Coin Change - Unbounded Knapsack',
          language: 'javascript',
          description: 'Minimum coins needed to make amount.',
          code: `function coinChange(coins, amount) {
    const dp = new Array(amount + 1).fill(Infinity);
    dp[0] = 0;

    for (let i = 1; i <= amount; i++) {
        for (const coin of coins) {
            if (coin <= i && dp[i - coin] !== Infinity) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] === Infinity ? -1 : dp[amount];
}`
        },
        {
          title: 'Coin Change - Unbounded Knapsack',
          language: 'java',
          description: 'Minimum coins needed to make amount.',
          code: `public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, Integer.MAX_VALUE);
    dp[0] = 0;

    for (int i = 1; i <= amount; i++) {
        for (int coin : coins) {
            if (coin <= i && dp[i - coin] != Integer.MAX_VALUE) {
                dp[i] = Math.min(dp[i], dp[i - coin] + 1);
            }
        }
    }
    return dp[amount] == Integer.MAX_VALUE ? -1 : dp[amount];
}`
        },
        {
          title: 'Longest Increasing Subsequence',
          language: 'javascript',
          description: 'Find length of longest strictly increasing subsequence.',
          code: `function lengthOfLIS(nums) {
    if (!nums.length) return 0;
    const dp = new Array(nums.length).fill(1);

    for (let i = 1; i < nums.length; i++) {
        for (let j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
    }
    return Math.max(...dp);
}
// O(n log n) solution uses binary search with patience sorting`
        },
        {
          title: 'Longest Increasing Subsequence',
          language: 'java',
          description: 'Find length of longest strictly increasing subsequence.',
          code: `public int lengthOfLIS(int[] nums) {
    if (nums.length == 0) return 0;
    int[] dp = new int[nums.length];
    Arrays.fill(dp, 1);

    for (int i = 1; i < nums.length; i++) {
        for (int j = 0; j < i; j++) {
            if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
        }
    }
    return Arrays.stream(dp).max().getAsInt();
}
// O(n log n) solution uses binary search with patience sorting`
        },
        {
          title: 'Longest Common Subsequence - 2D DP',
          language: 'javascript',
          description: 'Find LCS of two strings.',
          code: `function longestCommonSubsequence(text1, text2) {
    const m = text1.length, n = text2.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (text1[i - 1] === text2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}`
        },
        {
          title: 'Longest Common Subsequence - 2D DP',
          language: 'java',
          description: 'Find LCS of two strings.',
          code: `public int longestCommonSubsequence(String text1, String text2) {
    int m = text1.length(), n = text2.length();
    int[][] dp = new int[m + 1][n + 1];

    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (text1.charAt(i - 1) == text2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return dp[m][n];
}`
        }
      ]
    },
    {
      id: 'heaps',
      title: 'Heaps / Priority Queue',
      icon: 'layers',
      color: '#f97316',
      questions: 33,
      description: 'Efficient min/max access. Essential for top-k problems and scheduling.',

visualizations: [
        {
          title: 'Min-Heap Binary Tree',
          language: 'python',
          description: 'Binary min-heap showing the heap property: every parent is smaller than its children.',
          svg: '<svg viewBox="0 0 500 240" xmlns="http://www.w3.org/2000/svg" style="background:white"><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Min-Heap — Parent &lt;= Children</text><line x1="250" y1="62" x2="150" y2="102" stroke="#cbd5e1" stroke-width="1.5"/><line x1="250" y1="62" x2="350" y2="102" stroke="#cbd5e1" stroke-width="1.5"/><line x1="150" y1="122" x2="90" y2="162" stroke="#cbd5e1" stroke-width="1.5"/><line x1="150" y1="122" x2="210" y2="162" stroke="#cbd5e1" stroke-width="1.5"/><line x1="350" y1="122" x2="290" y2="162" stroke="#cbd5e1" stroke-width="1.5"/><line x1="350" y1="122" x2="410" y2="162" stroke="#cbd5e1" stroke-width="1.5"/><line x1="90" y1="182" x2="60" y2="212" stroke="#cbd5e1" stroke-width="1.5"/><line x1="90" y1="182" x2="120" y2="212" stroke="#cbd5e1" stroke-width="1.5"/><circle cx="250" cy="52" r="20" fill="#dcfce7" stroke="#10b981" stroke-width="2.5"/><text x="250" y="57" font-family="monospace" font-size="14" fill="#10b981" font-weight="bold" text-anchor="middle">1</text><text x="250" y="30" font-family="sans-serif" font-size="10" fill="#10b981" text-anchor="middle">min</text><circle cx="150" cy="112" r="20" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5"/><text x="150" y="117" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">3</text><circle cx="350" cy="112" r="20" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5"/><text x="350" y="117" font-family="monospace" font-size="14" fill="#1e293b" text-anchor="middle">5</text><circle cx="90" cy="172" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="90" y="177" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">7</text><circle cx="210" cy="172" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="210" y="177" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">8</text><circle cx="290" cy="172" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="290" y="177" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">9</text><circle cx="410" cy="172" r="18" fill="#fff" stroke="#e2e8f0" stroke-width="1.5"/><text x="410" y="177" font-family="monospace" font-size="13" fill="#1e293b" text-anchor="middle">10</text><circle cx="60" cy="222" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="60" y="227" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">12</text><circle cx="120" cy="222" r="16" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/><text x="120" y="227" font-family="monospace" font-size="12" fill="#64748b" text-anchor="middle">15</text><text x="190" y="35" font-family="sans-serif" font-size="10" fill="#64748b">1 &lt;= 3</text><text x="280" y="35" font-family="sans-serif" font-size="10" fill="#64748b">1 &lt;= 5</text></svg>'
        }
      ],

      introduction: `A heap is a complete binary tree that satisfies the heap property: every parent is smaller (min-heap) or larger (max-heap) than its children. It provides O(log n) insert/delete and O(1) access to min/max.

**Key Operations:**
- **Push**: O(log n) - Add element and bubble up
- **Pop**: O(log n) - Remove root and heapify down
- **Peek**: O(1) - Access min/max without removing
- **Heapify**: O(n) - Convert array to heap

**Common Patterns:**
- **Top-K Largest**: Use min-heap of size K (counterintuitive!)
- **Top-K Smallest**: Use max-heap of size K
- **Merge K Sorted**: Use min-heap to track smallest from each list
- **Two Heaps**: Track median with max-heap (smaller half) + min-heap (larger half)`,

      whenToUse: [
        'Finding K largest/smallest elements',
        'Merging K sorted lists or streams',
        'Running median or percentile calculations',
        'Task scheduling with priorities',
        'Dijkstra\'s shortest path algorithm',
        'Huffman coding'
      ],

      keyPatterns: ['Top-K elements', 'Merge K sorted', 'Two heaps (median)', 'Scheduling', 'K closest', 'Stream processing'],
      timeComplexity: 'O(log n) push/pop, O(1) peek',
      spaceComplexity: 'O(k) for top-k problems',

      approach: [
        'Identify if you need repeated access to min or max',
        'For top-K largest, use min-heap of size K (smallest of K largest is at top)',
        'For top-K smallest, use max-heap of size K',
        'For median, use two heaps: max-heap for lower half, min-heap for upper half',
        'In Python, negate values to simulate max-heap using heapq',
        'Consider heapify O(n) vs n insertions O(n log n)'
      ],

      commonProblems: [
        // Easy
        { name: 'Last Stone Weight', difficulty: 'Easy' },
        { name: 'Kth Largest Element in a Stream', difficulty: 'Easy' },
        { name: 'Relative Ranks', difficulty: 'Easy' },
        // Medium
        { name: 'Kth Largest Element in an Array', difficulty: 'Medium' },
        { name: 'Top K Frequent Elements', difficulty: 'Medium' },
        { name: 'Top K Frequent Words', difficulty: 'Medium' },
        { name: 'K Closest Points to Origin', difficulty: 'Medium' },
        { name: 'Task Scheduler', difficulty: 'Medium' },
        { name: 'Reorganize String', difficulty: 'Medium' },
        { name: 'Meeting Rooms II', difficulty: 'Medium' },
        { name: 'Meeting Rooms III', difficulty: 'Hard' },
        { name: 'Smallest Range Covering Elements from K Lists', difficulty: 'Hard' },
        { name: 'Single-Threaded CPU', difficulty: 'Medium' },
        { name: 'Process Tasks Using Servers', difficulty: 'Medium' },
        { name: 'Seat Reservation Manager', difficulty: 'Medium' },
        { name: 'Design Twitter', difficulty: 'Medium' },
        { name: 'Minimum Cost to Connect Sticks', difficulty: 'Medium' },
        { name: 'Maximum Subsequence Score', difficulty: 'Medium' },
        { name: 'Total Cost to Hire K Workers', difficulty: 'Medium' },
        { name: 'Minimum Number of Refueling Stops', difficulty: 'Hard' },
        { name: 'Maximum Performance of a Team', difficulty: 'Hard' },
        { name: 'Smallest Number in Infinite Set', difficulty: 'Medium' },
        { name: 'Maximum Number of Events That Can Be Attended', difficulty: 'Medium' },
        { name: 'Maximum Number of Events That Can Be Attended II', difficulty: 'Hard' },
        { name: 'Furthest Building You Can Reach', difficulty: 'Medium' },
        { name: 'Find K Pairs with Smallest Sums', difficulty: 'Medium' },
        { name: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium' },
        { name: 'Sort Characters By Frequency', difficulty: 'Medium' },
        { name: 'Ugly Number II', difficulty: 'Medium' },
        { name: 'Super Ugly Number', difficulty: 'Medium' },
        { name: 'Minimum Cost to Hire K Workers', difficulty: 'Hard' },
        // Hard
        { name: 'Merge K Sorted Lists', difficulty: 'Hard' },
        { name: 'Find Median from Data Stream', difficulty: 'Hard' },
        { name: 'Sliding Window Median', difficulty: 'Hard' },
        { name: 'IPO', difficulty: 'Hard' },
        { name: 'Trapping Rain Water II', difficulty: 'Hard' },
        { name: 'The Skyline Problem', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a heap data structure?', difficulty: 'Easy', answer: 'A heap is a complete binary tree satisfying heap property: max-heap (parent ≥ children) or min-heap (parent ≤ children). Enables O(1) access to max/min element, O(log n) insert/delete. Stored efficiently in array without pointers. Foundation for priority queues and heapsort.' },
        { question: 'What are the main operations performed on a heap?', difficulty: 'Easy', answer: 'Insert (push): add at end, bubble up O(log n). Extract-max/min (pop): remove root, replace with last element, bubble down O(log n). Peek: access root O(1). Heapify: build heap from array O(n). Decrease/increase key: update then bubble O(log n). Delete arbitrary: swap with last, remove, fix heap O(log n).' },
        { question: 'Explain the difference between a max heap and a min heap.', difficulty: 'Easy', answer: 'Max heap: parent ≥ children, root is maximum, extract-max removes largest. Min heap: parent ≤ children, root is minimum, extract-min removes smallest. Same structure, opposite comparison. Use max heap for largest elements, min heap for smallest. Python heapq is min-heap; negate values for max-heap.' },
        { question: 'How is a heap typically implemented?', difficulty: 'Easy', answer: 'Array-based: complete binary tree maps to array. For node at index i: parent = (i-1)//2, left child = 2i+1, right child = 2i+2. No pointer overhead, cache-friendly. Insert at end, extract replaces root. Maintains completeness property automatically.' },
        { question: 'What is the time complexity of heap operations (insertion, deletion, peek)?', difficulty: 'Easy', answer: 'Insert: O(log n) - add at end, bubble up through height log n. Delete/extract: O(log n) - replace root, bubble down. Peek: O(1) - access array[0]. Heapify: O(n) - build from array bottom-up. Space: O(n) for array. All operations leverage tree height = log n.' },
        // Mid
        { question: 'Can you explain the application of a heap in solving a real-world problem?', difficulty: 'Medium', answer: 'Dijkstra\'s shortest path: min-heap extracts nearest unvisited node O(log V). Task scheduling: priority queue processes highest-priority jobs. Median stream: two heaps maintain running median. Event simulation: process events in time order. OS scheduling: priority-based process selection. Load balancing: assign to least-loaded server.' },
        { question: 'What is the difference between a heap and a stack?', difficulty: 'Medium', answer: 'Heap: priority-based access (max/min first), O(log n) insert/remove, tree structure, for priority queues. Stack: LIFO access (last in first out), O(1) push/pop, linear structure, for function calls/undo. Different use cases: heap for optimization problems, stack for sequential processing.' },
        { question: 'How can you convert an array into a max heap?', difficulty: 'Medium', answer: 'Bottom-up heapify O(n): start from last non-leaf (index n//2-1), heapify each node downward. For each node, swap with larger child if smaller, repeat down. More efficient than n insertions O(n log n). Works because leaves are trivially heaps, build upward.' },
        { question: 'What are the advantages of using a heap compared to arrays or linked lists?', difficulty: 'Medium', answer: 'Vs sorted array: O(log n) insert vs O(n). Vs unsorted array: O(1) find-max vs O(n). Vs linked list: no pointer overhead, cache-friendly, O(log n) access vs O(n). Heap provides efficient priority operations while maintaining partial order.' },
        { question: 'Can a binary heap be represented as a complete binary tree?', difficulty: 'Medium', answer: 'Yes, by definition. Complete binary tree: all levels filled except possibly last, which fills left to right. This enables array representation without gaps: index i has children at 2i+1, 2i+2. Completeness ensures O(log n) height and efficient array storage.' },
        { question: 'What is the space complexity of a binary heap?', difficulty: 'Medium', answer: 'O(n) for n elements. Array-based representation requires exactly n slots plus minimal metadata. No pointer overhead unlike tree-based structures. Memory-efficient due to completeness property—no wasted space for missing children.' },
        { question: 'Explain the concept of heapify and why it is important.', difficulty: 'Medium', answer: 'Heapify (sift-down) fixes heap property at a node by swapping with appropriate child and recursing. Builds heap in O(n) by starting from bottom non-leaves. Important for: initial heap construction, extract operations (fix after root replacement), heap sort. Key to efficient heap operations.' },
        { question: 'What are some common applications of a priority queue using a heap?', difficulty: 'Medium', answer: 'Dijkstra/Prim algorithms, Huffman coding (merge lowest-frequency), A* pathfinding, event-driven simulation, task scheduling, stream processing (top-K), bandwidth management, hospital triage systems, merge K sorted lists. Any scenario needing efficient priority-based access.' },
        { question: 'What are the disadvantages or limitations of using a heap?', difficulty: 'Medium', answer: 'No efficient search O(n), no sorted traversal, can\'t find arbitrary element quickly, no decrease-key without position tracking, fixed element priorities (must re-insert to update in basic heap), no efficient merge (unlike binomial/fibonacci heaps).' },
        { question: 'What is the difference between a binary heap and a BST?', difficulty: 'Medium', answer: 'Heap: partial order (parent vs children only), O(1) find-max/min, O(n) search, complete tree, array storage. BST: total order (left < node < right), O(log n) search, any shape, pointer storage. Heap for priority operations; BST for search/sorted access.' },
        { question: 'How would you implement a priority queue using a max heap?', difficulty: 'Medium', answer: 'Enqueue: insert into heap (add at end, bubble up) O(log n). Dequeue: extract-max (return root, replace with last, bubble down) O(log n). Peek: return root O(1). Use array with size tracking. Compare priorities in bubble operations. For min-priority queue, use min-heap or negate priorities.' },
        { question: 'Explain the concept of heap sort and its time complexity.', difficulty: 'Medium', answer: 'Heap sort: build max-heap O(n), repeatedly extract max to end O(n log n). In-place by swapping root with last unsorted, reduce heap size, heapify root. Total: O(n log n) guaranteed, O(1) extra space, not stable. Comparable to merge sort time but better space.' },
        { question: 'What is the difference between a heap and a hash table?', difficulty: 'Medium', answer: 'Heap: ordered by priority, O(1) max/min access, O(log n) insert/extract, for priority operations. Hash table: unordered, O(1) average key-based access, for lookup/membership. Different purposes: heap for prioritization, hash for fast key retrieval.' },
        { question: 'When would you choose to use a heap over an array or linked list?', difficulty: 'Medium', answer: 'Use heap when: need repeated access to max/min, priority-based processing, top-K problems, merge K sorted lists. Use array when: random access needed, no ordering requirements. Use linked list when: frequent insertions at known positions, order doesn\'t matter. Heap excels at priority operations.' },
        { question: 'Can you explain the concept of a two-tiered heap?', difficulty: 'Medium', answer: 'Two-heap technique uses max-heap for smaller half and min-heap for larger half of stream. Max-heap top = largest of smaller, min-heap top = smallest of larger. Median is one or both tops. Balance sizes within 1. O(log n) insert, O(1) median query. Used for running median.' },
        { question: 'How do you handle duplicate values in a max heap or min heap?', difficulty: 'Medium', answer: 'Duplicates are allowed—heap property only requires ≥ or ≤. Equal elements can be in any order relative to each other. For stable ordering with duplicates, use (priority, insertion_order, value) tuple. When extracting, all duplicates have same priority; order of extraction among them is arbitrary.' },
        { question: 'How can you efficiently find the kth smallest/largest element using a heap?', difficulty: 'Medium', answer: 'Kth largest: use min-heap of size K, add elements keeping only K largest, root is answer O(n log K). Alternative: max-heap, extract K times O(K log n). QuickSelect is O(n) average but O(n²) worst. For repeated queries, build full heap once then extract.' },
        // Senior
        { question: 'Explain the concept of a d-ary heap and how it differs from a binary heap.', difficulty: 'Hard', answer: 'd-ary heap has d children per node instead of 2. Lower height log_d(n) = faster extract O(log_d n). More comparisons per level (d vs 2). Optimal d depends on use: d=4 often good for Dijkstra (more extracts than inserts). Trade-off: fewer levels vs more comparisons per level.' },
        { question: 'What is an external heap or external sorting?', difficulty: 'Hard', answer: 'External heap handles data too large for memory using disk. Minimize I/O by processing in memory-sized chunks. External sort: divide into sorted runs, merge using heap. Replacement selection creates longer runs. B-heap optimizes for disk blocks. Used in database systems and big data processing.' },
        { question: 'Discuss the trade-offs between array-based and linked structure heap representations.', difficulty: 'Hard', answer: 'Array: O(1) parent/child calculation, cache-friendly, compact, hard to merge heaps. Linked: flexible sizing, easier merge (leftist/skew heaps), pointer overhead, cache-unfriendly. Array preferred for single heaps; linked structures (binomial, fibonacci) for mergeable heaps.' },
        { question: 'What is the heap\'s bottom-up construction method vs top-down construction?', difficulty: 'Hard', answer: 'Bottom-up O(n): heapify from last non-leaf upward. Most nodes near bottom with short paths. Top-down O(n log n): insert elements one by one. Bottom-up is faster because summing heights: Σ(h × nodes_at_height) ≈ n, vs n insertions at log n each.' },
        { question: 'What are potential issues with heaps in multi-threaded environments?', difficulty: 'Hard', answer: 'Concurrent modifications corrupt heap structure. Solutions: lock entire heap (limits concurrency), fine-grained locking (complex), lock-free heaps (difficult), concurrent skip lists instead. Thread-local heaps with periodic merging. Work-stealing queues use deques not heaps for this reason.' },
        { question: 'What is the difference between a binary heap and a Fibonacci heap?', difficulty: 'Hard', answer: 'Binary heap: O(log n) all operations, simple, array-based. Fibonacci heap: O(1) amortized insert/decrease-key, O(log n) amortized extract, lazy structure, better for Dijkstra theoretically O(E + V log V). Fibonacci more complex, higher constants; binary heap usually faster in practice.' },
        { question: 'In what scenarios would you choose min heap over max heap, and vice versa?', difficulty: 'Hard', answer: 'Min heap: Dijkstra (extract nearest), K largest (keep K, evict smallest), event simulation (earliest first), Huffman encoding. Max heap: K smallest (keep K, evict largest), priority scheduling (highest priority first), maximum selection. Choice depends on which extreme you need to access.' },
        { question: 'Can you explain the concept of heap pollution?', difficulty: 'Hard', answer: 'Heap pollution (Java generics context): occurs when parameterized type variable refers to object not of that type, often with raw types or unchecked casts. Can cause ClassCastException at runtime. Prevented by avoiding raw types with generics. Not directly related to heap data structure.' },
        { question: 'Explain the concept of a binary heap vs. a ternary heap.', difficulty: 'Hard', answer: 'Binary heap: 2 children, height log₂n, 1 comparison to find larger child. Ternary heap: 3 children, height log₃n ≈ 0.63 log₂n, 2 comparisons per level. Ternary has fewer levels but more comparisons per level. Ternary can be faster for extract-heavy workloads due to reduced height.' },
        { question: 'Can you describe the difference between a binary heap and a binomial heap?', difficulty: 'Hard', answer: 'Binary heap: single tree, O(log n) merge (rebuild). Binomial heap: forest of binomial trees with unique sizes (like binary number), O(log n) merge by combining same-size trees. Binomial supports efficient merge for disjoint-set heaps. Binary simpler and faster for single-heap operations.' }
      ],

      commonMistakes: [
        'Confusing min-heap vs max-heap for top-K problems',
        'Forgetting Python heapq is min-heap only (negate for max)',
        'Not handling empty heap edge cases',
        'Using wrong comparison for custom objects',
        'Modifying heap size incorrectly in two-heap pattern'
      ],

      tips: [
        'Python heapq is min-heap; negate values for max-heap',
        'For top-K largest, use min-heap of size K',
        'Two heaps pattern: max-heap for smaller half, min-heap for larger',
        'Heapify is O(n), more efficient than n insertions',
        'Use tuple (priority, index, data) for stable sorting'
      ],

      interviewTips: [
        'Clarify: K largest or K smallest? Sorted output needed?',
        'Explain heap choice: "I use min-heap of size K because..."',
        'State time complexity: O(n log k) for top-K is better than O(n log n) sort',
        'Mention space-time tradeoff between heap and QuickSelect',
        'For two-heap problems, explain rebalancing logic'
      ],

      codeExamples: [
        {
          title: 'Kth Largest Element - Min Heap',
          language: 'python',
          description: 'Keep K largest in min-heap, top is Kth largest.',
          code: `import heapq

def find_kth_largest(nums, k):
    # Min-heap of size k holds k largest elements
    heap = nums[:k]
    heapq.heapify(heap)

    for num in nums[k:]:
        if num > heap[0]:  # Larger than smallest of k largest
            heapq.heapreplace(heap, num)

    return heap[0]  # Smallest of k largest = kth largest`
        },
        {
          title: 'Merge K Sorted Lists',
          language: 'python',
          description: 'Use min-heap to always get smallest element.',
          code: `import heapq

def merge_k_lists(lists):
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst.val, i, lst))

    dummy = ListNode(0)
    current = dummy

    while heap:
        val, i, node = heapq.heappop(heap)
        current.next = node
        current = current.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    return dummy.next`
        },
        {
          title: 'Find Median from Data Stream',
          language: 'python',
          description: 'Two heaps: max-heap for lower, min-heap for upper.',
          code: `import heapq

class MedianFinder:
    def __init__(self):
        self.small = []  # Max-heap (negated values)
        self.large = []  # Min-heap

    def addNum(self, num):
        # Add to max-heap (small)
        heapq.heappush(self.small, -num)
        # Move largest from small to large
        heapq.heappush(self.large, -heapq.heappop(self.small))

        # Balance: small can have at most 1 more than large
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def findMedian(self):
        if len(self.small) > len(self.large):
            return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2`
        }
      ,
        {
          title: 'Kth Largest Element - Min Heap',
          language: 'javascript',
          description: 'Keep K largest in min-heap, top is Kth largest.',
          code: `function findKthLargest(nums, k) {
    // Use a min-heap of size k (simplified with sorted array)
    const heap = nums.slice(0, k).sort((a, b) => a - b);

    for (let i = k; i < nums.length; i++) {
        if (nums[i] > heap[0]) {
            heap[0] = nums[i];
            heap.sort((a, b) => a - b); // Re-heapify
        }
    }
    return heap[0]; // Smallest of k largest = kth largest
}
// Note: In production, use a proper MinHeap class for O(n log k)`
        },
        {
          title: 'Kth Largest Element - Min Heap',
          language: 'java',
          description: 'Keep K largest in min-heap, top is Kth largest.',
          code: `public int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>(); // min-heap

    for (int num : nums) {
        heap.offer(num);
        if (heap.size() > k) heap.poll(); // Remove smallest
    }
    return heap.peek(); // Smallest of k largest = kth largest
}`
        },
        {
          title: 'Merge K Sorted Lists',
          language: 'javascript',
          description: 'Use min-heap to always get smallest element.',
          code: `function mergeKLists(lists) {
    // Simplified approach using sorted insertion
    const vals = [];
    for (const lst of lists) {
        let node = lst;
        while (node) { vals.push(node.val); node = node.next; }
    }
    vals.sort((a, b) => a - b);

    const dummy = { val: 0, next: null };
    let current = dummy;
    for (const val of vals) {
        current.next = { val, next: null };
        current = current.next;
    }
    return dummy.next;
}
// Note: Optimal uses a MinHeap for O(n log k) where k = lists.length`
        },
        {
          title: 'Merge K Sorted Lists',
          language: 'java',
          description: 'Use min-heap to always get smallest element.',
          code: `public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> heap = new PriorityQueue<>(
        (a, b) -> a.val - b.val);

    for (ListNode node : lists)
        if (node != null) heap.offer(node);

    ListNode dummy = new ListNode(0);
    ListNode current = dummy;

    while (!heap.isEmpty()) {
        ListNode node = heap.poll();
        current.next = node;
        current = current.next;
        if (node.next != null) heap.offer(node.next);
    }
    return dummy.next;
}`
        },
        {
          title: 'Find Median from Data Stream',
          language: 'javascript',
          description: 'Two heaps: max-heap for lower, min-heap for upper.',
          code: `class MedianFinder {
    constructor() {
        this.small = []; // max-heap (store negated)
        this.large = []; // min-heap
    }

    addNum(num) {
        // Add to max-heap, then balance
        this.small.push(-num);
        this.small.sort((a, b) => a - b);
        this.large.push(-this.small.shift());
        this.large.sort((a, b) => a - b);

        if (this.large.length > this.small.length) {
            this.small.push(-this.large.shift());
            this.small.sort((a, b) => a - b);
        }
    }

    findMedian() {
        if (this.small.length > this.large.length) return -this.small[0];
        return (-this.small[0] + this.large[0]) / 2;
    }
}
// Note: In production, use a proper Heap class for O(log n) per add`
        },
        {
          title: 'Find Median from Data Stream',
          language: 'java',
          description: 'Two heaps: max-heap for lower, min-heap for upper.',
          code: `class MedianFinder {
    private PriorityQueue<Integer> small; // max-heap
    private PriorityQueue<Integer> large; // min-heap

    public MedianFinder() {
        small = new PriorityQueue<>(Collections.reverseOrder());
        large = new PriorityQueue<>();
    }

    public void addNum(int num) {
        small.offer(num);
        large.offer(small.poll());
        if (large.size() > small.size()) small.offer(large.poll());
    }

    public double findMedian() {
        if (small.size() > large.size()) return small.peek();
        return (small.peek() + large.peek()) / 2.0;
    }
}`
        }
      ]
    },
    {
      id: 'backtracking',
      title: 'Backtracking',
      icon: 'refresh',
      color: '#10b981',
      questions: 25,
      description: 'Explore all possibilities with pruning. Generate permutations, combinations, subsets.',

visualizations: [
        {
          title: 'Recursion-Backtracking Decision Tree',
          language: 'python',
          description: 'Shows recursive branching for subsets generation with backtrack pruning, demonstrating the choose-explore-unchoose pattern.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah7" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker></defs><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Backtracking: Subsets of [1,2,3]</text><rect x="210" y="35" width="50" height="24" rx="4" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="235" y="52" font-family="monospace" font-size="11" fill="#10b981" text-anchor="middle" font-weight="bold">[ ]</text><line x1="215" y1="59" x2="115" y2="82" stroke="#64748b" stroke-width="1"/><line x1="235" y1="59" x2="235" y2="82" stroke="#64748b" stroke-width="1"/><line x1="255" y1="59" x2="355" y2="82" stroke="#64748b" stroke-width="1"/><rect x="85" y="85" width="55" height="24" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="112" y="102" font-family="monospace" font-size="11" fill="#10b981" text-anchor="middle">[1]</text><rect x="210" y="85" width="55" height="24" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="237" y="102" font-family="monospace" font-size="11" fill="#10b981" text-anchor="middle">[2]</text><rect x="330" y="85" width="55" height="24" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="357" y="102" font-family="monospace" font-size="11" fill="#10b981" text-anchor="middle">[3]</text><line x1="100" y1="109" x2="60" y2="132" stroke="#64748b" stroke-width="1"/><line x1="125" y1="109" x2="155" y2="132" stroke="#64748b" stroke-width="1"/><line x1="235" y1="109" x2="235" y2="132" stroke="#64748b" stroke-width="1"/><rect x="30" y="135" width="62" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="61" y="150" font-family="monospace" font-size="10" fill="#10b981" text-anchor="middle">[1,2]</text><rect x="125" y="135" width="62" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="156" y="150" font-family="monospace" font-size="10" fill="#10b981" text-anchor="middle">[1,3]</text><rect x="208" y="135" width="62" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="239" y="150" font-family="monospace" font-size="10" fill="#10b981" text-anchor="middle">[2,3]</text><line x1="61" y1="157" x2="61" y2="175" stroke="#64748b" stroke-width="1"/><rect x="25" y="178" width="72" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="61" y="193" font-family="monospace" font-size="10" fill="#10b981" text-anchor="middle">[1,2,3]</text><text x="400" y="155" font-family="sans-serif" font-size="10" fill="#ef4444" font-style="italic">Pruned branches</text><text x="400" y="170" font-family="sans-serif" font-size="10" fill="#ef4444" font-style="italic">not explored</text><line x1="370" y1="100" x2="400" y2="120" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,2"/><text x="410" y="130" font-family="sans-serif" font-size="9" fill="#ef4444">no elements left</text><text x="20" y="225" font-family="sans-serif" font-size="11" fill="#64748b">Result: [], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3] — all 2^3 = 8 subsets</text><text x="20" y="243" font-family="sans-serif" font-size="11" fill="#10b981">Pattern: choose → explore → unchoose (backtrack)</text></svg>'
        }
      ],

      introduction: `Backtracking is a systematic way to explore all possible solutions by building candidates incrementally and abandoning ("pruning") candidates that cannot lead to a valid solution.

**The Backtracking Template:**
1. **Choose**: Make a choice from available options
2. **Explore**: Recursively explore with that choice
3. **Unchoose**: Undo the choice (backtrack) and try next option

**Key Problem Types:**
- **Subsets**: All 2^n combinations (include or exclude each element)
- **Permutations**: All n! orderings (use each element exactly once)
- **Combinations**: All ways to choose k from n (order doesn't matter)
- **Constraint Satisfaction**: Find solutions meeting constraints (N-Queens, Sudoku)

**Pruning is Critical:** Early termination of invalid paths dramatically improves performance from exponential worst case.`,

      whenToUse: [
        'Generate all permutations, combinations, or subsets',
        'Solve constraint satisfaction problems (Sudoku, N-Queens)',
        'Path finding in grid/maze problems',
        'Word search in matrix',
        'Partition problems (can we split into k subsets?)',
        'Generate all valid expressions or strings'
      ],

      keyPatterns: ['Permutations', 'Combinations', 'Subsets', 'N-Queens', 'Sudoku solver', 'Word search', 'Partition'],
      timeComplexity: 'Exponential: O(n!), O(2^n), O(n^n)',
      spaceComplexity: 'O(n) recursion depth',

      approach: [
        'Define the state: What information do you track at each step?',
        'Identify choices: What are valid options at current position?',
        'Write base case: When is a solution complete?',
        'Make choice, recurse, then backtrack (undo choice)',
        'Add pruning: How to skip invalid branches early?',
        'Handle duplicates: Sort input and skip duplicates if needed'
      ],

      commonProblems: [
        // Medium - Subsets/Combinations
        { name: 'Subsets', difficulty: 'Medium' },
        { name: 'Subsets II', difficulty: 'Medium' },
        { name: 'Combinations', difficulty: 'Medium' },
        { name: 'Combination Sum', difficulty: 'Medium' },
        { name: 'Combination Sum II', difficulty: 'Medium' },
        { name: 'Combination Sum III', difficulty: 'Medium' },
        { name: 'Letter Combinations of Phone Number', difficulty: 'Medium' },
        { name: 'Generate Parentheses', difficulty: 'Medium' },
        // Medium - Permutations
        { name: 'Permutations', difficulty: 'Medium' },
        { name: 'Permutations II', difficulty: 'Medium' },
        { name: 'Next Permutation', difficulty: 'Medium' },
        { name: 'Permutation Sequence', difficulty: 'Hard' },
        // Medium - Partitioning
        { name: 'Palindrome Partitioning', difficulty: 'Medium' },
        { name: 'Partition to K Equal Sum Subsets', difficulty: 'Medium' },
        { name: 'Matchsticks to Square', difficulty: 'Medium' },
        { name: 'Fair Distribution of Cookies', difficulty: 'Medium' },
        // Medium - Word/Grid Search
        { name: 'Word Search', difficulty: 'Medium' },
        { name: 'Word Search II', difficulty: 'Hard' },
        { name: 'Path with Maximum Gold', difficulty: 'Medium' },
        { name: 'Unique Paths III', difficulty: 'Hard' },
        { name: 'Robot Room Cleaner', difficulty: 'Hard' },
        // Medium - Other
        { name: 'Restore IP Addresses', difficulty: 'Medium' },
        { name: 'Split a String Into the Max Number of Unique Substrings', difficulty: 'Medium' },
        { name: 'Maximum Length of a Concatenated String with Unique Characters', difficulty: 'Medium' },
        { name: 'Reconstruct Itinerary', difficulty: 'Hard' },
        { name: 'Beautiful Arrangement', difficulty: 'Medium' },
        { name: 'Splitting a String Into Descending Consecutive Values', difficulty: 'Medium' },
        { name: 'Find Unique Binary String', difficulty: 'Medium' },
        { name: 'Maximum Score Words Formed by Letters', difficulty: 'Hard' },
        // Hard - Constraint Satisfaction
        { name: 'N-Queens', difficulty: 'Hard' },
        { name: 'N-Queens II', difficulty: 'Hard' },
        { name: 'Sudoku Solver', difficulty: 'Hard' },
        { name: 'Expression Add Operators', difficulty: 'Hard' },
        { name: 'Word Squares', difficulty: 'Hard' },
        { name: 'Stickers to Spell Word', difficulty: 'Hard' },
        { name: 'Zuma Game', difficulty: 'Hard' },
        { name: 'Remove Invalid Parentheses', difficulty: 'Hard' },
        { name: 'Additive Number', difficulty: 'Medium' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is backtracking, and how does it differ from brute force?', difficulty: 'Easy', answer: 'Backtracking is a systematic search technique that builds solutions incrementally, abandoning a path ("pruning") as soon as it determines the path cannot lead to a valid solution. Unlike brute force which generates ALL possible combinations and then filters, backtracking eliminates invalid branches early, often dramatically reducing the search space. The template is: choose an option, explore recursively, then unchoose (backtrack) to try the next option. It uses depth-first search on the solution space tree. While worst-case is still exponential, pruning makes it practical for many constraint satisfaction problems.' },
        { question: 'What is the "choose-explore-unchoose" pattern in backtracking?', difficulty: 'Easy', answer: 'The fundamental template has three steps at each recursion level: (1) Choose: select an element or make a decision (e.g., add nums[i] to the current path). (2) Explore: recursively explore with that choice in place, building toward a complete solution. (3) Unchoose: undo the choice (e.g., remove nums[i] from path) so you can try the next option. This ensures all possibilities are explored while maintaining a clean state. The "unchoose" step is what makes it backtracking rather than just recursion — it restores state so sibling branches in the recursion tree are independent.' },
        { question: 'What is the difference between subsets, permutations, and combinations?', difficulty: 'Easy', answer: 'Subsets: all possible selections from a set, including empty set. For n elements: 2^n subsets. Order does not matter, no repetition. Combinations: selecting k items from n, order does not matter. C(n,k) = n!/(k!(n-k)!) results. Permutations: arranging elements where order matters. For n elements: n! permutations. In backtracking, subsets use a start index and add at every recursion level; combinations add only when path length equals k; permutations use a "used" array since any element can go at any position.' },
        { question: 'How does backtracking relate to recursion and DFS?', difficulty: 'Easy', answer: 'Backtracking IS a form of recursion combined with DFS on an implicit search tree. Each node in the tree represents a partial solution. DFS explores branches depth-first. The key addition backtracking brings is the "undoing" step and pruning: when a partial solution cannot lead to a valid complete solution, we cut the branch (prune) and backtrack to try alternatives. Pure recursion solves subproblems; DFS traverses graphs/trees; backtracking specifically explores a solution space with the ability to abandon and retry paths.' },
        // Mid
        { question: 'How do you handle duplicate elements in backtracking problems?', difficulty: 'Medium', answer: 'Sort the input array first to group duplicates together. Then, at each recursion level, skip an element if it equals the previous element at the same level: "if i > start and nums[i] == nums[i-1]: continue" for combinations/subsets, or "if i > 0 and nums[i] == nums[i-1] and not used[i-1]: continue" for permutations. The sorting groups duplicates, and the skip condition ensures only the first occurrence is used at each decision point, preventing duplicate branches in the recursion tree. Without this, Subsets II or Permutations II produce duplicate results.' },
        { question: 'What are effective pruning strategies in backtracking?', difficulty: 'Medium', answer: 'Common pruning strategies: (1) Constraint checking: validate partial solution at each step, not just at the end (N-Queens checks column, diagonals per row). (2) Ordering: process elements in a sorted order to detect early when remaining elements cannot help. (3) Bound computation: if remaining elements cannot possibly reach the target, prune (Combination Sum prunes when remaining < 0). (4) Symmetry breaking: avoid exploring symmetric solutions (first queen can only go in half the first row). (5) Conflict-driven: in Sudoku, propagate constraints to detect impossible states early. Good pruning can reduce exponential time by orders of magnitude.' },
        { question: 'How does backtracking solve the N-Queens problem?', difficulty: 'Medium', answer: 'Place queens row by row. For each row, try each column: check if the position is safe (no other queen in same column, or either diagonal). If safe, place the queen and recurse to the next row. If not safe or recursion fails, remove the queen (backtrack) and try the next column. Base case: all n rows filled successfully. Track attacked columns and diagonals with sets for O(1) lookups: columns set, positive diagonals (row+col) set, negative diagonals (row-col) set. Time complexity O(n!) with pruning, though actual exploration is much less due to constraint propagation.' },
        { question: 'What is the time complexity of backtracking algorithms?', difficulty: 'Medium', answer: 'Worst-case complexity depends on the problem: Subsets: O(n * 2^n) — 2^n subsets, O(n) to copy each. Permutations: O(n * n!) — n! permutations, O(n) to copy each. Combinations C(n,k): O(k * C(n,k)). N-Queens: O(n!) — at most n choices for first row, n-1 for second, etc. Sudoku: O(9^(empty cells)). Pruning reduces average case significantly but does not change worst case. The space complexity is typically O(n) for the recursion stack and current path, plus O(results) for storing all solutions.' },
        { question: 'How do you convert a recursive backtracking solution to iterative?', difficulty: 'Medium', answer: 'Use an explicit stack to simulate the recursion. Push the initial state. At each step, pop the top, check if it is a complete solution (add to results if so), otherwise generate all valid next choices and push them. The stack stores the current path and the decision point (which choice to try next). This avoids stack overflow for deep recursion. However, recursive backtracking is usually cleaner and preferred in interviews because the choose-explore-unchoose pattern maps naturally to recursion. Iterative conversion is mainly needed for very deep search spaces or languages with limited stack.' },
        { question: 'How does backtracking differ from dynamic programming?', difficulty: 'Medium', answer: 'Backtracking explores the entire solution space (all possible solutions) and is used when you need ALL solutions or there is no overlapping subproblem structure. DP solves optimization problems by storing solutions to overlapping subproblems, finding ONE optimal answer. Backtracking is typically exponential; DP reduces to polynomial when applicable. If subproblems overlap and you only need the optimal value, use DP. If you need all valid configurations or the problem lacks overlapping subproblems, use backtracking. Some problems can be solved by either (Word Break: DP for "can we?", backtracking for "list all").' },
        // Senior
        { question: 'What is constraint propagation, and how does it enhance backtracking?', difficulty: 'Hard', answer: 'Constraint propagation proactively reduces the search space by inferring consequences of each choice. When you make a choice, update all related constraints immediately rather than discovering violations later. In Sudoku: placing a number eliminates it from the row, column, and box — if any cell has zero candidates, prune immediately. Arc consistency (AC-3): ensure every value in a domain has a valid partner in connected domains. Forward checking: after each assignment, remove inconsistent values from unassigned variables. This can transform an intractable search into a manageable one, often reducing backtracking calls by orders of magnitude.' },
        { question: 'How do you analyze and optimize backtracking for large search spaces?', difficulty: 'Hard', answer: 'Key optimization techniques: (1) Variable ordering: process the most constrained variable first (MRV heuristic) to fail early. (2) Value ordering: try the least constraining value first (LCV) to maximize remaining options. (3) Memoization: if the same subproblem can be reached via different paths, cache results (turns backtracking into DP). (4) Randomized restarts: for satisfaction problems, random restarts can escape bad search branches. (5) Bit manipulation: use bitmasks for the "used" set for O(1) operations. (6) Incremental validation: check constraints only on the newly added element, not the entire state. These techniques can make exponential algorithms practical for real-world inputs.' }
      ],

      commonMistakes: [
        'Forgetting to backtrack (undo the choice after recursion)',
        'Not handling duplicates in input (leads to duplicate solutions)',
        'Wrong base case causing missing or extra solutions',
        'Not pruning invalid branches (TLE on large inputs)',
        'Mutating instead of copying for result collection'
      ],

      tips: [
        'Use a path/current list to track current state',
        'Make choice, recurse, then undo choice (backtrack)',
        'Prune early to avoid unnecessary exploration',
        'For combinations, use start index to avoid duplicates',
        'Sort input and skip duplicates: if i > start and nums[i] == nums[i-1]: continue'
      ],

      interviewTips: [
        'Identify the problem type: subsets, permutations, or constraint satisfaction?',
        'Explain the choices at each step and how you backtrack',
        'Discuss pruning strategies to optimize',
        'Walk through a small example showing the recursion tree',
        'State time complexity honestly (exponential) and why pruning helps'
      ],

      codeExamples: [
        {
          title: 'Subsets - Include/Exclude Pattern',
          language: 'python',
          description: 'Generate all 2^n subsets of an array.',
          code: `def subsets(nums):
    result = []

    def backtrack(start, path):
        result.append(path[:])  # Add current subset

        for i in range(start, len(nums)):
            path.append(nums[i])      # Choose
            backtrack(i + 1, path)     # Explore
            path.pop()                 # Unchoose (backtrack)

    backtrack(0, [])
    return result`
        },
        {
          title: 'Permutations - Use Each Once',
          language: 'python',
          description: 'Generate all n! permutations.',
          code: `def permute(nums):
    result = []

    def backtrack(path, used):
        if len(path) == len(nums):
            result.append(path[:])
            return

        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True          # Choose
            path.append(nums[i])
            backtrack(path, used)   # Explore
            path.pop()              # Unchoose
            used[i] = False

    backtrack([], [False] * len(nums))
    return result`
        },
        {
          title: 'Combination Sum - Reuse Allowed',
          language: 'python',
          description: 'Find combinations that sum to target, can reuse elements.',
          code: `def combination_sum(candidates, target):
    result = []

    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        if remaining < 0:
            return  # Prune

        for i in range(start, len(candidates)):
            path.append(candidates[i])
            # Can reuse same element, so pass i not i+1
            backtrack(i, path, remaining - candidates[i])
            path.pop()

    backtrack(0, [], target)
    return result`
        },
        {
          title: 'N-Queens - Constraint Satisfaction',
          language: 'python',
          description: 'Place N queens on N×N board with no attacks.',
          code: `def solve_n_queens(n):
    result = []
    board = [['.'] * n for _ in range(n)]

    def is_safe(row, col):
        # Check column
        for i in range(row):
            if board[i][col] == 'Q':
                return False
        # Check diagonals
        for i, j in zip(range(row-1, -1, -1), range(col-1, -1, -1)):
            if board[i][j] == 'Q':
                return False
        for i, j in zip(range(row-1, -1, -1), range(col+1, n)):
            if board[i][j] == 'Q':
                return False
        return True

    def backtrack(row):
        if row == n:
            result.append([''.join(r) for r in board])
            return

        for col in range(n):
            if is_safe(row, col):
                board[row][col] = 'Q'  # Choose
                backtrack(row + 1)      # Explore
                board[row][col] = '.'  # Unchoose

    backtrack(0)
    return result`
        }
      ,
        {
          title: 'Subsets - Include/Exclude Pattern',
          language: 'javascript',
          description: 'Generate all 2^n subsets of an array.',
          code: `function subsets(nums) {
    const result = [];

    function backtrack(start, path) {
        result.push([...path]); // Add current subset

        for (let i = start; i < nums.length; i++) {
            path.push(nums[i]);       // Choose
            backtrack(i + 1, path);    // Explore
            path.pop();               // Unchoose (backtrack)
        }
    }
    backtrack(0, []);
    return result;
}`
        },
        {
          title: 'Subsets - Include/Exclude Pattern',
          language: 'java',
          description: 'Generate all 2^n subsets of an array.',
          code: `public List<List<Integer>> subsets(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, 0, new ArrayList<>(), result);
    return result;
}

private void backtrack(int[] nums, int start, List<Integer> path,
                       List<List<Integer>> result) {
    result.add(new ArrayList<>(path));

    for (int i = start; i < nums.length; i++) {
        path.add(nums[i]);
        backtrack(nums, i + 1, path, result);
        path.remove(path.size() - 1);
    }
}`
        },
        {
          title: 'Permutations - Use Each Once',
          language: 'javascript',
          description: 'Generate all n! permutations.',
          code: `function permute(nums) {
    const result = [];

    function backtrack(path, used) {
        if (path.length === nums.length) {
            result.push([...path]);
            return;
        }
        for (let i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.push(nums[i]);
            backtrack(path, used);
            path.pop();
            used[i] = false;
        }
    }
    backtrack([], new Array(nums.length).fill(false));
    return result;
}`
        },
        {
          title: 'Permutations - Use Each Once',
          language: 'java',
          description: 'Generate all n! permutations.',
          code: `public List<List<Integer>> permute(int[] nums) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(nums, new ArrayList<>(), new boolean[nums.length], result);
    return result;
}

private void backtrack(int[] nums, List<Integer> path, boolean[] used,
                       List<List<Integer>> result) {
    if (path.size() == nums.length) {
        result.add(new ArrayList<>(path));
        return;
    }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        path.add(nums[i]);
        backtrack(nums, path, used, result);
        path.remove(path.size() - 1);
        used[i] = false;
    }
}`
        },
        {
          title: 'Combination Sum - Reuse Allowed',
          language: 'javascript',
          description: 'Find combinations that sum to target, can reuse elements.',
          code: `function combinationSum(candidates, target) {
    const result = [];

    function backtrack(start, path, remaining) {
        if (remaining === 0) { result.push([...path]); return; }
        if (remaining < 0) return; // Prune

        for (let i = start; i < candidates.length; i++) {
            path.push(candidates[i]);
            backtrack(i, path, remaining - candidates[i]); // Can reuse
            path.pop();
        }
    }
    backtrack(0, [], target);
    return result;
}`
        },
        {
          title: 'Combination Sum - Reuse Allowed',
          language: 'java',
          description: 'Find combinations that sum to target, can reuse elements.',
          code: `public List<List<Integer>> combinationSum(int[] candidates, int target) {
    List<List<Integer>> result = new ArrayList<>();
    backtrack(candidates, 0, new ArrayList<>(), target, result);
    return result;
}

private void backtrack(int[] candidates, int start, List<Integer> path,
                       int remaining, List<List<Integer>> result) {
    if (remaining == 0) { result.add(new ArrayList<>(path)); return; }
    if (remaining < 0) return;

    for (int i = start; i < candidates.length; i++) {
        path.add(candidates[i]);
        backtrack(candidates, i, path, remaining - candidates[i], result);
        path.remove(path.size() - 1);
    }
}`
        },
        {
          title: 'N-Queens - Constraint Satisfaction',
          language: 'javascript',
          description: 'Place N queens on NxN board with no attacks.',
          code: `function solveNQueens(n) {
    const result = [];
    const board = Array.from({ length: n }, () => '.'.repeat(n).split(''));

    function isSafe(row, col) {
        for (let i = 0; i < row; i++) if (board[i][col] === 'Q') return false;
        for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--)
            if (board[i][j] === 'Q') return false;
        for (let i = row - 1, j = col + 1; i >= 0 && j < n; i--, j++)
            if (board[i][j] === 'Q') return false;
        return true;
    }

    function backtrack(row) {
        if (row === n) { result.push(board.map(r => r.join(''))); return; }
        for (let col = 0; col < n; col++) {
            if (isSafe(row, col)) {
                board[row][col] = 'Q';
                backtrack(row + 1);
                board[row][col] = '.';
            }
        }
    }
    backtrack(0);
    return result;
}`
        },
        {
          title: 'N-Queens - Constraint Satisfaction',
          language: 'java',
          description: 'Place N queens on NxN board with no attacks.',
          code: `public List<List<String>> solveNQueens(int n) {
    List<List<String>> result = new ArrayList<>();
    char[][] board = new char[n][n];
    for (char[] row : board) Arrays.fill(row, '.');
    backtrack(board, 0, result);
    return result;
}

private void backtrack(char[][] board, int row, List<List<String>> result) {
    if (row == board.length) {
        List<String> snapshot = new ArrayList<>();
        for (char[] r : board) snapshot.add(new String(r));
        result.add(snapshot);
        return;
    }
    for (int col = 0; col < board.length; col++) {
        if (isSafe(board, row, col)) {
            board[row][col] = 'Q';
            backtrack(board, row + 1, result);
            board[row][col] = '.';
        }
    }
}

private boolean isSafe(char[][] board, int row, int col) {
    for (int i = 0; i < row; i++) if (board[i][col] == 'Q') return false;
    for (int i = row-1, j = col-1; i >= 0 && j >= 0; i--, j--)
        if (board[i][j] == 'Q') return false;
    for (int i = row-1, j = col+1; i >= 0 && j < board.length; i--, j++)
        if (board[i][j] == 'Q') return false;
    return true;
}`
        }
      ],
      codeExample: `# Subsets - Backtracking
def subsets(nums):
    result = []

    def backtrack(start, path):
        result.append(path[:])  # Add copy
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()  # Backtrack

    backtrack(0, [])
    return result

# Time: O(n * 2^n), Space: O(n)`
    },
    {
      id: 'greedy',
      title: 'Greedy',
      icon: 'target',
      color: '#06b6d4',
      questions: 18,
      description: 'Make locally optimal choices. Works when local optimum leads to global optimum.',

visualizations: [
        {
          title: 'Activity Selection (Greedy)',
          language: 'python',
          description: 'Timeline showing chosen activities (green) vs skipped overlapping ones (gray), selecting by earliest end time.',
          svg: '<svg viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg" style="background:white"><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Greedy: Activity Selection (sort by end time)</text><line x1="40" y1="235" x2="40" y2="40" stroke="#e2e8f0" stroke-width="1"/><line x1="40" y1="220" x2="470" y2="220" stroke="#e2e8f0" stroke-width="1"/><text x="80" y="235" font-family="monospace" font-size="9" fill="#94a3b8">1</text><text x="130" y="235" font-family="monospace" font-size="9" fill="#94a3b8">2</text><text x="180" y="235" font-family="monospace" font-size="9" fill="#94a3b8">3</text><text x="230" y="235" font-family="monospace" font-size="9" fill="#94a3b8">4</text><text x="280" y="235" font-family="monospace" font-size="9" fill="#94a3b8">5</text><text x="330" y="235" font-family="monospace" font-size="9" fill="#94a3b8">6</text><text x="380" y="235" font-family="monospace" font-size="9" fill="#94a3b8">7</text><text x="430" y="235" font-family="monospace" font-size="9" fill="#94a3b8">8</text><rect x="40" y="45" width="140" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="110" y="60" font-family="sans-serif" font-size="10" fill="#10b981" text-anchor="middle" font-weight="bold">A (0-3)</text><rect x="90" y="75" width="200" height="22" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><text x="190" y="90" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">B (1-5) skipped</text><rect x="40" y="75" width="90" height="22" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" opacity="0.5"/><rect x="190" y="105" width="100" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="240" y="120" font-family="sans-serif" font-size="10" fill="#10b981" text-anchor="middle" font-weight="bold">C (3-5)</text><rect x="140" y="135" width="200" height="22" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><text x="240" y="150" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">D (2-6) skipped</text><rect x="290" y="165" width="150" height="22" rx="4" fill="#dcfce7" stroke="#10b981" stroke-width="1.5"/><text x="365" y="180" font-family="sans-serif" font-size="10" fill="#10b981" text-anchor="middle" font-weight="bold">E (5-8)</text><rect x="240" y="195" width="180" height="22" rx="4" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/><text x="330" y="210" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">F (4-7) skipped</text></svg>'
        }
      ],

      introduction: `Greedy algorithms make the locally optimal choice at each step, hoping this leads to a globally optimal solution. Unlike Dynamic Programming which explores all possibilities, greedy commits to decisions without reconsidering them.

The key insight: if making the best choice right now doesn't hurt future choices, greedy works.

Greedy algorithms are powerful because they're typically:
• Simple to understand and implement
• Fast (often O(n) or O(n log n))
• Space efficient (often O(1))

However, greedy doesn't always work. Two properties must hold:
1. **Greedy Choice Property**: A locally optimal choice leads to a globally optimal solution
2. **Optimal Substructure**: The optimal solution contains optimal solutions to subproblems

Classic greedy success stories: Huffman coding, Dijkstra's shortest path, Kruskal's/Prim's MST, Activity Selection.

Classic greedy failures: 0/1 Knapsack (use DP), Traveling Salesman (NP-hard), Coin Change with arbitrary denominations.

In interviews, greedy problems often involve intervals, scheduling, or making sequential decisions where early choices don't affect later options.`,

      whenToUse: [
        'Interval scheduling and activity selection problems',
        'Fractional optimization (can take partial items)',
        'Jump/reach problems (can I reach the end?)',
        'Huffman encoding and optimal merge patterns',
        'Minimum spanning tree algorithms',
        'Task scheduling with deadlines',
        'Coin change with standard denominations (1, 5, 10, 25)',
        'Gas station / circular route problems'
      ],

      keyPatterns: ['Interval scheduling', 'Activity selection', 'Huffman coding', 'Fractional knapsack', 'Jump game', 'Task scheduling'],
      timeComplexity: 'Often O(n log n) due to sorting',
      spaceComplexity: 'O(1) extra space typically',

      approach: [
        'Identify if greedy choice property holds (prove or disprove)',
        'Sort elements by the greedy criteria (end time, ratio, deadline)',
        'Process elements in sorted order, making greedy choice each step',
        'For interval problems: sort by end time to maximize non-overlapping',
        'For scheduling: sort by deadline or profit-to-time ratio',
        'Track running state (current position, remaining capacity, etc.)',
        'If greedy fails, pivot to Dynamic Programming'
      ],

      commonProblems: [
        // Easy
        { name: 'Assign Cookies', difficulty: 'Easy' },
        { name: 'Lemonade Change', difficulty: 'Easy' },
        { name: 'Maximum Units on a Truck', difficulty: 'Easy' },
        { name: 'Can Place Flowers', difficulty: 'Easy' },
        // Medium - Jump Game
        { name: 'Jump Game', difficulty: 'Medium' },
        { name: 'Jump Game II', difficulty: 'Medium' },
        { name: 'Jump Game III', difficulty: 'Medium' },
        { name: 'Jump Game VII', difficulty: 'Medium' },
        { name: 'Video Stitching', difficulty: 'Medium' },
        // Medium - Intervals
        { name: 'Merge Intervals', difficulty: 'Medium' },
        { name: 'Insert Interval', difficulty: 'Medium' },
        { name: 'Non-overlapping Intervals', difficulty: 'Medium' },
        { name: 'Minimum Number of Arrows to Burst Balloons', difficulty: 'Medium' },
        { name: 'Meeting Rooms', difficulty: 'Easy' },
        { name: 'Meeting Rooms II', difficulty: 'Medium' },
        { name: 'Car Pooling', difficulty: 'Medium' },
        { name: 'My Calendar I', difficulty: 'Medium' },
        { name: 'My Calendar II', difficulty: 'Medium' },
        // Medium - Scheduling/Selection
        { name: 'Gas Station', difficulty: 'Medium' },
        { name: 'Task Scheduler', difficulty: 'Medium' },
        { name: 'Partition Labels', difficulty: 'Medium' },
        { name: 'Maximum Number of Events That Can Be Attended', difficulty: 'Medium' },
        { name: 'Minimum Deletions to Make Character Frequencies Unique', difficulty: 'Medium' },
        { name: 'Remove Covered Intervals', difficulty: 'Medium' },
        { name: 'Maximum Length of Pair Chain', difficulty: 'Medium' },
        { name: 'Minimum Cost for Tickets', difficulty: 'Medium' },
        // Medium - Other Greedy
        { name: 'Two City Scheduling', difficulty: 'Medium' },
        { name: 'Boats to Save People', difficulty: 'Medium' },
        { name: 'Broken Calculator', difficulty: 'Medium' },
        { name: 'Hand of Straights', difficulty: 'Medium' },
        { name: 'Divide Array in Sets of K Consecutive Numbers', difficulty: 'Medium' },
        { name: 'Reduce Array Size to The Half', difficulty: 'Medium' },
        { name: 'Queue Reconstruction by Height', difficulty: 'Medium' },
        { name: 'Advantage Shuffle', difficulty: 'Medium' },
        { name: 'Wiggle Subsequence', difficulty: 'Medium' },
        { name: 'Monotone Increasing Digits', difficulty: 'Medium' },
        { name: 'Minimum Add to Make Parentheses Valid', difficulty: 'Medium' },
        // Hard
        { name: 'Candy', difficulty: 'Hard' },
        { name: 'Minimum Number of Taps to Open to Water a Garden', difficulty: 'Hard' },
        { name: 'Minimum Initial Energy to Finish Tasks', difficulty: 'Hard' },
        { name: 'Create Maximum Number', difficulty: 'Hard' },
        { name: 'IPO', difficulty: 'Hard' },
        { name: 'Patching Array', difficulty: 'Hard' },
        { name: 'Minimum Number of Refueling Stops', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a greedy algorithm, and when does it work?', difficulty: 'Easy', answer: 'A greedy algorithm makes the locally optimal choice at each step, hoping this leads to a globally optimal solution. It works when two properties hold: (1) Greedy Choice Property — a locally optimal choice is part of some globally optimal solution, and (2) Optimal Substructure — an optimal solution contains optimal solutions to its subproblems. Unlike DP which explores all possibilities, greedy commits to each decision immediately. Classic successes: Huffman coding, Dijkstra, Activity Selection, Kruskal/Prim MST. Classic failures: 0/1 Knapsack, Traveling Salesman, Coin Change with arbitrary denominations.' },
        { question: 'How does greedy differ from dynamic programming?', difficulty: 'Easy', answer: 'Greedy makes one irrevocable choice per step (locally optimal) and never reconsiders. DP considers all choices and picks the best after evaluating all subproblems. Greedy is typically faster (O(n) or O(n log n)) and uses less space, but only works when the greedy choice property holds. DP works for any problem with optimal substructure and overlapping subproblems, but may be O(n^2) or worse. Rule of thumb: try greedy first (simpler, faster); if you cannot prove correctness, fall back to DP. Some problems like Job Scheduling can be solved by either approach.' },
        { question: 'What is the Activity Selection problem, and why is it a classic greedy example?', difficulty: 'Easy', answer: 'Given a set of activities with start and end times, select the maximum number of non-overlapping activities. Greedy strategy: sort by end time, always pick the activity that finishes earliest and does not overlap with the last selected. This works because finishing early leaves the most room for future activities. Proof: if an optimal solution does not include the earliest-finishing activity, we can swap the first activity for it without reducing the count (it finishes no later). This exchange argument is the standard technique for proving greedy correctness.' },
        { question: 'How do you prove a greedy algorithm is correct?', difficulty: 'Easy', answer: 'Two main proof techniques: (1) Exchange argument: assume an optimal solution that does not follow the greedy choice. Show you can "exchange" an element to follow the greedy choice without worsening the solution. Repeat until the optimal solution matches greedy. (2) Greedy stays ahead: show that at each step, the greedy solution is at least as good as any other. By induction, it remains optimal at the end. In interviews, you do not need a formal proof, but you should articulate why the greedy choice does not miss a better option, ideally with a small counterexample attempt that fails.' },
        // Mid
        { question: 'Why does greedy fail for the 0/1 Knapsack problem?', difficulty: 'Medium', answer: 'The 0/1 Knapsack requires taking whole items (no fractions). Greedy by value/weight ratio can fail: items with the best ratio may not fill the knapsack optimally. Example: capacity 10, items [(value=60, weight=10), (value=100, weight=20), (value=120, weight=30)]. Greedy picks the first (ratio 6) but optimal is items 2+3 if capacity allowed, or just item 1 here. For the fractional knapsack, greedy works because you can take partial items, making the ratio-based ordering optimal. The 0/1 constraint breaks the greedy choice property, requiring DP O(n*W) instead.' },
        { question: 'How does the greedy approach work for interval scheduling problems?', difficulty: 'Medium', answer: 'For maximizing non-overlapping intervals: sort by end time, greedily select intervals that start after the previous one ends. For minimizing intervals to remove (Non-overlapping Intervals): equivalent — count overlaps, the answer is total - maximum non-overlapping. For minimum arrows to burst balloons: sort by end, count distinct endpoints needed. For merge intervals: sort by start time, merge overlapping ones. The key insight for all: sorting brings structure, and processing in sorted order lets each greedy decision be locally optimal. End-time sorting works for selection; start-time sorting works for merging.' },
        { question: 'How does the Jump Game problem demonstrate greedy thinking?', difficulty: 'Medium', answer: 'Jump Game I (can reach end?): maintain max_reach, the farthest index reachable so far. Iterate left to right; at each index, update max_reach = max(max_reach, i + nums[i]). If i > max_reach, return false. If max_reach >= n-1, return true. O(n) time, O(1) space. Jump Game II (min jumps): track the current jump range [start, end]; from all positions in the range, find the farthest reachable; that becomes the next range, increment jumps. Greedy works because extending reach as far as possible never blocks future progress — reaching farther is always at least as good.' },
        { question: 'What is the difference between greedy and heuristic algorithms?', difficulty: 'Medium', answer: 'Greedy algorithms are provably optimal for problems satisfying the greedy choice property — they guarantee the best solution. Heuristic algorithms are "good enough" approaches for problems where optimal solutions are computationally infeasible (NP-hard). Nearest-neighbor for TSP is a heuristic — it uses greedy-like local choices but is not optimal. Dijkstra for shortest paths is greedy and provably optimal. The distinction matters: greedy has correctness proofs; heuristics have approximation guarantees at best. In interviews, clearly state whether your greedy is provably correct or just a heuristic.' },
        { question: 'How do you apply greedy to the Gas Station circular route problem?', difficulty: 'Medium', answer: 'Key insight: if total gas >= total cost, a solution exists. To find the starting station: track current_tank and total_tank. Iterate once: add gas[i] - cost[i] to both. When current_tank < 0, reset start to i+1 and current_tank to 0. At the end, if total_tank >= 0, return start. Why greedy works: if you cannot reach station j from station i, then no station between i and j can be the start either (all intermediate stations also contributed negatively). This elimination principle is the greedy choice — skip all failing intermediaries and try after the failure point.' },
        { question: 'How does the Partition Labels problem use greedy?', difficulty: 'Medium', answer: 'Partition a string so each letter appears in at most one partition, maximize partition count. Greedy approach: first, record the last occurrence of each character. Then iterate through the string, maintaining the current partition end as the maximum last occurrence of all characters seen so far. When the current index equals the partition end, close the partition and start a new one. O(n) time, O(1) space (26 letters). Greedy choice: extend the current partition only as far as necessary to include all occurrences of seen characters. This is optimal because any smaller partition would split a character across partitions.' },
        // Senior
        { question: 'What is the exchange argument proof technique for greedy algorithms?', difficulty: 'Hard', answer: 'The exchange argument proves greedy optimality by contradiction: (1) Assume an optimal solution O that differs from greedy solution G. (2) Find the first point of difference. (3) Show that swapping O\'s choice for G\'s choice at that point produces a solution O\' that is no worse than O. (4) Repeat until O is transformed into G, proving G is optimal. For Activity Selection: if O picks an activity ending later than G\'s first pick, swap it for G\'s pick — the rest of O remains valid because G\'s pick ends no later. This is the gold standard for greedy proofs and is what interviewers look for when they ask "why does your greedy work?"' },
        { question: 'How do you recognize when a problem requires greedy vs other approaches?', difficulty: 'Hard', answer: 'Greedy indicators: problem asks for a single optimal value (not all solutions), choices are independent (one choice does not constrain future choices), sorting reveals natural ordering, "minimum number of X to cover Y" or "maximum non-overlapping" patterns. Red flags against greedy: problem involves tradeoffs between current and future choices (use DP), requires exploring all valid configurations (use backtracking), has negative weights/values affecting ordering (use Bellman-Ford not Dijkstra). Practice: attempt greedy, construct counterexample; if no counterexample works, the greedy is likely correct. Classic greedy problem families: intervals, scheduling, Huffman, shortest paths, MST.' }
      ],

      commonMistakes: [
        'Applying greedy when DP is needed (0/1 Knapsack)',
        'Sorting by wrong criteria (start time vs end time)',
        'Not handling edge cases (empty input, single element)',
        'Off-by-one errors in interval overlap checks',
        'Forgetting that greedy requires proof - not just intuition',
        'In jump problems: not tracking the maximum reachable position',
        'In gas station: not recognizing circular nature of problem'
      ],

      tips: [
        'Prove greedy works: optimal substructure + greedy choice property',
        'Often involves sorting by start/end time or value/weight ratio',
        'If greedy doesn\'t work, consider DP instead',
        'Interval problems: usually sort by end time',
        'For scheduling: consider sorting by deadline or profit-to-time ratio'
      ],

      interviewTips: [
        'Always ask yourself: "Does making the best local choice hurt future choices?"',
        'If you can\'t prove greedy works, mention DP as fallback',
        'For interval problems, clarify: overlapping includes touching? [1,2] and [2,3]?',
        'Explain WHY sorting by end time works (leaves most room for future activities)',
        'Draw examples to verify greedy works before coding',
        'Know the classic counter-example: coin change with [1, 3, 4], amount 6',
        'Mention time complexity improvement over DP when applicable'
      ],

      codeExamples: [
        {
          title: 'Jump Game - Can Reach End?',
          language: 'python',
          description: 'Track the farthest position reachable at each step.',
          code: `def canJump(nums):
    """
    Each element = max jump length from that position.
    Return True if we can reach the last index.
    """
    max_reach = 0

    for i in range(len(nums)):
        # Can't reach current position
        if i > max_reach:
            return False

        # Update farthest reachable
        max_reach = max(max_reach, i + nums[i])

        # Early termination
        if max_reach >= len(nums) - 1:
            return True

    return True

# Time: O(n), Space: O(1)
# Example: [2,3,1,1,4] -> True
#          [3,2,1,0,4] -> False`
        },
        {
          title: 'Non-overlapping Intervals',
          language: 'python',
          description: 'Remove minimum intervals to make rest non-overlapping. Classic greedy.',
          code: `def eraseOverlapIntervals(intervals):
    """
    Sort by END time (greedy choice: keep interval ending earliest).
    Count overlapping intervals to remove.
    """
    if not intervals:
        return 0

    # Sort by end time
    intervals.sort(key=lambda x: x[1])

    removals = 0
    prev_end = intervals[0][1]

    for i in range(1, len(intervals)):
        start, end = intervals[i]

        if start < prev_end:
            # Overlap! Remove current (it ends later)
            removals += 1
        else:
            # No overlap, update end
            prev_end = end

    return removals

# Time: O(n log n), Space: O(1)
# Why end time? Ending earlier leaves more room for future intervals`
        },
        {
          title: 'Gas Station - Circular Route',
          language: 'python',
          description: 'Find starting station to complete circular journey.',
          code: `def canCompleteCircuit(gas, cost):
    """
    If total gas >= total cost, solution exists.
    Find starting point where we never go negative.
    """
    total_tank = 0
    current_tank = 0
    start = 0

    for i in range(len(gas)):
        gain = gas[i] - cost[i]
        total_tank += gain
        current_tank += gain

        # Can't reach next station from current start
        if current_tank < 0:
            # Start from next station
            start = i + 1
            current_tank = 0

    # If total is negative, impossible
    return start if total_tank >= 0 else -1

# Time: O(n), Space: O(1)
# Key insight: If we fail at station i, all stations
# between start and i would also fail as starting points`
        },
        {
          title: 'Partition Labels',
          language: 'python',
          description: 'Partition string so each letter appears in at most one part.',
          code: `def partitionLabels(s):
    """
    Greedy: extend partition until it contains all
    occurrences of letters seen so far.
    """
    # Find last occurrence of each character
    last = {char: i for i, char in enumerate(s)}

    result = []
    start = 0
    end = 0

    for i, char in enumerate(s):
        # Extend partition to include all of this char
        end = max(end, last[char])

        # Reached end of current partition
        if i == end:
            result.append(end - start + 1)
            start = i + 1

    return result

# Time: O(n), Space: O(1) - only 26 letters
# Example: "ababcbacadefegdehijhklij"
# Output: [9, 7, 8] -> "ababcbaca", "defegde", "hijhklij"`
        },
        {
          title: 'Task Scheduler with Cooldown',
          language: 'python',
          description: 'Minimum intervals to execute all tasks with cooldown between same tasks.',
          code: `def leastInterval(tasks, n):
    """
    Greedy: Schedule most frequent task first.
    Fill cooldown gaps with other tasks.
    """
    from collections import Counter

    freq = Counter(tasks)
    max_freq = max(freq.values())

    # Count tasks with max frequency
    max_count = sum(1 for f in freq.values() if f == max_freq)

    # Formula: (max_freq - 1) * (n + 1) + max_count
    # This is: frames for scheduling + final batch
    result = (max_freq - 1) * (n + 1) + max_count

    # But can't be less than total tasks
    return max(result, len(tasks))

# Time: O(n), Space: O(1)
# Example: tasks = ["A","A","A","B","B","B"], n = 2
# Optimal: A -> B -> idle -> A -> B -> idle -> A -> B
# Output: 8`
        }
      ,
        {
          title: 'Jump Game - Can Reach End?',
          language: 'javascript',
          description: 'Track the farthest position reachable at each step.',
          code: `function canJump(nums) {
    let maxReach = 0;

    for (let i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
        if (maxReach >= nums.length - 1) return true;
    }
    return true;
}
// Time: O(n), Space: O(1)`
        },
        {
          title: 'Jump Game - Can Reach End?',
          language: 'java',
          description: 'Track the farthest position reachable at each step.',
          code: `public boolean canJump(int[] nums) {
    int maxReach = 0;

    for (int i = 0; i < nums.length; i++) {
        if (i > maxReach) return false;
        maxReach = Math.max(maxReach, i + nums[i]);
        if (maxReach >= nums.length - 1) return true;
    }
    return true;
}
// Time: O(n), Space: O(1)`
        },
        {
          title: 'Non-overlapping Intervals',
          language: 'javascript',
          description: 'Remove minimum intervals to make rest non-overlapping. Classic greedy.',
          code: `function eraseOverlapIntervals(intervals) {
    if (!intervals.length) return 0;
    intervals.sort((a, b) => a[1] - b[1]); // Sort by end time

    let removals = 0, prevEnd = intervals[0][1];

    for (let i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < prevEnd) removals++; // Overlap
        else prevEnd = intervals[i][1];
    }
    return removals;
}
// Time: O(n log n), Space: O(1)`
        },
        {
          title: 'Non-overlapping Intervals',
          language: 'java',
          description: 'Remove minimum intervals to make rest non-overlapping. Classic greedy.',
          code: `public int eraseOverlapIntervals(int[][] intervals) {
    if (intervals.length == 0) return 0;
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));

    int removals = 0, prevEnd = intervals[0][1];

    for (int i = 1; i < intervals.length; i++) {
        if (intervals[i][0] < prevEnd) removals++;
        else prevEnd = intervals[i][1];
    }
    return removals;
}
// Time: O(n log n), Space: O(1)`
        },
        {
          title: 'Gas Station - Circular Route',
          language: 'javascript',
          description: 'Find starting station to complete circular journey.',
          code: `function canCompleteCircuit(gas, cost) {
    let totalTank = 0, currentTank = 0, start = 0;

    for (let i = 0; i < gas.length; i++) {
        const gain = gas[i] - cost[i];
        totalTank += gain;
        currentTank += gain;

        if (currentTank < 0) {
            start = i + 1;
            currentTank = 0;
        }
    }
    return totalTank >= 0 ? start : -1;
}
// Time: O(n), Space: O(1)`
        },
        {
          title: 'Gas Station - Circular Route',
          language: 'java',
          description: 'Find starting station to complete circular journey.',
          code: `public int canCompleteCircuit(int[] gas, int[] cost) {
    int totalTank = 0, currentTank = 0, start = 0;

    for (int i = 0; i < gas.length; i++) {
        int gain = gas[i] - cost[i];
        totalTank += gain;
        currentTank += gain;

        if (currentTank < 0) {
            start = i + 1;
            currentTank = 0;
        }
    }
    return totalTank >= 0 ? start : -1;
}
// Time: O(n), Space: O(1)`
        },
        {
          title: 'Partition Labels',
          language: 'javascript',
          description: 'Partition string so each letter appears in at most one part.',
          code: `function partitionLabels(s) {
    const last = {};
    for (let i = 0; i < s.length; i++) last[s[i]] = i;

    const result = [];
    let start = 0, end = 0;

    for (let i = 0; i < s.length; i++) {
        end = Math.max(end, last[s[i]]);
        if (i === end) {
            result.push(end - start + 1);
            start = i + 1;
        }
    }
    return result;
}
// Time: O(n), Space: O(1) - only 26 letters`
        },
        {
          title: 'Partition Labels',
          language: 'java',
          description: 'Partition string so each letter appears in at most one part.',
          code: `public List<Integer> partitionLabels(String s) {
    int[] last = new int[26];
    for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;

    List<Integer> result = new ArrayList<>();
    int start = 0, end = 0;

    for (int i = 0; i < s.length(); i++) {
        end = Math.max(end, last[s.charAt(i) - 'a']);
        if (i == end) {
            result.add(end - start + 1);
            start = i + 1;
        }
    }
    return result;
}
// Time: O(n), Space: O(1) - only 26 letters`
        },
        {
          title: 'Task Scheduler with Cooldown',
          language: 'javascript',
          description: 'Minimum intervals to execute all tasks with cooldown between same tasks.',
          code: `function leastInterval(tasks, n) {
    const freq = {};
    for (const t of tasks) freq[t] = (freq[t] || 0) + 1;

    const maxFreq = Math.max(...Object.values(freq));
    const maxCount = Object.values(freq).filter(f => f === maxFreq).length;

    // Frame: (maxFreq - 1) groups of (n + 1) slots, plus maxCount final tasks
    return Math.max(tasks.length, (maxFreq - 1) * (n + 1) + maxCount);
}
// Time: O(n), Space: O(1)`
        },
        {
          title: 'Task Scheduler with Cooldown',
          language: 'java',
          description: 'Minimum intervals to execute all tasks with cooldown between same tasks.',
          code: `public int leastInterval(char[] tasks, int n) {
    int[] freq = new int[26];
    for (char t : tasks) freq[t - 'A']++;

    int maxFreq = Arrays.stream(freq).max().getAsInt();
    int maxCount = (int) Arrays.stream(freq).filter(f -> f == maxFreq).count();

    return Math.max(tasks.length, (maxFreq - 1) * (n + 1) + maxCount);
}
// Time: O(n), Space: O(1)`
        }
      ]
    },
    {
      id: 'tries',
      title: 'Tries',
      icon: 'folder',
      color: '#ec4899',
      questions: 12,
      description: 'Prefix tree for string operations. Efficient autocomplete and spell check.',

      introduction: `A Trie (pronounced "try") or Prefix Tree is a specialized tree data structure used to store and retrieve strings efficiently. Unlike binary search trees where each node holds a single key, in a trie, each node represents a character, and paths from root to leaf spell out words.

Tries excel at prefix-based operations, making them essential for:
• Autocomplete systems (Google search suggestions)
• Spell checkers and dictionary lookups
• IP routing (longest prefix matching)
• Phone directories and contact search
• Word games (Scrabble, Boggle solvers)

The key insight is that common prefixes are shared - storing "car", "card", "care" uses far less space than storing them separately because "car" is shared. This structure enables O(m) search where m is the word length, regardless of how many words are stored.

Every trie interview problem fundamentally comes down to: tree traversal with character-by-character path building.`,

      whenToUse: [
        'Multiple prefix queries on a fixed dictionary',
        'Autocomplete or typeahead suggestions',
        'Spell checking with edit distance',
        'Word search problems in grids (Word Search II)',
        'Longest common prefix among strings',
        'IP routing and address lookup',
        'Pattern matching with wildcards',
        'Dictionary-based problems (replace words, word break)'
      ],

      keyPatterns: ['Insert/Search', 'Prefix matching', 'Word dictionary', 'Autocomplete', 'Wildcard search', 'Word frequency'],
      timeComplexity: 'O(m) where m is word length',
      spaceComplexity: 'O(alphabet_size * max_word_length * num_words)',

      approach: [
        'Create TrieNode class with children dictionary and is_word flag',
        'Insert: traverse char by char, create nodes for missing chars, mark end',
        'Search: traverse char by char, return False if any char missing',
        'StartsWith: same as search but don\'t check is_word at end',
        'For wildcards: use recursion to try all children for "."',
        'For word search in grid: combine DFS with trie traversal',
        'Store additional data at nodes if needed (count, original word)'
      ],

      commonProblems: [
        // Medium
        { name: 'Implement Trie (Prefix Tree)', difficulty: 'Medium' },
        { name: 'Design Add and Search Words Data Structure', difficulty: 'Medium' },
        { name: 'Replace Words', difficulty: 'Medium' },
        { name: 'Longest Word in Dictionary', difficulty: 'Medium' },
        { name: 'Map Sum Pairs', difficulty: 'Medium' },
        { name: 'Top K Frequent Words', difficulty: 'Medium' },
        { name: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium' },
        { name: 'Implement Magic Dictionary', difficulty: 'Medium' },
        { name: 'Short Encoding of Words', difficulty: 'Medium' },
        { name: 'Index Pairs of a String', difficulty: 'Easy' },
        { name: 'Longest Common Prefix', difficulty: 'Easy' },
        { name: 'Search Suggestions System', difficulty: 'Medium' },
        { name: 'Stream of Characters', difficulty: 'Hard' },
        { name: 'Camelcase Matching', difficulty: 'Medium' },
        { name: 'Extra Characters in a String', difficulty: 'Medium' },
        { name: 'Count Prefixes of a Given String', difficulty: 'Easy' },
        // Hard
        { name: 'Word Search II', difficulty: 'Hard' },
        { name: 'Concatenated Words', difficulty: 'Hard' },
        { name: 'Word Squares', difficulty: 'Hard' },
        { name: 'Palindrome Pairs', difficulty: 'Hard' },
        { name: 'Design Search Autocomplete System', difficulty: 'Hard' },
        { name: 'Maximum XOR With an Element From Array', difficulty: 'Hard' },
        { name: 'Count Pairs With XOR in a Range', difficulty: 'Hard' },
        { name: 'K-th Smallest in Lexicographical Order', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is a Trie data structure, and why is it useful?', difficulty: 'Easy', answer: 'A Trie (prefix tree) stores strings character by character, sharing common prefixes. Each path from root represents a prefix. O(m) search/insert where m is word length (independent of dictionary size). Useful for: autocomplete, spell checking, IP routing, word games. Memory-efficient for datasets with shared prefixes.' },
        { question: 'Explain the basic structure of a Trie.', difficulty: 'Easy', answer: 'Root node (usually empty), child nodes for each character. Each node has: children map (char → node), is_end_of_word flag, optionally additional data (count, word itself). Edge labeled with character. Path from root to any node = a prefix. Leaf-to-root paths (with is_end) = stored words.' },
        { question: 'How does a Trie differ from a binary search tree (BST)?', difficulty: 'Easy', answer: 'BST: binary branching, compares entire keys, O(log n) operations, key stored at nodes. Trie: multi-way branching (alphabet size), character-by-character traversal, O(m) operations (key length), characters on edges. Trie for prefix operations; BST for general ordered data. Trie larger constant factor.' },
        { question: 'What are some common applications of Tries in real-world scenarios?', difficulty: 'Easy', answer: 'Autocomplete (type → suggestions), spell checkers (prefix search + edit distance), IP routing tables (longest prefix match), dictionary implementation, word games (Boggle, Scrabble), phone directories, DNA sequence search, predictive text, search engine suggestions. Anywhere prefix queries matter.' },
        // Mid
        { question: 'How do you handle memory optimization in a Trie?', difficulty: 'Medium', answer: 'Use hash map children instead of array[26] for sparse nodes. Compressed/Patricia tries merge single-child chains. Store only word endings, not intermediate nodes. Succinct tries use bit vectors. Double-array tries for read-heavy loads. Trade-off: memory vs speed. Array faster but wastes space for sparse alphabets.' },
        { question: 'What are the time and space complexities of common Trie operations?', difficulty: 'Medium', answer: 'Insert: O(m) time, O(m) new nodes worst case. Search: O(m) time. Prefix search: O(m + k) where k = results. Delete: O(m) time. Space: O(total characters across all words) worst case, better with shared prefixes. m = key length. Operations independent of n (total words).' },
        { question: 'Can you explain the concept of Trie depth and how it affects performance?', difficulty: 'Medium', answer: 'Depth = longest word length. Affects: maximum operations per search (O(depth)), memory per path, stack usage in recursion. Shallow tries = fast operations. Very long strings increase depth. Can limit depth and handle overflow specially. Depth typically bounded by application (word lengths, URLs, IPs).' },
        { question: 'What are some potential drawbacks or limitations of using Tries?', difficulty: 'Medium', answer: 'High memory overhead (pointer per character), poor cache locality (scattered allocations), complex delete operation, large alphabet sizes increase branching. Not ideal for: few strings, no prefix queries needed, memory-constrained environments. Hash table often simpler and faster for exact match only.' },
        { question: 'What is the main advantage of using a Trie over a hash table for dictionary tasks?', difficulty: 'Medium', answer: 'Trie advantages: prefix queries (autocomplete, startsWith), ordered traversal (lexicographic), no hash collisions, worst-case O(m) not O(n). Hash table: O(1) average exact match, simpler. Choose trie when: prefix operations needed, alphabetically sorted iteration, or predictable worst-case required.' },
        { question: 'Explain the process of inserting a new word into a Trie.', difficulty: 'Medium', answer: 'Start at root. For each character: if child exists, move to it; else create new node and move. After last character, mark current node as end_of_word = true. O(m) time where m = word length. Creates at most m new nodes. Existing prefixes share path.' },
        { question: 'What is the purpose of an end of word marker in Trie nodes?', difficulty: 'Medium', answer: 'Distinguishes complete words from prefixes. Example: "app" and "apple" share path to "app", but only the node after second "p" has marker for "app". Without marker, can\'t differentiate stored words from intermediate prefixes. Essential for search() vs startsWith() distinction.' },
        { question: 'How would you implement autocomplete functionality using a Trie?', difficulty: 'Medium', answer: 'Navigate to prefix\'s end node O(prefix_length). From there, DFS/BFS to collect all words (nodes with is_end = true). For top-K: store frequency counts, use priority queue. Optimization: store word at end nodes to avoid reconstruction. Return sorted by frequency or alphabetically.' },
        { question: 'What are some potential scenarios where a Trie might not be the best choice?', difficulty: 'Medium', answer: 'Few strings (hash table simpler), no prefix queries needed, very long keys (memory), large alphabets without compression, memory-constrained systems, random access patterns (poor locality). When exact match dominates and n is small, hash table or sorted array may be better.' },
        { question: 'Explain how you might handle case-insensitive searching in a Trie.', difficulty: 'Medium', answer: 'Option 1: normalize on insert/search (lowercase all). Option 2: store both cases at each level (increases branching). Option 3: case-insensitive comparison function. Usually normalize to lowercase: char.lower() before accessing children. Consistent handling throughout insert and search operations.' },
        { question: 'Can you discuss how to efficiently remove a word from a Trie?', difficulty: 'Medium', answer: 'Navigate to word end, clear is_end flag. If node has no children and not end of another word, delete it and recursively delete ancestors until reaching a node with children or another is_end. Use recursive approach: delete returns whether to remove current node. O(m) time.' },
        { question: 'Discuss the concept of space-time trade-off in Trie data structures.', difficulty: 'Medium', answer: 'More space: array[alphabet_size] children per node → O(1) child access, more memory. Less space: hash map children → O(1) average but slower constant, less memory. Compressed tries: less space, more complex insert. Succinct tries: minimal space, complex operations. Choose based on query patterns and memory constraints.' },
        { question: 'How would you handle situations requiring efficient insertion and deletion?', difficulty: 'Medium', answer: 'Standard trie already provides O(m) insert/delete. For very dynamic scenarios: ensure proper node cleanup on delete (don\'t leak memory), use reference counting for shared nodes, consider lock-free tries for concurrent access. Monitor memory fragmentation with frequent insert/delete cycles.' },
        // Senior
        { question: 'How would you implement a Trie for variable-sized alphabets like Unicode?', difficulty: 'Hard', answer: 'Use hash map for children (handles sparse/large alphabets efficiently). Key = character (or codepoint), value = child node. Trade-off: array[65536] impractical, but hash map has overhead. Alternatively: multi-level tries (first level by category), compressed tries, or adaptive approaches based on actual character distribution.' },
        { question: 'What are some common optimization techniques to improve Trie performance?', difficulty: 'Hard', answer: 'Path compression (Patricia trie: merge single-child chains). Array children for small alphabets. Cache-efficient layout (store nodes contiguously). Lazy node creation. Pre-compute common queries. Succinct representation (rank/select on bit vectors). Level-order storage for BFS access patterns. Memoization for repeated prefix queries.' },
        { question: 'What is the difference between a Patricia Trie (Radix Tree) and a standard Trie?', difficulty: 'Hard', answer: 'Patricia/Radix trie compresses chains of single-child nodes into one edge labeled with string (not just character). Reduces nodes and depth for sparse tries. Example: storing "test" creates one edge "test" not four edges. More space-efficient, slightly more complex operations. Used in IP routing, databases.' },
        { question: 'Explain how you might perform wildcard pattern matching using a Trie.', difficulty: 'Hard', answer: 'For "." (any char): at that position, recursively try all children. For "*" (any sequence): complex—try matching 0, 1, 2... characters from current position. Use DFS with backtracking. Optimization: prune branches early when remaining pattern can\'t match. Example: Word Search II uses trie with grid DFS.' },
        { question: 'How would you store additional data (e.g., frequency counts) with each word?', difficulty: 'Hard', answer: 'Add field to node class: count, weight, metadata. Update on insert (increment count), or store at is_end nodes only. For autocomplete: store (frequency, word) pairs, sort by frequency. Can store word itself at end node to avoid reconstruction. Trade-off: more data per node increases memory.' }
      ],

      commonMistakes: [
        'Forgetting to mark is_word = True at end of insert',
        'Confusing search (exact match) with startsWith (prefix)',
        'Not handling empty string edge case',
        'Memory issues: using array[26] instead of hashmap for large alphabets',
        'In Word Search II: not removing words after finding to avoid duplicates',
        'Not backtracking properly in grid-based trie problems',
        'Forgetting that trie stores characters, not whole strings at nodes'
      ],

      tips: [
        'Each node has children map and end-of-word flag',
        'More space efficient than storing all prefixes in hash set',
        'Use for problems involving multiple prefix queries',
        'Can store additional data at nodes (count, word itself)'
      ],

      interviewTips: [
        'Always clarify character set: lowercase only? a-z? Unicode?',
        'Mention tradeoff: array[26] faster but more space vs HashMap flexible',
        'For Word Search II, explain how trie beats checking each word separately',
        'Discuss space optimization: storing words at leaf, compressed trie',
        'Show you understand when trie beats hashmap: prefix queries, sorted iteration',
        'Be ready to implement from scratch - this is common interview ask',
        'For autocomplete: discuss how to return top-k suggestions efficiently'
      ],

      codeExamples: [
        {
          title: 'Basic Trie Implementation',
          language: 'python',
          description: 'Complete trie with insert, search, and startsWith operations.',
          code: `class TrieNode:
    def __init__(self):
        self.children = {}  # char -> TrieNode
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_word = True

    def search(self, word: str) -> bool:
        node = self._find_node(word)
        return node is not None and node.is_word

    def startsWith(self, prefix: str) -> bool:
        return self._find_node(prefix) is not None

    def _find_node(self, prefix: str) -> TrieNode:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node

# Usage:
# trie = Trie()
# trie.insert("apple")
# trie.search("apple")   # True
# trie.search("app")     # False
# trie.startsWith("app") # True`
        },
        {
          title: 'Word Search II - Trie + DFS',
          language: 'python',
          description: 'Find all words from dictionary that exist in a grid. Classic hard problem.',
          code: `def findWords(board, words):
    # Build trie from words
    root = {}
    for word in words:
        node = root
        for char in word:
            node = node.setdefault(char, {})
        node['$'] = word  # Store word at end

    result = []
    rows, cols = len(board), len(board[0])

    def dfs(r, c, node):
        char = board[r][c]
        if char not in node:
            return

        next_node = node[char]

        # Found a word
        if '$' in next_node:
            result.append(next_node['$'])
            del next_node['$']  # Remove to avoid duplicates

        # Mark visited
        board[r][c] = '#'

        # Explore neighbors
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < rows and 0 <= nc < cols:
                dfs(nr, nc, next_node)

        # Restore
        board[r][c] = char

        # Prune: remove empty nodes
        if not next_node:
            del node[char]

    for r in range(rows):
        for c in range(cols):
            dfs(r, c, root)

    return result

# Time: O(m*n*4^L) where L is max word length`
        },
        {
          title: 'Design Add and Search Words (Wildcard)',
          language: 'python',
          description: 'Support "." wildcard that matches any character.',
          code: `class WordDictionary:
    def __init__(self):
        self.root = {}

    def addWord(self, word: str) -> None:
        node = self.root
        for char in word:
            node = node.setdefault(char, {})
        node['$'] = True

    def search(self, word: str) -> bool:
        def dfs(index, node):
            if index == len(word):
                return '$' in node

            char = word[index]

            if char == '.':
                # Try all possible children
                for child in node:
                    if child != '$' and dfs(index + 1, node[child]):
                        return True
                return False
            else:
                if char not in node:
                    return False
                return dfs(index + 1, node[char])

        return dfs(0, self.root)

# Usage:
# dict = WordDictionary()
# dict.addWord("bad")
# dict.addWord("dad")
# dict.search("pad")  # False
# dict.search(".ad")  # True
# dict.search("b..")  # True`
        },
        {
          title: 'Replace Words with Roots',
          language: 'python',
          description: 'Replace words with their shortest root from dictionary.',
          code: `def replaceWords(dictionary, sentence):
    # Build trie from dictionary
    root = {}
    for word in dictionary:
        node = root
        for char in word:
            node = node.setdefault(char, {})
        node['$'] = word  # Store root word

    def find_root(word):
        node = root
        for char in word:
            if char not in node:
                return word  # No root found
            node = node[char]
            if '$' in node:
                return node['$']  # Return shortest root
        return word

    words = sentence.split()
    return ' '.join(find_root(word) for word in words)

# Example:
# dictionary = ["cat", "bat", "rat"]
# sentence = "the cattle was rattled by the battery"
# Output: "the cat was rat by the bat"

# Time: O(n) where n is total characters in sentence`
        }
      ]
    },
    {
      id: 'bit-manipulation',
      title: 'Bit Manipulation',
      icon: 'cpu',
      color: '#8b5cf6',
      questions: 13,
      description: 'Operations on binary representations. XOR, AND, OR, shifts.',

      introduction: `Bit manipulation involves operating directly on the binary representation of numbers using bitwise operators. It's one of the most efficient techniques - operating at the hardware level with O(1) operations.

Master these operators:
• **AND (&)**: Both bits must be 1 → 1 & 1 = 1, otherwise 0
• **OR (|)**: At least one bit is 1 → 0 | 1 = 1
• **XOR (^)**: Different bits → 1 ^ 0 = 1, same bits → 1 ^ 1 = 0
• **NOT (~)**: Flip all bits → ~0 = 1111...1
• **Left shift (<<)**: Multiply by 2^n → 1 << 3 = 8
• **Right shift (>>)**: Divide by 2^n → 8 >> 2 = 2

The magic of XOR:
• a ^ a = 0 (any number XOR itself is 0)
• a ^ 0 = a (any number XOR 0 is itself)
• XOR is commutative and associative

This makes XOR perfect for finding unique elements - pairs cancel out!

Bit manipulation appears in: finding duplicates/missing numbers, efficient math (multiply/divide by powers of 2), state compression in DP, and low-level system programming.`,

      whenToUse: [
        'Finding single/unique number among duplicates',
        'Checking if number is power of two',
        'Counting set bits (Hamming weight)',
        'Generating all subsets (bitmask)',
        'State compression in DP',
        'Swapping without temporary variable',
        'Fast multiplication/division by powers of 2',
        'Checking odd/even (n & 1)',
        'Two numbers appearing once among triplets'
      ],

      keyPatterns: ['XOR tricks', 'Counting bits', 'Power of two', 'Bit masking', 'Brian Kernighan\'s algorithm', 'Subset generation'],
      timeComplexity: 'O(1) for single operations, O(log n) for all bits',
      spaceComplexity: 'O(1)',

      approach: [
        'Identify if problem has XOR pattern (cancel duplicates)',
        'For subset problems, consider bitmask where each bit = include/exclude',
        'Use n & (n-1) to remove lowest set bit (counting, power of 2)',
        'For finding single unique: XOR all elements',
        'For two unique: XOR all → get diff bits → partition by any diff bit',
        'Check bit i: (n >> i) & 1',
        'Set bit i: n | (1 << i)',
        'Clear bit i: n & ~(1 << i)'
      ],

      commonProblems: [
        // Easy
        { name: 'Single Number', difficulty: 'Easy' },
        { name: 'Number of 1 Bits', difficulty: 'Easy' },
        { name: 'Counting Bits', difficulty: 'Easy' },
        { name: 'Reverse Bits', difficulty: 'Easy' },
        { name: 'Missing Number', difficulty: 'Easy' },
        { name: 'Power of Two', difficulty: 'Easy' },
        { name: 'Power of Four', difficulty: 'Easy' },
        { name: 'Binary Watch', difficulty: 'Easy' },
        { name: 'Hamming Distance', difficulty: 'Easy' },
        { name: 'Convert a Number to Hexadecimal', difficulty: 'Easy' },
        { name: 'Add Binary', difficulty: 'Easy' },
        { name: 'Number Complement', difficulty: 'Easy' },
        { name: 'Binary Number with Alternating Bits', difficulty: 'Easy' },
        { name: 'Prime Number of Set Bits in Binary Representation', difficulty: 'Easy' },
        // Medium
        { name: 'Single Number II', difficulty: 'Medium' },
        { name: 'Single Number III', difficulty: 'Medium' },
        { name: 'Sum of Two Integers', difficulty: 'Medium' },
        { name: 'Subsets (using bits)', difficulty: 'Medium' },
        { name: 'Bitwise AND of Numbers Range', difficulty: 'Medium' },
        { name: 'Repeated DNA Sequences', difficulty: 'Medium' },
        { name: 'Gray Code', difficulty: 'Medium' },
        { name: 'Total Hamming Distance', difficulty: 'Medium' },
        { name: 'Maximum XOR of Two Numbers in an Array', difficulty: 'Medium' },
        { name: 'Decode XORed Array', difficulty: 'Easy' },
        { name: 'Decode XORed Permutation', difficulty: 'Medium' },
        { name: 'Find XOR Sum of All Pairs Bitwise AND', difficulty: 'Hard' },
        { name: 'Minimum One Bit Operations to Make Integers Zero', difficulty: 'Hard' },
        // Hard
        { name: 'Maximum XOR With an Element From Array', difficulty: 'Hard' }
      ],

      theoryQuestions: [
        // Junior
        { question: 'What is bit manipulation, and why is it important in software development?', difficulty: 'Easy', answer: 'Bit manipulation operates directly on binary representations using bitwise operators. Important for: O(1) operations on sets (bitmasks), memory efficiency, cryptography, compression, graphics, hardware interfacing. Single CPU instructions—extremely fast. Common patterns: check/set/clear/toggle bits, find single number (XOR), count bits.' },
        { question: 'Explain how the bitwise AND operator (&) works and provide an example.', difficulty: 'Easy', answer: 'AND: returns 1 only if both bits are 1. Example: 5 & 3 = 101 & 011 = 001 = 1. Uses: check if bit set (n & (1<<i)), clear bits (n & mask), extract bits, check even/odd (n & 1). Masking pattern: keep bits where mask is 1. Common: n & (n-1) removes lowest set bit.' },
        { question: 'Explain how the bitwise OR operator (|) works and provide an example.', difficulty: 'Easy', answer: 'OR: returns 1 if either bit is 1. Example: 5 | 3 = 101 | 011 = 111 = 7. Uses: set specific bits (n | (1<<i)), combine flags, union of bit sets. Grows the number (never removes 1s). Common: building bitmask from multiple flags, initializing with defaults.' },
        { question: 'Explain how the bitwise NOT operator (~) works and provide an example.', difficulty: 'Easy', answer: 'NOT: flips all bits (0→1, 1→0). Example: ~5 = ~00000101 = 11111010 = -6 (two\'s complement). Uses: create inverse mask, toggle all bits. Note: ~n = -(n+1) in two\'s complement. Often combined with AND to clear bits: n & ~(1<<i) clears bit i.' },
        { question: 'Explain how the bitwise XOR operator (^) works and provide an example.', difficulty: 'Easy', answer: 'XOR: returns 1 if bits differ. Example: 5 ^ 3 = 101 ^ 011 = 110 = 6. Properties: a^a=0, a^0=a, commutative, associative. Uses: find single number among pairs, swap without temp (a^=b; b^=a; a^=b), toggle bits, simple encryption. Powerful for "appears once" problems.' },
        { question: 'What does the bitwise left shift operator (<<) do, and provide an example.', difficulty: 'Easy', answer: 'Left shift: moves bits left, fills right with zeros. Example: 5 << 2 = 101 << 2 = 10100 = 20. Equivalent to multiply by 2^n. Uses: create mask (1<<i), multiply power of 2 (faster than *), building bit patterns. Overflow: bits shifted out are lost.' },
        { question: 'What does the bitwise right shift operator (>>) do, and provide an example.', difficulty: 'Easy', answer: 'Right shift: moves bits right. Example: 20 >> 2 = 10100 >> 2 = 101 = 5. Equivalent to divide by 2^n (floor). Arithmetic shift: preserves sign (fills with sign bit). Logical shift: fills with zeros. Uses: extract bits ((n>>i)&1), divide by power of 2, iterate through bits.' }
      ],

      commonMistakes: [
        'Forgetting that >> in Python doesn\'t sign-extend (use // for signed)',
        'Off-by-one in bit positions (bit 0 is rightmost)',
        'Not handling negative numbers correctly (two\'s complement)',
        'Using & when you meant && (bitwise vs logical)',
        'Forgetting operator precedence: (n & mask) == 0, need parentheses',
        'Integer overflow when left shifting in some languages',
        'Confusing arithmetic right shift vs logical right shift'
      ],

      tips: [
        'XOR: a ^ a = 0, a ^ 0 = a (find single number)',
        'Check bit: (n >> i) & 1',
        'Set bit: n | (1 << i)',
        'Clear bit: n & ~(1 << i)',
        'n & (n-1) removes lowest set bit'
      ],

      interviewTips: [
        'Know Brian Kernighan\'s algorithm: n & (n-1) removes lowest set bit',
        'Power of 2 check: n > 0 && (n & (n-1)) == 0',
        'For "appears once among triplets": count bits at each position mod 3',
        'XOR of range [0,n] follows pattern: n, 1, n+1, 0 based on n % 4',
        'Mention hardware efficiency: bit ops are single CPU instruction',
        'For interview, draw binary representation to visualize operations',
        'Know how to add without +: use XOR for sum, AND + shift for carry'
      ],

      codeExamples: [
        {
          title: 'Single Number - XOR Magic',
          language: 'python',
          description: 'Every element appears twice except one. Find it in O(n) time, O(1) space.',
          code: `def singleNumber(nums):
    """
    XOR properties:
    - a ^ a = 0 (pairs cancel)
    - a ^ 0 = a (identity)
    - XOR is commutative and associative

    So: a ^ b ^ a ^ c ^ b = c
    """
    result = 0
    for num in nums:
        result ^= num
    return result

# Time: O(n), Space: O(1)
# Example: [4,1,2,1,2] -> 4
# Process: 0^4^1^2^1^2 = 4^(1^1)^(2^2) = 4^0^0 = 4`
        },
        {
          title: 'Single Number III - Two Unique Numbers',
          language: 'python',
          description: 'Two numbers appear once, others twice. Find both.',
          code: `def singleNumberIII(nums):
    """
    1. XOR all → gives xor of two unique numbers (a ^ b)
    2. Find any bit where a and b differ (they must differ somewhere!)
    3. Partition nums by that bit → separates a and b
    4. XOR each partition → get a and b
    """
    # Step 1: XOR all numbers
    xor_all = 0
    for num in nums:
        xor_all ^= num

    # Step 2: Find rightmost set bit (a differs from b here)
    # xor_all & (-xor_all) gets lowest set bit
    diff_bit = xor_all & (-xor_all)

    # Step 3 & 4: Partition and XOR
    a = b = 0
    for num in nums:
        if num & diff_bit:
            a ^= num
        else:
            b ^= num

    return [a, b]

# Time: O(n), Space: O(1)
# Example: [1,2,1,3,2,5] -> [3,5]`
        },
        {
          title: 'Number of 1 Bits (Hamming Weight)',
          language: 'python',
          description: 'Count set bits using Brian Kernighan\'s algorithm.',
          code: `def hammingWeight(n):
    """
    Brian Kernighan's Algorithm:
    n & (n-1) removes the lowest set bit

    Example: n = 12 (1100)
    12 & 11 = 1100 & 1011 = 1000 (8)
    8 & 7 = 1000 & 0111 = 0000 (0)
    Count = 2
    """
    count = 0
    while n:
        n &= (n - 1)  # Remove lowest set bit
        count += 1
    return count

# Time: O(k) where k is number of set bits
# Space: O(1)

# Alternative: count all 32 bits
def hammingWeight_v2(n):
    count = 0
    for i in range(32):
        if (n >> i) & 1:
            count += 1
    return count`
        },
        {
          title: 'Missing Number - XOR with Indices',
          language: 'python',
          description: 'Find missing number in [0,n] using XOR.',
          code: `def missingNumber(nums):
    """
    XOR all numbers [0,n] with all array elements.
    Pairs cancel, leaving missing number.

    Example: [3,0,1] (missing 2)
    XOR: 0^1^2^3 ^ 3^0^1 = (0^0)^(1^1)^2^(3^3) = 2
    """
    n = len(nums)
    result = n  # Start with n (since array indices are 0 to n-1)

    for i, num in enumerate(nums):
        result ^= i ^ num

    return result

# Time: O(n), Space: O(1)

# Alternative using math:
def missingNumber_math(nums):
    n = len(nums)
    expected = n * (n + 1) // 2
    return expected - sum(nums)`
        },
        {
          title: 'Sum of Two Integers Without +',
          language: 'python',
          description: 'Add two numbers using only bit operations.',
          code: `def getSum(a, b):
    """
    XOR gives sum without carry: 5 ^ 3 = 6 (but wrong!)
    AND + shift gives carry: (5 & 3) << 1 = 2

    Repeat until no carry.

    5 + 3:
    Step 1: sum=5^3=6, carry=(5&3)<<1=2
    Step 2: sum=6^2=4, carry=(6&2)<<1=4
    Step 3: sum=4^4=0, carry=(4&4)<<1=8
    Step 4: sum=0^8=8, carry=0 → Done!
    """
    # Handle negative numbers in Python (32-bit mask)
    MASK = 0xFFFFFFFF
    MAX_INT = 0x7FFFFFFF

    while b != 0:
        # Carry: AND then shift
        carry = ((a & b) & MASK) << 1

        # Sum without carry: XOR
        a = (a ^ b) & MASK

        b = carry & MASK

    # Handle negative result in Python
    return a if a <= MAX_INT else ~(a ^ MASK)

# Time: O(1) - max 32 iterations
# Space: O(1)`
        }
      ]
    },
    {
      id: 'math-geometry',
      title: 'Math & Geometry',
      icon: 'puzzle',
      color: '#14b8a6',
      questions: 10,
      description: 'Mathematical algorithms and geometric computations.',

      introduction: `Math and geometry problems test your understanding of fundamental algorithms and mathematical reasoning. These problems often have elegant O(1) or O(log n) solutions once you know the right formula or technique.

Key mathematical concepts:
• **GCD/LCM**: Foundation for fraction simplification, coprime checks
• **Prime Numbers**: Sieve of Eratosthenes, primality testing
• **Modular Arithmetic**: Essential for avoiding overflow in large calculations
• **Fast Exponentiation**: O(log n) power calculation via binary method

Geometry concepts:
• **Cross Product**: Determine orientation (clockwise/counterclockwise)
• **Dot Product**: Project vectors, find angles
• **Line Intersection**: Parametric equations, determinant method
• **Convex Hull**: Graham scan, Jarvis march

Common interview patterns:
• Digit manipulation (reverse integer, palindrome number)
• Random sampling (reservoir sampling, shuffle)
• Coordinate geometry (rectangle overlap, valid square)
• Matrix transformations (rotate, spiral)

The key insight for math problems: look for patterns, use modular arithmetic to avoid overflow, and remember that brute force is often O(n) but smart math gives O(log n) or O(1).`,

      whenToUse: [
        'Number manipulation (reverse, digits, palindrome)',
        'Power/exponentiation calculations',
        'GCD/LCM for fraction operations',
        'Prime number generation or testing',
        'Rectangle/geometric intersection problems',
        'Matrix rotation or transformation',
        'Probability and random sampling',
        'Detecting cycles (Floyd\'s algorithm)',
        'Coordinate geometry problems'
      ],

      keyPatterns: ['GCD/LCM', 'Prime numbers', 'Modular arithmetic', 'Fast exponentiation', 'Cross product', 'Spiral traversal', 'Matrix rotation'],
      timeComplexity: 'Varies by algorithm',
      spaceComplexity: 'Usually O(1)',

      approach: [
        'For power: use binary exponentiation (square and multiply)',
        'For GCD: use Euclidean algorithm gcd(a,b) = gcd(b, a%b)',
        'For primes up to n: Sieve of Eratosthenes O(n log log n)',
        'For large numbers: use modular arithmetic to avoid overflow',
        'For rotation: transpose + reverse (or reverse + transpose)',
        'For spiral: use 4 boundary pointers, shrink after each direction',
        'For geometry: cross product for orientation, dot product for projection'
      ],

      commonProblems: [
        // Easy - Number Theory
        { name: 'Sqrt(x)', difficulty: 'Easy' },
        { name: 'Happy Number', difficulty: 'Easy' },
        { name: 'Plus One', difficulty: 'Easy' },
        { name: 'Fizz Buzz', difficulty: 'Easy' },
        { name: 'Palindrome Number', difficulty: 'Easy' },
        { name: 'Roman to Integer', difficulty: 'Easy' },
        { name: 'Integer to Roman', difficulty: 'Medium' },
        { name: 'Add Digits', difficulty: 'Easy' },
        { name: 'Ugly Number', difficulty: 'Easy' },
        { name: 'Perfect Number', difficulty: 'Easy' },
        { name: 'Excel Sheet Column Number', difficulty: 'Easy' },
        { name: 'Excel Sheet Column Title', difficulty: 'Easy' },
        { name: 'Factorial Trailing Zeroes', difficulty: 'Medium' },
        { name: 'Reverse Integer', difficulty: 'Medium' },
        // Medium - Math
        { name: 'Pow(x, n)', difficulty: 'Medium' },
        { name: 'Count Primes', difficulty: 'Medium' },
        { name: 'Ugly Number II', difficulty: 'Medium' },
        { name: 'Super Ugly Number', difficulty: 'Medium' },
        { name: 'Nth Digit', difficulty: 'Medium' },
        { name: 'Multiply Strings', difficulty: 'Medium' },
        { name: 'Add Two Numbers (Linked List)', difficulty: 'Medium' },
        { name: 'String to Integer (atoi)', difficulty: 'Medium' },
        { name: 'Divide Two Integers', difficulty: 'Medium' },
        { name: 'Fraction to Recurring Decimal', difficulty: 'Medium' },
        { name: 'Basic Calculator II', difficulty: 'Medium' },
        // Medium - Geometry
        { name: 'Rotate Image', difficulty: 'Medium' },
        { name: 'Spiral Matrix', difficulty: 'Medium' },
        { name: 'Spiral Matrix II', difficulty: 'Medium' },
        { name: 'Rectangle Overlap', difficulty: 'Easy' },
        { name: 'Rectangle Area', difficulty: 'Medium' },
        { name: 'Valid Square', difficulty: 'Medium' },
        { name: 'Max Points on a Line', difficulty: 'Hard' },
        { name: 'Minimum Area Rectangle', difficulty: 'Medium' },
        { name: 'K Closest Points to Origin', difficulty: 'Medium' },
        { name: 'Check If It Is a Straight Line', difficulty: 'Easy' },
        // Medium - Random/Sampling
        { name: 'Random Pick with Weight', difficulty: 'Medium' },
        { name: 'Random Pick Index', difficulty: 'Medium' },
        { name: 'Shuffle an Array', difficulty: 'Medium' },
        { name: 'Linked List Random Node', difficulty: 'Medium' },
        // Hard
        { name: 'Largest Number', difficulty: 'Medium' },
        { name: 'Integer to English Words', difficulty: 'Hard' },
        { name: 'Minimum Moves to Equal Array Elements', difficulty: 'Medium' },
        { name: 'Number of Digit One', difficulty: 'Hard' }
      ],

      commonMistakes: [
        'Integer overflow when squaring or multiplying',
        'Not handling negative exponents in power function',
        'Off-by-one in spiral matrix boundaries',
        'Forgetting to handle n=0 edge case',
        'Using floating point for integer square root (precision issues)',
        'Wrong rotation direction (clockwise vs counterclockwise)',
        'Not considering 32-bit vs 64-bit integer limits'
      ],

      tips: [
        'Use Euclidean algorithm for GCD: O(log min(a,b))',
        'Fast exponentiation: Square and multiply for O(log n)',
        'Be careful with integer overflow in multiplication',
        'For geometry, use cross product for orientation'
      ],

      interviewTips: [
        'Always clarify integer constraints (32-bit, 64-bit, BigInteger)',
        'Mention overflow handling explicitly - interviewers look for this',
        'For sqrt(x), binary search is cleaner than Newton-Raphson',
        'Know Euclidean GCD: gcd(a, b) = gcd(b, a % b) until b = 0',
        'For matrix rotation: draw 4x4 example, show index mapping',
        'Modular arithmetic: (a*b) % m = ((a%m) * (b%m)) % m',
        'For primes, mention Sieve vs trial division tradeoffs'
      ],

      codeExamples: [
        {
          title: 'Fast Exponentiation (Binary Method)',
          language: 'python',
          description: 'Calculate x^n in O(log n) time using binary method.',
          code: `def myPow(x, n):
    """
    Binary exponentiation: x^10 = x^8 * x^2
    10 = 1010 in binary → multiply when bit is 1

    For negative n: x^-n = 1/(x^n)
    """
    if n < 0:
        x = 1 / x
        n = -n

    result = 1
    while n > 0:
        # If current bit is 1, multiply result
        if n & 1:
            result *= x

        # Square x for next bit
        x *= x
        n >>= 1  # Move to next bit

    return result

# Time: O(log n), Space: O(1)
# Example: 2^10 = 1024
# 10 = 1010: 2^2 * 2^8 = 4 * 256 = 1024`
        },
        {
          title: 'Sqrt(x) - Binary Search',
          language: 'python',
          description: 'Find integer square root without using built-in functions.',
          code: `def mySqrt(x):
    """
    Binary search for largest k where k^2 <= x
    """
    if x < 2:
        return x

    left, right = 1, x // 2

    while left <= right:
        mid = left + (right - left) // 2
        square = mid * mid

        if square == x:
            return mid
        elif square < x:
            left = mid + 1
        else:
            right = mid - 1

    return right  # Largest k where k^2 <= x

# Time: O(log x), Space: O(1)
# Example: sqrt(8) = 2 (not 2.82...)

# Newton-Raphson (faster convergence):
def mySqrt_newton(x):
    if x < 2:
        return x
    r = x
    while r * r > x:
        r = (r + x // r) // 2
    return r`
        },
        {
          title: 'GCD and LCM',
          language: 'python',
          description: 'Greatest Common Divisor using Euclidean algorithm.',
          code: `def gcd(a, b):
    """
    Euclidean Algorithm:
    gcd(a, b) = gcd(b, a % b) until b = 0

    Example: gcd(48, 18)
    48 % 18 = 12 → gcd(18, 12)
    18 % 12 = 6  → gcd(12, 6)
    12 % 6 = 0   → gcd(6, 0) = 6
    """
    while b:
        a, b = b, a % b
    return a

def lcm(a, b):
    """
    LCM formula: lcm(a,b) = a * b / gcd(a,b)
    Avoid overflow: a // gcd(a,b) * b
    """
    return a // gcd(a, b) * b

# Time: O(log min(a,b)), Space: O(1)

# Useful: GCD of array
def gcd_array(arr):
    from functools import reduce
    return reduce(gcd, arr)

# Example: gcd([12, 18, 24]) = 6`
        },
        {
          title: 'Sieve of Eratosthenes',
          language: 'python',
          description: 'Find all primes up to n efficiently.',
          code: `def countPrimes(n):
    """
    Sieve of Eratosthenes:
    1. Assume all numbers 2..n are prime
    2. For each prime p, mark p*2, p*3, ... as not prime
    3. Optimization: start marking from p^2 (smaller multiples already marked)
    """
    if n < 2:
        return 0

    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False

    # Only need to check up to sqrt(n)
    for i in range(2, int(n ** 0.5) + 1):
        if is_prime[i]:
            # Mark all multiples starting from i^2
            for j in range(i * i, n, i):
                is_prime[j] = False

    return sum(is_prime)

# Time: O(n log log n), Space: O(n)
# Example: countPrimes(10) = 4 (primes: 2,3,5,7)`
        },
        {
          title: 'Rotate Image 90° Clockwise',
          language: 'python',
          description: 'In-place matrix rotation using transpose + reverse.',
          code: `def rotate(matrix):
    """
    90° clockwise = Transpose + Reverse each row

    Original:     Transpose:    Reverse rows:
    1 2 3         1 4 7         7 4 1
    4 5 6    →    2 5 8    →    8 5 2
    7 8 9         3 6 9         9 6 3

    For counterclockwise: Reverse rows first, then transpose
    """
    n = len(matrix)

    # Step 1: Transpose (swap matrix[i][j] with matrix[j][i])
    for i in range(n):
        for j in range(i + 1, n):  # Only upper triangle
            matrix[i][j], matrix[j][i] = matrix[j][i], matrix[i][j]

    # Step 2: Reverse each row
    for row in matrix:
        row.reverse()

# Time: O(n²), Space: O(1)

# Direct formula (for understanding):
# matrix[i][j] → matrix[j][n-1-i]`
        }
      ]
    },
    {
      id: 'matrix',
      title: 'Matrix',
      icon: 'layers',
      color: '#6366f1',
      questions: 7,
      description: 'Two-dimensional array traversal and manipulation.',

      introduction: `Matrix problems involve 2D arrays and test your ability to navigate, transform, and search within grid structures. These problems are common because they combine array manipulation with spatial reasoning.

Key traversal patterns:
• **Row-major**: Process row by row (standard iteration)
• **Column-major**: Process column by column
• **Diagonal**: Process along diagonals
• **Spiral**: Outside-in or inside-out circular pattern
• **Layer by layer**: Process outer ring, then inner rings

Common operations:
• **Rotation**: 90°, 180°, 270° rotations
• **Transpose**: Swap rows and columns
• **Search**: Binary search on sorted matrix
• **Path finding**: DFS/BFS for connected components

Matrix in disguise problems:
• Game boards (Sudoku, Tic-Tac-Toe, Game of Life)
• Image processing (flood fill, filters)
• Grid DP (unique paths, minimum path sum)

The key insight: matrices are just indexed by (row, col) pairs. Master the index transformations for rotation, and use boundary pointers for spiral traversal.`,

      whenToUse: [
        'Image rotation or transformation',
        'Spiral or diagonal traversal',
        'Search in row-wise or column-wise sorted matrix',
        'Connected components in grid (island problems)',
        'Game boards (Sudoku validation, Game of Life)',
        'Path finding with obstacles',
        'Setting rows/columns to zero based on conditions',
        'Matrix multiplication or power'
      ],

      keyPatterns: ['Spiral traversal', 'Rotation', 'Search in sorted matrix', 'Diagonal traversal', 'Layer processing', 'In-place modification'],
      timeComplexity: 'O(m × n) for traversal',
      spaceComplexity: 'O(1) for in-place, O(m × n) for copy',

      approach: [
        'For rotation: transpose then reverse rows (clockwise) or reverse then transpose (counter-clockwise)',
        'For spiral: use 4 boundary pointers (top, bottom, left, right), shrink after each direction',
        'For search in sorted matrix: binary search treating matrix as 1D array, or staircase from corner',
        'For in-place modification: use first row/column as markers',
        'For diagonals: (i + j) is constant for anti-diagonals, (i - j) is constant for main diagonals',
        'For BFS/DFS in grid: track visited cells, check bounds before recursion'
      ],

      commonProblems: [
        // Easy
        { name: 'Transpose Matrix', difficulty: 'Easy' },
        { name: 'Reshape the Matrix', difficulty: 'Easy' },
        { name: 'Toeplitz Matrix', difficulty: 'Easy' },
        { name: 'Flipping an Image', difficulty: 'Easy' },
        { name: 'Cells with Odd Values in a Matrix', difficulty: 'Easy' },
        { name: 'Matrix Cells in Distance Order', difficulty: 'Easy' },
        { name: 'Lucky Numbers in a Matrix', difficulty: 'Easy' },
        { name: 'Special Positions in a Binary Matrix', difficulty: 'Easy' },
        { name: 'Flood Fill', difficulty: 'Easy' },
        { name: 'Island Perimeter', difficulty: 'Easy' },
        { name: 'Richest Customer Wealth', difficulty: 'Easy' },
        { name: 'Find Winner on a Tic Tac Toe Game', difficulty: 'Easy' },
        { name: 'Count Negative Numbers in a Sorted Matrix', difficulty: 'Easy' },
        { name: 'Check If Every Row and Column Contains All Numbers', difficulty: 'Easy' },
        // Medium - Traversal
        { name: 'Rotate Image', difficulty: 'Medium' },
        { name: 'Spiral Matrix', difficulty: 'Medium' },
        { name: 'Spiral Matrix II', difficulty: 'Medium' },
        { name: 'Spiral Matrix III', difficulty: 'Medium' },
        { name: 'Diagonal Traverse', difficulty: 'Medium' },
        { name: 'Diagonal Traverse II', difficulty: 'Medium' },
        { name: 'Print Words Vertically', difficulty: 'Medium' },
        { name: 'Sort the Matrix Diagonally', difficulty: 'Medium' },
        // Medium - Search
        { name: 'Search a 2D Matrix', difficulty: 'Medium' },
        { name: 'Search a 2D Matrix II', difficulty: 'Medium' },
        { name: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium' },
        // Medium - Modification
        { name: 'Set Matrix Zeroes', difficulty: 'Medium' },
        { name: 'Valid Sudoku', difficulty: 'Medium' },
        { name: 'Game of Life', difficulty: 'Medium' },
        { name: 'Maximal Square', difficulty: 'Medium' },
        { name: 'Count Square Submatrices with All Ones', difficulty: 'Medium' },
        { name: 'Range Sum Query 2D - Immutable', difficulty: 'Medium' },
        { name: 'Range Sum Query 2D - Mutable', difficulty: 'Hard' },
        { name: 'Where Will the Ball Fall', difficulty: 'Medium' },
        { name: 'Battleships in a Board', difficulty: 'Medium' },
        // Medium - Grid Problems
        { name: 'Number of Islands', difficulty: 'Medium' },
        { name: 'Max Area of Island', difficulty: 'Medium' },
        { name: 'Surrounded Regions', difficulty: 'Medium' },
        { name: 'Pacific Atlantic Water Flow', difficulty: 'Medium' },
        { name: 'Rotting Oranges', difficulty: 'Medium' },
        { name: '01 Matrix', difficulty: 'Medium' },
        { name: 'Shortest Path in Binary Matrix', difficulty: 'Medium' },
        { name: 'Making A Large Island', difficulty: 'Hard' },
        // Hard
        { name: 'Maximal Rectangle', difficulty: 'Hard' },
        { name: 'Sudoku Solver', difficulty: 'Hard' },
        { name: 'Candy Crush', difficulty: 'Medium' },
        { name: 'Longest Increasing Path in a Matrix', difficulty: 'Hard' },
        { name: 'Shortest Distance from All Buildings', difficulty: 'Hard' },
        { name: 'Best Meeting Point', difficulty: 'Hard' }
      ],

      commonMistakes: [
        'Confusing row and column indices (matrix[row][col])',
        'Off-by-one errors in boundary conditions',
        'Modifying matrix while iterating (need markers or copy)',
        'Wrong rotation direction (clockwise vs counterclockwise)',
        'Not handling rectangular matrices (m != n)',
        'Forgetting to update all 4 boundaries in spiral',
        'Integer overflow when computing linear index from 2D'
      ],

      tips: [
        'For rotation: transpose then reverse rows (or columns)',
        'Spiral: Use 4 pointers for boundaries',
        'In-place modifications may need marker values',
        'Binary search works on row-wise and column-wise sorted matrices'
      ],

      interviewTips: [
        'Draw a small 3x3 or 4x4 example and trace through manually',
        'For rotation, show index mapping: (i,j) → (j, n-1-i) for 90° CW',
        'Clarify if matrix is square (n×n) or rectangular (m×n)',
        'For in-place, use first row/col as markers to save O(m+n) space',
        'Mention staircase search O(m+n) for row+col sorted matrix',
        'For spiral, enumerate the 4 directions and boundary shrinking',
        'Know how to convert 2D index to 1D: index = row * cols + col'
      ],

      codeExamples: [
        {
          title: 'Spiral Matrix Traversal',
          language: 'python',
          description: 'Return all elements in spiral order using boundary pointers.',
          code: `def spiralOrder(matrix):
    """
    Use 4 boundaries: top, bottom, left, right
    Process: right → down → left → up → shrink boundaries
    """
    if not matrix:
        return []

    result = []
    top, bottom = 0, len(matrix) - 1
    left, right = 0, len(matrix[0]) - 1

    while top <= bottom and left <= right:
        # Go right
        for col in range(left, right + 1):
            result.append(matrix[top][col])
        top += 1

        # Go down
        for row in range(top, bottom + 1):
            result.append(matrix[row][right])
        right -= 1

        # Go left (check if row still exists)
        if top <= bottom:
            for col in range(right, left - 1, -1):
                result.append(matrix[bottom][col])
            bottom -= 1

        # Go up (check if column still exists)
        if left <= right:
            for row in range(bottom, top - 1, -1):
                result.append(matrix[row][left])
            left += 1

    return result

# Time: O(m×n), Space: O(1) excluding output`
        },
        {
          title: 'Set Matrix Zeroes In-Place',
          language: 'python',
          description: 'If cell is 0, set entire row and column to 0. O(1) space.',
          code: `def setZeroes(matrix):
    """
    Use first row and first column as markers.
    Track separately if first row/col should be zeroed.
    """
    m, n = len(matrix), len(matrix[0])

    # Check if first row/column need to be zeroed
    first_row_zero = any(matrix[0][j] == 0 for j in range(n))
    first_col_zero = any(matrix[i][0] == 0 for i in range(m))

    # Use first row/col as markers
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] == 0:
                matrix[i][0] = 0
                matrix[0][j] = 0

    # Zero cells based on markers
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][0] == 0 or matrix[0][j] == 0:
                matrix[i][j] = 0

    # Handle first row
    if first_row_zero:
        for j in range(n):
            matrix[0][j] = 0

    # Handle first column
    if first_col_zero:
        for i in range(m):
            matrix[i][0] = 0

# Time: O(m×n), Space: O(1)`
        },
        {
          title: 'Search 2D Matrix II (Staircase)',
          language: 'python',
          description: 'Matrix sorted row-wise and column-wise. O(m+n) search.',
          code: `def searchMatrix(matrix, target):
    """
    Start from top-right (or bottom-left) corner.
    - If current > target: move left (smaller)
    - If current < target: move down (larger)

    This works because:
    - Top-right is largest in row, smallest in column
    - Each move eliminates a row or column
    """
    if not matrix:
        return False

    rows, cols = len(matrix), len(matrix[0])
    row, col = 0, cols - 1  # Start top-right

    while row < rows and col >= 0:
        if matrix[row][col] == target:
            return True
        elif matrix[row][col] > target:
            col -= 1  # Go left (smaller)
        else:
            row += 1  # Go down (larger)

    return False

# Time: O(m + n), Space: O(1)
# Note: For fully sorted matrix (row[i+1] > row[i][-1]),
# use binary search treating as 1D array: O(log(m×n))`
        },
        {
          title: 'Valid Sudoku',
          language: 'python',
          description: 'Check if 9x9 Sudoku board is valid (no duplicates in rows, cols, boxes).',
          code: `def isValidSudoku(board):
    """
    Use sets to track seen numbers in:
    - Each row (9 sets)
    - Each column (9 sets)
    - Each 3x3 box (9 sets, indexed by (row//3, col//3))
    """
    rows = [set() for _ in range(9)]
    cols = [set() for _ in range(9)]
    boxes = [set() for _ in range(9)]

    for i in range(9):
        for j in range(9):
            num = board[i][j]
            if num == '.':
                continue

            # Box index: 0-8, calculated as (row//3)*3 + col//3
            box_idx = (i // 3) * 3 + (j // 3)

            # Check for duplicates
            if num in rows[i] or num in cols[j] or num in boxes[box_idx]:
                return False

            rows[i].add(num)
            cols[j].add(num)
            boxes[box_idx].add(num)

    return True

# Time: O(81) = O(1), Space: O(81) = O(1)
# Note: Box index formula is key insight!`
        },
        {
          title: 'Game of Life - In Place',
          language: 'python',
          description: 'Simulate one step using bit manipulation for state encoding.',
          code: `def gameOfLife(board):
    """
    Encode both current and next state in same cell:
    - 0 (00): dead → dead
    - 1 (01): live → dead
    - 2 (10): dead → live
    - 3 (11): live → live

    Current state: board[i][j] & 1
    Next state: board[i][j] >> 1
    """
    m, n = len(board), len(board[0])

    def count_neighbors(r, c):
        count = 0
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n:
                    count += board[nr][nc] & 1  # Current state
        return count

    # First pass: compute next state
    for i in range(m):
        for j in range(n):
            neighbors = count_neighbors(i, j)
            current = board[i][j] & 1

            if current == 1 and neighbors in [2, 3]:
                board[i][j] = 3  # Live → Live (11)
            elif current == 0 and neighbors == 3:
                board[i][j] = 2  # Dead → Live (10)
            # Other cases: stays 0 or 1 (next state = 0)

    # Second pass: extract next state
    for i in range(m):
        for j in range(n):
            board[i][j] >>= 1

# Time: O(m×n), Space: O(1)`
        }
      ]
    },
    {
      id: 'recursion',
      title: 'Recursion',
      icon: 'refresh',
      color: '#10b981',
      questions: 15,
      description: 'Self-referential problem solving. Foundation for trees, graphs, and DP.',

visualizations: [
        {
          title: 'Recursion Decision Tree',
          language: 'python',
          description: 'Shows recursive call branching for factorial, illustrating base case termination and result propagation back up the tree.',
          svg: '<svg viewBox="0 0 500 250" xmlns="http://www.w3.org/2000/svg" style="background:white"><defs><marker id="ah8" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#64748b"/></marker><marker id="ah8r" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto"><polygon points="8 0, 0 3, 8 6" fill="#10b981"/></marker></defs><text x="20" y="22" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Recursion: factorial(4) Call Stack</text><rect x="90" y="40" width="100" height="30" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="2"/><text x="140" y="60" font-family="monospace" font-size="11" fill="#10b981" text-anchor="middle" font-weight="bold">f(4)</text><line x1="140" y1="70" x2="140" y2="90" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah8)"/><text x="155" y="83" font-family="sans-serif" font-size="9" fill="#64748b">calls</text><rect x="90" y="93" width="100" height="30" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5"/><text x="140" y="113" font-family="monospace" font-size="11" fill="#1e293b" text-anchor="middle">f(3)</text><line x1="140" y1="123" x2="140" y2="143" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah8)"/><rect x="90" y="146" width="100" height="30" rx="6" fill="#f0fdf4" stroke="#10b981" stroke-width="1.5"/><text x="140" y="166" font-family="monospace" font-size="11" fill="#1e293b" text-anchor="middle">f(2)</text><line x1="140" y1="176" x2="140" y2="196" stroke="#64748b" stroke-width="1.5" marker-end="url(#ah8)"/><rect x="90" y="199" width="100" height="30" rx="6" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/><text x="140" y="219" font-family="monospace" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">f(1)=1</text><text x="60" y="219" font-family="sans-serif" font-size="9" fill="#f59e0b" text-anchor="end">base case!</text><line x1="200" y1="214" x2="250" y2="214" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah8)"/><text x="270" y="218" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">returns 1</text><line x1="200" y1="161" x2="250" y2="161" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah8)"/><text x="270" y="165" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">2 * 1 = 2</text><line x1="200" y1="108" x2="250" y2="108" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah8)"/><text x="270" y="112" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">3 * 2 = 6</text><line x1="200" y1="55" x2="250" y2="55" stroke="#10b981" stroke-width="1.5" marker-end="url(#ah8)"/><text x="270" y="59" font-family="sans-serif" font-size="10" fill="#10b981" font-weight="bold">4 * 6 = 24</text><rect x="340" y="40" width="130" height="30" rx="6" fill="#dcfce7" stroke="#10b981" stroke-width="2"/><text x="405" y="60" font-family="monospace" font-size="12" fill="#10b981" text-anchor="middle" font-weight="bold">Result: 24</text><text x="20" y="248" font-family="sans-serif" font-size="11" fill="#64748b">Each call waits on the stack until its sub-call returns | Space: O(n) call stack depth</text></svg>'
        }
      ],

      introduction: `Recursion is a problem-solving technique where a function calls itself to solve smaller instances of the same problem. It's the foundation for understanding trees, graphs, divide and conquer, and dynamic programming.

Every recursive solution has two essential parts:
• **Base Case(s)**: The simplest case(s) that can be solved directly without recursion
• **Recursive Case**: Breaking the problem into smaller subproblems and calling the function on them

The magic of recursion: you trust that the recursive call works correctly, then just handle how to combine results.

How to think recursively:
1. What is the smallest/simplest input? (Base case)
2. How can I reduce this problem to a smaller version of itself?
3. How do I combine results from subproblems?

Recursion vs Iteration:
• Every recursive solution can be converted to iterative (and vice versa)
• Recursion uses call stack space (can cause stack overflow)
• Recursion is more natural for tree/graph traversal
• Tail recursion can be optimized by some compilers to use O(1) space

Understanding recursion deeply unlocks: binary tree problems, divide and conquer, backtracking, and dynamic programming.`,

      whenToUse: [
        'Tree and graph traversal',
        'Divide and conquer algorithms (merge sort, quick sort)',
        'Generating all combinations/permutations',
        'Problems with natural recursive structure',
        'When problem can be broken into similar subproblems',
        'String manipulation (palindrome, reverse)',
        'Mathematical sequences (Fibonacci, factorial)',
        'Exploring all possibilities (backtracking)'
      ],

      keyPatterns: ['Base case + recursive case', 'Divide and conquer', 'Tail recursion', 'Memoization', 'Trust the recursion'],
      timeComplexity: 'Depends on branching factor and depth',
      spaceComplexity: 'O(depth) for call stack',

      approach: [
        'Identify the base case(s) - simplest input that can be solved directly',
        'Define the recursive case - how to break into smaller subproblems',
        'Trust the recursion: assume recursive calls return correct answers',
        'Combine results from subproblems to solve original problem',
        'Draw recursion tree to understand complexity',
        'Add memoization if overlapping subproblems exist',
        'Consider converting to iteration for deep recursion (stack overflow)'
      ],

      commonProblems: [
        // Easy
        { name: 'Fibonacci Number', difficulty: 'Easy' },
        { name: 'Climbing Stairs', difficulty: 'Easy' },
        { name: 'Reverse String', difficulty: 'Easy' },
        { name: 'Swap Nodes in Pairs', difficulty: 'Medium' },
        { name: 'Power of Two', difficulty: 'Easy' },
        { name: 'Power of Three', difficulty: 'Easy' },
        { name: 'Power of Four', difficulty: 'Easy' },
        { name: 'Merge Two Sorted Lists', difficulty: 'Easy' },
        { name: 'Maximum Depth of Binary Tree', difficulty: 'Easy' },
        { name: 'Same Tree', difficulty: 'Easy' },
        { name: 'Invert Binary Tree', difficulty: 'Easy' },
        // Medium
        { name: 'Generate Parentheses', difficulty: 'Medium' },
        { name: 'Pow(x, n)', difficulty: 'Medium' },
        { name: 'Sort List (Merge Sort)', difficulty: 'Medium' },
        { name: 'Subsets', difficulty: 'Medium' },
        { name: 'Permutations', difficulty: 'Medium' },
        { name: 'Combinations', difficulty: 'Medium' },
        { name: 'Combination Sum', difficulty: 'Medium' },
        { name: 'Letter Combinations of Phone Number', difficulty: 'Medium' },
        { name: 'Validate Binary Search Tree', difficulty: 'Medium' },
        { name: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium' },
        { name: 'Flatten Binary Tree to Linked List', difficulty: 'Medium' },
        { name: 'Lowest Common Ancestor of Binary Tree', difficulty: 'Medium' },
        { name: 'Decode String', difficulty: 'Medium' },
        { name: 'Target Sum', difficulty: 'Medium' },
        { name: 'Word Search', difficulty: 'Medium' },
        { name: 'K-th Symbol in Grammar', difficulty: 'Medium' },
        { name: 'Different Ways to Add Parentheses', difficulty: 'Medium' },
        // Hard
        { name: 'Merge K Sorted Lists', difficulty: 'Hard' },
        { name: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
        { name: 'Regular Expression Matching', difficulty: 'Hard' },
        { name: 'Strobogrammatic Number III', difficulty: 'Hard' }
      ],

      commonMistakes: [
        'Missing or incorrect base case(s)',
        'Not making progress toward base case (infinite recursion)',
        'Returning wrong value from base case',
        'Not trusting the recursion - trying to trace every call',
        'Forgetting to return recursive result',
        'Creating too many copies of data structures',
        'Stack overflow from deep recursion'
      ],

      tips: [
        'Always define base case(s) first',
        'Trust the recursion: assume recursive calls work correctly',
        'Draw recursion tree to understand complexity',
        'Convert to iteration if stack overflow is concern'
      ],

      interviewTips: [
        'Start with base case(s), then recursive case',
        'Draw recursion tree for 2-3 levels to verify correctness',
        'Mention time/space complexity including stack space',
        'Know how to convert recursive to iterative (for follow-up)',
        'Discuss memoization if you see repeated subproblems',
        'For tree problems: explain left-right-root vs root-left-right order',
        'Tail recursion mention shows depth: "can be optimized to O(1) space"'
      ],

      codeExamples: [
        {
          title: 'Understanding Recursion - Factorial',
          language: 'python',
          description: 'Classic example showing base case and recursive case.',
          code: `def factorial(n):
    """
    Base case: n <= 1 → return 1
    Recursive case: n! = n * (n-1)!

    Trust: factorial(n-1) correctly computes (n-1)!
    """
    # Base case
    if n <= 1:
        return 1

    # Recursive case
    return n * factorial(n - 1)

# Trace for factorial(4):
# factorial(4) = 4 * factorial(3)
#              = 4 * (3 * factorial(2))
#              = 4 * (3 * (2 * factorial(1)))
#              = 4 * (3 * (2 * 1))
#              = 24

# Time: O(n), Space: O(n) call stack`
        },
        {
          title: 'Divide and Conquer - Merge Sort',
          language: 'python',
          description: 'Classic divide and conquer recursion pattern.',
          code: `def merge_sort(arr):
    """
    Divide: Split array in half
    Conquer: Recursively sort each half
    Combine: Merge two sorted halves
    """
    # Base case
    if len(arr) <= 1:
        return arr

    # Divide
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])   # Trust: returns sorted left
    right = merge_sort(arr[mid:])  # Trust: returns sorted right

    # Combine (merge sorted halves)
    return merge(left, right)

def merge(left, right):
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    return result + left[i:] + right[j:]

# Time: O(n log n), Space: O(n)`
        },
        {
          title: 'Generate All Parentheses',
          language: 'python',
          description: 'Recursive generation with constraints.',
          code: `def generateParenthesis(n):
    """
    At each step, we can:
    - Add '(' if open_count < n
    - Add ')' if close_count < open_count

    Base case: string length == 2*n
    """
    result = []

    def backtrack(current, open_count, close_count):
        # Base case: complete valid parentheses
        if len(current) == 2 * n:
            result.append(current)
            return

        # Add '(' if we haven't used all
        if open_count < n:
            backtrack(current + '(', open_count + 1, close_count)

        # Add ')' if we have unmatched '('
        if close_count < open_count:
            backtrack(current + ')', open_count, close_count + 1)

    backtrack('', 0, 0)
    return result

# Time: O(4^n / √n) - Catalan number
# Space: O(n) for recursion depth`
        },
        {
          title: 'Fibonacci with Memoization',
          language: 'python',
          description: 'Converting exponential recursion to linear with memoization.',
          code: `# Naive recursion: O(2^n) - BAD!
def fib_naive(n):
    if n <= 1:
        return n
    return fib_naive(n-1) + fib_naive(n-2)

# With memoization: O(n) - GOOD!
def fib_memo(n, memo={}):
    if n in memo:
        return memo[n]
    if n <= 1:
        return n
    memo[n] = fib_memo(n-1, memo) + fib_memo(n-2, memo)
    return memo[n]

# Using functools (cleaner)
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

# Iterative (no stack overflow)
def fib_iterative(n):
    if n <= 1:
        return n
    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr`
        },
        {
          title: 'Letter Combinations of Phone',
          language: 'python',
          description: 'Generate all combinations recursively.',
          code: `def letterCombinations(digits):
    """
    Recursively build all combinations.
    Each digit adds 3-4 options (branching factor).
    """
    if not digits:
        return []

    phone = {
        '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
        '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz'
    }

    result = []

    def backtrack(index, current):
        # Base case: used all digits
        if index == len(digits):
            result.append(current)
            return

        # Try each letter for current digit
        for letter in phone[digits[index]]:
            backtrack(index + 1, current + letter)

    backtrack(0, '')
    return result

# Time: O(4^n) where n = len(digits)
# Space: O(n) recursion depth

# Example: "23" -> ["ad","ae","af","bd","be","bf","cd","ce","cf"]`
        }
      ,
        {
          title: 'Understanding Recursion - Factorial',
          language: 'javascript',
          description: 'Classic example showing base case and recursive case.',
          code: `function factorial(n) {
    // Base case
    if (n <= 1) return 1;

    // Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1);
}

// Trace for factorial(4):
// factorial(4) = 4 * factorial(3)
//              = 4 * (3 * factorial(2))
//              = 4 * (3 * (2 * factorial(1)))
//              = 4 * (3 * (2 * 1))
//              = 24

// Time: O(n), Space: O(n) call stack`
        },
        {
          title: 'Understanding Recursion - Factorial',
          language: 'java',
          description: 'Classic example showing base case and recursive case.',
          code: `public int factorial(int n) {
    // Base case
    if (n <= 1) return 1;

    // Recursive case: n! = n * (n-1)!
    return n * factorial(n - 1);
}

// Trace for factorial(4):
// factorial(4) = 4 * factorial(3)
//              = 4 * (3 * factorial(2))
//              = 4 * (3 * (2 * factorial(1)))
//              = 4 * (3 * (2 * 1))
//              = 24

// Time: O(n), Space: O(n) call stack`
        },
        {
          title: 'Divide and Conquer - Merge Sort',
          language: 'javascript',
          description: 'Classic divide and conquer recursion pattern.',
          code: `function mergeSort(arr) {
    if (arr.length <= 1) return arr;

    const mid = Math.floor(arr.length / 2);
    const left = mergeSort(arr.slice(0, mid));
    const right = mergeSort(arr.slice(mid));

    return merge(left, right);
}

function merge(left, right) {
    const result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) result.push(left[i++]);
        else result.push(right[j++]);
    }
    return [...result, ...left.slice(i), ...right.slice(j)];
}
// Time: O(n log n), Space: O(n)`
        },
        {
          title: 'Divide and Conquer - Merge Sort',
          language: 'java',
          description: 'Classic divide and conquer recursion pattern.',
          code: `public void mergeSort(int[] arr, int left, int right) {
    if (left >= right) return;

    int mid = left + (right - left) / 2;
    mergeSort(arr, left, mid);
    mergeSort(arr, mid + 1, right);
    merge(arr, left, mid, right);
}

private void merge(int[] arr, int left, int mid, int right) {
    int[] temp = Arrays.copyOfRange(arr, left, right + 1);
    int i = 0, j = mid - left + 1, k = left;

    while (i <= mid - left && j <= right - left) {
        if (temp[i] <= temp[j]) arr[k++] = temp[i++];
        else arr[k++] = temp[j++];
    }
    while (i <= mid - left) arr[k++] = temp[i++];
    while (j <= right - left) arr[k++] = temp[j++];
}
// Time: O(n log n), Space: O(n)`
        },
        {
          title: 'Generate All Parentheses',
          language: 'javascript',
          description: 'Recursive generation with constraints.',
          code: `function generateParenthesis(n) {
    const result = [];

    function backtrack(current, openCount, closeCount) {
        if (current.length === 2 * n) {
            result.push(current);
            return;
        }
        if (openCount < n) backtrack(current + '(', openCount + 1, closeCount);
        if (closeCount < openCount) backtrack(current + ')', openCount, closeCount + 1);
    }
    backtrack('', 0, 0);
    return result;
}
// Time: O(4^n / sqrt(n)), Space: O(n) recursion depth`
        },
        {
          title: 'Generate All Parentheses',
          language: 'java',
          description: 'Recursive generation with constraints.',
          code: `public List<String> generateParenthesis(int n) {
    List<String> result = new ArrayList<>();
    backtrack(result, new StringBuilder(), 0, 0, n);
    return result;
}

private void backtrack(List<String> result, StringBuilder current,
                       int open, int close, int n) {
    if (current.length() == 2 * n) {
        result.add(current.toString());
        return;
    }
    if (open < n) { current.append('('); backtrack(result, current, open + 1, close, n); current.deleteCharAt(current.length() - 1); }
    if (close < open) { current.append(')'); backtrack(result, current, open, close + 1, n); current.deleteCharAt(current.length() - 1); }
}
// Time: O(4^n / sqrt(n)), Space: O(n)`
        },
        {
          title: 'Fibonacci with Memoization',
          language: 'javascript',
          description: 'Converting exponential recursion to linear with memoization.',
          code: `// Naive recursion: O(2^n) - BAD!
function fibNaive(n) {
    if (n <= 1) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}

// With memoization: O(n) - GOOD!
function fibMemo(n, memo = {}) {
    if (n in memo) return memo[n];
    if (n <= 1) return n;
    memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
    return memo[n];
}

// Iterative (no stack overflow)
function fibIterative(n) {
    if (n <= 1) return n;
    let prev = 0, curr = 1;
    for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];
    return curr;
}`
        },
        {
          title: 'Fibonacci with Memoization',
          language: 'java',
          description: 'Converting exponential recursion to linear with memoization.',
          code: `// Naive recursion: O(2^n) - BAD!
public int fibNaive(int n) {
    if (n <= 1) return n;
    return fibNaive(n - 1) + fibNaive(n - 2);
}

// With memoization: O(n) - GOOD!
private Map<Integer, Integer> memo = new HashMap<>();
public int fibMemo(int n) {
    if (memo.containsKey(n)) return memo.get(n);
    if (n <= 1) return n;
    int result = fibMemo(n - 1) + fibMemo(n - 2);
    memo.put(n, result);
    return result;
}

// Iterative (no stack overflow)
public int fibIterative(int n) {
    if (n <= 1) return n;
    int prev = 0, curr = 1;
    for (int i = 2; i <= n; i++) { int temp = curr; curr += prev; prev = temp; }
    return curr;
}`
        },
        {
          title: 'Letter Combinations of Phone',
          language: 'javascript',
          description: 'Generate all combinations recursively.',
          code: `function letterCombinations(digits) {
    if (!digits) return [];
    const phone = { '2':'abc','3':'def','4':'ghi','5':'jkl','6':'mno','7':'pqrs','8':'tuv','9':'wxyz' };
    const result = [];

    function backtrack(index, current) {
        if (index === digits.length) { result.push(current); return; }
        for (const letter of phone[digits[index]]) {
            backtrack(index + 1, current + letter);
        }
    }
    backtrack(0, '');
    return result;
}
// Time: O(4^n), Space: O(n) recursion depth`
        },
        {
          title: 'Letter Combinations of Phone',
          language: 'java',
          description: 'Generate all combinations recursively.',
          code: `public List<String> letterCombinations(String digits) {
    if (digits.isEmpty()) return new ArrayList<>();
    Map<Character, String> phone = Map.of('2',"abc",'3',"def",'4',"ghi",
        '5',"jkl",'6',"mno",'7',"pqrs",'8',"tuv",'9',"wxyz");
    List<String> result = new ArrayList<>();
    backtrack(digits, 0, new StringBuilder(), phone, result);
    return result;
}

private void backtrack(String digits, int index, StringBuilder current,
                       Map<Character, String> phone, List<String> result) {
    if (index == digits.length()) { result.add(current.toString()); return; }
    for (char letter : phone.get(digits.charAt(index)).toCharArray()) {
        current.append(letter);
        backtrack(digits, index + 1, current, phone, result);
        current.deleteCharAt(current.length() - 1);
    }
}
// Time: O(4^n), Space: O(n)`
        }
      ]
    },
    {
      id: 'sorting',
      title: 'Sorting Algorithms',
      icon: 'chartBar',
      color: '#f59e0b',
      questions: 18,
      description: 'Comparison and non-comparison based sorting techniques.',

      introduction: `Sorting is a fundamental operation that arranges elements in a specific order. Understanding sorting algorithms is crucial because:
1. Many problems become easier after sorting (binary search, two pointers)
2. Sorting is often a key step in algorithms (greedy, intervals)
3. Custom comparators enable complex sorting logic

Comparison-based sorting (O(n log n) lower bound):
• **Merge Sort**: Stable, guaranteed O(n log n), but O(n) space
• **Quick Sort**: In-place, average O(n log n), worst O(n²)
• **Heap Sort**: In-place, guaranteed O(n log n), not stable

Non-comparison sorting (can beat O(n log n)):
• **Counting Sort**: O(n + k) for integers in range [0, k]
• **Radix Sort**: O(d × (n + k)) for d-digit numbers
• **Bucket Sort**: O(n) average for uniformly distributed data

Stability: A sort is stable if equal elements maintain their relative order. Important when sorting by multiple keys.

In interviews, you'll rarely implement sort from scratch. Instead, focus on:
• Choosing the right algorithm for the situation
• Writing custom comparators
• Understanding when pre-sorting helps the overall algorithm`,

      whenToUse: [
        'Pre-processing for binary search or two pointers',
        'Interval problems (merge, schedule)',
        'Finding kth element (quick select)',
        'Custom ordering (largest number, alien dictionary)',
        'Reducing search space',
        'Meeting room scheduling',
        'When O(n log n) pre-processing saves repeated O(n) searches',
        'Grouping related elements together'
      ],

      keyPatterns: ['Merge sort', 'Quick sort', 'Heap sort', 'Counting sort', 'Radix sort', 'Custom comparators', 'Quick select'],
      timeComplexity: 'O(n log n) comparison-based, O(n) for counting/radix',
      spaceComplexity: 'O(n) merge sort, O(log n) quick sort, O(1) heap sort',

      approach: [
        'Determine if sorting helps simplify the problem',
        'Choose algorithm based on constraints (space, stability, worst case)',
        'For custom ordering: define comparison function clearly',
        'Consider partial sorting (kth element) if full sort not needed',
        'Use built-in sort with custom key/comparator when possible',
        'For integers in limited range: consider counting sort',
        'Remember: sorting is O(n log n), often acceptable overhead'
      ],

      commonProblems: [
        // Easy
        { name: 'Merge Sorted Array', difficulty: 'Easy' },
        { name: 'Squares of a Sorted Array', difficulty: 'Easy' },
        { name: 'Valid Anagram', difficulty: 'Easy' },
        { name: 'Contains Duplicate', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays', difficulty: 'Easy' },
        { name: 'Intersection of Two Arrays II', difficulty: 'Easy' },
        { name: 'Relative Sort Array', difficulty: 'Easy' },
        { name: 'Height Checker', difficulty: 'Easy' },
        { name: 'Sort Array By Parity', difficulty: 'Easy' },
        { name: 'Sort Array By Parity II', difficulty: 'Easy' },
        // Medium - Core Sorting
        { name: 'Sort an Array', difficulty: 'Medium' },
        { name: 'Sort Colors', difficulty: 'Medium' },
        { name: 'Sort List', difficulty: 'Medium' },
        { name: 'Insertion Sort List', difficulty: 'Medium' },
        { name: 'Wiggle Sort II', difficulty: 'Medium' },
        // Medium - Custom Comparators
        { name: 'Largest Number', difficulty: 'Medium' },
        { name: 'Custom Sort String', difficulty: 'Medium' },
        { name: 'Queue Reconstruction by Height', difficulty: 'Medium' },
        { name: 'Sort Characters By Frequency', difficulty: 'Medium' },
        { name: 'Group Anagrams', difficulty: 'Medium' },
        { name: 'Reorder Data in Log Files', difficulty: 'Medium' },
        // Medium - Selection/Partitioning
        { name: 'Kth Largest Element in an Array', difficulty: 'Medium' },
        { name: 'Top K Frequent Elements', difficulty: 'Medium' },
        { name: 'Top K Frequent Words', difficulty: 'Medium' },
        { name: 'K Closest Points to Origin', difficulty: 'Medium' },
        { name: 'Find K Closest Elements', difficulty: 'Medium' },
        // Medium - Merge/Intervals
        { name: 'Merge Intervals', difficulty: 'Medium' },
        { name: 'Insert Interval', difficulty: 'Medium' },
        { name: 'Meeting Rooms II', difficulty: 'Medium' },
        { name: 'Car Fleet', difficulty: 'Medium' },
        // Hard
        { name: 'Merge K Sorted Lists', difficulty: 'Hard' },
        { name: 'Median of Two Sorted Arrays', difficulty: 'Hard' },
        { name: 'Maximum Gap', difficulty: 'Hard' }
      ],

      commonMistakes: [
        'Not handling empty array or single element',
        'Wrong partition logic in quicksort (off-by-one)',
        'Forgetting to handle duplicates in custom comparator',
        'Using unstable sort when stability matters',
        'Integer overflow in custom comparator',
        'Not considering worst case for quicksort',
        'Comparing strings numerically (use custom comparator)'
      ],

      tips: [
        'Merge sort: Stable, guaranteed O(n log n), needs O(n) space',
        'Quick sort: In-place, O(n log n) average, O(n²) worst',
        'Use counting sort for limited range integers',
        'Custom comparators for complex sorting criteria'
      ],

      interviewTips: [
        'Know complexity and tradeoffs of major algorithms',
        'Python: sorted() with key parameter, or functools.cmp_to_key',
        'Java: Collections.sort with Comparator, Arrays.sort',
        'For "top K" problems, consider heap O(n log k) vs sort O(n log n)',
        'Quick select is O(n) average for kth element',
        'Dutch National Flag for 3-way partitioning (Sort Colors)',
        'Mention stability when relevant: "Merge sort is stable..."'
      ],

      codeExamples: [
        {
          title: 'Quick Sort - In-Place',
          language: 'python',
          description: 'Partition-based sorting with Lomuto scheme.',
          code: `def quicksort(arr, low=0, high=None):
    """
    Choose pivot, partition so elements < pivot are left,
    elements > pivot are right, then recurse.
    """
    if high is None:
        high = len(arr) - 1

    if low < high:
        pivot_idx = partition(arr, low, high)
        quicksort(arr, low, pivot_idx - 1)
        quicksort(arr, pivot_idx + 1, high)

def partition(arr, low, high):
    """Lomuto partition: pivot is last element"""
    pivot = arr[high]
    i = low - 1  # Index of smaller element

    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]

    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

# Time: O(n log n) average, O(n²) worst
# Space: O(log n) for recursion stack
# Note: Randomize pivot to avoid worst case`
        },
        {
          title: 'Quick Select - Kth Element in O(n)',
          language: 'python',
          description: 'Find kth largest/smallest without full sort.',
          code: `def findKthLargest(nums, k):
    """
    Quick select: partition once, recurse on correct half.
    Average O(n), worst O(n²).
    """
    k = len(nums) - k  # Convert to kth smallest

    def quickselect(left, right):
        pivot_idx = partition(nums, left, right)

        if pivot_idx == k:
            return nums[k]
        elif pivot_idx < k:
            return quickselect(pivot_idx + 1, right)
        else:
            return quickselect(left, pivot_idx - 1)

    return quickselect(0, len(nums) - 1)

def partition(nums, left, right):
    pivot = nums[right]
    i = left
    for j in range(left, right):
        if nums[j] <= pivot:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
    nums[i], nums[right] = nums[right], nums[i]
    return i

# Alternative: Use heap for O(n log k)
import heapq
def findKthLargest_heap(nums, k):
    return heapq.nlargest(k, nums)[-1]`
        },
        {
          title: 'Sort Colors - Dutch National Flag',
          language: 'python',
          description: 'Three-way partitioning in single pass.',
          code: `def sortColors(nums):
    """
    Dutch National Flag algorithm:
    - 0s on left, 1s in middle, 2s on right
    - Three pointers: low, mid, high

    Process:
    - 0: swap with low, move both low and mid right
    - 1: just move mid right
    - 2: swap with high, move high left (don't move mid!)
    """
    low, mid, high = 0, 0, len(nums) - 1

    while mid <= high:
        if nums[mid] == 0:
            nums[low], nums[mid] = nums[mid], nums[low]
            low += 1
            mid += 1
        elif nums[mid] == 1:
            mid += 1
        else:  # nums[mid] == 2
            nums[mid], nums[high] = nums[high], nums[mid]
            high -= 1
            # Don't increment mid! New element needs checking

# Time: O(n), Space: O(1)
# Single pass, in-place`
        },
        {
          title: 'Largest Number - Custom Comparator',
          language: 'python',
          description: 'Form largest number by custom string comparison.',
          code: `def largestNumber(nums):
    """
    Custom comparator: a+b vs b+a
    Example: 3 vs 30
    "330" > "303", so 3 should come before 30
    """
    from functools import cmp_to_key

    def compare(a, b):
        # Return negative if a should come first
        # Return positive if b should come first
        if a + b > b + a:
            return -1
        elif a + b < b + a:
            return 1
        return 0

    # Convert to strings
    nums = [str(n) for n in nums]

    # Sort with custom comparator
    nums.sort(key=cmp_to_key(compare))

    # Handle leading zeros
    result = ''.join(nums)
    return '0' if result[0] == '0' else result

# Example: [3, 30, 34, 5, 9] -> "9534330"
# Time: O(n log n), where comparison is O(k) for k digits`
        },
        {
          title: 'Counting Sort - O(n) for Limited Range',
          language: 'python',
          description: 'Non-comparison sort for integers in known range.',
          code: `def counting_sort(arr, max_val=None):
    """
    Count occurrences of each value, then reconstruct.
    Works for non-negative integers in range [0, k].
    """
    if not arr:
        return arr

    if max_val is None:
        max_val = max(arr)

    # Count occurrences
    count = [0] * (max_val + 1)
    for num in arr:
        count[num] += 1

    # Reconstruct sorted array
    result = []
    for num, freq in enumerate(count):
        result.extend([num] * freq)

    return result

# Time: O(n + k), Space: O(k)
# k = range of values

# Use case: Sort array where elements are in range [0, 100]
# Much faster than O(n log n) when k << n`
        }
      ]
    },
    {
      id: 'intervals',
      title: 'Intervals',
      icon: 'chartBar',
      color: '#84cc16',
      questions: 5,
      description: 'Problems involving ranges and overlapping segments.',

      introduction: `Interval problems involve operations on ranges or segments, often requiring merging, insertion, or conflict detection. These problems appear frequently in scheduling, calendar, and resource allocation contexts.

Key concepts:
• **Overlap detection**: Two intervals [a, b] and [c, d] overlap if a < d AND c < b
• **Sorting strategy**: Sort by start time (merging) or end time (scheduling)
• **Sweep line**: Process events (start/end) in sorted order

Common patterns:
1. **Merge Intervals**: Combine overlapping intervals
2. **Insert Interval**: Add new interval and merge if needed
3. **Meeting Rooms**: Can all meetings fit? How many rooms needed?
4. **Interval Scheduling**: Maximize non-overlapping intervals (greedy)
5. **Minimum Removals**: Remove fewest intervals to eliminate overlaps

The key insight: sorting transforms interval problems into linear scans. Sort by start time for merging, end time for scheduling/greedy selection.

Sweep line technique: Instead of treating intervals as wholes, process START and END events separately in sorted order. This handles complex queries like "maximum overlapping at any point."`,

      whenToUse: [
        'Merging overlapping ranges',
        'Meeting room scheduling',
        'Calendar conflict detection',
        'Resource allocation problems',
        'Interval coverage problems',
        'Time slot availability',
        'Finding gaps between intervals',
        'Maximum concurrent events'
      ],

      keyPatterns: ['Merge intervals', 'Insert interval', 'Meeting rooms', 'Interval scheduling', 'Sweep line', 'Min heap for end times'],
      timeComplexity: 'O(n log n) after sorting',
      spaceComplexity: 'O(n) for result',

      approach: [
        'Sort intervals by start time (usually) or end time (greedy scheduling)',
        'For merging: track last interval, extend or add new',
        'For overlap check: a.start < b.end AND b.start < a.end',
        'For meeting rooms: use min heap of end times, or sweep line',
        'For greedy (max non-overlapping): sort by END time, greedily pick',
        'For complex queries: use sweep line with event processing',
        'Consider edge cases: touching intervals [1,2] and [2,3]'
      ],

      commonProblems: [
        // Easy
        { name: 'Meeting Rooms', difficulty: 'Easy' },
        { name: 'Summary Ranges', difficulty: 'Easy' },
        // Medium - Core Interval
        { name: 'Merge Intervals', difficulty: 'Medium' },
        { name: 'Insert Interval', difficulty: 'Medium' },
        { name: 'Meeting Rooms II', difficulty: 'Medium' },
        { name: 'Non-overlapping Intervals', difficulty: 'Medium' },
        { name: 'Minimum Number of Arrows to Burst Balloons', difficulty: 'Medium' },
        { name: 'Interval List Intersections', difficulty: 'Medium' },
        { name: 'Remove Covered Intervals', difficulty: 'Medium' },
        { name: 'Partition Labels', difficulty: 'Medium' },
        // Medium - Calendar/Scheduling
        { name: 'My Calendar I', difficulty: 'Medium' },
        { name: 'My Calendar II', difficulty: 'Medium' },
        { name: 'My Calendar III', difficulty: 'Hard' },
        { name: 'Car Pooling', difficulty: 'Medium' },
        { name: 'Corporate Flight Bookings', difficulty: 'Medium' },
        { name: 'Range Addition', difficulty: 'Medium' },
        { name: 'Video Stitching', difficulty: 'Medium' },
        // Medium - Range Coverage
        { name: 'Missing Ranges', difficulty: 'Easy' },
        { name: 'Add Bold Tag in String', difficulty: 'Medium' },
        { name: 'Data Stream as Disjoint Intervals', difficulty: 'Hard' },
        { name: 'Maximum Number of Events That Can Be Attended', difficulty: 'Medium' },
        { name: 'Maximum Number of Events That Can Be Attended II', difficulty: 'Hard' },
        // Hard
        { name: 'Employee Free Time', difficulty: 'Hard' },
        { name: 'The Skyline Problem', difficulty: 'Hard' },
        { name: 'Rectangle Area II', difficulty: 'Hard' },
        { name: 'Falling Squares', difficulty: 'Hard' }
      ],

      commonMistakes: [
        'Sorting by wrong attribute (start vs end)',
        'Off-by-one in overlap check (< vs <=)',
        'Not handling touching intervals correctly',
        'Forgetting to sort before processing',
        'Modifying intervals while iterating',
        'Not considering empty input',
        'Using wrong comparison for min heap'
      ],

      tips: [
        'Sort by start time (or end time depending on problem)',
        'Check overlap: intervals overlap if a.start < b.end AND b.start < a.end',
        'For scheduling: greedy by end time minimizes conflicts',
        'Use sweep line for complex interval operations'
      ],

      interviewTips: [
        'Clarify: are intervals sorted? Can they touch? [1,2] and [2,3]?',
        'State sorting strategy explicitly and why',
        'For Meeting Rooms II: explain min heap stores end times',
        'Know sweep line for "max overlap at any point"',
        'For greedy problems, explain why sorting by end time works',
        'Draw interval timeline diagram to visualize',
        'Mention edge cases: empty input, single interval, all overlapping'
      ],

      codeExamples: [
        {
          title: 'Merge Intervals',
          language: 'python',
          description: 'Combine all overlapping intervals.',
          code: `def merge(intervals):
    """
    Sort by start time, then merge overlapping.
    Two intervals overlap if current.start <= last.end
    """
    if not intervals:
        return []

    # Sort by start time
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for start, end in intervals[1:]:
        last = merged[-1]

        if start <= last[1]:
            # Overlap: extend the last interval
            last[1] = max(last[1], end)
        else:
            # No overlap: add new interval
            merged.append([start, end])

    return merged

# Time: O(n log n), Space: O(n)
# Example: [[1,3],[2,6],[8,10],[15,18]] -> [[1,6],[8,10],[15,18]]`
        },
        {
          title: 'Meeting Rooms II - Min Heap',
          language: 'python',
          description: 'Find minimum number of meeting rooms needed.',
          code: `def minMeetingRooms(intervals):
    """
    Use min heap to track end times of ongoing meetings.
    - Sort by start time
    - For each meeting: if earliest ending room is free, reuse it
    - Otherwise, need new room

    Heap size = number of concurrent meetings
    """
    import heapq

    if not intervals:
        return 0

    # Sort by start time
    intervals.sort(key=lambda x: x[0])

    # Min heap of end times
    heap = []

    for start, end in intervals:
        # If earliest ending meeting has ended, remove it
        if heap and heap[0] <= start:
            heapq.heappop(heap)

        # Add current meeting's end time
        heapq.heappush(heap, end)

    return len(heap)

# Time: O(n log n), Space: O(n)
# Example: [[0,30],[5,10],[15,20]] -> 2 rooms`
        },
        {
          title: 'Insert Interval',
          language: 'python',
          description: 'Insert new interval and merge if needed.',
          code: `def insert(intervals, newInterval):
    """
    Three phases:
    1. Add all intervals ending before newInterval starts
    2. Merge all overlapping intervals with newInterval
    3. Add all intervals starting after newInterval ends
    """
    result = []
    i = 0
    n = len(intervals)
    start, end = newInterval

    # Phase 1: Add intervals that end before new interval starts
    while i < n and intervals[i][1] < start:
        result.append(intervals[i])
        i += 1

    # Phase 2: Merge overlapping intervals
    while i < n and intervals[i][0] <= end:
        start = min(start, intervals[i][0])
        end = max(end, intervals[i][1])
        i += 1
    result.append([start, end])

    # Phase 3: Add remaining intervals
    while i < n:
        result.append(intervals[i])
        i += 1

    return result

# Time: O(n), Space: O(n) - already sorted input!`
        },
        {
          title: 'Meeting Rooms II - Sweep Line',
          language: 'python',
          description: 'Alternative approach using event processing.',
          code: `def minMeetingRooms_sweep(intervals):
    """
    Sweep line: process START (+1) and END (-1) events.
    Track running count of concurrent meetings.
    """
    events = []

    for start, end in intervals:
        events.append((start, 1))   # Meeting starts
        events.append((end, -1))    # Meeting ends

    # Sort by time, with ends before starts at same time
    # (free room before claiming new one)
    events.sort(key=lambda x: (x[0], x[1]))

    max_rooms = 0
    current_rooms = 0

    for time, delta in events:
        current_rooms += delta
        max_rooms = max(max_rooms, current_rooms)

    return max_rooms

# Time: O(n log n), Space: O(n)
# Useful when you need "max concurrent at any point"`
        },
        {
          title: 'Interval List Intersections',
          language: 'python',
          description: 'Find intersections of two sorted interval lists.',
          code: `def intervalIntersection(firstList, secondList):
    """
    Two pointers, one for each list.
    Intersection exists if max(starts) < min(ends).
    Advance pointer with smaller end time.
    """
    result = []
    i, j = 0, 0

    while i < len(firstList) and j < len(secondList):
        a_start, a_end = firstList[i]
        b_start, b_end = secondList[j]

        # Check for intersection
        start = max(a_start, b_start)
        end = min(a_end, b_end)

        if start <= end:
            result.append([start, end])

        # Advance pointer with smaller end time
        if a_end < b_end:
            i += 1
        else:
            j += 1

    return result

# Time: O(m + n), Space: O(1) excluding output`
        }
      ]
    },
    {
      id: 'search-algorithms',
      title: 'Search Algorithms',
      icon: 'search',
      color: '#0ea5e9',
      questions: 23,
      description: 'Linear search, binary search, and advanced search techniques.',

      introduction: `Search algorithms are fundamental techniques for finding elements or optimal values. Binary search is the most important - it reduces O(n) to O(log n) and appears in countless interview problems.

Binary Search Basics:
• Requires sorted data (or monotonic property)
• Repeatedly halve the search space
• O(log n) time, O(1) space

Beyond basic search, binary search applies to:
• **Search on answer space**: Find minimum/maximum valid answer
• **Search for boundary**: First/last occurrence, insertion point
• **Peak finding**: Find local maximum/minimum in unsorted data
• **Rotated arrays**: Modified binary search

The key insight: Binary search works whenever you can make a binary decision that eliminates half the search space. This extends far beyond sorted arrays!

Common variations:
• Find exact match vs insertion point
• Find first vs last occurrence
• Search in rotated sorted array
• Binary search on real numbers (floating point)
• Binary search on answer (minimum days, maximum capacity)`,

      whenToUse: [
        'Searching in sorted array',
        'Finding first/last occurrence',
        'Search insertion position',
        'Searching in rotated sorted array',
        'Optimization: minimize/maximize with constraint',
        'Finding peak element',
        'Square root, nth root calculation',
        'Koko eating bananas, shipping packages patterns'
      ],

      keyPatterns: ['Binary search', 'Search on answer', 'First/last occurrence', 'Peak finding', 'Rotated array', 'Lower/upper bound'],
      timeComplexity: 'O(n) linear, O(log n) binary',
      spaceComplexity: 'O(1)',

      approach: [
        'Identify if data is sorted or has monotonic property',
        'Define search space: [left, right] bounds',
        'Choose loop condition: left <= right OR left < right',
        'Calculate mid carefully: left + (right - left) // 2',
        'Define branching: when to move left, when to move right',
        'Consider what to return: mid, left, or right',
        'For "first occurrence": continue searching left even after finding',
        'For "search on answer": check if mid satisfies constraint'
      ],

      commonProblems: [
        { name: 'Binary Search', difficulty: 'Easy' },
        { name: 'Search Insert Position', difficulty: 'Easy' },
        { name: 'First Bad Version', difficulty: 'Easy' },
        { name: 'Find First and Last Position', difficulty: 'Medium' },
        { name: 'Search in Rotated Array', difficulty: 'Medium' },
        { name: 'Find Peak Element', difficulty: 'Medium' },
        { name: 'Find Minimum in Rotated Array', difficulty: 'Medium' },
        { name: 'Koko Eating Bananas', difficulty: 'Medium' },
        { name: 'Capacity To Ship Packages', difficulty: 'Medium' }
      ],

      commonMistakes: [
        'Integer overflow: use left + (right - left) // 2',
        'Infinite loop: not moving left/right correctly',
        'Off-by-one: returning left vs right',
        'Wrong comparison: < vs <=',
        'Not handling empty array',
        'Forgetting array must be sorted',
        'Using wrong template for boundary search'
      ],

      tips: [
        'Binary search requires sorted data',
        'Watch for off-by-one errors in boundary conditions',
        'Use binary search on answer space for optimization problems',
        'Ternary search for unimodal functions'
      ],

      interviewTips: [
        'State clearly: "The array is sorted, so I\'ll use binary search"',
        'Know two templates: find exact vs find boundary',
        'For "search on answer": define canAchieve(mid) function clearly',
        'Draw the search space and show how it shrinks',
        'Mention overflow prevention: left + (right - left) // 2',
        'For rotated array: explain how to determine which half is sorted',
        'Know Python bisect_left/bisect_right for quick solutions'
      ],

      codeExamples: [
        {
          title: 'Binary Search Templates',
          language: 'python',
          description: 'Two common templates: exact match and boundary.',
          code: `# Template 1: Find exact match (return -1 if not found)
def binary_search_exact(nums, target):
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1

# Template 2: Find leftmost position where condition is true
def binary_search_left(nums, target):
    """Find first index where nums[i] >= target"""
    left, right = 0, len(nums)

    while left < right:
        mid = left + (right - left) // 2
        if nums[mid] >= target:
            right = mid
        else:
            left = mid + 1

    return left  # Insertion point

# Python built-in:
# bisect_left(nums, target) - leftmost position
# bisect_right(nums, target) - rightmost position + 1`
        },
        {
          title: 'First and Last Position',
          language: 'python',
          description: 'Find boundaries of target in sorted array.',
          code: `def searchRange(nums, target):
    """Find first and last index of target"""
    def find_left():
        left, right = 0, len(nums)
        while left < right:
            mid = left + (right - left) // 2
            if nums[mid] >= target:
                right = mid
            else:
                left = mid + 1
        return left

    def find_right():
        left, right = 0, len(nums)
        while left < right:
            mid = left + (right - left) // 2
            if nums[mid] > target:
                right = mid
            else:
                left = mid + 1
        return left - 1

    left = find_left()

    # Check if target exists
    if left >= len(nums) or nums[left] != target:
        return [-1, -1]

    return [left, find_right()]

# Time: O(log n), Space: O(1)`
        },
        {
          title: 'Search in Rotated Sorted Array',
          language: 'python',
          description: 'Binary search when array is rotated.',
          code: `def search(nums, target):
    """
    Key insight: One half is always sorted.
    Check which half is sorted, then check if target is in that half.
    """
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid

        # Check which half is sorted
        if nums[left] <= nums[mid]:
            # Left half is sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:
            # Right half is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1

# Time: O(log n), Space: O(1)
# Example: [4,5,6,7,0,1,2], target=0 -> 4`
        },
        {
          title: 'Find Peak Element',
          language: 'python',
          description: 'Binary search in unsorted array using local comparison.',
          code: `def findPeakElement(nums):
    """
    Peak: nums[i] > nums[i-1] and nums[i] > nums[i+1]
    Key insight: If nums[mid] < nums[mid+1], peak is on right.
    Always guaranteed to find a peak (edges are -∞).
    """
    left, right = 0, len(nums) - 1

    while left < right:
        mid = left + (right - left) // 2

        if nums[mid] < nums[mid + 1]:
            # Peak is on the right
            left = mid + 1
        else:
            # Peak is at mid or on the left
            right = mid

    return left

# Time: O(log n), Space: O(1)
# Why it works: We always move toward "uphill" direction
# Example: [1,2,1,3,5,6,4] -> 5 (index of 6)`
        },
        {
          title: 'Binary Search on Answer - Koko Eating Bananas',
          language: 'python',
          description: 'Search for minimum speed to finish within hours.',
          code: `def minEatingSpeed(piles, h):
    """
    Binary search on answer space [1, max(piles)].
    For each speed k, check if Koko can finish in h hours.
    Find minimum k that works.
    """
    def can_finish(speed):
        hours = 0
        for pile in piles:
            # Ceiling division: (pile + speed - 1) // speed
            hours += (pile + speed - 1) // speed
        return hours <= h

    left, right = 1, max(piles)

    while left < right:
        mid = left + (right - left) // 2
        if can_finish(mid):
            # Try smaller speed
            right = mid
        else:
            # Need faster speed
            left = mid + 1

    return left

# Time: O(n * log(max)), Space: O(1)
# Example: piles=[3,6,7,11], h=8 -> speed=4`
        }
      ]
    },
    {
      id: 'queues',
      title: 'Queues',
      icon: 'inbox',
      color: '#f43f5e',
      questions: 17,
      description: 'FIFO data structure for BFS, task scheduling, and buffering.',
      keyPatterns: ['BFS', 'Level order traversal', 'Sliding window max', 'Task scheduling'],
      timeComplexity: 'O(1) enqueue/dequeue',
      spaceComplexity: 'O(n)',
      commonProblems: [
        // Easy
        { name: 'Implement Queue using Stacks', difficulty: 'Easy' },
        { name: 'Number of Recent Calls', difficulty: 'Easy' },
        { name: 'First Unique Character in a String', difficulty: 'Easy' },
        { name: 'Moving Average from Data Stream', difficulty: 'Easy' },
        // Medium
        { name: 'Design Circular Queue', difficulty: 'Medium' },
        { name: 'Design Circular Deque', difficulty: 'Medium' },
        { name: 'Design Front Middle Back Queue', difficulty: 'Medium' },
        { name: 'Dota2 Senate', difficulty: 'Medium' },
        { name: 'Task Scheduler', difficulty: 'Medium' },
        { name: 'Number of Students Unable to Eat Lunch', difficulty: 'Easy' },
        { name: 'Time Needed to Buy Tickets', difficulty: 'Easy' },
        { name: 'Reveal Cards In Increasing Order', difficulty: 'Medium' },
        { name: 'Rotting Oranges', difficulty: 'Medium' },
        { name: 'Walls and Gates', difficulty: 'Medium' },
        { name: 'Open the Lock', difficulty: 'Medium' },
        { name: 'Shortest Path in Binary Matrix', difficulty: 'Medium' },
        { name: 'Jump Game III', difficulty: 'Medium' },
        { name: 'Jump Game IV', difficulty: 'Hard' },
        { name: 'Snakes and Ladders', difficulty: 'Medium' },
        // Hard
        { name: 'Sliding Window Maximum', difficulty: 'Hard' },
        { name: 'Shortest Subarray with Sum at Least K', difficulty: 'Hard' },
        { name: 'Constrained Subsequence Sum', difficulty: 'Hard' }
      ],
      tips: [
        'Use deque for O(1) operations on both ends',
        'BFS uses queue for level-by-level exploration',
        'Monotonic deque for sliding window min/max',
        'Priority queue (heap) when order matters beyond FIFO'
      ],
      codeExample: `# Sliding Window Maximum using Monotonic Deque
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()  # Store indices
    result = []

    for i, num in enumerate(nums):
        # Remove indices outside window
        while dq and dq[0] < i - k + 1:
            dq.popleft()
        # Remove smaller elements
        while dq and nums[dq[-1]] < num:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(nums[dq[0]])

    return result`
    },
    {
      id: 'blind-75',
      title: 'Blind 75',
      icon: 'zap',
      color: '#22c55e',
      questions: 75,
      description: 'Curated list of 75 essential LeetCode problems covering all major patterns.',
      keyPatterns: ['Arrays', 'Binary', 'DP', 'Graph', 'Interval', 'Linked List', 'Matrix', 'String', 'Tree', 'Heap'],
      timeComplexity: 'Varies by problem',
      spaceComplexity: 'Varies by problem',
      commonProblems: ['Two Sum', 'Best Time to Buy/Sell Stock', 'Contains Duplicate', 'Product of Array Except Self', 'Maximum Subarray', 'Maximum Product Subarray'],
      tips: [
        'Start with Array and String problems',
        'Progress to Trees and Graphs',
        'Focus on patterns, not memorization',
        'Aim to solve each problem in <45 minutes'
      ],
      codeExample: `# The Blind 75 covers these categories:
# - Array (9 problems)
# - Binary (5 problems)
# - Dynamic Programming (11 problems)
# - Graph (8 problems)
# - Interval (5 problems)
# - Linked List (6 problems)
# - Matrix (4 problems)
# - String (10 problems)
# - Tree (14 problems)
# - Heap (3 problems)
# Total: 75 essential problems`
    },
    {
      id: 'ascend-100',
      title: 'Ascend 100',
      icon: 'ascend',
      color: '#10b981',
      questions: 100,
      description: 'Our curated list of 100 must-solve problems for interview success.',
      keyPatterns: ['All major patterns', 'Company favorites', 'Difficulty progression', 'Pattern mastery'],
      timeComplexity: 'Varies by problem',
      spaceComplexity: 'Varies by problem',
      commonProblems: ['Two Sum', 'Valid Parentheses', 'Merge Two Sorted Lists', 'Best Time to Buy/Sell Stock', 'Valid Anagram', 'Binary Search'],
      tips: [
        'Solve in order for progressive difficulty',
        'Covers all patterns tested at top companies',
        'Includes problems from FAANG interviews',
        'Practice until you can solve each in 30 minutes'
      ],
      codeExample: `# Ascend 100 Problem Distribution:
# - Easy: 35 problems (fundamentals)
# - Medium: 50 problems (core patterns)
# - Hard: 15 problems (advanced techniques)

# Focus areas:
# - Arrays & Strings: 25%
# - Trees & Graphs: 25%
# - Dynamic Programming: 20%
# - Other patterns: 30%`
    },
  ];

  // System Design topic categories
