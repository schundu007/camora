// Behavioral categories and topics

export const behavioralCategories = [
    { id: 'career', name: 'Career & Self-Presentation', icon: 'user', color: '#10b981' },
    { id: 'leadership', name: 'Leadership & Influence', icon: 'users', color: '#3b82f6' },
    { id: 'teamwork', name: 'Teamwork & Collaboration', icon: 'gitMerge', color: '#8b5cf6' },
    { id: 'conflict', name: 'Conflict & Challenges', icon: 'alertTriangle', color: '#ef4444' },
    { id: 'problem-solving', name: 'Problem Solving & Technical', icon: 'code', color: '#06b6d4' },
    { id: 'delivery', name: 'Time Management & Delivery', icon: 'clock', color: '#f59e0b' },
    { id: 'growth', name: 'Growth & Learning', icon: 'trendingUp', color: '#22c55e' },
    { id: 'communication', name: 'Communication', icon: 'messageSquare', color: '#ec4899' },
    { id: 'achievements', name: 'Projects & Achievements', icon: 'star', color: '#eab308' },
    { id: 'fundamentals', name: 'Interview Fundamentals', icon: 'book', color: '#6366f1' },
  ];

  // Map topic IDs to categories
export const topicCategoryMap = {
    // Career & Self-Presentation
    'tell-me-about-yourself': 'career',
    'strengths-weaknesses': 'career',
    'why-this-company': 'career',
    'company-change-reason': 'career',
    'colleague-description': 'career',
    // Leadership & Influence
    'leadership': 'leadership',
    'mentoring-coaching': 'leadership',
    'above-and-beyond': 'leadership',
    // Teamwork & Collaboration
    'cross-team-collaboration': 'teamwork',
    'building-trust': 'teamwork',
    'disagreement-with-manager': 'teamwork',
    'disagree-senior-engineer': 'teamwork',
    // Conflict & Challenges
    'conflict-resolution': 'conflict',
    'being-proven-wrong': 'conflict',
    'disagree-and-commit': 'conflict',
    // Problem Solving & Technical
    'problem-solving': 'problem-solving',
    'production-outage': 'problem-solving',
    'data-driven-debugging': 'problem-solving',
    'debugging-distributed': 'problem-solving',
    'optimizing-performance': 'problem-solving',
    'incomplete-information': 'problem-solving',
    'simplifying-systems': 'problem-solving',
    // Time Management & Delivery
    'time-management': 'delivery',
    'tight-deadlines': 'delivery',
    'missed-deadline': 'delivery',
    'speed-vs-quality': 'delivery',
    'recovering-behind': 'delivery',
    'bias-for-action': 'delivery',
    // Growth & Learning
    'learning-new-tech': 'growth',
    'comfort-zone': 'growth',
    'learning-unfamiliar-domain': 'growth',
    'innovation': 'growth',
    'adapting-requirements': 'growth',
    'raising-quality-bar': 'growth',
    // Communication
    'explaining-technical': 'communication',
    'receiving-feedback': 'communication',
    'giving-feedback': 'communication',
    // Projects & Achievements
    'achievements': 'achievements',
    'proud-project': 'achievements',
    'failure-mistakes': 'achievements',
    // Interview Fundamentals
    'star-framework': 'fundamentals',
    'story-banking': 'fundamentals',
    'what-are-behavioral-interviews': 'fundamentals',
    'handling-follow-ups': 'fundamentals',
    'negotiation': 'fundamentals',
    'asking-questions': 'fundamentals',
    'professionalism': 'fundamentals',
    'following-up': 'fundamentals',
    // Adaptability & Growth
    'adaptability-questions': 'growth',
    'work-life-balance': 'growth',
    // Career & Fundamentals
    'salary-negotiation': 'fundamentals',
    'questions-to-ask-interviewer': 'fundamentals',
    // Problem Solving
    'managing-constraints': 'problem-solving',
  };

export const behavioralTopics = [
    {
      id: 'tell-me-about-yourself',
      title: 'Tell Me About Yourself',
      icon: 'user',
      color: '#10b981',
      questions: 6,
      description: 'Your 60-90 second elevator pitch.',

      introduction: `"Tell me about yourself" is often the first question in any interview and arguably the most important. It sets the tone for the entire conversation, shapes the interviewer's first impression, and—when done well—creates a narrative arc that guides every follow-up question in your favor. Studies from hiring platforms show that interviewers form a strong initial impression within the first 90 seconds, making this your highest-leverage moment.

What interviewers are really testing: communication clarity (can you explain your career concisely?), self-awareness (do you know what's relevant?), and intentionality (do you have a clear career trajectory, or are you just drifting?). A great answer tells a story of deliberate growth—from where you started, through key inflection points, to why this specific role is the logical next chapter.

A mediocre answer recites a resume chronologically, buries the lead under irrelevant details, or rambles past the 90-second mark. A great answer is a curated highlight reel: 60-90 seconds, three to four sentences per section, ending with genuine enthusiasm for the role. The interviewer should walk away thinking, "This person knows exactly who they are and why they're here."`,

      keyQuestions: [
        {
          question: 'How should I structure my response?',
          answer: `**The Present-Past-Future Framework**:

**Present** (30 seconds):
"I'm currently a Senior Software Engineer at [Company], where I lead a team of 5 engineers building our payment processing platform."

**Past** (30 seconds):
"Before this, I spent 3 years at [Previous Company] where I grew from an individual contributor to a tech lead. I specialized in distributed systems and helped scale our infrastructure from 100K to 10M daily transactions."

**Future** (30 seconds):
"I'm excited about this role because [Company] is solving [specific problem] which aligns with my passion for [relevant area]. I'm particularly drawn to the opportunity to [specific aspect of the role]."

**Key Elements**:
- Keep total response to 60-90 seconds
- Tailor content to the specific role
- Highlight 2-3 most relevant achievements
- End with enthusiasm for this opportunity`
        },
        {
          question: 'What should I avoid saying?',
          answer: `**Common Mistakes**:

❌ **Too Personal**: "I was born in Chicago, I have two kids..."
✅ **Professional Focus**: Start with current role and relevant experience

❌ **Reading Your Resume**: "In 2015, I started at Company A, then in 2017..."
✅ **Narrative Arc**: Tell a story of growth and progression

❌ **Too Long/Rambling**: 5+ minute monologue
✅ **Concise**: 60-90 seconds max, leave room for follow-up

❌ **Negative Comments**: "I left because my boss was terrible..."
✅ **Positive Framing**: "I was looking for new challenges..."

❌ **Memorized Script**: Sounds robotic and rehearsed
✅ **Natural Delivery**: Know your key points, speak conversationally

❌ **Generic Ending**: "...and that's about it"
✅ **Strong Close**: Connect to why you want THIS role`
        },
        {
          question: 'How do I tailor my response to different roles?',
          answer: `**Tailoring Strategy**:

**For Technical Roles** (IC):
- Lead with technical expertise and projects
- Mention specific technologies
- Highlight individual contributions

**For Leadership Roles** (Manager/Lead):
- Lead with team size and scope
- Mention people development
- Highlight cross-functional work

**For Startup Roles**:
- Emphasize versatility and wearing multiple hats
- Mention fast-paced experience
- Show entrepreneurial mindset

**For Enterprise Roles**:
- Highlight scale and complexity
- Mention process and methodology
- Show collaboration across teams

**Research the Company**:
1. Read the job description carefully
2. Note their tech stack and challenges
3. Understand their culture and values
4. Mention specific reasons you're interested`
        },
        {
          question: 'How do I handle this question at different career stages?',
          answer: `**New Grad / Early Career (0-2 years)**:
Lead with education and projects. "I recently graduated from [University] with a CS degree, where I focused on machine learning. During my internship at [Company], I built a feature that reduced customer churn predictions from weekly to real-time. I'm excited about this role because it combines my ML background with production engineering at scale."

**Mid-Level (3-6 years)**:
Lead with your current role and a signature achievement. "I'm a Software Engineer at [Company] where I own our notification delivery pipeline—2 billion pushes per day across iOS, Android, and web. Before that, I spent 3 years building backend APIs at a fintech startup. I'm looking to move into a senior role where I can influence architecture decisions, and your team's work on event-driven systems is exactly that opportunity."

**Senior / Staff (7+ years)**:
Lead with scope of impact and the thread connecting your career. "I've spent 10 years building and scaling distributed systems. Currently I'm a Staff Engineer at [Company] leading a cross-team initiative to migrate our monolith to microservices—70 services, 200 engineers affected. The common thread in my career has been taking on complex, ambiguous infrastructure problems and turning them into well-defined platforms. I'm drawn to [Your Company] because your challenge of unifying three acquired codebases is exactly that kind of problem."

**Career Switcher**:
Acknowledge the pivot, but connect the dots. "I spent 5 years in data science building recommendation models. I realized I was happiest when I was deploying those models—building APIs, setting up pipelines, debugging production issues. So I deliberately transitioned into backend engineering, bringing my ML knowledge along. That intersection of data and systems is what excites me about this ML infrastructure role."`
        },
        {
          question: 'What if I have gaps or non-linear career paths?',
          answer: `**Handling Career Gaps**:
Don't apologize. Frame gaps positively and briefly—then move on. The gap isn't your story; your growth is.

"After 4 years at [Company], I took 6 months to travel and study system design deeply. I came back with a clearer focus on distributed systems and joined [Next Company] specifically because of their scale challenges."

**Handling Frequent Job Changes**:
Connect the dots with a growth narrative. "I've intentionally sought roles that stretched me: first backend fundamentals at a startup, then distributed systems at scale, then leading a platform team. Each move was driven by wanting to tackle the next layer of complexity."

**Handling Industry Switches**:
Highlight transferable skills and deliberate intent. "I started in finance building trading systems—that gave me a deep appreciation for low-latency, fault-tolerant design. When I moved to consumer tech, I brought that reliability mindset to a domain where most engineers think 'move fast and break things.' The result was systems that were both fast AND reliable."

**Key Principles for Non-Linear Paths**:
- Every experience taught you something relevant—find the thread
- Interviewers care about trajectory, not perfection
- Brief explanation + forward momentum beats detailed justification
- The best narratives make non-linear paths seem inevitable in hindsight`
        },
        {
          question: 'How do I practice and deliver this naturally?',
          answer: `**Preparation Method**:

**Step 1: Write Three Versions**
- 30-second version (elevator pitch for casual encounters)
- 60-second version (standard interview answer)
- 2-minute version (for "walk me through your resume" prompts)

**Step 2: Record and Review**
- Record yourself on your phone
- Listen for filler words ("um," "like," "so basically")
- Time it—most people run 2x longer than they think

**Step 3: Practice with Transitions**
The transitions between sections matter most:
- "That experience led me to..." (natural flow)
- "Building on that..." (growth arc)
- "Which brings me to why I'm here..." (closing pivot)

**Delivery Tips**:
- Speak slightly slower than feels natural—nerves speed you up
- Make eye contact (or look at the camera in virtual interviews)
- Vary your tone—don't sound like you're reading a script
- Pause briefly between sections to let the interviewer process
- End on a forward-looking note, not a trailing "...yeah"

**Common Delivery Mistakes**:
- Starting with "Well, um, so..." → Start with a confident declarative sentence
- Trailing off at the end → Prepare a strong closing line
- Speaking in monotone → Practice emphasizing key achievements
- Fidgeting or looking away → Record yourself to catch body language`
        }
      ],

      starExample: {
        situation: 'Currently a senior engineer at a fintech company, leading the real-time payments team processing $2B in daily transactions across 15 countries',
        task: 'Led the migration from a batch processing system to real-time settlement, coordinating with 3 partner banks and 4 internal teams',
        action: 'Designed the event-driven architecture using Kafka and CDC, built the idempotency layer, mentored 2 junior engineers on distributed systems patterns, and created an automated rollback system',
        result: 'Reduced settlement time from T+1 to near-real-time (< 30 seconds), cut operational costs by 35%, and the architecture became the template for 3 other payment products'
      },

      exampleResponse: `"I'm a Senior Software Engineer with 6 years of experience in distributed systems and backend development. Currently at Stripe, I lead a team building our real-time fraud detection platform that processes 500M transactions daily. My biggest recent win was redesigning our rule evaluation engine to support real-time ML model inference—we cut false positive rates by 40% while maintaining sub-100ms latency at peak load.

Before Stripe, I was at a Series B startup where I was the third engineer. I built our core API from scratch, and as we grew to 50 engineers, I transitioned into a tech lead role managing our platform team. That experience taught me how to balance moving fast with building foundations that scale—a lesson I've applied at every stage since.

What excites me about [Your Company] is the scale of your technical challenges and the opportunity to work on [specific product/problem]. I've followed your engineering blog and was particularly impressed by your approach to [specific technology or initiative]. I'd love to bring my experience in building reliable systems at scale to help solve similar problems here."`,

      principles: [
        'Present-Past-Future: Start with who you are now, explain how you got here, then connect to why you want this role',
        'Curate ruthlessly: Include only what\'s relevant to THIS role—your career is the raw material, not the finished product',
        'Show trajectory: Every career move should sound intentional, even if it wasn\'t at the time',
        'End with the "why here": The strongest close connects your experience directly to their specific challenges',
        'Be conversational, not rehearsed: Know your key points but speak naturally—scripts sound robotic'
      ],

      sampleQuestions: [
        'Tell me about yourself',
        'Walk me through your resume',
        'Give me a brief overview of your background',
        'What brings you here today?',
        'How would you describe your career journey?',
        'What should I know about you that\'s not on your resume?'
      ],

      tips: [
        'Keep it to 60-90 seconds—set a timer when practicing',
        'Focus on relevant experience for the role, not your entire history',
        'End with why you\'re excited about this specific opportunity',
        'Practice but don\'t memorize word-for-word—know your key points',
        'Use the Present-Past-Future framework for natural flow',
        'Quantify achievements where possible (revenue, users, latency, team size)',
        'Prepare a 30-second and 2-minute version in addition to the standard 60-second version'
      ]
    },
    {
      id: 'leadership',
      title: 'Leadership',
      icon: 'users',
      color: '#3b82f6',
      questions: 6,
      description: 'Demonstrate leading without authority, mentoring, and driving results.',

      introduction: `Leadership questions assess your ability to influence, guide, and enable others—regardless of your title. At FAANG companies, leadership is expected at every level: an L4/E4 engineer leads a feature, an L5/E5 leads a project, an L6/E6 leads a team or initiative. The question isn't whether you have "manager" in your title—it's whether you can step up, take ownership, and drive results through collaboration.

What interviewers are really testing: Can you influence without authority? Do you take initiative before being asked? Can you align people with different priorities toward a shared goal? Do you develop others, or just do the work yourself? The strongest signals come from stories where you led despite having no formal authority—where people followed you because of your ideas, not your title.

A mediocre answer describes managing a project (assigning tickets, running standups). A great answer shows you changing the trajectory of a team or initiative: identifying a problem nobody else saw, rallying people around a solution, navigating resistance, and delivering measurable impact. The best leaders in tech don't just ship code—they multiply the output of everyone around them.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you led a project or initiative',
          answer: `**What They're Looking For**:
- How you organized and planned
- How you communicated and aligned stakeholders
- How you handled obstacles
- The outcome and your learnings

**STAR Example**:

**Situation**: "Our team was struggling with frequent production incidents—averaging 3 per week—which was burning out engineers and affecting customer trust."

**Task**: "As a senior engineer, I took the initiative to address our reliability issues, even though this wasn't officially my responsibility."

**Action**:
- "I proposed a 'Production Excellence' initiative to my manager and got buy-in"
- "Created a task force with 4 engineers from different teams"
- "Established on-call runbooks, automated common fixes, and implemented better alerting"
- "Ran weekly incident reviews to identify patterns and prevent recurrence"

**Result**: "Within 3 months, we reduced incidents by 70% and MTTR from 45 minutes to 15 minutes. The initiative was adopted company-wide, and I was asked to present our approach at the all-hands."

**Key Points**:
- Show initiative without being asked
- Demonstrate cross-functional collaboration
- Quantify the impact`
        },
        {
          question: 'How do you motivate team members?',
          answer: `**Framework for Motivation**:

**1. Understand Individual Motivations**:
"I start by understanding what drives each person. Some are motivated by technical challenges, others by career growth, visibility, or work-life balance."

**2. Provide Context and Purpose**:
"I always explain the 'why' behind what we're doing. People are more engaged when they understand how their work impacts users or the business."

**3. Create Ownership**:
"I give people ownership of meaningful problems, not just tasks. I trust them to make decisions and support them when they need help."

**4. Recognize and Celebrate**:
"I make sure to recognize contributions publicly—in standups, Slack, and to leadership. Everyone wants to feel valued."

**Example**:
"I had a junior engineer who was disengaged. I learned he felt like he was just doing bug fixes. I worked with him to own a small but visible feature, paired with him on the architecture, and gave him credit when it launched successfully. His engagement completely turned around, and he's now one of our strongest contributors."`
        },
        {
          question: 'Describe a time you had to make an unpopular decision',
          answer: `**STAR Example**:

**Situation**: "I was leading the migration to a new microservices architecture, and we discovered mid-project that our original timeline was unrealistic."

**Task**: "I needed to decide between rushing to meet the deadline with significant technical debt, or extending the timeline and disappointing stakeholders."

**Action**:
- "I analyzed the risks of rushing: potential outages, future maintenance burden, team burnout"
- "Prepared a clear presentation showing the trade-offs"
- "Proposed a phased approach: deliver core functionality on time, defer secondary features"
- "Communicated transparently with stakeholders about why this was the right call"

**Result**: "Initially, there was pushback from product management. However, after seeing the risk analysis, leadership supported the decision. We delivered phase 1 on time, and the phased approach actually resulted in better adoption as users could adapt incrementally."

**Key Insight**:
"Unpopular decisions become easier to accept when you:
1. Have data to support your position
2. Communicate the trade-offs clearly
3. Propose alternatives rather than just saying 'no'
4. Take ownership of the decision"`
        },
        {
          question: 'How do you handle underperforming team members?',
          answer: `**Framework**:

**1. Diagnose the Root Cause**:
- Skills gap? → Training and mentoring
- Motivation issue? → Understand what's affecting them
- Role mismatch? → Consider reassignment
- Personal issues? → Provide support and flexibility

**2. Have Direct Conversations**:
"I believe in addressing issues early and directly, but with empathy. I share specific observations, not judgments."

**3. Create a Clear Improvement Plan**:
- Define specific, measurable goals
- Agree on support and resources needed
- Set check-in cadence
- Be clear about consequences

**Example**:
"I had a team member whose code quality was declining. Instead of assuming laziness, I had a 1:1. I learned they were dealing with a difficult personal situation. We worked together on a plan: reduced scope for 4 weeks, paired programming sessions, and weekly check-ins. Their performance recovered, and they later told me that conversation prevented them from quitting."

**Key Point**: "Firing should be a last resort after genuine effort to help someone succeed."`
        }
      ],

      starExample: {
        situation: 'Production incidents were averaging 3 per week, burning out on-call engineers and eroding customer trust. No one owned the problem because it spanned multiple teams.',
        task: 'As a senior IC with no direct reports, I decided to take ownership of reliability improvements across the platform—despite this being outside my team\'s official scope.',
        action: 'Proposed a "Production Excellence" initiative to my skip-level manager and got budget for a cross-team task force of 4 engineers. Created on-call runbooks, automated the 10 most common incident remediations, introduced error budgets, and ran weekly blameless post-mortems to identify systemic patterns.',
        result: 'Reduced incidents from 3/week to less than 1/week within 3 months. MTTR dropped from 45 minutes to 12 minutes. The initiative was adopted company-wide, I presented the approach at the engineering all-hands, and it became a key factor in my Staff Engineer promotion.'
      },

      exampleResponse: `"At my previous company, I noticed our platform team was drowning in cross-cutting concerns—every feature team needed authentication, logging, and rate limiting, but each was building their own version. There were 6 different auth implementations across 40 services, each with different security postures.

I didn't have authority over other teams, but I saw the risk. I drafted an RFC proposing a shared platform SDK, gathered usage data showing we were spending 20% of engineering time on duplicated infrastructure, and presented the business case to our VP of Engineering. Once I had top-level support, I formed a working group with one engineer from each of the four largest teams.

The key challenge was getting buy-in from teams who had already built their own solutions. I didn't mandate adoption—instead, I made the SDK so easy to use that teams chose it voluntarily. We migrated 35 of 40 services within two quarters, reduced auth-related security incidents to zero, and freed up roughly 15% of engineering capacity. Three of the engineers in the working group later told me it was the most impactful project they'd worked on."`,

      principles: [
        'Lead with influence, not authority: The most impressive leadership stories come from people who had no formal power but drove change anyway',
        'Multiply others: Great leaders don\'t just do the work—they enable everyone around them to do better work',
        'Take ownership of problems, not just tasks: Leaders see gaps and fill them before being asked',
        'Build consensus through data and empathy: Persuade with evidence and by genuinely understanding others\' concerns',
        'Develop people deliberately: Mentoring, pairing, creating growth opportunities—these are leadership actions, not management tasks',
        'Accept accountability for outcomes: Leaders own both the wins and the losses of their initiatives'
      ],

      sampleQuestions: [
        'Tell me about a time you led a project or initiative without formal authority',
        'How do you motivate team members who are disengaged?',
        'Describe a time you had to make an unpopular decision and bring people along',
        'How do you handle underperforming team members?',
        'Tell me about a time you mentored someone and it changed their trajectory',
        'How do you build trust with a new team?',
        'Describe a time you drove a technical vision across multiple teams',
        'Tell me about a time you had to lead through a crisis'
      ],

      tips: [
        'Leadership isn\'t just for managers—show how you lead as an IC',
        'Focus on influence, not authority—the best stories involve persuasion, not mandates',
        'Show how you enabled others\' success, not just your own output',
        'Use specific examples with measurable outcomes (team velocity, incident reduction, adoption rates)',
        'Demonstrate empathy and emotional intelligence—especially in difficult situations',
        'Show that you take initiative without being asked—proactive leadership is the strongest signal',
        'For Amazon interviews, map your leadership stories to their Leadership Principles explicitly'
      ]
    },
    {
      id: 'conflict-resolution',
      title: 'Conflict Resolution',
      icon: 'messageSquare',
      color: '#f59e0b',
      questions: 6,
      description: 'How you handle disagreements and difficult conversations.',

      introduction: `Conflict is inevitable in any workplace—and interviewers know it. When they ask conflict questions, they're not looking for people who avoid disagreements (that's a red flag). They're looking for people who can engage in productive conflict: disagree respectfully, seek to understand before being understood, and turn friction into better outcomes.

What interviewers are testing: emotional intelligence (can you manage your own reactions?), communication skills (can you disagree without being disagreeable?), problem-solving under interpersonal pressure, and maturity (do you focus on the problem or the person?). At senior levels, they also assess whether you can navigate organizational politics and conflicting stakeholder interests without burning bridges.

A mediocre answer sounds diplomatic but vague: "I listened to their perspective and we found a compromise." A great answer includes a specific technical disagreement with real stakes (not just a personality clash), shows your reasoning process, demonstrates genuine empathy for the other side, and arrives at a resolution that made the team stronger. The best conflict stories end with the relationship improving, not just surviving.`,

      keyQuestions: [
        {
          question: 'Tell me about a disagreement with a coworker',
          answer: `**What They Want to See**:
- You stay professional and respectful
- You seek to understand the other perspective
- You focus on the problem, not the person
- You find a resolution (ideally win-win)

**STAR Example**:

**Situation**: "I disagreed with a senior engineer about our approach to database scaling. They wanted to add more read replicas, while I believed we should implement caching first."

**Task**: "I needed to advocate for my approach without damaging our working relationship."

**Action**:
- "I asked to understand their reasoning first—they were concerned about implementation complexity of caching"
- "I prepared a technical comparison showing trade-offs of both approaches"
- "Proposed a small proof-of-concept to test caching on one high-traffic endpoint"
- "Involved our tech lead to provide a neutral perspective"

**Result**: "The POC showed caching reduced database load by 60% with minimal complexity. We implemented caching first, which actually delayed the need for read replicas. My colleague appreciated the data-driven approach, and we've collaborated effectively since."

**Key Insight**: "Disagree with data, not opinions. Make it about finding the best solution, not about being right."`
        },
        {
          question: 'How do you handle conflicting priorities from different stakeholders?',
          answer: `**Framework for Prioritization Conflicts**:

**1. Understand the Full Picture**:
- What's the business impact of each request?
- What are the dependencies and deadlines?
- Why does each stakeholder believe their priority is highest?

**2. Make Trade-offs Visible**:
"I create a clear view of what we can and can't do, and the consequences of each choice. This prevents unrealistic expectations."

**3. Escalate Thoughtfully**:
"If stakeholders can't agree, I bring them together with data and facilitate a decision. If needed, I escalate to someone who can make the call."

**Example**:
"Product wanted a new feature, while ops needed urgent security patches. Instead of just picking one, I:
1. Quantified the risk: security issue affected 10K users
2. Showed feature deadline could slip 2 weeks without major impact
3. Proposed: security first, then feature—with a clear timeline for both
4. Got both stakeholders in a room to align

Both agreed when they saw the full picture. The key was making the trade-off explicit rather than trying to do both poorly."`
        },
        {
          question: 'Describe a time you had to push back on a decision',
          answer: `**STAR Example**:

**Situation**: "Leadership decided to launch a major feature on a specific date to align with a marketing campaign, but the code wasn't ready—we had known bugs and no time for proper testing."

**Task**: "I needed to advocate for quality without being seen as obstructionist."

**Action**:
- "I documented the specific risks: 3 known bugs, 40% test coverage, no load testing"
- "Proposed alternatives: soft launch to 5% of users, or delay marketing by one week"
- "Prepared a rollback plan in case we had to launch anyway"
- "Presented data on cost of fixing bugs post-launch vs. pre-launch"

**Result**: "Leadership chose the soft launch option. We caught two critical issues in the 5% rollout that would have affected thousands of users. The full launch was successful, and I was recognized for 'protect the customer' thinking."

**Key Points**:
- Push back with data, not just concerns
- Offer alternatives, don't just say no
- Show you understand business constraints
- Accept the decision gracefully if overruled`
        }
      ],

      starExample: {
        situation: 'I was the backend tech lead on a checkout rewrite. A senior frontend engineer wanted to implement a single-page checkout with client-side validation only, arguing it would be faster to ship. I believed we needed server-side validation for PCI compliance and fraud prevention—a fundamental architectural disagreement with real financial risk.',
        task: 'Resolve the disagreement without damaging our working relationship or delaying the project beyond the Black Friday deadline.',
        action: 'Instead of escalating immediately, I first asked the frontend engineer to walk me through their reasoning—I learned they had a valid concern about latency impact on conversion rates. I then prepared a comparison document: Option A (client-only) vs. Option B (client + server) with latency benchmarks, security implications, and PCI audit risk. I proposed a hybrid: client-side validation for UX speed with async server-side validation that wouldn\'t block the user flow. We presented both approaches to the team and let the group weigh in.',
        result: 'The team chose the hybrid approach. Checkout latency improved 200ms vs. the old system, we passed PCI audit with zero findings, and the frontend engineer later said the collaboration made the final design better than either of our original proposals. We co-authored the architectural decision record together.'
      },

      exampleResponse: `"Last year, my team was deciding whether to adopt GraphQL for our new API layer or stick with REST. I was a strong advocate for GraphQL because our mobile clients were making 8-12 REST calls per screen, causing significant over-fetching and battery drain. A principal engineer on the platform team pushed back hard—he argued that GraphQL would increase backend complexity, make caching harder, and create a learning curve for 30+ engineers.

Rather than lobbying for my position, I suggested we run a structured evaluation. I asked him to define the criteria he cared most about (operational complexity, caching, team ramp-up time) while I defined mine (mobile performance, developer experience, payload efficiency). We built a small proof-of-concept together, testing both approaches on our highest-traffic endpoint.

The data showed GraphQL reduced mobile payload sizes by 60% but did complicate our CDN caching strategy. We landed on a compromise: GraphQL for mobile-facing APIs where over-fetching was severe, REST for internal service-to-service communication where caching mattered more. The principal engineer appreciated that I took his concerns seriously enough to quantify them, and we've collaborated effectively on three projects since. The hybrid approach actually became our architectural standard."`,

      principles: [
        'Seek to understand before being understood: Always ask "help me understand your perspective" before presenting yours',
        'Disagree with data, not opinions: Run benchmarks, gather metrics, build POCs—let evidence settle technical disputes',
        'Focus on the problem, not the person: "This approach has risks" not "Your approach is wrong"',
        'Propose alternatives, don\'t just reject: "What if we tried X instead?" is more productive than "No"',
        'Accept the decision gracefully: Once a decision is made, commit fully—even if it wasn\'t your preference',
        'Strengthen the relationship: The best conflict resolutions end with mutual respect, not just a truce'
      ],

      sampleQuestions: [
        'Tell me about a disagreement with a coworker on a technical decision',
        'How do you handle conflicting priorities from different stakeholders?',
        'Describe a time you had to push back on a decision from leadership',
        'Tell me about a time you had a conflict with your manager',
        'How do you handle receiving critical feedback?',
        'Describe a situation where two teams had opposing goals and you had to mediate',
        'Tell me about a time you changed your mind during a technical debate'
      ],

      tips: [
        'Show empathy and active listening—interviewers watch for genuine curiosity about the other side',
        'Focus on the problem, not the person—never characterize the other party negatively',
        'Demonstrate finding win-win solutions rather than zero-sum victories',
        'Never badmouth previous colleagues or companies—it always reflects poorly on you',
        'Use "I" statements not "they" statements: "I felt concerned about..." not "They were being unreasonable..."',
        'Show how the relationship improved after the conflict—this is the strongest ending',
        'Pick a conflict with real stakes (technical, business, or organizational) not a personality clash'
      ]
    },
    {
      id: 'failure-mistakes',
      title: 'Failures & Mistakes',
      icon: 'alertTriangle',
      color: '#f43f5e',
      questions: 6,
      description: 'Show self-awareness and ability to learn from setbacks.',

      introduction: `Failure questions are among the most important in behavioral interviews—and most candidates get them wrong. The biggest mistake is choosing a "safe" failure that's really a humble brag ("I worked too hard and burned out") or blaming external factors ("The requirements kept changing"). Interviewers see through both instantly.

What interviewers are really testing: self-awareness (can you honestly assess what went wrong?), accountability (do you own the mistake or deflect?), resilience (did you recover or crumble?), and growth mindset (did you actually change your behavior?). At Amazon, this maps directly to "Earn Trust" and "Learn and Be Curious." At Google, it signals intellectual humility.

A great failure story follows the 30/70 rule: spend 30% describing what went wrong and 70% on what you learned, how you changed, and the evidence that you've applied those lessons since. The failure should be genuine and significant enough to matter—a production outage, a missed launch, a wrong architectural bet—but not career-ending. The learning should be specific and lasting: not "I learned to communicate better" but "I now run a pre-mortem before every launch, and the last three launches had zero P0 incidents."`,

      keyQuestions: [
        {
          question: 'Tell me about a time you failed',
          answer: `**What They're Assessing**:
- Self-awareness and honesty
- Accountability (do you own it or blame others?)
- Learning and growth mindset
- How you've applied lessons learned

**STAR Example**:

**Situation**: "Early in my career as a tech lead, I was responsible for a system migration. I was so focused on the technical execution that I underestimated the change management needed."

**Task**: "We needed to migrate 50 teams from the old system to the new one within 3 months."

**Action**:
- "I built a technically solid migration plan"
- "BUT I didn't involve teams early enough or get their buy-in"
- "When we launched, teams weren't prepared; many reverted to the old system"
- "I had to restart, this time with early stakeholder involvement"

**Result**: "The migration took 5 months instead of 3. However, I learned that technical excellence isn't enough—adoption requires communication and change management."

**What I Learned**: "Now I involve stakeholders from day one. I budget time for communication, training, and feedback loops. In my next migration project, I spent 20% of the timeline on change management, and we had 95% adoption on launch day."

**Key Point**: The learning matters more than the failure itself.`
        },
        {
          question: 'What\'s your biggest professional regret?',
          answer: `**How to Approach**:
- Be authentic—interviewers can sense fake answers
- Choose something meaningful but not disqualifying
- Focus on what you learned and changed

**Example Answer**:
"My biggest regret is not speaking up earlier in my career when I saw problems. At my first company, I noticed our deployment process was risky—no staging environment, minimal testing. I assumed senior people knew better and didn't raise concerns.

Eventually, we had a major production incident that I could have helped prevent. After that, I committed to always voicing concerns, even when I'm the most junior person in the room. I've learned that respectful pushback is valued, not punished.

Now I encourage my team to challenge assumptions. Some of our best improvements came from junior engineers questioning 'the way we've always done it.'"`
        },
        {
          question: 'Tell me about a time you made a mistake that affected others',
          answer: `**STAR Example**:

**Situation**: "I deployed a database migration that I thought was backward compatible. It wasn't—it broke the mobile app for 2 hours during peak traffic."

**Task**: "I needed to fix the issue immediately and take responsibility."

**Action**:
- "Immediately rolled back the migration (even though it meant losing some data)"
- "Communicated transparently in our incident channel"
- "Wrote a detailed post-mortem within 24 hours"
- "Implemented new safeguards: mandatory backward compatibility checks, staged rollouts"

**Result**: "We lost about $10K in transactions, which I had to present to leadership. However, my transparent handling and the safeguards I implemented meant it never happened again. My manager later said my response to the failure was more impressive than if I'd never made the mistake."

**Key Takeaways**:
- Own mistakes immediately and publicly
- Fix first, blame never
- Implement systemic changes to prevent recurrence
- A well-handled failure builds trust`
        }
      ],

      starExample: {
        situation: 'I was leading the backend migration of our user authentication service from a monolithic session-based system to distributed JWT-based auth. The migration affected every service in our microservices architecture—42 services, 200K daily active users.',
        task: 'Execute the migration with zero downtime and backward compatibility during the transition period.',
        action: 'I built a technically sound migration plan with dual-write during transition. But I made a critical error: I didn\'t involve the mobile team early enough. I assumed the token format change was transparent to clients—it wasn\'t. Mobile clients cached old session tokens and couldn\'t handle JWT refresh flows. The result was 15% of mobile users getting logged out repeatedly on launch day.',
        result: 'I immediately rolled back to the old auth system, wrote a detailed post-mortem within 24 hours, and took full ownership in front of the engineering org. I then rebuilt the migration plan with mobile-first compatibility testing, created a client SDK that handled both token formats, and re-launched 3 weeks later with zero issues. The lesson—always identify ALL consumers of your API before changing it—became part of our migration checklist and prevented similar issues on two subsequent migrations.'
      },

      exampleResponse: `"My biggest failure was a database migration I led that caused a 4-hour partial outage affecting our payments processing. I was migrating our transaction history from PostgreSQL to a time-series database to improve query performance. I'd tested thoroughly in staging with realistic data volumes and was confident in the migration plan.

What I missed was a subtle difference between staging and production: our staging database had uniform data distribution, but production had severe hot spots—our top 100 merchants generated 60% of all transactions. During the migration, the hot-spot rows caused lock contention that cascaded into connection pool exhaustion across our payment processing service. For 4 hours, about 30% of transactions failed.

I rolled back within 20 minutes of detecting the issue, but some merchants had already been affected. I wrote a public post-mortem, presented it to the entire engineering org, and took complete ownership. The root cause was that I tested with representative data volume but not representative data distribution.

What I changed permanently: I now require production-parity testing for any data migration—same distribution, same hot spots, same concurrency patterns. I built a tool that generates synthetic datasets matching production's statistical profile. Since then, I've led four more migrations with zero downtime. That one failure made me fundamentally better at capacity planning, and the testing tool is now used by every team doing migrations."`,

      principles: [
        'Own it completely: Never say "we" when you mean "I made a mistake." Accountability is the strongest signal.',
        'Pick a real failure: Choose something with genuine consequences—not a humble brag or a trivial error',
        'Follow the 30/70 rule: 30% on what went wrong, 70% on what you learned and changed',
        'Show systemic change: Don\'t just say you "learned to be more careful"—describe specific processes, tools, or habits you built',
        'Demonstrate the lesson stuck: Reference a subsequent situation where you applied the learning successfully',
        'Never blame others: Even if others contributed to the failure, focus on what YOU could have done differently'
      ],

      sampleQuestions: [
        'Tell me about a time you failed',
        'Describe a mistake and how you handled it',
        'What\'s your biggest professional regret?',
        'Tell me about a time you received negative feedback',
        'Describe a project that didn\'t go as planned',
        'Tell me about a time your judgment was wrong',
        'Describe a technical decision you made that you would reverse if you could'
      ],

      tips: [
        'Choose a REAL failure, not a humble brag ("I work too hard")',
        'Take full ownership—never blame others or circumstances',
        'Spend 70% of your answer on what you learned and changed',
        'Show how you\'ve applied that lesson since with a specific follow-up example',
        'Demonstrate growth mindset and resilience',
        'It\'s okay if the failure was significant—that makes the learning more meaningful',
        'Avoid failures from more than 5 years ago unless the lesson is extraordinary'
      ]
    },
    {
      id: 'achievements',
      title: 'Achievements',
      icon: 'star',
      color: '#22c55e',
      questions: 6,
      description: 'Highlight your biggest wins and impact.',

      introduction: `Achievement questions are your chance to sell yourself—and most engineers undersell. The typical mistake is describing what the team did without isolating your specific contribution, or leading with technical details before establishing business context. Interviewers have heard thousands of "I built a microservice" stories; what they remember are stories with clear stakes, clever decisions, and quantified outcomes.

What interviewers are testing: Can you identify what matters (not just what's technically interesting)? Can you articulate YOUR unique contribution? Do you understand how technical work connects to business results? Can you handle a complex, high-stakes project from start to finish? The strongest candidates have 3-5 polished achievement stories that demonstrate different competencies: technical depth, leadership, innovation, business impact, and cross-functional influence.

A mediocre achievement story sounds like a resume bullet: "I built a caching layer that improved performance." A great achievement story creates a narrative arc: stakes ("$50K/month in lost transactions"), diagnosis ("discovered a retry storm nobody else had identified"), decision-making ("chose circuit breaker over rate limiting because..."), impact ("99.9% uptime through Black Friday"), and ripple effects ("became the template for 3 other services"). Make the interviewer think, "I want this person solving OUR problems."`,

      keyQuestions: [
        {
          question: "What's your proudest professional accomplishment?",
          answer: `**Structure for Achievement Stories**:

**1. Set the Context**:
- What made this challenging?
- Why did it matter to the business?
- What was at stake?

**2. Your Specific Contribution**:
- What was YOUR role vs. the team's?
- What unique skills or insights did you bring?
- What decisions did YOU make?

**3. Quantified Impact**:
- Numbers: performance improvement, cost savings, users affected
- Business outcomes: revenue, efficiency, customer satisfaction
- Technical metrics: latency, uptime, scale

**STAR Example**:

**Situation**: "Our e-commerce platform was losing $50K/month due to checkout failures during peak hours. The system had been problematic for 2 years with multiple failed fix attempts."

**Task**: "As the senior engineer, I was asked to diagnose and fix the issue within 4 weeks before Black Friday."

**Action**:
- "I built a comprehensive observability system to trace every checkout attempt"
- "Discovered the root cause was database connection pool exhaustion combined with a retry storm"
- "Designed a circuit breaker pattern with graceful degradation"
- "Implemented connection pooling optimization and async processing"
- "Created a load testing framework to validate the fix"

**Result**: "Reduced checkout failures from 15% to 0.1%. Handled 3x normal Black Friday traffic without issues. The solution became a template for other services, and I presented the approach at an internal tech talk."

**Why This Works**: Shows technical depth, business impact, and influence beyond the immediate problem.`
        },
        {
          question: 'Describe your biggest technical achievement',
          answer: `**What Makes a Great Technical Achievement**:

**1. Scale or Complexity**: Did you solve something that others couldn't?
**2. Innovation**: Did you introduce new approaches or technologies?
**3. Impact**: Did it meaningfully improve the system or business?
**4. Learning**: What did you learn and teach others?

**STAR Example**:

**Situation**: "Our microservices architecture had grown to 150 services with no consistent observability. Debugging production issues took hours, and we were missing our SLA targets."

**Task**: "I proposed and led an initiative to implement distributed tracing across all services."

**Action**:
- "Evaluated OpenTelemetry vs. vendor solutions; chose OpenTelemetry for flexibility"
- "Designed a gradual rollout strategy to minimize risk"
- "Created shared libraries and SDKs to make instrumentation easy for teams"
- "Built custom dashboards connecting traces to business metrics"
- "Ran workshops to train 40+ engineers on the new observability tools"

**Result**:
- "Mean time to detect (MTTD) reduced from 45 minutes to 5 minutes"
- "Mean time to resolve (MTTR) reduced from 4 hours to 45 minutes"
- "Engineering satisfaction with debugging tools increased 40% in surveys"
- "The approach was adopted by two other business units"

**Technical Credibility**: Mention specific technologies, trade-offs you evaluated, and technical challenges you overcame.`
        },
        {
          question: 'Tell me about a time you exceeded expectations',
          answer: `**What They Want to See**:
- Initiative—you did more than asked
- Business awareness—you understood broader impact
- Quality—you delivered something exceptional

**STAR Example**:

**Situation**: "I was asked to create a simple data export feature for our analytics dashboard. The requirement was just a CSV download button."

**Task**: "Deliver a basic export feature within one sprint."

**Action**:
- "I noticed users were requesting exports frequently for the same reports"
- "Instead of just CSV, I built a scheduled reports system with email delivery"
- "Added support for multiple formats (CSV, Excel, PDF) based on user research"
- "Implemented smart caching so repeated reports generated instantly"
- "Created a self-service UI so users could configure their own scheduled reports"

**Result**: "What started as a 1-day feature became a key differentiator. Customer support tickets for data requests dropped 80%. Two enterprise clients cited scheduled reports as a deciding factor in their renewal."

**Key Insight**: "I could have just done what was asked. But taking time to understand the 'why' behind the request led to a much more impactful solution."`
        },
        {
          question: 'What impact have you had in your current/previous role?',
          answer: `**Impact Categories to Highlight**:

**Technical Impact**:
- Systems you built or significantly improved
- Performance or reliability improvements
- Technical debt reduction
- Architecture decisions

**Team Impact**:
- Mentoring and growing other engineers
- Processes you improved
- Knowledge sharing initiatives
- Code quality improvements

**Business Impact**:
- Revenue or cost effects
- Customer experience improvements
- Product features that drove growth

**Example Response**:

"In my current role, I've had impact in three areas:

**1. System Reliability**: I led the initiative to improve our payment processing reliability from 99.5% to 99.99%. This prevented an estimated $2M in annual lost transactions.

**2. Team Efficiency**: I introduced automated code review checks and deployment pipelines that reduced our release cycle from 2 weeks to daily deployments. This let us respond to customer feedback 10x faster.

**3. Engineering Culture**: I started our internal tech blog and brown bag lunch series. We've published 25 articles and the program has become key for knowledge sharing and onboarding.

The common thread is finding high-leverage opportunities where a relatively small investment of time creates outsized returns."`
        }
      ],

      starExample: {
        situation: 'Our e-commerce search was returning irrelevant results for 30% of queries, driving users to competitors. The existing Elasticsearch setup used basic term matching with no query understanding. Previous attempts to fix it had failed because the search team treated it as a pure infrastructure problem.',
        task: 'As the newly hired senior engineer on the search team, I was given 6 weeks to measurably improve search relevance before the holiday season.',
        action: 'Instead of tuning Elasticsearch parameters (which had been tried before), I took a user-centric approach. I analyzed 10,000 search sessions to understand failure patterns. I found that 60% of poor results came from synonym mismatches ("sneakers" vs "athletic shoes") and 25% from typos. I implemented a query preprocessing pipeline: spell correction using a Levenshtein automaton, synonym expansion from a curated dictionary I built from click-through data, and category-boosting based on user browsing history. I also set up an A/B testing framework so we could measure relevance improvements scientifically.',
        result: 'Search relevance (measured by click-through rate on first-page results) improved from 45% to 78%. Revenue from search-originated sessions increased 23% during the holiday season. The A/B testing framework became the standard for all product experimentation at the company. I was promoted to tech lead of the search team based on this project.'
      },

      exampleResponse: `"The achievement I'm most proud of is building a real-time anomaly detection system for our SaaS platform that prevented an estimated $4M in customer churn over its first year.

We were losing enterprise customers because service degradation would go undetected for hours—our monitoring only caught outages, not slow degradation. I proposed building a system that could detect subtle performance anomalies before they became outages.

The technical challenge was significant: we had 200+ services generating 50 million metrics per minute, and we needed to detect anomalies within 60 seconds without drowning engineers in false positives. I evaluated three approaches: statistical (Z-score), ML-based (isolation forest), and hybrid. After testing on historical incident data, I chose the hybrid approach—statistical for simple metrics with predictable patterns, ML for complex multi-dimensional signals.

I built the system with Apache Flink for stream processing, trained models on 6 months of historical data, and implemented a confidence scoring system that reduced false positives to under 5%. The key insight was correlating anomalies across related services—a single slow endpoint might be noise, but three correlated anomalies across the request path is almost always real.

In its first quarter, the system detected 12 incidents an average of 23 minutes before our existing monitoring. Three of those would have been P0 outages affecting our largest enterprise customers. The VP of Engineering called it 'the most impactful infrastructure project of the year,' and I was invited to present the approach at our company's engineering conference."`,

      principles: [
        'Lead with business impact, then explain the technical solution: "$50K saved" is more memorable than "reduced latency by 200ms"',
        'Isolate YOUR contribution: Use "I" for your actions, "we" for team context—interviewers need to know what was uniquely yours',
        'Explain why it was hard: Without establishing difficulty, even great achievements sound routine',
        'Show the ripple effect: The best achievements influence beyond the immediate problem—new standards, shared tools, cultural shifts',
        'Prepare multiple achievements: Have separate stories for technical depth, leadership, innovation, and cross-functional impact',
        'Connect to the role: Emphasize the aspects of your achievement most relevant to the job you\'re interviewing for'
      ],

      sampleQuestions: [
        "What's your proudest professional accomplishment?",
        'Describe your biggest technical achievement',
        'Tell me about a time you exceeded expectations',
        'What impact have you had in your current role?',
        'Tell me about a project you initiated on your own',
        'Describe your most innovative solution to a problem',
        'What is the most challenging project you\'ve worked on?'
      ],

      tips: [
        'Quantify impact with specific numbers: revenue, performance metrics, users affected, time saved',
        'Explain WHY it was challenging—set the stakes before describing the solution',
        'Show your specific contribution vs. team effort—interviewers want YOUR signal',
        'Connect to skills relevant for the role you\'re interviewing for',
        'Prepare 3-5 achievement stories covering different competencies (technical, leadership, innovation)',
        'Include the "ripple effect"—how your achievement influenced beyond the immediate project',
        'Practice the story to stay under 3 minutes while hitting all key points'
      ]
    },
    {
      id: 'problem-solving',
      title: 'Problem Solving',
      icon: 'lightbulb',
      color: '#ef4444',
      questions: 6,
      description: 'Demonstrate analytical thinking and creative solutions.',

      introduction: `Problem-solving questions are the behavioral equivalent of a coding interview—they assess HOW you think, not just what you did. Interviewers are watching for structured thinking, hypothesis-driven investigation, and the ability to navigate ambiguity without freezing up. These questions appear in every FAANG loop and carry significant weight in leveling decisions.

What interviewers are testing: analytical rigor (do you break problems down systematically?), creativity (do you consider non-obvious solutions?), collaboration (do you leverage expertise from others?), and judgment (do you know when you have enough information to act vs. when to keep investigating?). At senior levels, they also assess whether you can identify the RIGHT problem to solve—not just solve the one handed to you.

A mediocre answer describes solving a well-defined bug. A great answer shows you navigating genuine complexity: multiple root causes interacting, incomplete information, time pressure, cross-team dependencies, and a solution that required both technical depth and strategic thinking. The best problem-solving stories demonstrate that you don't just fight fires—you prevent them by seeing patterns others miss.`,

      keyQuestions: [
        {
          question: 'Describe a complex problem you solved',
          answer: `**Framework for Complex Problem Stories**:

**1. Establish Complexity**: Why was this hard? Multiple variables, unknowns, stakeholders, or constraints.
**2. Show Your Process**: How did you break it down? What framework did you use?
**3. Demonstrate Iteration**: Did you try multiple approaches? How did you learn?
**4. Highlight Collaboration**: Who else was involved? How did you leverage expertise?

**STAR Example**:

**Situation**: "Our recommendation engine was showing 40% irrelevant results. It used a basic collaborative filtering algorithm that couldn't handle our cold-start problem—new users had no history, and new products had no ratings."

**Task**: "Design and implement a solution to improve recommendation relevance by at least 50%."

**Action**:
- "First, I deeply analyzed the failure cases to understand patterns"
- "Identified three root causes: cold-start, popularity bias, and stale preferences"
- "Researched hybrid approaches combining content-based and collaborative filtering"
- "Prototyped three algorithms and ran A/B tests on 5% of traffic"
- "Collaborated with data science team on feature engineering"
- "Implemented the winning approach with real-time preference updates"

**Result**: "Improved relevance score from 60% to 85%. Click-through rate increased 35%. The hybrid approach became our standard, and I documented the methodology for future improvements."

**Key Insight**: "Complex problems rarely have single solutions. The key is systematic experimentation and being willing to combine approaches."`
        },
        {
          question: 'How do you approach ambiguous problems?',
          answer: `**Framework for Ambiguity**:

**1. Define What You Know vs. Don't Know**
**2. Identify Key Questions That Would Clarify**
**3. Make Reasonable Assumptions (and state them)**
**4. Create a Plan That Allows for Learning**
**5. Set Checkpoints to Validate Assumptions**

**Example Response**:

"When facing ambiguous problems, I follow a structured approach:

**Step 1 - Clarify the Goal**: 'What does success look like?' Sometimes stakeholders disagree, and aligning on outcomes prevents wasted work.

**Step 2 - Map the Unknown**: I literally list what I don't know and categorize it:
- Things I can find out quickly (ask someone, look up data)
- Things requiring investigation (experiments, research)
- True unknowns (have to make assumptions)

**Step 3 - Start Small**: Rather than designing a complete solution upfront, I identify the smallest experiment that would validate my biggest assumption.

**Step 4 - Timebox and Checkpoint**: 'I'll spend 2 days on this approach. If it's not working, I'll reassess.'

**Real Example**: When asked to 'improve our CI/CD pipeline' with no specific goals, I:
1. Interviewed 10 engineers to understand pain points
2. Measured current metrics (build time, failure rate, deploy frequency)
3. Identified the top 3 complaints
4. Proposed specific improvements with expected outcomes
5. Got stakeholder alignment before starting

The ambiguity became a clear, measurable project."`
        },
        {
          question: 'Tell me about a time you had to make a decision with incomplete information',
          answer: `**What They're Assessing**:
- Comfort with uncertainty
- Decision-making framework
- Ability to act despite imperfect data
- Risk management

**STAR Example**:

**Situation**: "We discovered a potential security vulnerability in production on a Friday afternoon. We had evidence of unusual API calls but weren't sure if it was an attack or a misbehaving client."

**Task**: "Decide whether to take drastic action (shut down the API) or investigate further while the system remained live."

**Action**:
- "Quickly gathered what we knew: 500 unusual requests from 3 IP addresses, hitting a specific endpoint"
- "Assessed the worst case: if it was an attack, customer data could be at risk"
- "Assessed the cost of being wrong: API shutdown would affect 10K users for ~2 hours"
- "Made the call: temporarily block the suspicious IPs while we investigated, rather than full shutdown"
- "Set a 30-minute timer—if we couldn't confirm benign behavior, we'd escalate to full shutdown"
- "Pulled in security team and set up enhanced monitoring"

**Result**: "Turned out to be a new partner's integration script with a bug. No attack, no data breach. We resolved it in 45 minutes with minimal user impact. I documented the decision framework for future incidents."

**Decision Framework**:
- What's the worst case if I act?
- What's the worst case if I don't act?
- What's the cost of reversing this decision?
- Can I make a smaller, reversible decision first?`
        },
        {
          question: 'Describe a time you had to debug a difficult production issue',
          answer: `**What Makes a Great Debugging Story**:
- Shows systematic thinking, not trial and error
- Demonstrates technical depth
- Highlights collaboration and communication
- Includes prevention of future issues

**STAR Example**:

**Situation**: "Our payment service started timing out intermittently—10% of transactions were failing, but only between 2-4 PM daily. No code changes had been deployed in weeks."

**Task**: "Find and fix the root cause while minimizing impact on customers."

**Action**:
- "Started with metrics: correlated timeouts with database query latency spikes"
- "Eliminated obvious causes: checked for cron jobs, deployment, traffic patterns"
- "Noticed pattern matched when marketing sent daily email campaigns"
- "Hypothesized: email clicks → traffic spike → connection pool exhaustion"
- "Validated: connection pool metrics confirmed they were maxed during failures"
- "Temporary fix: increased pool size and added circuit breaker"
- "Permanent fix: optimized slow queries and implemented connection pooling improvements"

**Result**: "Fixed the immediate issue within 2 hours. Root cause was a combination of a slow query and undersized connection pool that only manifested under specific traffic patterns. Prevented $50K in daily transaction failures."

**Post-Mortem Actions**:
- Added monitoring for connection pool saturation
- Set up alerts for query latency degradation
- Documented the debugging process for the team`
        },
        {
          question: 'Tell me about a time you had to balance speed vs. quality',
          answer: `**What They Want to See**:
- Business awareness (understanding trade-offs)
- Technical judgment (knowing what can be deferred)
- Communication (setting expectations)
- Long-term thinking (not creating tech debt landmines)

**STAR Example**:

**Situation**: "We had a critical customer demo in 2 weeks that required a new feature. Proper implementation would take 4 weeks. Rushing it could create tech debt."

**Task**: "Deliver something functional for the demo without compromising long-term system health."

**Action**:
- "Analyzed what was truly needed vs. nice-to-have for the demo"
- "Identified core functionality that MUST be solid vs. parts that could be manual/limited"
- "Created two implementation plans: 'demo mode' and 'production ready'"
- "For demo: built core feature with happy-path handling, manual edge cases"
- "Explicitly documented what was missing and created tech debt tickets"
- "Set clear timeline with stakeholders: demo version now, production version in 3 more weeks"

**Result**: "Demo was successful—customer signed a $500K contract. Completed production version 2 weeks after, addressing all edge cases. The tech debt tickets ensured nothing was forgotten."

**Key Principles**:
- Be explicit about what you're cutting and why
- Never compromise on security or data integrity
- Create visibility into technical debt
- Set expectations with stakeholders about follow-up work`
        }
      ],

      starExample: {
        situation: 'Our payment processing system had intermittent failures—about 2% of transactions failed, but only during specific 15-minute windows throughout the day. The issue had persisted for 3 months with multiple engineers investigating without resolution. Customer complaints were escalating.',
        task: 'As the senior backend engineer, I was asked to take over the investigation and either fix the issue or identify why previous attempts had failed—within 2 weeks.',
        action: 'Previous engineers had focused on the payment service itself. I took a step back and mapped the entire transaction flow end-to-end, correlating failure timestamps with every system event. I discovered the 15-minute windows coincided with our Kubernetes autoscaler adding nodes—during scale-up, DNS resolution briefly failed for our payment provider\'s endpoint due to a CoreDNS caching bug. The failures weren\'t in our payment code at all; they were infrastructure-level DNS timeouts. I implemented a fix in three layers: DNS pre-warming on new nodes, a local DNS cache with stale-serve capability, and a retry with exponential backoff specifically for DNS resolution failures.',
        result: 'Transaction failure rate dropped from 2% to 0.01% within 24 hours of deployment. The fix recovered an estimated $180K in monthly failed transactions. I documented the debugging methodology as a "cross-layer investigation playbook" that became required reading for on-call engineers, reducing MTTR for similar cross-cutting issues by 60%.'
      },

      exampleResponse: `"The most complex problem I solved was tracking down why our real-time analytics pipeline was silently dropping about 5% of events—but only for users in certain geographic regions, and only during specific hours. The data team had flagged the discrepancy but couldn't find a pattern.

I started by mapping the full event path: client SDK → API gateway → Kafka → Flink processor → ClickHouse. I instrumented each hop with correlation IDs and built a reconciliation job that compared events at each stage. This revealed the drops were happening between Kafka and Flink, but only for events that arrived during Flink checkpoint operations.

The root cause was subtle: our Flink job used event-time processing with a watermark delay of 30 seconds. For users in regions with high network latency (Southeast Asia, parts of Africa), events sometimes arrived just past the watermark threshold during checkpoint operations, causing them to be silently dropped as 'late events.' The geographic pattern matched perfectly.

I redesigned the watermark strategy to use a tiered approach: different watermark delays based on the source region's typical latency profile, with a global catch-up window that ran hourly to process any events that fell through. The fix eliminated 99.8% of the drops and the data team confirmed analytics accuracy went from 95% to 99.97%. The tiered watermark pattern was adopted by two other streaming pipelines at the company."`,

      principles: [
        'Think in systems, not components: The best problem-solvers trace issues across layers (app, infrastructure, network, data) rather than assuming the problem is in their code',
        'Hypothesize before investigating: Form a theory, then design the minimum experiment to confirm or refute it—don\'t just read logs randomly',
        'Separate symptoms from root causes: "The database is slow" is a symptom. "We\'re doing a full table scan on a 100M row table because an index was dropped" is a root cause',
        'Make the implicit explicit: When you discover a pattern, document it so others can benefit—debugging playbooks, monitoring dashboards, and runbooks multiply your impact',
        'Know when to ask for help: The best problem-solvers leverage expertise from others rather than spending days in a silo',
        'Prevent, don\'t just fix: A great problem-solver fixes the bug AND prevents the class of bugs from recurring'
      ],

      sampleQuestions: [
        'Describe a complex problem you solved',
        'How do you approach ambiguous problems?',
        'Tell me about a time you had to make a decision with incomplete information',
        'Walk me through how you debug a production issue',
        'Tell me about a time you identified a problem that no one else saw',
        'Describe a time when the obvious solution turned out to be wrong',
        'How do you prioritize when you have multiple urgent problems simultaneously?'
      ],

      tips: [
        'Walk through your thought process step by step—show the interviewer HOW you think',
        'Show how you gathered information and formed hypotheses before jumping to solutions',
        'Explain tradeoffs you considered—why you chose approach A over B and C',
        'Highlight collaboration: who else you brought in and why',
        'Include prevention: how you made sure this class of problem doesn\'t recur',
        'Quantify the impact of your solution (revenue saved, time reduced, incidents prevented)',
        'Pick problems with genuine complexity—not just bugs you found by reading stack traces'
      ]
    },
    {
      id: 'star-framework',
      title: 'STAR Framework',
      icon: 'target',
      color: '#8b5cf6',
      questions: 6,
      description: 'The proven method for structuring behavioral answers.',

      introduction: `The STAR method (Situation, Task, Action, Result) is the single most effective framework for answering behavioral interview questions. Every major tech company—Amazon, Google, Meta, Microsoft—evaluates behavioral answers using some form of this structure. Without it, candidates ramble, bury their contributions in team accomplishments, and leave interviewers guessing: "Who is 'we'?", "What was YOUR specific role?", "How much impact did you actually have?"

But STAR is a compass, not a cage. The best candidates internalize the framework so deeply that their answers feel natural and conversational while still hitting every structural element. The goal is to tell a compelling story where the interviewer can clearly identify the challenge, your unique contribution, and the measurable outcome—all in 2-3 minutes.

The most common mistake is spending 60% of the answer on Situation and Task (the setup) and rushing through Action and Result (the payoff). The ideal ratio is roughly 15% Situation, 10% Task, 50% Action, and 25% Result. Your actions are what demonstrate your competency—that's where interviewers are scoring you. The result seals the deal with quantified impact.`,

      keyQuestions: [
        {
          question: 'What does STAR stand for?',
          answer: `**S - Situation (15-20% of answer)**
Set the context. Describe where you worked, your team, and the project nature. Keep details brief but relevant.

Example: "While working as a backend engineer at XYZ Corp, my team was responsible for improving API response times for our e-commerce checkout service."

**T - Task (10-15% of answer)**
Clarify YOUR specific responsibility, not just the team's role. Outline the problem you owned and any constraints.

Example: "My responsibility was identifying API bottlenecks and proposing a scalable solution within two weeks."

**A - Action (50-60% of answer)**
This is the most important part. Showcase YOUR contributions, thought process, and decision-making. Detail your steps sequentially and highlight technical or interpersonal skills.

Example: "I profiled endpoints, identified slow database queries, introduced Redis caching, and coordinated with frontend teams to reduce unnecessary API calls."

**R - Result (15-20% of answer)**
Quantify outcomes whenever possible. Highlight recognition or lessons learned.

Example: "API response time improved by 45%, reducing cart abandonment by 12%. We adopted the approach as a best practice company-wide."`
        },
        {
          question: 'How do I use STAR effectively?',
          answer: `**Key Principles**

STAR is "a compass, not a cage" — it provides guidance rather than rigid constraints.

**The Chef Analogy**: While cooks follow recipes exactly, chefs understand principles and know when to adjust.

**1. Select the Right Story**
Choose examples relevant to the role you're interviewing for.

**2. Tailor Stories for Multiple Questions**
One story can demonstrate several competencies when properly framed.

**3. Keep Situation and Task Short**
Don't spend 80% of your time on context. Get to your Actions quickly.

**4. Make the Action Step Shine**
This is where you demonstrate your value. Be specific about what YOU did.

**5. Quantify Results**
Numbers are memorable and credible. "Improved by 40%" beats "improved significantly."`
        },
        {
          question: 'What are common STAR mistakes?',
          answer: `**Mistake 1: Spending too much time on Situation/Task**
❌ "So let me give you some background... [3 minutes later]"
✅ Set context in 30 seconds, then focus on Actions

**Mistake 2: Using "we" instead of "I"**
❌ "We decided to refactor the system..."
✅ "I proposed refactoring the system, and after getting buy-in from the team..."

**Mistake 3: Forgetting to state the Result**
❌ "...and that's what we did."
✅ "As a result, deployment time decreased from 4 hours to 15 minutes, and the approach was adopted by 3 other teams."

**Mistake 4: Choosing irrelevant examples**
❌ A story about college when you have 10 years of experience
✅ Recent, relevant examples from your professional work

**Mistake 5: Being too vague**
❌ "I communicated effectively with stakeholders"
✅ "I created a weekly status report and held bi-weekly sync meetings with the PM and design teams"`
        },
        {
          question: 'How do I prepare STAR stories before an interview?',
          answer: `**The Story Banking Method**

**Step 1: Inventory Your Experiences (60 minutes)**
List 15-20 significant work experiences: projects, incidents, conflicts, failures, innovations. Don't filter yet—just brainstorm.

**Step 2: Map to Competencies (30 minutes)**
Common competencies tested: leadership, conflict resolution, failure/learning, technical problem-solving, communication, innovation, time management, dealing with ambiguity. Map each story to 2-3 competencies it demonstrates.

**Step 3: Write STAR Outlines (2-3 hours)**
For your top 10 stories, write bullet-point STAR outlines. Don't write scripts—scripts sound rehearsed. Write key points and numbers.

**Step 4: Practice Aloud (1-2 hours)**
Tell each story out loud. Time yourself—aim for 2-3 minutes. Record and listen back for filler words, unclear transitions, and missing details.

**Step 5: Prepare Variants**
Each story should work for multiple questions. Your "led a migration project" story might answer "tell me about leadership," "a technical challenge," or "working with cross-functional teams." Practice pivoting the emphasis.

**Pro Tip**: Keep a running "story bank" document. After every meaningful project, incident, or achievement, jot down a STAR outline while the details are fresh.`
        },
        {
          question: 'How do I handle follow-up questions after giving a STAR answer?',
          answer: `**Follow-Up Question Types and How to Handle Them**

**"Tell me more about..."** (They want depth)
The interviewer is interested in a specific part of your story. Go deeper on that section with additional technical details or context. "Great question. The reason I chose that approach was..."

**"What would you do differently?"** (They want self-awareness)
Show reflection and growth. "Looking back, I would have involved the security team earlier. At the time I didn't realize the compliance implications, which added 2 weeks to the timeline."

**"What was the hardest part?"** (They want to see struggle)
Be honest about challenges. Don't make it sound too easy. "The hardest part was convincing the VP of Product to delay the launch. I had to present the data three different ways before the risk was clear."

**"How did you measure success?"** (They want rigor)
Show you think about outcomes quantitatively. "We measured success across three dimensions: technical (p99 latency under 100ms), business (conversion rate improvement), and operational (on-call pages per week)."

**"What did others think?"** (They want collaboration signal)
Reference specific feedback. "My tech lead later told me that my approach to the post-mortem changed how the team thinks about incident response. The CTO mentioned it in the quarterly all-hands."

**Key Principle**: Follow-ups are where interviewers separate rehearsed answers from genuine experience. If you lived the story, follow-ups are easy. If you inflated it, this is where you'll stumble.`
        }
      ],

      principles: [
        'The 15/10/50/25 ratio: Spend 15% on Situation, 10% on Task, 50% on Action, 25% on Result—Actions are where you demonstrate competency',
        'Use "I" not "we": Every action should clarify YOUR specific contribution, even in team contexts',
        'Quantify everything: "Improved performance by 40%" beats "improved performance significantly" every time',
        'Be a storyteller, not a reporter: Create a narrative arc with tension, decision-making, and resolution',
        'Prepare 10-12 stories that cover all major competencies: leadership, failure, conflict, technical depth, innovation, communication'
      ],

      sampleQuestions: [
        'Tell me about a time when you had to [competency]',
        'Give me an example of [specific situation]',
        'Describe a situation where you [behavior]',
        'Walk me through a project where you [skill]',
        'What would you do if [hypothetical scenario]?'
      ],

      tips: [
        'Practice your stories out loud—they should be 2-3 minutes each',
        'Prepare 10-15 stories that cover different competencies across all categories',
        'Use "I" statements to show YOUR contribution—interviewers are evaluating YOU, not your team',
        'Always quantify results with specific metrics (dollars, percentages, time saved)',
        'Have alternative angles for the same story—one story can answer 3-4 different questions',
        'Time yourself—most candidates go 5+ minutes when they should be at 2-3 minutes',
        'Record yourself and listen back—you\'ll catch filler words and unclear transitions'
      ]
    },
    {
      id: 'story-banking',
      title: 'Story Banking',
      icon: 'folder',
      color: '#06b6d4',
      questions: 5,
      description: 'Build a library of powerful interview stories.',

      introduction: `A Story Bank is your interview preparation document—a curated collection of professional experiences that demonstrate key competencies. Having this prepared is "the single greatest thing you can do to reduce interview anxiety and boost your performance." Instead of trying to think of examples on the spot, you'll have ready-to-use stories for any question.`,

      keyQuestions: [
        {
          question: 'How do I mine stories from my experience?',
          answer: `**The Five-Step Story Mining Process**

**Step 1: Identify Core Competencies**
Understand what employers look for:
• Teamwork & Collaboration
• Problem-Solving
• Communication Skills
• Adaptability & Learning
• Leadership & Initiative
• Handling Failure & Feedback
• Time Management

**Step 2: List Major Career Milestones**
Reflect on key events:
• Significant projects delivered
• Technical challenges overcome
• Leadership opportunities taken
• Conflict or high-pressure situations
• Learning experiences from failures

Don't limit yourself to successes—some of the best STAR answers come from challenging situations that show resilience and growth.

**Step 3: Extract Potential Stories**
For each milestone, answer:
• What was the challenge or opportunity?
• What was your specific role?
• What action did you take?
• What was the outcome?
• Which skills does this demonstrate?

**Step 4: Categorize Stories**
Organize by competency "buckets":
• Teamwork: Coordinating cross-functional teams
• Problem-Solving: Debugging production outages
• Leadership: Proposing and executing improvements
• Adaptability: Learning new tech under tight deadlines
• Failure Handling: Rolling back faulty releases

**Step 5: Make Them STAR-Ready**
• Structure in STAR format
• Include metrics and measurable outcomes
• Keep to 2-3 minutes when spoken
• Identify alternative angles for flexibility`
        },
        {
          question: 'What should I include in each story?',
          answer: `**The STAR+L Template**

For each story, document:

**Story Title**: Create a memorable, short name
Examples: "Legacy System Migration," "Production Outage Post-Mortem," "Cross-Team API Integration"

**Core Competencies**: List 2-3 primary skills demonstrated
Examples: Leadership, Technical Depth, Problem-Solving, Conflict Resolution

**S - Situation**:
• Your role, team, and business context
• What was at stake and why it mattered
• Keep brief: 2-3 sentences

**T - Task**:
• Your specific assignment or goal
• What "success" looked like
• Any constraints (time, resources, etc.)

**A - Action** (most detailed, 3-5 bullets):
• Initial analysis or planning approach
• Key technical decisions with trade-off explanations
• Collaboration and communication steps
• Additional actions showing initiative

**R - Result**:
• Primary quantified outcome with metrics
• Secondary positive outcomes
• Recognition or adoption by others

**L - Learning** (especially for failure stories):
• Key lesson learned
• How it changed your behavior or processes`
        },
        {
          question: 'How many stories do I need?',
          answer: `**Recommended: 10-15 Stories**

Cover these categories:

1. **Technical Achievement**
   A complex technical problem you solved

2. **Leadership/Initiative**
   A time you led without being asked

3. **Conflict Resolution**
   Disagreement with colleague or manager

4. **Failure and Recovery**
   A mistake and what you learned

5. **Cross-team Collaboration**
   Working effectively with other teams

6. **Mentoring/Coaching**
   Helping others grow

7. **Problem-solving Under Pressure**
   Urgent situation requiring quick thinking

8. **Going Above and Beyond**
   Exceeding expectations

**Pro Tip**: Each story should be versatile enough to answer multiple question types. A "conflict resolution" story might also demonstrate "communication skills" and "leadership."`
        }
      ],

      tips: [
        'Store stories in a flexible format (doc, Notion, etc.)',
        'Update your story bank before each interview',
        'Practice telling each story out loud',
        'Get feedback from friends or mentors',
        'Tailor stories to the specific company\'s values'
      ]
    },
    {
      id: 'why-this-company',
      title: 'Why This Company?',
      icon: 'building',
      color: '#ec4899',
      questions: 6,
      description: 'Show genuine interest and research.',

      introduction: `"Why this company?" seems simple but it's a trap for the unprepared. Generic answers—"Great culture," "Interesting problems," "I admire your mission"—signal that you're applying broadly and haven't done real research. Interviewers hear these empty phrases dozens of times per week and immediately discount them.

What interviewers are testing: Have you invested time understanding what makes THIS company different? Can you articulate specific technical challenges, product directions, or cultural values that genuinely excite you? Is there authentic alignment between your career trajectory and what this role offers? The best answers reference something you could only know from real research: a recent engineering blog post, a specific product decision, a team's approach to a technical problem, or an insight from talking to current employees.

A mediocre answer is interchangeable across companies—you could say it at Google, Stripe, or a random startup. A great answer is so specific that it could only apply to THIS company. It connects three threads: something genuine about the company that excites you, something specific about the role that matches your skills, and something about your career direction that makes this the logical next step. When done well, the interviewer thinks, "This person actually gets us."`,

      keyQuestions: [
        {
          question: 'How should I structure my answer?',
          answer: `**The Company, Role, and Me Framework**

**1. Company (What specifically attracts you)**
"I've been following [Company]'s work on [specific product/technology]. Your recent [blog post/launch/initiative] about [specific thing] really resonated with me because..."

**2. Role (Why this particular position)**
"This role is exciting because it combines [skill 1] and [skill 2], which are exactly where I want to grow. I'm particularly interested in [specific responsibility from job description]..."

**3. Me (How your background makes you suited)**
"My experience with [relevant background] has prepared me well for these challenges. At [previous company], I worked on similar problems and would bring [specific value]..."`
        },
        {
          question: 'What research should I do?',
          answer: `**Essential Research Checklist**

**Company Products & Services**
• What do they make/sell/provide?
• Who are their customers?
• What problems do they solve?

**Recent News & Developments**
• Recent funding rounds or acquisitions
• New product launches
• Leadership changes
• Press coverage

**Engineering Blog & Tech Stack**
• What technologies do they use?
• What technical challenges have they solved?
• What's their engineering culture like?

**Company Values & Culture**
• Mission statement
• Core values
• Employee reviews (Glassdoor, Blind)
• Interview experiences

**The Role Specifically**
• Team size and structure
• Key responsibilities
• Growth opportunities
• Reporting structure

**Pro Tip**: Reference something specific you learned in your research. "I read your engineering blog post about migrating to Kubernetes and was impressed by how you handled the database migration challenges."`
        },
        {
          question: 'What should I avoid saying?',
          answer: `**Red Flags to Avoid**

❌ **Generic praise**
"You're a great company with a good culture"
✅ Be specific: "Your commitment to open source, evidenced by [specific project], aligns with my values"

❌ **Money/perks focused**
"I heard the compensation is really good"
✅ Focus on the work: "The technical challenges at your scale are exactly what I'm looking for"

❌ **Using them as a stepping stone**
"This would be great experience for my next role"
✅ Show commitment: "I see this as a place where I can grow long-term"

❌ **Desperation**
"I really need a job right now"
✅ Show selectivity: "I'm being thoughtful about my next role, and this stands out because..."

❌ **Criticizing your current company**
"My current company is terrible"
✅ Focus on the pull: "I'm drawn to the opportunity to work on [specific challenge]"`
        }
      ],

      exampleResponse: `"I've been following Datadog's growth for the past two years, and three things specifically drew me to this role. First, your approach to unified observability—combining metrics, traces, and logs into a single platform—mirrors exactly the philosophy I developed while building our internal monitoring stack at my current company. I read your engineering blog post on how you handle 40 trillion data points per day with sub-second query latency, and the architectural decisions around your custom time-series database are fascinating.

Second, this specific role on the APM team interests me because application performance monitoring is where I've built the deepest expertise. At my current company, I designed our distributed tracing system from scratch—handling 500K spans per second across 200 services. I've experienced firsthand the limitations of stitching together open-source tools, which gives me a real appreciation for what Datadog has built as an integrated product.

Third, I talked to two engineers on the team through a mutual connection, and both mentioned the strong ownership culture—engineers own their features from design through production, including the on-call. That aligns with how I work best. I'm not interested in throwing code over a wall; I want to build something and be accountable for its reliability. The combination of hard technical problems, a product I genuinely admire, and a culture of ownership is why Datadog is my top choice."`,

      principles: [
        'Be specific enough that your answer couldn\'t apply to any other company—reference actual products, blog posts, or technical decisions',
        'Connect three threads: company excitement + role alignment + your career direction',
        'Show you\'ve done real research: engineering blog, recent launches, team structure, tech stack',
        'Demonstrate pull not push: You\'re drawn to this company, not running from your current one',
        'Talk to current employees if possible: "I spoke with [name] on the team and..." is the strongest signal of genuine interest'
      ],

      sampleQuestions: [
        'Why do you want to work here?',
        'Why this company over our competitors?',
        'What do you know about our company?',
        'Why are you interested in this role?',
        'What attracted you to this position?',
        'Why should we hire you over other candidates?',
        'Where do you see yourself contributing here?'
      ],

      tips: [
        'Reference specific products, blog posts, or initiatives you\'ve researched',
        'Connect the company\'s mission to your personal values and career goals',
        'Show you understand their technical challenges—not just their marketing',
        'Demonstrate genuine enthusiasm without being over-the-top or sycophantic',
        'Prepare different angles for different interviewers (recruiter vs. engineer vs. manager)',
        'If you\'ve used their product, share your experience as a user—it shows authentic interest',
        'Mention conversations with current employees if you\'ve had any'
      ]
    },
    {
      id: 'cross-team-collaboration',
      title: 'Cross-Team Collaboration',
      icon: 'users',
      color: '#14b8a6',
      questions: 6,
      description: 'Working effectively across organizational boundaries.',

      introduction: `Modern product development requires engineers to collaborate effectively with Product Managers, UX Designers, QA, and other engineering teams—each with distinct goals and perspectives. These questions assess your ability to work across boundaries, influence without authority, and deliver results through partnership.`,

      keyQuestions: [
        {
          question: 'What do interviewers look for?',
          answer: `**Key Competencies Assessed**

**1. Empathy**
Understanding other teams' goals, constraints, and pressures—not viewing them as obstacles.

**2. Communication**
Translating technical concepts for non-technical audiences and vice versa.

**3. Influence without Authority**
Building consensus and driving decisions when you don't have direct control.

**4. Big-Picture Thinking**
Recognizing how your technical work serves broader business objectives.

**5. Proactiveness**
Establishing communication channels and relationships before problems arise.`
        },
        {
          question: 'How do I structure a collaboration story?',
          answer: `**STAR for Collaboration**

**Situation**: Describe the project and each team's distinct (potentially conflicting) goals
"Our backend team needed to ship a new API, but the mobile team had concerns about battery drain from frequent polling..."

**Task**: Define the shared goal and your specific role in bridging teams
"As the tech lead, I needed to find a solution that worked for both teams while meeting our launch deadline..."

**Action**: Focus on proactive collaboration steps
• Initiating cross-team meetings
• Actively seeking to understand others' constraints
• Translating technical requirements
• Creating shared documentation or processes
• Finding creative compromises

**Result**: Highlight collaboration benefits beyond project completion
• Stronger working relationships
• Reusable processes for future projects
• Improved team dynamics`
        },
        {
          question: 'What mistakes should I avoid?',
          answer: `**Common Collaboration Mistakes**

**"Us vs. Them" Framing**
❌ "The design team didn't understand our technical constraints, so we had to push back..."
✅ "I worked with the design team to find alternatives that met both user experience goals and our technical constraints..."

**Transactional Approach**
❌ "They gave us requirements and we delivered"
✅ "I proactively engaged to understand the 'why' behind requirements, which helped us find better solutions"

**Vague Responses**
❌ "I'm a good collaborator and work well with other teams"
✅ Specific example with clear actions and outcomes

**Taking All Credit**
❌ "I solved the problem between the teams"
✅ "Together, we found a solution that..." while still highlighting YOUR specific contributions`
        }
      ],

      tips: [
        'Show empathy for other teams\' constraints',
        'Demonstrate proactive communication',
        'Highlight how you bridged different perspectives',
        'Quantify the collaborative outcome',
        'Show that relationships improved as a result'
      ]
    },
    {
      id: 'receiving-feedback',
      title: 'Receiving Feedback',
      icon: 'messageCircle',
      color: '#f97316',
      questions: 5,
      description: 'Demonstrate coachability and growth mindset.',

      introduction: `Feedback questions assess whether you're coachable—can you receive criticism constructively, learn from it, and grow? Companies want people who will improve over time, not those who become defensive or dismiss input. A red flag: claiming you've never received critical feedback suggests difficulty accepting growth.`,

      keyQuestions: [
        {
          question: 'What makes someone "coachable"?',
          answer: `**Coachability Signals**

**Open, not Defensive**
Do you listen to understand, or immediately argue?

**Self-Aware, not Arrogant**
Can you acknowledge areas for improvement?

**Proactive, not Passive**
Do you take concrete action on feedback?

**Resilient, not Fragile**
Is feedback constructive input or demoralizing criticism?

**Growth-Oriented**
Do you seek feedback, or avoid it?`
        },
        {
          question: 'How should I structure my answer?',
          answer: `**The Four-Step Framework**

**1. Set the Context**
Describe genuine, substantive feedback you received. Choose real feedback, not humble-brags like "they said I work too hard."

Example: "My manager gave me feedback that my code reviews were too harsh—I was thorough but my comments came across as critical rather than helpful."

**2. Acknowledge Your Initial Reaction**
This distinguishes strong answers. Admit your initial emotional response, then describe choosing to engage professionally.

Example: "Honestly, I was surprised at first. I thought I was being helpful. But I took a day to reflect and realized there was truth in the feedback."

**3. Detail Your Actions**
Show concrete, specific steps you took. This proves you took the feedback seriously.

Example: "I asked for specific examples, studied feedback guides for code reviews, rewrote my comments to focus on questions rather than directives, and asked my manager to monitor my reviews for a month."

**4. Show Positive Outcome**
Explain how your actions improved your work. Mention thanking the feedback-giver.

Example: "Within a month, team members said my reviews were more helpful. I thanked my manager for the feedback—it made me a better mentor. I now apply the same principle when giving any kind of feedback."`
        }
      ],

      tips: [
        'Choose real, substantive feedback',
        'Show emotional intelligence in your reaction',
        'Be specific about actions you took',
        'Demonstrate lasting change',
        'Thank the person who gave feedback'
      ]
    },
    {
      id: 'time-management',
      title: 'Time Management',
      icon: 'clock',
      color: '#6366f1',
      questions: 5,
      description: 'Managing competing priorities and tight deadlines.',

      introduction: `Time management questions assess whether you have a systematic approach to prioritization, or if you just "work harder" when things pile up. Companies want people who can make strategic decisions about where to focus, communicate proactively about constraints, and deliver consistently even under pressure.`,

      keyQuestions: [
        {
          question: 'How do you handle multiple tight deadlines?',
          answer: `**The "Prioritize, Plan, Communicate" Framework**

**1. Prioritize Ruthlessly**
Use frameworks like the Eisenhower Matrix (Urgent vs. Important) to categorize tasks by business impact, not just arrival order.

"When I have competing priorities, I first map them by impact and urgency. A P0 production bug always beats a feature with flexible deadline."

**2. Plan Your Execution**
Employ time-blocking, single-task focus, and detailed scheduling.

"I block focused time in the morning for complex work, save meetings for afternoon, and protect at least 2 hours of uninterrupted coding time daily."

**3. Communicate Proactively**
Keep stakeholders informed about your plan, timelines, and capacity constraints.

"I never silently miss a deadline. If I see a conflict coming, I flag it early with options: 'I can do A by Friday or B by Friday, but not both. Which is higher priority?'"`
        },
        {
          question: 'What do interviewers look for?',
          answer: `**Success Signals**

✅ **Repeatable System**
Not just "I worked late" but a structured approach you can apply consistently

✅ **Strategic Thinking**
Understanding what matters most, not just completing tasks in order received

✅ **Transparency**
Managing expectations proactively, especially about constraints

✅ **Knowing Limits**
Recognizing when to escalate or delegate rather than heroically overcommitting

**Red Flags**

❌ Presenting chaos management as a strength
❌ "First in, first out" without strategic thinking
❌ Focusing on stress levels rather than systems
❌ Trying to do everything yourself`
        }
      ],

      tips: [
        'Describe a specific system you use',
        'Show how you decide what\'s most important',
        'Demonstrate proactive communication',
        'Mention when you\'ve said "no" appropriately',
        'Quantify outcomes when possible'
      ]
    },
    {
      id: 'learning-new-tech',
      title: 'Learning New Technology',
      icon: 'bookOpen',
      color: '#84cc16',
      questions: 4,
      description: 'Show adaptability and self-directed learning.',

      introduction: `Technology evolves constantly, so companies want engineers who can quickly learn and apply new skills. These questions assess whether you're a self-directed learner with a systematic approach, or someone who waits for formal training. The best answers show methodology, hands-on application, and eventual mastery.`,

      keyQuestions: [
        {
          question: 'How should I structure my answer?',
          answer: `**The "Learn, Build, Apply" Framework**

**1. Learn Fundamentals**
Start with official documentation and "Quick Start" guides.

"When I needed to learn Kubernetes, I started with the official docs and the 'Kubernetes Up and Running' book. I focused on core concepts before diving into advanced features."

**2. Build to Understand**
Practice immediately in low-stakes environments.

"I set up a local minikube cluster and deployed a simple app. Making mistakes in a sandbox helped me understand concepts much faster than just reading."

**3. Apply to Projects**
Transfer learning to real work, starting small.

"I volunteered to containerize a non-critical internal tool. This gave me real-world experience while limiting blast radius. I documented my learnings for others."`
        },
        {
          question: 'What do interviewers look for?',
          answer: `**Success Signals**

✅ **Self-Directed Initiative**
Not waiting for formal training—proactively learning

✅ **Systematic Methodology**
A repeatable approach to acquiring new skills

✅ **Hands-On Application**
Building something real, not just reading docs

✅ **Resource Discovery**
Finding good learning materials independently

✅ **Persistence**
Working through obstacles and confusion

✅ **Knowledge Sharing**
Teaching others what you learned

**Red Flags to Avoid**

❌ Outdated examples (learning Java in 2010)
❌ Passive: "My company sent me to training"
❌ Theoretical without practical application
❌ Oversimplified: "I just read the docs"`
        }
      ],

      tips: [
        'Use a recent, relevant example',
        'Show your learning methodology',
        'Mention specific resources used',
        'Demonstrate practical application',
        'Include how you shared knowledge with others'
      ]
    },
    {
      id: 'explaining-technical',
      title: 'Explaining Technical Concepts',
      icon: 'presentationChart',
      color: '#0ea5e9',
      questions: 4,
      description: 'Communicate complex ideas clearly to any audience.',

      introduction: `This question assesses whether you can bridge the gap between technical and non-technical worlds—a crucial skill for senior engineers who must work with product managers, executives, and customers. The best answers show empathy for the audience, use effective analogies, and connect technical details to business outcomes.`,

      keyQuestions: [
        {
          question: 'What\'s the best framework for explaining technical concepts?',
          answer: `**The ABT Method**

**A - Analogy/Metaphor**
Connect complex ideas to everyday experiences.

"I explained our codebase's technical debt like a messy kitchen—you can still cook, but it takes longer and things get lost. Eventually, you need to stop and clean."

**B - Benefit**
Translate features into outcomes the listener cares about.

"Instead of explaining caching implementation, I said: 'This will make pages load in 1 second instead of 5, which means customers won't abandon their carts.'"

**T - Trade-off**
Clearly state costs or constraints.

"This improvement requires 3 weeks of work, during which we'll pause new features. The benefit is long-term stability."`
        },
        {
          question: 'What pitfalls should I avoid?',
          answer: `**Critical Pitfalls**

**1. Condescension**
❌ Patronizing tone that makes non-technical people feel stupid
✅ Respectful explanations that acknowledge their expertise in their domain

**2. Jargon Without Definition**
❌ "The P99 latency is spiking due to GC pauses"
✅ "The slowest 1% of requests are taking too long because of how we manage memory"

**3. Missing the "Why"**
❌ Explaining what you're doing technically
✅ Explaining why they should care (business impact, user impact, risk)

**4. One-Size-Fits-All**
❌ Using the same explanation for everyone
✅ Adapting depth and analogies based on the audience's background`
        }
      ],

      tips: [
        'Know your audience\'s background',
        'Lead with the "why" before the "what"',
        'Use concrete analogies from everyday life',
        'Check for understanding throughout',
        'Practice simplifying complex topics regularly'
      ]
    },
    {
      id: 'what-are-behavioral-interviews',
      title: 'What Are Behavioral Interviews?',
      icon: 'info',
      color: '#6366f1',
      questions: 5,
      description: 'Understanding the purpose and format of behavioral interviews.',

      introduction: `Behavioral interviews are structured conversations where interviewers assess how you've handled real situations in the past. The fundamental premise is that past behavior is the best predictor of future behavior. Unlike technical interviews that test skills, behavioral interviews reveal your soft skills, work style, and cultural fit.`,

      keyQuestions: [
        {
          question: 'What is the purpose of behavioral interviews?',
          answer: `**Core Purpose**

Behavioral interviews help companies answer: "Will this person succeed and thrive here?"

**What They Assess**:
- **Problem-solving approach**: How you tackle challenges
- **Collaboration style**: How you work with others
- **Communication skills**: How clearly you convey ideas
- **Leadership potential**: How you influence and guide
- **Cultural fit**: How your values align with the company
- **Growth mindset**: How you learn from experiences

**Why Past Behavior Matters**:
The premise is that how you handled situations before predicts how you'll handle similar situations in the future. Interviewers want specific examples, not hypotheticals.`
        },
        {
          question: 'What are common myths about behavioral interviews?',
          answer: `**Myth 1: "Just be yourself"**
❌ Reality: Be your BEST self with prepared, polished stories

**Myth 2: "They're just casual conversations"**
❌ Reality: Every question has a specific competency being evaluated

**Myth 3: "Any story will do"**
❌ Reality: Choose stories that highlight the specific skill being asked about

**Myth 4: "Shorter answers are better"**
❌ Reality: Detailed STAR stories (2-3 minutes) show depth of experience

**Myth 5: "Technical skills matter more"**
❌ Reality: Many candidates fail behavioral rounds despite strong technical skills

**Myth 6: "You can wing it"**
❌ Reality: Top performers prepare 8-12 detailed stories in advance`
        },
        {
          question: 'How should I prepare for behavioral interviews?',
          answer: `**4-Week Preparation Plan**

**Week 1: Story Mining**
- Review past 2-3 years of work
- Identify 10-15 significant situations
- Document key details: context, actions, outcomes

**Week 2: Story Development**
- Structure each story using STAR format
- Add specific metrics and details
- Practice telling each in 2-3 minutes

**Week 3: Company Research**
- Study company values and culture
- Map your stories to their competencies
- Prepare company-specific examples

**Week 4: Practice & Refine**
- Mock interviews with peers
- Record yourself and review
- Refine based on feedback`
        }
      ],

      tips: [
        'Prepare 8-12 detailed stories that cover common themes',
        'Each story should be 2-3 minutes with specific details',
        'Practice telling stories out loud, not just in your head',
        'Have backup stories in case your first choice doesn\'t fit',
        'Research the company\'s values before the interview'
      ]
    },
    {
      id: 'handling-follow-ups',
      title: 'Handling Follow-up Questions',
      icon: 'messageCircle',
      color: '#ec4899',
      questions: 4,
      description: 'Navigate deeper probing questions with confidence.',

      introduction: `Follow-up questions are where behavioral interviews get real. Interviewers use them to probe deeper, verify details, and see how you think on your feet. Being prepared for follow-ups separates good candidates from great ones.`,

      keyQuestions: [
        {
          question: 'What types of follow-up questions should I expect?',
          answer: `**Common Follow-up Categories**

**1. Clarification Questions**
"Can you tell me more about your specific role in that project?"
"What exactly did YOU do vs. the team?"

**2. Probing Questions**
"What alternatives did you consider?"
"Why did you choose that approach over others?"

**3. Outcome Questions**
"What happened after that?"
"How did you measure success?"

**4. Learning Questions**
"What would you do differently?"
"What did you learn from this experience?"

**5. Challenge Questions**
"What was the hardest part?"
"How did you handle the pushback?"

**Preparation Tip**: For each story, prepare answers to these 5 categories.`
        },
        {
          question: 'How do I handle unexpected questions?',
          answer: `**The PAUSE Method**

**P - Pause**
Take a breath. 2-3 seconds of silence is fine.

**A - Acknowledge**
"That's a great question" or "Let me think about that..."

**U - Understand**
If unclear, ask for clarification: "When you say X, do you mean...?"

**S - Structure**
Organize your thoughts: "I'll share three key factors..."

**E - Execute**
Deliver your answer confidently

**If You're Truly Stuck**:
"I haven't encountered exactly that situation, but here's a similar experience..."
OR
"I'd approach it by [describe your thinking process]"`
        }
      ],

      tips: [
        'Know your stories deeply - anticipate follow-up angles',
        'It\'s okay to pause and think',
        'Ask for clarification if a question is unclear',
        'Don\'t invent details - admit when you don\'t remember',
        'Turn "I don\'t know" into "Here\'s how I\'d approach it"'
      ]
    },
    {
      id: 'company-change-reason',
      title: 'Why Are You Leaving?',
      icon: 'arrowRightCircle',
      color: '#f97316',
      questions: 3,
      description: 'Explain your career transition positively and professionally.',

      introduction: `"Why are you leaving your current role?" is a delicate question that requires careful framing. Interviewers want to understand your motivations and ensure you won't badmouth employers. The key is to be honest while staying positive and focusing on growth.`,

      keyQuestions: [
        {
          question: 'How do I explain leaving without being negative?',
          answer: `**The Growth Framework**

**DO Focus On**:
✅ Seeking new challenges
✅ Career growth opportunities
✅ Learning new technologies
✅ Bigger scope or impact
✅ Better alignment with goals

**DON'T Mention**:
❌ Bad manager or coworkers
❌ Unfair treatment
❌ Salary issues as primary reason
❌ Company politics
❌ Complaints about workload

**Example Responses**:

"I've learned a lot at [Company], but I'm ready for the next challenge. I'm particularly excited about [new company's] work in [area] because..."

"After 3 years, I've accomplished what I set out to do. I led our team through [achievement], and now I'm looking to apply that experience at a larger scale."

"I'm looking for an opportunity to work more closely with [specific technology/domain], which aligns better with my career goals."`
        },
        {
          question: 'What if I was laid off or fired?',
          answer: `**If Laid Off**:
"Our company went through a restructuring, and my role was eliminated along with [context]. It gave me the opportunity to be more intentional about my next step, and that's why I'm excited about this role."

**If Performance-Related**:
Be honest but focus on learning:
"That role wasn't the right fit for me at the time. I've reflected on that experience and [specific lesson learned]. Since then, I've [demonstrated improvement]."

**Key Principles**:
- Don't lie - it can be verified
- Keep it brief - don't over-explain
- Pivot to the positive - what you learned
- Show growth - how you've improved`
        }
      ],

      tips: [
        'Keep explanations brief - 30 seconds max',
        'Focus on what you\'re moving toward, not away from',
        'Never badmouth previous employers',
        'Have a consistent narrative for your career moves',
        'Connect your reasons to the new opportunity'
      ]
    },
    {
      id: 'proud-project',
      title: 'Most Proud Project',
      icon: 'trophy',
      color: '#eab308',
      questions: 4,
      description: 'Showcase your best work and demonstrate impact.',

      introduction: `"Tell me about a project you're most proud of" is your chance to shine. This question assesses technical depth, ownership, impact, and your ability to articulate complex work. Choose a project where you can demonstrate clear ownership and measurable outcomes.`,

      keyQuestions: [
        {
          question: 'How do I choose the right project?',
          answer: `**Selection Criteria**

**1. Impact & Scale**
Choose projects with measurable business impact:
- Revenue growth
- Cost savings
- User metrics improvement
- Performance gains

**2. Your Ownership**
Pick projects where YOU drove decisions, not just executed tasks.

**3. Technical Depth**
Select projects that showcase your expertise level.

**4. Recent & Relevant**
Ideally from last 2-3 years and related to the role you're applying for.

**5. Good Story Arc**
Projects with challenges, pivots, and learnings make better stories.

**Red Flags to Avoid**:
❌ Projects where you were just a contributor
❌ Classified/NDA projects you can't discuss
❌ Projects that failed without clear learnings
❌ Old projects that don't reflect current abilities`
        },
        {
          question: 'How do I structure the answer?',
          answer: `**The Pride Project Framework**

**1. Context (30 seconds)**
"I led the redesign of our payment processing system which handles $2M in daily transactions."

**2. Challenge (30 seconds)**
"We were experiencing 15% transaction failures due to legacy architecture and needed to maintain 99.99% uptime during migration."

**3. Your Approach (60 seconds)**
- Technical decisions you made
- Trade-offs you considered
- How you collaborated with others

**4. Execution Highlights (30 seconds)**
Key moments, pivots, or creative solutions

**5. Results (30 seconds)**
Specific metrics and business impact:
"Reduced failures to 0.1%, saving $500K annually. The architecture became the template for other teams."

**6. Learnings (15 seconds)**
"I learned that incremental migration with feature flags reduces risk significantly."`
        }
      ],

      tips: [
        'Quantify impact: revenue, users, performance, time saved',
        'Emphasize YOUR decisions and contributions',
        'Include technical details appropriate for your audience',
        'Show collaboration even while highlighting your role',
        'Prepare follow-up details about challenges and trade-offs'
      ]
    },
    {
      id: 'mentoring-coaching',
      title: 'Mentoring & Coaching',
      icon: 'userCheck',
      color: '#14b8a6',
      questions: 4,
      description: 'Show how you develop and support others.',

      introduction: `Mentoring questions assess your ability to develop others—a crucial skill for senior engineers and leaders. Companies want to see that you can transfer knowledge, provide feedback, and help others grow while maintaining productivity.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you mentored someone',
          answer: `**STAR Example**

**Situation**:
"A junior engineer on my team was struggling with system design and her PR reviews were taking multiple iterations."

**Task**:
"As her tech lead, I wanted to help her level up while not creating dependency on me for every decision."

**Action**:
- Set up weekly 1:1s focused on growth, separate from project work
- Created a learning plan targeting specific gaps
- Paired on complex PRs, explaining my thought process
- Gradually shifted from "do this" to "what do you think?"
- Introduced her to relevant resources and communities

**Result**:
"Within 4 months, she was independently designing features and her PR approval rate went from 40% to 90%. She's now mentoring others.

The key was meeting her where she was and progressively increasing autonomy."`
        },
        {
          question: 'How do you balance mentoring with your own work?',
          answer: `**Practical Framework**

**1. Structured Time**
"I block 2-3 hours weekly specifically for mentoring. This prevents it from eating into deep work time."

**2. Asynchronous First**
"I encourage mentees to write down questions and context. This helps them think through problems and makes our sync time more productive."

**3. Teaching to Fish**
"Instead of giving answers, I guide with questions: 'What have you tried? What do you think is happening?' This builds independence."

**4. Group Learning**
"I turn common questions into team knowledge sharing, multiplying impact."

**5. Clear Boundaries**
"I'm available for guidance, but I expect mentees to drive their own learning. I'm a resource, not a crutch."`
        }
      ],

      tips: [
        'Show empathy and patience in your examples',
        'Demonstrate how you adapted to the mentee\'s needs',
        'Quantify growth: promotions, skill improvements, independence',
        'Highlight teaching moments that scaled beyond one person',
        'Show you can give direct feedback constructively'
      ]
    },
    {
      id: 'disagreement-with-manager',
      title: 'Disagreement with Manager',
      icon: 'userMinus',
      color: '#ef4444',
      questions: 3,
      description: 'Navigate hierarchy conflicts professionally.',

      introduction: `Disagreeing with your manager is delicate territory. Interviewers want to see that you can advocate for your position while respecting hierarchy, ultimately committing to decisions even when you disagree. This tests your professionalism, communication, and ability to disagree constructively.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you disagreed with your manager',
          answer: `**STAR Example**

**Situation**:
"My manager wanted to release a feature on an aggressive timeline that I believed would compromise quality and create technical debt."

**Task**:
"I needed to voice my concerns without being insubordinate, while ultimately supporting whatever decision was made."

**Action**:
- Requested a 1:1 to discuss (not in public)
- Came prepared with data: "Here are the specific risks I see..."
- Proposed alternatives: "We could do X first, then Y..."
- Asked questions to understand their perspective
- After discussion, committed: "I understand the business need. Here's how I'll make it work."

**Result**:
"We compromised on a phased approach. We launched a smaller scope on time, then added features in week 2. My manager appreciated that I raised concerns constructively, and we developed a better working relationship.

Key learning: Disagree with data, not emotion. And once decided, commit fully."`
        },
        {
          question: 'What if your manager was clearly wrong?',
          answer: `**The Escalation Framework**

**1. Data Over Opinion**
"I never say 'you're wrong.' I present data: 'I've seen X happen when we do this. Can we discuss?'"

**2. Seek to Understand**
"Maybe they have context I don't. I ask: 'Help me understand the reasoning behind this approach.'"

**3. Propose, Don't Oppose**
"Instead of 'That won't work,' I say 'What if we tried X instead?'"

**4. Document Concerns**
"If I'm overruled on something serious, I document it constructively: 'I want to note the risks I see so we can monitor for them.'"

**5. Commit and Deliver**
"Once decided, I fully commit. Saying 'I told you so' later never helps."

**When to Escalate**:
Only for ethical issues or serious risks. Never for bruised egos.`
        }
      ],

      tips: [
        'Never badmouth your manager in the interview',
        'Show you can disagree AND commit',
        'Emphasize private conversations, not public confrontations',
        'Focus on the issue, not the person',
        'Highlight what you learned about working with different styles'
      ]
    },
    {
      id: 'production-outage',
      title: 'Production Outage Handling',
      icon: 'alertTriangle',
      color: '#dc2626',
      questions: 4,
      description: 'Demonstrate crisis management and problem-solving under pressure.',

      introduction: `Production outages test your technical skills, composure under pressure, and ability to communicate during crisis. Interviewers want to see structured problem-solving, clear communication, and learning from incidents.`,

      keyQuestions: [
        {
          question: 'Walk me through how you handled a production outage',
          answer: `**STAR Example**

**Situation**:
"At 2 AM, our payment service went down, affecting thousands of customers. I was the on-call engineer."

**Task**:
"Restore service immediately while coordinating with stakeholders and documenting for the post-mortem."

**Action**:
**Immediate Response (First 5 minutes)**:
- Acknowledged the alert and joined the incident channel
- Assessed severity and escalated to relevant teams
- Communicated status to stakeholders

**Investigation (Next 15 minutes)**:
- Checked dashboards and recent deployments
- Identified a bad database migration causing deadlocks
- Rolled back the migration

**Resolution (Next 30 minutes)**:
- Verified service recovery
- Monitored for 30 minutes
- Sent all-clear communication

**Follow-up (Next day)**:
- Wrote detailed incident report
- Led post-mortem meeting
- Implemented preventive measures

**Result**:
"Service restored in 50 minutes. We implemented migration testing that caught 3 similar issues in the next quarter."`
        },
        {
          question: 'How do you stay calm during outages?',
          answer: `**Crisis Composure Framework**

**1. Preparation**
"I stay calm because I've prepared: runbooks, monitoring, rollback procedures."

**2. Structure Over Panic**
"I follow a checklist: Acknowledge → Assess → Act → Communicate. Structure replaces panic."

**3. Focus on Solutions**
"I separate 'fix now' from 'blame later.' Post-mortems are for root cause; incidents are for resolution."

**4. Clear Communication**
"I over-communicate during incidents: 'Here's what we know, here's what we're doing, next update in 10 minutes.'"

**5. Know When to Escalate**
"I'm not afraid to pull in help. Getting service back up is more important than solving it alone."`
        }
      ],

      tips: [
        'Have a clear structure for your incident story',
        'Show calm, methodical problem-solving',
        'Highlight communication throughout the incident',
        'Include post-incident learnings and improvements',
        'Demonstrate ownership without throwing others under the bus'
      ]
    },
    {
      id: 'comfort-zone',
      title: 'Working Outside Comfort Zone',
      icon: 'trendingUp',
      color: '#8b5cf6',
      questions: 3,
      description: 'Show adaptability and willingness to grow.',

      introduction: `This question assesses your adaptability, learning agility, and growth mindset. Companies want to hire people who can stretch beyond their current skills and thrive in uncertainty.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you worked outside your comfort zone',
          answer: `**STAR Example**

**Situation**:
"I was a backend engineer when our company needed someone to lead a mobile app initiative. I had zero mobile experience."

**Task**:
"Build and ship a mobile app in 4 months while learning React Native from scratch."

**Action**:
- Acknowledged the gap and created a learning plan
- Spent first 2 weeks on intensive tutorials and small projects
- Found a mentor who had mobile experience
- Started with the simplest features to build confidence
- Asked lots of questions and accepted early code reviews
- Gradually took on more complex features

**Result**:
"We shipped on time. The app reached 50K downloads in the first month. More importantly, I discovered I enjoy mobile development and have since led two more mobile projects.

The key was being humble about what I didn't know while confident in my ability to learn."`
        },
        {
          question: 'How do you approach learning new skills quickly?',
          answer: `**Rapid Learning Framework**

**1. Set Clear Goals**
"I define what 'competent' looks like for this specific need, not mastery."

**2. Learn by Doing**
"I start building immediately. I learn best by hitting real problems, not reading documentation."

**3. Find Mentors**
"I identify someone who knows this well and ask for guidance: 'What would you focus on? What should I avoid?'"

**4. Embrace Discomfort**
"I accept that I'll feel incompetent for a while. That's part of growth."

**5. Ship Something Small**
"I build momentum with quick wins before tackling big challenges."`
        }
      ],

      tips: [
        'Show enthusiasm for learning, not anxiety about gaps',
        'Demonstrate how you structured your learning',
        'Include specific actions you took to upskill',
        'Highlight the outcome and growth achieved',
        'Connect to your broader growth mindset'
      ]
    },
    {
      id: 'missed-deadline',
      title: 'Missing a Deadline',
      icon: 'clock',
      color: '#f59e0b',
      questions: 3,
      description: 'Handle delivery failures with accountability and recovery.',

      introduction: `This question tests your accountability, communication skills, and ability to recover from setbacks. Everyone misses deadlines occasionally—interviewers want to see how you handle it professionally.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you missed a deadline',
          answer: `**STAR Example**

**Situation**:
"I committed to delivering a feature for a product launch, but midway through, we discovered an integration issue that would take an extra week to resolve."

**Task**:
"Communicate the delay, manage stakeholder expectations, and minimize business impact."

**Action**:
- Identified the issue early and assessed realistic timeline
- Immediately communicated to stakeholders: "We've hit an unexpected blocker. Here's the impact and our options."
- Proposed alternatives: partial delivery, workaround, or delay
- Worked with PM to reprioritize and adjust launch plans
- Put in extra effort to minimize delay where possible
- Documented lessons for future estimations

**Result**:
"We delayed by 5 days instead of 7 by finding a workaround for part of the issue. Product adjusted the launch plan, and we hit the new date.

My manager appreciated the early communication—she said it's worse to find out on the deadline day."`
        },
        {
          question: 'How do you prevent missed deadlines?',
          answer: `**Prevention Framework**

**1. Buffer Time**
"I add 20-30% buffer for unknowns. If I estimate 8 days, I communicate 10."

**2. Early Warning System**
"I track progress daily. If I'm falling behind at 30%, I raise the flag immediately."

**3. Scope Negotiation**
"I work with stakeholders to identify what's truly necessary vs. nice-to-have."

**4. Risk Identification**
"I explicitly call out dependencies and risks upfront: 'This assumes the API is ready.'"

**5. Regular Check-ins**
"I proactively update stakeholders weekly, not just when there are problems."`
        }
      ],

      tips: [
        'Show you communicated early, not at the last minute',
        'Demonstrate accountability without making excuses',
        'Include what you did to minimize impact',
        'Highlight systemic improvements you made',
        'Be honest but not self-flagellating'
      ]
    },
    {
      id: 'above-and-beyond',
      title: 'Going Above and Beyond',
      icon: 'rocket',
      color: '#10b981',
      questions: 3,
      description: 'Demonstrate initiative and exceeding expectations.',

      introduction: `This question identifies candidates who don't just meet expectations but actively look for ways to add value. It tests your initiative, ownership mentality, and commitment to excellence.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you went above and beyond',
          answer: `**STAR Example**

**Situation**:
"Our team was launching a major feature, and I noticed our deployment process was error-prone and slow—taking 2 hours per release."

**Task**:
"This wasn't my responsibility, but I saw an opportunity to significantly improve our velocity."

**Action**:
- Analyzed the current deployment pipeline on my own time
- Prototyped an automated solution using existing tools
- Presented the proposal to my manager with clear ROI
- Led the implementation, coordinating with DevOps
- Created documentation and trained the team

**Result**:
"Reduced deployment time from 2 hours to 15 minutes. We went from releasing weekly to daily. The solution was adopted by other teams, and I received a spot bonus for the initiative.

Key insight: I didn't wait to be asked. I saw a problem and took ownership."`
        },
        {
          question: 'How do you identify opportunities to add extra value?',
          answer: `**Value-Finding Framework**

**1. Pain Point Radar**
"I constantly notice: 'What's slowing us down? What do people complain about?'"

**2. User Perspective**
"I think: 'What would make our users' lives better that we're not doing?'"

**3. Efficiency Lens**
"I ask: 'Where are we doing manual work that could be automated?'"

**4. Quality Focus**
"I consider: 'What shortcuts are we taking that will hurt us later?'"

**5. Business Awareness**
"I stay aware of company goals and look for alignment opportunities."`
        }
      ],

      tips: [
        'Choose examples where you initiated, not just responded',
        'Show impact beyond your job description',
        'Quantify the extra value you created',
        'Demonstrate how you balanced this with core responsibilities',
        'Connect your initiative to broader team or company goals'
      ]
    },
    {
      id: 'giving-feedback',
      title: 'Giving Constructive Feedback',
      icon: 'messageSquare',
      color: '#06b6d4',
      questions: 4,
      description: 'Provide feedback that helps others grow.',

      introduction: `Giving feedback is a crucial skill that many people avoid. Interviewers want to see that you can provide direct, constructive feedback that helps colleagues improve while maintaining positive relationships.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you gave difficult feedback',
          answer: `**STAR Example**

**Situation**:
"A peer engineer was consistently shipping code with bugs that were caught in production. It was affecting team velocity and his reputation."

**Task**:
"Provide feedback that would help him improve without damaging our working relationship."

**Action**:
- Requested a private conversation
- Started with genuine positives: "Your architecture designs are strong..."
- Shared specific observations: "In the last sprint, we had 3 bugs from your PRs that reached production..."
- Made it about outcomes, not character: "This is creating extra work and affecting our metrics"
- Asked for their perspective: "What do you think is contributing to this?"
- Collaboratively identified solutions: additional testing, pairing, smaller PRs
- Offered support: "I'm happy to do more thorough code reviews if helpful"

**Result**:
"His defect rate dropped by 80% over the next month. He thanked me later for being direct—he hadn't realized the pattern. We have a stronger relationship now because of that honest conversation."`
        },
        {
          question: 'What framework do you use for giving feedback?',
          answer: `**SBI Framework (Situation-Behavior-Impact)**

**1. Situation**
"In yesterday's meeting with the client..."

**2. Behavior** (Observable, not judgmental)
"You interrupted them several times and didn't let them finish their points..."

**3. Impact** (Effect, not accusation)
"This made them seem frustrated, and they mentioned it to me afterward."

**Key Principles**:
✅ Timely: Give feedback close to the event
✅ Specific: Cite concrete examples
✅ Private: Never in front of others
✅ Balanced: Include positives when genuine
✅ Actionable: Suggest specific improvements
✅ Curious: Ask for their perspective`
        }
      ],

      tips: [
        'Show you gave feedback privately, not publicly',
        'Demonstrate empathy while being direct',
        'Focus on behavior and impact, not personality',
        'Include how you followed up',
        'Show the positive outcome of the feedback'
      ]
    },
    {
      id: 'colleague-description',
      title: 'How Would Colleagues Describe You?',
      icon: 'users',
      color: '#8b5cf6',
      questions: 3,
      description: 'Self-awareness backed by real peer feedback.',

      introduction: `This question tests self-awareness and whether you understand how others perceive you. Interviewers want concrete examples and specific feedback you've received, not generic adjectives.`,

      keyQuestions: [
        {
          question: 'How should I answer this question?',
          answer: `**What Interviewers Look For**:
- Self-awareness backed by real feedback, not empty adjectives
- Balance of technical excellence and interpersonal impact
- Specific examples—how your behaviour helps the team
- Humility and openness to grow

**Sample Response**:
"My peers would say I'm the engineer who 'keeps calm and de-risks chaos.' I'm known for translating complex problems into clear action plans, jumping into on-call rotations even when it isn't my week, and coaching newer devs through their first production deploys.

They often mention my habit of pairing over Slack huddles to unblock PRs quickly and my concise post-mortem write-ups that turn incidents into reusable runbooks.

In 360° reviews, the words that pop up most are dependable, pragmatic, and collaborative."`
        },
        {
          question: 'What specific feedback have you received from managers?',
          answer: `**How to Structure This**:

Reference actual performance reviews or 1:1 feedback:

**Sample Response**:
"In my last review, my manager highlighted three things: First, my ability to own complex technical problems end-to-end—she specifically mentioned how I drove our database migration while keeping stakeholders informed at every step.

Second, she noted that I'm the go-to person for unblocking teammates. I regularly get Slack messages asking for debugging help or code review guidance.

The constructive feedback was around delegation—I sometimes take on too much myself instead of distributing work. I've been working on this by identifying tasks that would help junior engineers grow and explicitly offering them those opportunities."`
        },
        {
          question: 'What would your teammates say is your biggest contribution?',
          answer: `**Focus on Team Impact**:

**Sample Response**:
"My teammates would probably mention the internal tools I built that saved everyone time. I noticed our team spent hours each week on repetitive deployment tasks, so I created a CLI tool that automated our most common operations.

They'd also mention code reviews—I'm known for thorough but constructive feedback. Several engineers have told me my reviews helped them level up their coding practices.

Beyond technical work, they'd say I'm someone who keeps team morale up during crunch times. I try to acknowledge everyone's contributions and make sure we celebrate wins together."`
        }
      ],

      tips: [
        'Reference actual feedback from reviews or peers',
        'Balance technical and interpersonal qualities',
        'Give specific behavioral examples',
        'Show humility—acknowledge areas for growth'
      ]
    },
    {
      id: 'strengths-weaknesses',
      title: 'Strengths & Weaknesses',
      icon: 'scale',
      color: '#f59e0b',
      questions: 4,
      description: 'Authentic self-assessment with growth mindset.',

      introduction: `This classic question tests your self-awareness and growth mindset. Avoid clichés and humble-brags. Show genuine reflection and concrete improvement plans.`,

      keyQuestions: [
        {
          question: 'How do I discuss strengths authentically?',
          answer: `**What Interviewers Look For**:
- Genuine self-awareness—no clichés or humble-brags
- Strength directly relevant to the role with evidence
- Specific examples that demonstrate the strength

**Sample Response**:
"My greatest strength is translating complex distributed-systems issues into clear, decisive action—whether that's white-boarding a fix during an incident or writing concise design docs that unblock cross-team work.

For example, last quarter we had a cascading failure that took down three services. I quickly identified the root cause, coordinated the response across teams, and had us back online in 20 minutes. My post-incident write-up became a template for the team."`
        },
        {
          question: 'How do I discuss weaknesses without hurting my chances?',
          answer: `**The Right Approach**:
- Pick a real weakness, not a humble-brag like "I work too hard"
- Choose something non-fatal to the role
- Show concrete improvement steps you're taking

**Sample Response**:
"The flip side is that I can be impatient with ambiguous priorities; if goals aren't well defined, I tend to over-clarify on my own rather than involving the team.

To improve, I now open every sprint with a 10-minute 'definition of done' check and keep a living RFC so the whole team shapes scope together—reducing churn and harnessing everyone's context, not just mine.

My manager has noticed the improvement, and it's helped our planning become more collaborative."`
        },
        {
          question: 'What are examples of good vs bad weakness answers?',
          answer: `**Bad Answers** (Don't Say These):
❌ "I'm a perfectionist" — overused, sounds fake
❌ "I work too hard" — obvious humble-brag
❌ "I don't have any weaknesses" — lacks self-awareness
❌ "I'm bad at [core job skill]" — disqualifying

**Good Answers** (Authentic + Improvable):
✅ "I sometimes struggle to say no to requests, which can lead to overcommitment. I now use a priority matrix and discuss trade-offs with my manager."

✅ "I tend to dive into coding before fully designing the solution. I've started writing brief design docs even for small features."

✅ "Public speaking used to make me nervous. I've been practicing by presenting at team meetings and recently led my first all-hands demo."

✅ "I can be too direct in code reviews. I've learned to balance critical feedback with acknowledgment of what's working well."`
        }
      ],

      tips: [
        'Choose a strength relevant to the role',
        'Pick a real weakness, not a humble-brag',
        'Show concrete steps you take to improve',
        'Demonstrate self-awareness and growth'
      ]
    },
    {
      id: 'disagree-senior-engineer',
      title: 'Disagreeing with Senior Engineers',
      icon: 'gitBranch',
      color: '#ef4444',
      questions: 3,
      description: 'Challenge senior views with data and diplomacy.',

      introduction: `Disagreeing with someone more senior is one of the most nuanced interpersonal challenges in engineering. Interviewers ask this to assess whether you have the technical confidence to challenge ideas on merit, the emotional intelligence to do it without damaging relationships, and the humility to accept when the senior person was right.

The key tension: companies want engineers who push back when they see problems (not yes-people), but they also want people who can navigate hierarchy respectfully. A mediocre answer either sounds like you just went along with the senior person ("they were more experienced so I deferred") or like you were combative ("I proved them wrong"). A great answer shows you engaged with their reasoning, brought data to the conversation, and found a path that improved the outcome for everyone.`,

      keyQuestions: [
        {
          question: 'How do I disagree with senior engineers effectively?',
          answer: `**What Interviewers Look For**:
- Confidently challenge senior views when data warrants it
- Back proposals with metrics, design docs, and prototypes
- Listen first; collaborate over winning arguments
- Use structured processes (ADRs, RFCs) for closure
- Prioritise customer/business impact over personal victory

**STAR Example**:

**Situation**: "Principal engineer wanted to hard-fork our API gateway, doubling upkeep and threatening compliance deadlines."

**Task**: "Win support for a shared-gateway upgrade without slipping the release."

**Action**:
- Benchmarked latency, modelled cost
- Authored an ADR comparing options
- Demoed a plugin POC
- Facilitated a governance vote with all voices heard

**Result**: "Shared gateway chosen 7–2; launch on time; £140k yearly infra savings; 40% less future duplication; stronger partnership with the principal engineer."`
        },
        {
          question: 'What if the senior engineer turns out to be right?',
          answer: `**Handling Being Wrong Gracefully**:

The best answer shows you disagreed thoughtfully, but when evidence favored their approach, you committed fully and learned from it.

**Example**: "I pushed for event-driven architecture over the staff engineer's preference for a simple polling approach. We agreed to prototype both. The polling approach turned out to be 3x simpler to operate and performed well within our scale needs. I acknowledged I was over-engineering and said so publicly in the team retro. The staff engineer appreciated that I'd challenged the decision constructively—even though I was wrong, the process of evaluating both options gave the team more confidence in the final choice."

**Key Principles**:
- Acknowledge when you're wrong clearly and promptly
- Express what you learned from the experience
- Show that the disagreement process itself added value
- Never frame being wrong as the senior person "pulling rank"`
        },
        {
          question: 'How do I build the credibility to challenge senior people?',
          answer: `**Building Credibility for Productive Disagreement**:

**1. Do Your Homework**
Before challenging, understand their reasoning. Ask: "Can you help me understand the thinking behind X?" You may discover context that changes your mind.

**2. Start with Small Wins**
Build a track record of good technical judgment before tackling a major disagreement. Propose improvements to small decisions first.

**3. Use Structured Formats**
Write an RFC or ADR that presents both options objectively. This shifts the conversation from personalities to evidence.

**4. Pick Your Battles**
Don't disagree on everything. Challenge decisions with real impact—architecture, security, data model choices. Let style preferences go.

**5. Propose, Don't Just Oppose**
"What if we tried X?" is more credible than "Y is wrong." Come with a concrete alternative, not just criticism.

**6. Build Relationships Outside of Conflict**
If the only time you interact with senior engineers is when you disagree, you'll be seen as adversarial. Invest in the relationship through pairing, knowledge sharing, and genuine curiosity about their expertise.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you disagreed with a more senior engineer',
        'How do you handle pushback from someone with more experience?',
        'Describe a time you challenged a technical decision made by leadership',
        'Tell me about a time you were right and a senior colleague was wrong',
        'How do you build influence as a less senior engineer?'
      ],

      tips: [
        'Lead with data, not opinion—benchmarks, prototypes, and metrics are your allies',
        'Use structured decision-making (ADRs, RFCs) to depersonalize the disagreement',
        'Show respect and collaboration throughout—never frame it as "winning" vs. them',
        'Focus on outcomes, not winning the argument—the goal is the best decision for the team',
        'Include stories where you were wrong too—it shows intellectual humility'
      ]
    },
    {
      id: 'incomplete-information',
      title: 'Decisions with Incomplete Information',
      icon: 'helpCircle',
      color: '#06b6d4',
      questions: 3,
      description: 'Make high-stakes calls when data is limited.',

      introduction: `Engineering decisions rarely wait for perfect data. Interviewers ask this question to assess whether you can act decisively under uncertainty—or whether you freeze until you have 100% confidence (which never comes). This maps directly to Amazon's "Bias for Action" and Google's ability to "Navigate Ambiguity."

The best answers show a structured approach: what information did you gather quickly, what assumptions did you make (and state explicitly), how did you reduce risk through reversibility, and what was the outcome? A mediocre answer describes guessing. A great answer describes calculated risk-taking with explicit guardrails.`,

      keyQuestions: [
        {
          question: 'How do I make decisions with incomplete data?',
          answer: `**What Interviewers Look For**:
- Comfort making high-stakes calls with incomplete data
- Structured risk assessment and fast feedback loops
- Use of confidence-boosting mechanisms (experiments, feature flags)
- Accountability for the outcome

**STAR Example**:

**Situation**: "At a HealthTech start-up we had to pick a sharding key for a multi-region database launch, but only 30 days of patchy query data."

**Task**: "Decide within 24h so the schema freeze could proceed on schedule."

**Action**:
- Sampled 5% of logs, ran entropy analysis
- White-boarded options with SREs
- Chose user-ID hash sharding under a gradual feature flag

**Result**: "Migration hit the deadline; p99 read latency stayed at 99.97%; no hot partitions after six months, validating the call."`
        },
        {
          question: 'How do I reduce risk when making uncertain decisions?',
          answer: `**Risk Reduction Toolkit**:

**1. Make Decisions Reversible**
"Whenever possible, I choose the option that's easiest to undo. Feature flags, A/B tests, and staged rollouts let you decide fast because the cost of being wrong is low."

**2. State Your Assumptions**
"I write down what I'm assuming to be true. This makes it easy to validate later and helps others challenge my reasoning constructively."

**3. Set Kill Criteria**
"Before committing, I define what failure looks like: 'If metric X drops below Y within 48 hours, we roll back.' This removes emotion from the reversal decision."

**4. Time-Box Investigation**
"I give myself a fixed window for research. 'I'll spend 4 hours gathering data, then decide with whatever I have.' Without a deadline, analysis paralysis wins."

**5. Seek Diverse Input Quickly**
"A 15-minute conversation with someone who has relevant experience is worth more than 3 hours of solo research."`
        },
        {
          question: 'What if your decision under uncertainty turns out to be wrong?',
          answer: `**Handling Wrong Calls Gracefully**:

**The Ideal Response When You Were Wrong**:
1. Detect quickly (monitoring, metrics, user feedback)
2. Acknowledge openly: "The data shows X isn't working as expected"
3. Pivot fast: Execute the rollback plan you prepared
4. Learn and share: "Here's what we assumed, here's what was different, here's how we'll validate better next time"

**Example**: "I chose to migrate our search service to a new database based on benchmark data from a smaller dataset. At production scale, write amplification was 3x worse than expected. I detected it within 2 hours through our monitoring, rolled back to the old database using the migration bridge I'd built, and scheduled a proper load test with production-scale data. The rollback cost us 1 day; not having the bridge would have cost us 2 weeks."

**Key Insight**: The quality of the decision isn't just about the outcome—it's about the process. A well-reasoned decision that turns out wrong is better than a lucky guess that happens to be right. Interviewers assess your process, not just your results.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you had to make a decision without all the information',
        'How do you handle ambiguity in your work?',
        'Describe a time you had to act quickly without perfect data',
        'Tell me about a calculated risk you took at work',
        'How do you balance analysis with action?'
      ],

      tips: [
        'Show structured thinking even with limited data—frameworks beat gut feelings',
        'Use experiments and feature flags to make decisions reversible',
        'Take accountability for outcomes regardless of whether you were right or wrong',
        'Document assumptions explicitly so they can be validated later',
        'Demonstrate that you can distinguish between one-way and two-way door decisions'
      ]
    },
    {
      id: 'tight-deadlines',
      title: 'Delivering Under Tight Deadlines',
      icon: 'zap',
      color: '#f97316',
      questions: 3,
      description: 'Meet immovable deadlines through prioritization.',

      introduction: `Every engineer faces immovable deadlines—regulatory compliance dates, Black Friday launches, contractual commitments. This question tests whether you can deliver quality work under pressure through disciplined prioritization, or whether you just "work longer hours" (which is a red flag, not a strength).

Interviewers want to see ruthless scope management, early risk identification, clear stakeholder communication, and the judgment to cut the right things. A great answer shows you delivered something excellent under pressure—not by cutting corners, but by focusing effort on what truly mattered.`,

      keyQuestions: [
        {
          question: 'How do I deliver effectively under tight deadlines?',
          answer: `**What Interviewers Look For**:
- Ruthless prioritisation and milestone tracking
- Early risk spotting, scope control, and fallback planning
- Rapid feedback loops (feature flags, load tests)
- Clear, concise stakeholder communication

**STAR Example**:

**Situation**: "Six weeks before Black Friday, marketing requested a homepage recommendation engine."

**Task**: "Lead a two-engineer squad to deliver the feature—without downtime—before traffic spiked."

**Action**:
- Broke work into weekly milestones
- Picked a managed vector DB to skip ops overhead
- Gated rollout with feature flags
- Ran nightly load tests
- Enforced scope via a MoSCoW list

**Result**: "Launched two days early; CTR rose 18%, adding £1.2M in Black-Friday revenue; team won the company's 'Hack-to-Prod' award."`
        },
        {
          question: 'How do I decide what to cut when time is tight?',
          answer: `**Scope Reduction Under Pressure**:

**The MoSCoW Method**:
- **Must have**: Core functionality that makes the feature useful at all
- **Should have**: Important but the feature works without them
- **Could have**: Nice-to-have enhancements
- **Won't have**: Explicitly deferred to a future release

**Decision Criteria**:
1. Does cutting this break the core user journey? → Must have
2. Will users notice it's missing on day 1? → Should have
3. Would this make power users happy? → Could have
4. Is this aspirational? → Won't have

**Example**: "For the recommendation engine, must-haves were personalized results and click tracking. Should-haves were A/B testing infrastructure and admin controls. Could-haves were ML model retraining pipeline and collaborative filtering. We shipped must-haves + should-haves and deferred the rest to Q1."

**Key**: Always make the trade-offs visible to stakeholders: "We can ship A+B by the deadline, or A+B+C two weeks later. Which do you prefer?"`
        },
        {
          question: 'How do you prevent deadline pressure from creating tech debt?',
          answer: `**Deadline Quality Framework**:

**Non-Negotiables Under Pressure**:
- Security and data integrity (never compromise)
- Core happy-path testing (at minimum)
- Monitoring and rollback capability
- Documentation of what was deferred and why

**Negotiable Under Pressure**:
- Edge case handling (can be added post-launch)
- Performance optimization beyond "good enough"
- UI polish and animations
- Admin tooling

**The Debt Ticket Strategy**: For every shortcut taken, immediately create a ticket with:
- What was deferred
- Why it matters
- Estimated effort to fix
- Suggested timeline

This ensures tech debt is visible, prioritizable, and not forgotten. "I shipped under deadline but also created 5 debt tickets that were scheduled into the next two sprints."

**Red Flag**: "I just worked weekends." This signals poor planning, not good time management.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you delivered under a tight deadline',
        'How do you handle unrealistic timelines?',
        'Describe a time you had to cut scope to meet a deadline',
        'How do you manage pressure during crunch periods?',
        'Tell me about a time you had to push back on a timeline'
      ],

      tips: [
        'Break work into clear daily/weekly milestones with measurable checkpoints',
        'Cut scope ruthlessly—focus on must-haves and defer nice-to-haves explicitly',
        'Use feature flags and automated testing to ship with confidence',
        'Communicate progress and risks early—never surprise stakeholders at the deadline',
        'Show discipline, not heroism—working 80-hour weeks is a red flag, not a badge of honor'
      ]
    },
    {
      id: 'speed-vs-quality',
      title: 'Speed vs Quality Trade-offs',
      icon: 'scale',
      color: '#eab308',
      questions: 3,
      description: 'Balance delivery speed with long-term quality.',

      introduction: `The speed-versus-quality tension is fundamental to software engineering, and interviewers ask this to see if you understand it with nuance. The wrong answer is "quality always comes first" (you'll never ship) or "speed always wins" (you'll create unmaintainable systems). The right answer shows you can evaluate the context and make the appropriate trade-off.

Different situations demand different trade-offs: a startup racing to product-market fit needs speed; a banking system needs correctness; a feature experiment needs speed with easy rollback; a data migration needs extreme care. Interviewers want to see that you can read the context and calibrate your approach accordingly.`,

      keyQuestions: [
        {
          question: 'How do I balance speed and quality?',
          answer: `**What Interviewers Look For**:
- Clear view of speed-vs-quality tension
- Customer-first mindset with long-term safeguards
- Mechanisms to retire tech debt (backlogs, flags, refactors)
- Transparent stakeholder communication on risks

**STAR Example**:

**Situation**: "Enterprise client needed a payment API live in 3 weeks, but our platform lacked full audit logging for compliance."

**Task**: "Ship MVP on time without creating brittle tech or compliance risk."

**Action**:
- Delivered core API behind a feature flag
- Stubbed audit events to S3
- Documented debt and booked a follow-up sprint
- Aligned client on roadmap

**Result**: "Launched in 18 days, securing a £1.6M contract; full audit logging rolled out six weeks later with zero downtime and 100% customer retention."`
        },
        {
          question: 'When is it acceptable to take on tech debt?',
          answer: `**Acceptable Tech Debt Situations**:

**1. Time-Sensitive Opportunities**
Revenue-critical deadlines, competitive windows, regulatory dates. "The deal closes in 3 weeks—ship MVP now, harden later."

**2. Experiments and Validation**
Unproven features that may be scrapped. "We're testing a hypothesis. If users don't engage, we'll throw this away, so over-engineering it wastes effort."

**3. Prototype-to-Production Transition**
Shipping a working prototype while planning the production version. "The prototype proves the concept; the production version gets the full engineering treatment."

**Unacceptable Tech Debt**:
- Security shortcuts (authentication, authorization, data encryption)
- Data integrity compromises (no backups, no validation)
- Invisible debt with no tracking (shortcuts without tickets)
- Debt on top of existing debt ("we'll fix it later" for the 5th time)

**The Golden Rule**: Every piece of tech debt should have a ticket, an owner, and a timeline. Debt without tracking is not a trade-off—it's negligence.`
        },
        {
          question: 'How do you communicate speed/quality trade-offs to stakeholders?',
          answer: `**Stakeholder Communication Framework**:

**1. Present Options, Not Excuses**
"We can ship in 2 weeks with X quality, or 4 weeks with Y quality. Here's what's different..."

**2. Quantify the Risk**
"Shipping without load testing means a 30% chance of performance issues under peak traffic, which could affect 50K users."

**3. Make Debt Visible**
"If we ship fast, we're taking on these 3 specific pieces of tech debt. Here's the estimated cost to fix them later: 2 sprint weeks."

**4. Propose a Follow-Up Plan**
"I recommend shipping the MVP by the deadline, then dedicating the next sprint to hardening. Here's the specific plan..."

**5. Get Agreement in Writing**
"Let's document that we're choosing speed here, with a commitment to address items X, Y, Z by [date]."

**Key Insight**: Stakeholders can't make good decisions without visibility into trade-offs. Your job isn't to decide for them—it's to make the trade-off clear enough that the decision is obvious.`
        }
      ],

      sampleQuestions: [
        'How do you balance speed and quality in your work?',
        'Tell me about a time you chose speed over quality (or vice versa)',
        'How do you handle pressure to ship before something is ready?',
        'Describe a time you took on technical debt deliberately',
        'How do you communicate engineering trade-offs to non-technical stakeholders?'
      ],

      tips: [
        'Document trade-offs explicitly—verbal agreements are forgotten',
        'Plan to address debt—don\'t just accumulate it without a repayment plan',
        'Use feature flags for controlled rollouts that limit blast radius',
        'Communicate risks transparently to stakeholders with quantified impact',
        'Show nuance: neither "always fast" nor "always perfect" is the right answer'
      ]
    },
    {
      id: 'recovering-behind',
      title: 'Recovering from Falling Behind',
      icon: 'refreshCw',
      color: '#ef4444',
      questions: 3,
      description: 'Detect schedule drift early and recover.',

      introduction: `Every project falls behind at some point. What separates strong engineers from weak ones isn't avoiding delays—it's detecting them early and recovering strategically. Interviewers ask this to see if you have the self-awareness to recognize problems, the courage to surface them early, and the tactical skills to get back on track.

The worst answer: "I just worked harder and caught up." That signals poor planning and unsustainable practices. A great answer shows systematic detection ("burndown showed we were 30% behind at the midpoint"), proactive escalation ("I flagged it to leadership with three recovery options"), and strategic recovery ("we trimmed scope, parallelized work, and hit the hard deadline without cutting compliance requirements").`,

      keyQuestions: [
        {
          question: 'How do I recover when falling behind schedule?',
          answer: `**What Interviewers Look For**:
- Fast, data-driven detection of schedule drift
- Courage to surface problems early
- Escalation with impact and recovery options
- Focus on solution, not blame

**STAR Example**:

**Situation**: "A GDPR data-deletion service was 30% behind sprint burndown halfway to launch, risking regulatory fines."

**Task**: "Flag the slip early and restore the timeline without cutting compliance corners."

**Action**:
- Posted a risk ticket with metrics to exec Slack
- Held a 15-min triage
- Trimmed nice-to-haves
- Added a part-time SRE
- Split load-test work to run in parallel

**Result**: "Caught up in nine days, shipped on the original date, passed the external audit, and avoided £500k potential penalties."`
        },
        {
          question: 'How do I detect schedule drift early?',
          answer: `**Early Warning Systems**:

**1. Weekly Progress Checkpoints**
"I compare actual progress against the plan every Friday. If we're more than 15% behind, I raise it immediately rather than hoping to catch up."

**2. Leading Indicators**
Watch for:
- PRs taking longer to review than expected
- Scope creep in individual tasks ("this was supposed to be 2 points")
- Blocked work items piling up
- Team velocity declining sprint-over-sprint

**3. The 80% Rule**
"If we haven't completed 80% of the work by the 50% time mark, we're behind. Simple math, but most people don't check."

**4. Daily Standups That Actually Work**
"I ask: 'What's blocking you?' and 'Are you on track for your Friday target?' rather than 'What did you do yesterday?'"

**Key Insight**: The earlier you detect drift, the cheaper it is to fix. A 10% slip at week 2 is easy to recover; the same slip discovered at week 5 is a crisis.`
        },
        {
          question: 'How do I escalate schedule problems without looking bad?',
          answer: `**Escalation Framework**:

**1. Come with Data and Options**
Never just say "we're behind." Say: "We're 20% behind due to [specific cause]. Here are three options to recover: [A, B, C] with their trade-offs."

**2. Frame It as Risk Management**
"I'm flagging this now so we have maximum time to course-correct. Waiting another week would limit our options."

**3. Own the Problem**
"I should have caught this earlier" is a stronger opening than "The requirements changed."

**4. Propose Your Recommendation**
"I recommend Option B because it preserves the core deliverable while deferring non-critical features. Here's the revised timeline."

**5. Follow Through**
After escalating, provide daily progress updates until you're back on track. This builds confidence that the recovery is real.

**Key Insight**: Leaders value engineers who surface problems early. Nobody gets fired for flagging a risk at week 2. People get fired for hiding a problem that blows up at week 6.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time your project fell behind schedule',
        'How do you handle situations where you realize you can\'t meet a deadline?',
        'Describe a time you had to recover a struggling project',
        'How do you communicate delays to stakeholders?',
        'Tell me about a time you had to re-plan a project mid-stream'
      ],

      tips: [
        'Detect problems early with data—don\'t wait for the deadline to discover you\'re behind',
        'Escalate with solutions, not just problems—always bring recovery options',
        'Protect critical scope—cut nice-to-haves before compromising on must-haves',
        'Parallelize work where possible to compress the remaining timeline',
        'Show the lesson: what process changes did you make to prevent future drift?'
      ]
    },
    {
      id: 'building-trust',
      title: 'Building Trust with Skeptics',
      icon: 'shield',
      color: '#10b981',
      questions: 3,
      description: 'Win over skeptical stakeholders through consistency.',

      introduction: `Building trust is foundational to career growth, cross-functional effectiveness, and leadership. Interviewers ask this to see whether you can earn credibility through actions rather than words—especially with people who are initially skeptical (new managers, cross-functional partners, acquired teams, resistant stakeholders).

The core of trust-building is consistency: doing what you say you'll do, communicating transparently, and delivering results. The best answers show a specific relationship that started with skepticism and ended with advocacy, with concrete actions you took to bridge the gap.`,

      keyQuestions: [
        {
          question: 'How do I build trust with skeptical stakeholders?',
          answer: `**What Interviewers Look For**:
- Empathy to understand stakeholder concerns
- Consistent, transparent communication
- Data-backed progress updates
- Follow-through on small promises

**STAR Example**:

**Situation**: "A newly hired VP of Sales doubted engineering could deliver a real-time CRM integration promised to a £2M prospect in six weeks."

**Task**: "Earn the VP's trust and keep the deal on track."

**Action**:
- Held a 30-min kickoff to capture 'must-haves'
- Set up a public Jira dashboard and daily Slack digest
- Delivered a working webhook POC in week 2
- Invited the VP to sprint demos
- Openly flagged risks with mitigation plans

**Result**: "Skepticism turned to advocacy—VP green-lit scope freeze, the prospect signed on schedule, and the same transparency template became standard for future cross-org projects."`
        },
        {
          question: 'How do I rebuild trust after it\'s been broken?',
          answer: `**Trust Repair Framework**:

**1. Acknowledge the Break**
"I know the last release didn't go well, and I understand why you're concerned about this one." Don't minimize or explain away.

**2. Take Concrete Action**
Words don't rebuild trust—actions do. "Instead of just promising it'll be better, I implemented automated regression tests and invited you to review the test results before each release."

**3. Over-Deliver on Small Commitments**
"I started by making and keeping small promises: 'I'll have the status update by 3 PM.' Consistency on small things rebuilds confidence for big things."

**4. Invite Scrutiny**
"I set up a shared dashboard so you can see our progress in real-time. No more 'trust me, it's on track.'"

**5. Be Patient**
Trust breaks in a moment and rebuilds slowly. Expect 2-3 successful deliveries before skepticism fully fades.

**Key Insight**: The most trustworthy engineers aren't the ones who never fail—they're the ones who communicate honestly, own their mistakes, and consistently follow through.`
        },
        {
          question: 'How do I build trust on a new team?',
          answer: `**First 90 Days Trust-Building**:

**Week 1-2: Listen and Learn**
- Join every meeting as an observer
- Ask "How do things work here?" instead of "At my last company we did..."
- Take detailed notes and ask clarifying questions

**Week 3-4: Small Wins**
- Fix a known bug or improve a dev tool
- Ship something small and visible that demonstrates competence
- Volunteer for on-call or a thankless task nobody wants

**Week 5-8: Start Contributing Ideas**
- Now that you have context, propose improvements based on what you've observed
- Frame suggestions as questions: "Have you considered...?" not "You should..."
- Build on existing work rather than proposing rewrites

**Week 9-12: Take Ownership**
- Own a meaningful project end-to-end
- Share knowledge through documentation or talks
- Start mentoring or pairing with others

**Anti-Patterns to Avoid**:
- "At my last company we did X better" (comparing negatively)
- Proposing a rewrite in week 1 (arrogance)
- Only interacting with your manager (missed peer relationships)
- Staying silent in meetings (perceived as disengaged)`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you built trust with a skeptical stakeholder',
        'How do you build credibility on a new team?',
        'Describe a time you had to earn someone\'s trust',
        'How do you establish trust with cross-functional partners?',
        'Tell me about rebuilding trust after a failure'
      ],

      tips: [
        'Understand their concerns first—ask before assuming',
        'Over-communicate progress transparently—surprises destroy trust',
        'Deliver small wins early to build momentum and credibility',
        'Always follow through on commitments—reliability is the foundation of trust',
        'Be honest about setbacks—transparency when things go wrong builds more trust than pretending everything is fine'
      ]
    },
    {
      id: 'simplifying-systems',
      title: 'Simplifying Complex Systems',
      icon: 'minimize',
      color: '#8b5cf6',
      questions: 3,
      description: 'Reduce complexity while maintaining functionality.',

      introduction: `Complexity is the silent killer of engineering productivity. Interviewers ask about simplification to assess whether you can identify accidental complexity (as opposed to essential complexity), make the business case for refactoring, and execute a simplification without breaking things. This is a key Staff/Principal engineer competency.

The best answers show you measured complexity (LOC, incident rate, onboarding time, cognitive load), proposed a data-driven simplification, executed it incrementally without halting feature work, and demonstrated measurable improvement afterward.`,

      keyQuestions: [
        {
          question: 'How do I simplify complex systems?',
          answer: `**What Interviewers Look For**:
- Ability to spot accidental complexity
- Data-driven refactors that cut cognitive load
- Rigorous validation—tests, metrics, developer feedback
- Long-term ownership of maintainability

**STAR Example**:

**Situation**: "Our Node.js billing service had a home-grown promise wrapper and 3,000 lines of duplicated retry logic, causing onboarding friction and weekly production bugs."

**Task**: "Replace the custom layer with native async/await and a shared retry util—without halting new feature work."

**Action**:
- Flag-guarded refactor
- Added unit tests for critical paths
- Swapped modules incrementally
- Deleted legacy code behind a one-week dark-launch

**Result**: "Codebase shrank by 2.1k LOC (-22%), p95 latency improved 9%, new-hire ramp-up survey score rose from 3.2→4.6/5, and incident rate dropped to zero in the following quarter."`
        },
        {
          question: 'How do I make the business case for simplification?',
          answer: `**Justifying Simplification to Leadership**:

**1. Quantify the Pain**
- "New engineers take 6 weeks to become productive (industry average: 3 weeks)"
- "We spend 40% of sprint capacity on maintenance of the legacy module"
- "3 P1 incidents in the last quarter traced to the same subsystem"

**2. Estimate the ROI**
- "Simplification: 4 engineer-weeks of effort"
- "Savings: 2 engineer-weeks per quarter in reduced maintenance"
- "Break-even in 2 quarters, then permanent velocity improvement"

**3. Propose a Low-Risk Plan**
- "We'll use feature flags to roll out incrementally"
- "Parallel run old and new code paths for 2 weeks"
- "Automatic rollback if error rates increase"

**4. Show the Alternative Cost**
- "If we don't simplify, we'll continue losing 40% of sprint capacity"
- "New hires will continue taking 6 weeks instead of 3"
- "Incident rate will likely increase as the system grows"

**Key Insight**: Frame simplification as a business investment, not a technical indulgence. Leaders approve investments with ROI.`
        },
        {
          question: 'How do I simplify without breaking things?',
          answer: `**Safe Simplification Playbook**:

**1. Characterize Before Cutting**
- Map all dependencies of the code you want to simplify
- Write tests that capture current behavior (characterization tests)
- Identify all consumers of the interface

**2. Strangle, Don't Rewrite**
- Use the Strangler Fig pattern: build the new version alongside the old
- Gradually route traffic to the new implementation
- Delete old code only after the new code has been running in production

**3. Feature Flag Everything**
- Every refactoring step should be behind a flag
- Roll back with a config change, not a code deployment

**4. Measure Continuously**
- Latency, error rate, throughput before and after
- Developer satisfaction surveys (was it actually simpler?)
- Time-to-onboard for new team members

**Anti-Pattern**: "Let's rewrite the whole thing from scratch." Rewrites almost always take 3x longer than estimated, and you lose all the accumulated bug fixes and edge case handling.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you simplified a complex system',
        'How do you identify unnecessary complexity?',
        'Describe a refactoring effort you led',
        'How do you balance simplification with feature development?',
        'Tell me about a time you removed or consolidated duplicate code/services'
      ],

      tips: [
        'Measure complexity with data: LOC, incidents, onboarding time, developer satisfaction',
        'Refactor incrementally with feature flags—never do big-bang rewrites',
        'Validate with tests, metrics, and developer feedback',
        'Track developer experience improvements—they\'re as important as performance gains',
        'Frame simplification as a business investment with clear ROI'
      ]
    },
    {
      id: 'raising-quality-bar',
      title: 'Raising the Quality Bar',
      icon: 'trendingUp',
      color: '#10b981',
      questions: 3,
      description: 'Improve engineering standards measurably.',

      introduction: `Raising the quality bar is a core Senior/Staff engineer responsibility. Interviewers ask this to assess whether you can drive systemic improvements—not just write good code yourself, but elevate the entire team's output. This requires influencing without authority, building consensus, and implementing sustainable processes.

The best answers show concrete before/after metrics (test coverage, incident rate, deployment frequency, code review turnaround), describe how you got team buy-in (not mandates), and demonstrate that quality improvements actually accelerated delivery rather than slowing it down.`,

      keyQuestions: [
        {
          question: 'How do I raise quality standards on a team?',
          answer: `**What Interviewers Look For**:
- Concrete examples of raising engineering quality
- Use of measurable metrics (coverage, MTTR, defects)
- Ability to influence peers through code reviews and automation
- Balance between speed and quality

**STAR Example**:

**Situation**: "Our B2B analytics API had only 62% test coverage and averaged three P1 incidents per quarter."

**Task**: "Lift quality without slowing a pending feature launch in eight weeks."

**Action**:
- Introduced a CI gate for branch coverage ≥85%
- Added contract tests for all public endpoints
- Rolled out a lightweight review checklist
- Created Grafana SLO dashboards

**Result**: "Coverage hit 91%; P1s dropped to zero for the next two quarters; mean PR review time fell 22% due to clearer guidelines—proving higher quality and faster flow."`
        },
        {
          question: 'How do I get team buy-in for quality improvements?',
          answer: `**Influence Without Mandates**:

**1. Lead by Example**
"I started writing comprehensive tests for my own code first. When team members saw my PRs catching regressions in CI, they asked about my approach."

**2. Make It Easy**
"I created test templates, fixture generators, and a 'copy this pattern' guide. The barrier to writing good tests dropped from 30 minutes to 5 minutes per test."

**3. Show the Pain**
"I correlated incident data with test coverage by module. The charts showed a clear pattern: modules with <60% coverage had 5x more incidents."

**4. Celebrate Progress**
"I created a team dashboard showing coverage trends and celebrated when we hit milestones. Making quality visible and rewarding makes it part of the culture."

**5. Avoid Being the Quality Police**
"I never rejected PRs just for missing tests. Instead, I'd say: 'This looks great. Would you be open to adding a test for the edge case on line 42?' Collaboration over enforcement."

**Anti-Pattern**: Mandating 100% coverage overnight. This creates resentment, trivial tests, and slows delivery. Incremental improvement with team ownership works far better.`
        },
        {
          question: 'What quality metrics should I track?',
          answer: `**Quality Metrics Dashboard**:

**Code Quality**:
- Test coverage (branch, not just line)
- Static analysis findings (linting, type checking)
- Code review turnaround time
- Mean time from PR open to merge

**Operational Quality**:
- Incident rate (P0/P1/P2 per quarter)
- MTTR (Mean Time to Resolve)
- MTTD (Mean Time to Detect)
- Change failure rate (% of deployments that cause incidents)

**Delivery Quality**:
- Deployment frequency
- Lead time (commit to production)
- Escaped defects (bugs found in production vs. in testing)
- Customer-reported bugs per sprint

**Developer Experience**:
- Onboarding time for new engineers
- Developer satisfaction surveys
- Build time / CI pipeline duration
- Time spent on maintenance vs. new features

**Key Insight**: Track 3-4 metrics, not 20. Pick the ones most relevant to your team's biggest pain point. Improvement in targeted metrics > dashboard that nobody reads.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you raised the quality bar on your team',
        'How do you balance quality with delivery speed?',
        'Describe a process or practice you introduced that improved engineering quality',
        'How do you handle code quality in a fast-moving startup?',
        'Tell me about a time you improved your team\'s testing practices'
      ],

      tips: [
        'Set measurable quality gates—vague goals like "write better code" don\'t work',
        'Automate enforcement in CI—manual checks don\'t scale and breed resentment',
        'Create clear, lightweight guidelines and checklists that reduce cognitive load',
        'Show that quality improves speed—faster reviews, fewer incidents, less rework',
        'Lead by example before asking others to change—influence works better than mandates'
      ]
    },
    {
      id: 'being-proven-wrong',
      title: 'Being Proven Wrong',
      icon: 'refreshCw',
      color: '#f97316',
      questions: 3,
      description: 'Handle being wrong with grace and data.',

      introduction: `Being proven wrong is inevitable in engineering—and how you handle it reveals more about your character than being right ever could. Interviewers ask this to assess intellectual humility, openness to evidence, and the ability to separate your ego from your ideas.

The strongest answers show you proposed something with conviction, designed an experiment to test it, discovered you were wrong, acknowledged it openly, and learned something that made you a better engineer. Never frame being wrong as embarrassing—frame it as the scientific method working as intended.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you were proven wrong',
          answer: `**What Interviewers Look For**:
- Openness to challenge—no attachment to pet ideas
- Ability to design data-driven experiments
- Willingness to pivot when evidence disproves assumptions
- Clear communication of findings

**STAR Example**:

**Situation**: "I proposed switching our image-processing pipeline from Python to Rust for speed; the staff engineer argued GC pauses, not language, caused latency."

**Task**: "Prove which bottleneck mattered before committing two sprint cycles."

**Action**:
- Added perf counters
- Captured 10k traces
- Isolated CPU vs GC time
- Built a Rust POC for the hottest function

**Result**: "Data showed GC was 6% of latency; Rust POC cut resize 35%. We optimised Python I/O first (20% gain) and scheduled a phased Rust rewrite for V2—saving four weeks now and charting a clear future path."`
        },
        {
          question: 'How do I create a culture where being wrong is safe?',
          answer: `**Building Psychological Safety Around Being Wrong**:

**1. Model It Publicly**
"I make a point of saying 'I was wrong about X' in team meetings when it happens. When leaders admit mistakes, it normalizes it for everyone."

**2. Celebrate Learning, Not Just Winning**
"In retrospectives, I ask: 'What assumption did we challenge this sprint?' Not every experiment succeeds, but every experiment teaches."

**3. Separate Ideas from Identity**
"I frame proposals as 'here's an option' rather than 'here's MY solution.' This makes it easier to evaluate objectively."

**4. Use Structured Decision-Making**
"ADRs and RFCs depersonalize decisions. When there's a written comparison of options, rejecting an option doesn't feel like rejecting a person."

**Key Insight**: Teams where being wrong is punished stop experimenting. Teams where being wrong is treated as learning become the most innovative.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you were proven wrong',
        'How do you handle it when your assumptions turn out to be incorrect?',
        'Describe a time you changed your mind on a technical decision',
        'Tell me about a time a colleague had a better idea than yours',
        'How do you separate your ego from your technical opinions?'
      ],

      tips: [
        'Show you can change your mind with data—don\'t cling to disproven ideas',
        'Design experiments to test assumptions before committing resources',
        'Credit others when they\'re right—generosity builds trust',
        'Focus on the best outcome, not being right—the team wins when the best idea wins',
        'Frame being wrong as learning, not failure—it\'s the scientific method at work'
      ]
    },
    {
      id: 'optimizing-performance',
      title: 'Optimizing Performance',
      icon: 'zap',
      color: '#06b6d4',
      questions: 3,
      description: 'Profile, baseline, and improve system performance.',

      introduction: `Performance optimization is a core engineering skill that separates senior engineers from mid-level ones. Interviewers ask this to assess whether you profile before optimizing (vs. guessing), set measurable targets, understand the business impact of performance, and can safely deploy optimizations without introducing regressions.

The biggest anti-pattern: "I refactored the code and it got faster." Without profiling, baselines, and measured results, you can't distinguish real optimization from premature optimization or lucky coincidence.`,

      keyQuestions: [
        {
          question: 'How do I approach performance optimization?',
          answer: `**What Interviewers Look For**:
- Skill in profiling and setting measurable targets
- Ability to weigh latency, throughput, and cost trade-offs
- Use of safe rollout mechanisms (canaries, feature flags)
- Clear business impact: faster UX, lower spend

**STAR Example**:

**Situation**: "Our search API's p99 latency hit 1.8s at peak, and autoscaling costs spiked 40% during sales events."

**Task**: "Cut p99 below 600ms and trim AWS spend by 25% within one sprint."

**Action**:
- Added OpenTelemetry traces
- Found ORM N+1 queries and cache thrash
- Batched DB calls, introduced Redis edge cache
- Validated with k6 load tests
- Canary-deployed behind a flag

**Result**: "p99 dropped to 420ms; EC2 usage –32%, saving £18k/yr; checkout conversion +6%. Dashboards now gate all merges, preventing regression."`
        },
        {
          question: 'What are common performance optimization mistakes?',
          answer: `**Anti-Patterns in Optimization**:

**1. Optimizing Without Profiling**
"I see engineers rewrite algorithms 'for performance' without measuring. The bottleneck is almost never where you think it is. Profile first, optimize second."

**2. Optimizing the Wrong Metric**
"Improving average latency when p99 is the problem. Average can improve while worst-case gets worse."

**3. Premature Optimization**
"Spending a sprint optimizing a function that runs once per day. Focus on hot paths first—the 5% of code that runs 95% of the time."

**4. Ignoring Business Impact**
"Cutting latency from 50ms to 10ms when users can't perceive the difference. Tie performance work to metrics users care about: page load time, checkout completion rate, search result speed."

**5. No Regression Prevention**
"Optimizing without adding performance tests means the improvement will regress within months as new features are added."

**The Golden Rule**: Measure → Identify bottleneck → Fix → Verify → Prevent regression. Skip any step and you're guessing.`
        },
        {
          question: 'How do I set performance targets?',
          answer: `**Target-Setting Framework**:

**1. Start with User Experience**
- Web pages: Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- APIs: p50 < 100ms, p99 < 500ms for user-facing endpoints
- Background jobs: throughput targets based on SLA

**2. Benchmark Against Competitors**
"Our search takes 1.2s. Google returns results in 200ms. Users expect similar speed."

**3. Tie to Business Metrics**
"Every 100ms of latency reduces conversion by 1%" (Amazon's famous finding). Calculate the revenue impact of your target improvement.

**4. Set Targets at Multiple Percentiles**
- p50 (median): the typical user experience
- p95: the experience for most users
- p99: the worst case that 1% of users see
- p99.9: tail latency that catches systemic issues

**Key Insight**: "Make it fast" is not a target. "p99 search latency under 500ms at 10K QPS" is a target. Measurable targets prevent scope creep and enable clear success/failure assessment.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you optimized a system\'s performance',
        'How do you identify performance bottlenecks?',
        'Describe a time you reduced infrastructure costs through optimization',
        'How do you prevent performance regressions?',
        'Tell me about a time you had to balance performance with other constraints'
      ],

      tips: [
        'Always profile before optimizing—measure, don\'t guess',
        'Set measurable targets upfront tied to business metrics',
        'Use canary deployments to validate improvements safely',
        'Quantify business impact: revenue, cost savings, user experience improvement',
        'Add performance regression tests to prevent backsliding'
      ]
    },
    {
      id: 'data-driven-debugging',
      title: 'Data-Driven Debugging',
      icon: 'search',
      color: '#3b82f6',
      questions: 3,
      description: 'Debug systematically with tracing and metrics.',

      introduction: `Data-driven debugging separates professional engineers from those who rely on intuition and print statements. Interviewers ask this to assess whether you approach debugging scientifically: observing symptoms, forming hypotheses, designing experiments, and validating root causes with data.

The key signal interviewers look for is that you instrument before guessing, correlate across multiple data sources (logs, metrics, traces), and arrive at root causes that are verifiable—not just plausible.`,

      keyQuestions: [
        {
          question: 'How do I debug complex issues systematically?',
          answer: `**What Interviewers Look For**:
- Instinct to instrument first, guess later
- Fluency with tracing, logging, and observability
- Hypothesis-driven debugging that isolates root cause
- Quantified wins: latency, error rate improvements

**STAR Example**:

**Situation**: "Checkout API p95 latency spiked to 2.4s; team suspected database congestion."

**Task**: "Pinpoint the real bottleneck and restore p95 < 300ms within 48h."

**Action**:
- Enabled distributed tracing
- Layered Grafana dashboards
- Log-sampled slow paths
- Found 78% of latency in TLS handshakes—an NLB cert mis-chain—not the DB
- Patched certs, added handshake alerts

**Result**: "p95 fell to 180ms, error rate -95%, saved £12k/month. Dashboard template adopted across six squads."`
        },
        {
          question: 'What observability tools and practices should I mention?',
          answer: `**Observability Stack for Debugging**:

**Three Pillars**:
1. **Logs**: Structured JSON logs with correlation IDs. Tools: ELK Stack, Loki, CloudWatch Logs
2. **Metrics**: Time-series data for system health. Tools: Prometheus + Grafana, Datadog, CloudWatch Metrics
3. **Traces**: Request-level flow across services. Tools: Jaeger, Zipkin, OpenTelemetry, AWS X-Ray

**Debugging Workflow**:
1. **Detect**: Alerts fire on anomalous metrics (error rate, latency spike)
2. **Scope**: Dashboard narrows to affected service/endpoint
3. **Trace**: Distributed trace shows where time is spent
4. **Correlate**: Cross-reference logs from the same request
5. **Hypothesize**: "The bottleneck is at hop X because..."
6. **Validate**: Add targeted instrumentation to confirm
7. **Fix**: Deploy fix with canary
8. **Verify**: Confirm metrics return to normal

**Key Insight**: The best debuggers don't just find bugs—they leave behind better observability. Every debugging session should result in a new dashboard, alert, or runbook that makes the next incident faster to resolve.`
        }
      ],

      sampleQuestions: [
        'How do you approach debugging a production issue?',
        'Tell me about a time you used data to find a non-obvious root cause',
        'Describe your debugging methodology',
        'How do you debug issues that span multiple services?',
        'Tell me about a time the root cause wasn\'t what everyone expected'
      ],

      tips: [
        'Instrument before guessing—add tracing, not print statements',
        'Use distributed tracing to follow requests across services',
        'Form hypotheses and test them—don\'t just browse logs randomly',
        'Create reusable dashboard templates that help the next engineer',
        'Include the prevention step: what monitoring did you add to catch this earlier next time?'
      ]
    },
    {
      id: 'disagree-and-commit',
      title: 'Disagree and Commit',
      icon: 'checkCircle',
      color: '#10b981',
      questions: 3,
      description: 'Fully commit after decisions are made.',

      introduction: `"Disagree and commit" is a core Amazon Leadership Principle, but it's valued everywhere. Interviewers ask this to assess your professionalism: can you voice a strong opinion, lose the debate, and then fully commit to making the chosen path succeed? The alternative—passive-aggressive sabotage, half-hearted execution, or "I told you so" when things go wrong—is a career-limiting move.

The best answers show three phases: genuine disagreement backed by reasoning, graceful acceptance of the decision, and wholehearted execution that made the chosen path succeed—ideally better than expected.`,

      keyQuestions: [
        {
          question: 'How do I handle disagree and commit?',
          answer: `**What Interviewers Look For**:
- Ability to disagree, then fully commit
- Professionalism: no passive resistance
- Focus on delivery quality despite personal preference
- Reflections that turn disagreement into learning

**STAR Example**:

**Situation**: "I championed an event-driven pipeline for real-time analytics, but the architecture board opted for a nightly BigQuery batch to cut cost."

**Task**: "Set aside my preference and ensure the batch solution shipped in eight weeks with <0.5% data drift."

**Action**:
- Re-wrote the project plan
- Paired with data engineers on Airflow DAGs
- Added checksum guards
- Created a Looker dashboard for next-day KPIs

**Result**: "Launched one week early, saved £90k/yr in infra, and achieved 99.98% data accuracy. Post-mortem documented trade-offs, and the board later used the template for future design debates."`
        },
        {
          question: 'How do I disagree effectively before committing?',
          answer: `**The Disagreement Phase**:

**1. State Your Position Clearly**
"I recommend approach A because [specific reasons with data]. Here are the risks I see with approach B: [specific risks]."

**2. Listen to Counter-Arguments**
"What am I missing? What context makes approach B better?" Genuine curiosity, not rhetorical questions.

**3. Propose Experiments**
"Could we test both approaches for a week and let the data decide?"

**4. Document Your Reasoning**
"I'll write up my analysis so it's part of the ADR regardless of which direction we go."

**5. Accept the Decision**
"I've shared my perspective. If the group/leadership decides on B, I'm fully committed."

**Key Principle**: You earn the right to disagree by doing it constructively. If you're known for thoughtful dissent, your disagreements carry more weight. If you disagree on everything, you're noise.`
        },
        {
          question: 'What does "committing" actually look like in practice?',
          answer: `**Full Commitment Behaviors**:

**Do**:
- Execute the chosen plan with full energy and creativity
- Actively look for ways to make the chosen approach succeed
- Speak positively about the decision to others: "We chose X because..."
- Report honestly on progress—both good and bad news

**Don't**:
- Sandbag the implementation so it fails ("see, I told you")
- Tell everyone "I disagreed but was overruled"
- Do the minimum required while waiting for it to fail
- Say "I told you so" if problems arise

**The Litmus Test**: If an outside observer watched your behavior, could they tell whether the chosen approach was your idea or someone else's? If not, you're committing fully.

**When Commitment Has Limits**:
The one exception: if the decision involves ethical violations, legal risks, or safety concerns that weren't fully considered, you have an obligation to re-raise—not just commit silently.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you disagreed with a decision but still supported it',
        'How do you handle it when your recommendation isn\'t chosen?',
        'Describe a time you committed to an approach you didn\'t agree with',
        'How do you balance conviction with flexibility?',
        'Tell me about a time you were overruled and the outcome surprised you'
      ],

      tips: [
        'Once decided, commit 100%—half-hearted execution is worse than full commitment to a suboptimal plan',
        'No passive resistance or sabotage—your reputation depends on being a team player',
        'Focus on making the chosen path succeed—find ways to improve it',
        'Document learnings for future decisions—the disagreement process itself creates institutional knowledge',
        'Include a story where the other approach turned out to be right—it shows humility and growth'
      ]
    },
    {
      id: 'bias-for-action',
      title: 'Bias for Action',
      icon: 'play',
      color: '#f97316',
      questions: 3,
      description: 'Act decisively when waiting would cost value.',

      introduction: `"Bias for action" means moving forward with calculated risks rather than waiting for perfect information. This is a core Amazon Leadership Principle and is valued at every fast-moving company. Interviewers ask this to distinguish between engineers who take initiative and those who wait to be told what to do.

The key nuance: bias for action doesn't mean recklessness. It means understanding that in many situations, the cost of waiting exceeds the cost of being wrong—especially when decisions are reversible. A great answer shows you identified a time-sensitive opportunity, assessed the risk, built in safety nets, and acted.`,

      keyQuestions: [
        {
          question: 'How do I demonstrate bias for action?',
          answer: `**What Interviewers Look For**:
- Bias for action when waiting would cost value
- Structured risk assessment and rollback plan
- Fast feedback loops (flags, A/B, canaries)
- Ability to quantify trade-offs

**STAR Example**:

**Situation**: "Start-up needed Apple Pay before holiday rush, but we lacked full device-level telemetry to size traffic."

**Task**: "Ship in four weeks (half normal time) without melting checkout."

**Action**:
- Estimated volume from browser UA sampling
- Built a throttling gate
- Canary-launched to 10% traffic
- Set autoscaling alarms at 70% CPU

**Result**: "Delivered one week early; p95 latency +30ms (within SLO); Apple Pay accounted for 14% of holiday revenue uplift. Post-mortem added a standard 'incomplete-data launch' checklist."`
        },
        {
          question: 'How do I distinguish between bias for action and recklessness?',
          answer: `**The Two-Way Door Framework** (from Amazon):

**Two-Way Doors (Reversible)**:
- Feature behind a flag → Act fast, roll back if wrong
- A/B test → Learn quickly, no permanent commitment
- API addition (backward compatible) → Easy to remove later
- **Bias**: Strong bias for action. Cost of delay > cost of being wrong.

**One-Way Doors (Irreversible)**:
- Database schema migration → Hard to reverse
- Public API contract change → Breaking changes affect customers
- Pricing model change → Customer trust impact
- **Bias**: Careful analysis. Cost of being wrong > cost of delay.

**Decision Checklist**:
1. Is this reversible? → Act fast with a rollback plan
2. What's the cost of waiting 1 week? → If significant, act now
3. What's the worst case if I'm wrong? → If manageable, act now
4. Do I have enough signal to make a reasonable bet? → 70% confidence is enough for reversible decisions

**Key Insight**: Most decisions are two-way doors that people treat as one-way doors. This bias toward caution kills velocity.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you took initiative without being asked',
        'Describe a time you moved fast when others wanted to wait',
        'How do you decide when to act vs. when to analyze more?',
        'Tell me about a calculated risk you took at work',
        'Describe a time your bias for action paid off (or didn\'t)'
      ],

      tips: [
        'Move fast with calculated risks—not reckless abandon',
        'Have rollback plans ready before you act—safety nets enable speed',
        'Use canary launches and feature flags to make decisions reversible',
        'Document learnings for future launches—build institutional knowledge',
        'Show the cost of inaction: "If we waited, we would have lost X"'
      ]
    },
    {
      id: 'debugging-distributed',
      title: 'Debugging Distributed Systems',
      icon: 'network',
      color: '#8b5cf6',
      questions: 3,
      description: 'Trace issues across multiple services.',

      introduction: `Debugging distributed systems is fundamentally harder than debugging monolithic applications. Issues can be caused by network partitions, clock skew, race conditions, cascading failures, and emergent behaviors that don't exist in any single service. Interviewers ask this to assess your ability to think across system boundaries.

The strongest answers demonstrate fluency with observability tools (distributed tracing, log correlation, metrics dashboards), a systematic approach to narrowing down root causes across service boundaries, and the ability to find issues in unexpected layers (network, infrastructure, DNS, TLS) rather than always blaming application code.`,

      keyQuestions: [
        {
          question: 'How do I debug distributed system issues?',
          answer: `**What Interviewers Look For**:
- Systematic, hypothesis-driven debugging
- Fluency with observability: tracing, metrics, logs
- Cross-service thinking—network, storage, app layers
- Quantified outcome: reduced MTTR, incidents

**STAR Example**:

**Situation**: "Users saw random 502s during checkout; errors spanned API-gateway, payments, and inventory services."

**Task**: "Trace the fault path and restore <0.01% error rate inside a two-hour incident window."

**Action**:
- Enabled Jaeger trace filter on failing request IDs
- Correlated spans in Kibana
- Overlaid p99 latency in Grafana
- Spotted 400ms spikes at internal gRPC hop
- Packet capture revealed 1% MTU mismatch drops between EKS nodes
- Rolled back recent CNI upgrade, patched kube-proxy config

**Result**: "Error rate fell from 0.7% to 0.005% in 90 min; MTTR cut by 40%. Added MTU health probe—subsequent similar issue diagnosed in 8 min."`
        },
        {
          question: 'What are common distributed system failure modes?',
          answer: `**Failure Modes to Mention in Interviews**:

**1. Cascading Failures**
One service slows down, causing callers to queue up, exhausting thread pools, which cascades upstream. Solution: circuit breakers, timeouts, bulkheads.

**2. Split Brain**
Network partition causes two nodes to think they're the leader. Solution: consensus protocols (Raft, Paxos), fencing tokens.

**3. Retry Storms**
A brief failure causes all clients to retry simultaneously, overwhelming the recovering service. Solution: exponential backoff with jitter, circuit breakers.

**4. Clock Skew**
Timestamps disagree across services, causing ordering issues. Solution: logical clocks (Lamport, vector clocks), NTP synchronization.

**5. Hot Partitions**
One partition gets disproportionate traffic (celebrity problem, time-based keys). Solution: partition-aware routing, key salting.

**6. Poison Messages**
A malformed message causes a consumer to crash repeatedly, blocking the entire queue. Solution: dead letter queues, message TTLs.

**Key Interview Insight**: Mentioning specific failure modes and their mitigations demonstrates depth that sets you apart from candidates who only talk about application-level bugs.`
        }
      ],

      sampleQuestions: [
        'Tell me about debugging an issue that spanned multiple services',
        'How do you trace a request through a microservices architecture?',
        'Describe the most difficult production issue you\'ve debugged',
        'How do you handle cascading failures in distributed systems?',
        'Tell me about a time the root cause was in the infrastructure, not the application'
      ],

      tips: [
        'Use distributed tracing (Jaeger, OpenTelemetry) across all services—it\'s your most powerful debugging tool',
        'Correlate logs, metrics, and traces using request IDs—no single data source tells the full story',
        'Consider network and infrastructure layers—not every bug is in your application code',
        'Build reusable debugging runbooks so the next engineer doesn\'t start from scratch',
        'Mention specific tools and failure modes—concrete knowledge beats generic descriptions'
      ]
    },
    {
      id: 'adapting-requirements',
      title: 'Adapting to Changed Requirements',
      icon: 'refreshCw',
      color: '#eab308',
      questions: 3,
      description: 'Pivot gracefully when requirements change.',

      introduction: `Requirements change constantly—new competitors emerge, customer feedback reveals different needs, technology evolves, regulatory requirements shift. Interviewers ask this to assess whether you can pivot gracefully without getting frustrated, or whether you cling to the original plan out of sunk-cost bias.

A great answer shows you detected the change early, evaluated the impact objectively, preserved whatever work still applied, communicated clearly with stakeholders, and ultimately delivered a better outcome because of the pivot—not despite it.`,

      keyQuestions: [
        {
          question: 'How do I handle changing requirements mid-project?',
          answer: `**What Interviewers Look For**:
- Early detection of invalidating information
- Data-driven pivot rather than sunk-cost bias
- Clear stakeholder communication
- Ability to maintain team morale

**STAR Example**:

**Situation**: "Halfway through building an on-prem ETL cluster, AWS announced a new serverless Glue feature that met the same GDPR requirements at one-third the cost."

**Task**: "Decide within 48h whether to continue or pivot without missing the Black-Friday deadline."

**Action**:
- Ran a cost/perf spike on Glue with sample data
- Compared SLA metrics
- Held a 30-min exec briefing
- Re-scoped backlog—kept data model work, scrapped bare-metal scripts

**Result**: "Pivot approved; delivery date held; infra spend projected –55% (£120k/yr). Team velocity dipped only one sprint, and the client later used our evaluation memo as their reference architecture."`
        },
        {
          question: 'How do I prevent requirement changes from derailing a project?',
          answer: `**Change Management Framework**:

**1. Build for Flexibility**
"I architect systems in layers so that changes in one layer don't ripple through everything. Clear interfaces between components are your insurance against requirement changes."

**2. Scope Changes Rigorously**
"Every change request gets a quick impact assessment: What does it affect? How much effort? What does it delay? This prevents scope creep disguised as 'small changes.'"

**3. Distinguish Real Changes from Refinements**
"Not all requirement changes are equal. A refinement ('users also want to sort by date') is different from a pivot ('we're targeting a different market now'). Refinements are normal; pivots need explicit decision-making."

**4. Use Feature Flags**
"Feature flags let you build new requirements alongside old ones. If the change is validated, switch over. If not, roll back without wasted work."

**5. Communicate Impact Transparently**
"'We can accommodate this change, but it means X will slip by 2 weeks.' Stakeholders can make good decisions when they see trade-offs clearly."

**Anti-Pattern**: Silently absorbing changes and hoping to make up the time. This always ends in a surprise deadline miss.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time requirements changed mid-project',
        'How do you handle scope creep?',
        'Describe a time you had to pivot your approach based on new information',
        'How do you balance flexibility with delivery commitments?',
        'Tell me about a time a change in requirements actually improved the outcome'
      ],

      tips: [
        'Stay alert for new information that changes the game—don\'t put blinders on',
        'Evaluate pivots objectively—avoid sunk-cost bias ("but we already built X")',
        'Communicate changes clearly to stakeholders with impact and timeline',
        'Preserve work that transfers to the new approach—rarely is everything wasted',
        'Frame pivots positively: adaptability is a strength, not a sign of poor planning'
      ]
    },
    {
      id: 'innovation',
      title: 'Building Something from Scratch',
      icon: 'lightbulb',
      color: '#f59e0b',
      questions: 3,
      description: 'Demonstrate originality with end-to-end ownership.',

      introduction: `Innovation questions assess whether you can create—not just maintain or improve. Interviewers want to see that you can identify an unmet need, design a solution from first principles, navigate uncertainty, and deliver something genuinely new with measurable impact.

The best answers show end-to-end ownership: from identifying the problem, through prototyping and iterating, to production deployment and impact measurement. The key differentiator is whether you built something because you were assigned to, or because you identified an opportunity nobody else saw.`,

      keyQuestions: [
        {
          question: 'Tell me about something you built from scratch',
          answer: `**What Interviewers Look For**:
- Demonstrated originality with technical depth
- End-to-end ownership from idea to production
- Ability to de-risk and iterate under uncertainty
- Clear linkage between invention and business impact

**STAR Example**:

**Situation**: "Patient records at HealthTechCo were duplicated across systems, hurting care quality and blocking EU expansion."

**Task**: "In 4 months build an identity-matching engine that lifts match precision to ≥95% and scales to 10k TPS."

**Action**:
- Prototyped a Bloom-filter + graph-traversal algorithm in Rust
- Added stream-processing with Flink
- Gated rollout via feature flags
- Authored patent write-up

**Result**: "Precision hit 97%, duplicates dropped 85%, saving £3.4M/yr; platform cleared EU audit; patent pending and solution open-sourced."`
        },
        {
          question: 'How do I pitch and get buy-in for a new idea?',
          answer: `**Innovation Pitch Framework**:

**1. Start with the Problem, Not the Solution**
"Our support team spends 40 hours/week manually categorizing tickets. That's $80K/year in labor on a task that could be automated."

**2. Show a Working Prototype**
"Instead of a slide deck, I built a proof-of-concept over a weekend. Here's the demo: it correctly categorizes 87% of tickets from last month."

**3. Quantify the ROI**
"2 weeks of engineering time to productionize. Saves $80K/year. Break-even in 2 months."

**4. Address Risks Upfront**
"The main risks are: accuracy on edge cases (mitigated by human review fallback) and model drift (mitigated by weekly retraining)."

**5. Propose a Reversible First Step**
"Let's run it in shadow mode for 2 weeks—it categorizes tickets but doesn't change anything. If accuracy is >90%, we switch over."

**Key Insight**: Leaders don't fund ideas. They fund evidence. A prototype beats a presentation every time.`
        }
      ],

      sampleQuestions: [
        'Tell me about something innovative you built',
        'Describe a project you initiated on your own',
        'How do you go from idea to production?',
        'Tell me about a time you identified and solved a problem nobody asked you to solve',
        'How do you handle the uncertainty of building something new?'
      ],

      tips: [
        'Show end-to-end ownership—from identifying the problem to deploying the solution',
        'Explain technical decisions and trade-offs—innovation isn\'t just ideas, it\'s execution',
        'Quantify business impact—ideas that don\'t connect to business value sound like pet projects',
        'Highlight iteration and de-risking—show how you validated assumptions before committing',
        'Include how others adopted or built on your work—the best innovations multiply beyond the creator'
      ]
    },
    {
      id: 'learning-unfamiliar-domain',
      title: 'Learning Unfamiliar Domain Fast',
      icon: 'book',
      color: '#06b6d4',
      questions: 3,
      description: 'Rapidly upskill when expertise is absent.',

      introduction: `Technology careers require constant learning, and sometimes you need to deliver results in a domain you know nothing about—on a deadline. Interviewers ask this to assess your learning velocity: can you go from zero to productive in a new domain without waiting for formal training or hiring a specialist?

The strongest answers show a systematic learning approach (not just "I read the docs"): identifying trusted sources, finding mentors, building progressively from prototype to production, and ultimately contributing domain knowledge back to the team.`,

      keyQuestions: [
        {
          question: 'How do I learn an unfamiliar domain quickly?',
          answer: `**What Interviewers Look For**:
- Bias for action when expertise is absent
- Rapid-learning playbook: curate sources, build POC, get feedback
- Ability to translate fresh knowledge into production value fast
- Reflection: what stuck, what to reuse

**STAR Example**:

**Situation**: "Refund fraud surged 60% on our e-commerce platform; leadership wanted an ML-based detector in six weeks, but we had no data-science team."

**Task**: "Quickly up-skill on anomaly-detection models and deliver a production-ready service."

**Action**:
- Consumed a fast.ai course
- Read two academic papers
- Slack-mentored with a DS from another org
- Prototyped Isolation-Forest in Jupyter
- Back-tested on 12M orders
- Containerised the model, exposed a gRPC endpoint

**Result**: "Deployed in week 5; caught 92% of fraudulent refunds with 3% false positives, saving £0.5M/quarter. Wrote a 2-page 'ML-bootstrap' guide now used by three squads."`
        },
        {
          question: 'What is your rapid learning playbook?',
          answer: `**The 5-Step Rapid Learning Framework**:

**Step 1: Curate (Day 1)**
Don't start with Google. Find 2-3 trusted sources: an authoritative book, the official documentation, and a practitioner's blog or course. Ask domain experts: "If I could only read one thing, what would it be?"

**Step 2: Absorb the Mental Model (Days 2-3)**
Focus on understanding the domain's key abstractions and vocabulary. In ML, that's features, models, training, inference. In finance, that's positions, P&L, risk. You can't code what you can't conceptualize.

**Step 3: Build a Toy (Days 4-7)**
Implement the simplest possible working example. For ML: train a model on a sample dataset. For a new API: write a client that makes one successful call. Hands-on learning is 10x faster than reading.

**Step 4: Solve a Real Problem (Weeks 2-3)**
Apply what you've learned to the actual business problem. Start with a narrow scope: "Can this model classify 10 examples correctly?" Then expand.

**Step 5: Teach It (Week 4+)**
Write a guide or give a talk to your team. Teaching forces you to identify gaps in your understanding and solidifies the knowledge.

**Key Insight**: You don't need to become an expert. You need to become competent enough to deliver value and know when to ask for help.`
        }
      ],

      sampleQuestions: [
        'Tell me about a time you had to learn a new domain quickly',
        'How do you approach learning something completely unfamiliar?',
        'Describe a time you delivered results in an area outside your expertise',
        'How do you know when you\'ve learned enough to be productive?',
        'Tell me about a time you taught yourself a skill on the job'
      ],

      tips: [
        'Start with focused courses and seminal papers—don\'t boil the ocean',
        'Find mentors in the domain who can accelerate your learning curve',
        'Build working prototypes quickly—hands-on learning beats passive reading',
        'Document learnings for others—it solidifies your own understanding and helps the team',
        'Show the business outcome, not just what you learned—delivery under uncertainty is the real skill'
      ]
    },
    {
      id: 'negotiation',
      title: 'Negotiation Best Practices',
      icon: 'dollarSign',
      color: '#10b981',
      questions: 5,
      description: 'Negotiate offers confidently and professionally.',

      introduction: `Negotiation is a critical skill that most engineers underutilize. A well-executed negotiation can result in 10-30% higher compensation without damaging your relationship with the employer. The key is preparation, data, and confident delivery.`,

      keyQuestions: [
        {
          question: 'How should I approach salary negotiation?',
          answer: `**The Negotiation Framework**

**1. Research Before You Talk Numbers**
- Use levels.fyi, Glassdoor, Blind for market data
- Know the range for your level at this specific company
- Factor in location, team, and your unique value

**2. Never Give the First Number**
- "I'm flexible on compensation and more focused on finding the right fit. What's the range for this role?"
- If pressed: "Based on my research and experience, I'm targeting [range], but I'm open to discussing the full package."

**3. Wait for the Written Offer**
- Don't negotiate verbally—wait for the written offer
- This gives you time to evaluate and prepare a counter

**4. The Counter Formula**
- Thank them for the offer
- Express enthusiasm for the role
- Present your counter with justification
- Be specific: "Based on my 5 years in distributed systems and the market data I've gathered, I'm looking for $X base and Y RSUs."

**5. Negotiate the Full Package**
- Base salary, equity, sign-on bonus
- Start date, PTO, remote flexibility
- Level and title (can affect future earnings)`
        },
        {
          question: 'What are common negotiation mistakes?',
          answer: `**Mistakes to Avoid**

❌ **Accepting immediately**
"Let me think about it" is always acceptable. Take 24-48 hours.

❌ **Revealing your current salary**
"I'd prefer to focus on the value I'll bring to this role rather than my current compensation."

❌ **Negotiating against yourself**
State your ask once, then wait. Silence is powerful.

❌ **Being apologetic**
Don't say "I hate to ask, but..." or "I know this is awkward..."

❌ **Focusing only on base salary**
Equity, bonus, sign-on, and level can be more negotiable.

❌ **Threatening to walk**
Stay collaborative: "I'm excited about this opportunity and want to find a number that works for both of us."

❌ **Not getting it in writing**
Verbal promises mean nothing. Get the final offer in writing before accepting.`
        },
        {
          question: 'How do I handle competing offers?',
          answer: `**Leveraging Multiple Offers**

**1. Timing is Everything**
- Try to align offer deadlines across companies
- Request extensions if needed: "I'm in final stages with other companies and want to make a thoughtful decision. Could I have until [date]?"

**2. Be Transparent (Strategically)**
- "I have a competing offer at $X, but your company is my first choice. Is there flexibility to close the gap?"
- Don't lie about offers you don't have

**3. Use Specifics**
- "Company Y offered $Z base with A RSUs. I'd prefer to join you—can you match or exceed this?"

**4. Don't Auction**
- Going back and forth repeatedly damages relationships
- Make one strong counter, then decide

**5. Consider Total Value**
- Higher base vs more equity
- Better team vs higher title
- Growth potential vs immediate comp`
        },
        {
          question: 'What if they say the offer is final?',
          answer: `**Handling "Final Offer" Situations**

**1. Verify It's Actually Final**
Often, "final" isn't really final. Ask:
- "Is there any flexibility on [specific component]?"
- "What would it take to reach [your number]?"

**2. Negotiate Non-Salary Items**
If base is truly fixed, pivot to:
- Sign-on bonus (often easier to approve)
- Additional equity
- Earlier review/promotion timeline
- Extra PTO
- Remote work flexibility
- Start date (more time = free money)

**3. Get Future Commitments**
- "If the base can't move, could we agree to a 6-month review with a path to $X based on performance?"
- Get this in writing.

**4. Know Your Walk-Away Point**
- Have a number below which you won't accept
- Be prepared to politely decline if they can't meet it
- "I appreciate the offer, but I need to decline. If circumstances change, I'd love to reconnect."`
        }
      ],

      tips: [
        'Research market rates thoroughly before negotiating',
        'Never accept immediately—always take time to consider',
        'Negotiate the full package, not just base salary',
        'Get everything in writing before accepting',
        'Stay positive and collaborative throughout'
      ]
    },
    {
      id: 'asking-questions',
      title: 'Asking Thoughtful Questions',
      icon: 'helpCircle',
      color: '#3b82f6',
      questions: 4,
      description: 'Ask questions that demonstrate insight and interest.',

      introduction: `The questions you ask interviewers reveal as much about you as your answers. Thoughtful questions show genuine interest, strategic thinking, and help you evaluate if the role is right for you.`,

      keyQuestions: [
        {
          question: 'What questions should I ask interviewers?',
          answer: `**High-Impact Questions by Category**

**About the Role**
- "What does success look like in the first 90 days?"
- "What's the biggest challenge the team is facing right now?"
- "How is performance measured for this role?"

**About the Team**
- "Can you describe the team's working style and culture?"
- "How does the team handle disagreements on technical decisions?"
- "What's the on-call rotation like?"

**About Growth**
- "What does the career path look like for this role?"
- "How does the company support learning and development?"
- "Can you give an example of someone who grew in this team?"

**About the Company**
- "What's the company's biggest priority this year?"
- "How has the engineering culture evolved recently?"
- "What keeps you excited about working here?"

**Red Flag Detection**
- "How long has the team been in its current form?"
- "What happened to the previous person in this role?"
- "How often do priorities change mid-sprint?"`
        },
        {
          question: 'What questions should I avoid?',
          answer: `**Questions to Avoid**

❌ **Easily Googled Information**
"What does your company do?" — Shows no preparation

❌ **Premature Benefits Questions**
"How many vacation days do I get?" — Wait for offer stage

❌ **Negative Framing**
"I heard your tech debt is terrible. Is that true?"
✅ Better: "How does the team balance new features with technical improvements?"

❌ **Salary Too Early**
Save compensation discussions for recruiter/HR, not technical rounds

❌ **Nothing at All**
"No questions, I think you covered everything" — Always have questions prepared

❌ **Questions That Suggest You Won't Stay**
"How quickly can I get promoted out of this role?"
✅ Better: "What does career growth look like here?"`
        }
      ],

      tips: [
        'Prepare 5-7 questions for each interview',
        'Tailor questions to your interviewer\'s role',
        'Take notes on answers for follow-up conversations',
        'Ask about challenges—it shows maturity',
        'Use questions to evaluate if YOU want the role'
      ]
    },
    {
      id: 'professionalism',
      title: 'Non-Verbal Communication',
      icon: 'eye',
      color: '#8b5cf6',
      questions: 3,
      description: 'Project confidence through body language and presence.',

      introduction: `Non-verbal cues account for a significant portion of how you're perceived. Even in video interviews, your body language, eye contact, and professional presence matter.`,

      keyQuestions: [
        {
          question: 'How do I project confidence in interviews?',
          answer: `**Non-Verbal Best Practices**

**In-Person Interviews**
- **Posture**: Sit up straight, lean slightly forward (shows engagement)
- **Handshake**: Firm, brief, with eye contact and a smile
- **Eye Contact**: Maintain 60-70% of the time; look at the speaker
- **Hands**: Keep them visible; avoid fidgeting or crossing arms
- **Smile**: Natural, genuine—especially when greeting

**Video Interviews**
- **Camera Position**: Eye level, not looking down at laptop
- **Lighting**: Face the light source, avoid backlighting
- **Background**: Clean, professional, minimal distractions
- **Eye Contact**: Look at the camera when speaking, not the screen
- **Audio**: Use headphones to avoid echo

**Voice and Pace**
- Speak clearly and at a measured pace
- Pause before answering (shows thoughtfulness)
- Vary your tone to show enthusiasm
- Avoid filler words: "um," "like," "you know"`
        },
        {
          question: 'How do I handle nervousness?',
          answer: `**Managing Interview Nerves**

**Before the Interview**
- Prepare thoroughly—confidence comes from readiness
- Practice answers out loud (not just in your head)
- Do a mock interview with a friend
- Exercise the morning of—releases nervous energy
- Arrive/log in 10 min early to settle

**During the Interview**
- Take a breath before answering
- It's okay to pause and think
- If you're nervous, acknowledge it briefly: "I'm excited about this opportunity, so I may be a bit nervous."
- Focus on the conversation, not your performance
- Remember: they want you to succeed

**Physical Techniques**
- Power pose before entering (2 min in a private space)
- Slow, deep breaths (4 in, 4 hold, 4 out)
- Unclench your jaw and relax your shoulders
- Smile—it releases tension and positive hormones`
        }
      ],

      tips: [
        'Test your video setup before remote interviews',
        'Practice speaking out loud, not just in your head',
        'Record yourself to identify nervous habits',
        'Power pose before interviews to boost confidence',
        'Remember that interviewers want you to succeed'
      ]
    },
    {
      id: 'following-up',
      title: 'Following Up & Next Steps',
      icon: 'send',
      color: '#f59e0b',
      questions: 3,
      description: 'Handle post-interview communication professionally.',

      introduction: `The interview process doesn't end when you leave the room. Professional follow-up can reinforce your candidacy and help you stand out.`,

      keyQuestions: [
        {
          question: 'How should I follow up after an interview?',
          answer: `**The Follow-Up Framework**

**Timing**
- Send a thank-you email within 24 hours
- One email per interviewer is ideal
- Keep it brief—3-4 sentences

**Structure**
1. Thank them for their time
2. Reference something specific from your conversation
3. Reinforce your interest and fit
4. Express enthusiasm for next steps

**Example Email**:
"Hi [Name],

Thank you for taking the time to speak with me today about the Senior Engineer role. I especially enjoyed our discussion about [specific topic—e.g., your approach to scaling the recommendation system].

Our conversation reinforced my excitement about joining [Company] and contributing to [specific goal or project mentioned].

Looking forward to the next steps.

Best,
[Your Name]"

**What to Avoid**
- Generic copy-paste messages
- Overly long emails
- Asking about timeline/decision in the thank-you
- Following up too frequently`
        },
        {
          question: 'How do I handle waiting for a decision?',
          answer: `**Managing the Waiting Period**

**Set Expectations**
- Ask at the end of interviews: "What are the next steps and timeline?"
- Note the date they mention for follow-up

**Following Up on Timeline**
- Wait until after their stated timeline
- Send a brief, polite check-in:
  "Hi [Recruiter], I wanted to follow up on the [Role] position. I remain very interested and would love to hear about next steps when you have an update."

**If You Have a Deadline**
- Be transparent: "I have an offer with a deadline on [date]. [Company] is my first choice—is there any way to accelerate the process?"
- Give at least a week's notice if possible

**If Rejected**
- Respond graciously: "Thank you for letting me know. I enjoyed learning about [Company] and hope our paths cross again."
- Ask for feedback (they may or may not provide it)
- Connect on LinkedIn for future opportunities`
        }
      ],

      tips: [
        'Send thank-you emails within 24 hours',
        'Reference specific conversation points',
        'Don\'t ask about decisions in thank-you notes',
        'Follow up once after their stated timeline passes',
        'Respond graciously to rejections—bridges matter'
      ]
    },
    {
      id: 'adaptability-questions',
      title: 'Adaptability & Change',
      icon: 'refreshCw',
      color: '#06b6d4',
      questions: 5,
      description: 'Handling change, pivoting priorities, and adapting to new processes or tools.',

      introduction: `Adaptability is one of the most valued traits in tech. Companies evolve rapidly: strategies shift, reorgs happen, tech stacks change, and priorities pivot mid-sprint. Interviewers ask adaptability questions to assess whether you can thrive in ambiguity, embrace change constructively, and help your team navigate transitions without losing productivity or morale.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you had to adapt to a major change at work.',
          answer: `**STAR Framework**

**Situation**: "Our company was acquired, and the acquiring company mandated we migrate our entire backend from a monolith on AWS to microservices on GCP within 6 months."

**Task**: "As the tech lead, I needed to keep the team productive and morale high while learning an entirely new infrastructure platform and rearchitecting our services."

**Action**:
- "I spent the first week doing a rapid assessment: which services were critical path, which could migrate as-is, and which needed rearchitecting"
- "Created a phased migration plan with weekly milestones so the team could see progress"
- "Paired team members who were GCP-experienced (from the acquiring company) with our engineers for knowledge transfer"
- "Ran weekly retros specifically focused on the migration to surface blockers early"
- "Volunteered to migrate the most complex service myself to build expertise I could share"

**Result**: "We completed the migration in 5 months. Two engineers who initially resisted the change became GCP advocates. We actually improved our deployment pipeline in the process, reducing deploy times from 45 minutes to 8 minutes."

**Key Insight**: "I framed the change as an opportunity rather than a burden. People adapt faster when they can see personal growth in the transition."`
        },
        {
          question: 'How do you handle shifting priorities mid-project?',
          answer: `**Framework for Priority Changes**

**1. Understand the Why**
- Ask questions to understand the business reason: "What changed? What's the urgency?"
- Avoid emotional reactions: "This always happens" or "We wasted two weeks"
- Reframe internally: priorities shift because the business learned something new

**2. Assess the Impact**
- What can be paused vs. what must be finished?
- Are there dependencies other teams are counting on?
- What is the minimum viable deliverable for the current work?

**3. Communicate Transparently**
- Tell stakeholders what the shift means: "If we pivot to X, Y will be delayed by 2 weeks"
- Don't silently absorb scope: overcommitting leads to burnout and missed deadlines
- Document the decision so there's a record of the trade-off

**4. Execute the Pivot**
- Create a clean handoff for paused work (notes, branch state, next steps)
- Time-box ramp-up on the new priority
- Maintain a backlog of paused items so they don't get lost

**Example**: "In my last role, we were two weeks into a search infrastructure rewrite when leadership shifted our priority to an urgent integration with a new partner. I documented the search work state, estimated the integration at 3 weeks, and committed to resuming search after. We delivered the integration on time, and the documented state made resuming search seamless."`
        },
        {
          question: 'Describe a time you had to learn a new tool or process quickly.',
          answer: `**STAR Example**

**Situation**: "Our team adopted Kubernetes after years of deploying to bare EC2 instances. I had no container orchestration experience, and we had a production deployment target in 3 weeks."

**Task**: "I needed to become proficient enough in K8s to lead our first production deployment and support the on-call team."

**Action**:
- "I dedicated mornings to structured learning: official docs, a Udemy course, and the Kubernetes in Action book"
- "Afternoons I applied what I learned by containerizing our staging services"
- "Created a runbook for the team covering the 20% of K8s commands that cover 80% of daily operations"
- "Ran a lunch-and-learn where I deployed a service live and walked through troubleshooting"
- "Set up a sandbox cluster where the team could experiment safely"

**Result**: "Our first K8s production deployment went smoothly. The runbook I created became the team's go-to reference and was later adopted by two other teams. Within a month, I was comfortable debugging production K8s issues on call."

**Key Takeaway**: "I don't need to be an expert before starting. I learn fastest by combining structured study with hands-on application, and I multiply the value by teaching others."`
        }
      ],

      tips: [
        'Frame changes as opportunities, not obstacles',
        'Show that you take initiative during transitions rather than waiting for instructions',
        'Demonstrate empathy for teammates who struggle with change',
        'Highlight specific learning strategies you use to ramp up quickly',
        'Always quantify the positive outcome that resulted from adapting'
      ]
    },
    {
      id: 'work-life-balance',
      title: 'Work-Life Balance',
      icon: 'battery',
      color: '#22c55e',
      questions: 4,
      description: 'Sustainable pace, preventing burnout, setting boundaries, and managing energy.',

      introduction: `Work-life balance questions assess your self-awareness, sustainability, and maturity. Companies increasingly recognize that engineers who burn out deliver worse results. Interviewers want to know that you can maintain high performance over the long term, set healthy boundaries, and model sustainable practices for your team.

These questions also reveal your management style: do you expect 60-hour weeks from reports, or do you protect their time? Your answer signals what kind of culture you create.`,

      keyQuestions: [
        {
          question: 'How do you maintain work-life balance in a demanding role?',
          answer: `**My Sustainability Framework**

**Energy Management Over Time Management**
- I identify my peak hours (mornings for deep work, afternoons for meetings and reviews)
- I protect 2-3 hours of uninterrupted focus time daily
- I recognize early signs of burnout: declining code quality, irritability in reviews, dreading standups

**Deliberate Boundaries**
- I don't check Slack after 7pm unless I'm on call
- I block my calendar for lunch: eating at my desk feels productive but isn't
- I take all my PTO: I came back from a week off and solved a bug in 20 minutes that I'd been stuck on for days

**Sustainable Intensity**
- Sprints should be sustainable: if every sprint feels like a crunch, the planning is broken
- I distinguish between real emergencies (production down, data breach) and artificial urgency (someone wants it sooner)
- I push back on unrealistic timelines with data: "This is a 3-week project. We can deliver an MVP in 1 week or the full scope in 3."

**Example**: "During a product launch, I noticed my team working weekends for three weeks straight. I called it out in our retro, identified the root cause (scope creep from a stakeholder adding features mid-sprint), and set up a change request process. The next launch was completed in normal hours with better quality."`
        },
        {
          question: 'Tell me about a time you experienced burnout. How did you handle it?',
          answer: `**STAR Example**

**Situation**: "I was leading a critical migration while also being the on-call primary for our legacy system. I was context-switching between migration work during the day and incident response at night for about six weeks."

**Task**: "I needed to recognize and address my own burnout before it affected the team and the project."

**Action**:
- "I acknowledged it to myself first: I was making more mistakes in code review, getting frustrated in meetings, and dreading mornings"
- "I had an honest conversation with my manager: 'I'm stretched too thin and the quality of both responsibilities is suffering'"
- "We agreed to hand off on-call to another engineer and hire a contractor for part of the migration"
- "I took three consecutive days off—not vacation, just decompression"
- "When I returned, I established firmer boundaries: no meetings before 10am, on-call rotation with a backup"

**Result**: "Within two weeks, my productivity recovered. The migration was delivered on schedule. More importantly, my manager started checking in with the whole team about workload, and we formalized the rule that no one carries two critical responsibilities simultaneously."

**Key Insight**: "Burnout isn't a personal failing: it's a signal that the system is asking too much. Raising it early is a leadership act, not a weakness."`
        },
        {
          question: 'How do you handle a colleague or report who is burning out?',
          answer: `**Framework for Supporting Others**

**1. Notice the Signs**
- Decline in code quality or responsiveness
- Withdrawal from team activities, camera off in meetings
- Cynicism or negativity that's out of character
- Working long hours but shipping less

**2. Have the Conversation**
- Private, empathetic, specific: "I've noticed you seem stressed lately. How are you doing?"
- Don't diagnose: "You're burned out." Instead: "I want to make sure you're supported."
- Listen more than you talk

**3. Take Action**
- Reduce scope: "Let's deprioritize the docs update this sprint"
- Share the load: redistribute tasks temporarily
- Remove blockers: "I'll handle the stakeholder meeting so you can focus"
- Encourage time off: "Take Friday off. The codebase will be here Monday."

**4. Address the System**
- If one person is burning out, the system might be broken
- Raise workload concerns in planning: "We're consistently overcommitting"
- Advocate for realistic timelines and staffing

**Example**: "A junior engineer on my team was working until midnight but was too afraid to say anything because they thought it was expected. I noticed their commit timestamps, had a 1:1, and learned they were struggling with a task. I paired with them for an afternoon, we broke the task into smaller pieces, and I reassured them that asking for help early is a strength."`
        }
      ],

      tips: [
        'Show self-awareness: interviewers want to see you recognize your own limits',
        'Frame boundaries as a performance strategy, not laziness',
        'Demonstrate that you protect your team\'s sustainability, not just your own',
        'Have a specific example of preventing or recovering from burnout',
        'Avoid extremes: neither "I work all the time" nor "I never work past 5"'
      ]
    },
    {
      id: 'salary-negotiation',
      title: 'Salary Negotiation',
      icon: 'dollarSign',
      color: '#eab308',
      questions: 5,
      description: 'Total compensation, counter-offers, market research, and negotiation frameworks.',

      introduction: `Salary negotiation is one of the highest-ROI skills in your career. A single negotiation can be worth tens or hundreds of thousands of dollars over the course of a job. Yet most engineers skip it out of discomfort or fear of having the offer rescinded (which almost never happens at reputable companies).

Understanding total compensation (base, equity, bonus, sign-on, benefits), having market data, and using a structured negotiation framework transforms an uncomfortable conversation into a professional discussion.`,

      keyQuestions: [
        {
          question: 'How should I approach salary negotiation?',
          answer: `**The Negotiation Framework**

**1. Research Before You Negotiate**
- Use levels.fyi, Glassdoor, Blind, and Payscale for market data
- Know the company's pay bands if possible (some states require disclosure)
- Understand your leverage: competing offers, rare skills, strong interview performance

**2. Never Name a Number First**
- If asked for expectations: "I'd like to understand the full scope of the role before discussing compensation. What's the range for this position?"
- If pressed: give a range based on research, with your target as the bottom: "Based on my research, similar roles in this market pay $180K-$210K base"

**3. Negotiate the Whole Package**
- Base salary, equity/RSUs, annual bonus, sign-on bonus, relocation, PTO, remote flexibility
- If base is capped: "I understand the base is firm. Can we discuss a sign-on bonus to bridge the gap?"
- Equity vesting schedule and refresh grants matter enormously at public companies

**4. Use Competing Offers Professionally**
- "I'm very excited about this role. I also have an offer from [Company] at [total comp]. Is there flexibility to match?"
- Never bluff about offers you don't have
- Competing offers are the single strongest negotiation lever

**5. Get It in Writing**
- Verbal promises mean nothing: get the final offer letter before accepting
- Review stock details: vesting schedule, cliff, refresh policy, strike price (for options)`
        },
        {
          question: 'What are common negotiation mistakes?',
          answer: `**Mistakes That Cost You Money**

**Accepting the First Offer**
- First offers almost always have room: companies budget for negotiation
- Even a "final" offer often isn't: politely push back once

**Negotiating Only Base Salary**
- Equity can be 30-60% of total comp at senior levels
- Sign-on bonuses are often the easiest to increase
- Annual bonus percentages are usually fixed by level, but base affects the dollar amount

**Being Apologetic**
- Don't say: "I hate to ask, but..." or "I know this is a lot..."
- Do say: "I'm excited about the role. Based on my experience and market data, I believe [X] better reflects the value I'll bring."

**Revealing Your Current Salary**
- In many states, it's illegal for them to ask
- If asked: "I'd prefer to focus on the value of this role rather than my current compensation"
- Your current salary is irrelevant to what this role should pay

**Not Having a Walk-Away Number**
- Know your minimum before negotiations start
- If the offer is below your minimum, say so: "I appreciate the offer, but I'd need at least [X] to make the move"

**Negotiating Over Email When a Call Would Be Better**
- Complex negotiations benefit from real-time conversation
- Email is fine for simple counters; use a call for multi-variable negotiations`
        },
        {
          question: 'How do I evaluate total compensation?',
          answer: `**Total Compensation Breakdown**

**Annual Cash = Base Salary + Bonus**
- Base: your guaranteed monthly paycheck
- Bonus: typically 10-20% of base; may be discretionary or formulaic
- Ask: "What was the average bonus payout last year as a percentage of target?"

**Equity**
- RSUs (Restricted Stock Units): shares that vest over time, typically 4-year schedule with 1-year cliff
- Stock Options: right to buy shares at a strike price; only valuable if stock price exceeds strike
- Annual refresh grants: new RSUs granted each year on top of your initial grant
- Calculate annual equity value: total grant / vesting years for RSUs, or estimate for options

**One-Time Components**
- Sign-on bonus: cash paid at start, often with 1-year clawback if you leave
- Relocation package: moving expenses, temporary housing
- These don't recur, so don't weight them too heavily

**Benefits With Real Value**
- 401(k) match: a 6% match on a $200K salary is $12K/year free money
- Health insurance: employer contribution can be $10K-$20K/year
- PTO: an extra week of vacation has a calculable dollar value

**Example Comparison**:
- Offer A: $190K base + $40K/yr RSUs + 15% bonus = ~$258K total
- Offer B: $210K base + $20K/yr RSUs + 10% bonus = ~$251K total
- Offer A is actually higher despite lower base`
        }
      ],

      tips: [
        'Always negotiate: the worst outcome is they say the offer is firm',
        'Use levels.fyi and Blind for real compensation data at specific companies',
        'Negotiate after you have the offer in hand, never during interviews',
        'Consider total compensation, not just base salary',
        'Practice your negotiation script out loud before the call'
      ]
    },
    {
      id: 'questions-to-ask-interviewer',
      title: 'Questions to Ask Interviewers',
      icon: 'helpCircle',
      color: '#8b5cf6',
      questions: 4,
      description: 'Smart questions tailored for each interview round (recruiter, technical, hiring manager, VP).',

      introduction: `The questions you ask are as important as the answers you give. They demonstrate your critical thinking, reveal your priorities, and help you evaluate whether the company and role are right for you. Different interview rounds call for different types of questions: a recruiter expects process questions, a technical interviewer appreciates engineering depth, and a hiring manager wants to see strategic thinking.

Always prepare more questions than you think you'll need: 5-7 per round. Some will be answered during the conversation, so you need backups.`,

      keyQuestions: [
        {
          question: 'What questions should I ask the recruiter?',
          answer: `**Recruiter Round Questions**

The recruiter screen is about mutual fit and logistics. Focus on understanding the role, process, and timeline.

**Role Clarity**
- "Can you walk me through what a typical day looks like for this role?"
- "What are the top 2-3 priorities for this hire in the first 6 months?"
- "How large is the team, and what's the seniority distribution?"

**Process & Timeline**
- "What does the interview process look like from here?"
- "How many rounds should I expect, and what's the typical timeline?"
- "Are there any specific topics or technologies I should review?"

**Company & Culture**
- "What's the company's current growth stage and trajectory?"
- "How would you describe the engineering culture?"
- "What's the remote/hybrid policy?"

**Questions to Avoid with Recruiters**
- Deep technical questions (they likely can't answer)
- Salary demands (wait for the offer stage, though ranges are fair to ask)
- Negative questions about the company's competitors or challenges`
        },
        {
          question: 'What questions should I ask the technical interviewer?',
          answer: `**Technical Round Questions**

Your technical interviewer is usually a peer or senior engineer on the team. Ask about the actual engineering work.

**Technical Depth**
- "What does your tech stack look like, and how do you make technology decisions?"
- "What's the testing strategy? What percentage of code is covered by automated tests?"
- "How do you handle technical debt? Is there dedicated time for it?"
- "What does your CI/CD pipeline look like? How often do you deploy?"

**Engineering Culture**
- "How does the code review process work? What's the average review turnaround?"
- "How are architectural decisions made? Is there an ADR process?"
- "What's the on-call rotation like? How many incidents does the team handle per month?"

**Growth & Challenges**
- "What's the most interesting technical challenge the team has tackled recently?"
- "What's the biggest pain point in the current system?"
- "If you could change one thing about the engineering practices here, what would it be?"

**Why This Matters**: These questions show you care about engineering excellence, not just getting the job. They also give you critical information about whether you'll enjoy the day-to-day work.`
        },
        {
          question: 'What questions should I ask the hiring manager?',
          answer: `**Hiring Manager Round Questions**

The hiring manager evaluates leadership potential and team fit. Ask about expectations, growth, and team dynamics.

**Expectations & Success**
- "What does success look like for this role in the first 90 days? First year?"
- "What's the biggest challenge the team is facing that this hire will help address?"
- "How do you measure performance? What does the review process look like?"

**Team & Leadership**
- "How do you run your team? What's your management style?"
- "How do you handle disagreements between engineers on technical direction?"
- "Can you give an example of someone who has grown significantly on this team?"

**Strategic Direction**
- "What's on the team's roadmap for the next 6-12 months?"
- "How does this team's work connect to the company's broader goals?"
- "What's the team's relationship with product and design?"

**Red Flag Detection**
- "How long have the current team members been here?" (high turnover signal)
- "What happened to the person who previously held this role?"
- "How often do priorities change? How does the team handle that?"

**This round is mutual**: you're evaluating whether this manager will invest in your growth and create an environment where you can do your best work.`
        },
        {
          question: 'What questions should I ask a VP or skip-level interviewer?',
          answer: `**Executive/VP Round Questions**

A VP or director interview is about strategic alignment and culture. Ask big-picture questions that show you think beyond your immediate scope.

**Vision & Strategy**
- "What's the engineering organization's biggest priority this year?"
- "How do you balance investing in new features versus platform reliability?"
- "Where do you see this team/product in 2-3 years?"

**Culture & Values**
- "What's one thing about the engineering culture here that you're most proud of?"
- "How does the company invest in engineer growth and development?"
- "How are cross-team dependencies managed? Is there a platform team?"

**Organizational Health**
- "How do you handle situations where business priorities conflict with engineering quality?"
- "What's the biggest lesson the engineering org learned in the past year?"
- "How transparent is the company about its financial health and strategic direction?"

**Your Career**
- "What does the career ladder look like for senior engineers here? Is there a strong IC track?"
- "How do you identify and develop future tech leads and architects?"

**Tone**: Be confident but not aggressive. Executives appreciate thoughtful questions that show you're thinking about the company's success, not just your own role.`
        }
      ],

      tips: [
        'Prepare 5-7 questions per round; some will be answered naturally',
        'Tailor questions to the interviewer\'s role and seniority',
        'Never say "I don\'t have any questions" — it signals disinterest',
        'Use questions to evaluate the company, not just to impress',
        'Take notes on answers; reference them in follow-up emails'
      ]
    },
    {
      id: 'managing-constraints',
      title: 'Managing Constraints',
      icon: 'sliders',
      color: '#f43f5e',
      questions: 4,
      description: 'Working with limited resources, scope reduction, MVP thinking, and creative solutions.',

      introduction: `Every engineering team operates under constraints: limited time, limited budget, limited headcount, incomplete requirements, or legacy systems that can't be replaced overnight. Interviewers ask about constraints to see if you can deliver value despite imperfect conditions, rather than waiting for ideal circumstances that never arrive.

The best engineers don't just cope with constraints: they use them as a forcing function for creativity. Constraints drive simplicity, prioritization, and focus on what actually matters.`,

      keyQuestions: [
        {
          question: 'Tell me about a time you delivered results with limited resources.',
          answer: `**STAR Example**

**Situation**: "Our team of 3 engineers was asked to build a real-time analytics dashboard that a competitor had built with a team of 12. We had 8 weeks and no budget for additional hires or new infrastructure."

**Task**: "I needed to find a way to deliver a compelling analytics product with a fraction of the resources."

**Action**:
- "I started by analyzing what the competitor built vs. what our users actually needed. 60% of their features had low usage."
- "Proposed an MVP scope: 5 core metrics with real-time updates, deferring 15 nice-to-have metrics to phase 2"
- "Instead of building a custom streaming pipeline, I leveraged our existing PostgreSQL with materialized views refreshed every 30 seconds — 'near real-time' that was good enough for our use case"
- "Used an open-source charting library instead of building custom visualizations"
- "Each engineer owned 1-2 complete features end-to-end, minimizing coordination overhead"

**Result**: "We shipped the dashboard in 6 weeks. It covered the top 5 metrics that drove 80% of user decisions. Customer feedback was overwhelmingly positive. We added the deferred metrics over the next quarter with zero urgency, because the MVP turned out to be sufficient for most users."

**Key Lesson**: "Constraints force you to separate what's essential from what's nice-to-have. The 3-person team made faster decisions because there were fewer people to align."`
        },
        {
          question: 'How do you decide what to cut when scope exceeds capacity?',
          answer: `**Scope Reduction Framework**

**1. Categorize by Impact vs. Effort**
- Plot features on a 2x2 matrix: high impact/low effort (do first), high impact/high effort (plan carefully), low impact/low effort (do if time), low impact/high effort (cut)
- Be honest about impact: "Users want this" is different from "Users need this"

**2. Define the MVP Rigorously**
- "What is the minimum functionality that solves the user's core problem?"
- The MVP is not a worse version of the full product: it's a focused version of the most important part
- Example: MVP of a search feature is keyword search with relevant results. Filters, autocomplete, and "did you mean" are enhancements.

**3. Negotiate with Stakeholders**
- Present options, not just cuts: "We can deliver A+B in 4 weeks or A+B+C in 7 weeks"
- Make trade-offs explicit: "Adding feature C delays the launch by 3 weeks and delays the revenue impact"
- Let the business decide the priority order; your job is to make the trade-offs clear

**4. Defer, Don't Delete**
- Maintain a "Phase 2" backlog of deferred items
- Document why each item was deferred and the conditions for including it
- This reassures stakeholders that their needs aren't being ignored

**5. Revisit After Launch**
- Measure actual usage of the MVP features
- Often, deferred features turn out to be unnecessary based on real user behavior
- This retroactively validates the scope cut`
        },
        {
          question: 'Describe a creative solution you found when the obvious approach wasn\'t feasible.',
          answer: `**STAR Example**

**Situation**: "We needed to implement full-text search across 50 million product listings. The obvious solution was Elasticsearch, but our ops team had no experience with it, and we had no budget for a managed service."

**Task**: "Find a search solution that was good enough for our needs without introducing a new complex system."

**Action**:
- "I researched alternatives and discovered PostgreSQL's built-in full-text search with tsvector/tsquery"
- "Ran benchmarks: for our query patterns (simple keyword search with category filtering), PostgreSQL FTS handled 500 queries/sec with p99 under 200ms"
- "Added GIN indexes on the search columns and a materialized view for the search index"
- "Implemented search ranking using ts_rank with weight boosting for title matches over description matches"
- "Set up a monitoring dashboard so we'd know when to upgrade to a dedicated search engine"

**Result**: "PostgreSQL FTS served us for 18 months. When we finally outgrew it (needed fuzzy matching and synonyms), we had the time and team expertise to properly evaluate Elasticsearch vs. Meilisearch. We chose Meilisearch, which was simpler to operate. The PostgreSQL bridge saved us 6 months of premature optimization and let us ship the feature 8 weeks ahead of what an Elasticsearch setup would have required."

**Key Takeaway**: "The best solution isn't always the most sophisticated. Sometimes the boring technology you already have is the right answer. The creative part is recognizing when 'good enough' truly is good enough."`
        }
      ],

      tips: [
        'Frame constraints positively: they force better prioritization and simpler designs',
        'Always present options with trade-offs rather than just saying "we can\'t"',
        'Show that you differentiate between essential complexity and accidental complexity',
        'Demonstrate MVP thinking: what is the minimum that delivers real value?',
        'Have an example where a constraint led to a better outcome than unlimited resources would have'
      ]
    },
  ];

  // Company-Specific Prep
