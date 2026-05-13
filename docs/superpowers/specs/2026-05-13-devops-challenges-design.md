# DevOps Coding Challenges — Design Spec
_2026-05-13_

## Overview

Add 173 HackerRank DevOps coding problems to Capra's DevOps prepare section, presented via a HackerRank-style filter browser (not embedded in topic keyQuestions). Users can filter by skill, difficulty, and level, browse cards, and open problem detail with a full solution walkthrough + link to HackerRank for live coding.

## Source Data

Problems scraped from `https://www.hackerrank.com/work/library/tests?type=devops` (pages 1–18, 173 problems after deduplication).

Skill breakdown:
- AWS: ~118 · Linux: ~79 · Git: ~65 · Kubernetes: ~53 · Ansible: ~51 · Docker: ~50 · Terraform: ~40 · Puppet: ~35 · Chef: ~7

Difficulty: Easy (~93) · Medium (~60) · Hard (~20)

Each problem has: title, difficulty, skill, skill_level (Basic/Intermediate/Advanced), description (from HackerRank), time estimate, score.

## Architecture

### Data Layer

**New file: `apps/camora/src/data/capra/topics/devopsChallengesData.js`**

Exports:
- `devopsChallenges` — array of 173 problem objects
- `devopsChallengeSkills` — ordered skill list for filter UI
- `devopsChallengeDifficulties` — `['Easy', 'Medium', 'Hard']`
- `devopsChallengeLevels` — `['Basic', 'Intermediate', 'Advanced']`

Problem object shape:
```js
{
  id: 'docker-port-binding',           // kebab-case slug
  title: 'Docker: Port Binding',
  skill: 'Docker',                     // base skill name
  skillLevel: 'Basic',                 // Basic | Intermediate | Advanced
  difficulty: 'Easy',                  // Easy | Medium | Hard
  timeMinutes: 16,
  score: 50,
  description: 'Complete a script to run an Nginx container and bind its port to localhost.',
  hackerrankUrl: 'https://www.hackerrank.com/work/library/tests?hide_ai_solvable=true&type=devops',
  keyConcepts: [
    '-p host:container port mapping syntax',
    'Detached mode with -d flag',
    'Verifying running containers with docker ps',
  ],
  solution: `docker run -d -p 8080:80 nginx`,
  solutionLang: 'bash',               // bash | yaml | hcl | python
  approach: [
    'Use `docker run -d` to run the container in the background (detached mode)',
    '`-p 8080:80` maps host port 8080 to container port 80',
    'Nginx listens on port 80 by default inside the container',
    'Verify the binding is active: `docker ps` shows PORTS as 0.0.0.0:8080->80/tcp',
  ],
}
```

**Changes to `devopsTopics.js`:**
- Add one new stub topic `devops-coding-challenges` to `devopsTopics` array (no `keyQuestions`, no `introduction` — signals the challenges renderer)
- Add `'devops-coding-challenges': 'challenges'` to `devopsTopicCategoryMap`
- Add `{ id: 'challenges', name: 'Coding Challenges', icon: 'code', color: '#f59e0b' }` to `devopsCategories`

**Changes to `loader.js`:**
- Merge `devopsChallengesData.js` exports into the `devops` loader payload under key `devopsChallenges`

### Component Layer

**New: `apps/camora/src/components/capra/docs/DevopsChallengesPage.jsx`**

Responsibilities:
- Receives `devopsChallenges` array as prop
- Renders filter bar + problem cards grid
- Manages filter state locally (skill, difficulty, level, search query)
- On card click: sets `selectedChallenge` → renders `DevopsChallengeDetail`

Filter bar components (all in this file, no extracted sub-components needed):
- `SkillFilter` — dropdown with searchable list, multi-select checkboxes
- `DifficultyFilter` — dropdown: Easy / Medium / Hard checkboxes  
- `LevelFilter` — dropdown: Basic / Intermediate / Advanced checkboxes
- Active filter count badge on each dropdown trigger

Problem card:
- Title, skill badge (color-coded), difficulty pill (green/yellow/red), time + score metadata
- Subtle hover state, click opens detail

**New: `apps/camora/src/components/capra/docs/DevopsChallengeDetail.jsx`**

Rendered inline below the filter bar (not a modal, not a route change — same page, slides in).

Sections:
1. Header: title, difficulty pill, skill badge, time, score, "Practice on HackerRank →" link
2. Problem description
3. Key Concepts (bullet list)
4. Solution (syntax-highlighted code block — use `react-syntax-highlighter` Prism directly, same package already used by `CodeDisplay.jsx`)
5. Approach (numbered steps)
6. Back button → returns to card grid

**Changes to `DocsPage.jsx`:**
- When the selected topic id is `'devops-coding-challenges'`, render `<DevopsChallengesPage>` instead of `<TopicDetail>`
- Pass `devopsChallenges` from loader data as prop

### Routing / URL

No new routes needed. The challenges browser lives inside the existing DocsPage at `/capra/prepare` → DevOps section → "Coding Challenges" topic. The detail view is rendered in-page (no URL change). This matches how other topic details work.

## Filter Behavior

- Filters are AND-combined: a problem must match ALL active filters
- Empty filter = show all
- Search box (optional stretch) filters by title substring
- Result count shown: "X of 173 questions"
- Filters persist in local component state only (no URL params needed)

## Skill Color Map

```
Docker:     #2496ED  AWS:        #FF9900
Kubernetes: #326CE5  Git:        #F05032
Ansible:    #EE0000  Linux:      #FCC624
Terraform:  #7B42BC  Puppet:     #FFAE1A
Chef:       #F09820
```

## HackerRank Links

All 173 problems link to the same HackerRank Work library URL filtered by DevOps type:
`https://www.hackerrank.com/work/library/tests?hide_ai_solvable=true&type=devops`

Individual problem deep-links aren't available without employer-level API access. The library URL lets the user search by title to find and practice the exact problem.

## Solution Content

Every problem gets a full walkthrough written by Claude:
- `keyConcepts`: 2–4 specific, testable concepts the problem exercises
- `solution`: working minimal code in the correct language (bash for Linux/Docker/Git/AWS CLI, yaml for Ansible, hcl for Terraform, puppet/ruby for Puppet, ruby for Chef)
- `approach`: 3–5 numbered steps that explain the solution, not just repeat it

Solutions are authoritative for the Easy/Medium tier. Hard-tier solutions note where the exact test harness may impose additional constraints.

## Out of Scope

- Real-time HackerRank API sync (library changes won't auto-update Capra)
- User progress tracking / completion state on challenges
- Submission / code execution within Capra
- Problem search across the full filter set via URL params (can add later)

## Files Summary

| Action | File |
|---|---|
| Create | `src/data/capra/topics/devopsChallengesData.js` |
| Create | `src/components/capra/docs/DevopsChallengesPage.jsx` |
| Create | `src/components/capra/docs/DevopsChallengeDetail.jsx` |
| Modify | `src/data/capra/topics/devopsTopics.js` |
| Modify | `src/data/capra/topics/loader.js` |
| Modify | `src/components/capra/docs/DocsPage.jsx` |
