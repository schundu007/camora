// Agentic AI Engineering — interview prep covering multi-agent orchestration,
// async long-running tools, and context window management for persistent agents.

export const agenticCategories = [
  { id: 'agentic-patterns', name: 'Agentic Orchestration', icon: 'network', color: '#6366f1' },
  { id: 'agentic-async',    name: 'Async & Context Management', icon: 'clock',   color: '#0ea5e9' },
];

export const agenticTopicCategoryMap = {
  'multi-agent-langgraph-supervisor':    'agentic-patterns',
  'async-long-running-tools':            'agentic-async',
  'context-window-mgmt-persistent':      'agentic-async',
};

export const agenticTopics = [
  {
    id: 'multi-agent-langgraph-supervisor',
    title: 'Multi-Agent Systems with LangGraph',
    icon: 'network',
    color: '#6366f1',
    questions: 8,
    description: 'Design multi-agent pipelines using the LangGraph Supervisor pattern. Covers StateGraph construction, TypedDict shared state, add_messages reducer, checkpointers, human-in-the-loop interrupts, parallel branches, and error routing between specialist agents.',
    visualizations: [
      { type: 'architecture', caption: 'LangGraph Supervisor Architecture', image: '/diagrams/agentic/langgraph-supervisor.png' },
      { type: 'workflow',     caption: 'State and Message Flow',            image: '/diagrams/agentic/langgraph-state-flow.png' },
    ],
    introduction: `Multi-agent systems divide complex tasks across **specialist agents** that each focus on one narrow concern. **LangGraph** is the graph-based orchestration layer that wires them together — it turns agents into graph nodes and messages into edges, giving you explicit control over routing, state, and persistence that a single monolithic agent chain cannot provide.

## LangGraph Fundamentals

LangGraph models execution as a **directed graph**. Nodes are Python functions (or Runnables) that take the current state and return an updated state. Edges connect nodes and can be **conditional** — the graph decides the next node based on the current state value. A **StateGraph** is compiled into a runnable graph object with a stream or invoke interface. The core objects are:

- **StateGraph** — the graph builder
- The **compiled graph** (via .compile()) — the runnable
- A **state TypedDict** — the shared data model
- An optional **checkpointer** — for persistence

The state schema is defined as a Python **TypedDict**. Every node receives the full state dict and returns a partial dict of updates. LangGraph merges the partial dict using **reducers**. The built-in **add_messages** reducer appends to a messages list rather than replacing it — this is the fundamental primitive that enables multi-turn conversation within a graph.

## The Supervisor Pattern

The **Supervisor pattern** introduces a router node that sits above all specialist agents. It reads the latest message in state and decides which agent should handle the next step. The supervisor does not perform work itself — it dispatches. Specialist agents perform work and return results by appending to the messages list. The graph loops back to the supervisor after each agent completes.

For a Researcher-Writer pipeline: the supervisor first routes to the Researcher node. The Researcher uses web search tools, appends a structured research summary to messages, and returns. The supervisor reads that summary and routes to the Writer. The Writer drafts a report and appends the draft. The supervisor may route back to the Researcher for a gap-fill pass, or terminate with the final draft.

## Shared State and Message Passing

The state **TypedDict** carries all inter-agent communication. A minimal schema:

\`\`\`python
from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    research_complete: bool
    report_draft: str
\`\`\`

Each agent reads from messages — a list of HumanMessage, AIMessage, and ToolMessage objects — and returns new messages appended by the reducer. Agents never call each other directly; all communication flows through shared state.

## Checkpointers for State Persistence

A **checkpointer** persists the full state snapshot at every superstep. Options:

- **MemorySaver** — in-memory dict, suitable for development and testing
- **SqliteSaver** — persists to disk, survives process restarts, single-process only
- **PostgresSaver** — production choice, supports concurrent writers, horizontally scalable

The checkpointer is passed at compile time: graph.compile(checkpointer=SqliteSaver.from_conn_string("checkpoints.db")). Every invoke or stream call accepts a config dict with a **thread_id** — same thread_id resumes an existing session; a new thread_id starts a fresh execution.

## Human-in-the-Loop

LangGraph's **interrupt_before** and **interrupt_after** mechanisms pause execution at a named node boundary. When compiled with interrupt_before=["writer"], execution halts before the Writer node runs. The caller can inspect state, modify it via graph.update_state(), and resume by calling invoke again with the same thread_id.

> [!TIP] Use interrupt_before=["writer"] to show users the research summary and get approval before committing to a full report draft — a zero-cost way to add a human quality gate.

## Error Handling and Fallback Routing

The supervisor's routing function can inspect the last message for error markers. If the Researcher returns a low-confidence result, the supervisor routes to a **Fallback node** or **RetryResearcher node** with a revised query. LangGraph's conditional edges accept a Python function returning the next node name as a string.

> [!WARNING] Add a max_iterations counter in state and route to END when it exceeds a threshold. Without it, a misbehaving supervisor can loop indefinitely between specialist agents.`,

    quickFire: [
      { q: 'What is a LangGraph StateGraph?', a: 'A **directed graph** where nodes are Python functions that transform **state** and edges (including **conditional edges**) determine control flow based on state values.' },
      { q: 'What does the add_messages reducer do?', a: 'It **appends** new messages to the existing messages list in state rather than replacing the entire list — enables **multi-turn accumulation** across nodes.' },
      { q: 'What is the Supervisor pattern?', a: 'A **router node** that reads the current state and dispatches to **specialist agent nodes** based on what step is needed next; it does not perform work itself.' },
      { q: 'How do agents communicate in LangGraph?', a: 'Through the **shared TypedDict state** — each agent appends to the messages list; **no direct agent-to-agent calls** exist.' },
      { q: 'What is MemorySaver vs SqliteSaver?', a: '**MemorySaver** is an in-memory checkpointer for dev and testing; **SqliteSaver** persists to disk and survives process restarts; both use **thread_id** as the session key.' },
      { q: 'What is a thread_id in LangGraph?', a: 'A string key that **scopes the checkpointer state** — same **thread_id** resumes an existing session; a new **thread_id** starts a fresh one.' },
      { q: 'How does interrupt_before work?', a: 'Compiled with **interrupt_before=["node_name"]**, the graph **pauses** before that node runs and returns control to the caller; resume by calling **invoke** again on the same **thread_id**.' },
      { q: 'What is a conditional edge in LangGraph?', a: 'An edge whose target node is determined by a **Python function** that reads state and returns the **next node name** as a string — the mechanism for all **routing logic**.' },
      { q: 'How do you run two agents in parallel in LangGraph?', a: 'Add both node names as targets in a list from a single edge — LangGraph executes them as a **parallel superstep** and merges their **state updates** via reducers.' },
      { q: 'What is a superstep in LangGraph?', a: 'One round of execution across all nodes that fire in the same batch — parallel nodes execute within a single **superstep**; the **checkpointer** snapshots state after each superstep.' },
      { q: 'How do you terminate a LangGraph graph?', a: 'Route the supervisor **conditional edge** to **END** (the special LangGraph terminal node) when the task is complete.' },
      { q: 'What Python type annotation enables the add_messages reducer on a field?', a: '**Annotated[list[BaseMessage], add_messages]** — the `Annotated` type from **typing** combined with the **add_messages** reducer from `langgraph.graph.message`.' },
    ],
    keyQuestions: [
      {
        question: 'Design a multi-agent system where a Researcher agent gathers data from the web, and a Writer agent drafts a report. How do they communicate, and how do you handle state?',
        answer: `The standard LangGraph answer is the **Supervisor pattern** with a shared **TypedDict** state. The graph has four nodes: Supervisor, Researcher, Writer, and END. The Supervisor is the routing hub; Researcher and Writer are the specialist workers.

## State Design

Define a **TypedDict** state with an **add_messages** reducer plus domain-specific flags:

\`\`\`python
from typing import TypedDict, Annotated, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages

class ReportState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    research_complete: bool
    research_summary: str
    report_draft: str
    next: str  # which node supervisor targets
\`\`\`

## Agent Nodes

The **Researcher** node binds a web search tool (Tavily, SerpAPI) to an LLM, runs the ReAct loop, and returns updated state with research_complete=True and research_summary filled. The **Writer** node reads research_summary and messages, calls the LLM with a drafting prompt, and returns updated state with report_draft filled.

The **Supervisor** node reads state and returns {"next": "researcher" | "writer" | "end"} based on the flags.

## Graph Construction

\`\`\`python
from langgraph.graph import StateGraph, END

workflow = StateGraph(ReportState)
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("researcher", researcher_node)
workflow.add_node("writer", writer_node)
workflow.set_entry_point("supervisor")
workflow.add_conditional_edges(
    "supervisor",
    lambda s: s["next"],
    {"researcher": "researcher", "writer": "writer", "end": END}
)
workflow.add_edge("researcher", "supervisor")
workflow.add_edge("writer", "supervisor")
graph = workflow.compile(checkpointer=SqliteSaver.from_conn_string("sessions.db"))
\`\`\`

This loop — supervisor dispatches, specialist acts, supervisor re-evaluates — continues until the supervisor returns "end".

> [!NOTE] Communication between agents is entirely through state: the Writer reads what the Researcher deposited into messages and research_summary. Neither node calls the other directly.

> [!TIP] The **checkpointer** makes every superstep durable — if the process crashes mid-report, calling invoke with the same thread_id resumes from the last checkpoint.`,
      },
      {
        question: 'How does state persistence work in LangGraph? What is the difference between MemorySaver and SqliteSaver?',
        answer: `LangGraph's persistence model snapshots the full state **TypedDict** after every superstep. The snapshot is keyed by (thread_id, checkpoint_id) — thread_id is caller-supplied, checkpoint_id is an incrementing counter. When you call invoke or stream with a config containing thread_id, LangGraph loads the latest checkpoint for that thread, resumes execution, and writes a new checkpoint after each superstep.

## Checkpointer Comparison

- **MemorySaver** — stores snapshots in a Python dict in process memory. Zero-configuration, no dependencies. State disappears on process exit. Cannot be shared across multiple processes.

- **SqliteSaver** — persists checkpoints to a SQLite file on disk. Survives process restarts. Suitable for single-server deployments, local CLI agents, and desktop applications. SQLite's write serialization makes it unsuitable for high-concurrency multi-process scenarios.

- **PostgresSaver** (langgraph-checkpoint-postgres) — the production choice. Uses a PostgreSQL table, supports concurrent writers via row-level locking, works across horizontally scaled worker processes. Schema is managed automatically; configuration is a standard psycopg connection string.

\`\`\`python
# Development
from langgraph.checkpoint.memory import MemorySaver
graph = workflow.compile(checkpointer=MemorySaver())

# Single-process production
from langgraph.checkpoint.sqlite import SqliteSaver
graph = workflow.compile(checkpointer=SqliteSaver.from_conn_string("sessions.db"))

# Multi-process production
from langgraph.checkpoint.postgres import PostgresSaver
graph = workflow.compile(checkpointer=PostgresSaver.from_conn_string(DATABASE_URL))
\`\`\`

> [!IMPORTANT] The interface is identical across all three checkpointers — swapping them at compile time is a one-line change with no graph logic changes required.

The practical rule: use **MemorySaver** during local development, **SqliteSaver** for single-process production tools (CLI agents, desktop apps), and **PostgresSaver** for any web-facing multi-process deployment.`,
      },
      {
        question: 'How do you run the Researcher and Writer agents in parallel instead of sequentially?',
        answer: `LangGraph executes nodes **in parallel** when they are all listed as destinations from the same source edge. Rather than routing sequentially through the Supervisor, you fan out from a single orchestrator node by listing multiple node names as edge targets.

## Parallel Fan-Out Pattern

For genuinely independent work — for example, a **FactChecker** and a **CitationFinder** both running on the same initial query — parallel execution looks like:

\`\`\`python
workflow.add_node("fork", fork_node)           # no-op, just fans out
workflow.add_node("fact_checker", fc_node)
workflow.add_node("citation_finder", cf_node)
workflow.add_node("merger", merger_node)
workflow.add_edge("fork", ["fact_checker", "citation_finder"])  # parallel fan-out
workflow.add_edge("fact_checker", "merger")
workflow.add_edge("citation_finder", "merger")
\`\`\`

LangGraph executes fact_checker and citation_finder as a **single superstep**. Their state updates are both passed to the merger node after both complete. The **add_messages** reducer handles concurrent appends to the messages list safely — LangGraph merges the partial state dicts before the next node runs.

> [!WARNING] For the Researcher-Writer case specifically, the canonical answer is sequential with a checkpoint between them, not parallel. The Writer's quality depends entirely on the Researcher's output — introducing parallelism means the Writer drafts without research context, which defeats the purpose.

> [!TIP] Save parallel fan-out for genuinely independent subtasks: multi-source retrieval, concurrent tool calls, or segment-level analysis. When tasks have data dependencies, keep them sequential.`,
      },
      {
        question: 'How do you add a human approval checkpoint between the Researcher and Writer stages?',
        answer: `LangGraph's **interrupt_before** mechanism pauses graph execution at a named node boundary and returns control to the caller with the current state. The caller inspects state, optionally modifies it, and resumes by calling invoke or stream again on the same **thread_id**.

## Compiling with an Interrupt

To add an approval gate between Researcher and Writer, compile with interrupt_before=["writer"]:

\`\`\`python
graph = workflow.compile(
    checkpointer=SqliteSaver.from_conn_string("sessions.db"),
    interrupt_before=["writer"]
)
\`\`\`

When the Supervisor routes to Writer, execution halts before the Writer node fires. The invoke call returns with the current state — including the research_summary the Researcher deposited.

## Resuming After Approval

\`\`\`python
config = {"configurable": {"thread_id": session_id}}

# Resume with no changes (user approved)
result = graph.invoke(None, config=config)

# Resume with modifications (user refined the research brief)
graph.update_state(config, {"research_summary": refined_summary})
result = graph.invoke(None, config=config)
\`\`\`

To reject and terminate — simply do not call invoke again. The checkpointed state remains but the thread goes no further.

> [!NOTE] interrupt_after=["researcher"] is the symmetric alternative: it halts after the Researcher node completes (state update already committed) rather than before the Writer starts. For an approval gate where the human reviews research before writing begins, interrupt_before=["writer"] is the idiomatic choice.

> [!TIP] Use graph.get_state(config) to retrieve the current state and display it to the user before asking for approval — the research summary, citations, and any metadata the Researcher stored are all accessible.`,
      },
    ],
    tips: [
      'Always define state as a TypedDict with explicit field types -- LangGraph uses the schema for serialization in checkpointers and validation catches field mismatches early.',
      'The add_messages reducer is not optional for conversation agents -- without it, every node that returns messages replaces the entire list and you lose conversation history.',
      'Supervisor routing logic should be a pure function of state -- avoid side effects in the routing function or you will not be able to replay checkpointed runs deterministically.',
      'Name your nodes with verbs that describe the action, not the agent name -- "research", "draft", "review" is clearer than "researcher_agent_node_v2".',
      'Use thread_id as the primary session boundary in your API -- each user session gets its own thread_id, which scopes the entire checkpointed state for that conversation.',
      'Test your graph by streaming rather than invoking -- stream yields each superstep as it completes and makes it obvious which node produced which state update.',
      'For production Supervisor patterns, add a max_iterations guard in state (e.g., iteration_count: int) and route to END when it exceeds a threshold -- prevents infinite routing loops.',
    ],
    references: [
      'https://langchain-ai.github.io/langgraph/tutorials/multi_agent/agent_supervisor/',
      'https://langchain-ai.github.io/langgraph/concepts/low_level/',
      'https://langchain-ai.github.io/langgraph/concepts/persistence/',
      'https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/interrupt-before/',
      'https://langchain-ai.github.io/langgraph/reference/checkpoints/',
      'https://python.langchain.com/docs/concepts/messages/',
    ],
  },

  {
    id: 'async-long-running-tools',
    title: 'Async Long-Running Tool Calls',
    icon: 'clock',
    color: '#0ea5e9',
    questions: 7,
    description: 'Handling tool calls that take minutes rather than seconds -- checkpoint-and-suspend patterns, async polling, webhook resumption, SSE progress streaming, durable execution with Temporal and Step Functions, and idempotency requirements for retriable tool invocations.',
    visualizations: [
      { type: 'architecture', caption: 'Checkpoint + Webhook Resume Pattern', image: '/diagrams/agentic/async-checkpoint-webhook.png' },
      { type: 'workflow',     caption: 'Retry Counter and Circuit Breaker',   image: '/diagrams/agentic/async-retry-state.png' },
    ],
    introduction: `Standard LLM tool use assumes the tool returns within the inference timeout window — typically a few seconds. A data pipeline, a batch job, a video transcoding task, or a model fine-tuning run can take five minutes to an hour. Bridging that gap without holding an open server connection requires patterns at the intersection of agentic orchestration and distributed systems.

## The Fundamental Mismatch

LLMs are designed for **synchronous request-response** cycles. Inference infrastructure (API servers, load balancers, connection pools) is built around this assumption with hard timeouts typically in the 30-60 second range. A 5-minute pipeline run violates every timeout at every layer of the stack.

The solution is never to hold the connection open. Instead, the agent must:
- Initiate the long-running task
- Record that it has been initiated (store **job_id** in state)
- Immediately release the connection
- Resume from a **checkpointer** snapshot when the task completes

This requires: a **checkpointer** to persist agent state, a **webhook** mechanism for the external task to notify completion, and **idempotent** tool invocations so safe retry is possible.

## Pattern 1: Checkpoint-Suspend-Webhook-Resume

This is the canonical pattern for LangGraph. The tool invocation node starts the external pipeline, receives a **job_id**, stores it in state, then triggers a graph interrupt. The graph suspends. When the external pipeline completes, it sends a webhook to your application server. The webhook handler looks up the thread_id for that job_id, writes the result into agent state via graph.update_state(), and calls graph.invoke() with the same thread_id.

\`\`\`python
class PipelineState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    job_id: str | None
    job_status: Literal["idle", "running", "complete", "failed"]
    pipeline_result: dict | None
    idempotency_key: str | None
    started_at: str | None
\`\`\`

> [!IMPORTANT] Generate the **idempotency key** in state before triggering the pipeline. If the agent crashes and replays, the same key is passed to the pipeline service, which returns the existing job_id rather than starting a second run.

## Pattern 2: Async Polling

When webhooks are not available (third-party services that only expose status endpoints), a **polling node** checks the status endpoint and loops back until complete, using exponential backoff between polls. The trade-off: polling holds a live execution thread. For jobs longer than a few minutes, the checkpoint-suspend-webhook pattern is superior.

## Pattern 3: SSE Streaming for User Experience

**Server-Sent Events (SSE)** provide a standard mechanism for pushing progress updates from server to browser. When the pipeline is triggered, the server sends a stream: "status: pipeline started", "status: 20% complete", "status: complete, resuming agent". The agent logic is decoupled from the SSE stream — the webhook-resume path handles actual graph resumption.

## Durable Execution: Temporal and Step Functions

For workflows spanning hours or days, LangGraph checkpointers are often insufficient — they are optimized for conversation-length persistence. **Temporal** and **AWS Step Functions** provide durable execution primitives: activity retries with configurable policies, workflow versioning, event history replay, and saga patterns for multi-step compensation.

> [!TIP] Use Temporal or Step Functions when you need exactly-once execution guarantees, multi-hour fault tolerance, or saga-pattern compensation logic — LangGraph checkpoints are not designed for workflow-engine durability at that scale.`,

    quickFire: [
      { q: 'Why can you not hold an LLM context thread open for a 5-minute tool call?', a: 'Inference infrastructure has **hard timeouts (30–60 seconds)** at every layer — API servers, load balancers, and connection pools are all built for **synchronous request-response** latency.' },
      { q: 'What are the three things required for checkpoint-suspend-webhook-resume?', a: 'A **checkpointer** to persist state, a **webhook endpoint** so the external task can notify completion, and **idempotent** tool invocations so safe retry is possible.' },
      { q: 'What is the difference between interrupt_before and interrupt_after for the suspend pattern?', a: '**interrupt_before** halts before the named node fires (prior state is visible); **interrupt_after** halts after the node completes and its **state updates** are committed.' },
      { q: 'Why is polling inferior to webhooks for long-running jobs?', a: '**Polling** holds a live thread and adds latency; **webhooks** resume the agent immediately when the job completes with **no thread held**.' },
      { q: 'What is an idempotency key in the context of async tool calls?', a: 'A **UUID** generated by the agent before the tool call, stored in state, and passed to the tool server — the server **deduplicates** on it so retries after crashes do not trigger the job twice.' },
      { q: 'When should you use Temporal instead of LangGraph checkpointers?', a: 'When durability spans **hours or days**, when **exactly-once** side-effect guarantees are needed, or when multi-step compensation (**saga pattern**) is required.' },
      { q: 'What state fields belong in a PipelineState TypedDict for this pattern?', a: '**job_id**, **job_status** (idle/running/complete/failed), **pipeline_result**, **started_at**, and an **idempotency_key** — plus messages for LLM conversation continuity.' },
      { q: 'How does the webhook handler resume a suspended LangGraph graph?', a: 'It looks up the **thread_id** for the **job_id**, calls **graph.update_state()** with the result, then calls **graph.invoke(None, config=config)** to resume.' },
      { q: 'What is SSE and why is it the right UX choice for long-running operations?', a: '**Server-Sent Events** — a standard HTTP streaming protocol for **server-to-client push**. A single persistent HTTP connection delivers progress events in real time without **WebSocket** complexity.' },
      { q: 'What exponential backoff policy makes sense for a polling node?', a: 'Start at **2 seconds**, double each attempt up to a **60-second ceiling**, with **jitter** (±10%) to prevent **thundering-herd** spikes when many jobs complete simultaneously.' },
    ],
    keyQuestions: [
      {
        question: 'How do you handle long-running asynchronous tool calls? For example, if an agent triggers a data pipeline that takes 5 minutes, how do you manage the agent\'s state and the user experience?',
        answer: `The **checkpoint-suspend-webhook-resume** pattern is the correct answer. The key insight: the agent must never hold an open connection waiting for the pipeline — instead it triggers, suspends, and resumes.

## Step 1: Generate Idempotency Key

Generate an **idempotency key** (UUID) and store it in state before triggering the pipeline. If the agent crashes and replays, the same key is passed to the pipeline service, which returns the existing job_id rather than starting a second run.

## Step 2: Trigger and Suspend

The pipeline trigger node calls the external pipeline HTTP API with the idempotency key, receives a job_id, and stores both in state with job_status="running". The graph then hits interrupt_after=["trigger_pipeline"] and execution halts. The calling HTTP request returns to the user with status "pipeline started".

## Step 3: Webhook Resume

When the external pipeline completes, it sends a POST to your webhook endpoint with the job_id and result payload:

\`\`\`python
# Webhook handler resumes a suspended graph
config = {"configurable": {"thread_id": thread_id}}
graph.update_state(config, {
    "job_status": "complete",
    "pipeline_result": result
})
graph.invoke(None, config=config)
\`\`\`

The graph resumes at the node after the suspended point. The next node reads pipeline_result from state and proceeds with downstream LLM analysis.

## SSE for User Experience

An **SSE stream** runs in parallel with the webhook path. When the pipeline trigger fires, the server opens an SSE channel keyed to the session. A background process monitors job status — polling the jobs table or subscribing to a **Redis pub/sub** channel that the webhook handler publishes to — and emits progress events like data: {status: running, pct: 20}. The frontend renders a live progress bar.

> [!NOTE] This architecture cleanly separates the agent **control plane** (LangGraph state + checkpointer) from the real-time **UX plane** (SSE), with no threads held and no polling loops in the hot path.`,
      },
      {
        question: 'What happens if the agent process crashes while waiting for the 5-minute pipeline? How do you recover?',
        answer: `Recovery depends on the crash point. There are three distinct failure windows, each with a different recovery path.

## Crash Before job_id Is Stored

The LangGraph checkpoint does not include the job_id. Resuming the thread replays the pipeline trigger node. This is the **idempotency key's** job — the trigger node generates the key before calling the pipeline and stores it in state. That key is committed to the checkpoint before the external call goes out. On replay, the same key is passed to the pipeline service, which returns the existing job_id rather than starting a new run.

\`\`\`python
# Structure the trigger node as atomic steps — commit key before calling pipeline
graph.update_state(config, {"idempotency_key": key})   # Step 1: durable
job_id = pipeline_client.start(idempotency_key=key)     # Step 2: external call
graph.update_state(config, {"job_id": job_id, "job_status": "running"})  # Step 3
\`\`\`

> [!IMPORTANT] The checkpointer writes after each update_state call, so the idempotency key is durable before the external call fires. This ordering guarantee is what makes replay safe.

## Crash While Suspended (Waiting for Webhook)

The checkpoint preserves job_id and job_status="running". The pipeline continues unaware of the crash. When the webhook arrives, the handler looks up the thread_id by job_id (stored in a jobs table) and calls update_state plus invoke. The fresh process loads the checkpoint and resumes normally. Zero loss.

## Crash of the Webhook Handler

The job_status was written to the checkpoint by update_state but invoke did not finish. On the next invoke attempt — triggered by a webhook retry, or by a background reconciliation job — the graph resumes from the committed state.

> [!TIP] The **reconciliation job** is the safety net — it scans jobs where job_status="running" and started_at is older than (pipeline_max_duration + buffer), checks the external pipeline status endpoint, and fires the webhook handler logic manually for any completed jobs with missed webhook delivery. Build this from day one, not after the first production incident.

The practical deployment pattern: **webhook handler + reconciliation cron job** running every 10 minutes. Webhooks fail; reconciliation catches missed completions.`,
      },
      {
        question: 'How would you design the user experience so the user knows what is happening during a 5-minute wait?',
        answer: `The UX for a long-running async operation has three layers: **immediate acknowledgment**, **continuous progress feedback**, and a **crisp completion transition**.

## Immediate Acknowledgment

When the user triggers the action, the response must return within 200ms — before the pipeline is even contacted. The response confirms "request received, pipeline starting" and returns a **session token** or thread_id the frontend can use to subscribe to progress.

> [!IMPORTANT] Never make the user wait for the pipeline trigger call itself. The HTTP response that initiates the pipeline and the HTTP response to the user are two separate calls.

## Continuous Progress

The frontend opens an **SSE connection** to GET /api/sessions/{thread_id}/progress immediately after receiving the session token. The server maintains a status record in Redis or a jobs table. As the pipeline emits progress events, the SSE stream pushes them to the client:

- "Fetching schema metadata (step 1 of 4)"
- "Running data quality checks (step 2 of 4)"
- "Building feature table (step 3 of 4)"

If the external pipeline does not emit granular progress, emit **time-based pseudo-progress**: "Started 1 minute ago, estimated 4 minutes remaining" based on historical average duration. A determinate progress bar is far better than an indeterminate spinner even when approximate.

## Completion Transition

When the pipeline finishes and the agent resumes, the SSE stream emits a completion event with the agent's next output. The frontend transitions from the progress view to the agent response in a single smooth state update — no page reload, no manual refresh button. If the user has navigated away, push a browser notification and display a badge on the session tab.

## Error States

If the pipeline fails, the SSE stream emits an error event with a **human-readable message**: "Data quality check failed: 12% of records have null user_id — see report." The agent's error-handling node generates an actionable suggestion.

> [!WARNING] Never show a raw stack trace or timeout error to the user. All infrastructure errors must be translated into human-readable messages with a suggested next action before reaching the UI.`,
      },
    ],
    tips: [
      'Generate the idempotency key in state before making the external tool call -- never after. The key must be in the checkpoint before the side effect fires so replay is safe.',
      'Use interrupt_after for the trigger node, not interrupt_before for the next node -- this ensures the job_id is written to state before the graph suspends.',
      'Build a reconciliation job from day one, not after the first production incident. Webhooks fail; reconciliation is the safety net that catches missed completions.',
      'Keep the jobs table (job_id -> thread_id mapping) in your primary database, not in agent state alone -- the webhook handler needs to look up thread_id without loading the full LangGraph checkpoint.',
      'Cap polling frequency at one request per 5 seconds minimum for any long-running job -- overly aggressive polling is a common source of rate limit errors from pipeline APIs.',
      'Design the SSE progress stream as append-only events, not state replacements -- a reconnecting client can request events after a given sequence number and replay missed updates.',
      'For Temporal-based workflows, map each pipeline stage to a Temporal Activity with its own retry policy -- this gives you per-stage retry tuning rather than all-or-nothing workflow retries.',
    ],
    references: [
      'https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/interrupt-before/',
      'https://langchain-ai.github.io/langgraph/concepts/persistence/',
      'https://docs.temporal.io/develop/python/core-application',
      'https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html',
      'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events',
      'https://langchain-ai.github.io/langgraph/reference/graphs/#langgraph.graph.state.CompiledStateGraph.update_state',
    ],
  },

  {
    id: 'context-window-mgmt-persistent',
    title: 'Context Window Management for Persistent Agents',
    icon: 'clock',
    color: '#0ea5e9',
    questions: 6,
    description: 'Managing token budgets in multi-day, multi-turn agents -- sliding window truncation, LangGraph summarization nodes with the trim_messages utility, vector DB offloading of episodic memory, hybrid summarization-plus-retrieval architectures, and the LangGraph 0.3+ Store API for cross-thread persistent memory.',
    visualizations: [
      { type: 'architecture', caption: '3-Tier Context Window Architecture', image: '/diagrams/agentic/context-window-mgmt.png' },
      { type: 'workflow',     caption: 'Summarization Node Flow',            image: '/diagrams/agentic/summarization-flow.png' },
    ],
    introduction: `**The Problem**

Production agents that span days or weeks face a hard physical constraint: the **LLM context window**. Claude 3.5 Sonnet and GPT-4o both offer 128K-token windows. A multi-day conversation — including tool call round-trips, retrieved documents, and verbose AI responses — can accumulate **tens of thousands of tokens per hour**. Within one business day, the raw history exceeds the context limit.

> [!WARNING] Context window overflow is not just a technical error — it is a **user experience failure**. An agent that cannot remember a key constraint the user specified two hours ago is not useful as a persistent assistant.

**Strategy 1: Sliding Window Truncation**

Keep only the last N messages in the prompt. LangGraph provides \`trim_messages()\` as a utility:

\`\`\`python
from langchain_core.messages import trim_messages

trimmed = trim_messages(
    state["messages"],
    max_tokens=4000,
    token_counter=ChatAnthropic(model="claude-sonnet-4-5"),
    strategy="last",
    include_system=True,
    allow_partial=False,
)
\`\`\`

> [!WARNING] Critical weakness: **early context is permanently lost**. If the user specified a constraint on day one ("never recommend solutions that require vendor lock-in"), that constraint disappears from the window and the model behaves as if it was never stated.

**Strategy 2: Summarization Node**

A **summarization node** compresses old messages into a running summary when the message count or token count exceeds a threshold. The summary becomes a synthetic message at the top of the context; raw messages it replaced are discarded.

In LangGraph, a conditional edge routes to the \`summarize_node\` when the threshold is exceeded. The summarization node:
1. Calls the LLM with a summarization prompt: "Summarize the conversation, preserving all key decisions, facts, and constraints stated by the user"
2. Returns a state update that replaces old messages with the summary + recent messages
3. Stores the summary in a \`running_summary\` state field — each subsequent call **extends** the previous summary rather than re-summarizing from scratch

**Strategy 3: Vector DB Offloading (Episodic Memory)**

Vector database offloading treats every message exchange as a document to embed and store. When context pressure mounts, instead of summarizing, the agent:
1. **Offloads** old exchanges to a vector store (pgvector, Pinecone, Weaviate, Chroma)
2. At the start of each turn, **embeds** the current user message
3. **Retrieves** the top-k most semantically relevant past exchanges

Advantage over summarization: **no information is lost** — all past exchanges remain retrievable.

**Strategy 4: Hybrid Architecture (Production Pattern)**

| Tier | Content | Storage | Retrieval |
|---|---|---|---|
| **Recent** | Last 15-20 exchanges | LangGraph \`messages\` state | Verbatim injection |
| **Medium-term** | Exchanges from last few hours | \`running_summary\` field in state | Always included |
| **Long-term** | Exchanges from prior sessions | Vector DB (pgvector) | Semantic similarity retrieval |

The LLM prompt structure:
\`\`\`
[System prompt]
[Long-term retrieval: top-k relevant past exchanges from vector DB]
[Running summary of medium-term history]
[Recent messages verbatim]
[Current user message]
\`\`\`

**The LangGraph Store API**

LangGraph 0.3+ introduces a **Store** abstraction for cross-thread, cross-session persistent memory. Unlike checkpointers (which scope state to a \`thread_id\`), the Store is a key-value namespace that persists data independently of any particular graph run.

- \`InMemoryStore\` — development option
- \`PostgresStore\` — production option (PostgreSQL table indexed by namespace and key)

> [!TIP] A node that needs to remember "user prefers concise answers" writes \`{"preference": "concise"}\` to the Store under the user's namespace. Any subsequent graph run for that user — **regardless of thread_id** — reads this preference from the Store.

**Memory Type Taxonomy**

Three memory types serve different roles:

- **Semantic memory** — facts and propositions: "the user works in financial services", "the project uses PostgreSQL 15". Changes slowly. Store in the **LangGraph Store** or a user profile table.
- **Episodic memory** — event sequences: "on June 10 we decided on event sourcing". Store in the **vector DB** with timestamp metadata.
- **Procedural memory** — workflow knowledge: "to deploy this project, run X then Y then Z". Store in the **system prompt** or a retrieved knowledge base.

> [!IMPORTANT] Conflating these memory types into a single undifferentiated message list is the architectural mistake that causes context management to fail at scale.`,

    quickFire: [
      { q: 'What is the context window limit for Claude 3.5 Sonnet and GPT-4o?', a: '**128K tokens** for both; Claude 3.5 Sonnet goes to **200K**. A multi-day power-user conversation can exceed this **within hours**.' },
      { q: 'What does trim_messages() do in LangGraph?', a: 'Trims a message list to a **maximum token count** using a chosen strategy (last, first) while optionally **preserving the system message** — returns the trimmed list without modifying state directly.' },
      { q: 'What is the add_messages reducer and why does it matter for context management?', a: 'It **appends** new messages to state rather than replacing the list — context management nodes must explicitly return a **replacement list** (not an append) to trim or summarize old messages.' },
      { q: 'What is episodic memory in an agent context?', a: 'A record of past events and exchanges, scoped to **what happened and when** — best stored in a **vector DB** with timestamp metadata and retrieved by **semantic similarity**.' },
      { q: 'What is semantic memory in an agent context?', a: 'Factual propositions about the world or user ("prefers Python", "uses PostgreSQL 15") — best stored in the **LangGraph Store** or a user profile table, retrieved **deterministically by key**.' },
      { q: 'What is the LangGraph Store API used for?', a: '**Cross-thread, cross-session** persistent storage independent of **thread_id** — used for user preferences, long-term facts, and procedural knowledge that persists across all sessions.' },
      { q: 'What is the difference between a checkpointer and a Store in LangGraph?', a: '**Checkpointers** scope state to a single **thread_id** (one conversation); the **Store** is a global key-value namespace accessible across all threads and sessions — **orthogonal persistence scopes**.' },
      { q: 'What is a running summary in the summarization strategy?', a: 'A string field in agent state that accumulates a **compressed history** of prior exchanges; each summarization call **extends** it rather than starting over, preventing unbounded growth.' },
      { q: 'Why is vector DB retrieval superior to summarization for long-term recall?', a: '**Summarization** loses information permanently; **vector DB** stores everything and retrieves on demand by **semantic similarity**, so no past exchange is truly lost.' },
      { q: 'What is the hybrid context management architecture?', a: '**Recent messages** verbatim in the window, medium-term exchanges in a **rolling summary**, long-term episodic exchanges offloaded to **vector DB** and retrieved by similarity at the start of each turn.' },
    ],
    keyQuestions: [
      {
        question: 'Explain how you manage the context window in a persistent, multi-turn agent that might have a conversation spanning several days.',
        answer: `The production answer is the **hybrid architecture**: three tiers of memory with different storage and retrieval mechanisms, combined in a structured prompt.

**Tier 1 — Recent Verbatim Context**

The last 15-20 exchanges (~4000 tokens) stay in the LangGraph \`messages\` state as raw \`BaseMessage\` objects and are injected into the prompt **verbatim**. This gives the model accurate, uncompressed access to the immediate conversational thread.

**Tier 2 — Rolling Summary (Medium-Term)**

A summarization node fires when the message list exceeds ~6000 tokens. It calls the LLM with:

\`\`\`
"You are summarizing a multi-day technical conversation. Preserve all key decisions,
constraints, preferences, and open questions stated by the user. Be specific:
include numbers, names, and technical terms as stated."
\`\`\`

The result is stored in \`state["running_summary"]\` and prepended to every subsequent prompt as a "Conversation history summary" block.

**Tier 3 — Vector DB for Episodic Long-Term Memory**

At the end of each session (or every N turns), the recent exchange batch is embedded and written to **pgvector on PostgreSQL**. Each document includes metadata: \`user_id\`, \`session_id\`, \`timestamp\`, extracted entity tags.

At the start of each new session, the current query is embedded and the **top-5 most semantically similar** past exchanges are retrieved and injected as a "Relevant past context" block.

**Full Prompt Structure**

\`\`\`
[System prompt with persona and persistent instructions]
[Relevant past context — top-5 retrieved from vector DB]
[Conversation history summary — rolling summary from state]
[Recent messages verbatim — last 20 exchanges from state]
[Current user message]
\`\`\`

**Semantic Memory (LangGraph Store)**

When the agent detects the user has stated a preference, it writes to the Store:

\`\`\`python
store.put(("users", user_id, "facts"), "prefers_python", {"value": True, "stated_at": now})
\`\`\`

A retrieval step at session start loads all stored user preferences and injects them into the system prompt. These persist **indefinitely across all sessions** regardless of \`thread_id\`.

> [!TIP] This architecture scales to multi-week persistent agents. A constraint stated on day one will be in the vector DB and retrieved whenever a semantically related topic arises — even if the running summary has been overwritten by more recent history.`,
      },
      {
        question: 'Walk me through the LangGraph code for a summarization node that fires when the conversation exceeds 4000 tokens.',
        answer: `The implementation has **three parts**: a token counter, a conditional edge, and the summarization node.

**Part 1 — Token Counter**

\`\`\`python
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import trim_messages

model = ChatAnthropic(model="claude-sonnet-4-5")

def count_tokens(messages: list) -> int:
    return model.get_num_tokens_from_messages(messages)
\`\`\`

**Part 2 — Conditional Edge**

\`\`\`python
def should_summarize(state: AgentState) -> str:
    if count_tokens(state["messages"]) > 4000:
        return "summarize"
    return "agent"

workflow.add_conditional_edges("agent", should_summarize, {
    "summarize": "summarize_node",
    "agent": END,
})
\`\`\`

**Part 3 — Summarization Node**

The node must **replace** the messages list (not append) with the summary + recent messages:

\`\`\`python
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

def summarize_node(state: AgentState) -> dict:
    existing_summary = state.get("running_summary", "")
    messages = state["messages"]
    recent = messages[-6:]       # keep last 6 verbatim
    to_summarize = messages[:-6]

    summary_prompt = f"""Previous summary:
{existing_summary}

New exchanges to incorporate:
{chr(10).join(m.content for m in to_summarize if hasattr(m, "content"))}

Write an updated summary preserving all key decisions, constraints,
numbers, and technical terms. Be specific."""

    summary_response = model.invoke([HumanMessage(content=summary_prompt)])
    new_summary = summary_response.content

    replacement_messages = [
        SystemMessage(content=f"Conversation history summary:\\n{new_summary}"),
    ] + recent

    return {
        "messages": replacement_messages,
        "running_summary": new_summary,
    }
\`\`\`

**Wire the Node**

\`\`\`python
workflow.add_node("summarize_node", summarize_node)
workflow.add_edge("summarize_node", "agent")
\`\`\`

> [!IMPORTANT] The \`add_messages\` reducer appends by default. Returning a full replacement list alongside explicit deletions is the correct way to trim — many implementations use a separate \`trimmed_messages\` field with a custom reducer that supports full replacement to avoid reducer conflicts.`,
      },
      {
        question: 'How do you ensure the agent remembers a key fact the user mentioned 3 days ago without storing the entire raw conversation?',
        answer: `Three days of raw conversation is likely **50,000-200,000 tokens** — far too large for context injection. The answer depends on the type of fact.

**For Structured Preferences and Hard Constraints**

("never recommend MongoDB", "the budget ceiling is $50K", "I need GDPR compliance"):

Use the **LangGraph Store**. A fact extraction node (runs every N turns or at session end) calls the LLM with:

\`\`\`
"Extract any user preferences, hard constraints, or persistent facts stated in this exchange.
Return as JSON: [{type, value, confidence}]"
\`\`\`

High-confidence extractions are written to the Store:

\`\`\`python
store.put(("users", user_id, "constraints"), "no_mongo", {"value": True, "confidence": 0.95})
\`\`\`

At session start, all facts for the user are loaded and injected into the **system prompt** as a "Known user context" block. This fact persists **forever** until the user explicitly revokes it.

**For Episodic Facts in Conversation Exchanges**

("three days ago we designed a schema and decided on event sourcing"):

Use **vector DB retrieval**. The session from three days ago was embedded and stored at session close. When the user raises a topic related to schema design or event sourcing, the retrieval step fetches the top-k most similar past exchanges and injects them into the context. The model sees the original exchange and references the decision directly.

**For Implicitly Stated Facts (Hardest Case)**

Facts not well-captured by semantic similarity — stated in different vocabulary than current usage. These require:
- **Entity linking** — tag the extracted fact with synonyms and related terms
- **Hybrid retrieval** — BM25 keyword matching plus dense retrieval to catch vocabulary mismatches

**The Architectural Rule**

| Fact Type | Storage | Retrieval |
|---|---|---|
| Structured preferences and constraints | LangGraph Store | Deterministic key lookup |
| Episodic events and decisions | Vector DB | Semantic similarity |
| Raw recent messages | LangGraph state | Verbatim injection |

> [!WARNING] Putting everything in one undifferentiated vector DB means structured facts are only retrieved when semantically triggered — which is **unreliable for hard constraints that should always apply**.`,
      },
    ],
    tips: [
      'Count tokens before every LLM call in a persistent agent -- never discover context overflow at inference time with a 400 error from the API.',
      'Store running_summary as a dedicated TypedDict field, not as a message in the messages list -- this prevents the summary from being summarized recursively and losing compactness.',
      'Index vector DB entries with both user_id and session_id metadata -- this lets you retrieve only entries for a given user and optionally filter by recency when the full history is too large.',
      'Run fact extraction asynchronously at session close, not synchronously on every turn -- extraction adds latency and is not needed in real time.',
      'Use pgvector if you already have PostgreSQL; avoid adding a dedicated vector DB service (Pinecone, Weaviate) unless you have more than 10 million embeddings to store -- operational complexity is rarely worth it at smaller scale.',
      'Treat the LangGraph Store as an append-and-supersede ledger, not a mutable dict -- write new versions of facts with a timestamp rather than overwriting, so you can audit how the user\'s stated preferences evolved.',
      'Test context management under adversarial conditions: simulate a user who switches topics abruptly, contradicts an earlier preference, and references something from session one during session ten. These edge cases expose gaps in your retrieval coverage.',
    ],
    references: [
      'https://langchain-ai.github.io/langgraph/how-tos/memory/add-summary-conversation-history/',
      'https://langchain-ai.github.io/langgraph/concepts/memory/',
      'https://langchain-ai.github.io/langgraph/reference/store/',
      'https://python.langchain.com/docs/how_to/trim_messages/',
      'https://docs.anthropic.com/en/docs/about-claude/models/overview',
      'https://github.com/pgvector/pgvector',
    ],
  },
];
