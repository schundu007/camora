import { useState, useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import yaml from 'highlight.js/lib/languages/yaml';
import bash from 'highlight.js/lib/languages/bash';
import python from 'highlight.js/lib/languages/python';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import java from 'highlight.js/lib/languages/java';
import kotlin from 'highlight.js/lib/languages/kotlin';
import swift from 'highlight.js/lib/languages/swift';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import cpp from 'highlight.js/lib/languages/cpp';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('yaml', yaml);

const CLI_TOOLS = [
  'docker','kubectl','helm','k9s','aws','gcloud','az','terraform','tofu',
  'git','npm','yarn','pnpm','pip','pip3','apt','apt-get','yum','dnf','brew','apk','cargo',
  'systemctl','journalctl','service','crontab',
  'curl','wget','ssh','scp','sftp','rsync',
  'make','cmake','bazel',
  'python','python3','node','deno','bun','java','mvn','gradle','ant','ruby','php',
  'ansible','ansible-playbook','ansible-vault','ansible-galaxy',
  'vault','consul','nomad','nginx','apache2','httpd',
  'jq','yq','openssl','keytool',
  'kubeadm','kind','minikube','k3s','k3d','eksctl',
  'istioctl','kustomize','skaffold','flux','argocd','argo',
  'crictl','ctr','nerdctl','podman','buildah','ko','skopeo',
  'trivy','snyk','grype','syft',
  'oc','etcdctl','redis-cli','psql','mysql','mongosh','mongo',
  'prometheus','promtool','amtool','alertmanager',
  'fluentd','filebeat','logstash','vector',
  'chmod','chown','tar','gzip','find','grep','awk','sed',
  'ping','dig','nslookup','nmap','nc','ss','ip','netstat','iptables','ufw',
  'timedatectl','hostnamectl','uname','ps','top','htop','kill','df','du','free',
  'ln','cp','mv','rm','mkdir','touch','cat','head','tail','less','more',
  'stern','kubectx','kubens','skaffold','velero',
].join('|');

const bashWithTools = (hljsInst) => {
  const lang = bash(hljsInst);
  lang.contains = [
    { scope: 'built_in', match: new RegExp(`\\b(${CLI_TOOLS})\\b`) },
    ...lang.contains,
  ];
  return lang;
};
hljs.registerLanguage('bash', bashWithTools);
hljs.registerLanguage('python', python);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('java', java);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('cpp', cpp);

const LANG_MAP = {
  bash: 'bash', shell: 'bash', sh: 'bash', zsh: 'bash',
  yaml: 'yaml', yml: 'yaml',
  json: 'json',
  python: 'python', py: 'python',
  javascript: 'javascript', js: 'javascript',
  typescript: 'typescript', ts: 'typescript',
  go: 'go',
  sql: 'sql',
  rust: 'rust',
  xml: 'xml', html: 'xml',
  css: 'css',
  java: 'java',
  kotlin: 'kotlin',
  swift: 'swift',
  ruby: 'ruby', rb: 'ruby',
  php: 'php',
  cpp: 'cpp', 'c++': 'cpp', c: 'cpp',
  dockerfile: 'bash', docker: 'bash',
  terraform: 'bash', hcl: 'bash', tf: 'bash',
  nginx: 'bash',
};

const AUTO_LANGS = ['yaml', 'bash', 'python', 'javascript', 'typescript', 'json', 'go', 'sql', 'rust', 'xml', 'css', 'java'];

export default function CodeBlock({ code, lang, bare = false }) {
  const [copied, setCopied] = useState(false);

  const { html, displayLang } = useMemo(() => {
    if (!code) return { html: '', displayLang: lang || 'code' };
    const mapped = LANG_MAP[(lang || '').toLowerCase()];
    try {
      if (mapped) {
        const result = hljs.highlight(code, { language: mapped, ignoreIllegals: true });
        return { html: result.value, displayLang: lang || mapped };
      }
      const result = hljs.highlightAuto(code, AUTO_LANGS);
      return { html: result.value, displayLang: lang || result.language || 'code' };
    } catch {
      return { html: code.replace(/</g, '&lt;').replace(/>/g, '&gt;'), displayLang: lang || 'code' };
    }
  }, [code, lang]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="prep-code-block">
      {!bare && (
        <div className="prep-code-header">
          <span className="prep-code-lang">{displayLang}</span>
          <button className="prep-code-copy" onClick={handleCopy}>
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      )}
      <pre className="hljs" style={{ margin: 0, padding: '14px 16px', fontSize: '12.5px', lineHeight: '1.6', overflowX: 'auto', borderRadius: 0 }}>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
