// Coding Challenges — hands-on practice problems grouped by platform domain.
// Sub-categories expand as AIOps, MLOps/LLMOps, and IaC challenges are added.
// Current data: devopsChallengesData.js (366 HackerRank problems).

export const challengesCategories = [
  { id: 'challenges-devops', name: 'DevOps Challenges', icon: 'code', color: '#f59e0b' },
  // Future: AIOps, MLOps/LLMOps, IaC
];

export const challengesTopicCategoryMap = {
  'devops-coding-challenges': 'challenges-devops',
};

export const challengesTopics = [
  {
    id: 'devops-coding-challenges',
    title: 'DevOps Coding Challenges',
    icon: 'code',
    color: '#f59e0b',
    questions: 366,
    description: '366 hands-on DevOps coding problems from HackerRank — Docker, Kubernetes, Ansible, Terraform, Linux, Git, AWS, Puppet, and Chef.',
    isChallengesHub: true,
  },
];
