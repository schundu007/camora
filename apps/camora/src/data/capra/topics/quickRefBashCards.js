// Bash / shell Quick Reference cards.
//
// ESCAPING NOTE: every Bash `\${...}` parameter expansion is written as an
// escaped `\\${` in this source, because a bare `${` inside a JS template
// literal is interpolation and would either throw or silently swallow the
// expansion. Backticks are avoided entirely in favour of `$( )` command
// substitution — which is the better Bash style anyway (nestable, clearer).
//
// Target: Bash 4+ / 5.x. POSIX-sh-only differences are called out inline.

export const bashCards = [
  // ─────────────────────────────────────────────────────────────
  // Script foundations
  // ─────────────────────────────────────────────────────────────
  {
    title: '01 · Script Skeleton & Strict Mode',
    language: 'bash',
    description: 'Bash defaults are dangerously permissive: a failed command keeps going and an unset variable expands to empty. These four lines turn silent corruption into a loud failure.',
    code: `#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'

#   -e            exit on any command returning non-zero
#   -u            error on an UNSET variable (catches typos)
#   -o pipefail   a pipeline fails if ANY stage fails, not just the last
#   IFS           split only on newline/tab, not spaces (safer word splitting)

# set -e does NOT trigger for: commands in an if/while condition, anything
# left of && or ||, or a command whose exit status you explicitly test.
# Opt a command out deliberately:
risky_command || true

# Portable temp dir + guaranteed cleanup
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

usage() {
    cat <<'EOF'
Usage: deploy.sh [-v] [-e ENV] TARGET
  -v        verbose
  -e ENV    environment (default: staging)
EOF
    exit 64
}

verbose=0
env_name="staging"
while getopts ":ve:h" opt; do
    case "$opt" in
        v) verbose=1 ;;
        e) env_name="$OPTARG" ;;
        h) usage ;;
        \\?) echo "unknown option: -$OPTARG" >&2; usage ;;
        :)  echo "option -$OPTARG needs a value" >&2; usage ;;
    esac
done
shift $((OPTIND - 1))

[[ $# -ge 1 ]] || usage
target="$1"

main() {
    printf 'deploying %s to %s\\n' "$target" "$env_name"
}

main "$@"        # "$@" preserves argument boundaries; $* does not`,
  },
  {
    title: '02 · Variables & Quoting',
    language: 'bash',
    description: 'Unquoted expansion is the number-one shell bug: the value gets word-split and glob-expanded. The rule is simple — quote every expansion unless you specifically want splitting.',
    code: `name="Ada"              # NO spaces around = ; name = "Ada" runs a command
readonly PI=3.14
declare -i count=0      # integer attribute
unset name

echo "$name"            # ALWAYS quote — no splitting, no globbing
echo \${name}           # braces disambiguate:  \${name}_suffix
echo "$\{name}s"          # ...without braces this would look for $names

# WHY QUOTING MATTERS
file="my report.txt"
rm $file                # runs: rm my report.txt   -> deletes TWO wrong files
rm "$file"              # correct

pattern="*"
echo $pattern           # expands to every filename in the directory
echo "$pattern"         # prints a literal *

# QUOTE TYPES
echo "double: $name"    # expands variables, $( ), and escapes
echo 'single: $name'    # LITERAL — nothing expands
echo "escaped: \\$name"  # literal $name inside double quotes
echo $'tab:\\there'      # ANSI-C quoting: interprets \\n \\t \\x41

# ENVIRONMENT vs SHELL variables
local_var="only this shell"
export GLOBAL_VAR="visible to child processes"
FOO=bar ./script.sh                 # set for ONE command only
env | sort                          # current environment

# SPECIAL PARAMETERS
"$0"    # script name          "$1" "$2"  positional args
"$@"    # all args, EACH separately quoted  <-- almost always what you want
"$*"    # all args as ONE string joined by the first char of IFS
"$#"    # argument count
"$?"    # exit status of the last command
"$$"    # current PID          "$!"  PID of the last background job
"$_"    # last argument of the previous command

# Defaults and required values
: "\${LOG_LEVEL:=info}"                          # assign if unset/empty
: "\${API_KEY:?API_KEY must be set}"             # abort with a message if unset`,
  },
  {
    title: '03 · Parameter Expansion',
    language: 'bash',
    description: 'Bash can do defaults, substring extraction, prefix/suffix stripping and search-replace without spawning sed or basename — dramatically faster in a loop.',
    code: `var="hello world"
path="/tmp/archive/report.tar.gz"

# DEFAULTS
\${var:-default}        # use default if unset OR empty (does not assign)
\${var-default}         # use default only if UNSET (empty counts as set)
\${var:=default}        # ...and ASSIGN it
\${var:+alt}            # use alt only if var IS set and non-empty
\${var:?message}        # abort with message if unset/empty

# LENGTH & SUBSTRING
\${#var}                # 11        length
\${var:6}               # world     from index 6
\${var:0:5}             # hello     offset 0, length 5
\${var: -5}             # world     last 5 (note the space before -5)

# STRIP PREFIX (#) / SUFFIX (%);  double = greedy
\${path##*/}            # report.tar.gz   <- basename, no subprocess
\${path%/*}             # /tmp/archive    <- dirname
\${path%.gz}            # /tmp/archive/report.tar
\${path%%.*}            # /tmp/archive/report   (strip from FIRST dot)
\${path##*.}            # gz              <- extension
#   #  shortest match from the FRONT      ##  longest from the front
#   %  shortest match from the BACK       %%  longest from the back

# SEARCH & REPLACE
\${var/world/there}     # hello there    first match only
\${var//o/0}            # hell0 w0rld    ALL matches
\${var/#hello/hi}       # hi world       only if it matches at the START
\${var/%world/earth}    # hello earth    only at the END
\${var//[aeiou]/}       # hll wrld       glob patterns work

# CASE (Bash 4+)
\${var^}                # Hello world    first char upper
\${var^^}               # HELLO WORLD    all upper
\${var,,}               # all lower
\${var~~}               # swap case

# INDIRECTION & LISTING
name="var"; echo "\${!name}"     # hello world  — expand the variable NAMED by var
echo "\${!HOME*}"                 # every variable name starting with HOME

# Safe scripted use
ext="\${file##*.}"
base="\${file%.*}"
mv -- "$file" "\${base}_backup.\${ext}"`,
  },
  {
    title: '04 · Command Substitution & Arithmetic',
    language: 'bash',
    description: 'Use $( ) over back-quotes: it nests, and the quoting rules inside are sane. Arithmetic in (( )) avoids the expr subprocess entirely.',
    code: `today="$(date +%F)"                 # $( ) nests and is readable
count="$(grep -c ERROR app.log)"
nested="$(dirname "$(readlink -f "$0")")"     # nesting works cleanly

# Command substitution strips ALL trailing newlines
files="$(ls)"                       # one string with embedded newlines
mapfile -t files < <(ls)            # array, one entry per line (Bash 4+)
readarray -t files < <(find . -type f)

# ARITHMETIC — (( )) for evaluation, $(( )) for the value
(( count++ ))
(( total = a * b + 3 ))
result=$(( (a + b) * 2 ))
(( a > b )) && echo "a wins"        # exit status: 0 when NON-zero result
#   NOTE: (( 0 )) returns exit status 1 — surprising but consistent with C.

echo $(( 7 / 2 ))                   # 3    integer division only
echo $(( 7 % 2 ))                   # 1
echo $(( 2 ** 10 ))                 # 1024
echo $(( 16#ff ))                   # 255  base#number
echo $(( x > 5 ? 1 : 0 ))           # ternary

# Variables inside (( )) need no $
i=5; (( i += 1 )); echo "$i"        # 6

# Floating point needs an external tool
echo "scale=2; 7/2" | bc            # 3.50
awk 'BEGIN { printf "%.2f\\n", 7/2 }'
python3 -c 'print(7/2)'

# let and expr are legacy — prefer (( ))
# let "x = 1 + 2"
# x=$(expr 1 + 2)                   # forks a process, needs escaped operators

# Random numbers and sequences
echo $RANDOM                        # 0..32767
echo $(( RANDOM % 100 ))            # 0..99
seq 1 5; seq 0 2 10                 # 1 2 3 4 5 ; 0 2 4 6 8 10
for i in {1..5}; do echo "$i"; done         # brace expansion (literal only)
for i in {a..e}; do echo "$i"; done
for i in $(seq 1 "$n"); do :; done          # brace expansion cannot use a var
for (( i = 1; i <= n; i++ )); do :; done    # ...C-style loop can`,
  },
  {
    title: '05 · Arrays & Associative Arrays',
    language: 'bash',
    description: 'Arrays are the correct way to build command arguments. Storing a command in a plain string and expanding it unquoted re-splits on spaces and breaks on any path with a space.',
    code: `# INDEXED ARRAYS
arr=(one two "three four")
arr+=(five)                         # append
arr[10]="sparse"                    # arrays may be sparse

echo "\${arr[0]}"                    # one
echo "\${arr[-1]}"                   # five       (Bash 4.3+)
echo "\${arr[@]}"                    # every element, individually quoted
echo "\${arr[*]}"                    # all joined by IFS into ONE word
echo "\${#arr[@]}"                   # element count
echo "\${!arr[@]}"                   # the INDICES (matters when sparse)
echo "\${arr[@]:1:2}"                # slice: 2 elements from index 1

for x in "\${arr[@]}"; do            # ALWAYS quote — otherwise "three four"
    echo "$x"                       # splits into two iterations
done

unset 'arr[1]'                      # remove one element (leaves a hole)
arr=("\${arr[@]}")                   # re-index to compact it

# ASSOCIATIVE ARRAYS (Bash 4+) — must be declared
declare -A colours
colours[apple]="red"
colours["green apple"]="green"
colours=([a]=1 [b]=2)

echo "\${colours[apple]}"
echo "\${!colours[@]}"               # all keys
echo "\${colours[@]}"                # all values
(( \${#colours[@]} ))                # count
[[ -v colours[apple] ]] && echo "key exists"     # Bash 4.2+
unset 'colours[apple]'

# THE KILLER USE CASE: building a command safely
args=(--verbose --output "/path/with space/out.txt")
[[ $dry_run == 1 ]] && args+=(--dry-run)
rsync "\${args[@]}" src/ dst/        # each element stays ONE argument

# WRONG — a string re-splits on every space
# cmd="rsync --output /path/with space/out.txt"
# $cmd                              # breaks into the wrong arguments

# Read a file into an array, one line per element
mapfile -t lines < input.txt
while IFS= read -r line; do lines+=("$line"); done < input.txt

# Split a string on a delimiter
IFS=',' read -ra parts <<< "a,b,c"
printf '%s\\n' "\${parts[@]}"`,
  },
  {
    title: '06 · Conditionals: [[ ]], [ ] and (( ))',
    language: 'bash',
    description: 'Use [[ ]] in Bash — it does not word-split, supports pattern and regex matching, and has sane && / ||. The old [ ] is a command, which is why it needs so much quoting.',
    code: `if [[ -f "$file" ]]; then
    echo "regular file"
elif [[ -d "$file" ]]; then
    echo "directory"
else
    echo "neither"
fi

# One-liners
[[ -f "$file" ]] && echo "exists"
[[ -f "$file" ]] || { echo "missing" >&2; exit 1; }

# FILE TESTS
# -e exists        -f regular file    -d directory     -L symlink
# -r readable      -w writable        -x executable
# -s size > 0      -z string empty    -n string non-empty
# f1 -nt f2  newer     f1 -ot f2  older     f1 -ef f2  same inode

# STRING TESTS
[[ "$a" == "$b" ]]          # equal        (= also works)
[[ "$a" != "$b" ]]
[[ "$a" < "$b" ]]           # lexicographic (in [ ] this would REDIRECT!)
[[ -z "$a" ]]               # empty or unset
[[ -n "$a" ]]               # non-empty

# PATTERN MATCH — right side UNQUOTED is a glob
[[ "$file" == *.txt ]]      # glob match
[[ "$file" == "*.txt" ]]    # quoted = literal comparison, almost never wanted
[[ "$s" =~ ^[0-9]+$ ]]      # ERE regex; do NOT quote the pattern
echo "\${BASH_REMATCH[1]}"   # capture groups from the last =~

# NUMERIC — use (( )) or the -eq family
(( a > b ))                 # arithmetic context, natural operators
[[ $a -gt $b ]]             # -eq -ne -lt -le -gt -ge
# [[ "$a" > "$b" ]]         # WRONG for numbers: "10" < "9" lexicographically

# COMBINING
[[ -f "$f" && -r "$f" ]]
[[ "$x" == a || "$x" == b ]]
[[ ! -d "$dir" ]]

# WHY [[ ]] BEATS [ ]
file="my file.txt"
[ -f $file ]                # ERROR: too many arguments (word split)
[[ -f $file ]]              # fine: no word splitting inside [[ ]]
# [ ] is POSIX and portable to dash/sh; [[ ]] is Bash/Ksh/Zsh only.

# CASE — pattern dispatch, cleaner than an if chain
case "$1" in
    start|up)   start_service ;;
    stop)       stop_service ;;
    *.tar.gz)   tar xzf "$1" ;;
    [0-9]*)     echo "starts with a digit" ;;
    *)          usage; exit 1 ;;
esac`,
  },
  {
    title: '07 · Loops & Iteration',
    language: 'bash',
    description: 'Never parse the output of ls. Use a glob or find -print0, and always read with `read -r` so backslashes survive.',
    code: `# ITERATE FILES — a glob, quoted
for f in *.txt; do
    [[ -e "$f" ]] || continue       # a glob that matches nothing stays literal
    echo "$f"
done
shopt -s nullglob                   # ...or make non-matching globs expand to nothing
shopt -s globstar                   # enables ** for recursive matching
for f in ./**/*.log; do :; done

# NEVER  for f in $(ls)  — breaks on spaces, newlines and globs in filenames

# READ A FILE LINE BY LINE (the correct incantation)
while IFS= read -r line; do
    echo "$line"
done < input.txt
#   IFS=     keeps leading/trailing whitespace
#   -r       does not treat backslash as an escape
#   Add  || [[ -n "$line" ]]  to the while to catch a final line with no newline

# READ FROM A COMMAND — process substitution keeps the loop in THIS shell
while IFS= read -r line; do
    (( count++ ))                   # a pipeline would run this in a SUBSHELL
done < <(grep ERROR app.log)        # ...and count would be lost afterwards
echo "$count"

# NUL-SAFE iteration over find (handles every legal filename)
while IFS= read -r -d '' f; do
    echo "$f"
done < <(find . -name '*.log' -print0)

# NUMERIC LOOPS
for i in {1..10}; do :; done              # brace expansion (literals only)
for i in {0..20..5}; do :; done           # step
for (( i = 0; i < n; i++ )); do :; done   # C-style, works with variables
for i in $(seq 1 "$n"); do :; done        # alternative with a variable

# ARGUMENTS
for arg in "$@"; do echo "$arg"; done
while [[ $# -gt 0 ]]; do
    case "$1" in
        --name) name="$2"; shift 2 ;;
        --) shift; break ;;
        *) files+=("$1"); shift ;;
    esac
done

# WHILE / UNTIL
while true; do ... ; done
until ping -c1 -W1 host &>/dev/null; do sleep 1; done      # wait for readiness

# CONTROL
continue        # next iteration
break           # exit the loop
break 2         # exit two levels of nesting`,
  },
  {
    title: '08 · Functions, Exit Codes & Traps',
    language: 'bash',
    description: 'A function returns an exit STATUS (0-255), not a value — you get data out via stdout. Forgetting `local` makes every variable global and causes action-at-a-distance bugs.',
    code: `greet() {
    local name="\${1:?name required}"   # local: NOT visible outside
    local -i count="\${2:-1}"
    printf 'Hello, %s\\n' "$name"       # printf over echo: predictable
    return 0                          # exit STATUS, 0-255 only
}
greet "Ada" 3
result="$(greet Ada)"                 # capture the OUTPUT, not the return

# Returning data: echo it and capture, or assign to a named variable
sum() { echo $(( $1 + $2 )); }
total="$(sum 2 3)"

sum_into() { local -n out="$1"; out=$(( $2 + $3 )); }   # nameref, Bash 4.3+
sum_into total 2 3

# EXIT CODES: 0 = success, anything else = failure
command; echo "$?"          # status of the last command
exit 0                      # 0 ok | 1 general | 2 misuse | 126 not executable
                            # 127 not found | 128+N killed by signal N | 130 Ctrl-C

# CHAINING
cmd1 && cmd2                # run cmd2 only if cmd1 SUCCEEDED
cmd1 || cmd2                # run cmd2 only if cmd1 FAILED
cmd1; cmd2                  # run both regardless
cmd1 && cmd2 || cmd3        # NOT if/else: cmd3 also runs if cmd2 fails
if cmd1; then cmd2; else cmd3; fi      # the correct if/else

# GROUPING
{ cmd1; cmd2; } > out.log   # same shell; note the ; before }
( cd /tmp && cmd )          # SUBSHELL: the cd does not affect the caller

# TRAPS — cleanup that runs no matter how the script ends
tmp="$(mktemp -d)"
cleanup() { rm -rf "$tmp"; echo "cleaned up"; }
trap cleanup EXIT           # runs on normal exit AND on error exit
trap 'echo interrupted >&2; exit 130' INT TERM
trap 'echo "failed at line $LINENO" >&2' ERR
trap - EXIT                 # remove a trap

# SIGNALS:  INT (2, Ctrl-C)  TERM (15, default kill)  HUP (1)  QUIT (3)
#           KILL (9) and STOP cannot be trapped.
# EXIT is not a real signal but works with trap — use it for cleanup.

# Background jobs and waiting
long_task &
pid=$!
wait "$pid" || echo "job failed"
jobs; fg %1; bg %1
wait                        # wait for ALL background jobs`,
  },
  {
    title: '09 · Redirection & File Descriptors',
    language: 'bash',
    description: 'Order matters: `>file 2>&1` sends both streams to the file, `2>&1 >file` does not. The second copies stderr to the CURRENT stdout (the terminal) before stdout is redirected.',
    code: `cmd > out.txt               # stdout to file (TRUNCATES)
cmd >> out.txt              # stdout appended
cmd 2> err.txt              # stderr only
cmd > out.txt 2> err.txt    # separate files
cmd > out.txt 2>&1          # BOTH to out.txt  (order matters!)
cmd &> out.txt              # Bash shorthand for the same
cmd &>> out.txt             # both, appended
cmd 2>&1 > out.txt          # NOT the same: stderr goes to the TERMINAL,
                            # stdout goes to the file
cmd < in.txt                # stdin from a file
cmd < in.txt > out.txt

cmd > /dev/null             # discard stdout
cmd 2> /dev/null            # discard stderr
cmd &> /dev/null            # discard both (silence)
cmd > /dev/null 2>&1        # POSIX form of the same

# FILE DESCRIPTORS: 0 stdin, 1 stdout, 2 stderr; 3+ are yours
exec 3> debug.log           # open fd 3 for writing
echo "trace" >&3
exec 3>&-                   # close it

# Log to a file AND the terminal
cmd | tee out.txt
cmd | tee -a out.txt        # append
cmd 2>&1 | tee out.txt      # include stderr
cmd | tee out.txt | wc -l   # tee passes through

# Redirect for the WHOLE script from inside it
exec > >(tee -a script.log) 2>&1

# HEREDOC — multi-line literal input
cat <<EOF                   # unquoted delimiter: EXPANDS $vars and $( )
Hello $USER
Today is $(date +%F)
EOF

cat <<'EOF'                 # QUOTED delimiter: nothing expands
Literal $USER and $(date)
EOF

cat <<-EOF                  # <<- strips leading TABS (not spaces)
	indented in source, flush in output
	EOF

# HERESTRING — a single line to stdin
grep pattern <<< "$variable"
IFS=',' read -ra parts <<< "a,b,c"

# PROCESS SUBSTITUTION — treat a command's output as a file
diff <(sort a.txt) <(sort b.txt)
comm -13 <(sort a.txt) <(sort b.txt)
tee >(gzip > out.gz) >(wc -l) > /dev/null

# Send stdout of one command to stdin of another as a FILE argument
wc -l < <(find . -type f)`,
  },

  // ─────────────────────────────────────────────────────────────
  // Text processing
  // ─────────────────────────────────────────────────────────────
  {
    title: '10 · grep: Search',
    language: 'bash',
    description: 'grep -F is measurably faster for fixed strings, and -q short-circuits on the first match — both matter in a loop over many files.',
    code: `grep 'pattern' file.txt
grep -i 'pattern' file             # case-insensitive
grep -v 'pattern' file             # INVERT: lines NOT matching
grep -n 'pattern' file             # show line numbers
grep -c 'pattern' file             # COUNT matching lines (not matches)
grep -l 'pattern' *.txt            # list FILENAMES with a match
grep -L 'pattern' *.txt            # filenames WITHOUT a match
grep -o 'pattern' file             # print only the matched part
grep -w 'word' file                # whole-word match
grep -x 'exact line' file          # whole-line match
grep -q 'pattern' file && echo hit # QUIET: exit status only, stops at match 1
grep -r 'pattern' /path            # recursive
grep -rn --include='*.py' 'TODO' . # recursive, filtered by glob
grep -r --exclude-dir={.git,node_modules} 'x' .
grep -F 'literal.string' file      # FIXED string: no regex, faster
grep -A3 -B2 'error' file          # 3 lines After, 2 Before
grep -C2 'error' file              # 2 lines of Context each side

# REGEX FLAVOURS
grep 'a\\+'  file                   # BRE (default): + ? | { } need backslashes
grep -E 'a+' file                  # ERE: natural operators (same as egrep)
grep -P '\\d+(?=px)' file           # PCRE: lookarounds, \\d \\w (GNU only)

# ERE CHEATSHEET
#   .  any char      *  0+      +  1+      ?  0 or 1     {n,m} range
#   ^  line start    $  line end           [abc] class   [^abc] negated
#   \\b word boundary  |  alternation       ( ) group
#   \\d digit (PCRE)   \\s whitespace        \\w word char

# Multiple patterns
grep -e 'foo' -e 'bar' file
grep -E 'foo|bar' file
grep -f patterns.txt file          # one pattern per line from a file

# Practical
grep -rn 'TODO\\|FIXME' src/
ps aux | grep -v grep | grep nginx        # exclude the grep process itself
pgrep -a nginx                            # ...or just use pgrep
grep -c '' file                           # count lines (like wc -l)
grep -Rn 'password' . --exclude-dir=.git  # secret sweep

# ripgrep (rg) is a faster modern alternative that respects .gitignore
rg 'pattern' -t py -g '!vendor/'`,
  },
  {
    title: '11 · sed: Stream Editing',
    language: 'bash',
    description: 'sed edits a stream line by line. -i differs between GNU and BSD/macOS — the portable form needs an explicit backup suffix.',
    code: `sed 's/old/new/' file           # replace the FIRST match on each line
sed 's/old/new/g' file          # replace ALL matches (global)
sed 's/old/new/2' file          # replace only the 2nd match per line
sed 's/old/new/gi' file         # global + case-insensitive
sed -i 's/old/new/g' file       # EDIT IN PLACE (GNU)
sed -i.bak 's/old/new/g' file   # in place, keeping file.bak
sed -i '' 's/old/new/g' file    # BSD/macOS needs an explicit empty suffix
#   Portable: sed -i.bak ... && rm file.bak

# ALTERNATIVE DELIMITERS — avoids escaping slashes in paths
sed 's|/usr/local|/opt|g' file
sed 's#old#new#g' file

# LINE SELECTION
sed -n '5p' file                # print ONLY line 5 (-n suppresses auto-print)
sed -n '5,10p' file             # lines 5..10
sed -n '5,$p' file              # line 5 to the end
sed -n '/start/,/end/p' file    # between two patterns, inclusive
sed '5d' file                   # DELETE line 5
sed '/^#/d' file                # delete comment lines
sed '/^$/d' file                # delete blank lines
sed '1d;$d' file                # delete the first and last lines
sed -n '$=' file                # count lines

# ADDRESSED SUBSTITUTION
sed '/^server/s/8080/9090/' file        # only on lines starting with "server"
sed '10,20s/old/new/g' file             # only within a line range

# INSERT / APPEND / CHANGE
sed '3i\\inserted before line 3' file
sed '3a\\appended after line 3' file
sed '3c\\replacement line' file
sed '1i\\#!/bin/bash' file               # prepend a shebang

# CAPTURE GROUPS — BRE needs escaped parens; -E uses bare ones
sed 's/\\(.*\\):\\(.*\\)/\\2:\\1/' file        # swap around a colon
sed -E 's/(.*):(.*)/\\2:\\1/' file
sed -E 's/([0-9]+)/<\\1>/g' file          # & is the whole match

# MULTIPLE EXPRESSIONS
sed -e 's/a/b/' -e 's/c/d/' file
sed 's/a/b/; s/c/d/' file

# PRACTICAL
sed 's/[[:space:]]*$//' file            # strip trailing whitespace
sed -n '2,$p' data.csv                  # skip the header row
sed 's/\\r$//' file                      # CRLF -> LF (dos2unix)
sed '/pattern/q' file                   # print up to the match, then quit`,
  },
  {
    title: '12 · awk: Field Processing',
    language: 'bash',
    description: 'awk splits every line into fields automatically, which makes it the right tool the moment you need column N or a per-group total. It is a full language, not just a filter.',
    code: `awk '{print $1}' file           # first whitespace-separated field
awk '{print $NF}' file          # LAST field
awk '{print $(NF-1)}' file      # second to last
awk '{print NR, $0}' file       # line number + whole line
awk '{print $1, $3}' file       # OFS (default space) between them

# FIELD SEPARATOR
awk -F',' '{print $2}' data.csv
awk -F'\\t' '{print $1}' data.tsv
awk -F'[,:]' '{print $2}' file          # regex separator
awk 'BEGIN{FS=","; OFS="\\t"} {print $1,$2}' file

# BUILT-IN VARIABLES
#   $0 whole line   $1..$n fields    NF number of fields
#   NR record number (overall)       FNR record number within the current file
#   FS input sep    OFS output sep   RS/ORS record separators
#   FILENAME        current file

# PATTERN { ACTION } — either part may be omitted
awk '/error/' file                       # print matching lines (like grep)
awk '/error/ {print $2}' file
awk '$3 > 100' file                      # numeric field condition
awk '$1 == "GET" && $9 == 200' access.log
awk 'NR > 1' file                        # skip the header
awk 'NR % 2 == 0' file                   # even lines
awk 'length($0) > 80' file               # long lines
awk '!seen[$0]++' file                   # DEDUPE, preserving order

# BEGIN / END
awk 'BEGIN {print "start"} {n++} END {print "lines:", n}' file
awk '{sum += $1} END {print sum}' file
awk '{sum += $1} END {printf "%.2f\\n", sum/NR}' file      # average

# GROUP BY — the killer feature
awk '{count[$1]++} END {for (k in count) print k, count[k]}' file
awk -F',' '{total[$1] += $3} END {for (k in total) printf "%s: %.2f\\n", k, total[k]}' sales.csv
awk '{sum[$1] += $2; n[$1]++} END {for (k in sum) print k, sum[k]/n[k]}' data

# FUNCTIONS
#   length(s) substr(s,i,n) index(s,t) split(s,arr,sep) gsub(re,rep)
#   sub() match() toupper() tolower() sprintf() int() sqrt()
awk '{print toupper($1)}' file
awk '{gsub(/old/, "new"); print}' file
awk '{n = split($0, a, ","); print a[n]}' file

# PRACTICAL
awk -F: '$3 >= 1000 {print $1}' /etc/passwd            # human users
ps aux | awk '$3 > 50 {print $2, $11}'                 # PIDs over 50% CPU
awk '{s+=$1} END {print s/1024/1024 " MB"}' sizes.txt
du -s * | sort -rn | awk '{printf "%-30s %s\\n", $2, $1}'`,
  },
  {
    title: '13 · sort, uniq, cut & Friends',
    language: 'bash',
    description: 'uniq only collapses ADJACENT duplicates, so it is nearly always wrong without a preceding sort. The sort | uniq -c | sort -rn pipeline is the standard frequency count.',
    code: `sort file                       # lexicographic
sort -n file                    # NUMERIC (10 after 9, not before)
sort -h file                    # human sizes: 2K, 1M, 3G
sort -r file                    # reverse
sort -u file                    # sort + dedupe
sort -k2 file                   # by field 2 to end of line
sort -k2,2 file                 # by field 2 ONLY
sort -t',' -k3,3n data.csv      # comma-separated, field 3, numeric
sort -k2,2 -k1,1r file          # multi-key: field 2 asc, then field 1 desc
sort -f file                    # case-insensitive
sort -V file                    # version sort (v1.10 after v1.9)
sort -R file                    # random shuffle (or use 'shuf')
LC_ALL=C sort file              # byte order: faster AND deterministic

uniq file                       # collapse ADJACENT duplicates only
sort file | uniq                # the usual intent
uniq -c file                    # prefix each line with its count
uniq -d file                    # only lines that ARE duplicated
uniq -u file                    # only lines appearing exactly once
uniq -i file                    # case-insensitive
uniq -f1 file                   # ignore the first field when comparing

# THE FREQUENCY COUNT IDIOM
sort file | uniq -c | sort -rn | head -20
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head    # top IPs

cut -d',' -f2 data.csv          # field 2 (single-char delimiter only)
cut -d',' -f1,3 data.csv        # fields 1 and 3
cut -d',' -f2- data.csv         # field 2 onward
cut -c1-10 file                 # CHARACTERS 1..10
# cut cannot handle repeated separators — use awk for whitespace-aligned data

tr 'a-z' 'A-Z' < file           # transliterate
tr -d '\\r' < file               # DELETE characters
tr -s ' ' < file                # SQUEEZE runs into one
tr -c 'a-zA-Z0-9\\n' ' ' < file  # complement: replace everything else

paste a.txt b.txt               # join files side by side (tab separated)
paste -d',' a.txt b.txt
join -t',' -1 1 -2 1 a.csv b.csv        # relational join on sorted input

head -20 file; tail -20 file
tail -n +2 file                 # skip the header (from line 2 onward)
tail -f app.log                 # follow
tail -F app.log                 # follow, survives log rotation
wc -l file; wc -w file; wc -c file
nl file                         # number lines
rev file; tac file              # reverse chars / reverse line order
column -t -s',' data.csv        # align into columns
shuf -n 10 file                 # 10 random lines
split -l 1000 big.txt part_`,
  },
  {
    title: '14 · find & xargs',
    language: 'bash',
    description: 'Always pair find -print0 with xargs -0. Any other combination breaks on filenames containing spaces or newlines, which is how scripts delete the wrong files.',
    code: `find . -name '*.log'                    # by name (QUOTE the glob!)
find . -iname '*.LOG'                   # case-insensitive
find . -path '*/build/*' -prune -o -print
find . -type f                          # f file, d dir, l symlink
find . -type f -name '*.py' -not -path './venv/*'
find . -maxdepth 2 -mindepth 1
find . -size +100M                      # larger than 100MB (-100M = smaller)
find . -mtime -7                        # modified in the last 7 DAYS
find . -mmin -60                        # modified in the last 60 MINUTES
find . -newer reference.txt
find . -empty
find . -user root -perm -o+w            # world-writable root files
find . \\( -name '*.tmp' -o -name '*.bak' \\)      # OR needs escaped parens

# ACTIONS
find . -name '*.log' -delete                    # built-in, safest
find . -name '*.log' -exec rm {} \\;              # one process PER file (slow)
find . -name '*.log' -exec rm {} +               # batched (fast)
find . -name '*.py' -exec grep -l TODO {} +
find . -type f -exec chmod 644 {} +
find . -name '*.txt' -execdir mv {} {}.bak \\;    # runs in the file's directory

# XARGS
find . -name '*.log' -print0 | xargs -0 rm       # NUL-safe: the only correct form
find . -name '*.py' -print0 | xargs -0 grep -l TODO
cat urls.txt | xargs -n1 curl -O                 # one argument per invocation
cat hosts.txt | xargs -P8 -n1 ping -c1           # 8 PARALLEL processes
echo "a b c" | xargs -n1 echo
xargs -I{} mv {} /dest/{} < files.txt            # placeholder form
xargs -r cmd                                     # do not run when input is empty
xargs -p cmd                                     # prompt before each run

# WHY -print0 / -0 MATTERS
# A file named "my report.txt" becomes TWO arguments without it. A file named
# "-rf" or one containing a newline is worse. -print0 uses NUL, which cannot
# appear in a filename.

# Preview before destroying
find . -name '*.tmp' -print                      # look first
find . -name '*.tmp' -delete                     # then delete

# PRACTICAL
find . -type f -printf '%s %p\\n' | sort -rn | head    # biggest files (GNU)
find . -type d -empty -delete                          # prune empty dirs
find /var/log -name '*.gz' -mtime +30 -delete          # rotate old archives
find . -type f -name '*.sh' -exec shellcheck {} +

# fd is a friendlier modern alternative
fd '\\.log$' --exec rm`,
  },

  // ─────────────────────────────────────────────────────────────
  // System
  // ─────────────────────────────────────────────────────────────
  {
    title: '15 · Files, Permissions & Ownership',
    language: 'bash',
    description: 'Permission bits are three octal digits for user/group/other. On a directory, x means "may traverse" — without it you cannot cd in even with r.',
    code: `ls -lah                         # long, all, human-readable sizes
ls -lt                          # newest first;  -ltr = oldest first
ls -lS                          # by size
ls -ld dir/                     # the DIRECTORY itself, not its contents

cp src dst;  cp -r dir/ dst/;   cp -a src dst      # -a preserves everything
cp -i src dst                   # prompt before overwrite
mv old new;  mv -n a b          # -n never overwrite
rm file;  rm -r dir;  rm -f file;  rm -rf dir      # -rf is unrecoverable
rm -- "-weird-name"             # -- ends option parsing
mkdir -p a/b/c;  rmdir empty/
ln -s /target linkname          # SYMlink;  ln target hardlink
touch file;  touch -d '2026-01-01' file
stat file;  file image.png;  realpath file;  basename /a/b.txt; dirname /a/b.txt

# PERMISSIONS:  r=4  w=2  x=1,  three digits = user, group, other
chmod 644 file                  # rw- r-- r--   typical file
chmod 755 script.sh             # rwx r-x r-x   typical executable/dir
chmod 600 ~/.ssh/id_rsa         # rw- --- ---   private key (ssh REQUIRES this)
chmod 700 ~/.ssh
chmod +x script.sh              # symbolic form
chmod u+w,go-rwx file
chmod -R 755 dir/
chmod u+X -R dir/               # +X = x only on DIRECTORIES and already-x files

# On a DIRECTORY:  r = list names, w = create/delete entries,
#                  x = traverse into it / stat its contents
# You need x on every ancestor directory to reach a file.

chown user:group file;  chown -R user:group dir/
umask 022                       # default mask: new files 644, new dirs 755

# SPECIAL BITS
chmod u+s binary                # setuid: run as the file's owner
chmod g+s dir/                  # setgid on a dir: new files inherit the group
chmod +t /tmp                   # sticky: only the owner may delete their files

# DISK USAGE
df -h                           # free space per filesystem
df -i                           # INODE usage — "disk full" with free space
du -sh *                        # size of each entry here
du -sh * | sort -rh | head      # biggest first
du -h --max-depth=1 /var
ncdu /var                       # interactive explorer

# ARCHIVES
tar czf out.tar.gz dir/         # create gzipped
tar xzf in.tar.gz               # extract
tar xzf in.tar.gz -C /dest      # extract elsewhere
tar tzf in.tar.gz               # LIST contents without extracting
zip -r out.zip dir/;  unzip in.zip -d /dest
gzip file;  gunzip file.gz;  zcat file.gz`,
  },
  {
    title: '16 · Processes, Signals & Jobs',
    language: 'bash',
    description: 'kill sends a signal, it does not necessarily kill. Default TERM asks politely; KILL (9) cannot be trapped, so cleanup handlers never run — use it last.',
    code: `ps aux                          # every process, BSD syntax
ps -ef                          # every process, System V syntax
ps aux --sort=-%mem | head      # top memory consumers
ps -p 1234 -o pid,ppid,cmd,%cpu,%mem
pgrep -a nginx                  # PIDs by name, with the command line
pgrep -u www-data
pstree -p                       # process tree
top;  htop                      # interactive

kill 1234                       # sends TERM (15): "please shut down"
kill -TERM 1234                 # same, explicit
kill -HUP 1234                  # hangup: many daemons reload config on this
kill -INT 1234                  # like Ctrl-C
kill -9 1234                    # KILL: cannot be caught; NO cleanup runs
kill -l                         # list signal names
pkill nginx;  pkill -u user;  pkill -f 'python app.py'
killall nginx

# ESCALATION ORDER: TERM -> wait a few seconds -> KILL
kill "$pid"; sleep 5; kill -0 "$pid" 2>/dev/null && kill -9 "$pid"
kill -0 "$pid"                  # signal 0 = "does this PID exist?" test only

# JOB CONTROL
long_task &                     # run in the background
jobs -l                         # list this shell's jobs
fg %1                           # bring job 1 to the foreground
bg %1                           # resume a stopped job in the background
# Ctrl-Z  suspend    Ctrl-C  interrupt (INT)    Ctrl-D  EOF
disown -h %1                    # detach from the shell so it survives logout
nohup long_task &> out.log &    # immune to HUP; survives terminal close
setsid long_task                # fully detach into a new session

wait "$pid";  wait              # wait for one / all background jobs
timeout 30 cmd                  # kill after 30s
timeout -s KILL 30 cmd

# PARALLELISM
for h in "\${hosts[@]}"; do ssh "$h" uptime & done; wait
printf '%s\\n' "\${hosts[@]}" | xargs -P8 -I{} ssh {} uptime

# WHAT IS USING THIS?
lsof -i :8080                   # which process holds port 8080
lsof -p 1234                    # files opened by a PID
lsof /path/to/file              # who has this file open
fuser -k 8080/tcp               # kill whatever holds the port
ss -tulpn                       # listening sockets (replaces netstat)

# RESOURCES
uptime; free -h; vmstat 1; iostat -x 1; nproc
/proc/1234/environ; /proc/1234/cmdline; /proc/1234/fd/`,
  },
  {
    title: '17 · Networking & Remote',
    language: 'bash',
    description: 'curl -f is the flag that turns an HTTP 500 into a non-zero exit status — without it, curl reports success while writing the error page to your output file.',
    code: `curl https://api.example.com
curl -s url                     # silent (no progress meter)
curl -f url                     # FAIL on HTTP >= 400 (essential in scripts)
curl -sSf url                   # silent, but still show errors, and fail loudly
curl -L url                     # follow redirects
curl -o out.json url;  curl -O url          # save to file / keep remote name
curl -I url                     # HEAD: response headers only
curl -i url                     # include headers in the output
curl -w '%{http_code} %{time_total}\\n' -o /dev/null -s url
curl -X POST -H 'Content-Type: application/json' -d '{"k":"v"}' url
curl -d @payload.json url
curl -u user:pass url;  curl -H "Authorization: Bearer $TOKEN" url
curl --retry 3 --retry-delay 2 --max-time 30 url
curl -k url                     # skip TLS verification — debugging ONLY

wget -q -O - url                # to stdout
wget -c url                     # resume a partial download
wget -r -np -k url              # recursive mirror

# DNS
dig +short example.com;  dig example.com MX;  dig @8.8.8.8 example.com
nslookup example.com;  host example.com
getent hosts example.com        # uses the system resolver (respects /etc/hosts)

# CONNECTIVITY
ping -c4 host
traceroute host;  mtr host
nc -zv host 443                 # is the port open?
nc -l 8080                      # listen (a quick test server)
telnet host 80
ss -tulpn                       # listening sockets + owning process
ss -tan state established
ip a;  ip r;  ip -br a          # addresses, routes, brief
curl -s ifconfig.me             # public IP

# SSH
ssh user@host
ssh -i ~/.ssh/key user@host     # key must be chmod 600
ssh -p 2222 user@host
ssh user@host 'cmd'             # run one command remotely
ssh -t user@host 'sudo cmd'     # force a TTY (needed for password prompts)
ssh -L 8080:localhost:80 host   # LOCAL forward: my :8080 -> host's :80
ssh -R 9090:localhost:3000 host # REMOTE forward: host's :9090 -> my :3000
ssh -D 1080 host                # SOCKS proxy
ssh-keygen -t ed25519 -C 'me@example.com'
ssh-copy-id user@host

# ~/.ssh/config
#   Host prod
#     HostName 10.0.0.5
#     User deploy
#     IdentityFile ~/.ssh/prod_ed25519
#     ServerAliveInterval 60

# FILE TRANSFER
scp file user@host:/path;  scp -r dir/ user@host:/path
rsync -avz --progress src/ user@host:/dst/       # trailing / on src matters
rsync -avz --delete --dry-run src/ dst/          # ALWAYS dry-run --delete first`,
  },
  {
    title: '18 · Environment, PATH & Shell Config',
    language: 'bash',
    description: 'Login vs interactive shells read different files, which is why "it works in my terminal but not in cron" is such a common report.',
    code: `echo "$PATH"
export PATH="$HOME/bin:$PATH"           # prepend (takes priority)
export PATH="$PATH:/opt/tool/bin"       # append
which python3;  type -a python3;  command -v python3
#   command -v is the POSIX, script-safe one; 'which' is an external binary.

env;  printenv HOME;  set                # env vars / all shell vars
export VAR=value;  unset VAR
VAR=value command                        # set for ONE command only

# COMMON VARIABLES
#   HOME  USER  SHELL  PWD  OLDPWD  PATH  LANG  LC_ALL  TERM
#   EDITOR  PAGER  TMPDIR  HOSTNAME  UID  BASH_VERSION
#   PS1 (prompt)  IFS  RANDOM  SECONDS  LINENO  PIPESTATUS

# STARTUP FILE ORDER
#   Login shell        : /etc/profile -> ~/.bash_profile | ~/.bash_login | ~/.profile
#   Interactive non-login: ~/.bashrc
#   Non-interactive (scripts, cron): NEITHER, unless BASH_ENV is set
# Convention: put everything in ~/.bashrc and source it from ~/.bash_profile:
#   [[ -f ~/.bashrc ]] && . ~/.bashrc
# This is why cron jobs cannot find your PATH additions — always use absolute
# paths in crontabs, or source your profile explicitly.

source ~/.bashrc;  . ~/.bashrc          # reload in the CURRENT shell

alias ll='ls -lah'
alias gs='git status'
alias ..='cd ..'
unalias ll;  \\ls                         # backslash bypasses the alias

# FUNCTIONS beat aliases when you need arguments
mkcd() { mkdir -p "$1" && cd "$1"; }
extract() {
    case "$1" in
        *.tar.gz|*.tgz) tar xzf "$1" ;;
        *.tar.bz2)      tar xjf "$1" ;;
        *.zip)          unzip "$1"   ;;
        *)              echo "unknown archive: $1" >&2; return 1 ;;
    esac
}

# HISTORY
history;  history 20;  !!;  !$;  !abc
Ctrl-R                                   # reverse search
export HISTSIZE=100000 HISTFILESIZE=100000
export HISTCONTROL=ignoreboth:erasedups  # skip dupes and space-prefixed cmds
shopt -s histappend                      # do not clobber history across shells

# SHELL OPTIONS
shopt -s nullglob globstar extglob nocaseglob
set -o vi                                # vi keybindings

# KEYBOARD (emacs mode)
#   Ctrl-A/E  start/end of line     Ctrl-U/K  cut to start/end
#   Ctrl-W    delete word back      Ctrl-L    clear     Ctrl-R  search
#   Alt-.     last arg of previous command`,
  },
  {
    title: '19 · Debugging Shell Scripts',
    language: 'bash',
    description: 'set -x prints every expanded command, which is usually enough to find the bug in one run. shellcheck catches most of the rest before you ever execute it.',
    code: `bash -x script.sh               # trace every command as it runs
bash -n script.sh               # syntax check WITHOUT executing
bash -v script.sh               # echo input lines as they are read

set -x                          # start tracing here
set +x                          # stop tracing
# A more informative trace prefix:
export PS4='+ \${BASH_SOURCE}:\${LINENO}:\${FUNCNAME[0]:-main}: '
set -x

# Trace only a section
set -x; suspicious_command; set +x

# SHELLCHECK — run it on every script; it catches quoting bugs statically
shellcheck script.sh
# shellcheck disable=SC2086          # silence one rule for the NEXT line only

# ERROR CONTEXT
trap 'echo "ERROR at line $LINENO: $BASH_COMMAND" >&2' ERR
set -euo pipefail

# PIPESTATUS: $? only reports the LAST stage of a pipeline
false | true; echo "$?"                     # 0 — the failure is hidden
false | true; echo "\${PIPESTATUS[@]}"       # 1 0 — both stages
set -o pipefail                             # ...or make the pipeline fail

# Log to stderr so it does not pollute captured stdout
log()  { printf '[%s] %s\\n' "$(date +%T)" "$*" >&2; }
die()  { log "FATAL: $*"; exit 1; }
log "starting"
[[ -f "$config" ]] || die "no config at $config"

# Inspect variables
declare -p myvar                # shows type and exact value
declare -p arr                  # arrays too
echo "[$var]"                   # brackets reveal stray whitespace
printf '%q\\n' "$var"            # shell-quoted: reveals hidden characters

# Common causes when "it works interactively but not in the script"
#   1. PATH differs (cron/systemd have a minimal PATH) -> use absolute paths
#   2. Not a login shell, so ~/.bashrc never ran
#   3. No TTY, so anything interactive hangs forever
#   4. Different shell: #!/bin/sh is dash on Debian, NOT bash
#   5. Relative paths resolved against an unexpected CWD -> cd explicitly

cd "$(dirname "$(readlink -f "$0")")" || exit 1      # script's own directory

# Dry-run switch
run() { [[ $dry_run == 1 ]] && { echo "+ $*"; return 0; }; "$@"; }
run rm -rf "$target"`,
  },
  {
    title: '20 · One-Liners Worth Knowing',
    language: 'bash',
    description: 'The pipelines that come up constantly in operations work. Each is short enough to type from memory once you have used it twice.',
    code: `# TOP N BY FREQUENCY
sort file | uniq -c | sort -rn | head -20
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head    # top IPs
awk '{print $9}' access.log | sort | uniq -c | sort -rn           # status codes

# BIGGEST FILES / DIRECTORIES
du -sh * | sort -rh | head -10
find . -type f -printf '%s %p\\n' | sort -rn | head -20            # GNU find

# DISK / INODES FULL
df -h;  df -i
find /var/log -type f -size +100M -exec ls -lh {} +

# WHAT IS ON THIS PORT
ss -tulpn | grep :8080
lsof -i :8080

# TOP RESOURCE CONSUMERS
ps aux --sort=-%mem | head
ps aux --sort=-%cpu | head

# BULK RENAME
for f in *.txt; do mv -- "$f" "\${f%.txt}.md"; done
rename 's/\\.txt$/.md/' *.txt                                      # perl-rename

# FIND AND REPLACE ACROSS A TREE
grep -rl 'old' . --include='*.py' | xargs sed -i 's/old/new/g'
find . -name '*.py' -print0 | xargs -0 sed -i 's/old/new/g'       # NUL-safe

# DEDUPE, ORDER PRESERVED
awk '!seen[$0]++' file

# COMPARE TWO LISTS
comm -13 <(sort a.txt) <(sort b.txt)      # only in b
comm -23 <(sort a.txt) <(sort b.txt)      # only in a
comm -12 <(sort a.txt) <(sort b.txt)      # in both
diff <(sort a.txt) <(sort b.txt)

# SUM A COLUMN
awk '{s += $1} END {print s}' file
paste -sd+ nums.txt | bc

# WATCH SOMETHING CHANGE
watch -n2 'df -h /'
tail -f app.log | grep --line-buffered ERROR

# WAIT FOR A SERVICE
until curl -sf http://localhost:8080/health >/dev/null; do sleep 1; done

# JSON WITH jq
curl -s api/users | jq -r '.[] | .name'
jq '.items | length' data.json
jq -r '.[] | [.id, .name] | @tsv' data.json

# RANDOM / SECRETS
openssl rand -hex 32
head -c 32 /dev/urandom | base64
uuidgen

# CHECKSUMS
sha256sum file;  sha256sum -c sums.txt
md5sum file

# PARALLEL EXECUTION
cat hosts.txt | xargs -P8 -I{} ssh {} 'uptime'

# TIMESTAMPED BACKUP
cp config.yml "config.yml.$(date +%Y%m%d_%H%M%S).bak"

# STRIP COMMENTS AND BLANKS FROM A CONFIG
grep -vE '^\\s*(#|$)' /etc/nginx/nginx.conf`,
  },
  {
    title: '21 · The Bash Gotcha List',
    language: 'bash',
    description: 'Shell failures are usually silent: the script keeps running with a mangled value. These are the ones that cause real damage.',
    code: `# 1. UNQUOTED EXPANSION word-splits and globs. This is the #1 bug.
rm $file                        # a space in the name deletes the wrong files
rm "$file"                      # correct — quote EVERY expansion

# 2. Spaces around = break assignment
# x = 1                         # runs the command 'x' with args "=" and "1"
x=1

# 3. A PIPELINE RUNS IN A SUBSHELL — variable changes are lost
cat f | while read -r l; do (( n++ )); done; echo "$n"    # empty!
while read -r l; do (( n++ )); done < f; echo "$n"        # correct
while read -r l; do (( n++ )); done < <(cat f)            # also correct

# 4. set -e does NOT fire everywhere: not in if/while conditions, not left of
#    && or ||, and not for a function whose status you test. Never assume.

# 5. $? only reflects the LAST stage of a pipeline
false | true; echo "$?"                 # 0
set -o pipefail                         # ...or check "\${PIPESTATUS[@]}"

# 6. PARSING ls BREAKS on spaces and newlines
for f in $(ls); do :; done              # wrong
for f in *; do :; done                  # right

# 7. A glob matching nothing stays LITERAL
for f in *.nope; do echo "$f"; done     # prints the literal "*.nope"
shopt -s nullglob                       # ...or guard with [[ -e "$f" ]]

# 8. [ ] vs [[ ]]:  <  redirects in [ ], compares in [[ ]]
[ "$a" < "$b" ]                         # creates a file named $b!
[[ "$a" < "$b" ]]                       # string comparison

# 9. Numeric comparison with string operators sorts lexicographically
[[ "10" < "9" ]]                        # TRUE — both are strings
(( 10 < 9 ))                            # FALSE — correct

# 10. Command substitution strips ALL trailing newlines. Use "$( )"; then
#     add a sentinel if the trailing newlines actually matter.

# 11. cd can fail and the script continues into the wrong directory
cd /some/path || exit 1                 # always guard cd
rm -rf "\${target:?target is unset}"/*   # refuses to run on an empty variable

# 12. rm -rf "$dir/" with $dir unset becomes rm -rf /
#     set -u plus the :? guard above prevents this class of disaster.

# 13. Backslashes disappear without read -r
read line                               # "a\\tb" loses the backslash
read -r line                            # correct; add IFS= to keep whitespace

# 14. echo is not portable: it interprets -n and backslashes differently
#     across shells. Use printf for anything non-trivial.
printf '%s\\n' "$var"

# 15. #!/bin/sh is dash on Debian/Ubuntu — arrays, [[ ]] and \${x^^} do NOT
#     exist there. Use #!/usr/bin/env bash if you use Bash features.

# 16. Local is not automatic: a variable assigned in a function is GLOBAL
#     unless declared local. Two functions using "i" will collide.

# 17. Trailing slash changes rsync semantics
rsync -a src/ dst/                      # contents of src into dst
rsync -a src  dst/                      # src ITSELF into dst

# 18. Exit codes are 0-255 and wrap: exit 256 becomes 0, i.e. "success".`,
  },
];
