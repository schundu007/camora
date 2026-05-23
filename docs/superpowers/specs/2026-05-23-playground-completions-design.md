# Playground Code Completions & Indentation — Design Spec

**Date:** 2026-05-23  
**Scope:** Lumora Playground — Python, Bash, Docker, Terraform  
**Approach:** Monaco Completion Providers (pure frontend) + backend Format route expansion

---

## 1. Editor Configuration Changes

**File:** `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx`

Add/update the following `options` passed to `<Editor>`:

| Option | Value | Effect |
|--------|-------|--------|
| `autoIndent` | `'full'` | Smart re-indent on paste and Enter (was default `'advanced'`) |
| `formatOnType` | `true` | Auto-indent on Enter after `:` (Python), `{` (Terraform), etc. |
| `snippetSuggestions` | `'top'` | Snippet items appear above word completions in the dropdown |
| `acceptSuggestionOnEnter` | `'smart'` | Enter accepts a suggestion only when the list is focused |
| `suggest.showSnippets` | `true` | Ensure snippets are visible in the suggest widget |
| `suggest.showKeywords` | `true` | Ensure keywords appear in the suggest widget |

No other changes to `PlaygroundEditor.tsx` — completion providers are registered separately.

---

## 2. Completion Provider Architecture

**New file:** `apps/camora/src/components/lumora/playground/playgroundCompletions.ts`

### Exported API

```ts
export function registerPlaygroundCompletions(monaco: typeof Monaco): Monaco.IDisposable
```

Registers one `CompletionItemProvider` per Monaco language ID:

| Language Tab | Monaco Language ID |
|---|---|
| Python3 | `'python'` |
| Bash | `'shell'` |
| Docker | `'dockerfile'` |
| Terraform | `'hcl'` |

Returns a combined `IDisposable` (wraps all 4 provider disposables) so the caller can clean up on unmount.

### Integration in PlaygroundEditor

```ts
const completionsDisposable = useRef<Monaco.IDisposable | null>(null);

useEffect(() => {
  if (!monaco) return;
  completionsDisposable.current?.dispose();
  completionsDisposable.current = registerPlaygroundCompletions(monaco);
  return () => completionsDisposable.current?.dispose();
}, [monaco]);
```

This runs once per Monaco instance (providers are global per language, not per editor instance).

### Completion Item Shape

Each item uses:
- `kind`: `CompletionItemKind.Snippet`, `Keyword`, or `Function`
- `insertText`: snippet string with tab stops (`${1:placeholder}`, `$0` for final cursor)
- `insertTextRules`: `InsertAsSnippet` for tab-stop support
- `documentation`: one-line description
- `detail`: language or category tag (e.g. `"Python snippet"`, `"Bash builtin"`)

---

## 3. Per-Language Snippet Inventory

### Python (`'python'`)

`autoIndent: 'full'` + Monaco's built-in Python language service handle `:` auto-indent natively. Completions add:

**Keywords (inline):**
`if`, `elif`, `else`, `for`, `while`, `try`, `except`, `finally`, `with`, `return`, `yield`, `async`, `await`, `lambda`, `pass`, `break`, `continue`, `import`, `from`

**Builtins (Function kind):**
`print()`, `len()`, `range()`, `enumerate()`, `zip()`, `isinstance()`, `hasattr()`, `getattr()`, `sorted()`, `reversed()`, `type()`, `list()`, `dict()`, `set()`, `tuple()`, `str()`, `int()`, `float()`, `bool()`

**Snippet blocks:**
- `def` → `def ${1:name}(${2:args}):\n\t${0:pass}`
- `class` → `class ${1:Name}:\n\tdef __init__(self):\n\t\t${0:pass}`
- `main` → `if __name__ == '__main__':\n\t${0:main()}`
- `forrange` → `for ${1:i} in range(${2:10}):\n\t${0:pass}`
- `tryexcept` → `try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${0:pass}`
- `with` → `with open('${1:file}', '${2:r}') as ${3:f}:\n\t${0:pass}`
- `property` → `@property\ndef ${1:name}(self):\n\treturn self._${1:name}`
- `staticmethod` → `@staticmethod\ndef ${1:name}(${2:args}):\n\t${0:pass}`

---

### Bash (`'shell'`)

**Shebang snippet:**
- `shebang` → `#!/usr/bin/env bash\nset -euo pipefail\n\n${0}`

**Control flow snippets:**
- `if` → `if ${1:condition}; then\n\t${2:echo "yes"}\nfi`
- `ifelse` → `if ${1:condition}; then\n\t${2:echo "yes"}\nelse\n\t${3:echo "no"}\nfi`
- `for` → `for ${1:item} in ${2:list}; do\n\t${0:echo "$item"}\ndone`
- `while` → `while ${1:condition}; do\n\t${0:echo "loop"}\ndone`
- `case` → `case "${1:\$var}" in\n\t${2:pattern})\n\t\t${3:echo "matched"}\n\t\t;;\n\t*)\n\t\techo "default"\n\t\t;;\nesac`
- `function` → `${1:fname}() {\n\t${0:echo "hello"}\n}`

**Common commands (Keyword kind):**
`echo`, `read`, `exit`, `mkdir`, `ls`, `grep`, `awk`, `sed`, `curl`, `cd`, `pwd`, `export`, `source`, `chmod`, `cat`, `touch`, `rm`, `cp`, `mv`

---

### Docker (`'dockerfile'`)

Monaco provides basic Dockerfile syntax highlighting. We add instruction completions and multi-line templates.

**Instruction keywords:**
`FROM`, `RUN`, `CMD`, `ENTRYPOINT`, `ENV`, `EXPOSE`, `COPY`, `ADD`, `WORKDIR`, `USER`, `ARG`, `LABEL`, `VOLUME`, `HEALTHCHECK`, `SHELL`, `ONBUILD`, `STOPSIGNAL`

**Snippet templates:**
- `FROM` → `FROM ${1:ubuntu:22.04}`
- `FROM AS` → `FROM ${1:node:20-slim} AS ${2:builder}`
- `RUN` → `RUN ${0:apt-get update && apt-get install -y ...}`
- `CMD` → `CMD ["${1:executable}", "${2:arg}"]`
- `ENTRYPOINT` → `ENTRYPOINT ["${1:executable}"]`
- `ENV` → `ENV ${1:KEY}=${2:value}`
- `EXPOSE` → `EXPOSE ${1:8080}`
- `COPY` → `COPY ${1:src} ${2:dest}`
- `WORKDIR` → `WORKDIR ${1:/app}`
- `USER` → `USER ${1:appuser}`
- `ARG` → `ARG ${1:VERSION}=${2:latest}`
- `HEALTHCHECK` → `HEALTHCHECK --interval=${1:30s} --timeout=${2:10s} CMD ${3:curl -f http://localhost/ || exit 1}`
- `multistage` → full 2-stage build scaffold

---

### Terraform (`'hcl'`)

**Block keywords:**
`resource`, `variable`, `output`, `data`, `locals`, `module`, `provider`, `terraform`

**Snippet templates:**
- `resource` → `resource "${1:null_resource}" "${2:example}" {\n\t${0}\n}`
- `variable` → `variable "${1:name}" {\n\ttype        = ${2:string}\n\tdefault     = "${3:value}"\n\tdescription = "${4:Description}"\n}`
- `output` → `output "${1:name}" {\n\tvalue       = ${2:null_resource.example.id}\n\tdescription = "${3:Description}"\n}`
- `data` → `data "${1:null_data_source}" "${2:example}" {\n\tinputs = {\n\t\t${0}\n\t}\n}`
- `locals` → `locals {\n\t${1:key} = ${2:value}\n}`
- `module` → `module "${1:name}" {\n\tsource = "${2:./modules/name}"\n\t${0}\n}`
- `provider` → `provider "${1:aws}" {\n\tregion = "${2:us-east-1}"\n}`
- `terraform` → `terraform {\n\trequired_providers {\n\t\t${1:null} = { source = "hashicorp/${1:null}" }\n\t}\n}`

---

## 4. Format Button Expansion

### Frontend — `PlaygroundLayout.tsx`

Show Format button when `activeTab !== 'docker'` (Docker has no standard formatter):

```tsx
{activeTab !== 'docker' && (
  <button onClick={handleFormat} ...>
    {formatting ? 'Formatting…' : 'Format'}
  </button>
)}
```

Update `handleFormat` to pass `language` to the API:

```ts
const r = await playgroundAPI.format(codeRef.current[activeTab], activeTab);
```

### Frontend — `capra-api.ts`

Update `format` signature:

```ts
format: (code: string, language: PlaygroundLanguage, token?: string)
  => Promise<{ code: string; error?: string }>
```

### Backend — `playground.js` `/format` route

Branch on `language` (sent in request body alongside `code`):

| Language | Tool | Command |
|---|---|---|
| `python3` | black | `black - --quiet` (stdin) |
| `bash` | shfmt | `shfmt -i 2 -` (stdin) |
| `terraform` | terraform | `terraform fmt -` (stdin) |
| `docker` | — | Not supported; 400 response |

**`shfmt` availability:** Must confirm `shfmt` is on the Railway ascend-backend PATH. If not available, the backend returns `{ code: originalCode, error: 'shfmt not available' }` (best-effort, same pattern as current black failure handling). Railway Nixpack config currently includes Go (`rustc`, `openjdk17`) — `shfmt` can be added via `nixpacks.toml` if needed.

---

## 5. File Change Summary

| File | Change |
|---|---|
| `apps/camora/src/components/lumora/playground/PlaygroundEditor.tsx` | Add `autoIndent`, `formatOnType`, `snippetSuggestions`, `suggest` options; register completions on `monaco` effect |
| `apps/camora/src/components/lumora/playground/playgroundCompletions.ts` | **New** — exports `registerPlaygroundCompletions(monaco)` |
| `apps/camora/src/components/lumora/playground/PlaygroundLayout.tsx` | Show Format for bash+terraform; pass language to `playgroundAPI.format` |
| `apps/camora/src/lib/capra-api.ts` | Add `language` param to `format()` |
| `apps/ascend-backend/src/routes/playground.js` | Branch `/format` on `language`; add shfmt + terraform fmt handlers |
| `apps/ascend-backend/nixpacks.toml` *(if needed)* | Add `shfmt` to build packages |

---

## 6. Out of Scope

- AI-powered completions (Copilot-style) — future iteration
- Type checking / go-to-definition / hover docs (requires LSP server)
- Linting for Bash, Docker, Terraform beyond what's already wired (hadolint, terraform validate)
