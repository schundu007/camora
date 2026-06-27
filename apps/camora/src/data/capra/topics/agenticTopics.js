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
    introduction: `Multi-agent systems divide complex tasks across specialist agents that each focus on one narrow concern. LangGraph is the graph-based orchestration layer that wires them together -- it turns agents into graph nodes and messages into edges, giving you explicit control over routing, state, and persistence that a single monolithic agent chain cannot provide.

## LangGraph fundamentals

LangGraph models execution as a directed graph. Nodes are Python functions (or Runnables) that take the current state and return an updated state. Edges connect nodes and can be conditional -- the graph decides the next node based on the current state value. A StateGraph is compiled into a runnable graph object with a stream or invoke interface. The core objects are: StateGraph, the compiled graph (via .compile()), a state TypedDict, and the optional checkpointer for persistence.

The state schema is defined as a Python TypedDict. Every node receives the full state dict and returns a partial dict of updates. LangGraph merges the partial dict into the current state using reducers. The built-in add_messages reducer appends to a messages list rather than replacing it -- this is the fundamental primitive that enables multi-turn conversation within a graph.

## The Supervisor pattern

The Supervisor pattern introduces a router node that sits above all specialist agents. It reads the latest message in state and decides which agent should handle the next step. The supervisor does not perform work itself -- it dispatches. Specialist agents perform work and return results by appending to the messages list. The graph loops back to the supervisor after each agent completes, allowing the supervisor to decide whether to call another agent, refine a result, or terminate.

For a Researcher-Writer pipeline: the supervisor first routes to the Researcher node. The Researcher uses web search tools, appends a structured research summary to messages, and returns. The supervisor reads that summary and routes to the Writer. The Writer drafts a report based on the accumulated messages and appends the draft. The supervisor may route back to the Researcher for a gap-fill pass, or it may terminate with the final draft as the graph output.

## Shared state and message passing

The state TypedDict carries all inter-agent communication. A minimal schema for the Researcher-Writer system looks like:

from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    research_complete: bool
    report_draft: str

Each agent reads from messages -- a list of HumanMessage, AIMessage, and ToolMessage objects -- and returns new messages that are appended by the reducer. The supervisor reads state.messages[-1] (or a parsed field like research_complete) to make its routing decision. Agents never call each other directly; all communication flows through the shared state.

## Checkpointers for state persistence

A checkpointer persists the full state snapshot at every superstep. MemorySaver stores state in a Python dict in memory -- suitable for development, single-process, short-lived sessions. SqliteSaver persists to a SQLite file and survives process restarts. PostgresSaver (via langgraph-checkpoint-postgres) is the production option for multi-process or cloud deployments.

The checkpointer is passed at compile time: graph.compile(checkpointer=SqliteSaver.from_conn_string("checkpoints.db")). At runtime, every invoke or stream call accepts a config dict with a thread_id. The checkpointer uses the thread_id as the key -- two calls with the same thread_id resume the same conversation; a new thread_id starts a fresh execution. This is what makes sessions stateful across HTTP requests.

## Human-in-the-loop

LangGraph's interrupt_before and interrupt_after mechanisms pause execution at a named node boundary. When a graph is compiled with interrupt_before=["writer"], execution halts before the Writer node runs and returns control to the caller. The caller can inspect state, modify it, and call graph.update_state() to inject changes, then resume by calling invoke again with the same thread_id. This is the standard pattern for approval checkpoints -- show the user the research summary before committing to a full report draft.

## Error handling and fallback routing

The supervisor's routing function can inspect the last message for error markers. If the Researcher node raises an exception or returns a low-confidence result, the supervisor routes to a Fallback node (which might try a different data source) or to a RetryResearcher node with a revised query. LangGraph's conditional edges accept a Python function that returns the name of the next node as a string -- error routing is just another branch in that function.`,
    quickFire: [
      { q: 'What is a LangGraph StateGraph?', a: 'A directed graph where nodes are Python functions that transform state and edges (including conditional edges) determine control flow based on state values.' },
      { q: 'What does the add_messages reducer do?', a: 'It appends new messages to the existing messages list in state rather than replacing the entire list -- enables multi-turn accumulation across nodes.' },
      { q: 'What is the Supervisor pattern?', a: 'A router node that reads the current state and dispatches to specialist agent nodes based on what step is needed next; it does not perform work itself.' },
      { q: 'How do agents communicate in LangGraph?', a: 'Through the shared TypedDict state -- each agent appends to the messages list; no direct agent-to-agent calls exist.' },
      { q: 'What is MemorySaver vs SqliteSaver?', a: 'MemorySaver is an in-memory checkpointer for dev and testing; SqliteSaver persists to disk and survives process restarts; both use thread_id as the session key.' },
      { q: 'What is a thread_id in LangGraph?', a: 'A string key passed in the run config that scopes the checkpointer state -- same thread_id resumes an existing session; new thread_id starts a fresh one.' },
      { q: 'How does interrupt_before work?', a: 'Compiled with interrupt_before=["node_name"], the graph pauses before that node runs and returns control to the caller; resume by calling invoke again on the same thread_id.' },
      { q: 'What is a conditional edge in LangGraph?', a: 'An edge whose target node is determined by a Python function that reads state and returns the next node name as a string -- the mechanism for all routing logic.' },
      { q: 'How do you run two agents in parallel in LangGraph?', a: 'Add both node names as targets in a list from a conditional or unconditional edge -- LangGraph executes them as a parallel superstep and merges their state updates.' },
      { q: 'What is a superstep in LangGraph?', a: 'One round of execution across all nodes that fire in the same batch -- parallel nodes execute within a single superstep; the checkpointer snapshots state after each superstep.' },
      { q: 'How do you terminate a LangGraph graph?', a: 'Route the supervisor conditional edge to END (the special LangGraph terminal node) when the task is complete.' },
      { q: 'What Python type annotation enables the add_messages reducer on a field?', a: 'Annotated[list[BaseMessage], add_messages] -- the Annotated type from typing combined with the add_messages reducer function from langgraph.graph.message.' },
    ],
    keyQuestions: [
      {
        question: 'Design a multi-agent system where a Researcher agent gathers data from the web, and a Writer agent drafts a report. How do they communicate, and how do you handle state?',
        answer: `The standard LangGraph answer is the Supervisor pattern with a shared TypedDict state. The graph has four nodes: Supervisor, Researcher, Writer, and END. The Supervisor is the routing hub; Researcher and Writer are the specialist workers.

The state schema is a TypedDict with a messages field annotated with the add_messages reducer, plus domain-specific flags to help the supervisor make routing decisions. A minimal production schema would be:

from typing import TypedDict, Annotated, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langgraph.graph.message import add_messages

class ReportState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    research_complete: bool
    research_summary: str
    report_draft: str
    next: str  # which node supervisor targets

The Researcher node is a function that receives state, binds a web search tool (Tavily, SerpAPI, or similar) to an LLM, runs the ReAct loop, and returns {"messages": [AIMessage(content=summary)], "research_complete": True, "research_summary": summary}. The Writer node receives the same state, reads research_summary and messages, calls the LLM with a drafting prompt, and returns {"messages": [AIMessage(content=draft)], "report_draft": draft}.

The Supervisor node reads state and returns {"next": "researcher" | "writer" | "end"} based on the flags. The graph wires a conditional edge from Supervisor that routes based on state["next"]. After each specialist node completes, control returns to the Supervisor unconditionally.

Graph construction:

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

This loop -- supervisor dispatches, specialist acts, supervisor re-evaluates -- continues until the supervisor returns "end". Communication between agents is entirely through state: the Writer reads what the Researcher deposited into messages and research_summary; neither node calls the other directly. The checkpointer means every superstep is durable -- if the process crashes mid-report, invoke with the same thread_id resumes from the last checkpoint.`,
      },
      {
        question: 'How does state persistence work in LangGraph? What is the difference between MemorySaver and SqliteSaver?',
        answer: `LangGraph's persistence model snapshots the full state TypedDict after every superstep (one round of node executions). The snapshot is keyed by (thread_id, checkpoint_id) where thread_id is caller-supplied and checkpoint_id is an incrementing counter maintained by the checkpointer. When you call invoke or stream with a config containing thread_id, LangGraph loads the latest checkpoint for that thread_id, resumes execution from that state, and writes a new checkpoint after each superstep completes.

MemorySaver stores snapshots in a Python dict that lives in the process's memory. It is zero-configuration, requires no external dependencies, and is the right choice for development, testing, and short-lived single-process applications. Its critical limitation is that state disappears when the process exits. Two workers in different processes cannot share a MemorySaver instance, so it does not work in horizontally scaled deployments.

SqliteSaver persists checkpoints to a SQLite file on disk. It survives process restarts and requires only a file path. It is suitable for single-server deployments, local agentic tools, and desktop applications where multi-process access is not needed. SQLite's write serialization makes it unsuitable for high-concurrency multi-process scenarios.

PostgresSaver (from langgraph-checkpoint-postgres) is the production choice. It uses a PostgreSQL table to store checkpoints, supports concurrent writers via row-level locking, and works across any number of horizontally scaled worker processes. The schema is managed automatically. Configuration is a standard psycopg connection string.

The practical rule: use MemorySaver during local development, SqliteSaver for single-process production tools (CLI agents, desktop apps), and PostgresSaver for any web-facing multi-process deployment. The interface is identical across all three -- swapping the checkpointer at compile time is a one-line change with no graph logic changes required.`,
      },
      {
        question: 'How do you run the Researcher and Writer agents in parallel instead of sequentially?',
        answer: `LangGraph executes nodes in parallel when they are all listed as destinations from the same source edge. Rather than routing to Researcher and then to Writer sequentially through the Supervisor, you fan out from a single orchestrator node by returning multiple node names as edge targets.

The pattern requires restructuring the graph so that a Fork node fans out to both Researcher and Writer simultaneously, then a Join node (or the Supervisor) collects both results. In practice, true parallelism only makes sense when both agents can run on independent inputs -- in the Researcher-then-Writer case, the Writer needs the Researcher's output, so they are inherently sequential.

For genuinely independent work -- for example, a system where a FactChecker and a CitationFinder both run on the same initial query and their results are merged -- parallel execution looks like:

workflow.add_node("fork", fork_node)          # no-op, just fans out
workflow.add_node("fact_checker", fc_node)
workflow.add_node("citation_finder", cf_node)
workflow.add_node("merger", merger_node)
workflow.add_edge("fork", ["fact_checker", "citation_finder"])   # parallel fan-out
workflow.add_edge("fact_checker", "merger")
workflow.add_edge("citation_finder", "merger")

LangGraph executes fact_checker and citation_finder as a single superstep. Their state updates are both passed to the merger node after both complete. The add_messages reducer handles concurrent appends to the messages list safely -- LangGraph merges the partial state dicts before the next node runs.

For the Researcher-Writer case specifically, the canonical answer is sequential with a checkpoint between them, not parallel -- the Writer's quality depends entirely on the Researcher's output. Introducing parallelism here would mean the Writer drafts without research context, which defeats the purpose. Save parallel fan-out for genuinely independent subtasks like multi-source retrieval, concurrent tool calls, or segment-level analysis.`,
      },
      {
        question: 'How do you add a human approval checkpoint between the Researcher and Writer stages?',
        answer: `LangGraph's interrupt_before mechanism pauses graph execution at a named node boundary and returns control to the caller with the current state. The caller inspects state, optionally modifies it, and resumes by calling invoke or stream again on the same thread_id.

To add an approval gate between Researcher and Writer, compile the graph with interrupt_before=["writer"]:

graph = workflow.compile(
    checkpointer=SqliteSaver.from_conn_string("sessions.db"),
    interrupt_before=["writer"]
)

When the Supervisor routes to Writer, execution halts before the Writer node fires. The invoke call returns with the current state -- including the research_summary the Researcher deposited. The caller (your API handler, CLI, or UI) can display this summary to the user and ask for approval.

To resume with approval:

config = {"configurable": {"thread_id": session_id}}
result = graph.invoke(None, config=config)  # None = no new input, just resume

To resume with modifications (for example, the user wants to refine the research brief before drafting):

graph.update_state(config, {"research_summary": refined_summary})
result = graph.invoke(None, config=config)

To reject and terminate rather than resume, do not call invoke again -- the checkpointed state remains but the thread goes no further.

interrupt_after=["researcher"] is the symmetric alternative: it halts after the Researcher node completes (when its state update is already committed) rather than before the Writer starts. Both produce the same user experience in this case; the distinction matters when you want to inspect a node's output versus intercept before a node's input is processed. For an approval gate where the human reviews research before writing begins, interrupt_before=["writer"] is the idiomatic choice.`,
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
    introduction: `Standard LLM tool use assumes the tool returns within the inference timeout window -- typically a few seconds. A data pipeline, a batch job, a video transcoding task, or a model fine-tuning run can take five minutes to an hour. Bridging that gap without holding an open server connection or blocking the LLM context thread requires a specific set of patterns that sit at the intersection of agentic orchestration and distributed systems.

## The fundamental mismatch

LLMs are designed for synchronous request-response cycles. When an LLM calls a tool, the expectation is that the result comes back in the same call. Inference infrastructure (API servers, load balancers, connection pools) is built around this assumption with hard timeouts typically in the 30-60 second range. A 5-minute pipeline run violates every timeout at every layer of the stack.

The solution is never to hold the connection open. Instead, the agent must initiate the long-running task, record that it has been initiated, immediately release the connection, and later resume from where it left off when the task completes. This requires three things: a checkpointer to persist agent state, a mechanism for the external task to notify the agent when complete, and idempotent tool invocations so that safe retry is possible.

## Pattern 1: Checkpoint-suspend-webhook-resume

This is the canonical pattern for LangGraph. The tool invocation node starts the external pipeline (HTTP call to trigger the job), receives a job_id, stores it in the agent state, and then triggers a graph interrupt. The graph suspends. The caller returns the current state to the user with a "pipeline started" status.

When the external pipeline completes, it sends a webhook to your application server. The webhook handler reads the job_id, looks up the thread_id for that job, writes the result into the agent state using graph.update_state(), and calls graph.invoke() with the same thread_id. The graph resumes exactly where it was suspended -- the next node reads the completed result from state as if no time had passed.

State schema for this pattern:

class PipelineState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    job_id: str | None
    job_status: Literal["idle", "running", "complete", "failed"]
    pipeline_result: dict | None
    started_at: str | None

## Pattern 2: Async polling

When webhooks are not available (third-party services that only expose status endpoints), an alternative is a polling node. The agent starts the job, stores the job_id, and routes to a Poller node. The Poller checks the status endpoint and returns the job_id back to state if still running. A conditional edge loops back to the Poller on "running" and proceeds to the next stage on "complete". An exponential-backoff sleep between polls prevents hammering the status endpoint.

The trade-off: polling holds a long-running graph execution thread (or relies on scheduled graph resumptions). For jobs longer than a few minutes, the checkpoint-suspend-webhook pattern is superior because no thread is held.

## Pattern 3: SSE streaming for user experience

Regardless of how the agent state is managed, the user should never stare at a spinner. Server-Sent Events (SSE) provide a standard mechanism for pushing progress updates from server to browser over a single HTTP connection. When the pipeline is triggered, the server sends a stream of events: "status: pipeline started", "status: 20% complete", "status: 80% complete", "status: complete, resuming agent". The agent logic is decoupled from the SSE stream -- a background thread or async task emits progress events while the webhook-resume path handles actual graph resumption.

## Durable execution: Temporal and AWS Step Functions

For workflows that span hours or days, LangGraph checkpointers are often insufficient -- they are optimized for conversation-length persistence, not workflow-engine durability. Temporal and AWS Step Functions provide durable execution primitives: activity retries with configurable policies, workflow versioning, event history replay, and saga patterns for multi-step compensation. An agentic system that must tolerate multi-hour failures and guarantee exactly-once execution of side effects should reach for Temporal or Step Functions rather than extending LangGraph checkpoints to handle that complexity.

## Idempotency

Every tool invocation in an async system must be idempotent. If the agent process crashes after triggering the pipeline but before recording the job_id, resuming from the checkpoint will trigger the pipeline again. The tool must accept an idempotency key (a UUID generated by the agent before the call, stored in state) and deduplicate on the server side. This single requirement eliminates the "we triggered the pipeline twice" failure mode that shows up in every production agentic system.`,
    quickFire: [
      { q: 'Why can you not hold an LLM context thread open for a 5-minute tool call?', a: 'Inference infrastructure has hard timeouts (30-60 seconds) at every layer -- API servers, load balancers, and connection pools are all built for synchronous request-response latency.' },
      { q: 'What are the three things required for checkpoint-suspend-webhook-resume?', a: 'A checkpointer to persist state, a webhook endpoint so the external task can notify completion, and idempotent tool invocations so safe retry is possible.' },
      { q: 'What is the difference between interrupt_before and interrupt_after for the suspend pattern?', a: 'interrupt_before halts before the named node fires (state from previous node is visible); interrupt_after halts after the node completes and its state updates are committed.' },
      { q: 'Why is polling inferior to webhooks for long-running jobs?', a: 'Polling holds a live thread (or requires repeated scheduled calls) and adds latency; webhooks resume the agent immediately when the job completes with no thread held.' },
      { q: 'What is an idempotency key in the context of async tool calls?', a: 'A UUID generated by the agent before calling the tool, stored in state, and passed to the tool server -- the server deduplicates on it so retries after crashes do not trigger the job twice.' },
      { q: 'When should you use Temporal instead of LangGraph checkpointers?', a: 'When durability requirements span hours or days, when exactly-once side-effect guarantees are needed, or when multi-step compensation (saga pattern) is required -- LangGraph checkpointers are optimized for conversation-length sessions, not workflow-engine durability.' },
      { q: 'What state fields belong in a PipelineState TypedDict for this pattern?', a: 'job_id, job_status (idle/running/complete/failed), pipeline_result, started_at, and an idempotency_key -- plus messages for LLM conversation continuity.' },
      { q: 'How does the webhook handler resume a suspended LangGraph graph?', a: 'It looks up the thread_id for the job_id, calls graph.update_state(config, {"job_status": "complete", "pipeline_result": result}), then calls graph.invoke(None, config=config) to resume.' },
      { q: 'What is SSE and why is it the right UX choice for long-running operations?', a: 'Server-Sent Events -- a standard HTTP streaming protocol for server-to-client push. A single persistent HTTP connection delivers progress events in real time without WebSocket complexity.' },
      { q: 'What exponential backoff policy makes sense for a polling node?', a: 'Start at 2 seconds, double each attempt up to a 60-second ceiling, with jitter (randomize by +/- 10%) to prevent thundering-herd spikes when many jobs complete simultaneously.' },
    ],
    keyQuestions: [
      {
        question: 'How do you handle long-running asynchronous tool calls? For example, if an agent triggers a data pipeline that takes 5 minutes, how do you manage the agent\'s state and the user experience?',
        answer: `The checkpoint-suspend-webhook-resume pattern is the correct answer. The key insight is that the agent must never hold an open connection waiting for the pipeline -- instead it triggers, suspends, and resumes.

Step 1 -- generate an idempotency key and store it in state before triggering the pipeline. This is a UUID created by the agent, not by the pipeline service. If the agent crashes and replays, the same key is passed to the pipeline service, which returns the existing job_id rather than starting a second run.

Step 2 -- the pipeline trigger node calls the external pipeline HTTP API with the idempotency key, receives a job_id, and stores both in state: {"job_id": job_id, "idempotency_key": key, "job_status": "running", "started_at": iso_now}. The graph then hits interrupt_after=["trigger_pipeline"] (or a dedicated suspend node with interrupt_before) and execution halts. The calling HTTP request returns to the user with status "pipeline started, job_id=X".

Step 3 -- the external pipeline, when it completes, sends a POST to your webhook endpoint with the job_id and result payload. The webhook handler resolves the thread_id from job_id (stored in a jobs table), calls:

config = {"configurable": {"thread_id": thread_id}}
graph.update_state(config, {"job_status": "complete", "pipeline_result": result})
graph.invoke(None, config=config)

The graph resumes at the node after the suspended point. The next node reads pipeline_result from state and proceeds with the downstream LLM analysis, summary, or action.

For user experience, an SSE stream runs in parallel with the webhook path. When the pipeline trigger fires, the server opens an SSE channel keyed to the session. A background process monitors job status (polling the jobs table or subscribing to a Redis pub/sub channel that the webhook handler publishes to) and emits "data: {status: running, pct: 20}" events to the SSE stream. The frontend renders a live progress bar. When the pipeline completes and the webhook fires, the SSE stream emits "data: {status: complete}" and the frontend transitions to the resumed agent output.

The result is a system that correctly separates the agent control plane (LangGraph state + checkpointer) from the real-time UX plane (SSE) with no threads held and no polling loops in the hot path.`,
      },
      {
        question: 'What happens if the agent process crashes while waiting for the 5-minute pipeline? How do you recover?',
        answer: `Recovery depends on the crash point. There are three distinct failure windows, each with a different recovery path.

Crash before the job_id is stored in state: the LangGraph checkpoint does not include the job_id, so resuming the thread replays the pipeline trigger node. This is the idempotency key's job -- the trigger node generates the key before calling the pipeline, stores it in state, and that key is committed to the checkpoint before the external call goes out. On replay, the same key is passed to the pipeline service, which recognizes it and returns the existing job_id rather than starting a new run. The state is updated and the graph suspends again to await the webhook.

To guarantee this ordering, structure the trigger node as two atomic steps: first, update_state with the idempotency_key only; second, call the pipeline; third, update_state with job_id and job_status. The checkpointer writes after each update_state call, so the key is durable before the external call fires.

Crash while suspended waiting for the webhook: the checkpoint preserves job_id and job_status="running". The pipeline continues unaware of the crash. When the webhook arrives, the handler looks up the thread_id by job_id and calls update_state plus invoke. If the process that will handle the invoke is a fresh restart, it loads the checkpoint, finds the pipeline already complete (job_status="complete" after update_state), and resumes normally. Zero loss.

Crash of the webhook handler before invoke completes: the job_status was written to the checkpoint by update_state but invoke did not finish. On the next invoke attempt (triggered by a retry of the webhook, or by a background reconciliation job), the graph resumes from the committed state. The reconciliation job is the safety net -- it scans jobs where job_status="running" and started_at is older than (pipeline_max_duration + buffer), checks the external pipeline status endpoint, and fires the webhook handler logic manually for any that have completed without a successful webhook delivery.

The practical deployment pattern is: webhook handler + reconciliation cron job that runs every 10 minutes. The combination ensures correctness without requiring exactly-once webhook delivery from the external service.`,
      },
      {
        question: 'How would you design the user experience so the user knows what is happening during a 5-minute wait?',
        answer: `The UX for a long-running async operation has three layers: immediate acknowledgment, continuous progress feedback, and a crisp completion transition.

Immediate acknowledgment: when the user triggers the action that starts the pipeline, the response must return within 200ms -- before the pipeline is even contacted. The response confirms "request received, pipeline starting" and returns a session token or thread_id the frontend can use to poll or subscribe to progress. Never make the user wait for the pipeline trigger call itself.

Continuous progress: the frontend opens an SSE connection to a progress endpoint (GET /api/sessions/{thread_id}/progress) immediately after receiving the session token. The server maintains a status record for this thread_id (in Redis or a jobs table). As the pipeline emits progress events (via internal webhooks, polling, or a progress callback), the server writes them to the status record and the SSE stream pushes them to the client. The frontend renders a progress bar, elapsed time, and a plain-language status message: "Fetching schema metadata (step 1 of 4)", "Running data quality checks (step 2 of 4)", "Building feature table (step 3 of 4)".

If the external pipeline does not emit granular progress, emit time-based pseudo-progress: "Started 1 minute ago, estimated 4 minutes remaining" based on historical average duration. A determinate progress bar is far better than an indeterminate spinner even when the progress estimate is approximate.

Completion transition: when the pipeline finishes and the agent resumes, the SSE stream emits a completion event with the agent's next output. The frontend transitions from the progress view to the agent response view in a single smooth state update -- no page reload, no manual refresh button. If the user has navigated away, push a browser notification (if permissions were granted) and display a badge on the session tab.

Error states: if the pipeline fails, the SSE stream emits an error event with a human-readable message ("Data quality check failed: 12% of records have null user_id -- see report"). The agent's error-handling node generates an actionable suggestion. Never show a raw stack trace or timeout error to the user.`,
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
    introduction: `Production agents that span days or weeks face a hard physical constraint: the LLM context window. Claude 3.5 Sonnet and GPT-4o both offer 128K-token windows. A multi-day conversation with a power user -- including tool call round-trips, retrieved documents, and verbose AI responses -- can accumulate tens of thousands of tokens per hour. Within one business day, the raw history exceeds the context limit. Without active management, the agent either crashes with a context-length error or the developer adds silent truncation that loses critical early context without the user knowing.

## The problem: what you cannot fit, the model cannot use

Context window overflow is not just a technical error -- it is a user experience failure. An agent that cannot remember a key constraint the user specified two hours ago is not useful as a persistent assistant. The architectural challenge is to keep the model's effective working memory as large as possible within the physical token budget, while preserving the facts, decisions, and commitments that matter most across sessions that span days.

## Strategy 1: Sliding window truncation

The simplest strategy is to keep only the last N messages in the prompt. When the message list exceeds a threshold, drop the oldest messages. LangGraph provides trim_messages() as a utility that trims a message list to a maximum token count, preserving the system message and the most recent messages.

from langchain_core.messages import trim_messages
trimmed = trim_messages(
    state["messages"],
    max_tokens=4000,
    token_counter=ChatAnthropic(model="claude-sonnet-4-5"),
    strategy="last",
    include_system=True,
    allow_partial=False,
)

The critical weakness: early context is permanently lost. If the user specified a constraint on day one ("never recommend solutions that require vendor lock-in"), that constraint disappears from the window and the model behaves as if it was never stated.

## Strategy 2: Summarization node

A summarization node compresses old messages into a running summary when the message count or token count exceeds a threshold. The summary becomes a synthetic message at the top of the context that conveys the essence of what happened, and the raw messages it replaced are discarded from the active window.

In LangGraph, this is a conditional node. A conditional edge checks len(state["messages"]) or token_count(state["messages"]) at each superstep and routes to the summarize_node when the threshold is exceeded. The summarize_node calls the LLM with a summarization prompt -- "Summarize the conversation so far, preserving all key decisions, facts, and constraints stated by the user" -- and returns a state update that replaces the old messages with the summary plus recent messages.

The summary is itself stored as a field in state (running_summary: str) so it persists across truncation cycles. Each subsequent summarization extends the previous summary rather than re-summarizing from scratch, preventing the summary from growing unboundedly.

## Strategy 3: Vector DB offloading

Vector database offloading treats every message exchange as a document to be embedded and stored. When context pressure mounts, instead of summarizing, the agent offloads old exchanges to a vector store (Pinecone, pgvector on PostgreSQL, Weaviate, or Chroma) and retrieves only the exchanges most semantically relevant to the current query.

At the start of each turn, the agent embeds the current user message, queries the vector store for the top-k most relevant past exchanges (by cosine similarity), and injects them into the context alongside the recent message window. This is episodic memory retrieval: the agent does not read the entire history but selectively recalls the parts most relevant to the present moment.

The advantage over summarization is that no information is lost -- all past exchanges remain retrievable. The disadvantage is that retrieval-based recall can miss context that is not semantically similar to the current query but is nonetheless important (for example, a preference stated in a different vocabulary than the current query).

## Strategy 4: Hybrid summarization plus vector retrieval

The production pattern for multi-day agents combines both strategies. Short-term recent context (last 20 exchanges) stays in the active message window verbatim. Medium-term context (exchanges from the last few hours) is compressed into a rolling summary stored in the state. Long-term episodic context (exchanges from prior sessions or days ago) is offloaded to a vector store and retrieved on demand.

The LLM prompt structure is: [System prompt] + [Long-term retrieval: top-k relevant past exchanges] + [Running summary of medium-term history] + [Recent messages verbatim]. This gives the model accurate recent context, compressed middle history, and semantically targeted recall from the distant past -- all within the token budget.

## The LangGraph Store API

LangGraph 0.3+ introduces a Store abstraction specifically for cross-thread, cross-session persistent memory. Unlike checkpointers (which scope state to a thread_id), the Store is a key-value namespace that persists data independently of any particular graph run. InMemoryStore is the development option. PostgresStore is the production option -- it stores data in a PostgreSQL table indexed by namespace and key.

The Store is used for semantic memory (user preferences, long-term facts) and for cross-session user profiles. A node that needs to remember that a user prefers concise answers writes {"preference": "concise"} to the Store under the user's namespace. Any subsequent graph run for that user -- regardless of thread_id -- reads this preference from the Store. This is the correct architecture for preferences and facts that should persist across all sessions, separate from the episodic message history that is scoped to a thread.

## Memory type taxonomy

Three memory types serve different roles in persistent agents. Semantic memory holds facts and propositions: "the user works in financial services", "the project uses PostgreSQL 15". These change slowly and should be stored in the LangGraph Store or a dedicated user profile table. Episodic memory holds event sequences: "the user asked about schema design on June 10, we decided on a normalized approach". These are best stored in the vector DB with timestamp metadata. Procedural memory holds workflow knowledge: "to deploy this project, run X then Y then Z". These belong in the system prompt or a retrieved knowledge base, not the conversation history. Conflating these memory types into a single undifferentiated message list is the architectural mistake that causes context management to fail at scale.`,
    quickFire: [
      { q: 'What is the context window limit for Claude 3.5 Sonnet and GPT-4o?', a: '128K tokens for both Claude 3.5 Sonnet and GPT-4o; Claude 3.5 Sonnet goes to 200K. A multi-day power-user conversation can exceed this within hours.' },
      { q: 'What does trim_messages() do in LangGraph?', a: 'Trims a message list to a maximum token count using a chosen strategy (last, first) while optionally preserving the system message -- returns the trimmed list without modifying state directly.' },
      { q: 'What is the add_messages reducer and why does it matter for context management?', a: 'It appends new messages to state rather than replacing the list -- context management nodes must explicitly return a replacement list (not an append) to trim or summarize old messages.' },
      { q: 'What is episodic memory in an agent context?', a: 'A record of past events and exchanges, scoped to what happened and when -- best stored in a vector DB with timestamp metadata and retrieved by semantic similarity.' },
      { q: 'What is semantic memory in an agent context?', a: 'Factual propositions about the world or user ("prefers Python", "uses PostgreSQL 15") -- best stored in the LangGraph Store or a user profile table, retrieved deterministically by key.' },
      { q: 'What is the LangGraph Store API used for?', a: 'Cross-thread, cross-session persistent storage independent of thread_id -- used for user preferences, long-term facts, and procedural knowledge that must persist across all sessions for a user.' },
      { q: 'What is the difference between a checkpointer and a Store in LangGraph?', a: 'Checkpointers scope state to a single thread_id (one conversation); the Store is a global key-value namespace accessible across all threads and sessions -- orthogonal persistence scopes.' },
      { q: 'What is a running summary in the summarization strategy?', a: 'A single string field in agent state that accumulates a compressed history of prior exchanges; each summarization call extends it rather than starting over, preventing the summary itself from growing unboundedly.' },
      { q: 'Why is vector DB retrieval superior to summarization for long-term recall?', a: 'Summarization loses information permanently; vector DB stores everything and retrieves on demand by semantic similarity, so no past exchange is truly lost.' },
      { q: 'What is the hybrid context management architecture?', a: 'Recent messages verbatim in the window, medium-term exchanges compressed into a rolling summary in state, long-term episodic exchanges offloaded to vector DB and retrieved by similarity at the start of each turn.' },
    ],
    keyQuestions: [
      {
        question: 'Explain how you manage the context window in a persistent, multi-turn agent that might have a conversation spanning several days.',
        answer: `The production answer is the hybrid architecture: three tiers of memory with different storage and retrieval mechanisms, combined in a structured prompt.

Tier 1 -- recent verbatim context: the last 15-20 exchanges (or approximately 4000 tokens) are kept in the LangGraph messages state as raw BaseMessage objects. These are injected into the prompt verbatim. This gives the model accurate, uncompressed access to the immediate conversational thread without any retrieval latency.

Tier 2 -- rolling summary for medium-term history: a summarization node fires when the message list exceeds a token threshold (say, 6000 tokens for the recent window). It reads all messages older than the recent window, calls the LLM with a prompt: "You are summarizing a multi-day technical conversation. Preserve all key decisions, constraints, preferences, and open questions stated by the user. Be specific: include numbers, names, and technical terms as stated." The result is stored in state["running_summary"] and the raw messages it covered are removed from state["messages"]. The summary is prepended to the prompt on every subsequent turn as a "Conversation history summary" block. This tier covers the last few hours of a session.

Tier 3 -- vector DB for episodic long-term memory: at the end of each session (or every N turns), the recent exchange batch is embedded and written to a vector store (pgvector on PostgreSQL is the pragmatic choice -- no additional infrastructure if the application already uses PostgreSQL). Each document is the exchange text plus metadata: user_id, session_id, timestamp, and a set of extracted entity tags (names, topics, decisions). At the start of each new session, the current user query is embedded and the top-5 most semantically similar past exchanges are retrieved and injected into the prompt as a "Relevant past context" block.

The full prompt structure:

[System prompt with persona and persistent instructions]
[Relevant past context (top-5 retrieved from vector DB)]
[Conversation history summary (rolling summary from state)]
[Recent messages verbatim (last 20 exchanges from state)]
[Current user message]

For user preferences and persistent facts (semantic memory), use the LangGraph Store. When the agent detects that the user has stated a preference ("I prefer Python over JavaScript"), it writes that to the Store under the user's namespace as a structured entry. A retrieval step at session start loads all stored user preferences and injects them into the system prompt. These persist indefinitely across all sessions regardless of thread_id.

This architecture scales to multi-week persistent agents. A user who stated a technical constraint on day one will have that constraint in the vector DB and will see it retrieved whenever a semantically related topic arises, even if the running summary has since been overwritten by more recent history.`,
      },
      {
        question: 'Walk me through the LangGraph code for a summarization node that fires when the conversation exceeds 4000 tokens.',
        answer: `The implementation has three parts: a token counter, a conditional edge that routes to the summarization node, and the summarization node itself that returns the trimmed state.

First, a token-counting helper. LangGraph does not automatically count tokens, so you need to call the model's token counter explicitly or use tiktoken for an approximation:

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import trim_messages, SystemMessage, HumanMessage

model = ChatAnthropic(model="claude-sonnet-4-5")

def count_tokens(messages: list) -> int:
    return model.get_num_tokens_from_messages(messages)

Second, the conditional edge function that routes to the summarization node:

def should_summarize(state: AgentState) -> str:
    if count_tokens(state["messages"]) > 4000:
        return "summarize"
    return "agent"

workflow.add_conditional_edges("agent", should_summarize, {
    "summarize": "summarize_node",
    "agent": END,
})

Third, the summarization node. It must return a state update that replaces the messages list (not appends to it) with the summary plus the most recent messages:

from langchain_core.messages import AIMessage, RemoveMessage

def summarize_node(state: AgentState) -> dict:
    existing_summary = state.get("running_summary", "")
    messages = state["messages"]

    # Keep the last 6 messages verbatim for continuity
    recent = messages[-6:]
    to_summarize = messages[:-6]

    summary_prompt = f"""Previous summary:
{existing_summary}

New exchanges to incorporate:
{chr(10).join(m.content for m in to_summarize if hasattr(m, "content"))}

Write an updated summary preserving all key decisions, constraints, numbers, and technical terms. Be specific."""

    summary_response = model.invoke([HumanMessage(content=summary_prompt)])
    new_summary = summary_response.content

    # Build the replacement message list: system + summary + recent
    replacement_messages = [
        SystemMessage(content=f"Conversation history summary:\\n{new_summary}"),
    ] + recent

    return {
        "messages": replacement_messages,
        "running_summary": new_summary,
    }

The critical detail: returning {"messages": replacement_messages} works here because the add_messages reducer appends by default, but when the value contains RemoveMessage objects or is structured as a full replacement list alongside explicit deletions, it replaces. The correct way to replace is to first issue delete operations for the old messages and then append the replacement set, or to use a custom reducer that supports full replacement. In practice, many implementations use a separate messages field for the trimmed history to avoid reducer conflicts.

Wire the node into the graph:

workflow.add_node("summarize_node", summarize_node)
workflow.add_edge("summarize_node", "agent")

After summarization, control returns to the agent node with a compacted message list well under the 4000-token threshold.`,
      },
      {
        question: 'How do you ensure the agent remembers a key fact the user mentioned 3 days ago without storing the entire raw conversation?',
        answer: `Three days of raw conversation is likely 50,000-200,000 tokens -- far too large for context injection and expensive to store as raw text. The answer depends on the type of fact.

For a structured, persistent preference or constraint ("never recommend MongoDB", "the budget ceiling is $50K", "I work in the EU and need GDPR compliance"): use the LangGraph Store. The agent runs a fact extraction node periodically (every N turns or at session end). This node calls the LLM with a structured extraction prompt: "Extract any user preferences, hard constraints, or persistent facts stated in this exchange. Return as JSON with fields: type, value, confidence." High-confidence extractions are written to the Store under a namespace like ("users", user_id, "facts"). At session start, all facts for the user are loaded from the Store and injected into the system prompt as a "Known user context" block. This fact persists forever until the user explicitly revokes it or the agent detects a contradiction and updates the Store entry.

For an episodic fact embedded in a conversation exchange ("three days ago we designed a schema together and decided to use event sourcing"): use vector DB retrieval. The session from three days ago was embedded and stored in pgvector at session close. When the user raises a topic semantically related to schema design or event sourcing, the retrieval step at the start of the turn fetches the top-k most similar past exchanges and injects them into the context. The model sees the original exchange and can reference the decision directly.

For a fact that is neither a clean preference nor well-captured in vector similarity (an implicit constraint mentioned in passing in a different vocabulary than current usage): this is the hardest case and requires explicit entity linking or a knowledge graph layer. The fact extraction node should tag the extracted fact with synonyms and related terms, and the retrieval step should use both vector similarity and keyword matching (a hybrid retrieval approach like BM25 plus dense retrieval) to catch vocabulary mismatches.

The architectural rule: structured, referenceable facts belong in the Store (deterministic key-value lookup); episodic events belong in the vector DB (semantic retrieval); raw message history belongs only in the recent verbatim window. Mixing these storage tiers -- putting everything in one undifferentiated vector DB -- means structured facts are only retrieved when semantically triggered, which is unreliable for hard constraints that should always apply.`,
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
