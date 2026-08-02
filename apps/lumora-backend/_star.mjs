import Anthropic from '@anthropic-ai/sdk';
import { buildGeneralPrompt } from './src/services/claude.js';
const RESUME = `Dr. Anusha Chundu — Data Engineer, Ph.D. CS. Azure Data Engineer at Tata Consultancy Services since Jun 2023: ETL/ELT in Azure Data Factory into ADLS Gen2 + Snowflake, bronze/silver/gold, multi-million rows daily. pytest + Great Expectations, Key Vault, Entra ID RBAC. Assistant Professor 2009-2023, 9 papers.`;
const anthropic = new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
const QS = [
  ['Where should we hire you?', false],
  ['Why are you leaving TCS?', false],
  ['What is your greatest strength?', false],
  ['Tell me about a time you had a conflict with a teammate.', true],
];
for (const [q, wantStar] of QS) {
  const m = await anthropic.messages.create({
    model:'claude-sonnet-5', max_tokens:900,
    system: buildGeneralPrompt(RESUME, ''),
    messages:[{role:'user',content:q}],
  });
  const t = m.content.map(b=>b.text||'').join('');
  const hasStar = /ARCHETYPE:/i.test(t) || /^\s*Situation\s*:/im.test(t);
  const ok = hasStar === wantStar;
  console.log(`${ok?'PASS':'FAIL'}  star=${hasStar} want=${wantStar}  "${q}"`);
  if (!ok) console.log('   ---\n' + t.split('\n').slice(0,4).map(l=>'   '+l).join('\n'));
}
