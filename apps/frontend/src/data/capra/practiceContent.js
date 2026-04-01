/**
 * Free-tier practice content definitions
 * These curated topics are available to all users without a subscription.
 */

export const FREE_SYSTEM_DESIGN = [
  { label: 'Design URL shortener', href: '/prepare?page=system-design&topic=url-shortener' },
  { label: 'Design rate limiter', href: '/prepare?page=system-design&topic=rate-limiter' },
  { label: 'Design notification system', href: '/prepare?page=system-design&topic=notification-system' },
  { label: 'Design chat application', href: '/prepare?page=system-design&topic=chat-system' },
  { label: 'Design distributed cache', href: '/prepare?page=system-design&topic=distributed-cache' },
];

export const FREE_TECHNICAL = [
  { label: 'Explain K8s networking', href: '/prepare?page=system-design&topic=fundamentals' },
  { label: 'CI/CD pipeline design', href: '/prepare?page=system-design&topic=ci-cd-pipeline' },
  { label: 'Microservices vs monolith', href: '/prepare?page=system-design&topic=microservices' },
  { label: 'Database sharding strategies', href: '/prepare?page=system-design&topic=databases' },
  { label: 'Container orchestration', href: '/prepare?page=system-design&topic=microservices' },
];

export const FREE_BEHAVIORAL = [
  { label: 'Tell me about yourself', href: '/prepare?page=behavioral&topic=tell-me-about-yourself' },
  { label: 'Biggest technical challenge', href: '/prepare?page=behavioral&topic=problem-solving' },
  { label: 'How do you handle production incidents', href: '/prepare?page=behavioral&topic=production-outage' },
];

export const FREE_CODING = [
  { label: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
  { label: 'LRU Cache', slug: 'lru-cache', difficulty: 'Medium' },
  { label: 'Merge Intervals', slug: 'merge-intervals', difficulty: 'Medium' },
  { label: 'Binary Tree Traversal', slug: 'binary-tree-level-order-traversal', difficulty: 'Medium' },
  { label: 'Reverse Linked List', slug: 'reverse-linked-list', difficulty: 'Easy' },
  { label: 'Valid Parentheses', slug: 'valid-parentheses', difficulty: 'Easy' },
  { label: 'Max Subarray', slug: 'maximum-subarray', difficulty: 'Medium' },
  { label: 'Group Anagrams', slug: 'group-anagrams', difficulty: 'Medium' },
];

export const PRACTICE_SECTIONS = [
  {
    key: 'system-design',
    title: 'SYSTEM DESIGN',
    icon: 'systemDesign',
    color: '#3b82f6',
    chipBg: 'bg-blue-50',
    chipBorder: 'border-blue-200',
    chipText: 'text-gray-700',
    chipHover: 'hover:bg-blue-100 hover:border-blue-300',
    items: FREE_SYSTEM_DESIGN,
  },
  {
    key: 'technical',
    title: 'TECHNICAL',
    icon: 'settings',
    color: '#f59e0b',
    chipBg: 'bg-teal-50',
    chipBorder: 'border-teal-200',
    chipText: 'text-gray-700',
    chipHover: 'hover:bg-teal-100 hover:border-teal-300',
    items: FREE_TECHNICAL,
  },
  {
    key: 'behavioral',
    title: 'BEHAVIORAL',
    icon: 'users',
    color: '#10b981',
    chipBg: 'bg-yellow-50',
    chipBorder: 'border-yellow-200',
    chipText: 'text-gray-700',
    chipHover: 'hover:bg-yellow-100 hover:border-yellow-300',
    items: FREE_BEHAVIORAL,
  },
];
