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

// Behavioral interview questions by category and company
export const behavioralQuestions = {
  general: [
    'Tell me about yourself.',
    'Why do you want to work for this company?',
    'Tell me about a time you had a conflict with a coworker and how you resolved it.',
    'Describe a time when you went above and beyond.',
    'Tell me about a time you failed and what you learned from it.',
    'Describe a challenging project you worked on.',
    'How do you prioritize your work when you have multiple deadlines?',
    'Tell me about a time you had to learn something quickly.',
    'Describe a situation where you had to make a decision without complete information.',
    'Tell me about a time you disagreed with your manager.',
    'How do you handle receiving critical feedback?',
    'Describe a time when you had to persuade others to adopt your idea.',
    'Tell me about your biggest professional achievement.',
    'How do you stay current with technology trends?',
    'Describe a time when you mentored or helped a colleague.',
  ],
  amazon: [
    'Tell me about a time you dealt with an ambiguous situation. (Bias for Action)',
    'Describe a time when you simplified a complex process. (Invent and Simplify)',
    'Tell me about a time you made a decision that wasn\'t popular. (Have Backbone; Disagree and Commit)',
    'Give an example of when you took a calculated risk. (Bias for Action)',
    'Tell me about a time you had to work with limited resources. (Frugality)',
    'Describe a time when you went deep to solve a problem. (Dive Deep)',
    'Tell me about a time you raised the bar for your team. (Insist on the Highest Standards)',
    'Give an example of when you delivered results under tight deadlines. (Deliver Results)',
    'Tell me about a time you earned the trust of a group. (Earn Trust)',
    'Describe a time when you put the customer first. (Customer Obsession)',
    'Tell me about a time you thought big. (Think Big)',
    'Give me an example of when you took ownership beyond your role. (Ownership)',
    'Describe how you hired or developed the best people. (Hire and Develop the Best)',
    'Tell me about a time you learned something outside your comfort zone. (Learn and Be Curious)',
  ],
  google: [
    'Tell me about a time you had to handle a difficult technical challenge.',
    'Describe a project where you demonstrated leadership without formal authority.',
    'How have you dealt with ambiguity in a project?',
    'Tell me about a time you improved a process or system.',
    'Describe a situation where you had to balance multiple priorities.',
    'Tell me about a time you collaborated across teams to deliver results.',
    'How do you approach problems that don\'t have clear solutions?',
    'Describe a time when you had to adapt your communication style.',
    'Tell me about a product or feature you\'re proud of building.',
    'How do you measure the success of your work?',
  ],
  meta: [
    'Tell me about a time you moved fast to deliver something. (Move Fast)',
    'Describe a time when you built something from scratch.',
    'How do you prioritize what to work on?',
    'Tell me about a time you had to give difficult feedback.',
    'Describe a project where you had significant impact.',
    'Tell me about a time you had to make a trade-off between speed and quality.',
    'How do you approach building for scale?',
    'Describe a time when you learned from a mistake.',
    'Tell me about a time you drove alignment across teams.',
    'How do you handle disagreements about technical direction?',
  ],
  microsoft: [
    'Tell me about a time you demonstrated a growth mindset.',
    'Describe a situation where you had to influence without authority.',
    'How do you approach diversity and inclusion in your work?',
    'Tell me about a time you collaborated with a difficult stakeholder.',
    'Describe a project that failed and what you learned.',
    'How do you balance innovation with customer needs?',
    'Tell me about a time you had to make a tough ethical decision.',
    'Describe how you stay productive in a large organization.',
    'Tell me about a time you empowered others to succeed.',
    'How do you approach accessibility in software development?',
  ],
  apple: [
    'Tell me about a time you obsessed over the details of a product.',
    'Describe a situation where you had to say no to a feature request.',
    'How do you balance perfection with shipping on time?',
    'Tell me about a time you simplified a complex user experience.',
    'Describe your approach to maintaining high quality standards.',
    'Tell me about a time you had to defend a design decision.',
    'How do you approach cross-functional collaboration?',
    'Describe a time when you had to pivot on a project direction.',
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
