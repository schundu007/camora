// This vs That — cloud and DevOps comparison guide for interview prep.
// Content sourced from AceCloudInterviews.com comparisons section.
// Each topic covers the key decision criteria between two or more options.

export const comparisonCategories = [
  { id: 'compute',     name: 'Compute & Containers',        icon: 'cpu',        color: '#f97316' },
  { id: 'storage',     name: 'Storage & Databases',         icon: 'database',   color: '#3b82f6' },
  { id: 'messaging',   name: 'Messaging & Streaming',        icon: 'send',       color: '#8b5cf6' },
  { id: 'cicd',        name: 'CI/CD Tools',                  icon: 'gitMerge',   color: '#22c55e' },
  { id: 'monitoring',  name: 'Monitoring & Observability',   icon: 'activity',   color: '#06b6d4' },
  { id: 'deployment',  name: 'Deployment Strategies',        icon: 'layers',     color: '#f59e0b' },
  { id: 'networking',  name: 'Networking & Load Balancing', icon: 'globe',      color: '#14b8a6' },
];

export const comparisonTopicCategoryMap = {
  // Compute
  'cmp-ec2-vs-lambda':            'compute',
  'cmp-ecs-vs-eks':               'compute',
  'cmp-containers-vs-serverless': 'compute',
  'cmp-fargate-vs-ec2':           'compute',
  'cmp-ec2-instance-types':       'compute',
  // Storage
  'cmp-s3-vs-efs-vs-ebs':         'storage',
  'cmp-rds-vs-dynamodb':          'storage',
  'cmp-sql-vs-nosql':             'storage',
  'cmp-aurora-vs-rds':            'storage',
  'cmp-elasticache-redis-vs-memcached': 'storage',
  'cmp-redshift-vs-athena':       'storage',
  // Messaging
  'cmp-sqs-vs-sns':               'messaging',
  'cmp-sqs-vs-eventbridge':       'messaging',
  'cmp-kafka-vs-sqs':             'messaging',
  'cmp-kinesis-vs-kafka':         'messaging',
  'cmp-rabbitmq-vs-sqs':          'messaging',
  // CI/CD
  'cmp-github-actions-vs-jenkins':'cicd',
  'cmp-gitlab-ci-vs-github-actions': 'cicd',
  'cmp-circleci-vs-github-actions':  'cicd',
  'cmp-argo-vs-flux':             'cicd',
  'cmp-spinnaker-vs-argo-cd':     'cicd',
  // Monitoring
  'cmp-cloudwatch-vs-datadog':    'monitoring',
  'cmp-prometheus-vs-datadog':    'monitoring',
  'cmp-grafana-vs-kibana':        'monitoring',
  'cmp-jaeger-vs-zipkin':         'monitoring',
  'cmp-elk-vs-loki':              'monitoring',
  // Deployment
  'cmp-blue-green-vs-canary':     'deployment',
  'cmp-rolling-vs-blue-green':    'deployment',
  'cmp-ecs-vs-lambda-deployment': 'deployment',
  'cmp-helm-vs-kustomize':        'deployment',
  // Networking
  'cmp-alb-vs-nlb':               'networking',
  'cmp-vpc-peering-vs-tgw':       'networking',
  'cmp-privatelink-vs-peering':   'networking',
  'cmp-cloudfront-vs-alb':        'networking',
  'cmp-route53-routing-policies': 'networking',
};

export const comparisonTopics = [];
