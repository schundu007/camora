// Lightweight metadata re-exported from systemDesignTopics.js.
// DocsPage imports these for the overview category cards.
// Splitting them here keeps the full 1.6 MB systemDesignTopics.js
// out of the static load path — it only fetches when the user
// opens the system-design section (via loader.js).

export const systemDesignCategories = [
  { id: 'fundamentals', name: 'Core Fundamentals',          icon: 'lightbulb',   color: '#10b981' },
  { id: 'storage',      name: 'Storage & Databases',        icon: 'database',    color: '#3b82f6' },
  { id: 'communication',name: 'Communication & APIs',       icon: 'globe',       color: '#8b5cf6' },
  { id: 'scalability',  name: 'Scalability & Performance',  icon: 'trendingUp',  color: '#f59e0b' },
  { id: 'reliability',  name: 'Reliability & Security',     icon: 'shield',      color: '#ef4444' },
  { id: 'technologies', name: 'Key Technologies',           icon: 'database',    color: '#8b5cf6' },
];

export const systemDesignCategoryMap = {
  'fundamentals':                   'fundamentals',
  'databases':                      'storage',
  'caching':                        'storage',
  'message-queues':                 'communication',
  'api-design':                     'communication',
  'load-balancing':                 'scalability',
  'rate-limiting':                  'scalability',
  'microservices':                  'scalability',
  'security':                       'reliability',
  'monitoring':                     'reliability',
  'rest-vs-rpc':                    'communication',
  'quorum':                         'fundamentals',
  'leader-follower':                'reliability',
  'heartbeat-mechanism':            'reliability',
  'checksum':                       'reliability',
  'strong-vs-eventual-consistency': 'fundamentals',
  'latency-vs-throughput':          'scalability',
  'acid-vs-base':                   'storage',
  'distributed-messaging':          'communication',
  'synchronous-vs-asynchronous':    'communication',
  'distributed-file-systems':       'storage',
  'consistent-hashing':             'scalability',
  'bloom-filters':                  'storage',
  'data-partitioning':              'storage',
  'database-indexes':               'storage',
  'proxies':                        'communication',
  'dns-deep-dive':                  'fundamentals',
  'cdn-deep-dive':                  'scalability',
  'redundancy-replication':         'reliability',
  'network-essentials':             'communication',
  'long-polling-websockets-sse':    'communication',
  'cap-pacelc-deep-dive':           'fundamentals',
  'distributed-lock':               'reliability',
  'cassandra-deep-dive':            'technologies',
  'dynamodb-deep-dive':             'technologies',
  'apache-flink-deep-dive':         'technologies',
  'zookeeper-deep-dive':            'technologies',
  'vector-databases-deep-dive':     'technologies',
};
