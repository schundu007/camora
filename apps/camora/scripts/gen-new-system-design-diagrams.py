#!/usr/bin/env python3
"""Generate impl-basic.png + impl-advanced.png for all 67 new system design topics."""
import graphviz, os

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'diagrams')
NODE = dict(shape='box', style='filled,rounded', fontname='Helvetica Neue', fontsize='11', penwidth='1.5', height='0.4', margin='0.12,0.06')
EDGE = dict(fontname='Helvetica Neue', fontsize='9', penwidth='1.5')
C = {
    'blue':   ('#dbeafe','#3b82f6','#1e40af'),
    'green':  ('#dcfce7','#22c55e','#166534'),
    'yellow': ('#fef3c7','#f59e0b','#92400e'),
    'purple': ('#e0e7ff','#6366f1','#3730a3'),
    'pink':   ('#fce7f3','#ec4899','#9d174d'),
    'orange': ('#ffedd5','#f97316','#9a3412'),
    'teal':   ('#ccfbf1','#14b8a6','#115e59'),
    'gray':   ('#f3f4f6','#6b7280','#374151'),
    'red':    ('#fee2e2','#ef4444','#991b1b'),
    'cyan':   ('#cffafe','#06b6d4','#155e75'),
}
def n(g, nm, label, c): g.node(nm, label, fillcolor=C[c][0], color=C[c][1], fontcolor=C[c][2], **NODE)
def e(g, a, b, label='', color='#94a3b8', style='solid'): g.edge(a, b, label=f'  {label}  ' if label else '', color=color, fontcolor='#64748b', style=style, **EDGE)
def mk(out, name, title, **kw):
    os.makedirs(out, exist_ok=True)
    g = graphviz.Digraph(format='png')
    g.attr(bgcolor='#ffffff', dpi='200', pad='0.2', nodesep='0.5', ranksep='0.45', splines='spline',
           label=f'  {title}  ', labelloc='t', fontsize='13', fontname='Helvetica Neue Bold', fontcolor='#1e293b', **kw)
    return g, os.path.join(out, name)

def gen(topic_dir, name, title, nodes, edges, **kw):
    OUT = os.path.join(BASE, topic_dir)
    g, path = mk(OUT, name, title, **kw)
    for nd in nodes: n(g, nd[0], nd[1], nd[2])
    for ed in edges: e(g, ed[0], ed[1], ed[2] if len(ed) > 2 else '', ed[3] if len(ed) > 3 else '#94a3b8', ed[4] if len(ed) > 4 else 'solid')
    g.render(path, cleanup=True)
    print(f'  OK {topic_dir}/{name}.png')

LR = dict(rankdir='LR')
TB = dict(rankdir='TB')

# ═══════════════════════════════════════════════════════════
# AI PROBLEMS 1 — S/A TIER
# ═══════════════════════════════════════════════════════════

gen('ai-copilot', 'impl-basic', 'AI Coding Copilot — Basic',
    [('user','Developer\nEditor','blue'),('ext','IDE Extension\n(VS Code)','gray'),('api','LLM API\n(Claude/GPT-4)','teal'),('sug','Code Suggestion\nRenderer','green')],
    [('user','ext','keystroke','#3b82f6'),('ext','api','prompt +\ncontext','#14b8a6'),('api','sug','streamed\ntokens','#22c55e'),('sug','user','inline\ncompletion','#3b82f6')], **LR)

gen('ai-copilot', 'impl-advanced', 'AI Coding Copilot — Production',
    [('editor','Editor\n(cursor pos)','blue'),('ctx','Context\nExtractor\n(AST+history)','orange'),('emb','Embedding\nService','teal'),('vs','Vector Store\n(code chunks)','purple'),('gw','LLM Gateway\n(batching+cache)','gray'),('llm','Code LLM\n(streaming)','teal'),('ren','Streaming\nRenderer','green')],
    [('editor','ctx','file+cursor','#3b82f6'),('ctx','emb','code snippets','#f97316'),('emb','vs','embed query','#6366f1'),('vs','gw','top-k chunks','#6366f1'),('ctx','gw','prompt\n+ context','#f97316'),('gw','llm','batched\nprompt','#14b8a6'),('llm','ren','token\nstream','#22c55e'),('ren','editor','diff patch','#3b82f6')], **LR)

gen('multimodal-ai-search', 'impl-basic', 'Multimodal AI Search — Basic',
    [('user','User Query\n(text/image)','blue'),('enc','CLIP\nEncoder','teal'),('idx','Vector Index\n(FAISS)','purple'),('res','Ranked\nResults','green')],
    [('user','enc','query','#3b82f6'),('enc','idx','query vector','#14b8a6'),('idx','res','top-k\nmatches','#22c55e'),('res','user','results','#3b82f6')], **LR)

gen('multimodal-ai-search', 'impl-advanced', 'Multimodal AI Search — Production',
    [('q','User Query\n(text/img/vid)','blue'),('qe','Query Encoder\n(CLIP/BLIP-2)','teal'),('idx','Multi-modal\nIndex (FAISS)','purple'),('fuse','Fusion\nRanker','orange'),('rr','Re-ranker\n(cross-encoder)','teal'),('cdn','CDN-served\nResults','green'),('idxr','Async\nIndexer','yellow'),('mp','Media\nProcessor','orange'),('es','Embedding\nStore','purple')],
    [('q','qe','encode','#3b82f6'),('qe','idx','multi-modal\nvector','#14b8a6'),('idx','fuse','candidates','#6366f1'),('fuse','rr','top-50','#f97316'),('rr','cdn','top-10','#22c55e'),('cdn','q','served','#3b82f6'),('idxr','mp','raw media','#f59e0b','dashed'),('mp','es','embeddings','#6366f1','dashed')], **LR)

gen('realtime-ai-translation', 'impl-basic', 'Realtime AI Translation — Basic',
    [('mic','Audio\nInput','blue'),('stt','STT\n(Whisper)','teal'),('xlat','Translation\nLLM','teal'),('tts','TTS\nService','orange'),('spk','Speaker\nOutput','green')],
    [('mic','stt','audio chunks','#3b82f6'),('stt','xlat','transcript','#14b8a6'),('xlat','tts','translated\ntext','#14b8a6'),('tts','spk','audio stream','#22c55e')], **LR)

gen('realtime-ai-translation', 'impl-advanced', 'Realtime AI Translation — Production',
    [('mic','Microphone','blue'),('ws','WebSocket\nGateway','gray'),('stt','STT Cluster\n(Whisper)','teal'),('xlat','Translation\nService','teal'),('tts','TTS Service\n(batched)','orange'),('wrtc','WebRTC\nDelivery','green'),('sess','Session\nManager','orange'),('redis','Redis\n(context)','red'),('kafka','Kafka\n(events)','yellow')],
    [('mic','ws','raw PCM','#3b82f6'),('ws','stt','30ms chunks','#14b8a6'),('stt','xlat','transcript +\nlang','#14b8a6'),('xlat','tts','translated\ntext','#f97316'),('tts','wrtc','audio','#22c55e'),('sess','redis','session ctx','#ef4444','dashed'),('ws','kafka','events','#f59e0b','dashed')], **LR)

gen('autonomous-agent-platform', 'impl-basic', 'Autonomous Agent Platform — Basic',
    [('user','User Goal','blue'),('ctrl','Agent\nController','gray'),('tool','Tool Executor\n(search/code)','orange'),('llm','LLM\n(planner)','teal'),('resp','Action /\nResponse','green')],
    [('user','ctrl','goal','#3b82f6'),('ctrl','llm','plan request','#14b8a6'),('llm','tool','tool call','#f97316'),('tool','llm','tool result','#f97316'),('llm','resp','final answer','#22c55e')], **LR)

gen('autonomous-agent-platform', 'impl-advanced', 'Autonomous Agent Platform — Production',
    [('user','User','blue'),('orch','Orchestrator','gray'),('plan','Task Planner\n(LLM)','teal'),('reg','Tool Registry\n(search/code/\nbrowser/APIs)','orange'),('sand','Execution\nSandbox','orange'),('mem','Memory Store\n(short+long term)','purple'),('redis','Redis\n(agent state)','red'),('agg','Result\nAggregator','green')],
    [('user','orch','goal','#3b82f6'),('orch','plan','decompose','#14b8a6'),('plan','reg','select tool','#f97316'),('reg','sand','execute','#f97316'),('sand','plan','result','#f97316'),('plan','mem','store step','#6366f1','dashed'),('mem','plan','recall ctx','#6366f1','dashed'),('plan','redis','state','#ef4444','dashed'),('sand','agg','final output','#22c55e')], **LR)

gen('large-scale-ai-inference', 'impl-basic', 'Large-Scale AI Inference — Basic',
    [('client','Client','blue'),('lb','Load\nBalancer','gray'),('inf','Inference\nServer (TensorRT)','teal'),('model','Model\nWeights','purple'),('resp','Response','green')],
    [('client','lb','request','#3b82f6'),('lb','inf','route','#6b7280'),('inf','model','load weights','#6366f1'),('model','inf','logits','#6366f1'),('inf','resp','tokens','#22c55e')], **LR)

gen('large-scale-ai-inference', 'impl-advanced', 'Large-Scale AI Inference — Production',
    [('client','Client','blue'),('gw','API Gateway','gray'),('router','Router\n(model selector)','orange'),('pool','GPU Pool\n(A100/H100)','teal'),('kvcache','KV Cache\n(paged attn)','red'),('model','Model\n(tensor parallel)','teal'),('reg','Model Registry','purple'),('mon','Health Monitor','pink')],
    [('client','gw','request','#3b82f6'),('gw','router','model hint','#6b7280'),('router','pool','schedule','#f97316'),('pool','kvcache','lookup','#ef4444'),('kvcache','model','prefill','#14b8a6'),('model','client','stream tokens','#22c55e'),('reg','pool','load ckpt','#6366f1','dashed'),('mon','pool','health','#ec4899','dashed')], **LR)

gen('speech-to-text-system', 'impl-basic', 'Speech-to-Text System — Basic',
    [('audio','Audio Upload','blue'),('q','Job Queue','yellow'),('worker','STT Worker\n(Whisper GPU)','teal'),('tx','Transcript','green'),('s3','S3 Storage','purple')],
    [('audio','q','enqueue','#3b82f6'),('q','worker','job','#f59e0b'),('worker','tx','transcript','#22c55e'),('tx','s3','store','#6366f1')], **LR)

gen('speech-to-text-system', 'impl-advanced', 'Speech-to-Text System — Production',
    [('audio','Audio Source','blue'),('chunk','Chunker\n(30s segments)','orange'),('sqs','SQS Queue','yellow'),('gpu','STT Workers\n(Whisper GPU)','teal'),('align','Alignment\nModel','teal'),('ts','Word-level\nTimestamps','green'),('s3','S3','purple'),('pg','Postgres','purple'),('ws','WebSocket\npush','gray')],
    [('audio','chunk','stream','#3b82f6'),('chunk','sqs','segments','#f59e0b'),('sqs','gpu','job','#f59e0b'),('gpu','align','raw text','#14b8a6'),('align','ts','timestamped\ntranscript','#22c55e'),('ts','s3','store','#6366f1'),('ts','pg','metadata','#6366f1'),('pg','ws','push ready','#6b7280','dashed')], **LR)

gen('rag-system', 'impl-basic', 'RAG System — Basic',
    [('query','User Query','blue'),('ret','Retriever\n(vector search)','teal'),('ctx','Context\nBuilder','orange'),('llm','LLM\n(Claude/GPT)','teal'),('ans','Answer','green')],
    [('query','ret','query','#3b82f6'),('ret','ctx','top-k chunks','#14b8a6'),('query','ctx','pass query','#3b82f6'),('ctx','llm','query +\ncontext','#14b8a6'),('llm','ans','answer','#22c55e')], **LR)

gen('rag-system', 'impl-advanced', 'RAG System — Production',
    [('query','Query','blue'),('expand','Query\nExpander','orange'),('bm25','BM25\nRetriever','teal'),('faiss','FAISS\nVector Index','purple'),('rr','Re-ranker\n(Cohere)','teal'),('ctx','Context\nBuilder','orange'),('llm','LLM\n(streaming)','teal'),('ans','Answer','green'),('docs','Docs','purple'),('chunk','Chunker +\nEmbedder','orange'),('vdb','Vector DB','purple')],
    [('query','expand','expand','#3b82f6'),('expand','bm25','keywords','#14b8a6'),('expand','faiss','embedding','#6366f1'),('bm25','rr','candidates','#14b8a6'),('faiss','rr','candidates','#6366f1'),('rr','ctx','top-5 chunks','#f97316'),('query','ctx','pass query','#3b82f6'),('ctx','llm','augmented\nprompt','#14b8a6'),('llm','ans','streamed\nanswer','#22c55e'),('docs','chunk','ingest','#6366f1','dashed'),('chunk','vdb','embeddings','#6366f1','dashed')], **LR)

gen('document-ai-processing', 'impl-basic', 'Document AI Processing — Basic',
    [('pdf','PDF Upload','blue'),('ocr','OCR\n(Tesseract)','orange'),('llm','LLM\nExtractor','teal'),('json','Structured\nJSON','green'),('db','Database','purple')],
    [('pdf','ocr','raw PDF','#3b82f6'),('ocr','llm','text','#f97316'),('llm','json','entities +\nrelations','#14b8a6'),('json','db','store','#6366f1')], **LR)

gen('document-ai-processing', 'impl-advanced', 'Document AI Processing — Production',
    [('pdf','PDF / Scan','blue'),('layout','Layout Parser\n(LayoutLMv3)','teal'),('ner','Entity Extractor\n(NER)','teal'),('rel','Relation\nExtractor','teal'),('score','Confidence\nScorer','orange'),('hq','Human Review\nQueue','yellow'),('pg','Postgres','purple'),('s3','S3\n(originals)','purple'),('batch','Batch\nProcessor','orange')],
    [('pdf','layout','segments','#3b82f6'),('layout','ner','text blocks','#14b8a6'),('ner','rel','entities','#14b8a6'),('rel','score','graph','#f97316'),('score','hq','low confidence','#f59e0b','dashed'),('score','pg','high confidence','#6366f1'),('pdf','s3','archive','#6366f1','dashed'),('batch','layout','bulk PDFs','#f97316','dashed')], **LR)

# ═══════════════════════════════════════════════════════════
# AI PROBLEMS 2 — B/C TIER
# ═══════════════════════════════════════════════════════════

gen('time-series-forecasting', 'impl-basic', 'Time-Series Forecasting — Basic',
    [('hist','Historical\nData','purple'),('feat','Feature\nEngineering','orange'),('model','Prophet /\nLSTM Model','teal'),('fcst','Forecast\nOutput','green'),('db','Results DB','purple')],
    [('hist','feat','raw series','#6366f1'),('feat','model','features','#f97316'),('model','fcst','predictions','#22c55e'),('fcst','db','store','#6366f1')], **LR)

gen('time-series-forecasting', 'impl-advanced', 'Time-Series Forecasting — Production',
    [('src','Raw Data\n(IoT/ERP/API)','blue'),('kafka','Kafka\nIngest','yellow'),('fs','Feature Store','purple'),('ens','Ensemble Model\n(ARIMA+LSTM\n+XGBoost)','teal'),('cache','Forecast Cache\n(Redis)','red'),('api','Forecast API','gray'),('af','Airflow\nRetrainer','orange'),('ml','MLflow\nRegistry','pink')],
    [('src','kafka','stream','#3b82f6'),('kafka','fs','features','#f59e0b'),('fs','ens','feature vecs','#6366f1'),('ens','cache','predictions','#ef4444'),('cache','api','serve','#6b7280'),('af','ens','retrain','#f97316','dashed'),('ens','ml','register','#ec4899','dashed')], **LR)

gen('ai-anomaly-detection', 'impl-basic', 'AI Anomaly Detection — Basic',
    [('stream','Metrics\nStream','blue'),('rules','Threshold\nRules Engine','orange'),('ml','ML Scorer\n(Isolation Forest)','teal'),('alert','Alert\nPublisher','red'),('pd','PagerDuty','cyan')],
    [('stream','rules','metrics','#3b82f6'),('rules','ml','suspicious','#f97316'),('ml','alert','anomaly score','#ef4444'),('alert','pd','page','#06b6d4')], **LR)

gen('ai-anomaly-detection', 'impl-advanced', 'AI Anomaly Detection — Production',
    [('src','Metrics /\nLogs / Traces','blue'),('kafka','Kafka','yellow'),('flink','Stream Processor\n(Flink)','orange'),('det','ML Detector\n(Isolation Forest\n+ LSTM)','teal'),('dedup','Alert\nDeduplicator','orange'),('router','Notification\nRouter','gray'),('slack','Slack /\nPagerDuty','cyan'),('mlf','MLflow\nRetrainer','pink')],
    [('src','kafka','events','#3b82f6'),('kafka','flink','consume','#f59e0b'),('flink','det','windows','#f97316'),('det','dedup','anomaly','#ef4444'),('dedup','router','deduplicated\nalerts','#6b7280'),('router','slack','notify','#06b6d4'),('det','mlf','feedback','#ec4899','dashed')], **LR)

gen('automated-tagging', 'impl-basic', 'Automated Tagging — Basic',
    [('img','Image / Product','blue'),('cnn','CNN Classifier\n(EfficientNet)','teal'),('tags','Top-5 Tags\n+ Confidence','green'),('db','Product DB','purple')],
    [('img','cnn','raw image','#3b82f6'),('cnn','tags','predictions','#14b8a6'),('tags','db','write tags','#6366f1')], **LR)

gen('automated-tagging', 'impl-advanced', 'Automated Tagging — Production',
    [('media','Image / Video','blue'),('pre','Pre-processor\n(resize/norm)','orange'),('cnn','CNN Backbone\n(EfficientNet)','teal'),('head','Multi-label\nClassifier Head','teal'),('filt','Confidence\nFilter','orange'),('ts','Tag Store','purple'),('al','Active Learning\nLoop','yellow'),('ann','Annotation\nQueue','yellow'),('ft','Fine-tuner\n(weekly)','teal')],
    [('media','pre','batch','#3b82f6'),('pre','cnn','tensors','#14b8a6'),('cnn','head','features','#14b8a6'),('head','filt','logits','#f97316'),('filt','ts','accepted tags','#6366f1'),('filt','al','low-conf\nsamples','#f59e0b','dashed'),('al','ann','queue','#f59e0b','dashed'),('ann','ft','labeled data','#14b8a6','dashed')], **LR)

gen('voice-assistant-backend', 'impl-basic', 'Voice Assistant Backend — Basic',
    [('wake','Wake Word\nDetector','blue'),('asr','ASR\n(STT)','teal'),('nlu','NLU\n(Intent + Entity)','teal'),('router','Skill Router','gray'),('tts','TTS Output','green'),('spk','Speaker','green')],
    [('wake','asr','audio','#3b82f6'),('asr','nlu','transcript','#14b8a6'),('nlu','router','intent +\nentities','#6b7280'),('router','tts','response text','#22c55e'),('tts','spk','audio','#22c55e')], **LR)

gen('voice-assistant-backend', 'impl-advanced', 'Voice Assistant Backend — Production',
    [('dev','Device\n(on-device\nwake word)','blue'),('cloud','STT Cloud\n(Whisper)','teal'),('nlu','NLU (BERT)\nIntent+Entities','teal'),('dm','Dialog\nManager','orange'),('skills','Skill APIs\n(weather/\ncalendar/shop)','cyan'),('rb','Response\nBuilder','gray'),('tts','TTS (WaveNet)','green'),('sess','Session\nRedis','red')],
    [('dev','cloud','audio PCM','#3b82f6'),('cloud','nlu','transcript','#14b8a6'),('nlu','dm','intent','#14b8a6'),('dm','skills','action','#f97316'),('skills','rb','data','#06b6d4'),('rb','tts','text','#22c55e'),('tts','dev','audio','#22c55e'),('dm','sess','context','#ef4444','dashed')], **LR)

gen('ai-tutoring-system', 'impl-basic', 'AI Tutoring System — Basic',
    [('stu','Student\nAnswer','blue'),('ks','Knowledge\nState (BKT)','teal'),('gap','Gap\nIdentifier','orange'),('rec','Content\nRecommender','teal'),('prob','Next Problem','green')],
    [('stu','ks','response','#3b82f6'),('ks','gap','skill mastery','#14b8a6'),('gap','rec','gaps','#f97316'),('rec','prob','next item','#22c55e')], **LR)

gen('ai-tutoring-system', 'impl-advanced', 'AI Tutoring System — Production',
    [('stu','Student','blue'),('log','Interaction\nLogger','orange'),('kg','Knowledge\nGraph (BKT)','purple'),('eng','Adaptive\nEngine','teal'),('cs','Content\nSelector','teal'),('llm','LLM Explainer\n(Claude)','teal'),('prog','Progress DB\n(Postgres)','purple'),('dash','Instructor\nDashboard','pink'),('anal','Analytics\n(Kafka)','yellow')],
    [('stu','log','interactions','#3b82f6'),('log','kg','update skill','#6366f1'),('kg','eng','mastery vec','#6366f1'),('eng','cs','difficulty\n+ skill gap','#14b8a6'),('cs','llm','content +\nquestion','#14b8a6'),('llm','stu','explanation','#22c55e'),('log','prog','history','#6366f1','dashed'),('log','anal','events','#f59e0b','dashed'),('anal','dash','metrics','#ec4899','dashed')], **LR)

gen('customer-support-chatbot', 'impl-basic', 'Customer Support Chatbot — Basic',
    [('user','User\nMessage','blue'),('nlu','NLU\nIntent Classifier','teal'),('faq','FAQ / KB\nMatcher','orange'),('resp','Response\nTemplate','green')],
    [('user','nlu','message','#3b82f6'),('nlu','faq','intent','#14b8a6'),('faq','resp','match','#22c55e'),('resp','user','reply','#3b82f6')], **LR)

gen('customer-support-chatbot', 'impl-advanced', 'Customer Support Chatbot — Production',
    [('user','User','blue'),('intent','Intent\nClassifier','teal'),('entity','Entity\nExtractor','teal'),('state','Dialog State\nManager','orange'),('rag','RAG Retriever\n(docs+history)','purple'),('llm','LLM Response\nGenerator','teal'),('sent','Sentiment\nFilter','pink'),('esc','Escalation\nRouter','red'),('agent','Human Agent','cyan')],
    [('user','intent','message','#3b82f6'),('intent','entity','intent','#14b8a6'),('entity','state','entities','#f97316'),('state','rag','context','#6366f1'),('rag','llm','augmented\nprompt','#14b8a6'),('llm','sent','draft','#ec4899'),('sent','user','clean reply','#22c55e'),('sent','esc','negative\nsentiment','#ef4444','dashed'),('esc','agent','handoff','#06b6d4','dashed')], **LR)

gen('code-generation-system', 'impl-basic', 'Code Generation System — Basic',
    [('prompt','Code Prompt','blue'),('llm','Code LLM\n(CodeLlama)','teal'),('gen','Generated\nCode','green'),('val','Syntax\nValidator','orange')],
    [('prompt','llm','prompt','#3b82f6'),('llm','gen','code tokens','#14b8a6'),('gen','val','validate','#f97316'),('val','prompt','errors','#ef4444','dashed')], **LR)

gen('code-generation-system', 'impl-advanced', 'Code Generation System — Production',
    [('editor','Editor Context\n(AST+imports)','blue'),('pb','Prompt\nBuilder','orange'),('gw','LLM Gateway\n(rate limit)','gray'),('llm','Code LLM\n(streaming)','teal'),('test','Unit Test\nGenerator','teal'),('sa','Static\nAnalysis','orange'),('sec','Security\nScanner','red'),('out','Final\nOutput','green')],
    [('editor','pb','context','#3b82f6'),('pb','gw','prompt','#f97316'),('gw','llm','batched','#14b8a6'),('llm','test','code','#14b8a6'),('test','sa','with tests','#f97316'),('sa','sec','analysis','#ef4444'),('sec','out','safe code','#22c55e'),('llm','out','stream','#22c55e')], **LR)

gen('text-summarization', 'impl-basic', 'Text Summarization — Basic',
    [('doc','Long Document','blue'),('chunk','Chunker\n(2k tokens)','orange'),('llm','LLM\nSummarizer','teal'),('sum','Summary','green')],
    [('doc','chunk','text','#3b82f6'),('chunk','llm','chunks','#f97316'),('llm','sum','summary','#14b8a6')], **LR)

gen('text-summarization', 'impl-advanced', 'Text Summarization — Production',
    [('doc','Document\nInput','blue'),('parse','Section\nParser','orange'),('mapsum','Map Summarizer\n(per section)','teal'),('reduce','Reduce\nSummarizer','teal'),('ext','Extractive\nLayer','orange'),('abs','Abstractive\nLayer','teal'),('score','Quality\nScorer','pink'),('cache','Redis Cache','red'),('api','Summary API','gray')],
    [('doc','parse','raw text','#3b82f6'),('parse','mapsum','sections','#f97316'),('mapsum','reduce','section\nsummaries','#14b8a6'),('reduce','abs','combined','#14b8a6'),('parse','ext','sentences','#f97316'),('ext','abs','key sents','#f97316'),('abs','score','summary','#ec4899'),('score','cache','good summaries','#ef4444'),('cache','api','serve','#6b7280')], **LR)

gen('language-detection', 'impl-basic', 'Language Detection — Basic',
    [('text','Text Input','blue'),('ft','fastText\nClassifier','teal'),('lang','Language\nCode + Conf','green'),('resp','API\nResponse','green')],
    [('text','ft','text','#3b82f6'),('ft','lang','prediction','#14b8a6'),('lang','resp','result','#22c55e')], **LR)

gen('language-detection', 'impl-advanced', 'Language Detection — Production',
    [('text','Text Input','blue'),('pre','Pre-processor\n(clean/truncate)','orange'),('ens','Ensemble\n(fastText+CLD3\n+LangDetect)','teal'),('agg','Confidence\nAggregator','orange'),('lq','Low-conf\nQueue','yellow'),('human','Human\nFallback','cyan'),('api','Bulk Async\nAPI','gray'),('cache','Results Cache\n(Redis)','red')],
    [('text','pre','raw text','#3b82f6'),('pre','ens','cleaned text','#f97316'),('ens','agg','votes','#14b8a6'),('agg','cache','high-conf','#ef4444'),('agg','lq','low-conf','#f59e0b','dashed'),('lq','human','review','#06b6d4','dashed'),('api','pre','batch','#6b7280','dashed')], **LR)

gen('ai-analytics-dashboard', 'impl-basic', 'AI Analytics Dashboard — Basic',
    [('nl','NL Question','blue'),('sqlgen','SQL Generator\n(LLM)','teal'),('db','Data\nWarehouse','purple'),('chart','Chart\nRenderer','green')],
    [('nl','sqlgen','question','#3b82f6'),('sqlgen','db','SQL query','#14b8a6'),('db','chart','result set','#6366f1'),('chart','nl','visualization','#22c55e')], **LR)

gen('ai-analytics-dashboard', 'impl-advanced', 'AI Analytics Dashboard — Production',
    [('q','NL Question','blue'),('parse','Semantic\nParser','teal'),('link','Schema\nLinker','orange'),('sqlgen','SQL Generator\n(LLM)','teal'),('opt','Query\nOptimizer','orange'),('exec','Execution\nEngine (BQ/PG)','purple'),('rec','Chart\nRecommender','teal'),('cache','Result Cache\n(Redis)','red'),('ss','Schema Store\n(Postgres)','purple')],
    [('q','parse','question','#3b82f6'),('parse','link','semantics','#14b8a6'),('link','sqlgen','linked schema','#f97316'),('ss','link','schema ctx','#6366f1','dashed'),('sqlgen','opt','SQL draft','#14b8a6'),('opt','exec','optimized SQL','#6366f1'),('exec','rec','result set','#f97316'),('rec','cache','chart +\ndata','#ef4444')], **LR)

gen('email-auto-response', 'impl-basic', 'Email Auto-Response — Basic',
    [('email','Incoming\nEmail','blue'),('cls','Intent\nClassifier','teal'),('tmpl','Template\nSelector','orange'),('llm','LLM\nPersonalizer','teal'),('draft','Draft Reply','green')],
    [('email','cls','parse','#3b82f6'),('cls','tmpl','intent','#14b8a6'),('tmpl','llm','template +\ncontext','#f97316'),('llm','draft','personalized\nreply','#22c55e')], **LR)

gen('email-auto-response', 'impl-advanced', 'Email Auto-Response — Production',
    [('email','Incoming\nEmail','blue'),('parse','Parser\n(attachments\n+thread)','orange'),('cls','Intent + Urgency\nClassifier','teal'),('rag','RAG\n(CRM+history)','purple'),('gen','Response\nGenerator','teal'),('tone','Tone\nAdjuster','orange'),('hq','Human Approval\nQueue','yellow'),('send','Send\n(Gmail/Outlook)','green'),('crm','CRM (Salesforce)','cyan')],
    [('email','parse','raw email','#3b82f6'),('parse','cls','email body\n+ thread','#14b8a6'),('cls','rag','intent +\npriority','#6366f1'),('crm','rag','customer ctx','#06b6d4','dashed'),('rag','gen','context','#14b8a6'),('gen','tone','draft','#f97316'),('tone','hq','adjusted draft','#f59e0b','dashed'),('hq','send','approved','#22c55e')], **LR)

# ═══════════════════════════════════════════════════════════
# REALTIME PROBLEMS
# ═══════════════════════════════════════════════════════════

gen('realtime-bidding', 'impl-basic', 'Real-Time Bidding — Basic',
    [('ssp','SSP Ad\nRequest','blue'),('gw','Bid Gateway','gray'),('dsp','DSP Bidders\n(parallel)','orange'),('auc','Auction Engine','teal'),('win','Win Notify +\nAd Served','green')],
    [('ssp','gw','bid request','#3b82f6'),('gw','dsp','fan out','#6b7280'),('dsp','auc','bid responses','#f97316'),('auc','win','winner','#22c55e')], **LR)

gen('realtime-bidding', 'impl-advanced', 'Real-Time Bidding — Production (<100ms)',
    [('ssp','SSP Request','blue'),('filter','Pre-filter\n(blocklist/\ntargeting)','orange'),('dsps','Parallel DSPs\n(bidders)','orange'),('auc','Auction Engine\n(Vickrey)','teal'),('notif','Win Notifier','green'),('budget','Budget Ledger\n(Redis)','red'),('logger','Impression\nLogger (Kafka)','yellow'),('ml','Bid Price\nModel','teal')],
    [('ssp','filter','ad request','#3b82f6'),('filter','dsps','eligible\nrequest','#f97316'),('dsps','auc','bids','#f97316'),('auc','notif','winner','#22c55e'),('notif','budget','deduct','#ef4444'),('notif','logger','impression','#f59e0b','dashed'),('ml','dsps','price hint','#14b8a6','dashed')], **LR)

gen('live-sports-scoreboard', 'impl-basic', 'Live Sports Scoreboard — Basic',
    [('feed','Official Score\nFeed (API)','cyan'),('ing','Ingestion\nService','orange'),('redis','Redis\n(current scores)','red'),('ws','WebSocket\nPush','gray'),('client','Clients\n(millions)','blue')],
    [('feed','ing','score event','#06b6d4'),('ing','redis','write score','#ef4444'),('redis','ws','changed','#ef4444'),('ws','client','push update','#3b82f6')], **LR)

gen('live-sports-scoreboard', 'impl-advanced', 'Live Sports Scoreboard — Production',
    [('feed','Score Feed\n(official API)','cyan'),('ing','Ingestion\nService','orange'),('kafka','Kafka\n(score events)','yellow'),('proc','Score\nProcessor','orange'),('redis','Redis\n(current scores)','red'),('fanout','Fan-out\nService','gray'),('wsc','WebSocket Cluster\n(millions)','blue'),('cdn','CDN\n(mobile poll)','green'),('hist','History DB\n(Postgres)','purple')],
    [('feed','ing','event','#06b6d4'),('ing','kafka','publish','#f59e0b'),('kafka','proc','consume','#f59e0b'),('proc','redis','update','#ef4444'),('redis','fanout','changed score','#ef4444'),('fanout','wsc','push','#3b82f6'),('fanout','cdn','invalidate','#22c55e','dashed'),('proc','hist','persist','#6366f1','dashed')], **LR)

gen('event-stream-processing', 'impl-basic', 'Event Stream Processing — Basic',
    [('prod','Producers','blue'),('kafka','Kafka\n(topics)','yellow'),('flink','Flink Job\n(transform)','teal'),('sink','Output\nSink (DB/S3)','purple')],
    [('prod','kafka','events','#3b82f6'),('kafka','flink','consume','#f59e0b'),('flink','sink','aggregated\nresults','#6366f1')], **LR)

gen('event-stream-processing', 'impl-advanced', 'Event Stream Processing — Production',
    [('prod','Producers\n(services/IoT)','blue'),('kafka','Kafka\n(partitioned\ntopics)','yellow'),('ops','Flink Operators\n(stateful)','teal'),('wm','Watermark\nHandler','orange'),('win','Window\nAggregator','teal'),('state','State Backend\n(RocksDB)','purple'),('sink','Output Sinks\n(DB / S3 / ES)','green'),('dlq','Dead Letter\nQueue','red')],
    [('prod','kafka','events','#3b82f6'),('kafka','ops','ordered\nevents','#f59e0b'),('ops','wm','out-of-order','#f97316'),('wm','win','in-order','#f97316'),('win','state','checkpoints','#6366f1'),('win','sink','results','#22c55e'),('ops','dlq','poison msgs','#ef4444','dashed')], **LR)

gen('live-video-transcoding', 'impl-basic', 'Live Video Transcoding — Basic',
    [('obs','OBS\n(broadcaster)','blue'),('ing','RTMP Ingest\nServer','gray'),('trans','Transcoder\n(FFmpeg)','orange'),('cdn','CDN\nEdge','green'),('viewer','Viewer\n(HLS player)','blue')],
    [('obs','ing','RTMP stream','#3b82f6'),('ing','trans','raw video','#6b7280'),('trans','cdn','HLS segments','#22c55e'),('cdn','viewer','adaptive\nstream','#3b82f6')], **LR)

gen('live-video-transcoding', 'impl-advanced', 'Live Video Transcoding — Production',
    [('obs','OBS / Encoder','blue'),('rtmp','RTMP Ingest\n(Nginx-RTMP)','gray'),('seg','Segment Producer\n(HLS chunks)','orange'),('farm','Transcoder Farm\n(1080/720/480/360p)','teal'),('origin','Origin Server\n(HLS manifest)','gray'),('cdn','CDN Edge\n(CloudFront)','green'),('player','Player\n(ABR)','blue'),('chat','Chat\n(WebSocket)','yellow'),('mon','Latency\nMonitor','pink')],
    [('obs','rtmp','RTMP','#3b82f6'),('rtmp','seg','raw stream','#6b7280'),('seg','farm','TS chunks','#f97316'),('farm','origin','multi-bitrate\nHLS','#22c55e'),('origin','cdn','pull','#22c55e'),('cdn','player','adaptive\nsegments','#3b82f6'),('mon','farm','health','#ec4899','dashed'),('chat','player','overlay','#f59e0b','dashed')], **LR)

gen('realtime-matchmaking', 'impl-basic', 'Realtime Matchmaking — Basic',
    [('player','Player\n(MMR+prefs)','blue'),('q','Match Queue','yellow'),('mm','Skill Matcher','teal'),('room','Room Creator','orange'),('gs','Game Server','green')],
    [('player','q','join queue','#3b82f6'),('q','mm','candidates','#f59e0b'),('mm','room','match found','#f97316'),('room','gs','allocate','#22c55e')], **LR)

gen('realtime-matchmaking', 'impl-advanced', 'Realtime Matchmaking — Production',
    [('player','Player\n(MMR, region,\nping, mode)','blue'),('regq','Regional\nQueue (Redis)','red'),('mm','Matchmaker\n(Hungarian algo)','teal'),('lobby','Lobby\nManager','orange'),('alloc','Game Server\nAllocator (Agones)','gray'),('sess','Session Redis','red'),('anticheat','Anti-cheat\nGate','pink'),('gs','Game Server\n(dedicated)','green')],
    [('player','regq','enqueue','#3b82f6'),('regq','mm','candidates','#ef4444'),('mm','lobby','group','#14b8a6'),('lobby','alloc','request server','#f97316'),('alloc','gs','spawn','#22c55e'),('sess','mm','skill data','#ef4444','dashed'),('anticheat','player','check ban','#ec4899','dashed')], **LR)

gen('iot-data-pipeline', 'impl-basic', 'IoT Data Pipeline — Basic',
    [('dev','IoT Device\n(sensor)','blue'),('mqtt','MQTT\nBroker','yellow'),('proc','Stream\nProcessor','orange'),('ts','TimescaleDB','purple'),('dash','Dashboard','pink')],
    [('dev','mqtt','MQTT publish','#3b82f6'),('mqtt','proc','subscribe','#f59e0b'),('proc','ts','write metrics','#6366f1'),('ts','dash','query','#ec4899')], **LR)

gen('iot-data-pipeline', 'impl-advanced', 'IoT Data Pipeline — Production',
    [('dev','Devices\n(millions)','blue'),('gw','MQTT/CoAP\nGateway','gray'),('kafka','Kafka\n(device-partitioned)','yellow'),('sp','Stream\nProcessor (Flink)','teal'),('tsdb','TimescaleDB\n(time-series)','purple'),('anom','Anomaly\nDetector','teal'),('alert','Alert Engine','red'),('dreg','Device\nRegistry','purple'),('ota','OTA Update\nService','orange')],
    [('dev','gw','telemetry','#3b82f6'),('gw','kafka','normalized\nevents','#f59e0b'),('kafka','sp','consume','#f59e0b'),('sp','tsdb','write','#6366f1'),('sp','anom','metrics','#14b8a6'),('anom','alert','anomaly','#ef4444'),('dreg','gw','auth','#6b7280','dashed'),('ota','dev','firmware','#f97316','dashed')], **LR)

gen('realtime-monitoring-alerting', 'impl-basic', 'Realtime Monitoring & Alerting — Basic',
    [('agent','Metrics Agent','blue'),('ing','Metrics\nIngestion','gray'),('storage','TSDB\n(Prometheus)','purple'),('rules','Alert Rules','orange'),('pd','PagerDuty','cyan')],
    [('agent','ing','metrics','#3b82f6'),('ing','storage','write','#6366f1'),('storage','rules','query','#f97316'),('rules','pd','alert','#06b6d4')], **LR)

gen('realtime-monitoring-alerting', 'impl-advanced', 'Realtime Monitoring & Alerting — Production',
    [('agents','Agents\n(Datadog / OTel)','blue'),('gw','Collector\nGateway','gray'),('kafka','Kafka','yellow'),('prom','Prometheus\n(metrics)','orange'),('loki','Loki\n(logs)','orange'),('jaeger','Jaeger\n(traces)','orange'),('corr','Correlator\n(causal linking)','teal'),('am','Alert Manager','red'),('dedup','Deduplicator','orange'),('esc','Escalation\nPolicy','pink'),('graf','Grafana','cyan')],
    [('agents','gw','OTLP','#3b82f6'),('gw','kafka','stream','#f59e0b'),('kafka','prom','metrics','#f97316'),('kafka','loki','logs','#f97316'),('kafka','jaeger','traces','#f97316'),('prom','corr','alerts','#14b8a6'),('loki','corr','errors','#14b8a6'),('corr','am','correlated\nalert','#ef4444'),('am','dedup','fire','#f97316'),('dedup','esc','notify','#ec4899'),('graf','prom','dashboards','#06b6d4','dashed')], **LR)

gen('live-auction-platform', 'impl-basic', 'Live Auction Platform — Basic',
    [('bidder','Bidder','blue'),('api','Bid API','gray'),('engine','Auction Engine\n(Redis)','red'),('notify','Outbid\nNotifier','orange'),('winner','Winner\nDetermination','green')],
    [('bidder','api','place bid','#3b82f6'),('api','engine','validate bid','#ef4444'),('engine','notify','outbid event','#f97316'),('notify','bidder','push notify','#3b82f6'),('engine','winner','auction end','#22c55e')], **LR)

gen('live-auction-platform', 'impl-advanced', 'Live Auction Platform — Production',
    [('bidder','Bidder','blue'),('gw','API Gateway','gray'),('val','Bid Validator\n(inventory+fraud)','orange'),('redis','Auction State\n(Redis ZADD)','red'),('pub','Outbid\nPublisher','yellow'),('ws','WebSocket\nFan-out','gray'),('timer','Anti-snipe\nTimer','orange'),('reserve','Reserve Price\nEngine','teal'),('stripe','Stripe\nSettlement','cyan'),('hist','Bid History\n(Postgres)','purple')],
    [('bidder','gw','bid','#3b82f6'),('gw','val','validate','#6b7280'),('val','redis','ZADD bid','#ef4444'),('redis','pub','new high bid','#f59e0b'),('pub','ws','broadcast','#6b7280'),('ws','bidder','outbid push','#3b82f6'),('redis','timer','extend?','#f97316','dashed'),('redis','reserve','check floor','#14b8a6','dashed'),('redis','stripe','winner settle','#06b6d4'),('val','hist','log bid','#6366f1','dashed')], **LR)

gen('realtime-presence', 'impl-basic', 'Realtime Presence System — Basic',
    [('client','Client\n(heartbeat 30s)','blue'),('svc','Presence\nService','gray'),('redis','Redis\n(TTL per user)','red'),('subs','Subscribers\nNotified','green')],
    [('client','svc','heartbeat','#3b82f6'),('svc','redis','SET user:online\nEX 45','#ef4444'),('redis','subs','expiry /\nkeyspace event','#22c55e')], **LR)

gen('realtime-presence', 'impl-advanced', 'Realtime Presence System — Production',
    [('client','Client\n(heartbeat 30s)','blue'),('gw','Presence\nGateway','gray'),('redis','Redis Cluster\n(user TTL)','red'),('detect','Offline\nDetector','orange'),('lastdb','Last-seen DB\n(Postgres)','purple'),('pubsub','Pub/Sub\n(change events)','yellow'),('ws','WebSocket\nPush','gray'),('fg','Friend Graph\nCache (Redis)','red')],
    [('client','gw','heartbeat','#3b82f6'),('gw','redis','SET EX 45','#ef4444'),('redis','detect','key expiry','#f97316'),('detect','lastdb','write last-seen','#6366f1'),('detect','pubsub','offline event','#f59e0b'),('pubsub','ws','push to friends','#6b7280'),('ws','client','presence update','#3b82f6'),('fg','ws','who to notify','#ef4444','dashed')], **LR)

gen('realtime-geospatial-tracking', 'impl-basic', 'Realtime Geospatial Tracking — Basic',
    [('gps','GPS Device','blue'),('ing','Location\nIngester','gray'),('geo','Redis GEO\nIndex','red'),('map','Map Display\n/ Dashboard','green')],
    [('gps','ing','location','#3b82f6'),('ing','geo','GEOADD','#ef4444'),('geo','map','GEORADIUS\nquery','#22c55e')], **LR)

gen('realtime-geospatial-tracking', 'impl-advanced', 'Realtime Geospatial Tracking — Production',
    [('dev','GPS Devices\n(millions)','blue'),('mqtt','IoT Gateway\n(MQTT)','gray'),('ing','Location\nIngester','orange'),('redis','Redis GEO\n(current pos)','red'),('geofence','Geofence\nEngine','teal'),('alert','Alert\nPublisher','yellow'),('h3','H3 Cell Index\n(heatmap)','teal'),('heat','Heatmap\nGenerator','orange'),('eta','Route Optimizer\n/ ETA','green'),('hist','Location History\n(Postgres+S3)','purple')],
    [('dev','mqtt','NMEA / JSON','#3b82f6'),('mqtt','ing','events','#6b7280'),('ing','redis','GEOADD','#ef4444'),('ing','hist','batch persist','#6366f1','dashed'),('redis','geofence','position','#14b8a6'),('geofence','alert','fence event','#f59e0b'),('ing','h3','cell update','#14b8a6','dashed'),('h3','heat','cell density','#f97316','dashed'),('redis','eta','locations','#22c55e')], **LR)

# ═══════════════════════════════════════════════════════════
# AI PROBLEMS 3 — D/E TIER
# ═══════════════════════════════════════════════════════════

gen('sentiment-analysis', 'impl-basic', 'Sentiment Analysis — Basic',
    [('text','Text Input','blue'),('model','BERT Classifier\n(pos/neg/neu)','teal'),('score','Sentiment\nScore','green'),('db','Results DB','purple')],
    [('text','model','preprocess','#3b82f6'),('model','score','logits','#14b8a6'),('score','db','store','#6366f1')], **LR)

gen('sentiment-analysis', 'impl-advanced', 'Sentiment Analysis — Production',
    [('src','Social / Reviews\n/ Support Tickets','blue'),('kafka','Kafka\nIngest','yellow'),('pre','Pre-processor\n(clean+tokenize)','orange'),('bert','BERT Ensemble\n(aspect-level)','teal'),('agg','Aggregator\n(brand/product)','orange'),('db','Analytics DB\n(Redshift)','purple'),('dash','Sentiment\nDashboard','pink'),('alert','Negative Spike\nAlert','red')],
    [('src','kafka','stream','#3b82f6'),('kafka','pre','consume','#f59e0b'),('pre','bert','tokens','#14b8a6'),('bert','agg','aspect scores','#f97316'),('agg','db','aggregated','#6366f1'),('db','dash','query','#ec4899'),('agg','alert','spike detect','#ef4444','dashed')], **LR)

gen('video-understanding', 'impl-basic', 'Video Understanding — Basic',
    [('video','Video Upload','blue'),('sample','Frame\nSampler','orange'),('vision','Vision Model\n(CLIP/ViT)','teal'),('label','Scene Labels +\nTags','green'),('db','Metadata DB','purple')],
    [('video','sample','mp4','#3b82f6'),('sample','vision','key frames','#f97316'),('vision','label','embeddings','#14b8a6'),('label','db','store','#6366f1')], **LR)

gen('video-understanding', 'impl-advanced', 'Video Understanding — Production',
    [('video','Video Source\n(upload/stream)','blue'),('q','Processing Queue\n(SQS)','yellow'),('dec','Video Decoder\n(FFmpeg)','orange'),('sample','Frame Sampler\n(1fps/scene cut)','orange'),('vision','Vision Backbone\n(ViT-L)','teal'),('cap','Caption Generator\n(BLIP-2)','teal'),('idx','Search Index\n(Elasticsearch)','purple'),('s3','S3\n(frames+features)','purple'),('api','Query API','gray')],
    [('video','q','enqueue','#3b82f6'),('q','dec','job','#f59e0b'),('dec','sample','frame stream','#f97316'),('sample','vision','key frames','#f97316'),('vision','cap','embeddings','#14b8a6'),('cap','idx','captions +\ntags','#6366f1'),('vision','s3','store features','#6366f1','dashed'),('idx','api','semantic\nsearch','#6b7280')], **LR)

gen('ai-surveillance', 'impl-basic', 'AI Surveillance — Basic',
    [('cam','Camera Feed','blue'),('detect','Object Detector\n(YOLOv8)','teal'),('track','Object Tracker\n(ByteTrack)','orange'),('alert','Alert\nEngine','red')],
    [('cam','detect','frames','#3b82f6'),('detect','track','detections','#14b8a6'),('track','alert','track state','#ef4444')], **LR)

gen('ai-surveillance', 'impl-advanced', 'AI Surveillance — Production',
    [('cams','Camera Grid\n(IP/RTSP)','blue'),('edge','Edge Processor\n(NVIDIA Jetson)','orange'),('stream','RTSP Stream\nIngester','gray'),('detect','Detector Pool\n(YOLOv8 GPU)','teal'),('track','Multi-object\nTracker','teal'),('reid','Re-ID Module\n(person match)','teal'),('alert','Alert Engine\n(zone/event)','red'),('s3','Clip Storage\n(S3)','purple'),('vms','VMS\nDashboard','pink')],
    [('cams','edge','H.264 stream','#3b82f6'),('edge','stream','pre-filtered','#f97316'),('stream','detect','frames','#6b7280'),('detect','track','bboxes','#14b8a6'),('track','reid','tracklet','#14b8a6'),('reid','alert','identity match','#ef4444'),('alert','s3','clip save','#6366f1','dashed'),('alert','vms','live alert','#ec4899')], **LR)

gen('ai-product-recommendation', 'impl-basic', 'AI Product Recommendation — Basic',
    [('user','User','blue'),('hist','Purchase History\n+ Browse Events','purple'),('model','Collaborative\nFilter (ALS)','teal'),('recs','Recommended\nProducts','green')],
    [('user','hist','query','#3b82f6'),('hist','model','user-item\nmatrix','#6366f1'),('model','recs','top-k items','#22c55e'),('recs','user','display','#3b82f6')], **LR)

gen('ai-product-recommendation', 'impl-advanced', 'AI Product Recommendation — Production',
    [('user','User','blue'),('feat','Real-time Feature\nBuilder','orange'),('cf','Collaborative\nFilter (ALS)','teal'),('cb','Content-based\nFilter','teal'),('pers','Personalization\nBlender','orange'),('div','Diversity\nFilter','orange'),('cache','Rec Cache\n(Redis TTL)','red'),('kafka','Kafka\n(event log)','yellow'),('fs','Feature Store','purple'),('retr','Daily Retrainer\n(Spark)','teal')],
    [('user','feat','session','#3b82f6'),('feat','cf','features','#f97316'),('feat','cb','features','#f97316'),('fs','feat','history','#6366f1','dashed'),('cf','pers','cf candidates','#14b8a6'),('cb','pers','cb candidates','#14b8a6'),('pers','div','blended','#f97316'),('div','cache','final recs','#ef4444'),('cache','user','serve','#3b82f6'),('kafka','retr','events','#f59e0b','dashed')], **LR)

gen('resume-screening', 'impl-basic', 'Resume Screening — Basic',
    [('resume','Resume PDF','blue'),('parse','Resume Parser\n(Spacy NER)','teal'),('score','JD Matcher\n(cosine sim)','teal'),('rank','Ranked\nCandidates','green')],
    [('resume','parse','text','#3b82f6'),('parse','score','entities','#14b8a6'),('score','rank','match score','#22c55e')], **LR)

gen('resume-screening', 'impl-advanced', 'Resume Screening — Production',
    [('resume','Resume Upload\n(PDF/DOCX)','blue'),('parse','Resume Parser\n(LayoutLM)','teal'),('emb','Skill Embedder\n(BERT)','teal'),('jd','JD Embedder','teal'),('rank','Dual Ranker\n(relevance\n+ diversity)','orange'),('bias','Bias Detector\n(fairness audit)','pink'),('ats','ATS\nDatabase','purple'),('hr','HR Review\nQueue','yellow')],
    [('resume','parse','text','#3b82f6'),('parse','emb','skills','#14b8a6'),('jd','rank','jd vector','#14b8a6'),('emb','rank','resume vec','#14b8a6'),('rank','bias','ranked list','#ec4899'),('bias','ats','fair-scored','#6366f1'),('bias','hr','flagged','#f59e0b','dashed')], **LR)

gen('healthcare-ai-triage', 'impl-basic', 'Healthcare AI Triage — Basic',
    [('patient','Patient\nSymptoms','blue'),('nlu','Clinical NLU\n(symptom parse)','teal'),('triage','Triage\nModel','teal'),('path','Care Pathway\nRouter','orange'),('out','Guidance /\nReferral','green')],
    [('patient','nlu','symptoms','#3b82f6'),('nlu','triage','coded symptoms','#14b8a6'),('triage','path','severity score','#f97316'),('path','out','self-care /\ntelemedicine / ER','#22c55e')], **LR)

gen('healthcare-ai-triage', 'impl-advanced', 'Healthcare AI Triage — Production',
    [('patient','Patient','blue'),('collect','Symptom\nCollector\n(guided Q&A)','orange'),('nlu','Clinical NLU\n(ICD-coded)','teal'),('diff','Differential Dx\nModel','teal'),('risk','Risk Stratifier\n(severity)','teal'),('router','Care Pathway\nRouter','orange'),('ehr','EHR Logger\n(HL7 FHIR)','purple'),('phi','PHI Redactor','pink'),('md','MD Review\nQueue','yellow')],
    [('patient','collect','inputs','#3b82f6'),('collect','nlu','symptom text','#14b8a6'),('nlu','diff','coded\nsymptoms','#14b8a6'),('diff','risk','Dx probabilities','#f97316'),('risk','router','severity','#f97316'),('router','patient','guidance','#22c55e'),('collect','phi','raw text','#ec4899'),('phi','ehr','redacted\ndata','#6366f1'),('risk','md','high-risk','#f59e0b','dashed')], **LR)

gen('ai-flashcard', 'impl-basic', 'AI Flashcard Generator — Basic',
    [('content','Study Content\n(PDF/text)','blue'),('llm','LLM Card\nGenerator','teal'),('cards','Flashcard\nSet','green'),('srs','SRS Scheduler\n(SM-2)','orange')],
    [('content','llm','text chunks','#3b82f6'),('llm','cards','Q&A pairs','#14b8a6'),('cards','srs','schedule','#f97316')], **LR)

gen('ai-flashcard', 'impl-advanced', 'AI Flashcard Generator — Production',
    [('content','Study Material\n(PDF/video/web)','blue'),('ext','Content\nExtractor','orange'),('llm','LLM Card\nGenerator (Claude)','teal'),('diff','Difficulty\nClassifier','teal'),('srs','SRS Scheduler\n(SM-2 / FSRS)','orange'),('db','Card DB\n(Postgres)','purple'),('analytics','Learning\nAnalytics','pink'),('adapt','Adaptive\nReview Engine','teal')],
    [('content','ext','raw text','#3b82f6'),('ext','llm','clean chunks','#f97316'),('llm','diff','Q&A cards','#14b8a6'),('diff','db','difficulty-rated\ncards','#6366f1'),('db','srs','due cards','#f97316'),('srs','adapt','schedule','#14b8a6'),('adapt','db','update intervals','#6366f1'),('analytics','adapt','performance','#ec4899','dashed')], **LR)

gen('music-generation', 'impl-basic', 'Music Generation System — Basic',
    [('user','User Prompt\n(mood/genre/BPM)','blue'),('gen','Music Generator\n(MusicGen)','teal'),('audio','Audio Output\n(MP3/WAV)','green'),('cdn','CDN\nDelivery','green')],
    [('user','gen','prompt','#3b82f6'),('gen','audio','generated\naudio','#14b8a6'),('audio','cdn','upload','#22c55e'),('cdn','user','stream','#3b82f6')], **LR)

gen('music-generation', 'impl-advanced', 'Music Generation System — Production',
    [('user','User','blue'),('cond','Conditioning\nParser','orange'),('gen','Music Generator\n(MusicGen/Suno)','teal'),('post','Post-processor\n(mastering)','orange'),('store','Audio Store\n(S3)','purple'),('cdn','CDN\nStreaming','green'),('q','GPU Job Queue\n(SQS)','yellow'),('cache','Prompt Cache\n(Redis)','red'),('rights','Rights\nManager','pink')],
    [('user','cond','prompt','#3b82f6'),('cond','cache','lookup','#ef4444'),('cache','user','cache hit','#3b82f6'),('cond','q','cache miss','#f59e0b'),('q','gen','job','#f59e0b'),('gen','post','raw audio','#14b8a6'),('post','store','mastered\nMP3','#6366f1'),('store','cdn','distribute','#22c55e'),('cdn','user','stream','#3b82f6'),('rights','store','license\ncheck','#ec4899','dashed')], **LR)

gen('ai-art-generation', 'impl-basic', 'AI Art Generation — Basic',
    [('user','Text Prompt','blue'),('gen','Diffusion Model\n(SDXL)','teal'),('img','Generated\nImage (PNG)','green'),('cdn','CDN\nDelivery','green')],
    [('user','gen','prompt','#3b82f6'),('gen','img','denoised\nlatents','#14b8a6'),('img','cdn','upload','#22c55e'),('cdn','user','serve','#3b82f6')], **LR)

gen('ai-art-generation', 'impl-advanced', 'AI Art Generation — Production',
    [('user','User','blue'),('mod','Prompt\nModerator\n(safety filter)','red'),('q','GPU Job Queue\n(SQS)','yellow'),('gpu','Diffusion Cluster\n(SDXL/FLUX)','teal'),('vae','VAE Decoder\n(latent→pixel)','teal'),('nsfw','NSFW\nClassifier','red'),('s3','S3\nImage Store','purple'),('cdn','CDN Edge','green'),('cache','Similar Prompt\nCache (Redis)','red')],
    [('user','mod','prompt','#3b82f6'),('mod','cache','safe prompt','#ef4444'),('cache','user','cached image','#3b82f6'),('mod','q','cache miss','#f59e0b'),('q','gpu','job','#f59e0b'),('gpu','vae','latents','#14b8a6'),('vae','nsfw','image','#ef4444'),('nsfw','s3','safe image','#6366f1'),('s3','cdn','distribute','#22c55e')], **LR)

gen('npc-dialogue', 'impl-basic', 'NPC Dialogue System — Basic',
    [('player','Player Input','blue'),('nlu','NLU\n(intent parse)','teal'),('state','Dialogue State\nManager','orange'),('llm','LLM Response\n(in-character)','teal'),('npc','NPC Dialogue\nOutput','green')],
    [('player','nlu','speech/text','#3b82f6'),('nlu','state','intent','#14b8a6'),('state','llm','context +\npersonality','#f97316'),('llm','npc','character\nreply','#22c55e')], **LR)

gen('npc-dialogue', 'impl-advanced', 'NPC Dialogue System — Production',
    [('player','Player','blue'),('nlu','NLU Intent\nClassifier','teal'),('state','Dialog State\n(quest+mood)','orange'),('mem','NPC Memory\n(long-term Redis)','red'),('llm','In-character\nLLM (Claude)','teal'),('tts','Text-to-Speech\n(ElevenLabs)','orange'),('anim','Animation\nController','green'),('game','Game Engine\n(Unity/Unreal)','gray')],
    [('player','nlu','text/voice','#3b82f6'),('nlu','state','intent','#14b8a6'),('state','mem','context','#ef4444'),('mem','llm','memory +\npersonality','#14b8a6'),('state','llm','dialog state','#f97316'),('llm','tts','reply text','#f97316'),('tts','anim','audio + lip\nsync cue','#22c55e'),('anim','game','render','#6b7280')], **LR)

gen('ocr-system', 'impl-basic', 'OCR System — Basic',
    [('img','Image / Scan\n(JPEG/PNG)','blue'),('preproc','Image\nPreprocessor','orange'),('ocr','OCR Engine\n(Tesseract)','teal'),('text','Extracted\nText','green'),('db','Document DB','purple')],
    [('img','preproc','raw image','#3b82f6'),('preproc','ocr','cleaned image','#f97316'),('ocr','text','text blocks','#14b8a6'),('text','db','store','#6366f1')], **LR)

gen('ocr-system', 'impl-advanced', 'OCR System — Production',
    [('docs','Documents\n(PDF/scan/photo)','blue'),('q','Job Queue\n(SQS)','yellow'),('preproc','Image Pre-proc\n(deskew/denoise)','orange'),('layout','Layout Detector\n(LayoutLMv3)','teal'),('ocr','OCR Engine\n(EasyOCR/Azure)','teal'),('post','Post-processor\n(spell correct)','orange'),('conf','Confidence\nRouter','orange'),('s3','S3\n(originals)','purple'),('pg','Postgres\n(extracted text)','purple'),('hq','Human Review\n(low-conf)','yellow')],
    [('docs','q','enqueue','#3b82f6'),('q','preproc','job','#f59e0b'),('preproc','layout','clean image','#f97316'),('layout','ocr','region boxes','#14b8a6'),('ocr','post','raw text','#f97316'),('post','conf','corrected','#f97316'),('conf','pg','high-conf','#6366f1'),('conf','hq','low-conf','#f59e0b','dashed'),('docs','s3','archive','#6366f1','dashed')], **LR)

gen('ai-agriculture-advisory', 'impl-basic', 'AI Agriculture Advisory — Basic',
    [('farm','Farm Data\n(soil/weather/crop)','blue'),('model','Crop Health\nModel (CNN+RF)','teal'),('adv','Advisory\nEngine','orange'),('farmer','Farmer\nApp','green')],
    [('farm','model','sensor data','#3b82f6'),('model','adv','predictions','#14b8a6'),('adv','farmer','recommendation','#22c55e')], **LR)

gen('ai-agriculture-advisory', 'impl-advanced', 'AI Agriculture Advisory — Production',
    [('iot','IoT Sensors\n(soil/temp/humid)','blue'),('sat','Satellite\nImagery (NDVI)','cyan'),('weather','Weather API','cyan'),('kafka','Kafka\nIngest','yellow'),('fs','Feature Store\n(farm data)','purple'),('model','Crop Disease\nDetector + Yield\nForecaster','teal'),('adv','Advisory\nGenerator (LLM)','teal'),('app','Farmer App\n(vernacular)','green'),('dash','Agro Expert\nDashboard','pink')],
    [('iot','kafka','telemetry','#3b82f6'),('sat','kafka','imagery','#06b6d4'),('weather','kafka','forecasts','#06b6d4'),('kafka','fs','normalized','#f59e0b'),('fs','model','features','#6366f1'),('model','adv','risk + forecast','#14b8a6'),('adv','app','local lang\nadvice','#22c55e'),('adv','dash','analytics','#ec4899','dashed')], **LR)

# ═══════════════════════════════════════════════════════════
# AI-SOLVES-CLASSIC PROBLEMS
# ═══════════════════════════════════════════════════════════

gen('ai-scalper-detection', 'impl-basic', 'AI Scalper Detection — Basic',
    [('req','Purchase\nRequest','blue'),('fp','Device\nFingerprint','orange'),('ml','ML Bot Scorer\n(XGBoost)','teal'),('risk','Risk\nDecision','orange'),('out','Allow /\nCAPTCHA / Block','green')],
    [('req','fp','request headers','#3b82f6'),('fp','ml','fingerprint\nfeatures','#f97316'),('ml','risk','bot score','#14b8a6'),('risk','out','decision','#22c55e')], **LR)

gen('ai-scalper-detection', 'impl-advanced', 'AI Scalper Detection — Production',
    [('req','Purchase\nRequest','blue'),('bfp','Behavioral\nFingerprint\n(mouse+keys)','orange'),('ml','ML Scorer\n(XGBoost)','teal'),('graph','Device Graph\n(Redis)','red'),('risk','Risk Engine\n(composite)','teal'),('captcha','CAPTCHA\nEscalation','orange'),('q','Queue\n(virtual wait)','yellow'),('block','Block /\nRate Limit','red'),('feedback','Feedback Loop\nRetrainer','pink')],
    [('req','bfp','js events','#3b82f6'),('bfp','ml','feature vec','#f97316'),('ml','risk','model score','#14b8a6'),('graph','risk','device degree','#ef4444'),('risk','q','medium-risk','#f59e0b'),('risk','captcha','high-risk','#f97316'),('risk','block','bot','#ef4444'),('feedback','ml','labels','#ec4899','dashed')], **LR)

gen('ai-dynamic-pricing', 'impl-basic', 'AI Dynamic Pricing — Basic',
    [('signals','Price Signals\n(demand/inventory)','blue'),('model','Pricing Model\n(gradient boost)','teal'),('price','Optimal\nPrice','green'),('pub','Price Publisher','orange')],
    [('signals','model','features','#3b82f6'),('model','price','prediction','#14b8a6'),('price','pub','publish','#22c55e')], **LR)

gen('ai-dynamic-pricing', 'impl-advanced', 'AI Dynamic Pricing — Production',
    [('demand','Demand Signals\n(clicks/carts)','blue'),('inv','Inventory\nLevels','purple'),('comp','Competitor\nScraper','orange'),('fs','Feature Store','purple'),('model','Price Model\n(gradient boost\n+ elasticity)','teal'),('const','Constraint\nEngine\n(min/max)','orange'),('ab','A/B Test\nGate','yellow'),('pub','Price Publisher\n(Redis)','red'),('notif','Price Drop\nNotifier','green')],
    [('demand','fs','demand feat','#3b82f6'),('inv','fs','stock level','#6366f1'),('comp','fs','comp prices','#f97316'),('fs','model','feature vec','#6366f1'),('model','const','raw price','#14b8a6'),('const','ab','bounded price','#f59e0b'),('ab','pub','winning price','#ef4444'),('pub','notif','drop event','#22c55e','dashed')], **LR)

gen('ai-driver-matching', 'impl-basic', 'AI Driver Matching — Basic',
    [('rider','Ride Request\n(location)','blue'),('pool','Driver Pool\n(available)','orange'),('rank','ML Match\nRanker (NN)','teal'),('assign','Assignment\nEngine','gray'),('driver','Assigned\nDriver','green')],
    [('rider','rank','request feat','#3b82f6'),('pool','rank','driver features','#f97316'),('rank','assign','top-k ranked','#14b8a6'),('assign','driver','dispatch','#22c55e')], **LR)

gen('ai-driver-matching', 'impl-advanced', 'AI Driver Matching — Production',
    [('rider','Rider Request','blue'),('filt','Eligibility\nFilter','orange'),('feat','Feature Builder\n(location+ETA\n+rating)','orange'),('rank','Match Ranker\n(neural net)','teal'),('stable','Stable Match\n(GS algorithm)','teal'),('dispatch','Dispatch\nEngine','gray'),('eta','ETA Model','teal'),('supply','Supply\nPredictor','teal'),('redis','Driver State\n(Redis GEO)','red')],
    [('rider','filt','request','#3b82f6'),('filt','feat','eligible drivers','#f97316'),('redis','feat','driver locations','#ef4444'),('feat','rank','feature matrix','#f97316'),('rank','stable','scores','#14b8a6'),('stable','dispatch','match','#22c55e'),('eta','rank','eta estimates','#14b8a6','dashed'),('supply','dispatch','demand zones','#14b8a6','dashed')], **LR)

gen('ai-surge-pricing', 'impl-basic', 'AI Surge Pricing — Basic',
    [('demand','Rider Requests\n(demand signal)','blue'),('supply','Driver Locations\n(supply signal)','orange'),('surge','Surge Model\n(ratio-based)','teal'),('mult','Surge Multiplier','green'),('pub','Price Publisher','gray')],
    [('demand','surge','demand count','#3b82f6'),('supply','surge','supply count','#f97316'),('surge','mult','multiplier','#22c55e'),('mult','pub','publish','#6b7280')], **LR)

gen('ai-surge-pricing', 'impl-advanced', 'AI Surge Pricing — Production',
    [('riders','Rider Requests','blue'),('drivers','Driver\nLocations','orange'),('demforecast','Demand\nForecaster (LSTM)','teal'),('suppredict','Supply\nPredictor','teal'),('surge','Surge Calculator\n(elasticity model)','teal'),('cap','Cap Enforcer\n(regulatory max)','orange'),('pub','Price Publisher\n(Redis)','red'),('notify','Rider\nNotification','green'),('kafka','Kafka\n(events)','yellow')],
    [('riders','kafka','request events','#3b82f6'),('drivers','kafka','location updates','#f97316'),('kafka','demforecast','demand','#f59e0b'),('kafka','suppredict','supply','#f59e0b'),('demforecast','surge','demand forecast','#14b8a6'),('suppredict','surge','supply forecast','#14b8a6'),('surge','cap','raw multiplier','#f97316'),('cap','pub','capped mult','#ef4444'),('pub','notify','surge alert','#22c55e')], **LR)

gen('ai-cold-start-recommendation', 'impl-basic', 'Cold-Start Recommendation — Basic',
    [('newuser','New User','blue'),('demo','Demographic\nSignals','orange'),('pop','Popularity\nModel','teal'),('recs','Initial\nRecs','green')],
    [('newuser','demo','profile','#3b82f6'),('demo','pop','segment','#f97316'),('pop','recs','top items','#22c55e'),('recs','newuser','display','#3b82f6')], **LR)

gen('ai-cold-start-recommendation', 'impl-advanced', 'Cold-Start Recommendation — Production',
    [('newuser','New User','blue'),('onboard','Onboarding\nQuiz (5 picks)','orange'),('cb','Content-based\nFilter (item2item)','teal'),('bandit','Explore Policy\n(UCB bandit)','teal'),('implicit','Implicit Feedback\nCollector','yellow'),('cf','Collaborative\nFilter Bootstrap','teal'),('redis','Rec Cache\n(Redis TTL 1h)','red'),('retrain','Real-time\nUpdater','orange')],
    [('newuser','onboard','initial picks','#3b82f6'),('onboard','cb','taste seeds','#f97316'),('cb','bandit','seed recs','#14b8a6'),('bandit','redis','explore recs','#ef4444'),('redis','newuser','serve','#3b82f6'),('newuser','implicit','clicks/watches','#f59e0b','dashed'),('implicit','cf','feedback','#14b8a6','dashed'),('cf','retrain','update model','#f97316','dashed')], **LR)

gen('ai-social-bot-detection', 'impl-basic', 'Social Bot Detection — Basic',
    [('acct','Account\nActivity','blue'),('feat','Feature\nExtractor','orange'),('cls','Bot Classifier\n(GBM)','teal'),('label','Bot Label +\nConf Score','green'),('action','Action\n(warn/suspend)','red')],
    [('acct','feat','signals','#3b82f6'),('feat','cls','feature vec','#f97316'),('cls','label','prediction','#14b8a6'),('label','action','high conf','#ef4444')], **LR)

gen('ai-social-bot-detection', 'impl-advanced', 'Social Bot Detection — Production',
    [('acct','Account Activity\n(tweets/follows)','blue'),('graph','Graph Features\n(follower ratio,\nretweet patterns)','teal'),('nlp','NLP Features\n(tweet text,\nlexical diversity)','teal'),('temp','Temporal Features\n(posting cadence)','teal'),('ens','Ensemble\nClassifier','teal'),('router','Confidence\nRouter','orange'),('human','Human Review\nQueue','yellow'),('appeals','Appeals API','cyan'),('action','Enforcement\nEngine','red')],
    [('acct','graph','graph signals','#3b82f6'),('acct','nlp','text','#3b82f6'),('acct','temp','timestamps','#3b82f6'),('graph','ens','graph feats','#14b8a6'),('nlp','ens','text feats','#14b8a6'),('temp','ens','time feats','#14b8a6'),('ens','router','score','#f97316'),('router','action','high-conf bot','#ef4444'),('router','human','borderline','#f59e0b','dashed'),('action','appeals','suspended','#06b6d4','dashed')], **LR)

gen('ai-click-fraud-detection', 'impl-basic', 'AI Click Fraud Detection — Basic',
    [('click','Ad Click\nEvent','blue'),('feat','Feature\nExtractor','orange'),('model','Fraud Scorer\n(real-time)','teal'),('decide','Valid /\nFraud','green')],
    [('click','feat','signals','#3b82f6'),('feat','model','feature vec','#f97316'),('model','decide','fraud score','#14b8a6')], **LR)

gen('ai-click-fraud-detection', 'impl-advanced', 'AI Click Fraud Detection — Production (<50ms)',
    [('click','Click Event\n(IP+UA+referer)','blue'),('feat','Feature Extractor\n(behavior+device)','orange'),('rt','Real-time Scorer\n(LightGBM <50ms)','teal'),('iprep','IP Reputation\nDB (Redis)','red'),('pattern','Pattern Detector\n(click farms)','teal'),('decide','Fraud Decision','orange'),('journal','Fraud Journal\n(Postgres)','purple'),('refund','Refund Engine\n(advertiser)','green'),('retr','Offline Retrainer\n(daily)','pink')],
    [('click','feat','raw event','#3b82f6'),('feat','rt','feature vec','#f97316'),('iprep','rt','ip score','#ef4444'),('rt','pattern','score','#14b8a6'),('pattern','decide','fraud signal','#f97316'),('decide','journal','log','#6366f1','dashed'),('decide','refund','fraud click','#22c55e'),('journal','retr','labeled data','#ec4899','dashed')], **LR)

gen('ai-delivery-eta', 'impl-basic', 'AI Delivery ETA — Basic',
    [('order','Order + Driver\nLocation','blue'),('feat','Feature Builder\n(route+traffic)','orange'),('model','ETA Model\n(gradient boost)','teal'),('eta','Predicted ETA\n(±5 min)','green')],
    [('order','feat','order data','#3b82f6'),('feat','model','feature vec','#f97316'),('model','eta','prediction','#22c55e')], **LR)

gen('ai-delivery-eta', 'impl-advanced', 'AI Delivery ETA — Production',
    [('order','Order','blue'),('driver','Driver Location\n(GPS stream)','blue'),('traffic','Traffic API\n(Google/HERE)','cyan'),('weather','Weather API','cyan'),('hist','Driver History\n(DB)','purple'),('feat','Feature Builder','orange'),('model','ETA Model\n(GBDT ensemble)','teal'),('unc','Uncertainty\nEstimator','teal'),('cache','Redis ETA\nCache','red'),('push','Push Notification\n(customer)','green'),('feedback','Feedback Loop\nRetrainer','pink')],
    [('order','feat','order attrs','#3b82f6'),('driver','feat','location','#3b82f6'),('traffic','feat','traffic','#06b6d4'),('weather','feat','conditions','#06b6d4'),('hist','feat','driver perf','#6366f1','dashed'),('feat','model','features','#f97316'),('model','unc','point estimate','#14b8a6'),('unc','cache','ETA + range','#ef4444'),('cache','push','ETA','#22c55e'),('push','feedback','accuracy','#ec4899','dashed')], **LR)

gen('ai-smart-pricing-rentals', 'impl-basic', 'AI Smart Pricing — Rentals — Basic',
    [('prop','Property\nAttributes','blue'),('demand','Demand Calendar\n(occupancy)','orange'),('model','Pricing Model\n(ML)','teal'),('price','Recommended\nPrice','green')],
    [('prop','model','features','#3b82f6'),('demand','model','demand feat','#f97316'),('model','price','prediction','#22c55e')], **LR)

gen('ai-smart-pricing-rentals', 'impl-advanced', 'AI Smart Pricing — Rentals — Production',
    [('prop','Property Attrs\n(beds/location/\namenities)','blue'),('demand','Demand Calendar\n(search traffic)','orange'),('comp','Comparable\nListings (scraped)','orange'),('events','Local Events\nAPI','cyan'),('fs','Feature Store','purple'),('model','Pricing Model\n(GBDT + seasonal)','teal'),('bounds','Price Boundary\nEngine (floor/ceil)','orange'),('ab','A/B Test\nRouter','yellow'),('notif','Host Notification\n(dashboard/push)','green'),('retr','Seasonal\nRetrainer (monthly)','pink')],
    [('prop','fs','property','#3b82f6'),('demand','fs','demand','#f97316'),('comp','fs','comp prices','#f97316'),('events','fs','event boost','#06b6d4'),('fs','model','feature vec','#6366f1'),('model','bounds','raw price','#14b8a6'),('bounds','ab','bounded price','#f59e0b'),('ab','notif','final price','#22c55e'),('model','retr','feedback','#ec4899','dashed')], **LR)

gen('ai-job-matching', 'impl-basic', 'AI Job Matching — Basic',
    [('resume','Resume','blue'),('ext','Skill Extractor\n(NER)','teal'),('emb','BERT\nEmbedder','teal'),('idx','Job Index\n(FAISS)','purple'),('jobs','Ranked Jobs','green')],
    [('resume','ext','text','#3b82f6'),('ext','emb','skills','#14b8a6'),('emb','idx','candidate vec','#6366f1'),('idx','jobs','top-k jobs','#22c55e')], **LR)

gen('ai-job-matching', 'impl-advanced', 'AI Job Matching — Production',
    [('resume','Resume + Profile','blue'),('emb','Embedding Model\n(BERT fine-tuned)','teal'),('jd','Job Embedder\n(per JD)','teal'),('idx','Job Index\n(FAISS)','purple'),('rank','Dual Ranker\n(relevance +\npreference)','teal'),('exp','Explanation\nGenerator','orange'),('pers','Re-rank\n(salary+location\n+growth)','orange'),('push','Job Alert\nNotifier','green'),('fs','Feature Store\n(apply history)','purple')],
    [('resume','emb','profile text','#3b82f6'),('emb','idx','candidate vec','#6366f1'),('jd','idx','job vectors','#14b8a6'),('idx','rank','top-100 jobs','#6366f1'),('fs','rank','preference feat','#6366f1','dashed'),('rank','pers','relevance\nscores','#f97316'),('pers','exp','ranked list','#f97316'),('exp','push','matched jobs\n+ explanation','#22c55e')], **LR)

gen('ai-ecommerce-search-ranking', 'impl-basic', 'AI E-commerce Search Ranking — Basic',
    [('query','Search Query','blue'),('bm25','BM25\nRetrieval','teal'),('ltr','Learning-to-Rank\n(LambdaMART)','teal'),('results','Ranked\nProducts','green')],
    [('query','bm25','query','#3b82f6'),('bm25','ltr','candidates','#14b8a6'),('ltr','results','ranked list','#22c55e')], **LR)

gen('ai-ecommerce-search-ranking', 'impl-advanced', 'AI E-commerce Search Ranking — Production',
    [('query','Search Query','blue'),('expand','Query Expansion\n(LLM synonyms)','teal'),('bm25','BM25\nRetriever','teal'),('vec','Vector\nRetriever (ANN)','teal'),('ltr','LambdaMART\nRanker','teal'),('pers','Personalization\nLayer','orange'),('div','Diversity\nFilter','orange'),('api','Product API','gray'),('kafka','Click Feedback\n(Kafka)','yellow'),('retr','Online\nRetrainer','pink'),('cache','Result Cache\n(Redis)','red')],
    [('query','expand','query','#3b82f6'),('expand','bm25','expanded\nquery','#14b8a6'),('expand','vec','query vector','#14b8a6'),('bm25','ltr','candidates','#14b8a6'),('vec','ltr','candidates','#14b8a6'),('ltr','pers','ranked','#f97316'),('pers','div','personalized','#f97316'),('div','cache','final list','#ef4444'),('cache','api','products','#6b7280'),('api','kafka','click events','#f59e0b','dashed'),('kafka','retr','feedback','#ec4899','dashed')], **LR)

gen('ai-airline-booking-chatbot', 'impl-basic', 'AI Airline Booking Chatbot — Basic',
    [('user','User Message','blue'),('nlu','NLU\n(intent+entities)','teal'),('api','Flight\nSearch API','cyan'),('engine','Booking\nEngine','orange'),('resp','Confirmation\nResponse','green')],
    [('user','nlu','message','#3b82f6'),('nlu','api','origin/dest/date','#14b8a6'),('api','engine','flight options','#06b6d4'),('engine','resp','booking + PNR','#22c55e')], **LR)

gen('ai-airline-booking-chatbot', 'impl-advanced', 'AI Airline Booking Chatbot — Production',
    [('user','User','blue'),('auth','Auth Gate\n(OAuth/Guest)','orange'),('intent','Intent\nClassifier\n(search/book/cancel)','teal'),('entity','Entity Extractor\n(origin/dest/date)','teal'),('dm','Dialog Manager\n(multi-turn)','orange'),('search','Flight Search\nAPI (Amadeus/Sabre)','cyan'),('price','Price\nComparator','teal'),('book','Booking Engine\n(PNR creation)','orange'),('email','Email\nConfirmation','green'),('sess','Session Redis\n(multi-turn ctx)','red'),('pay','Payment\nGateway (Stripe)','cyan')],
    [('user','auth','message','#3b82f6'),('auth','intent','authed user','#f97316'),('intent','entity','intent','#14b8a6'),('entity','dm','entities','#f97316'),('dm','search','search intent','#06b6d4'),('search','price','flights','#06b6d4'),('price','dm','best options','#f97316'),('dm','sess','context','#ef4444'),('dm','book','confirm intent','#f97316'),('book','pay','charge','#06b6d4'),('pay','email','success','#22c55e')], **LR)

gen('ai-banking-chatbot', 'impl-basic', 'AI Banking Chatbot — Basic',
    [('cust','Customer\nMessage','blue'),('auth','Auth Gate\n(biometric/PIN)','red'),('nlu','NLU\n(intent)','teal'),('bank','Banking APIs\n(balance/transfer)','cyan'),('resp','Secure\nResponse','green')],
    [('cust','auth','message','#3b82f6'),('auth','nlu','verified user','#ef4444'),('nlu','bank','intent +\naccount','#14b8a6'),('bank','resp','result','#22c55e')], **LR)

gen('ai-banking-chatbot', 'impl-advanced', 'AI Banking Chatbot — Production',
    [('cust','Customer','blue'),('authgate','Auth Gate\n(biometric/PIN/OTP)','red'),('nlu','NLU (BERT)\n(intent+entities)','teal'),('pii','PII Detector\n(redact acct#)','pink'),('router','Service Router','orange'),('balance','Balance/History\nService','cyan'),('transfer','Transfer\nService','cyan'),('dispute','Dispute\nService','cyan'),('comply','Compliance\nLogger (SOC2)','purple'),('sanitize','Response\nSanitizer','orange'),('fraud','Fraud Monitor\n(real-time)','red'),('audit','Audit Trail\n(immutable)','purple')],
    [('cust','authgate','message','#3b82f6'),('authgate','nlu','verified','#ef4444'),('nlu','pii','parsed intent','#14b8a6'),('pii','router','safe tokens','#ec4899'),('router','balance','balance intent','#06b6d4'),('router','transfer','transfer intent','#06b6d4'),('router','dispute','dispute intent','#06b6d4'),('balance','sanitize','data','#f97316'),('sanitize','cust','clean response','#22c55e'),('nlu','comply','log intent','#6366f1','dashed'),('fraud','authgate','fraud signal','#ef4444','dashed'),('comply','audit','log','#6366f1','dashed')], **LR)

gen('ai-healthcare-chatbot', 'impl-basic', 'AI Healthcare Chatbot — Basic',
    [('patient','Patient\nSymptoms','blue'),('nlu','Clinical NLU','teal'),('triage','Triage\nClassifier','teal'),('severity','Severity\nScore','orange'),('guidance','Care\nGuidance','green')],
    [('patient','nlu','symptoms','#3b82f6'),('nlu','triage','coded symptoms','#14b8a6'),('triage','severity','risk level','#f97316'),('severity','guidance','pathway','#22c55e')], **LR)

gen('ai-healthcare-chatbot', 'impl-advanced', 'AI Healthcare Chatbot — Production',
    [('patient','Patient','blue'),('collect','Symptom Collector\n(guided Q&A)','orange'),('nlu','Clinical NLU\n(ICD-10 coded)','teal'),('diff','Differential Dx\nModel (clinical BERT)','teal'),('risk','Risk Stratifier\n(severity 1-5)','teal'),('router','Care Pathway Router\n(self-care/\ntelemedicine/ER)','orange'),('ehr','EHR Logger\n(HL7 FHIR)','purple'),('phi','PHI Redactor\n(Presidio)','pink'),('md','MD Review Queue\n(high-risk)','yellow'),('telemedicine','Telemedicine\nBooking API','cyan')],
    [('patient','collect','chat input','#3b82f6'),('collect','nlu','symptom text','#14b8a6'),('nlu','diff','coded\nsymptoms','#14b8a6'),('diff','risk','Dx candidates','#f97316'),('risk','router','severity score','#f97316'),('router','patient','guidance','#22c55e'),('router','telemedicine','book appt','#06b6d4'),('collect','phi','raw text','#ec4899'),('phi','ehr','redacted FHIR\nresource','#6366f1'),('risk','md','severity ≥4','#f59e0b','dashed')], **LR)

# ═══════════════════════════════════════════════════════════
# E-COMMERCE PROBLEMS
# ═══════════════════════════════════════════════════════════

gen('grocery-delivery', 'impl-basic', 'Grocery Delivery — Basic',
    [('order','Customer\nOrder','blue'),('assign','Shopper\nAssignment','orange'),('shop','Pick & Pack\n(in-store)','teal'),('driver','Driver\nDelivery','orange'),('delivery','Delivery\nComplete','green')],
    [('order','assign','place order','#3b82f6'),('assign','shop','assign shopper','#f97316'),('shop','driver','packed bags','#14b8a6'),('driver','delivery','deliver','#22c55e')], **LR)

gen('grocery-delivery', 'impl-advanced', 'Grocery Delivery — Production',
    [('cust','Customer\nOrder','blue'),('sub','Substitution\nEngine (live inv)','teal'),('shopapp','Shopper App\n(pick list)','orange'),('inv','Store Inventory\nAPI (real-time)','purple'),('bag','Bag Router\n(multi-order batch)','orange'),('pool','Driver Pool\n(last-mile)','orange'),('track','Delivery Tracker\n(WebSocket)','gray'),('weight','Weight Reconcile\n(± charge)','cyan'),('stripe','Final Charge\n(Stripe)','cyan')],
    [('cust','sub','order','#3b82f6'),('sub','inv','check stock','#6366f1'),('inv','sub','availability','#6366f1'),('sub','shopapp','pick list\n+ subs','#f97316'),('shopapp','bag','scanned items','#f97316'),('bag','pool','ready for\npickup','#f97316'),('pool','track','driver location','#6b7280'),('track','cust','ETA push','#3b82f6'),('shopapp','weight','item weights','#06b6d4'),('weight','stripe','final charge','#06b6d4')], **LR)

gen('buy-now-pay-later', 'impl-basic', 'Buy Now Pay Later — Basic',
    [('purchase','Customer\nPurchase','blue'),('score','Credit\nDecision Engine','teal'),('merchant','Merchant\nSettlement','cyan'),('sched','Installment\nScheduler','orange'),('collect','Collection\nService','green')],
    [('purchase','score','credit check','#3b82f6'),('score','merchant','approved: pay full','#06b6d4'),('score','sched','installment plan','#f97316'),('sched','collect','collect on due dates','#22c55e')], **LR)

gen('buy-now-pay-later', 'impl-advanced', 'Buy Now Pay Later — Production',
    [('purchase','Purchase\nRequest','blue'),('kyc','KYC + Identity\nVerification','orange'),('bureau','Soft Bureau Pull\n(no hard inquiry)','cyan'),('fraud','Fraud Model\n(device+behavior)','teal'),('default','Default Risk\nModel (credit hist)','teal'),('approve','Approval Engine\n(limit+rate)','orange'),('settle','Merchant\nSettlement (T+1)','cyan'),('ledger','Installment Ledger\n(Postgres)','purple'),('collect','Collection Engine\n(Stripe + dunning)','orange'),('default_handler','Default Handler\n(collections)','red')],
    [('purchase','kyc','identity','#3b82f6'),('kyc','bureau','verified user','#06b6d4'),('bureau','fraud','credit data','#f97316'),('bureau','default','credit data','#14b8a6'),('fraud','approve','fraud score','#f97316'),('default','approve','default score','#14b8a6'),('approve','settle','approved','#06b6d4'),('approve','ledger','installment plan','#6366f1'),('ledger','collect','due payment','#f97316'),('collect','default_handler','failed','#ef4444','dashed')], **LR)

gen('loyalty-rewards', 'impl-basic', 'Loyalty Rewards Platform — Basic',
    [('purchase','Purchase\nEvent','blue'),('earn','Earn Engine\n(points calc)','teal'),('ledger','Points Ledger\n(Postgres)','purple'),('redeem','Redemption\nValidator','orange'),('reward','Reward\nFulfillment','green')],
    [('purchase','earn','transaction','#3b82f6'),('earn','ledger','points credit','#6366f1'),('ledger','redeem','balance check','#6366f1'),('redeem','reward','approve redeem','#22c55e')], **LR)

gen('loyalty-rewards', 'impl-advanced', 'Loyalty Rewards Platform — Production',
    [('txn','Transaction\nEvent','blue'),('earn','Earn Engine\n(rule / partner)','teal'),('ledger','Points Ledger\n(append-only PG)','purple'),('cache','Balance Cache\n(Redis)','red'),('redeem','Redemption\nValidator\n(idempotent)','orange'),('partner','Partner API\n(airline/hotel)','cyan'),('fraud','Fraud Detector\n(point farming)','pink'),('expire','Expiry Engine\n(TTL job)','orange'),('kafka','Event Bus\n(Kafka)','yellow')],
    [('txn','earn','purchase','#3b82f6'),('earn','ledger','credit points\n(append)','#6366f1'),('ledger','cache','sync balance','#ef4444'),('cache','redeem','balance','#ef4444'),('redeem','partner','partner reward','#06b6d4'),('redeem','ledger','debit points','#6366f1'),('txn','kafka','events','#f59e0b','dashed'),('kafka','fraud','monitor','#ec4899','dashed'),('expire','ledger','expire batch','#6366f1','dashed')], **LR)

gen('last-mile-delivery', 'impl-basic', 'Last-Mile Delivery — Basic',
    [('orders','Orders\n(zone batch)','blue'),('route','Route Planner\n(VRP solver)','teal'),('driver','Driver App\n(optimized route)','orange'),('pod','Proof of\nDelivery (scan)','green')],
    [('orders','route','batch orders','#3b82f6'),('route','driver','optimized stops','#14b8a6'),('driver','pod','scan package','#22c55e')], **LR)

gen('last-mile-delivery', 'impl-advanced', 'Last-Mile Delivery — Production',
    [('orders','Order Batch','blue'),('cluster','Cluster Optimizer\n(k-means by zone)','teal'),('vrp','Route Engine\n(VRP solver)','teal'),('driver','Driver App\n(turn-by-turn)','orange'),('reroute','Live Re-router\n(traffic API)','orange'),('pod','POD Scanner\n(barcode/photo)','green'),('notify','Customer\nNotification','green'),('sla','SLA Monitor\n(on-time rate)','pink'),('carrier','Carrier API\n(label print)','cyan')],
    [('orders','cluster','orders','#3b82f6'),('cluster','vrp','zone clusters','#14b8a6'),('vrp','driver','stop sequence','#14b8a6'),('driver','reroute','GPS location','#f97316'),('reroute','driver','updated route','#f97316'),('driver','pod','arrive at stop','#22c55e'),('pod','notify','delivered','#22c55e'),('sla','vrp','time constraints','#ec4899','dashed'),('carrier','vrp','label','#06b6d4','dashed')], **LR)

gen('marketplace-seller-platform', 'impl-basic', 'Marketplace Seller Platform — Basic',
    [('seller','Seller Lists\nProduct','blue'),('catalog','Catalog\nService','purple'),('buybox','Buy Box\nEngine','teal'),('order','Order\nRouter','orange'),('fulfill','Fulfillment','green')],
    [('seller','catalog','listing','#3b82f6'),('catalog','buybox','product data','#6366f1'),('buybox','order','winner','#14b8a6'),('order','fulfill','order','#22c55e')], **LR)

gen('marketplace-seller-platform', 'impl-advanced', 'Marketplace Seller Platform — Production',
    [('seller','Seller','blue'),('val','Listing Validator\n(policy+compliance)','orange'),('catalog','Catalog Service\n(attribute norm)','purple'),('buybox','Buy Box Engine\n(price+fulfillment\n+rating)','teal'),('inv','Inventory Sync\n(real-time)','orange'),('order','Order Router\n(FBA/MFN/3PL)','gray'),('payout','Payout Engine\n(bi-weekly)','cyan'),('perf','Performance\nDashboard','pink'),('stripecon','Stripe Connect','cyan')],
    [('seller','val','listing','#3b82f6'),('val','catalog','approved listing','#f97316'),('catalog','buybox','product','#6366f1'),('inv','buybox','stock level','#f97316'),('buybox','order','route order','#14b8a6'),('order','payout','sold items','#06b6d4'),('payout','stripecon','transfer','#06b6d4'),('order','perf','metrics','#ec4899','dashed')], **LR)

gen('price-comparison-engine', 'impl-basic', 'Price Comparison Engine — Basic',
    [('user','User Search\n(product name)','blue'),('idx','Price Index\n(Elasticsearch)','purple'),('compare','Price Comparator\n(multi-merchant)','teal'),('results','Best Price\nResults','green')],
    [('user','idx','query','#3b82f6'),('idx','compare','candidates','#6366f1'),('compare','results','ranked by price','#22c55e')], **LR)

gen('price-comparison-engine', 'impl-advanced', 'Price Comparison Engine — Production',
    [('scrapers','Merchant\nScrapers (100+)','orange'),('norm','Price Normalizer\n(currency/unit)','orange'),('db','Merchant DB\n(Postgres)','purple'),('idx','Price Index\n(Elasticsearch)','purple'),('user','User Search','blue'),('rank','Price Ranker\n(+ availability)','teal'),('alert','Price Drop\nAlert Engine','yellow'),('hist','Historical\nPrice Charts','green'),('aff','Affiliate Link\nGenerator','cyan')],
    [('scrapers','norm','raw prices','#f97316'),('norm','db','normalized price','#6366f1'),('db','idx','index update','#6366f1'),('user','idx','keyword query','#3b82f6'),('idx','rank','candidates','#6366f1'),('rank','hist','ranked results','#22c55e'),('db','alert','price change','#f59e0b','dashed'),('alert','user','email/push','#f59e0b','dashed'),('rank','aff','product links','#06b6d4','dashed')], **LR)

gen('subscription-commerce', 'impl-basic', 'Subscription Commerce — Basic',
    [('sub','Subscriber','blue'),('bill','Billing Engine\n(Stripe)','cyan'),('fulfill','Fulfillment\nTrigger','orange'),('box','Box Picker\n(personalized)','teal'),('ship','Shipment','green')],
    [('sub','bill','renewal date','#3b82f6'),('bill','fulfill','charge success','#06b6d4'),('fulfill','box','trigger build','#f97316'),('box','ship','packed box','#22c55e')], **LR)

gen('subscription-commerce', 'impl-advanced', 'Subscription Commerce — Production',
    [('sub','Subscriber','blue'),('dunning','Smart Dunning\n(retry on card fail)','orange'),('rev','Revenue\nRecognizer\n(deferred)','teal'),('fulfill','Fulfillment\nTrigger','orange'),('pers','Personalization\nEngine (quiz+hist)','teal'),('pick','Box Picker\n(inventory match)','teal'),('wms','WMS\n(pick+pack)','orange'),('ship','Carrier\nManifest (USPS/UPS)','cyan'),('churn','Churn Predictor\n(at-risk flag)','pink'),('stripe','Stripe\nSubscriptions','cyan')],
    [('sub','stripe','charge card','#3b82f6'),('stripe','dunning','failed charge','#f97316'),('dunning','stripe','retry in 3/5/7d','#f97316'),('stripe','rev','charge success','#14b8a6'),('rev','fulfill','recognized\nrevenue','#f97316'),('fulfill','pers','user profile','#14b8a6'),('pers','pick','preferences','#14b8a6'),('pick','wms','box contents','#f97316'),('wms','ship','label','#06b6d4'),('churn','sub','save offer','#ec4899','dashed')], **LR)

gen('warehouse-inventory', 'impl-basic', 'Warehouse Inventory Management — Basic',
    [('inbound','Receiving\nDock','blue'),('putaway','Put-away\n(slot assignment)','orange'),('pick','Pick\n(wave)','teal'),('pack','Pack\nStation','orange'),('ship','Shipping\n(manifest)','green')],
    [('inbound','putaway','ASN match','#3b82f6'),('putaway','pick','slotted','#f97316'),('pick','pack','picked items','#14b8a6'),('pack','ship','packed order','#22c55e')], **LR)

gen('warehouse-inventory', 'impl-advanced', 'Warehouse Inventory Management — Production',
    [('dock','Receiving Dock\n(RFID/barcode)','blue'),('asn','ASN Matcher\n(PO reconcile)','orange'),('slot','Slotting Engine\n(velocity-based)','teal'),('wave','Pick Wave\nOptimizer','teal'),('ptl','Pick-to-Light\n(LED guided)','orange'),('qc','Quality Gate\n(weight check)','orange'),('pack','Pack Station\n(cartonization)','orange'),('carrier','Carrier Manifest\n(UPS/FedEx)','cyan'),('inv','Inventory Ledger\n(Postgres)','purple'),('wcs','Warehouse Control\nSystem (conveyors)','gray')],
    [('dock','asn','scan receipt','#3b82f6'),('asn','slot','received inv','#f97316'),('slot','inv','location assigned','#6366f1'),('slot','wave','pickable items','#14b8a6'),('wave','ptl','pick wave','#f97316'),('ptl','qc','picked items','#f97316'),('qc','pack','pass','#f97316'),('pack','carrier','label + manifest','#06b6d4'),('wcs','ptl','conveyor\nrouting','#6b7280','dashed')], **LR)

gen('social-commerce', 'impl-basic', 'Social Commerce — Basic',
    [('creator','Creator Post\n(video/image)','blue'),('tag','Shoppable\nProduct Tagger','teal'),('catalog','Product Catalog\nLink','purple'),('cart','Cart &\nCheckout','orange'),('seller','Seller\nNotification','green')],
    [('creator','tag','post','#3b82f6'),('tag','catalog','matched product','#14b8a6'),('catalog','cart','product detail','#6366f1'),('cart','seller','order','#22c55e')], **LR)

gen('social-commerce', 'impl-advanced', 'Social Commerce — Production',
    [('creator','Creator','blue'),('ingest','Media Ingest\n(video/image)','orange'),('vision','Product Tagger\n(Vision AI)','teal'),('catalog','Catalog Linker\n(SKU match)','purple'),('feed','Feed Distributor\n(social graph)','gray'),('live','Live Commerce\nEngine (auction)','orange'),('checkout','One-click\nCheckout','cyan'),('payout','Seller Payout\n(Stripe Connect)','cyan'),('inv','Live Inventory\n(real-time)','red'),('kafka','Kafka\n(events)','yellow')],
    [('creator','ingest','media upload','#3b82f6'),('ingest','vision','frames','#f97316'),('vision','catalog','product IDs','#14b8a6'),('catalog','feed','shoppable post','#6366f1'),('feed','checkout','buy click','#f97316'),('inv','checkout','stock check','#ef4444'),('checkout','payout','payment','#06b6d4'),('creator','live','go live','#3b82f6','dashed'),('live','kafka','events','#f59e0b','dashed')], **LR)

gen('returns-refunds', 'impl-basic', 'Returns & Refunds Management — Basic',
    [('customer','Return\nRequest','blue'),('label','Label\nGenerator','orange'),('inspect','Warehouse\nInspection','teal'),('refund','Refund\nEngine','green'),('restock','Restock\nRouter','orange')],
    [('customer','label','request','#3b82f6'),('label','inspect','carrier scan\nat warehouse','#f97316'),('inspect','refund','condition grade','#22c55e'),('inspect','restock','routing decision','#f97316')], **LR)

gen('returns-refunds', 'impl-advanced', 'Returns & Refunds Management — Production',
    [('customer','Customer\nReturn Request','blue'),('fraud','Fraud Scorer\n(wardrobing detect)','red'),('label','Label Generator\n(QR + carrier)','orange'),('carrier','Carrier Scan\n(in-transit)','cyan'),('inspect','Inspection\nStation\n(condition grade)','teal'),('restock','Restock Router\n(prime/clearance/\nliquidate/destroy)','orange'),('instant','Instant Refund\n(risk-based)','green'),('inv','Inventory Credit\n(Postgres)','purple'),('photo','Photo Evidence\n(S3)','purple'),('stripe','Stripe\nRefund API','cyan')],
    [('customer','fraud','request','#3b82f6'),('fraud','label','low risk','#22c55e'),('fraud','instant','very low risk','#22c55e'),('label','carrier','QR code','#06b6d4'),('carrier','inspect','delivered to WH','#06b6d4'),('inspect','photo','take photos','#6366f1','dashed'),('inspect','restock','condition grade','#f97316'),('restock','inv','credit inventory','#6366f1'),('instant','stripe','refund','#06b6d4')], **LR)

gen('b2b-ecommerce', 'impl-basic', 'B2B E-commerce Platform — Basic',
    [('buyer','Buyer (Org)','blue'),('contract','Contract\nPricing Engine','teal'),('po','Purchase\nOrder','orange'),('invoice','Invoice\nGenerator','green'),('terms','Net-30/60\nPayment Terms','cyan')],
    [('buyer','contract','login + org','#3b82f6'),('contract','po','negotiated price','#14b8a6'),('po','invoice','PO approved','#f97316'),('invoice','terms','invoice sent','#06b6d4')], **LR)

gen('b2b-ecommerce', 'impl-advanced', 'B2B E-commerce Platform — Production',
    [('buyer','Buyer (Org\nuser)','blue'),('sso','SSO (SAML/\nOIDC)','orange'),('contract','Contract Price\nEngine (tier+vol)','teal'),('approve','Approval\nWorkflow (budget)','yellow'),('po','PO Management\n(EDI 850)','orange'),('erp','ERP Integration\n(SAP/Oracle)','cyan'),('invoice','Invoice Generator\n(EDI 810)','orange'),('ledger','Net-30/60/90\nLedger','purple'),('credit','Credit Manager\n(line + AR)','teal'),('punchout','Punchout Catalog\n(cXML)','cyan')],
    [('buyer','sso','login','#3b82f6'),('sso','contract','org identity','#f97316'),('contract','approve','price','#14b8a6'),('approve','po','approved','#f59e0b'),('po','erp','EDI 850','#06b6d4'),('erp','invoice','fulfillment\nconfirm','#06b6d4'),('invoice','ledger','payment terms','#6366f1'),('credit','contract','credit limit','#14b8a6','dashed'),('punchout','po','catalog order','#06b6d4','dashed')], **LR)

gen('supply-chain-tracking', 'impl-basic', 'Supply Chain Tracking — Basic',
    [('supplier','Supplier\nShipment','blue'),('scan','IoT / Barcode\nScan Events','orange'),('track','Tracking DB\n(Postgres)','purple'),('dash','Visibility\nDashboard','green')],
    [('supplier','scan','ship event','#3b82f6'),('scan','track','location event','#6366f1'),('track','dash','current status','#22c55e')], **LR)

gen('supply-chain-tracking', 'impl-advanced', 'Supply Chain Tracking — Production',
    [('suppliers','Suppliers\n(EDI/API)','blue'),('edi','EDI Event\nNormalizer (X12)','orange'),('carrier','Carrier API\nAggregator','cyan'),('kafka','Kafka\n(event stream)','yellow'),('graph','Supply Chain\nGraph (Neo4j)','purple'),('etd','ETD Predictor\n(ML model)','teal'),('excep','Exception\nDetector (delays)','red'),('alert','Alert Router\n(email/Slack)','orange'),('portal','Customer Tracking\nPortal','green'),('hist','Event History\n(Postgres+S3)','purple')],
    [('suppliers','edi','EDI 856\nASN','#3b82f6'),('carrier','kafka','tracking\nevents','#06b6d4'),('edi','kafka','normalized\nevents','#f59e0b'),('kafka','graph','update graph','#6366f1'),('kafka','hist','persist','#6366f1','dashed'),('graph','etd','shipment path','#6366f1'),('etd','excep','predicted ETD','#ef4444'),('excep','alert','delay flag','#f97316'),('graph','portal','track status','#22c55e')], **LR)

print('\nAll 67 diagrams generated successfully.')
