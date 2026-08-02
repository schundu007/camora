import Anthropic from '@anthropic-ai/sdk';
import { buildPitchPrompt } from './src/services/answerFormat.js';
const RESUME = `Dr. Anusha Chundu — Data Engineer, Ph.D. Computer Science, 10+ yrs ML/NLP research.
Azure Data Engineer, Tata Consultancy Services, San Jose (Jun 2023–present): ETL/ELT in Azure Data Factory ingesting REST APIs, SQL Server, PostgreSQL, MySQL, flat files into ADLS Gen2 + Snowflake across bronze/silver/gold medallion layers; multi-million-row datasets daily. PySpark/Python with NumPy, SciPy, Pandas. Advanced SQL: CTEs, window functions, OPENROWSET. Power BI dashboards.
Data quality: pytest + Great Expectations, schema validation, null checks, anomaly detection, SLA alerting. Security: Azure Key Vault, Microsoft Entra ID RBAC, threat modeling, PII risk assessment. CI/CD: Azure DevOps, GitHub Actions, peer code review.
Assistant Professor 2009–2023: Big Data, Python, Cloud, DBMS, ML. 9 peer-reviewed papers IEEE/AIP, three books. Doctoral research in multi-language sentiment analysis.`;
const m = await new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY}).messages.create({
  model:'claude-sonnet-5', max_tokens:2000,
  messages:[{role:'user',content: buildPitchPrompt({resume:RESUME}) + "\n\nJOB: Senior Data Engineer — lead moderately complex data projects end to end, high-volume pipelines, automate cleansing, partner with data scientists.\n\nWrite the pitch now."}],
});
const t = m.content.map(b=>b.text||'').join('');
console.log(t);
const wc = x => x.trim().split(/\s+/).filter(Boolean).length;
const lines = t.split('\n').map(l=>l.trim()).filter(l=>l && !/^\[/.test(l));
const long = lines.filter(l=>wc(l)>18);
console.log('\n── measured ──');
console.log('lines:', lines.length);
console.log('word counts:', lines.map(wc).join(', '));
console.log('lines over 18 words:', long.length);
console.log('longest line:', Math.max(0,...lines.map(wc)), 'words');
