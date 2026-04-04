// Tech Interview Handbook - Comprehensive Algorithm Topics Data
// Source: https://github.com/yangshun/tech-interview-handbook
// Extracted from: algorithms study guides for coding interviews

export const techInterviewTopics = [
  {
    id: 'tih-string',
    title: 'String',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A string is a sequence of characters. Many tips that apply to arrays also apply to strings. Common data structures for looking up strings include Trie/Prefix Tree and Suffix Tree. Common string algorithms include Rabin-Karp for efficient searching of substring using a rolling hash, and KMP (Knuth-Morris-Pratt) for efficient searching of substring.`,
    techniques: [
      'Counting characters using a hash table/map (space is O(1) for fixed character set, not O(n))',
      'Using a 26-bit bitmask to track unique lowercase Latin characters in a string',
      'Determining anagrams by sorting both strings (O(n log n) time)',
      'Determining anagrams by mapping characters to prime numbers and comparing products (O(n) time, O(1) space)',
      'Determining anagrams by frequency counting of characters (O(n) time, O(1) space)',
      'Palindrome detection by reversing the string and comparing',
      'Palindrome detection using two pointers moving inward from start and end',
      'Counting palindromes using two pointers moving outward from the middle (check both even and odd length)',
      'For palindromic substrings, terminate early once there is no match',
      'For palindromic subsequences, use dynamic programming (overlapping subproblems)',
    ],
    timeComplexity: {
      access: 'O(1)',
      search: 'O(n)',
      insert: 'O(n)',
      remove: 'O(n)',
      findSubstring: 'O(n*m) naive, faster with KMP',
      concatenation: 'O(n + m)',
      slice: 'O(m)',
      split: 'O(n + m)',
      strip: 'O(n)',
    },
    cornerCases: [
      'Empty string',
      'String with 1 or 2 characters',
      'String with repeated characters',
      'Strings with only distinct characters',
    ],
    interviewTips: [
      'Ask about input character set and case sensitivity',
      'Usually characters are limited to lowercase Latin characters (a to z)',
    ],
    essentialQuestions: [
      { title: 'Valid Anagram', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-anagram/' },
      { title: 'Valid Palindrome', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-palindrome/' },
      { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
    ],
    recommendedQuestions: [
      { title: 'Longest Repeating Character Replacement', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
      { title: 'Find All Anagrams in a String', difficulty: 'Medium', url: 'https://leetcode.com/problems/find-all-anagrams-in-a-string/' },
      { title: 'Minimum Window Substring', difficulty: 'Hard', url: 'https://leetcode.com/problems/minimum-window-substring/' },
      { title: 'Group Anagrams', difficulty: 'Medium', url: 'https://leetcode.com/problems/group-anagrams/' },
      { title: 'Longest Palindromic Substring', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-palindromic-substring/' },
      { title: 'Encode and Decode Strings', difficulty: 'Medium', url: 'https://leetcode.com/problems/encode-and-decode-strings/', premium: true },
    ],
    tips: [
      'If you need to keep a counter of characters, the space required for a counter of a string of Latin characters is O(1) not O(n), because the upper bound is the fixed range of 26 characters.',
      'A neat trick to count characters in a string of unique characters is to use a 26-bit bitmask. To determine if two strings have common characters, perform & on the two bitmasks.',
      'For anagram problems, frequency counting is the most efficient approach at O(n) time and O(1) space.',
      'When a question is about counting palindromes, use two pointers that move outward from the middle, checking both even and odd length palindromes.',
    ],
  },
  {
    id: 'tih-hash-table',
    title: 'Hash Table',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A hash table (commonly referred to as hash map) is a data structure that implements an associative array abstract data type, a structure that can map keys to values. A hash table uses a hash function on an element to compute an index (hash code) into an array of buckets or slots, from which the desired value can be found. Hashing is the most common example of a space-time tradeoff. Instead of linearly searching an array every time to determine if an element is present (O(n) time), we can traverse the array once and hash all elements into a hash table, making lookups O(1) on average.`,
    techniques: [
      'Separate chaining - A linked list is used for each value to store all collided items',
      'Open addressing - All entry records are stored in the bucket array itself, using probe sequences',
      'Use hash tables to convert O(n) lookups into O(1) average lookups',
      'Hash tables are the go-to for frequency counting problems',
      'Use hash tables for two-sum style problems (complement lookups)',
    ],
    timeComplexity: {
      access: 'N/A (hash code not known)',
      search: 'O(1)*',
      insert: 'O(1)*',
      remove: 'O(1)*',
      note: '* Average case. In interviews we only care about average case for hash tables.',
    },
    cornerCases: [
      'Empty hash table',
      'Hash collisions',
      'Single key-value pair',
      'Duplicate keys (overwrite behavior)',
    ],
    essentialQuestions: [
      { title: 'Two Sum', difficulty: 'Easy', url: 'https://leetcode.com/problems/two-sum/' },
      { title: 'Ransom Note', difficulty: 'Easy', url: 'https://leetcode.com/problems/ransom-note/' },
    ],
    recommendedQuestions: [
      { title: 'Group Anagrams', difficulty: 'Medium', url: 'https://leetcode.com/problems/group-anagrams/' },
      { title: 'Insert Delete GetRandom O(1)', difficulty: 'Medium', url: 'https://leetcode.com/problems/insert-delete-getrandom-o1/' },
      { title: 'First Missing Positive', difficulty: 'Hard', url: 'https://leetcode.com/problems/first-missing-positive/' },
      { title: 'LRU Cache', difficulty: 'Medium', url: 'https://leetcode.com/problems/lru-cache/' },
      { title: 'All O one Data Structure', difficulty: 'Hard', url: 'https://leetcode.com/problems/all-oone-data-structure/' },
    ],
    tips: [
      'Hash tables are the most common space-time tradeoff in interviews.',
      'In most languages: C++ uses std::unordered_map, Java uses java.util.HashMap, Python uses dict, JavaScript uses Object or Map.',
      'When asked about collision resolution, know separate chaining and open addressing at a high level.',
      'Hash tables are useful for implementing LRU caches (combined with doubly linked lists).',
    ],
    sampleQuestions: [
      'Describe an implementation of a least-used cache, and big-O notation of it.',
      'A question involving an API\'s integration with hash map where the buckets of hash map are made up of linked lists.',
    ],
  },
  {
    id: 'tih-sorting-searching',
    title: 'Sorting and Searching',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Sorting is the act of rearranging elements in a sequence in order, either in numerical or lexicographical order, and either ascending or descending. A number of basic algorithms run in O(n^2) and should not be used in interviews. In algorithm interviews, you're unlikely to need to implement any sorting algorithms from scratch. Instead you would need to sort the input using your language's default sorting function so that you can use binary searches on them. On a sorted array of elements, binary search compares the target value with the middle element, which informs the algorithm whether the target value lies in the left half or the right half.`,
    techniques: [
      'When a given sequence is in sorted order, binary search should be one of the first things that come to mind',
      'Counting sort is a non-comparison-based sort for numbers where you know the range of values beforehand',
      'Use your language\'s default sorting function rather than implementing from scratch',
      'Binary search on sorted arrays for O(log n) search time',
    ],
    timeComplexity: {
      bubbleSort: 'O(n^2) time, O(1) space',
      insertionSort: 'O(n^2) time, O(1) space',
      selectionSort: 'O(n^2) time, O(1) space',
      quicksort: 'O(n log n) time, O(log n) space',
      mergesort: 'O(n log n) time, O(n) space',
      heapsort: 'O(n log n) time, O(1) space',
      countingSort: 'O(n + k) time, O(k) space',
      radixSort: 'O(nk) time, O(n + k) space',
      binarySearch: 'O(log n)',
    },
    cornerCases: [
      'Empty sequence',
      'Sequence with one element',
      'Sequence with two elements',
      'Sequence containing duplicate elements',
    ],
    interviewTips: [
      'Know the time and space complexity of your language\'s default sorting algorithm',
      'The time complexity is almost definitely O(n log n)',
      'Python 3.11+ uses Powersort (replaced Timsort)',
      'Java uses Timsort for objects and Dual-Pivot Quicksort for primitives',
    ],
    essentialQuestions: [
      { title: 'Binary Search', difficulty: 'Easy', url: 'https://leetcode.com/problems/binary-search/' },
      { title: 'Search in Rotated Sorted Array', difficulty: 'Medium', url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
    ],
    recommendedQuestions: [
      { title: 'Kth Smallest Element in a Sorted Matrix', difficulty: 'Medium', url: 'https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/' },
      { title: 'Search a 2D Matrix', difficulty: 'Medium', url: 'https://leetcode.com/problems/search-a-2d-matrix/' },
      { title: 'Kth Largest Element in an Array', difficulty: 'Medium', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/' },
      { title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium', url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
      { title: 'Median of Two Sorted Arrays', difficulty: 'Hard', url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },
    ],
    tips: [
      'You are unlikely to be asked to implement sorting from scratch in an interview.',
      'When a given sequence is sorted, always consider binary search first.',
      'Counting sort works well when the range of values (k) is small.',
      'Know the difference between stable and unstable sorts.',
    ],
  },
  {
    id: 'tih-tree',
    title: 'Tree',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A tree is a widely used abstract data type that represents a hierarchical structure with a set of connected nodes. Each node can be connected to many children but must be connected to exactly one parent, except for the root node which has no parent. A tree is an undirected and connected acyclic graph. Trees are commonly used to represent hierarchical data (e.g., file systems, JSON, HTML documents). For interviews, you will usually be asked about binary trees and binary search trees.`,
    techniques: [
      'Use recursion - the most common approach for traversing trees. When the subtree problem can solve the entire problem, try recursion.',
      'Always check for the base case (usually where the node is null)',
      'Sometimes your recursive function needs to return two values',
      'Traverse by level using breadth-first search (BFS)',
      'If the question involves summation of nodes along the way, check whether nodes can be negative',
      'In-order traversal: Left -> Root -> Right',
      'Pre-order traversal: Root -> Left -> Right',
      'Post-order traversal: Left -> Right -> Root',
      'In-order traversal of a BST gives all elements in sorted order',
    ],
    timeComplexity: {
      access: 'O(log n) for BST',
      search: 'O(log n) for BST',
      insert: 'O(log n) for BST',
      remove: 'O(log n) for BST',
      spaceTraversal: 'O(h) for balanced trees where h is height, O(n) for skewed trees',
    },
    commonTerms: {
      neighbor: 'Parent or child of a node',
      ancestor: 'A node reachable by traversing its parent chain',
      descendant: 'A node in the node\'s subtree',
      degree: 'Number of children of a node',
      level: 'Number of edges along the unique path between a node and the root',
      width: 'Number of nodes in a level',
      completeBinaryTree: 'Every level except possibly the last is completely filled, and all nodes in the last level are as far left as possible',
      balancedBinaryTree: 'Left and right subtrees of every node differ in height by no more than 1',
    },
    commonRoutines: [
      'Insert value',
      'Delete value',
      'Count number of nodes in tree',
      'Whether a value is in the tree',
      'Calculate height of the tree',
      'Determine if it is a binary search tree',
      'Get maximum value',
      'Get minimum value',
    ],
    cornerCases: [
      'Empty tree',
      'Single node',
      'Two nodes',
      'Very skewed tree (like a linked list)',
    ],
    interviewTips: [
      'Be very familiar with writing pre-order, in-order, and post-order traversal recursively',
      'Challenge yourself by writing them iteratively - interviewers sometimes ask for iterative approach',
      'Be very familiar with BST properties and validating that a binary tree is a BST',
      'When a question involves a BST, the interviewer usually expects a solution faster than O(n)',
      'In-order traversal of a BST is insufficient to uniquely serialize a tree - pre-order or post-order is also needed',
    ],
    essentialQuestions: [
      { title: 'Maximum Depth of Binary Tree', difficulty: 'Easy', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', subcategory: 'Binary Tree' },
      { title: 'Invert/Flip Binary Tree', difficulty: 'Easy', url: 'https://leetcode.com/problems/invert-binary-tree/', subcategory: 'Binary Tree' },
      { title: 'Lowest Common Ancestor of a Binary Search Tree', difficulty: 'Medium', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', subcategory: 'Binary Search Tree' },
    ],
    recommendedQuestions: [
      { title: 'Same Tree', difficulty: 'Easy', url: 'https://leetcode.com/problems/same-tree/', subcategory: 'Binary Tree' },
      { title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard', url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/', subcategory: 'Binary Tree' },
      { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', subcategory: 'Binary Tree' },
      { title: 'Lowest Common Ancestor of a Binary Tree', difficulty: 'Medium', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/', subcategory: 'Binary Tree' },
      { title: 'Binary Tree Right Side View', difficulty: 'Medium', url: 'https://leetcode.com/problems/binary-tree-right-side-view/', subcategory: 'Binary Tree' },
      { title: 'Subtree of Another Tree', difficulty: 'Easy', url: 'https://leetcode.com/problems/subtree-of-another-tree/', subcategory: 'Binary Tree' },
      { title: 'Construct Binary Tree from Preorder and Inorder Traversal', difficulty: 'Medium', url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/', subcategory: 'Binary Tree' },
      { title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard', url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', subcategory: 'Binary Tree' },
      { title: 'Validate Binary Search Tree', difficulty: 'Medium', url: 'https://leetcode.com/problems/validate-binary-search-tree/', subcategory: 'BST' },
      { title: 'Kth Smallest Element in a BST', difficulty: 'Medium', url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', subcategory: 'BST' },
    ],
    tips: [
      'Recursion is the most common approach for tree problems.',
      'Always remember the base case: usually when the node is null.',
      'For BST problems, leverage the sorted property to achieve better than O(n) time.',
      'BFS (using a queue) is the go-to for level-order traversal problems.',
      'Space complexity of traversing balanced trees is O(h) where h is height, but O(n) for skewed trees.',
    ],
  },
  {
    id: 'tih-graph',
    title: 'Graph',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A graph is a structure containing a set of objects (nodes or vertices) where there can be edges between these nodes/vertices. Edges can be directed or undirected and can optionally have values (a weighted graph). Trees are undirected graphs in which any two vertices are connected by exactly one edge and there can be no cycles. Graphs are commonly used to model relationships between unordered entities, such as friendships between people or distances between locations.`,
    techniques: [
      'Depth-first search (DFS) - explores as far as possible along each branch before backtracking, uses a stack',
      'Breadth-first search (BFS) - explores all nodes at present depth before moving to next depth level, uses a queue',
      'Topological sorting - linear ordering of vertices such that for every directed edge uv, u comes before v',
      'Use hash table of hash tables for graph representation (simplest approach in interviews)',
      'For 2D matrix graphs, always ensure current position is within boundary and has not been visited',
      'Use a visited set to track explored nodes and avoid infinite loops',
    ],
    graphRepresentations: [
      'Adjacency matrix',
      'Adjacency list',
      'Hash table of hash tables (simplest for interviews)',
    ],
    searchAlgorithms: {
      common: ['Breadth-first Search', 'Depth-first Search'],
      uncommon: ['Topological Sort', "Dijkstra's algorithm"],
      almostNever: ["Bellman-Ford algorithm", "Floyd-Warshall algorithm", "Prim's algorithm", "Kruskal's algorithm"],
    },
    timeComplexity: {
      depthFirstSearch: 'O(|V| + |E|)',
      breadthFirstSearch: 'O(|V| + |E|)',
      topologicalSort: 'O(|V| + |E|)',
    },
    cornerCases: [
      'Empty graph',
      'Graph with one or two nodes',
      'Disconnected graphs',
      'Graph with cycles',
    ],
    interviewTips: [
      'A tree-like diagram could be a graph that allows cycles - naive recursion would not work',
      'Ensure you are correctly keeping track of visited nodes and not visiting each node more than once',
      'In 2D matrix problems, graphs are commonly given where cells are nodes with 4 neighbors (up/down/left/right)',
      'Use double-ended queues (deque) for BFS, not arrays - dequeuing is O(1) vs O(n)',
    ],
    codeTemplates: {
      dfs: `def dfs(matrix):
  if not matrix:
    return []
  rows, cols = len(matrix), len(matrix[0])
  visited = set()
  directions = ((0, 1), (0, -1), (1, 0), (-1, 0))
  def traverse(i, j):
    if (i, j) in visited:
      return
    visited.add((i, j))
    for direction in directions:
      next_i, next_j = i + direction[0], j + direction[1]
      if 0 <= next_i < rows and 0 <= next_j < cols:
        traverse(next_i, next_j)
  for i in range(rows):
    for j in range(cols):
      traverse(i, j)`,
      bfs: `from collections import deque
def bfs(matrix):
  if not matrix:
    return []
  rows, cols = len(matrix), len(matrix[0])
  visited = set()
  directions = ((0, 1), (0, -1), (1, 0), (-1, 0))
  def traverse(i, j):
    queue = deque([(i, j)])
    while queue:
      curr_i, curr_j = queue.popleft()
      if (curr_i, curr_j) not in visited:
        visited.add((curr_i, curr_j))
        for direction in directions:
          next_i, next_j = curr_i + direction[0], curr_j + direction[1]
          if 0 <= next_i < rows and 0 <= next_j < cols:
            queue.append((next_i, next_j))
  for i in range(rows):
    for j in range(cols):
      traverse(i, j)`,
      topologicalSort: `def graph_topo_sort(num_nodes, edges):
    from collections import deque
    nodes, order, queue = {}, [], deque()
    for node_id in range(num_nodes):
        nodes[node_id] = { 'in': 0, 'out': set() }
    for node_id, pre_id in edges:
        nodes[node_id]['in'] += 1
        nodes[pre_id]['out'].add(node_id)
    for node_id in nodes.keys():
        if nodes[node_id]['in'] == 0:
            queue.append(node_id)
    while len(queue):
        node_id = queue.popleft()
        for outgoing_id in nodes[node_id]['out']:
            nodes[outgoing_id]['in'] -= 1
            if nodes[outgoing_id]['in'] == 0:
                queue.append(outgoing_id)
        order.append(node_id)
    return order if len(order) == num_nodes else None`,
    },
    essentialQuestions: [
      { title: 'Number of Islands', difficulty: 'Medium', url: 'https://leetcode.com/problems/number-of-islands/' },
      { title: 'Flood Fill', difficulty: 'Easy', url: 'https://leetcode.com/problems/flood-fill/' },
      { title: '01 Matrix', difficulty: 'Medium', url: 'https://leetcode.com/problems/01-matrix/' },
    ],
    recommendedQuestions: [
      { title: 'Rotting Oranges', difficulty: 'Medium', url: 'https://leetcode.com/problems/rotting-oranges/', subcategory: 'BFS' },
      { title: 'Minimum Knight Moves', difficulty: 'Medium', url: 'https://leetcode.com/problems/minimum-knight-moves/', subcategory: 'BFS', premium: true },
      { title: 'Clone Graph', difficulty: 'Medium', url: 'https://leetcode.com/problems/clone-graph/', subcategory: 'Either search' },
      { title: 'Pacific Atlantic Water Flow', difficulty: 'Medium', url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/', subcategory: 'Either search' },
      { title: 'Number of Connected Components in an Undirected Graph', difficulty: 'Medium', url: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/', subcategory: 'Either search', premium: true },
      { title: 'Graph Valid Tree', difficulty: 'Medium', url: 'https://leetcode.com/problems/graph-valid-tree/', subcategory: 'Either search', premium: true },
      { title: 'Course Schedule', difficulty: 'Medium', url: 'https://leetcode.com/problems/course-schedule/', subcategory: 'Topological sorting' },
      { title: 'Alien Dictionary', difficulty: 'Hard', url: 'https://leetcode.com/problems/alien-dictionary/', subcategory: 'Topological sorting', premium: true },
    ],
    tips: [
      'Use a hash table of hash tables for the simplest graph representation in interviews.',
      'DFS uses a stack (implicit via recursion or explicit), BFS uses a queue.',
      'Always check for cycles when traversing graphs - keep a visited set.',
      'Topological sort is useful for dependency ordering (e.g., course prerequisites).',
      'For 2D matrix traversal, define the 4 directions as constants: ((0,1), (0,-1), (1,0), (-1,0)).',
    ],
  },
  {
    id: 'tih-linked-list',
    title: 'Linked List',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Like arrays, a linked list is used to represent sequential data. It is a linear collection of data elements whose order is not given by their physical placement in memory. Instead, each element contains an address of the next element. Advantages: Insertion and deletion at a known location is O(1). Disadvantages: Access time is linear because you must traverse from the start.`,
    types: [
      'Singly linked list - each node points to the next node, last node points to null',
      'Doubly linked list - each node has next and prev pointers; first prev and last next point to null',
      'Circular linked list - last node points back to first node (also exists as circular doubly linked list)',
    ],
    techniques: [
      'Sentinel/dummy nodes at head and/or tail to handle edge cases for operations at the head or tail',
      'Two pointers: getting kth from last node (one pointer k nodes ahead)',
      'Two pointers: detecting cycles (fast pointer increments twice as fast as slow)',
      'Two pointers: getting the middle node (fast pointer reaches end, slow is at middle)',
      'Many problems can be solved by creating a new linked list, but interviewer usually wants in-place modification',
      'Truncate a list by setting next pointer to null at the last element',
      'Swapping values of nodes: just swap values, no need to swap next pointers',
      'Combining two lists: attach head of second list to tail of first list',
    ],
    commonRoutines: [
      'Counting the number of nodes in the linked list',
      'Reversing a linked list in-place',
      'Finding the middle node using two pointers (fast/slow)',
      'Merging two linked lists together',
    ],
    timeComplexity: {
      access: 'O(n)',
      search: 'O(n)',
      insert: 'O(1) - assumes you have traversed to the insertion position',
      remove: 'O(1) - assumes you have traversed to the node to be removed',
    },
    cornerCases: [
      'Empty linked list (head is null)',
      'Single node',
      'Two nodes',
      'Linked list has cycles (clarify with interviewer beforehand - usually the answer is no)',
    ],
    essentialQuestions: [
      { title: 'Reverse a Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/reverse-linked-list/' },
      { title: 'Detect Cycle in a Linked List', difficulty: 'Easy', url: 'https://leetcode.com/problems/linked-list-cycle/' },
    ],
    recommendedQuestions: [
      { title: 'Merge Two Sorted Lists', difficulty: 'Easy', url: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
      { title: 'Merge K Sorted Lists', difficulty: 'Hard', url: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
      { title: 'Remove Nth Node From End Of List', difficulty: 'Medium', url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
      { title: 'Reorder List', difficulty: 'Medium', url: 'https://leetcode.com/problems/reorder-list/' },
    ],
    tips: [
      'Adding a sentinel/dummy node at the head helps handle many edge cases.',
      'Two pointer techniques are extremely common for linked list problems.',
      'The interviewer will usually request in-place solutions without additional storage.',
      'Only Java provides a built-in linked list implementation; in Python and JavaScript you implement your own.',
      'Borrow ideas from Reverse a Linked List for many in-place modification problems.',
    ],
  },
  {
    id: 'tih-stack',
    title: 'Stack',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A stack is an abstract data type that supports push (insert on top) and pop (remove and return the most recently added element). This behavior is commonly called LIFO (last in, first out). Stacks can be implemented using arrays or singly linked lists. Stacks are an important way of supporting nested or recursive function calls and are used to implement depth-first search.`,
    techniques: [
      'Use stacks for matching parentheses/brackets problems',
      'Use stacks for expression evaluation (Reverse Polish Notation)',
      'Use stacks to implement DFS iteratively',
      'Monotonic stacks for problems involving next greater/smaller elements',
    ],
    timeComplexity: {
      topPeek: 'O(1)',
      push: 'O(1)',
      pop: 'O(1)',
      isEmpty: 'O(1)',
      search: 'O(n)',
    },
    cornerCases: [
      'Empty stack - popping from an empty stack',
      'Stack with one item',
      'Stack with two items',
    ],
    essentialQuestions: [
      { title: 'Valid Parentheses', difficulty: 'Easy', url: 'https://leetcode.com/problems/valid-parentheses/' },
      { title: 'Implement Queue using Stacks', difficulty: 'Easy', url: 'https://leetcode.com/problems/implement-queue-using-stacks/' },
    ],
    recommendedQuestions: [
      { title: 'Implement Stack using Queues', difficulty: 'Easy', url: 'https://leetcode.com/problems/implement-stack-using-queues/' },
      { title: 'Min Stack', difficulty: 'Medium', url: 'https://leetcode.com/problems/min-stack/' },
      { title: 'Asteroid Collision', difficulty: 'Medium', url: 'https://leetcode.com/problems/asteroid-collision/' },
      { title: 'Evaluate Reverse Polish Notation', difficulty: 'Medium', url: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/' },
      { title: 'Basic Calculator', difficulty: 'Hard', url: 'https://leetcode.com/problems/basic-calculator/' },
      { title: 'Basic Calculator II', difficulty: 'Medium', url: 'https://leetcode.com/problems/basic-calculator-ii/' },
      { title: 'Daily Temperatures', difficulty: 'Medium', url: 'https://leetcode.com/problems/daily-temperatures/' },
      { title: 'Trapping Rain Water', difficulty: 'Hard', url: 'https://leetcode.com/problems/trapping-rain-water/' },
      { title: 'Largest Rectangle in Histogram', difficulty: 'Hard', url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },
    ],
    tips: [
      'In C++ use std::stack, in Java use java.util.Stack, in Python simulate with List, in JavaScript simulate with Array.',
      'Stacks are fundamental for DFS, expression evaluation, and parenthesis matching.',
      'Monotonic stacks are an advanced technique for "next greater element" style problems.',
    ],
  },
  {
    id: 'tih-queue',
    title: 'Queue',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A queue is a linear collection of elements maintained in a sequence, modified by enqueue (add at back) and dequeue (remove from front). This behavior is commonly called FIFO (first in, first out). Queues can be implemented using arrays or singly linked lists. Breadth-first search is commonly implemented using queues.`,
    techniques: [
      'Use queues for BFS traversal',
      'Use double-ended queues (deque) for efficient O(1) dequeue operations',
      'Circular queues for fixed-size buffer scenarios',
    ],
    timeComplexity: {
      enqueue: 'O(1)',
      dequeue: 'O(1)',
      front: 'O(1)',
      back: 'O(1)',
      isEmpty: 'O(1)',
    },
    cornerCases: [
      'Empty queue',
      'Queue with one item',
      'Queue with two items',
    ],
    interviewTips: [
      'Most languages don\'t have a built-in Queue class',
      'Using arrays/lists as a queue makes dequeue O(n) because of shifting',
      'Flag to the interviewer that you assume a queue with efficient O(1) dequeue',
      'In Python use collections.deque, in Java use java.util.ArrayDeque',
    ],
    essentialQuestions: [
      { title: 'Implement Stack using Queues', difficulty: 'Easy', url: 'https://leetcode.com/problems/implement-stack-using-queues/' },
    ],
    recommendedQuestions: [
      { title: 'Implement Queue using Stacks', difficulty: 'Easy', url: 'https://leetcode.com/problems/implement-queue-using-stacks/' },
      { title: 'Design Circular Queue', difficulty: 'Medium', url: 'https://leetcode.com/problems/design-circular-queue/' },
      { title: 'Design Hit Counter', difficulty: 'Medium', url: 'https://leetcode.com/problems/design-hit-counter/', premium: true },
    ],
    tips: [
      'BFS is the primary algorithm that uses queues.',
      'Always use deque (double-ended queue) for O(1) dequeue, not regular arrays.',
      'In C++ use std::queue, in Java use java.util.ArrayDeque, in Python use collections.deque.',
    ],
  },
  {
    id: 'tih-heap',
    title: 'Heap',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A heap is a specialized tree-based data structure which is a complete tree that satisfies the heap property. Max heap: the value of a node must be greatest among the node values in its entire subtree. Min heap: the value of a node must be smallest among the node values in its entire subtree. In algorithm interviews, heaps and priority queues can be treated as the same data structure. A heap is useful when it is necessary to repeatedly remove the object with the highest (or lowest) priority, or when insertions need to be interspersed with removals of the root node.`,
    techniques: [
      'If you see a top or lowest k mentioned in the question, it is usually a signal that a heap can be used',
      'For top k elements, use a Min Heap of size k',
      'Iterate through each element, pushing into the heap; when heap size exceeds k, remove the minimum element',
      'For Python heapq (min heap), invert the value before pushing to find the max',
    ],
    timeComplexity: {
      findMaxMin: 'O(1)',
      insert: 'O(log n)',
      remove: 'O(log n)',
      heapify: 'O(n)',
    },
    cornerCases: [
      'Empty heap',
      'Heap with one element',
      'Heap with all duplicate values',
    ],
    essentialQuestions: [
      { title: 'Merge K Sorted Lists', difficulty: 'Hard', url: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
      { title: 'K Closest Points to Origin', difficulty: 'Medium', url: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
    ],
    recommendedQuestions: [
      { title: 'Top K Frequent Elements', difficulty: 'Medium', url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
      { title: 'Find Median from Data Stream', difficulty: 'Hard', url: 'https://leetcode.com/problems/find-median-from-data-stream/' },
    ],
    tips: [
      'Whenever you see "top k" or "k largest/smallest" in a problem, think heap.',
      'In C++ use std::priority_queue, in Java use java.util.PriorityQueue, in Python use heapq.',
      'JavaScript has no built-in heap implementation.',
      'Heapify (creating a heap from an array) is O(n), not O(n log n).',
    ],
  },
  {
    id: 'tih-trie',
    title: 'Trie',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Tries are special trees (prefix trees) that make searching and storing strings more efficient. Tries have many practical applications, such as conducting searches and providing autocomplete. Be familiar with implementing from scratch a Trie class and its add, remove, and search methods.`,
    techniques: [
      'Preprocessing a dictionary of words into a trie improves search efficiency from O(n) to O(k) where k is word length',
      'Tries are excellent for prefix-based search problems',
      'Tries are useful for autocomplete implementations',
      'Tries can be used for word validation in games like Boggle/Word Search',
    ],
    timeComplexity: {
      search: 'O(m) where m is the length of the string',
      insert: 'O(m) where m is the length of the string',
      remove: 'O(m) where m is the length of the string',
    },
    cornerCases: [
      'Searching for a string in an empty trie',
      'Inserting empty strings into a trie',
    ],
    essentialQuestions: [
      { title: 'Implement Trie (Prefix Tree)', difficulty: 'Medium', url: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
    ],
    recommendedQuestions: [
      { title: 'Add and Search Word', difficulty: 'Medium', url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
      { title: 'Word Break', difficulty: 'Medium', url: 'https://leetcode.com/problems/word-break/' },
      { title: 'Word Search II', difficulty: 'Hard', url: 'https://leetcode.com/problems/word-search-ii/' },
    ],
    tips: [
      'Be able to implement a Trie from scratch including add, remove, and search methods.',
      'Tries provide O(k) search time where k is the length of the word, compared to O(n) for searching in a list.',
      'Consider using a trie when you need to search for words with common prefixes.',
    ],
  },
  {
    id: 'tih-interval',
    title: 'Interval',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Interval questions are a subset of array questions where you are given an array of two-element arrays (an interval) and the two values represent a start and an end value. Interval questions are considered part of the array family but involve common techniques that warrant their own section. Interval questions can be tricky because of the number of overlap cases to consider.`,
    techniques: [
      'Sort the array of intervals by starting point (crucial for merge intervals)',
      'Checking if two intervals overlap: a[0] < b[1] and b[0] < a[1]',
      'Merging two overlapping intervals: [min(a[0], b[0]), max(a[1], b[1])]',
    ],
    codeTemplates: {
      isOverlap: `def is_overlap(a, b):
  return a[0] < b[1] and b[0] < a[1]`,
      mergeOverlapping: `def merge_overlapping_intervals(a, b):
  return [min(a[0], b[0]), max(a[1], b[1])]`,
    },
    cornerCases: [
      'No intervals',
      'Single interval',
      'Two intervals',
      'Non-overlapping intervals',
      'An interval totally consumed within another interval',
      'Duplicate intervals (exactly the same start and end)',
      'Intervals which start right where another interval ends - [[1, 2], [2, 3]]',
    ],
    interviewTips: [
      'Clarify whether [1, 2] and [2, 3] are considered overlapping intervals',
      'Clarify whether an interval [a, b] will strictly follow a < b',
    ],
    essentialQuestions: [
      { title: 'Merge Intervals', difficulty: 'Medium', url: 'https://leetcode.com/problems/merge-intervals/' },
      { title: 'Insert Interval', difficulty: 'Medium', url: 'https://leetcode.com/problems/insert-interval/' },
    ],
    recommendedQuestions: [
      { title: 'Non-overlapping Intervals', difficulty: 'Medium', url: 'https://leetcode.com/problems/non-overlapping-intervals/' },
      { title: 'Meeting Rooms', difficulty: 'Easy', url: 'https://leetcode.com/problems/meeting-rooms/', premium: true },
      { title: 'Meeting Rooms II', difficulty: 'Medium', url: 'https://leetcode.com/problems/meeting-rooms-ii/', premium: true },
    ],
    tips: [
      'Always sort intervals by start time as the first step.',
      'Master the overlap check: a[0] < b[1] and b[0] < a[1].',
      'Master the merge formula: [min(a[0], b[0]), max(a[1], b[1])].',
      'Edge cases around touching intervals (e.g., [1,2] and [2,3]) are common interview gotchas.',
    ],
  },
  {
    id: 'tih-dynamic-programming',
    title: 'Dynamic Programming',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Dynamic Programming (DP) is usually used to solve optimization problems. The only way to get better at DP is to practice. It takes some amount of practice to be able to recognize that a problem can be solved by DP. DP problems have overlapping subproblems and optimal substructure.`,
    techniques: [
      'Sometimes you do not need to store the whole DP table in memory - the last two values or the last two rows of the matrix will suffice',
      'Identify overlapping subproblems',
      'Define the state and state transition (recurrence relation)',
      'Determine if the problem has optimal substructure',
      'Start with a recursive solution, then memoize, then convert to bottom-up iterative',
    ],
    steps: [
      '1. Recognize the problem can be solved with DP (overlapping subproblems + optimal substructure)',
      '2. Define the state (what information do you need to solve a subproblem)',
      '3. Define the recurrence relation (how to build the solution from smaller subproblems)',
      '4. Identify base cases',
      '5. Determine the order of computation',
      '6. Optimize space if possible',
    ],
    cornerCases: [
      'Empty input',
      'Single element',
      'Two elements',
      'All elements are the same',
      'Negative values in the input',
    ],
    essentialQuestions: [
      { title: 'Climbing Stairs', difficulty: 'Easy', url: 'https://leetcode.com/problems/climbing-stairs/' },
      { title: 'Coin Change', difficulty: 'Medium', url: 'https://leetcode.com/problems/coin-change/' },
      { title: 'House Robber', difficulty: 'Medium', url: 'https://leetcode.com/problems/house-robber/' },
      { title: 'Longest Increasing Subsequence', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
    ],
    recommendedQuestions: [
      { title: '0/1 Knapsack or Partition Equal Subset Sum', difficulty: 'Medium', url: 'https://leetcode.com/problems/partition-equal-subset-sum/' },
      { title: 'Longest Common Subsequence', difficulty: 'Medium', url: 'https://leetcode.com/problems/longest-common-subsequence/' },
      { title: 'Word Break Problem', difficulty: 'Medium', url: 'https://leetcode.com/problems/word-break/' },
      { title: 'Combination Sum', difficulty: 'Medium', url: 'https://leetcode.com/problems/combination-sum-iv/' },
      { title: 'House Robber II', difficulty: 'Medium', url: 'https://leetcode.com/problems/house-robber-ii/' },
      { title: 'Decode Ways', difficulty: 'Medium', url: 'https://leetcode.com/problems/decode-ways/' },
      { title: 'Unique Paths', difficulty: 'Medium', url: 'https://leetcode.com/problems/unique-paths/' },
      { title: 'Jump Game', difficulty: 'Medium', url: 'https://leetcode.com/problems/jump-game/' },
    ],
    tips: [
      'The only way to get better at DP is to practice.',
      'If you can optimize space by only keeping the last row or last two values, mention it to the interviewer.',
      'Start with a recursive solution, add memoization, then convert to iterative bottom-up if needed.',
      'Common DP patterns: 0/1 Knapsack, Unbounded Knapsack, Fibonacci, LCS, LIS, Matrix Chain, etc.',
    ],
  },
  {
    id: 'tih-recursion',
    title: 'Recursion',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Recursion is a method of solving a computational problem where the solution depends on solutions to smaller instances of the same problem. All recursive functions contain two parts: a base case that defines when the recursion is stopped, and breaking down the problem into smaller subproblems and invoking the recursive call. Many algorithms relevant in coding interviews make heavy use of recursion - binary search, merge sort, tree traversal, depth-first search, etc.`,
    techniques: [
      'Memoization - cache previously computed results to avoid redundant computation (converts exponential to polynomial time)',
      'Backtracking - generate all combinations by exploring and undoing choices',
      'Always define a base case to prevent infinite recursion',
      'Recursion is useful for permutation problems as it generates all combinations',
      'All recursive approaches can be rewritten iteratively using a stack',
    ],
    cornerCases: [
      'n = 0',
      'n = 1',
      'Make sure you have enough base cases to cover all possible invocations of the recursive function',
    ],
    interviewTips: [
      'Always remember to define a base case so recursion will end',
      'Recursion is useful for permutation, combination, and tree-based questions',
      'Know how to generate all permutations of a sequence and handle duplicates',
      'Recursion implicitly uses a stack - all recursive approaches can be rewritten iteratively',
      'Beware of stack overflow for deep recursion (default Python limit is 1000)',
      'Recursion will never be O(1) space because a stack is involved, unless there is tail-call optimization (TCO)',
      'If your recursive function invokes fn(n-2), you should have 2 base cases; if fn(n-1), only 1 base case is needed',
    ],
    essentialQuestions: [
      { title: 'Generate Parentheses', difficulty: 'Medium', url: 'https://leetcode.com/problems/generate-parentheses/' },
      { title: 'Combinations', difficulty: 'Medium', url: 'https://leetcode.com/problems/combinations/' },
      { title: 'Subsets', difficulty: 'Medium', url: 'https://leetcode.com/problems/subsets/' },
    ],
    recommendedQuestions: [
      { title: 'Letter Combinations of a Phone Number', difficulty: 'Medium', url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/' },
      { title: 'Subsets II', difficulty: 'Medium', url: 'https://leetcode.com/problems/subsets-ii/' },
      { title: 'Permutations', difficulty: 'Medium', url: 'https://leetcode.com/problems/permutations/' },
      { title: 'Sudoku Solver', difficulty: 'Hard', url: 'https://leetcode.com/problems/sudoku-solver/' },
      { title: 'Strobogrammatic Number II', difficulty: 'Medium', url: 'https://leetcode.com/problems/strobogrammatic-number-ii/', premium: true },
    ],
    tips: [
      'Memoization can turn an O(2^n) recursive solution into O(n) - always consider it.',
      'The Fibonacci sequence is the classic example: fib(3) is called multiple times without memoization.',
      'Find out if your chosen language supports tail-call optimization (TCO).',
      'Number of base cases should match the step size of recursive calls.',
    ],
  },
  {
    id: 'tih-matrix',
    title: 'Matrix',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `A matrix is a 2-dimensional array. Questions involving matrices are usually related to dynamic programming or graph traversal. Matrices can be used to represent graphs where each node is a cell with 4 neighbors (except edge and corner cells). Many grid-based games can be modeled as a matrix, such as Tic-Tac-Toe, Sudoku, Crossword, Connect 4, Battleship, etc.`,
    techniques: [
      'Creating an empty N x M matrix initialized to zero/empty values for visited state or DP table',
      'Copying a matrix: copied_matrix = [row[:] for row in matrix] (Python)',
      'Transposing a matrix: interchanging rows into columns',
      'For games requiring vertical and horizontal verification, write horizontal check, transpose, and reuse horizontal logic for vertical',
    ],
    codeTemplates: {
      createZeroMatrix: `zero_matrix = [[0 for _ in range(len(matrix[0]))] for _ in range(len(matrix))]`,
      copyMatrix: `copied_matrix = [row[:] for row in matrix]`,
      transposeMatrix: `transposed_matrix = [[matrix[i][j] for i in range(len(matrix))] for j in range(len(matrix[0]))]`,
    },
    cornerCases: [
      'Empty matrix - check that none of the arrays are 0 length',
      '1 x 1 matrix',
      'Matrix with only one row or column',
    ],
    essentialQuestions: [
      { title: 'Set Matrix Zeroes', difficulty: 'Medium', url: 'https://leetcode.com/problems/set-matrix-zeroes/' },
      { title: 'Spiral Matrix', difficulty: 'Medium', url: 'https://leetcode.com/problems/spiral-matrix/' },
    ],
    recommendedQuestions: [
      { title: 'Rotate Image', difficulty: 'Medium', url: 'https://leetcode.com/problems/rotate-image/' },
      { title: 'Valid Sudoku', difficulty: 'Medium', url: 'https://leetcode.com/problems/valid-sudoku/' },
    ],
    tips: [
      'For traversal and DP problems, always create a copy of the matrix for visited state.',
      'Transposing a matrix is a useful trick for problems that require both horizontal and vertical checks.',
      'Matrix problems often overlap with graph traversal (BFS/DFS on a grid).',
    ],
  },
  {
    id: 'tih-binary',
    title: 'Binary',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Knowledge of binary number system and bit manipulation is less important in coding interviews as most Software Engineers do not have to deal with bits. They are still asked sometimes, so you should at least know how to convert a number from decimal to binary (and vice versa) in your chosen programming language.`,
    techniques: [
      'Test kth bit is set: num & (1 << k) != 0',
      'Set kth bit: num |= (1 << k)',
      'Turn off kth bit: num &= ~(1 << k)',
      'Toggle the kth bit: num ^= (1 << k)',
      'Multiply by 2^k: num << k',
      'Divide by 2^k: num >> k',
      'Check if a number is a power of 2: (num & (num - 1)) == 0 or (num & (-num)) == num',
      'Swapping two variables: num1 ^= num2; num2 ^= num1; num1 ^= num2',
    ],
    cornerCases: [
      'Be aware and check for overflow/underflow',
      'Negative numbers',
    ],
    essentialQuestions: [
      { title: 'Sum of Two Integers', difficulty: 'Medium', url: 'https://leetcode.com/problems/sum-of-two-integers/' },
      { title: 'Number of 1 Bits', difficulty: 'Easy', url: 'https://leetcode.com/problems/number-of-1-bits/' },
    ],
    recommendedQuestions: [
      { title: 'Counting Bits', difficulty: 'Easy', url: 'https://leetcode.com/problems/counting-bits/' },
      { title: 'Missing Number', difficulty: 'Easy', url: 'https://leetcode.com/problems/missing-number/' },
      { title: 'Reverse Bits', difficulty: 'Easy', url: 'https://leetcode.com/problems/reverse-bits/' },
      { title: 'Single Number', difficulty: 'Easy', url: 'https://leetcode.com/problems/single-number/' },
    ],
    tips: [
      'Know the common bit manipulation tricks (test, set, clear, toggle bits).',
      'Power of 2 check: (n & (n-1)) == 0 is a classic trick.',
      'XOR is useful for finding the single unique element (all others appear twice).',
      'Be careful about negative numbers and overflow/underflow in typed languages.',
    ],
  },
  {
    id: 'tih-math',
    title: 'Math',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Math is a foundational aspect of Computer Science. For coding interviews, there usually won't be that much math involved, but some basic math techniques are helpful to know as you may be asked to implement mathematical operations.`,
    techniques: [
      'Multiples of a number: use the modulo operator (num % X == 0)',
      'Comparing floats: use epsilon comparisons instead of equality (abs(x - y) <= 1e-6)',
      'Fast operators: if asked to implement power, square root, or division faster than O(n), use doubling (fast exponentiation) or halving (binary search)',
    ],
    commonFormulas: {
      checkEven: 'num % 2 == 0',
      sumOneToN: '(N+1) * N / 2',
      sumGeometricProgression: '2^0 + 2^1 + ... + 2^n = 2^(n+1) - 1',
      permutations: 'N! / (N-K)!',
      combinations: 'N! / (K! * (N-K)!)',
    },
    cornerCases: [
      'Division by 0',
      'Multiplication by 1',
      'Negative numbers',
      'Floats',
    ],
    interviewTips: [
      'If code involves division or modulo, remember to check for division or modulo by 0',
      'Check for and handle overflow/underflow in typed languages like Java and C++',
      'Consider negative numbers and floating point numbers',
    ],
    essentialQuestions: [
      { title: 'Pow(x, n)', difficulty: 'Medium', url: 'https://leetcode.com/problems/powx-n/' },
      { title: 'Sqrt(x)', difficulty: 'Easy', url: 'https://leetcode.com/problems/sqrtx/' },
    ],
    recommendedQuestions: [
      { title: 'Integer to English Words', difficulty: 'Hard', url: 'https://leetcode.com/problems/integer-to-english-words/' },
    ],
    tips: [
      'Always check for division by zero.',
      'Use epsilon comparisons for floating point equality: abs(x - y) <= 1e-6.',
      'For fast power/sqrt implementations, think binary search or fast exponentiation.',
      'Know the formula for sum of 1 to N: (N+1) * N / 2.',
    ],
  },
  {
    id: 'tih-geometry',
    title: 'Geometry',
    source: 'Tech Interview Handbook',
    category: 'algorithms',
    introduction: `Geometry is a branch of mathematics concerned with properties of space related to distance, shape, size, and relative position of figures. In algorithm interviews, geometry is usually not the focus of the problem - you typically have to use other algorithms and/or data structures. You can expect only 2D geometry in interviews.`,
    techniques: [
      'Distance between two points: use dx^2 + dy^2 (no need to square root when comparing)',
      'Overlapping circles: check that the distance between centers is less than the sum of their radii',
      'Overlapping rectangles: rect_a.left < rect_b.right and rect_a.right > rect_b.left and rect_a.top > rect_b.bottom and rect_a.bottom < rect_b.top',
    ],
    codeTemplates: {
      rectangleOverlap: `overlap = rect_a.left < rect_b.right and \\
  rect_a.right > rect_b.left and \\
  rect_a.top > rect_b.bottom and \\
  rect_a.bottom < rect_b.top`,
    },
    cornerCases: [
      'Zero values - this always gets people',
    ],
    sampleQuestions: [
      'You have a plane with lots of rectangles on it, find out how many of them intersect.',
      'Which data structure would you use to query the k-nearest points of a set on a 2D plane?',
      'Given many points, find k points that are closest to the origin.',
      'How would you triangulate a polygon?',
    ],
    essentialQuestions: [
      { title: 'Rectangle Overlap', difficulty: 'Easy', url: 'https://leetcode.com/problems/rectangle-overlap/' },
    ],
    recommendedQuestions: [
      { title: 'K Closest Points to Origin', difficulty: 'Medium', url: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
      { title: 'Rectangle Area', difficulty: 'Medium', url: 'https://leetcode.com/problems/rectangle-area/' },
    ],
    tips: [
      'When comparing distances, use dx^2 + dy^2 - no need to compute square root.',
      'Rectangle overlap checks are a common interview question - know the formula.',
      'Geometry problems usually combine with other techniques like sorting, heaps, or divide and conquer.',
    ],
  },
];

// Interview cheatsheet: before, during, and after the interview
export const interviewCheatsheet = {
  before: [
    'Research the company thoroughly - understand their products, tech stack, and culture',
    'Review the job description and match your experience to the requirements',
    'Practice coding on a whiteboard or in a simple text editor (not an IDE)',
    'Prepare your self-introduction (keep it under 1 minute)',
    'Prepare 2-3 questions to ask the interviewer',
    'Ensure your environment is ready (quiet room, stable internet for remote interviews)',
    'Review your resume and be prepared to discuss any item on it',
    'Get a good night\'s sleep and eat well before the interview',
  ],
  during: [
    'Clarify the question - repeat it back to the interviewer in your own words',
    'Ask about input size, constraints, edge cases, and expected output format',
    'Think out loud - explain your thought process as you work through the problem',
    'Start with a brute force solution, then optimize',
    'Write clean, readable code with good variable names',
    'Test your solution with examples, including edge cases',
    'Analyze time and space complexity of your solution',
    'If stuck, try to break the problem into smaller subproblems',
    'Don\'t be afraid to ask for hints - it shows you can collaborate',
    'Manage your time - don\'t spend too long on any single part',
  ],
  after: [
    'Send a thank-you email within 24 hours',
    'Reflect on what went well and what could be improved',
    'Note down the questions asked for future reference',
    'Follow up if you haven\'t heard back within the expected timeframe',
    'Continue practicing regardless of the outcome',
  ],
};

// Behavioral interview questions with detailed STAR-format answers
export const behavioralQuestions = {
  general: [
    { q: 'Tell me about yourself.', a: 'I\'m a software engineer with 5+ years of experience building scalable distributed systems. Most recently, I led the migration of a monolithic application to microservices at my company, reducing deployment time from 2 hours to 15 minutes and improving system reliability to 99.95% uptime. I\'m passionate about solving complex infrastructure problems, and I\'m excited about this role because it aligns with my experience in cloud-native architecture and my goal to work on systems that serve millions of users.' },
    { q: 'Why do you want to work for this company?', a: 'I\'ve been following your engineering blog and I\'m impressed by the scale of problems you solve — particularly your recent work on real-time data processing pipelines. Your tech stack aligns with my expertise in Kubernetes and distributed systems. I also value your engineering culture of ownership and innovation. I spoke with two of your engineers at a recent conference, and their enthusiasm about the autonomy they have to make technical decisions convinced me this is where I want to build my career next.' },
    { q: 'Tell me about a time you had a conflict with a coworker and how you resolved it.', a: 'Situation: A senior engineer and I disagreed on whether to use GraphQL or REST for a new API layer. He was pushing GraphQL, but I believed REST was more appropriate for our use case. Task: I needed to resolve this without damaging our working relationship. Action: I proposed we both write a one-page technical comparison with pros/cons specific to our requirements (latency, caching, team familiarity). We presented to the team and discovered GraphQL solved our frontend N+1 query problem but REST was better for our internal services. Result: We implemented a hybrid approach — GraphQL for client-facing APIs and REST internally. We delivered 2 weeks early because we avoided the wrong all-or-nothing decision.' },
    { q: 'Describe a time when you went above and beyond.', a: 'Situation: On a Friday evening, our monitoring showed a slow memory leak in production that would crash the service by Monday morning. Task: This wasn\'t my on-call week, but the on-call engineer was dealing with a family emergency. Action: I volunteered to investigate, traced the leak to a connection pool that wasn\'t releasing database connections after timeouts, wrote a fix, tested it locally, and deployed a hotfix by midnight. I also added a Grafana dashboard to monitor connection pool metrics and set up PagerDuty alerts for future leaks. Result: The service ran without issues over the weekend, and the new monitoring caught two similar issues in other services within the next month — before they became critical.' },
    { q: 'Tell me about a time you failed and what you learned from it.', a: 'Situation: I pushed a database migration to production that added a new index on a 500M-row table without testing at scale. Task: The migration locked the table for 45 minutes during peak traffic, causing 500 errors for thousands of users. Action: I immediately rolled back, wrote a postmortem, and implemented a pre-production staging environment with production-sized data. I also introduced a migration review checklist requiring load testing for any schema change on tables over 1M rows. Result: We never had another migration incident. The checklist became a team standard, and I presented the postmortem at our engineering all-hands to help others learn from my mistake.' },
    { q: 'Describe a challenging project you worked on.', a: 'Situation: We needed to migrate 2TB of data from a legacy Oracle database to PostgreSQL with zero downtime — the system served 50K concurrent users. Task: I was the tech lead responsible for the migration strategy. Action: I designed a dual-write approach: new writes went to both databases simultaneously while a background process migrated historical data in batches. I built a validation pipeline that compared records between both databases to ensure consistency, and a feature flag system to gradually shift read traffic. Result: The migration completed over 3 weeks with zero downtime and zero data loss. We reduced database costs by 70% and improved query performance by 40%.' },
    { q: 'How do you prioritize your work when you have multiple deadlines?', a: 'I use a combination of impact assessment and stakeholder communication. First, I categorize tasks by urgency (deadline-driven) and importance (business impact). For example, last quarter I had three concurrent projects: a security patch (urgent + important), a new feature (important, flexible deadline), and a tech debt cleanup (important, no deadline). I fixed the security patch immediately, negotiated a one-week extension on the feature with the PM by explaining the trade-off, and scheduled tech debt work into sprint buffers. I communicate proactively — I\'d rather reset expectations early than miss a deadline silently.' },
    { q: 'Tell me about a time you had to learn something quickly.', a: 'Situation: Our team decided to adopt Kubernetes, but nobody had production experience with it. Task: I volunteered to become the team\'s K8s lead within 4 weeks. Action: I took a structured approach: spent week 1 on official docs and tutorials, week 2 building a local cluster and deploying our app, week 3 setting up monitoring (Prometheus/Grafana) and CI/CD pipelines, and week 4 migrating our staging environment. I documented everything in a team wiki and ran two lunch-and-learn sessions. Result: We had our first production workload on K8s within 6 weeks. I became the go-to person for container orchestration, and the documentation I created onboarded 3 new engineers without any hand-holding.' },
    { q: 'Describe a situation where you had to make a decision without complete information.', a: 'Situation: During a Black Friday traffic spike, our cache layer was failing and we had to decide in 10 minutes whether to scale horizontally (add more cache nodes) or vertically (upgrade existing nodes). Task: We didn\'t have time to run load tests for both options. Action: I looked at the metrics we DID have — memory was at 95% but CPU was only at 30%, suggesting the issue was data volume, not throughput. I made the call to scale horizontally, adding 4 nodes and redistributing the hash ring. I also prepared a rollback plan in case I was wrong. Result: The horizontal scaling worked — latency dropped from 2 seconds to 50ms within 5 minutes. The site handled 3x normal traffic without any further issues.' },
    { q: 'Tell me about a time you disagreed with your manager.', a: 'Situation: My manager wanted to rewrite our authentication service from scratch using a new framework, estimating 3 months. I believed we should incrementally refactor the existing service. Task: I needed to present my case respectfully with data. Action: I spent a weekend creating a proof-of-concept showing that 80% of the issues could be fixed by refactoring 3 key modules, taking approximately 4 weeks. I presented both approaches with a risk analysis spreadsheet showing that the rewrite had higher risk of scope creep. Result: My manager appreciated the analysis and agreed to try the incremental approach first. We completed the refactoring in 5 weeks, resolved all critical issues, and avoided the risk of a 3-month rewrite.' },
    { q: 'How do you handle receiving critical feedback?', a: 'I treat feedback as data, not judgment. In my last performance review, my manager said my code reviews were too nitpicky and slowing down the team. Initially I felt defensive, but I asked for specific examples. He showed me 3 PRs where I left 20+ comments on style issues. Action: I realized I was conflating style preferences with code quality. I set up automated linting rules to catch style issues, and focused my reviews on logic, architecture, and edge cases only. Result: PR review turnaround dropped from 2 days to 4 hours, team velocity increased by 20%, and the quality of reviews actually improved because I was focused on what mattered.' },
    { q: 'Describe a time when you had to persuade others to adopt your idea.', a: 'Situation: I proposed replacing our Jenkins CI/CD pipeline with GitHub Actions, but the DevOps team was resistant — they had spent 2 years customizing Jenkins. Task: I needed to convince them without dismissing their investment. Action: I built a side-by-side comparison: I migrated one small service to GitHub Actions and recorded the metrics — build time dropped from 12 minutes to 4 minutes, YAML config was 80% shorter, and maintenance overhead was near zero. I invited the DevOps lead to pair with me on a second migration so he could see it firsthand. Result: After seeing the data, the team voted unanimously to migrate. We completed the full migration in 6 weeks, and the DevOps team became the biggest advocates for the change.' },
    { q: 'Tell me about your biggest professional achievement.', a: 'I designed and built a real-time event processing system that handles 50,000 events per second with sub-100ms latency. The system replaced a batch-processing pipeline that had a 6-hour delay. I used Kafka for event streaming, Flink for processing, and Redis for real-time aggregations. The project took 4 months with a team of 3, and it directly enabled our product team to launch real-time analytics for customers — a feature that became our top revenue driver and contributed to a 25% increase in enterprise contract value.' },
    { q: 'How do you stay current with technology trends?', a: 'I have a structured approach: I subscribe to 5 engineering blogs (Netflix Tech Blog, Uber Engineering, AWS Architecture Blog, Martin Fowler, The Morning Paper), listen to 2 podcasts weekly (Software Engineering Daily, The Changelog), and attend 2-3 conferences per year. I also maintain side projects — currently building a distributed key-value store in Rust to learn both the language and distributed systems concepts. Most importantly, I share what I learn through internal tech talks and blog posts, which forces me to deeply understand topics rather than just skim them.' },
    { q: 'Describe a time when you mentored or helped a colleague.', a: 'Situation: A junior engineer on my team was struggling with system design — her code was good but she couldn\'t see the big picture of how services interact. Task: I became her informal mentor. Action: Every week for 3 months, we did a 30-minute "architecture walkthrough" where I drew our system on a whiteboard and asked her questions: "What happens if this service goes down?" "Where are the bottlenecks?" I also included her in design reviews and asked her to present one section of each design doc. Result: After 3 months, she led her first system design for a new microservice independently. She was promoted to mid-level within 6 months, and she now mentors two new joiners using the same approach.' },
  ],
  amazon: [
    { q: 'Tell me about a time you dealt with an ambiguous situation. (Bias for Action)', a: 'Situation: We received a vague requirement to "improve search performance" with no specific metrics or deadline. Task: Rather than waiting for clarification, I took action. Action: I instrumented our search service with detailed latency breakpoints, identified that 70% of slow queries were due to unoptimized Elasticsearch mappings, and proposed a phased optimization plan with clear metrics (p99 latency targets). I presented the data to stakeholders within 3 days. Result: We reduced p99 search latency from 2.5s to 200ms in 2 weeks. The bias for action meant we delivered value weeks before the product team even finalized their requirements.' },
    { q: 'Describe a time when you simplified a complex process. (Invent and Simplify)', a: 'Situation: Our deployment process required 14 manual steps across 3 different tools, taking 2 hours and frequently causing errors. Task: Simplify to a one-click deployment. Action: I consolidated all steps into a single CI/CD pipeline using GitHub Actions, with automated testing, canary deployments, and automatic rollback on error rate spikes. I eliminated 3 redundant approval steps by implementing automated security scanning. Result: Deployment time dropped from 2 hours to 8 minutes, deployment errors went from 15% to 0%, and we went from weekly releases to multiple deployments per day.' },
    { q: 'Tell me about a time you made a decision that wasn\'t popular. (Have Backbone; Disagree and Commit)', a: 'Situation: The team wanted to adopt a trendy new framework for our frontend rewrite. I analyzed our requirements and concluded our existing framework with targeted improvements was the better choice. Task: I had to present an unpopular opinion backed by data. Action: I created a comparison document showing migration costs (6 months, 3 engineers), risk of bugs in the new framework (it was only v1.2), and demonstrated that 80% of our performance issues were due to our data fetching patterns, not the framework. Result: Initially the team was disappointed, but after we fixed the data fetching in 3 weeks and saw a 60% performance improvement, everyone agreed it was the right call.' },
    { q: 'Give an example of when you took a calculated risk. (Bias for Action)', a: 'Situation: Our database was approaching capacity limits and we had 6 weeks before it would impact users. The safe option was a 4-week vertical scaling migration. Task: I proposed a riskier but faster approach — horizontal sharding in 2 weeks. Action: I identified that 90% of our queries were tenant-scoped, making sharding straightforward. I built a proof-of-concept in 2 days, created a detailed rollback plan, and ran load tests with production-mirrored traffic. Result: We completed the sharding in 10 days with zero downtime. The extra 4 weeks of buffer allowed us to optimize shard distribution and handle 10x our current load.' },
    { q: 'Tell me about a time you had to work with limited resources. (Frugality)', a: 'Situation: Our AWS bill was $80K/month and growing 20% quarterly, but we had no budget for new infrastructure tools. Task: Reduce costs without impacting performance. Action: I audited every resource: identified $15K in unused EC2 instances, switched 40% of workloads to spot instances with graceful handling, implemented auto-scaling policies based on actual traffic patterns instead of peak provisioning, and moved cold data to S3 Glacier. Result: Monthly AWS costs dropped to $45K — a 44% reduction — while actually improving performance because auto-scaling matched resources to real demand.' },
    { q: 'Describe a time when you went deep to solve a problem. (Dive Deep)', a: 'Situation: Users reported intermittent 500 errors that our monitoring couldn\'t reproduce — happening about 5 times per day across 100K requests. Task: Find the root cause of a rare, hard-to-reproduce bug. Action: I added granular distributed tracing, analyzed 2 weeks of error logs with custom scripts, and discovered the errors correlated with garbage collection pauses in our JVM service exceeding the load balancer\'s timeout. I profiled memory allocation patterns and found a specific API endpoint was creating 50x more temporary objects than others. Result: Fixing the memory allocation pattern eliminated the errors completely. I also set up GC pause monitoring as a standard metric across all JVM services.' },
    { q: 'Tell me about a time you raised the bar for your team. (Insist on the Highest Standards)', a: 'Situation: Our team had no code review standards — reviews were inconsistent and sometimes skipped entirely. Task: Establish engineering excellence without creating bureaucracy. Action: I wrote a lightweight code review guide (1 page), introduced mandatory PR reviews with a 24-hour SLA, set up automated testing gates (no merge without 80% coverage), and led by example with thorough but constructive reviews. I also created a "review of the week" award for the best review. Result: Bug escape rate dropped 60%, average PR quality improved measurably, and the team started taking pride in their review culture. The guide was adopted by 3 other teams.' },
    { q: 'Give an example of when you delivered results under tight deadlines. (Deliver Results)', a: 'Situation: A critical partner integration needed to launch in 10 days — half the estimated timeline — due to a contractual deadline. Task: Deliver a production-ready integration without cutting corners on quality. Action: I broke the work into 3 parallel workstreams, paired with two engineers for the first 3 days to unblock them, automated testing from day 1 to avoid a crunch at the end, and negotiated with the partner to simplify 2 non-essential features for a v1.1 follow-up. Result: We launched on day 9 with zero defects. The partner integration generated $2M in revenue in its first quarter. The simplified features shipped 2 weeks later.' },
    { q: 'Tell me about a time you earned the trust of a group. (Earn Trust)', a: 'Situation: I joined a new team where engineers were skeptical of a "senior hire" coming in. Task: Build trust through actions, not title. Action: I spent my first 2 weeks doing on-call rotations, fixing bugs, and learning the codebase before suggesting any changes. I asked questions instead of making declarations, credited team members publicly for their expertise, and took on the least glamorous task (upgrading a legacy dependency) that nobody wanted. Result: Within a month, the team started coming to me for advice. Within 3 months, they nominated me to lead the team\'s biggest project — not because of my title, but because I had earned their trust.' },
    { q: 'Describe a time when you put the customer first. (Customer Obsession)', a: 'Situation: Our analytics dashboard loaded in 8 seconds — technically within our SLA but users were complaining. The product team said it was "good enough." Task: I believed the customer experience was unacceptable. Action: I spent 2 days profiling the dashboard, found that we were making 47 API calls on page load that could be reduced to 3 with a BFF (Backend for Frontend) pattern. I built a prototype over a weekend that loaded in 1.2 seconds. Result: After seeing the prototype, the product team prioritized the optimization. Customer satisfaction scores for the dashboard went from 3.2 to 4.7 out of 5, and support tickets about performance dropped 90%.' },
    { q: 'Tell me about a time you thought big. (Think Big)', a: 'Situation: Our notification system sent emails only, and teams kept requesting SMS, push, and Slack support. Each request was handled as a one-off project. Task: I proposed building a universal notification platform. Action: I designed a channel-agnostic notification service with a plugin architecture — add a new channel by implementing a single interface. I built the core platform with email and SMS in the first sprint, then enabled other teams to contribute push and Slack plugins. Result: The platform now handles 5 channels and 10M notifications/day. What used to take 2 weeks per channel now takes 2 days. Three other teams adopted it, and it became a company-wide shared service.' },
    { q: 'Give me an example of when you took ownership beyond your role. (Ownership)', a: 'Situation: I noticed our customer-facing error messages were generic ("Something went wrong") even though our backend had detailed error information. No team owned this problem. Task: I took ownership even though it spanned frontend, backend, and design. Action: I created an error taxonomy with 50 common error scenarios, wrote user-friendly messages for each, built a centralized error translation service, and coordinated with the design team on error UI patterns. Result: Customer support tickets for "unclear errors" dropped 75%. The error service became a standard component, and I was asked to present it at our engineering summit.' },
    { q: 'Describe how you hired or developed the best people. (Hire and Develop the Best)', a: 'Situation: Our team needed to hire 3 engineers in a competitive market. Task: Attract top talent and set them up for success. Action: I redesigned our interview process — replaced whiteboard coding with take-home projects relevant to our actual work, added a system design discussion, and created a structured scoring rubric to reduce bias. For onboarding, I built a 30-60-90 day plan with clear milestones and paired each new hire with a buddy. Result: We hired 3 excellent engineers in 6 weeks (down from our usual 12-week cycle). All three were productive contributors within their first month, and our interview process was adopted company-wide.' },
    { q: 'Tell me about a time you learned something outside your comfort zone. (Learn and Be Curious)', a: 'Situation: Our team was adopting machine learning for fraud detection, but I had zero ML experience. Task: I needed to understand ML well enough to design the infrastructure around it. Action: I took Andrew Ng\'s ML course on Coursera evenings and weekends, then worked directly with our data scientist to understand model training pipelines. I built the feature store and model serving infrastructure using what I learned. Result: I went from zero ML knowledge to designing a production ML pipeline in 3 months. The fraud detection system blocked $2M in fraudulent transactions in its first quarter.' },
  ],
  google: [
    { q: 'Tell me about a time you had to handle a difficult technical challenge.', a: 'Situation: Our search service had a tail latency problem — p99 was 10x worse than p50, causing timeouts for 1% of users. Task: Diagnose and fix a problem that only manifested under specific conditions. Action: I built a custom profiling tool that captured full request traces only when latency exceeded the p95 threshold. After analyzing 500 slow traces, I discovered that cache misses on long-tail queries triggered expensive database joins. I implemented a tiered caching strategy with a bloom filter to identify cache-worthy queries. Result: P99 latency dropped from 5s to 300ms, and the technique was adopted across 4 other services.' },
    { q: 'Describe a project where you demonstrated leadership without formal authority.', a: 'Situation: Three teams were independently building similar authentication middleware, duplicating effort. Task: Align these teams on a shared solution without any organizational authority over them. Action: I organized a cross-team tech talk demonstrating the duplication, created an RFC for a shared auth library, volunteered to build the first version, and individually met with each tech lead to understand their specific requirements. I incorporated their feedback and gave each team credit for their contributions. Result: All three teams adopted the shared library within 2 months, saving an estimated 6 engineering-months of duplicated work per year.' },
    { q: 'How have you dealt with ambiguity in a project?', a: 'Situation: I was asked to "improve reliability" for a platform serving 200 teams with no specific targets, timeline, or scope defined. Action: I started by defining what reliability meant for us — I established SLOs based on user surveys and historical data (99.95% availability, p99 < 500ms). I created an error budget policy and built automated SLO tracking dashboards. I then prioritized the top 3 reliability risks based on historical incidents. Result: Within one quarter, we went from unmeasured reliability to a clear framework. Availability improved from ~99.8% to 99.97%, and teams could now make data-driven decisions about feature velocity vs. reliability investments.' },
    { q: 'Tell me about a time you improved a process or system.', a: 'Situation: Our incident response process was ad-hoc — no structured runbooks, no clear roles, average resolution time was 2 hours. Action: I studied Google\'s SRE practices and implemented a lightweight incident management framework: defined Incident Commander and Communication Lead roles, created runbooks for the top 20 incident types, and built a Slack bot that auto-creates incident channels and tracks timelines. Result: Mean time to resolution dropped from 2 hours to 35 minutes. The structured process also improved our postmortem quality, leading to 40% fewer repeat incidents.' },
    { q: 'Describe a situation where you had to balance multiple priorities.', a: 'Situation: I was simultaneously leading a database migration (high risk, deadline-driven), mentoring 2 junior engineers, and contributing to a cross-team platform initiative. Action: I time-boxed my week: mornings for the migration (deep focus work), 30 minutes daily with each mentee (consistent but bounded), and Friday afternoons for the platform initiative. I was transparent with all stakeholders about my capacity and proactively flagged when the migration hit an unexpected complexity that needed me to temporarily deprioritize the platform work. Result: All three delivered successfully — migration on time, both mentees progressed well, and my platform contributions were valued because they were focused and high-quality rather than spread thin.' },
    { q: 'Tell me about a time you collaborated across teams to deliver results.', a: 'Situation: We needed to build a real-time fraud detection system that required data from 4 different team-owned services. Action: I organized a weekly cross-team sync, created a shared data contract document, and built adapters for each team\'s data format so they didn\'t need to change their APIs. When one team was blocked on a dependency, I offered to help them with their internal work to unblock our integration. Result: The system launched on schedule with buy-in from all 4 teams. It detected $5M in fraudulent activity in the first month, and the collaboration model we established became the template for future cross-team projects.' },
    { q: 'How do you approach problems that don\'t have clear solutions?', a: 'I follow a structured exploration process: first, I clearly define the problem and the constraints. Then I generate 3-4 potential approaches, build small proof-of-concepts for the top 2, and evaluate them against defined criteria. For example, when choosing between event sourcing and traditional CRUD for a new service, I built both approaches with real data for one entity, measured write throughput, query patterns, and developer experience, then chose event sourcing based on our specific audit trail requirements. The key is making the decision process transparent and reversible where possible.' },
    { q: 'Describe a time when you had to adapt your communication style.', a: 'Situation: I was presenting a technical architecture proposal to a mixed audience — engineers, product managers, and executives. Action: I created three versions of the same content: a detailed RFC for engineers with code examples and performance benchmarks, a product impact summary for PMs showing user-facing improvements and timeline, and a one-page executive brief with costs, risks, and ROI. During the presentation, I led with the business impact (for executives), covered the product changes (for PMs), and saved the deep technical dive for the Q&A (for engineers). Result: The proposal was approved in a single meeting instead of the usual 3-meeting cycle, and my manager said it was the most effective cross-functional presentation he\'d seen.' },
    { q: 'Tell me about a product or feature you\'re proud of building.', a: 'I built an intelligent alerting system that reduced alert fatigue from 200+ daily alerts to ~15 actionable ones. The system used correlation analysis to group related alerts, historical data to identify alerts that were never acted on (and auto-muted them), and ML-based anomaly detection to replace static thresholds. The most impactful part was the "alert score" — each alert got a severity score based on user impact, helping on-call engineers prioritize. Result: On-call burnout dropped significantly, mean time to acknowledge critical alerts improved by 70%, and the system is now used by 30+ teams across the organization.' },
    { q: 'How do you measure the success of your work?', a: 'I measure success at three levels: technical (does it work reliably — uptime, latency, error rates), business (does it deliver value — user engagement, revenue impact, cost savings), and team (does it make the team better — reduced toil, better developer experience, knowledge shared). For example, when I built our CI/CD pipeline, I tracked: build success rate (99.2%), deployment frequency (3x increase), time-to-production (4 hours to 15 minutes), and developer satisfaction survey scores (4.1 to 4.8). I believe the best engineering work is invisible to users — they just experience a product that works.' },
  ],
  meta: [
    { q: 'Tell me about a time you moved fast to deliver something. (Move Fast)', a: 'Situation: A competitor launched a feature similar to what we had been planning for Q3. Task: Ship our version in 2 weeks instead of the planned 8 weeks. Action: I identified the MVP — the 3 core user flows that delivered 80% of the value. I stripped out the nice-to-haves (custom themes, advanced analytics), built a feature flag to gradually roll out, and deployed with synthetic monitoring from day one. I worked with the PM to communicate the phased approach to stakeholders. Result: We launched in 11 days. User adoption was 2x our forecast because the focused MVP was actually easier to use than our original complex design. The remaining features shipped over the next month.' },
    { q: 'Describe a time when you built something from scratch.', a: 'I designed and built our company\'s first real-time experimentation platform from zero. Previously, A/B tests took 2 weeks to set up and results were analyzed manually in spreadsheets. I built a self-service platform where engineers could define experiments via a YAML config, integrated it with our feature flag system for automatic traffic splitting, and built a real-time statistics dashboard with automatic significance detection. The platform reduced experiment setup time from 2 weeks to 30 minutes and is now used by 50+ teams running 200+ experiments per quarter.' },
    { q: 'How do you prioritize what to work on?', a: 'I use a framework I call "Impact per Engineering Hour." I list potential projects, estimate the impact (users affected x severity of the problem), estimate the effort, and rank by the ratio. I also weight for urgency, strategic alignment, and whether the work unblocks other teams. For example, last quarter I chose to build a shared caching library (medium effort, unblocked 5 teams) over a performance optimization (lower effort, helped only our team). I review priorities weekly with my manager and adjust based on new information — rigidity in prioritization is as bad as no prioritization.' },
    { q: 'Tell me about a time you had to give difficult feedback.', a: 'Situation: A talented engineer on my team was consistently shipping code without adequate tests, causing regression bugs. Task: Give honest feedback without demotivating them. Action: I scheduled a private 1-on-1, started by acknowledging their strong problem-solving skills, then shared specific data — 3 production bugs in the last month traced to untested code paths. I asked them what barriers they faced with testing (turns out our test infrastructure was slow). We agreed on a plan: I helped fix the test infrastructure, and they committed to a 80% coverage minimum. Result: Their test coverage went from 30% to 90% in 6 weeks, regression bugs dropped to zero, and they thanked me later for the honest conversation.' },
    { q: 'Describe a project where you had significant impact.', a: 'I led the redesign of our API gateway that processes 100K requests per second. The legacy gateway had become a bottleneck — adding new routes took days of manual configuration. I built a new gateway using Envoy with dynamic configuration, automated route discovery from service registries, and per-route rate limiting. The project took 3 months with 2 engineers. Result: New service onboarding went from 3 days to 5 minutes, latency overhead dropped from 15ms to 2ms, and the gateway handled a 5x traffic spike during a viral event without any manual intervention.' },
    { q: 'Tell me about a time you had to make a trade-off between speed and quality.', a: 'Situation: We needed to launch a payment processing feature for a major partner within 4 weeks, but a fully robust implementation with retry logic, idempotency, and comprehensive error handling would take 8 weeks. Action: I made a deliberate trade-off: built the core payment flow with strong idempotency guarantees (non-negotiable for financial operations) but implemented simplified retry logic (exponential backoff only, no dead-letter queue) and basic error handling (log and alert, not auto-recover). I documented every shortcut as tech debt tickets with clear priorities. Result: We launched on time with zero payment errors. The tech debt was addressed over the following 6 weeks, and the documented shortcuts made it easy for another engineer to improve.' },
    { q: 'How do you approach building for scale?', a: 'I design for 10x current load but build for 2x. This means the architecture supports horizontal scaling (stateless services, partitioned data), but I don\'t pre-optimize until metrics show we need it. For example, I start with a single database and add read replicas when read latency increases, rather than starting with a complex sharded setup. I always instrument from day one — you can\'t scale what you can\'t measure. I also build circuit breakers and graceful degradation from the start, because failures at scale are inevitable and how you handle them defines reliability.' },
    { q: 'Describe a time when you learned from a mistake.', a: 'I once deployed a configuration change that accidentally disabled rate limiting in production for 3 hours. A bot flooded our API with 10x normal traffic, which degraded performance for real users. The root cause was that our config management had no validation — any YAML value was accepted. After the incident, I built a config validation framework that type-checks values, runs integration tests against config changes, and requires a second approval for any production config modification. The framework caught 12 potentially dangerous config changes in its first month.' },
    { q: 'Tell me about a time you drove alignment across teams.', a: 'Situation: Three teams had conflicting opinions on how to implement a shared logging standard — structured vs unstructured, centralized vs distributed, different retention policies. Action: Instead of debating opinions, I facilitated a working session where each team presented their requirements and constraints. I mapped the overlaps (everyone needed structured logging) and conflicts (different retention needs). I proposed a tiered solution: shared structured format with per-team retention configs. I built the reference implementation and offered to migrate the first service for each team. Result: All teams adopted the standard within 6 weeks, and cross-team debugging time dropped by 60% because logs were now consistent and searchable.' },
    { q: 'How do you handle disagreements about technical direction?', a: 'I focus on data over opinions. When two engineers recently disagreed about microservices vs monolith for a new project, I proposed we evaluate both against our specific criteria: team size (4 engineers), deployment frequency needs, and operational complexity tolerance. We scored each option 1-5 on 8 criteria. The monolith scored higher for our small team size and deployment needs. The key is making the decision framework explicit, so the disagreement becomes about criteria weights rather than personal preferences. I also make sure the "losing" side feels heard and that we document why we decided, so we can revisit if assumptions change.' },
  ],
  microsoft: [
    { q: 'Tell me about a time you demonstrated a growth mindset.', a: 'Situation: After 3 years as a backend engineer, I received feedback that my frontend skills were limiting my effectiveness as a full-stack team member. Action: Instead of dismissing it ("I\'m a backend engineer"), I embraced it as a growth opportunity. I took on the next frontend-heavy project, paired with our strongest frontend engineer for the first sprint, took a React course on weekends, and submitted my code for extra-thorough review. Result: Within 4 months, I was confidently building full-stack features independently. This experience taught me that the skills I\'m weakest in often have the highest growth ROI.' },
    { q: 'Describe a situation where you had to influence without authority.', a: 'Situation: I noticed that 3 teams were building similar internal tools independently, wasting engineering capacity. I had no authority over any of these teams. Action: I created a comparison document showing the overlap, organized a "demo day" where each team showcased their tool, and facilitated a discussion about combining efforts. I volunteered to lead the unification effort as a 20% project, reporting progress weekly to all three teams. Result: We consolidated into one shared tool in 8 weeks, freeing up 2 engineers across the teams. The approach worked because I led with service, not authority.' },
    { q: 'How do you approach diversity and inclusion in your work?', a: 'I actively focus on three areas: in hiring, I ensure job descriptions use inclusive language and our interview panels represent diverse perspectives. In code reviews, I watch for biased variable naming and ensure our products handle international names, right-to-left languages, and accessibility requirements. In meetings, I make space for quieter team members by using techniques like round-robin input and async pre-reads. Specifically, I noticed a junior engineer was being talked over in design discussions, so I started explicitly asking for her input first on topics in her domain — her contributions improved our designs significantly.' },
    { q: 'Tell me about a time you collaborated with a difficult stakeholder.', a: 'Situation: A product manager consistently changed requirements mid-sprint, causing rework and frustration. Action: Instead of escalating, I scheduled a 1-on-1 to understand their perspective. I learned they were getting pressure from sales for custom features. I proposed a compromise: a weekly 15-minute "requirement check-in" where they could share upcoming changes, and I\'d assess impact before they were committed. I also created a simple impact calculator showing the cost of mid-sprint changes in delayed features. Result: Mid-sprint changes dropped 80%. The PM appreciated having a partner who helped them manage stakeholder expectations with data.' },
    { q: 'Describe a project that failed and what you learned.', a: 'We spent 4 months building a sophisticated ML-based recommendation engine that performed worse than a simple "most popular" baseline. The failure was that we optimized for technical sophistication over user behavior understanding. I learned three lasting lessons: always establish a baseline before building complex solutions, validate assumptions with A/B tests early (we waited until the end), and involve data scientists and product managers in technical design — not just engineering. I now start every project by asking "what\'s the simplest thing that could possibly work?" and prove it\'s insufficient before adding complexity.' },
    { q: 'How do you balance innovation with customer needs?', a: 'I use a "70/20/10" mental model: 70% of effort on proven improvements customers are asking for (reliability, performance, usability), 20% on adjacent innovations that address unspoken needs (like the caching layer our customers didn\'t know they needed but loved), and 10% on exploratory ideas. The key is tying innovation back to customer outcomes. When I proposed rebuilding our deployment pipeline, I didn\'t pitch "we should use Kubernetes" — I pitched "customers need zero-downtime deployments" and Kubernetes was the enabler. Innovation for its own sake doesn\'t serve customers.' },
    { q: 'Tell me about a time you had to make a tough ethical decision.', a: 'Situation: I discovered that our analytics was tracking user behavior more granularly than our privacy policy disclosed. Technically it wasn\'t a violation since the data was anonymized, but it felt ethically wrong. Action: I raised it with my manager and our privacy team, documenting exactly what was being collected versus what was disclosed. I proposed either updating the privacy policy or reducing our tracking. Result: The company chose to reduce tracking AND update the policy for transparency. We lost some analytics granularity but gained user trust. My manager commended me for raising it proactively.' },
    { q: 'Describe how you stay productive in a large organization.', a: 'I protect my focus time aggressively: I block 3 hours every morning for deep work, batch meetings into afternoon slots, and use async communication (docs, PRs, Slack threads) over meetings wherever possible. I also maintain a personal "decision log" — when I make a technical decision, I document the context, alternatives considered, and rationale. This saves enormous time when the same question comes up 3 months later. For cross-org dependencies, I identify the specific person I need (not the team) and build a direct relationship, which cuts through organizational layers.' },
    { q: 'Tell me about a time you empowered others to succeed.', a: 'Situation: Two junior engineers were always waiting for me to review and approve their designs before proceeding. Task: Build their confidence to make independent decisions. Action: I created a "design decision framework" — a checklist of questions they should answer before proposing a design (scalability, maintainability, failure modes). For the next 3 designs, I asked them to present their analysis using the framework, then asked guiding questions rather than giving answers. I gradually moved from approving designs to just being available for consultation. Result: Both engineers now lead design discussions independently, and one of them created an improved version of my framework that the whole team adopted.' },
    { q: 'How do you approach accessibility in software development?', a: 'I treat accessibility as a quality requirement, not a separate workstream. Concretely: I include WCAG 2.1 AA compliance in our definition of done, use semantic HTML and ARIA attributes from the start, test with screen readers (VoiceOver, NVDA) during development, ensure keyboard navigation works for all interactive elements, and maintain color contrast ratios above 4.5:1. I also championed adding automated accessibility testing (axe-core) to our CI pipeline. The biggest impact was when I discovered that our most-used dashboard was completely unusable with a screen reader — fixing it opened our product to an underserved market segment.' },
  ],
  apple: [
    { q: 'Tell me about a time you obsessed over the details of a product.', a: 'Situation: We were building a data export feature — functionally simple, but I noticed the CSV download had inconsistent date formats and the progress indicator jumped from 0% to 100% with no intermediate updates. Action: I standardized all dates to ISO 8601 with timezone, added real-time progress tracking using WebSocket updates, included a subtle animation that made the wait feel shorter, and added a "preview first 10 rows" feature so users could verify the format before downloading a large file. Result: What could have been a forgettable utility feature became our highest-rated feature in the quarterly user survey. Three customers specifically mentioned the progress indicator and preview in their feedback.' },
    { q: 'Describe a situation where you had to say no to a feature request.', a: 'Situation: Sales wanted us to add a custom reporting builder that would let enterprise customers create any query against our database. Action: I analyzed the request and identified three concerns: security risk (arbitrary queries on production data), performance impact (unoptimized queries could DOS our database), and maintenance cost (supporting custom SQL). Instead of just saying no, I proposed an alternative: 15 pre-built report templates covering 90% of use cases, with a request form for custom reports that our team would build and optimize. Result: Sales was initially disappointed, but customer adoption of the templates was higher than expected, and we avoided the security and performance risks entirely.' },
    { q: 'How do you balance perfection with shipping on time?', a: 'I distinguish between "core perfection" and "surface polish." The core — data integrity, security, reliability — must be perfect, no exceptions. Surface elements — animations, edge case UI states, advanced configuration — can be iterated. For example, when shipping our payment system, I insisted on perfect idempotency handling and encryption (core), but launched with a basic success/error page instead of the beautifully designed confirmation flow (surface). We shipped on time with zero payment errors, and the polished UI followed 2 weeks later. The key is knowing which imperfections users will forgive and which they won\'t.' },
    { q: 'Tell me about a time you simplified a complex user experience.', a: 'Situation: Our Kubernetes deployment interface had 47 configuration fields, and users frequently misconfigured deployments. Action: I analyzed 6 months of deployment data and found that 85% of deployments used the same 8 fields. I redesigned the interface into two modes: "Quick Deploy" (8 fields with smart defaults) and "Advanced" (all 47 fields, collapsed by default). I also added real-time validation with plain-English error messages like "Your memory request exceeds the cluster limit of 4GB" instead of "InvalidResourceSpec." Result: Deployment errors dropped 75%, time-to-deploy decreased from 15 minutes to 3 minutes, and not a single user complained about the "missing" fields because they were still accessible in Advanced mode.' },
    { q: 'Describe your approach to maintaining high quality standards.', a: 'I build quality into the process rather than inspecting it at the end. My approach: automated testing (unit + integration + e2e) runs on every commit, code review focuses on design and edge cases (linting handles style), performance budgets are enforced in CI (no PR merged if it adds more than 50ms latency), and we maintain a "quality scorecard" per service (uptime, error rate, p99 latency, test coverage). When quality dips, we pause feature work to address it — a "quality sprint" every 6 weeks. This systematic approach means quality is everyone\'s job, not just QA\'s.' },
    { q: 'Tell me about a time you had to defend a design decision.', a: 'Situation: I chose to use PostgreSQL with JSONB columns instead of MongoDB for a new service, and several engineers argued MongoDB was the "right tool" for document storage. Action: I prepared a comparison based on our specific requirements: we needed ACID transactions across related documents (PostgreSQL wins), our query patterns included joins and aggregations (PostgreSQL wins), and our team had deep PostgreSQL expertise (faster development). I built a benchmark with realistic data showing PostgreSQL JSONB performed within 5% of MongoDB for our read patterns while offering superior write consistency. Result: The team accepted the decision with full understanding of the trade-offs. Six months later, the ACID transactions saved us from a data consistency bug that would have been a nightmare with MongoDB.' },
    { q: 'How do you approach cross-functional collaboration?', a: 'I invest in understanding other functions\' constraints and goals before proposing solutions. When working with design, I learn their design system and suggest technically feasible alternatives before they finalize mockups. With product, I share early technical prototypes so they can validate assumptions with users. With QA, I write testability into my designs and pair on test plan creation. For example, I recently embedded with our design team for a week before a major project — this upfront investment saved 3 weeks of back-and-forth during implementation and resulted in a design that was both beautiful and technically optimal.' },
    { q: 'Describe a time when you had to pivot on a project direction.', a: 'Situation: We were 6 weeks into building a real-time collaborative editor when user research revealed that our customers actually wanted async review workflows, not real-time collaboration. Action: Rather than sunk-cost fallacy, I evaluated what was salvageable. The operational transform engine wasn\'t useful, but the document model, versioning system, and WebSocket infrastructure were. I redesigned the project around async reviews with commenting, suggestion mode, and version comparison — reusing 40% of the existing code. Result: The pivot added only 3 weeks to the timeline instead of starting over. The async review feature had 3x the adoption we projected for the real-time editor, validating the pivot decision.' },
  ],
};

// Topic summary statistics
export const topicSummary = {
  totalTopics: 17,
  source: 'Tech Interview Handbook (https://github.com/yangshun/tech-interview-handbook)',
  categories: {
    dataStructures: ['String', 'Hash Table', 'Linked List', 'Stack', 'Queue', 'Heap', 'Trie', 'Tree', 'Graph', 'Matrix'],
    algorithms: ['Sorting and Searching', 'Dynamic Programming', 'Recursion', 'Binary', 'Interval'],
    math: ['Math', 'Geometry'],
  },
  totalEssentialQuestions: 35,
  totalRecommendedQuestions: 82,
};
