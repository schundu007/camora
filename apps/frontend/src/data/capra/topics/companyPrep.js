// Company-specific prep data

export const companyPrep = [
    {
      id: 'amazon-lp',
      title: 'Amazon Leadership Principles',
      subtitle: '16 principles with examples',
      icon: 'briefcase',
      color: '#f59e0b',
      count: 16,
      principles: ['Customer Obsession', 'Ownership', 'Invent and Simplify', 'Are Right, A Lot', 'Learn and Be Curious', 'Hire and Develop the Best', 'Insist on the Highest Standards', 'Think Big'],

      introduction: `Amazon's 16 Leadership Principles (LPs) are the foundation of EVERY behavioral interview at Amazon. Expect 4-6 behavioral rounds where interviewers probe deeply into specific LPs. Each story you tell should clearly demonstrate one or more principles. Prepare 2-3 strong stories per principle.`,

      keyQuestions: [
        {
          question: 'Customer Obsession',
          answer: `**Definition**: Leaders start with the customer and work backwards. They work vigorously to earn and keep customer trust.

**What They Look For**:
- Decisions driven by customer needs, not internal convenience
- Going beyond requirements to delight customers
- Sacrificing short-term gains for long-term customer trust

**STAR Example**:

**Situation**: "A major client reported that our analytics dashboard was too slow for their workflow—taking 30 seconds to load."

**Task**: "The official roadmap had performance work scheduled for Q3, but the customer was frustrated now."

**Action**:
- "I spent a weekend profiling the specific queries they used most"
- "Found that 80% of their load time came from 3 expensive aggregations"
- "Implemented query result caching for these specific patterns"
- "Delivered a hotfix within 5 days—outside the normal sprint cycle"

**Result**: "Load time dropped from 30s to 2s for their use case. Customer renewed their enterprise contract. More importantly, I identified a pattern we could apply to other customers."

**Key Phrase**: "I always ask: what does the customer actually need, not what's easiest for us to build?"`
        },
        {
          question: 'Ownership',
          answer: `**Definition**: Leaders act on behalf of the entire company. They never say "that's not my job." They think long-term.

**What They Look For**:
- Taking responsibility beyond your immediate scope
- Not passing problems to others
- Long-term thinking over short-term convenience

**STAR Example**:

**Situation**: "I noticed our deployment pipeline was failing frequently, causing delays across multiple teams. Officially, it was the DevOps team's responsibility."

**Task**: "I could have just reported the issue, but our team was losing 2+ hours daily to failed deployments."

**Action**:
- "I spent evenings over two weeks diagnosing the root causes"
- "Found that 60% of failures were due to flaky integration tests, not infrastructure"
- "Proposed a fix: quarantine flaky tests while we improved them"
- "Created a dashboard showing deployment reliability trends"
- "Partnered with DevOps to implement the changes"

**Result**: "Deployment success rate improved from 65% to 95%. Other teams adopted the same patterns. I wasn't asked to do this—I saw a problem affecting many people and took ownership."

**Key Phrase**: "I never say 'that's not my job.' If I see a problem, I own it until it's solved."`
        },
        {
          question: 'Invent and Simplify',
          answer: `**Definition**: Leaders expect and require innovation from their teams. They find ways to simplify.

**What They Look For**:
- Creating new solutions, not just applying existing patterns
- Simplifying complex processes
- Being okay with being misunderstood (innovation is often controversial)

**STAR Example**:

**Situation**: "Our data pipeline had grown to 15 different services doing similar ETL work, each maintained by different teams with different approaches."

**Task**: "As we scaled, this complexity was causing reliability issues and slowing development."

**Action**:
- "I proposed a unified data processing framework that teams could configure rather than build custom pipelines"
- "Faced initial resistance—teams worried about losing flexibility"
- "Built a prototype demonstrating how 80% of use cases could be handled with configuration"
- "Created a migration guide and supported early adopters"

**Result**: "Consolidated 15 services into one framework with plugins for custom needs. Reduced pipeline failures by 70% and cut new pipeline setup time from 2 weeks to 2 days."

**Key Phrase**: "I look for complexity and ask: how can this be simpler?"`
        },
        {
          question: 'Dive Deep',
          answer: `**Definition**: Leaders operate at all levels, stay connected to the details, and audit frequently.

**What They Look For**:
- Not accepting surface-level explanations
- Digging into data and details personally
- Knowing when something doesn't add up

**STAR Example**:

**Situation**: "Our API latency metrics showed 50ms p50, which seemed great. But customers were complaining about slow responses."

**Task**: "Something wasn't adding up. I needed to find the real story."

**Action**:
- "Instead of trusting the dashboard, I traced actual customer requests end-to-end"
- "Discovered our metrics excluded network time and client-side processing"
- "Found that p99 latency was 3 seconds—hidden by the p50 metric"
- "Built new monitoring that captured full request lifecycle"
- "Identified specific slow endpoints and optimized them"

**Result**: "Customer-perceived latency dropped 80%. We caught a critical issue that our standard metrics had been hiding for months."

**Key Phrase**: "The details matter. When something doesn't feel right, I dig until I understand why."`
        },
        {
          question: 'Bias for Action',
          answer: `**Definition**: Speed matters. Many decisions are reversible and don't require extensive study.

**What They Look For**:
- Acting quickly with calculated risk
- Not waiting for perfect information
- Preferring action over analysis paralysis

**STAR Example**:

**Situation**: "At 10 PM on a Friday, we noticed a gradual increase in error rates. Nothing was broken yet, but the trend looked concerning."

**Task**: "We could wait to investigate Monday, or act now without full information."

**Action**:
- "I immediately set up enhanced monitoring to gather more data"
- "Made a quick judgment: the rate of increase suggested we'd hit critical levels by Sunday"
- "Identified the most likely cause (recent deployment) and proposed a rollback"
- "Made the call to rollback within 30 minutes, accepting I might be wrong"

**Result**: "The rollback stopped the error increase. Monday analysis confirmed a subtle bug in the deployment. If we'd waited, Saturday peak traffic would have caused an outage."

**Key Phrase**: "I'd rather make a fast decision and be wrong 20% of the time than wait for certainty and be right too late."`
        }
      ]
    },
    {
      id: 'google-behavioral',
      title: 'Google Behavioral',
      subtitle: 'Googliness & Leadership',
      icon: 'code',
      color: '#4285f4',
      count: 12,
      principles: ['Googliness', 'General Cognitive Ability', 'Leadership', 'Role-Related Knowledge'],

      introduction: `Google evaluates candidates on four key dimensions: General Cognitive Ability, Role-Related Knowledge, Leadership, and "Googliness" (culture fit). Unlike Amazon, Google doesn't map each interview to specific principles. Instead, every interviewer assesses all four dimensions and submits independent feedback to a hiring committee.

Behavioral questions at Google focus on how you think, collaborate, and navigate ambiguity. Expect questions about complex technical decisions, working across teams, and situations where you didn't have all the answers. Google values intellectual humility above all—they'd rather hire someone who says "I was wrong, here's what I learned" than someone who's never been wrong. Prepare 8-10 stories that demonstrate structured thinking, collaboration, and growth.`,

      keyQuestions: [
        {
          question: 'Googliness (Culture Fit)',
          answer: `**What Google Looks For**:
- Comfort with ambiguity
- Collaborative problem-solving
- Intellectual humility—willing to be wrong
- Bringing out the best in others
- Doing the right thing even when it's hard

**Example Questions**:
- "Tell me about a time you disagreed with a decision and advocated for change"
- "Describe a time you helped someone else succeed"
- "How do you handle working with someone whose style is different from yours?"

**STAR Example**:

**Situation**: "A teammate was struggling with a high-visibility project. They hadn't asked for help, and stepping in uninvited could seem like I was taking over."

**Task**: "Help them succeed without undermining their ownership."

**Action**:
- "Started by asking questions to understand their challenges"
- "Offered to pair program on the hardest parts—framed as me learning, not them struggling"
- "Shared relevant resources and patterns from similar projects I'd worked on"
- "Made sure all credit went to them in team meetings"

**Result**: "They delivered successfully and on time. Later told me my help had been crucial. We became close collaborators, and I learned techniques from them too."

**Key Principle**: At Google, helping others succeed IS success.`
        },
        {
          question: 'General Cognitive Ability',
          answer: `**What Google Looks For**:
- Structured thinking and problem decomposition
- Learning on the fly
- Handling novel situations without precedent
- Meta-cognition—knowing what you don't know

**Example Questions**:
- "How would you improve [Google product]?"
- "Describe a time you had to learn something completely new"
- "Tell me about a complex problem you broke down into simpler parts"

**STAR Example**:

**Situation**: "I was asked to optimize a recommendation system but had no ML background."

**Task**: "Deliver meaningful improvements despite not being a domain expert."

**Action**:
- "Started by mapping what I didn't know vs. what I could figure out"
- "Read papers and talked to ML engineers to build intuition"
- "Focused on areas where my backend skills added value—data quality, feature engineering, serving infrastructure"
- "Proposed experiments I could validate without deep ML expertise"

**Result**: "My data quality improvements increased model accuracy by 15% before any ML changes. Proved that understanding the problem space matters as much as algorithmic expertise."

**Key Insight**: Google wants people who can figure things out, not people who already know everything.`
        },
        {
          question: 'Leadership',
          answer: `**What Google Looks For**:
- Emergent leadership—leading without authority
- Driving clarity in ambiguous situations
- Enabling team success over personal achievement
- Making hard calls when needed

**Example Questions**:
- "Tell me about leading a project without formal authority"
- "Describe a time you had to make an unpopular decision"
- "How do you handle a team that's not aligned?"

**STAR Example**:

**Situation**: "Our team of 8 had no clear direction. Different people were building features that overlapped or conflicted. Management was focused elsewhere."

**Task**: "Someone needed to bring clarity. I stepped up even though I was the most junior."

**Action**:
- "Created a shared document mapping everyone's work and identifying conflicts"
- "Facilitated a team discussion to align on priorities"
- "Proposed a simple coordination process: weekly sync + shared roadmap"
- "Volunteered to run the syncs and maintain the roadmap"

**Result**: "Team velocity improved 40% in the next quarter. Conflicts dropped to near-zero. I was promoted, but more importantly, the team functioned better."

**Key Principle**: At Google, you don't need a title to lead. Leadership is about creating clarity and enabling others.`
        },
        {
          question: 'How does Google\'s interview process differ from Amazon?',
          answer: `**Key Differences**:

**No LP Mapping**: Amazon assigns specific Leadership Principles per interviewer. Google interviewers independently assess all four dimensions (GCA, RRK, Leadership, Googliness). There's no "this round tests X."

**Hiring Committee**: Google's hiring committee reviews all interviewer feedback and makes a collective decision. Individual interviewers don't have veto power. This means one bad round doesn't automatically reject you.

**Less Structured**: Amazon asks highly structured behavioral questions tied to LPs. Google's behavioral questions are more open-ended: "Tell me about a complex project" rather than "Tell me about a time you demonstrated Customer Obsession."

**Intellectual Humility**: Google specifically probes for intellectual humility. "When were you wrong?" and "What would you do differently?" are not trap questions—they're assessing whether you can learn and grow.

**What This Means for Prep**:
- Prepare versatile stories, not LP-mapped ones
- Practice explaining technical decisions to non-experts
- Have stories ready about times you were wrong or changed your mind
- Show genuine curiosity—Google wants people who are excited to learn, not just deliver`
        }
      ]
    },
    {
      id: 'meta-behavioral',
      title: 'Meta Behavioral',
      subtitle: 'Core values alignment',
      icon: 'users',
      color: '#1877f2',
      count: 10,
      principles: ['Move Fast', 'Be Bold', 'Focus on Impact', 'Be Open', 'Build Social Value'],

      introduction: `Meta's behavioral interviews assess four core competencies: Resolving Conflicts, Navigating Ambiguity, Driving Results, and Growing Continuously. These map to Meta's culture of "Move Fast, Be Bold, Focus on Impact, Be Open, Build Social Value." Unlike Amazon's LP-per-round structure, Meta interviewers score all four competencies in each behavioral round.

Meta values builders who ship quickly, take big swings, and prioritize impact over perfection. They explicitly reward killing low-impact projects early—sunk cost fallacy is a red flag. Expect questions like "Tell me about a time you shipped something fast," "When did you pivot after realizing something wasn't working?" and "How do you decide what to work on?" Prepare stories that show velocity, impact-driven prioritization, and learning from bold bets that didn't pan out.`,

      keyQuestions: [
        {
          question: 'Move Fast',
          answer: `**What Meta Looks For**:
- Speed of execution without sacrificing quality
- Iteration over perfection
- Removing blockers proactively
- Making decisions quickly

**STAR Example**:

**Situation**: "We needed to launch a new feature before a competitive product hit the market. Normal timeline was 3 months."

**Task**: "Deliver a high-quality launch in 6 weeks."

**Action**:
- "Ruthlessly scoped to minimum viable feature set"
- "Parallelized work across team members instead of sequential reviews"
- "Set up automated testing on day 1 to avoid manual QA bottlenecks"
- "Held daily 15-min syncs instead of weekly hour-long meetings"
- "Made decisions in real-time rather than waiting for consensus"

**Result**: "Launched in 5 weeks with positive user reception. Iterated based on feedback while competitors were still in development. Moving fast gave us first-mover advantage."

**Key Phrase**: "Done is better than perfect, as long as done means we can learn and iterate."`
        },
        {
          question: 'Focus on Impact',
          answer: `**What Meta Looks For**:
- Prioritizing high-leverage work
- Measuring and quantifying impact
- Killing low-impact work, even if you've already started
- Working on what matters, not just what's interesting

**STAR Example**:

**Situation**: "I was halfway through building a sophisticated analytics dashboard when I realized only 10% of users would actually use it."

**Task**: "Decide whether to finish what I'd started or pivot to something higher impact."

**Action**:
- "Analyzed user data to find where the real pain points were"
- "Discovered that a simple alert feature would help 80% of users"
- "Made the hard call to shelve my dashboard work"
- "Pitched the simpler feature and got quick approval"
- "Shipped the alert feature in 2 weeks"

**Result**: "Alert feature had 10x the engagement of my original dashboard plan. I learned that impact isn't about complexity—it's about solving real problems for real users."

**Key Phrase**: "I constantly ask: is this the highest-impact thing I could be doing right now?"`
        },
        {
          question: 'Be Bold',
          answer: `**What Meta Looks For**:
- Taking calculated risks
- Proposing big ideas, not incremental improvements
- Learning from bold failures
- Not being afraid to challenge the status quo

**STAR Example**:

**Situation**: "Our team was making small, incremental improvements to a legacy system. Progress was slow and no one was excited."

**Task**: "I believed we should rebuild from scratch, but that was risky and controversial."

**Action**:
- "Built a prototype of the new approach on my own time"
- "Demonstrated 5x performance improvement with cleaner architecture"
- "Proposed a 6-week rewrite to leadership with clear risk mitigation"
- "Volunteered to lead the effort and own the outcome"

**Result**: "Got approval for the rewrite. Delivered in 7 weeks with the promised improvements. The bold bet paid off, and the team's morale improved dramatically."

**Key Phrase**: "If we only make safe bets, we'll only get safe results."`
        },
        {
          question: 'How does Meta\'s interview differ from other FAANG companies?',
          answer: `**Meta's Unique Behavioral Dimensions**:

**1. Resolving Conflicts** — Not about avoiding conflict, but about navigating it productively. They specifically ask about disagreements with data, not hierarchy.

**2. Navigating Ambiguity** — Meta moves so fast that requirements change constantly. They want people who can operate without a complete spec. "What do you do when no one tells you what to build?"

**3. Driving Results** — Outcomes over activities. "What shipped? What was the impact?" Not "I worked really hard."

**4. Growing Continuously** — They explicitly value learning velocity. "What new skill did you develop recently? How did a failure change your approach?"

**Key Differences from Amazon**:
- Less structured than Amazon (no LP mapping per round)
- More emphasis on shipping velocity than long-term planning
- Culture rewards killing projects early if impact isn't materializing
- "Move Fast" culture means they want stories about speed AND quality, not speed OR quality

**What to Emphasize**: Show you can ship fast, measure impact, and pivot when data shows you're wrong. Meta values intellectual honesty about what's working and what isn't.`
        }
      ]
    },
    {
      id: 'microsoft-behavioral',
      title: 'Microsoft Behavioral',
      subtitle: 'Growth mindset focus',
      icon: 'layers',
      color: '#00a4ef',
      count: 8,
      principles: ['Growth Mindset', 'Customer Obsessed', 'Diverse and Inclusive', 'One Microsoft', 'Making a Difference'],

      introduction: `Microsoft's cultural transformation under Satya Nadella centers on Growth Mindset—the belief that abilities can be developed through dedication and hard work. This isn't just a buzzword; it fundamentally changed Microsoft's interview philosophy. They explicitly hire for learning ability over existing knowledge.

Expect questions about learning from failure, embracing feedback, collaborating across teams ("One Microsoft"), and customer-centricity. Microsoft's behavioral interviews are generally less intense than Amazon's LP rounds but more focused on authenticity—they want genuine stories of growth, not polished performances. The "Growth Mindset" signal is often decisive: candidates who describe failures as learning moments and feedback as a gift consistently score higher than those who present a flawless narrative.`,

      keyQuestions: [
        {
          question: 'Growth Mindset',
          answer: `**What Microsoft Looks For**:
- Learning from failures, not hiding them
- Embracing challenges as growth opportunities
- Seeking and acting on feedback
- Believing that skills can be developed

**STAR Example**:

**Situation**: "I received feedback that my code reviews were too harsh and discouraging junior developers."

**Task**: "I needed to change my approach while maintaining high standards."

**Action**:
- "First, I had to accept the feedback was valid—my intention didn't match my impact"
- "Asked colleagues for specific examples so I could understand the pattern"
- "Studied how respected mentors gave constructive feedback"
- "Started framing reviews as questions rather than criticisms"
- "Added explicit praise for what was done well, not just what needed change"

**Result**: "Over 6 months, my review feedback scores improved significantly. Junior developers started requesting my reviews. I learned that being right isn't enough—how you communicate matters as much as what you say."

**Key Phrase**: "Feedback is a gift. Even when it's hard to hear, it's an opportunity to improve."`
        },
        {
          question: 'One Microsoft',
          answer: `**What Microsoft Looks For**:
- Collaborating across teams and organizations
- Putting company success over team success
- Breaking down silos
- Sharing knowledge and resources

**STAR Example**:

**Situation**: "My team had built an internal tool that could benefit other teams, but sharing it wasn't in our objectives."

**Task**: "I saw an opportunity to help the company but had to make the case for investing time in sharing."

**Action**:
- "Documented the tool and created easy onboarding guides"
- "Reached out to teams with similar problems and offered demos"
- "Set up a support channel and committed to helping early adopters"
- "Made the case to my manager: helping others succeed helps Microsoft succeed"

**Result**: "The tool was adopted by 15 teams across 3 organizations. Total engineering hours saved: an estimated 10,000 per year. My manager highlighted this as an example of One Microsoft culture."

**Key Phrase**: "We win as a company, not as individual teams. Sharing success makes everyone stronger."`
        },
        {
          question: 'Customer Obsessed',
          answer: `**What Microsoft Looks For**:
- Deep understanding of customer problems
- Building FOR customers, not just AT them
- Measuring success by customer outcomes
- Being responsive to customer feedback

**STAR Example**:

**Situation**: "Our product team was planning features based on internal roadmap priorities, not customer feedback."

**Task**: "I believed we were building the wrong things and needed to ground our work in customer needs."

**Action**:
- "Set up a customer feedback analysis system"
- "Identified the top 10 customer pain points from support tickets and feedback"
- "Created a presentation showing misalignment between our roadmap and customer needs"
- "Proposed adjusting priorities to address customer pain points first"

**Result**: "Leadership approved a roadmap shift. Customer satisfaction scores increased 25% in the next quarter. More importantly, we established a process for continuously incorporating customer feedback."

**Key Phrase**: "The best products come from deeply understanding customer problems, not from internal brainstorming."`
        },
        {
          question: 'How does Microsoft\'s interview differ from other FAANG companies?',
          answer: `**Microsoft's Unique Interview Style**:

**Growth Mindset is Non-Negotiable**: Microsoft explicitly screens for growth mindset. A candidate who says "I've never received critical feedback" will likely be rejected. They want to hear about genuine struggles and genuine learning.

**Less Adversarial Than Amazon**: Microsoft's behavioral interviews feel more conversational. Interviewers are looking for a genuine person, not a polished presentation. Authenticity matters more than perfect STAR structure.

**"One Microsoft" is Real**: Cross-team collaboration stories carry heavy weight. Microsoft had a notorious siloed culture before Nadella—they now aggressively hire for people who break down silos.

**Diverse & Inclusive Signal**: Microsoft values stories about working with diverse teams, mentoring underrepresented engineers, and creating inclusive environments. This isn't just lip service—it's scored.

**Interview Structure**:
- Typically 4-5 rounds (less than Amazon's 5-6)
- Mix of coding, system design, and behavioral
- Final "as-appropriate" (AA) interview with a senior leader
- AA round is mostly behavioral/culture fit

**What to Emphasize**: Growth through failure, cross-team impact, genuine curiosity, and stories where you helped others succeed. Microsoft values team players over individual stars.`
        }
      ]
    },
  ];

