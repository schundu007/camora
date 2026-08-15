// Git Quick Reference cards.
//
// Organised around the question people actually have in front of a terminal:
// "I am in state X, how do I get to state Y, and what will it destroy?"
// Every destructive command is labelled with whether it can be recovered.
//
// Same contract as the other quick-ref card files: unique titles, and no
// stray back-quotes inside the code strings (they would end the JS template).

export const gitCards = [
  // ─────────────────────────────────────────────────────────────
  // Mental model
  // ─────────────────────────────────────────────────────────────
  {
    title: '01 · The Mental Model: Three Trees',
    language: 'bash',
    description: 'Almost every confusing Git command becomes obvious once you know which of the three trees it moves. Nearly all of Git is "move a pointer between these".',
    code: `#   WORKING TREE          INDEX (staging)          HEAD (last commit)
#   your actual files  ->  what the next commit  ->   the committed snapshot
#                          will contain
#
#        git add ------------^                 git commit ------^
#        git restore <-------|                 git restore --staged
#
#   git status        shows the diff of ALL THREE
#   git diff          working tree  vs  index      (unstaged changes)
#   git diff --staged index        vs  HEAD        (what you are about to commit)
#   git diff HEAD     working tree vs  HEAD        (everything, staged or not)

# THE OBJECT MODEL — four types, all content-addressed by SHA-1/SHA-256
#   blob    file CONTENTS (no name, no permissions)
#   tree    a directory: names + modes -> blobs and other trees
#   commit  one tree + parent commit(s) + author + message
#   tag     an annotated pointer to an object
#
# A COMMIT IS A FULL SNAPSHOT, not a diff. Diffs are computed on demand by
# comparing two trees. This is why branching is O(1) and cheap.

# REFS are just files containing a SHA
#   .git/refs/heads/main          a branch = a movable pointer to a commit
#   .git/HEAD                     which branch/commit you are on
#   .git/refs/tags/v1.0           a tag = a pointer that does not move

git cat-file -t HEAD            # commit
git cat-file -p HEAD            # the raw commit object: tree, parent, author
git cat-file -p HEAD^{tree}     # its directory listing
git rev-parse HEAD              # the full SHA

# REVISION SYNTAX — worth memorising
HEAD            # the current commit
HEAD~1  HEAD~3  # 1 / 3 commits back along the FIRST parent
HEAD^   HEAD^2  # first parent / SECOND parent (only merges have a second)
main..feature   # commits in feature that are NOT in main
main...feature  # commits in either but not both (symmetric difference)
HEAD@{2}        # where HEAD was 2 moves ago (see the reflog card)
main@{yesterday}
:/fix login     # the most recent commit whose message matches

# A branch is DELETED-SAFE while its commits are still reachable from the
# reflog — which is why almost nothing in Git is truly lost for ~90 days.`,
  },
  {
    title: '02 · Config & First-Time Setup',
    language: 'bash',
    description: 'Set pull.rebase and push.autoSetupRemote once and two entire categories of daily friction disappear.',
    code: `git config --global user.name  "Ada Lovelace"
git config --global user.email "ada@example.com"
git config --local  user.email "work@company.com"   # per-repo override

# Scopes, narrowest wins:  --system  ->  --global (~/.gitconfig)  ->  --local
git config --list --show-origin        # every setting and which file set it
git config user.email                  # what applies HERE

# THE SETTINGS THAT ACTUALLY MATTER
git config --global init.defaultBranch main
git config --global pull.rebase true            # rebase on pull: linear history,
                                                # no "Merge branch main" noise
git config --global push.default simple
git config --global push.autoSetupRemote true   # 2.37+: plain "git push" on a
                                                # new branch just works
git config --global fetch.prune true            # drop deleted remote branches
git config --global rebase.autoStash true       # stash/unstash around a rebase
git config --global diff.colorMoved zebra       # highlight moved code
git config --global rerere.enabled true         # remember conflict resolutions
                                                # and replay them automatically
git config --global core.editor "vim"
git config --global merge.conflictstyle zdiff3  # shows the ORIGINAL text too

# Line endings
git config --global core.autocrlf input         # macOS/Linux
git config --global core.autocrlf true          # Windows

# Signing
git config --global commit.gpgsign true
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub

# ALIASES
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.unstage "restore --staged"
git config --global alias.amend "commit --amend --no-edit"

# Use a different identity per directory tree (work vs personal)
#   ~/.gitconfig:
#     [includeIf "gitdir:~/work/"]
#         path = ~/.gitconfig-work

git init;  git init -b main
git clone URL;  git clone URL dir
git clone --depth 1 URL          # shallow: fast, no full history
git clone --filter=blob:none URL # partial: history without old file contents`,
  },

  // ─────────────────────────────────────────────────────────────
  // Everyday flow
  // ─────────────────────────────────────────────────────────────
  {
    title: '03 · Status, Stage & Commit',
    language: 'bash',
    description: 'git add -p is the highest-value habit in this list: it forces you to read your own diff before committing, and it produces small reviewable commits.',
    code: `git status;  git status -s;  git status -sb      # -s short, -b with branch
#   short format: XY path   X = index state, Y = working tree state
#   M modified  A added  D deleted  R renamed  ?? untracked

git add file.txt
git add .                       # everything under the CURRENT directory
git add -A                      # everything in the repo, including deletions
git add -u                      # only files already TRACKED
git add '*.py'                  # quote so Git expands the glob, not the shell
git add -p                      # INTERACTIVE: stage hunk by hunk
#   y stage  n skip  s split smaller  e edit manually  q quit  ? help
git add -i                      # full interactive menu

git commit -m "fix: handle empty payload"
git commit                      # opens the editor for a body
git commit -am "msg"            # add TRACKED files and commit (skips untracked)
git commit --amend              # replace the last commit (message + staged work)
git commit --amend --no-edit    # ...keeping the existing message
git commit --no-verify          # skip hooks — use sparingly
git commit --fixup=abc123       # marks a fixup for a later autosquash rebase

# UNSTAGE / DISCARD  (Git 2.23+ verbs; the old form is git checkout/reset)
git restore --staged file       # unstage, KEEP the working-tree change
git restore file                # DISCARD the working-tree change — UNRECOVERABLE
git restore --source=HEAD~2 file  # bring a file back from an older commit
git checkout -- file            # the old spelling of git restore file

# COMMIT MESSAGE CONVENTION (Conventional Commits)
#   feat:     a new feature            fix:      a bug fix
#   docs:     documentation            refactor: no behaviour change
#   test:     tests                    chore:    tooling/deps
#   perf:     performance              BREAKING CHANGE: in the footer
#
#   Subject: imperative mood, <= 50 chars, no trailing period.
#   Body: wrap at 72; explain WHY, not what — the diff already shows what.

git rm file;  git rm --cached file      # untrack but keep on disk
git mv old new                          # = mv + git add + git rm

# EMPTY / WIP
git commit --allow-empty -m "trigger CI"
git stash                               # better than a WIP commit (card 12)`,
  },
  {
    title: '04 · Diff & Inspect',
    language: 'bash',
    description: 'Remembering which two trees each diff form compares removes the guesswork about what you are actually about to commit.',
    code: `git diff                        # working tree vs INDEX (unstaged)
git diff --staged               # index vs HEAD (exactly what will be committed)
git diff --cached               # same as --staged
git diff HEAD                   # working tree vs HEAD (staged AND unstaged)
git diff main feature           # tip vs tip
git diff main...feature         # feature vs their MERGE BASE — what the PR adds
git diff HEAD~3 HEAD            # last three commits combined
git diff abc123 def456 -- path/ # limit to a path

git diff --stat                 # summary: files changed, insertions, deletions
git diff --name-only            # just the filenames
git diff --name-status          # filenames + M/A/D status
git diff -w                     # ignore whitespace
git diff --word-diff            # word-level, good for prose
git diff --color-moved=zebra    # distinguish MOVED code from new code
git diff --find-renames

git show HEAD                   # the last commit: message + full diff
git show HEAD --stat
git show abc123:path/to/file    # a file's CONTENTS at that commit
git show HEAD~2:src/app.py > old_app.py

git log --oneline -10
git log --graph --oneline --decorate --all      # the shape of your branches
git log -p file                 # full patch history for one file
git log --follow file           # ...and keep following it across renames
git log --stat
git log --since='2 weeks ago' --until=yesterday
git log --author='Ada'
git log --grep='fix login'      # search COMMIT MESSAGES
git log -S'functionName'        # PICKAXE: commits that add/remove that STRING
git log -G'regex'               # commits whose DIFF matches the regex
git log main..feature           # commits on feature not yet in main
git log --merges;  git log --no-merges
git log --pretty=format:'%h %an %ar %s'
git log -L 10,20:file.py        # the history of just those lines

git shortlog -sn                # commit counts by author
git blame file;  git blame -L 10,20 file
git blame -w -C file            # ignore whitespace, detect moved code
git annotate file`,
  },

  // ─────────────────────────────────────────────────────────────
  // Branching / integrating
  // ─────────────────────────────────────────────────────────────
  {
    title: '05 · Branches',
    language: 'bash',
    description: 'A branch is a 41-byte file containing a SHA. Creating and deleting them is free — the cost is entirely in the integration, never in the branch itself.',
    code: `git branch                      # local branches; * marks the current one
git branch -a                   # including remote-tracking branches
git branch -r                   # remote-tracking only
git branch -v;  git branch -vv  # with last commit / with upstream tracking
git branch --merged             # already merged into HEAD — safe to delete
git branch --no-merged          # NOT merged — deleting these loses work

git switch -c feature           # create and switch (Git 2.23+, clearest verb)
git switch main                 # switch to an existing branch
git switch -                    # back to the previous branch
git checkout -b feature         # the older spelling of switch -c
git branch feature              # create WITHOUT switching
git switch -c feature main      # branch from a specific start point
git switch -c hotfix v1.2.0     # branch from a tag
git switch --detach abc123      # detached HEAD: inspect an old commit

git branch -m old new           # rename
git branch -m new               # rename the CURRENT branch
git branch -d feature           # delete — REFUSES if unmerged (safe)
git branch -D feature           # force delete — recoverable via reflog
git push origin --delete feature        # delete the remote branch

# TRACKING
git branch -u origin/main       # set upstream for the current branch
git branch --unset-upstream
git push -u origin feature      # push and set upstream in one go

# DETACHED HEAD: you are on a commit, not a branch. New commits belong to
# nothing and are garbage-collected eventually. To keep them:
git switch -c rescue-branch

# CLEAN UP MERGED BRANCHES
git fetch --prune
git branch --merged main | grep -v -E '^\\*|main|master' | xargs -r git branch -d

# WORKTREES — two branches checked out simultaneously, no stashing needed
git worktree add ../hotfix hotfix       # a second working directory
git worktree list
git worktree remove ../hotfix
# Ideal for "review a PR while my feature is half-finished".`,
  },
  {
    title: '06 · Merge & Conflict Resolution',
    language: 'bash',
    description: 'A conflict is not an error — Git is telling you two changes touched the same lines and only you can decide. Read both sides before resolving.',
    code: `git switch main
git merge feature               # fast-forward if possible, else a merge commit
git merge --no-ff feature       # ALWAYS create a merge commit (keeps the
                                # feature's shape visible in history)
git merge --ff-only feature     # refuse unless it fast-forwards (safe in CI)
git merge --squash feature      # stage all changes as ONE uncommitted change
git merge --abort               # bail out, restore the pre-merge state
git merge --continue            # after resolving

# FAST-FORWARD vs MERGE COMMIT
#   main has no new commits  -> the pointer just slides forward (no commit)
#   both diverged            -> a merge commit with TWO parents

# CONFLICT MARKERS
# <<<<<<< HEAD
# the version on your CURRENT branch
# ||||||| merged common ancestor        <- only with conflictstyle=zdiff3
# what BOTH sides started from
# =======
# the version from the branch being MERGED IN
# >>>>>>> feature
git config --global merge.conflictstyle zdiff3    # the ancestor is the useful part

# RESOLVING
git status                      # "Unmerged paths" lists the conflicts
git diff                        # shows only the conflicted hunks
# ...edit the files, DELETE every marker line...
git add resolved-file.py        # staging IS how you mark it resolved
git commit                      # completes the merge (default message is fine)

# Take one whole side
git checkout --ours   file      # our = the branch you are ON
git checkout --theirs file      # theirs = the branch being merged IN
git checkout --merge  file      # regenerate the conflict markers, start over
#   CAUTION: during a REBASE, "ours" and "theirs" are SWAPPED, because rebase
#   replays your commits onto their branch.

git mergetool                   # launch a configured 3-way GUI

# PREVIEW BEFORE MERGING
git merge --no-commit --no-ff feature   # stage the merge without committing
git merge --abort                       # ...then back out
git log main..feature                   # what would come in
git diff main...feature                 # the combined change

# rerere: record a resolution once, replay it automatically next time
git config --global rerere.enabled true    # invaluable on long-lived branches

# UNDO A MERGE
git reset --hard HEAD~1         # if NOT pushed (destroys local changes)
git revert -m 1 <merge-sha>     # if PUSHED: -m 1 keeps the FIRST parent`,
  },
  {
    title: '07 · Rebase & History Rewriting',
    language: 'bash',
    description: 'Rebase creates NEW commits with new SHAs. That is why the golden rule exists: never rebase commits that other people have already pulled.',
    code: `git switch feature
git rebase main                 # replay feature's commits on top of main
git rebase --continue           # after resolving a conflict
git rebase --skip               # drop the current commit
git rebase --abort              # give up, restore the original state
git rebase --onto main old-base feature    # move only a specific range

# THE GOLDEN RULE
#   Rebase only commits that exist ONLY on your machine. Rebasing shared
#   history forces everyone else into a painful recovery. Merge instead.

# INTERACTIVE REBASE — clean up before opening a PR
git rebase -i HEAD~5            # edit the last 5 commits
git rebase -i main              # every commit since main
#   pick    keep as is
#   reword  keep the change, edit the message
#   edit    stop here so you can amend the commit
#   squash  fold into the PREVIOUS commit, COMBINE the messages
#   fixup   fold into the previous commit, DISCARD this message
#   drop    delete the commit entirely
#   exec    run a shell command (e.g. exec npm test) after that commit
#   Reorder lines to reorder commits. The list is OLDEST FIRST.

# AUTOSQUASH — the tidy workflow
git commit --fixup=abc123       # mark a fix for commit abc123
git rebase -i --autosquash main # Git pre-arranges the fixups for you

# PULL WITH REBASE — avoids "Merge branch main into main" noise
git pull --rebase
git config --global pull.rebase true

# AMEND the most recent commit
git commit --amend --no-edit    # add staged changes to it
git commit --amend -m "better message"
#   Amending a PUSHED commit also rewrites history — same rule applies.

# SPLIT one commit into two
git rebase -i HEAD~3            # mark it "edit"
git reset HEAD~                 # unstage its changes, keep them on disk
git add -p; git commit -m "part 1"
git add -p; git commit -m "part 2"
git rebase --continue

# AFTER REWRITING, push safely
git push --force-with-lease     # refuses if the remote moved since your fetch
git push --force                # NEVER: silently overwrites others' work
#   --force-with-lease is the only acceptable force in a shared repo.

# MERGE vs REBASE
#   Rebase: linear, readable history. Use for YOUR feature branch before review.
#   Merge:  preserves what actually happened. Use to integrate INTO main and
#           for anything already shared.
#   Common policy: rebase locally, merge (or squash-merge) via the PR.`,
  },
  {
    title: '08 · Undo: reset, revert & restore',
    language: 'bash',
    description: 'The three commands people confuse most. Choose by "has it been pushed?" — revert for shared history, reset for local, restore for a single file.',
    code: `# WHICH ONE?
#   restore  one FILE, back to some state             (working tree / index)
#   reset    move the BRANCH POINTER                   local history only
#   revert   NEW commit that undoes an old one         safe on shared history

# ---- RESET: moves HEAD, optionally the index and working tree ----
git reset --soft  HEAD~1    # undo the COMMIT; changes stay STAGED
git reset --mixed HEAD~1    # undo commit + unstage; changes stay in files (DEFAULT)
git reset --hard  HEAD~1    # undo commit AND DISCARD the changes — destructive
git reset HEAD~3            # drop the last 3 commits, keep all the work
git reset --hard origin/main    # make local exactly match the remote

#   --soft   HEAD moves.  index untouched.  working tree untouched.
#   --mixed  HEAD moves.  index reset.      working tree untouched.
#   --hard   HEAD moves.  index reset.      working tree RESET  <-- data loss

git reset file              # unstage one file (old spelling of restore --staged)

# ---- REVERT: the safe undo for anything already pushed ----
git revert abc123           # a new commit that inverts abc123
git revert HEAD             # undo the most recent commit
git revert HEAD~3..HEAD     # a range
git revert -n abc123        # stage the inversion without committing
git revert -m 1 <merge>     # revert a MERGE, keeping the first parent

# ---- RESTORE: file-level ----
git restore file                    # discard working-tree changes (UNRECOVERABLE)
git restore --staged file           # unstage, keep the edit
git restore --staged --worktree file  # unstage AND discard
git restore --source=HEAD~2 file    # pull one file from an older commit
git restore .                       # discard ALL working-tree changes

# ---- THE RECOVERY PLAYBOOK ----
# "committed to the wrong branch"
git reset HEAD~1                    # on the wrong branch: undo, keep changes
git stash; git switch right-branch; git stash pop; git commit

# "committed but not pushed, message is wrong"
git commit --amend -m "correct message"

# "need to undo a pushed commit"
git revert <sha>                    # never reset a pushed branch

# "discarded work with reset --hard"
git reflog                          # find the SHA from before the reset
git reset --hard HEAD@{1}

# "deleted a branch by mistake"
git reflog                          # find its tip
git switch -c recovered <sha>

# "staged a secret, not yet committed"
git restore --staged .env; echo ".env" >> .gitignore

# "committed a secret and pushed"
#   Rotate the credential FIRST — it is compromised regardless of history
#   rewriting. Then purge with git filter-repo (see card 13) and force-push.

git clean -n                # DRY RUN: what would be deleted
git clean -fd               # delete untracked files and directories
git clean -fdx              # ...including .gitignore'd files (nukes node_modules)`,
  },
  {
    title: '09 · reflog: The Safety Net',
    language: 'bash',
    description: 'The reflog records every position HEAD has held, including ones no branch points at. It is why almost nothing in Git is ever truly lost for about 90 days.',
    code: `git reflog                      # every move of HEAD, newest first
git reflog show main            # for one specific branch
git reflog --date=iso
git log -g --oneline            # the reflog with full commit messages

# Sample output:
#   a1b2c3d HEAD@{0}: rebase finished: returning to refs/heads/feature
#   e4f5g6h HEAD@{1}: rebase: fix login validation
#   i7j8k9l HEAD@{2}: checkout: moving from main to feature
#   m0n1o2p HEAD@{3}: commit: add tests
#   q3r4s5t HEAD@{4}: reset: moving to HEAD~2         <-- the mistake

# RECOVER FROM ANY MISTAKE — find the state before it, then go back
git reset --hard HEAD@{4}       # move the branch back there
git switch -c rescue HEAD@{4}   # ...or branch from it without moving anything

# Recover a deleted branch
git reflog | grep 'checkout: moving from feature'
git switch -c feature <sha>

# Recover from a bad rebase
git reflog                                  # find "rebase: checkout" / the entry
git reset --hard ORIG_HEAD                  # Git saves the pre-rebase tip here
#   ORIG_HEAD is set by rebase, merge, reset and pull.

# Recover a lost stash
git fsck --unreachable | grep commit
git stash list
git fsck --no-reflog | awk '/dangling commit/ {print $3}'

# Find commits reachable from nothing at all
git fsck --lost-found

# TIME-BASED REFS
git show HEAD@{2.hours.ago}
git show main@{yesterday}
git diff main@{'1 week ago'} main

# LIMITS
#   Reachable entries expire after 90 days (gc.reflogExpire); unreachable ones
#   after 30 (gc.reflogExpireUnreachable). The reflog is LOCAL ONLY — it is not
#   cloned, fetched or pushed, so it cannot save a colleague from your
#   force-push. Only your own machine.

git gc                          # tidy up; may drop expired unreachable objects
git gc --prune=now              # aggressive — do NOT run while recovering`,
  },

  // ─────────────────────────────────────────────────────────────
  // Remotes and collaboration
  // ─────────────────────────────────────────────────────────────
  {
    title: '10 · Remotes, Fetch, Pull & Push',
    language: 'bash',
    description: 'fetch is always safe — it only updates remote-tracking refs. pull is fetch plus an immediate merge or rebase, which is where the surprises come from.',
    code: `git remote -v                   # configured remotes
git remote add origin URL
git remote add upstream URL     # the canonical repo when working from a fork
git remote set-url origin URL
git remote remove old
git remote show origin          # full detail: branches, tracking, stale refs
git remote rename origin main-repo

git fetch                       # download from origin; changes NOTHING local
git fetch --all
git fetch --prune               # delete remote-tracking refs for deleted branches
git fetch origin main           # one branch
# After fetch, origin/main has moved but your main has NOT. Inspect first:
git log HEAD..origin/main       # what is incoming
git diff HEAD origin/main

git pull                        # = fetch + merge (or rebase if configured)
git pull --rebase               # replay your local commits on top — linear
git pull --ff-only              # refuse if it would need a merge (safest default)

git push                        # push the current branch to its upstream
git push -u origin feature      # first push + set upstream
git push origin main
git push --all;  git push --tags
git push origin --delete feature
git push --force-with-lease     # safe force: aborts if the remote changed
git push --force                # DANGEROUS: silently discards others' commits

# THE FORK WORKFLOW
git remote add upstream https://github.com/original/repo.git
git fetch upstream
git switch main
git merge upstream/main         # or: git rebase upstream/main
git push origin main

# TRACKING BRANCHES
git branch -vv                  # which local tracks which remote, and ahead/behind
git status                      # "ahead 2, behind 1" comes from this
git switch -c local-name origin/remote-name    # check out someone's branch

# WHEN PUSH IS REJECTED (non-fast-forward)
#   The remote has commits you do not. NEVER reflexively --force.
git pull --rebase               # replay your work on top of theirs
git push
#   If you deliberately rewrote history, use --force-with-lease.

# INSPECT WITHOUT CLONING
git ls-remote origin
git ls-remote --heads origin
git archive --remote=URL HEAD | tar -t`,
  },
  {
    title: '11 · Cherry-pick, Tags & Releases',
    language: 'bash',
    description: 'Cherry-pick copies a commit onto another branch as a NEW commit with a new SHA — the two will not deduplicate on a later merge, so use it deliberately.',
    code: `# CHERRY-PICK — copy specific commits to the current branch
git cherry-pick abc123
git cherry-pick abc123 def456           # several
git cherry-pick abc123..def456          # a range, EXCLUDING abc123
git cherry-pick abc123^..def456         # a range, INCLUDING abc123
git cherry-pick -n abc123               # stage without committing
git cherry-pick -x abc123               # append "(cherry picked from ...)"
git cherry-pick --continue | --skip | --abort

# Typical use: a hotfix that must land on both main and a release branch
git switch release-1.2
git cherry-pick <fix-sha>

# git cherry -v main feature            # which commits are NOT yet upstream

# TAGS
git tag                                 # list
git tag -l 'v1.*'
git tag v1.0.0                          # LIGHTWEIGHT: just a pointer
git tag -a v1.0.0 -m "Release 1.0.0"    # ANNOTATED: an object with author,
                                        # date, message — use this for releases
git tag -s v1.0.0 -m "signed"           # GPG-signed
git tag -a v1.0.0 abc123                # tag an older commit
git show v1.0.0
git tag -d v1.0.0                       # delete locally

# Tags are NOT pushed by default
git push origin v1.0.0
git push origin --tags                  # all of them
git push --follow-tags                  # push commits + annotated tags only
git push origin --delete v1.0.0

git checkout v1.0.0                     # detached HEAD at that tag
git switch -c hotfix v1.0.0             # branch from a release

# DESCRIBE — a human-readable version string from the nearest tag
git describe --tags                     # v1.0.0-14-gabc1234
                                        # ^tag  ^commits since  ^current sha
git describe --tags --always --dirty    # perfect for embedding a build version

# SEMVER:  MAJOR.MINOR.PATCH
#   MAJOR  breaking change     MINOR  new feature, compatible
#   PATCH  bug fix, compatible

# RELEASE NOTES from history
git log v1.0.0..v1.1.0 --oneline --no-merges
git log v1.0.0..HEAD --pretty=format:'- %s (%an)' --no-merges
git shortlog v1.0.0..HEAD --no-merges`,
  },
  {
    title: '12 · Stash & Work-in-Progress',
    language: 'bash',
    description: 'Stash is a stack, and by default it does NOT include untracked files — the single most common way people think a stash lost their work.',
    code: `git stash                       # stash tracked modifications, clean the tree
git stash push -m "wip: login"  # with a message (the modern form)
git stash -u                    # INCLUDE untracked files  <-- usually what you want
git stash -a                    # include ignored files too
git stash push -m "msg" -- path/to/file      # stash only specific paths
git stash -p                    # interactively choose hunks to stash

git stash list                  # stash@{0} is the MOST RECENT
git stash show                  # summary of the latest
git stash show -p               # full diff
git stash show -p stash@{2}

git stash pop                   # apply the latest AND remove it from the stack
git stash apply                 # apply but KEEP it in the stack
git stash apply stash@{2}
git stash pop stash@{1}
git stash drop stash@{0}
git stash clear                 # delete every stash — no confirmation
git stash branch newbranch      # create a branch from the stash and apply it
                                # (ideal when the stash no longer applies cleanly)

# WHY -u MATTERS
#   git stash leaves untracked files in place. You then switch branches,
#   see those files, and assume the stash captured everything. It did not.

# CONFLICTS ON POP
#   The stash is NOT dropped when pop conflicts — resolve, git add, then
#   git stash drop manually.

# A stash is really a commit, so the reflog can recover a dropped one:
git fsck --unreachable | grep commit
git stash apply <sha>

# ALTERNATIVES that are often better
git switch -c wip && git commit -am "wip"        # a real branch survives
                                                 # everything and is pushable
git worktree add ../hotfix main                  # no stashing needed at all
git commit --fixup=HEAD                          # small correction to squash later

# Rule of thumb: stash for minutes, a WIP branch for hours, a worktree when
# you need both checkouts at once.`,
  },

  // ─────────────────────────────────────────────────────────────
  // Investigation and hygiene
  // ─────────────────────────────────────────────────────────────
  {
    title: '13 · Bisect, Blame & Archaeology',
    language: 'bash',
    description: 'Bisect finds the commit that introduced a bug in log2(n) steps — 10 tests across 1000 commits. Automate it with a test script and it runs unattended.',
    code: `# BISECT — binary search over history
git bisect start
git bisect bad                  # the current commit is broken
git bisect good v1.0.0          # this older one worked
#   Git checks out the midpoint; test it, then:
git bisect good                 # ...or: git bisect bad
#   Repeat until Git prints "<sha> is the first bad commit"
git bisect reset                # return to where you started

# AUTOMATED — the script must exit 0 for good, non-zero for bad
git bisect start HEAD v1.0.0
git bisect run npm test
git bisect run ./check.sh
#   Exit code 125 means "cannot test this commit" (skip it).
git bisect skip                 # skip a commit that will not build

# BLAME — who last touched each line, and in which commit
git blame file.py
git blame -L 40,60 file.py      # only those lines
git blame -w                    # ignore whitespace-only changes
git blame -C -C                 # detect code moved from other files
git blame <sha> -- file.py      # blame as of an older commit
git blame --ignore-rev <sha>    # skip a bulk reformat commit
#   Put mass-reformat SHAs in .git-blame-ignore-revs and set:
git config blame.ignoreRevsFile .git-blame-ignore-revs

# SEARCHING HISTORY
git log -S'connectTimeout'      # PICKAXE: commits changing the COUNT of that string
git log -S'x' --pickaxe-regex
git log -G'connect.*Timeout'    # commits whose DIFF matches the regex
git log --grep='memory leak'    # search commit MESSAGES
git log --grep='fix' --grep='bug' --all-match
git log --diff-filter=D -- path/file      # the commit that DELETED a file
git log --all --full-history -- '**/lost.py'      # find a file that vanished
git grep 'pattern'              # grep the WORKING TREE (fast)
git grep 'pattern' v1.0.0       # grep an old revision
git grep -n --heading 'pattern' $(git rev-list --all)   # grep ALL of history

# WHEN DID THIS LINE CHANGE
git log -L 42,50:src/app.py     # full history of a line range
git log --follow -p -- file     # patch history across renames

# WHICH BRANCHES / TAGS CONTAIN A COMMIT
git branch --contains abc123
git tag   --contains abc123
git merge-base main feature     # their common ancestor
git name-rev abc123`,
  },
  {
    title: '14 · .gitignore, Large Files & Cleanup',
    language: 'bash',
    description: '.gitignore only affects UNTRACKED files. Once a file is tracked, ignoring it does nothing until you untrack it — the most-reported "gitignore is broken" issue.',
    code: `# .gitignore syntax
#   node_modules/          a directory anywhere
#   *.log                  by extension
#   /build                 only at the REPO ROOT
#   !important.log         NEGATE a previous rule
#   docs/**/*.tmp          ** = any depth
#   *.py[cod]              character class
#   # comment

# THE CLASSIC PROBLEM: already-tracked files ignore .gitignore
git rm --cached file            # untrack, KEEP on disk
git rm -r --cached .            # untrack everything...
git add .                       # ...then re-add, now honouring .gitignore
git commit -m "chore: apply gitignore"

git check-ignore -v path        # WHICH rule is ignoring this path?
git status --ignored

# Ignore locally without touching the shared file
#   .git/info/exclude           personal, never committed
git config --global core.excludesfile ~/.gitignore_global

# "stop tracking my local config changes" — both are LEAKY; prefer a
# .example file plus a gitignored real file
git update-index --skip-worktree config.local
git update-index --no-skip-worktree config.local

# CLEANING UNTRACKED FILES
git clean -n                    # DRY RUN — always run this first
git clean -f                    # delete untracked FILES
git clean -fd                   # ...and directories
git clean -fdx                  # ...including ignored files (removes node_modules)
git clean -fdi                  # interactive

# REPO SIZE
git count-objects -vH
du -sh .git
git rev-list --objects --all \\
  | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \\
  | awk '/^blob/ {print $3, $4}' | sort -rn | head -10   # biggest blobs

# GIT LFS for large binaries
git lfs install
git lfs track '*.psd'
git add .gitattributes

# PURGING A FILE FROM ALL HISTORY (secrets, huge blobs)
#   git-filter-repo is the supported tool; filter-branch is deprecated.
pip install git-filter-repo
git filter-repo --path secrets.env --invert-paths
git filter-repo --strip-blobs-bigger-than 10M
#   This REWRITES EVERY COMMIT. Everyone must re-clone. If the secret was ever
#   pushed, ROTATE THE CREDENTIAL — removing it from history is not enough,
#   because forks, caches and CI logs may still hold it.

git gc --aggressive --prune=now         # repack after a large rewrite
git repack -ad`,
  },
  {
    title: '15 · Hooks, Submodules & Advanced',
    language: 'bash',
    description: 'Hooks live in .git/hooks and are NOT cloned, so they cannot be relied on for enforcement — use core.hooksPath or a tool like pre-commit to share them.',
    code: `# HOOKS — executable scripts in .git/hooks/ (samples ship with .sample suffix)
#   CLIENT-SIDE
#     pre-commit          before the message editor; lint/format/test here
#     prepare-commit-msg  seed the message template
#     commit-msg          validate the message (e.g. Conventional Commits)
#     pre-push            last gate before publishing
#     post-checkout / post-merge   e.g. reinstall dependencies
#   SERVER-SIDE
#     pre-receive, update, post-receive
# A non-zero exit ABORTS the operation.

cat > .git/hooks/pre-commit <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
git diff --cached --name-only --diff-filter=ACM | grep '\\.py$' | xargs -r ruff check
EOF
chmod +x .git/hooks/pre-commit

# Hooks are NOT cloned. Share them with a tracked directory:
git config core.hooksPath .githooks
#   ...or use pre-commit / husky / lefthook, which wire this up for you.
git commit --no-verify          # bypass client hooks (should be rare)

# SUBMODULES — a pinned pointer to another repo at a specific commit
git submodule add URL path/
git clone --recurse-submodules URL
git submodule update --init --recursive     # after a plain clone
git submodule update --remote               # bump to the tracked branch tip
git submodule foreach 'git switch main && git pull'
git submodule status
#   Pain points: they pin a SHA, so contributors constantly forget --init and
#   see an empty directory; updates need a commit in the PARENT repo too.
#   Consider a package manager or a monorepo before reaching for submodules.

# SPARSE CHECKOUT — work with part of a huge monorepo
git clone --filter=blob:none --sparse URL
git sparse-checkout set apps/web packages/ui
git sparse-checkout list;  git sparse-checkout disable

# PATCHES — collaborate without a shared remote
git format-patch main               # one .patch file per commit
git format-patch -1 HEAD
git am < 0001-fix.patch             # apply, preserving authorship
git diff > my.patch;  git apply my.patch
git apply --check my.patch          # test without applying

# BUNDLES — a repo in a single file (air-gapped transfer)
git bundle create repo.bundle --all
git clone repo.bundle repo/

# NOTES / ATTRIBUTES / MAINTENANCE
git notes add -m "reviewed by X" HEAD
#   .gitattributes:  *.png binary   *.md diff=markdown   *.sh text eol=lf
git maintenance start               # background gc/prefetch (2.30+)
git fsck                            # verify object integrity`,
  },
  {
    title: '16 · The Git Gotcha List',
    language: 'bash',
    description: 'The mistakes that cost real time, and what actually recovers from each. Note which are recoverable via the reflog and which are genuinely gone.',
    code: `# 1. git reset --hard DISCARDS working-tree changes permanently.
#    Committed work is recoverable via reflog; UNCOMMITTED work is NOT.
#    Stash or commit before any reset --hard.

# 2. git restore file / git checkout -- file silently destroys your edit.
#    There is no reflog for uncommitted changes.

# 3. git push --force overwrites teammates' commits with no warning.
git push --force-with-lease      # always this instead

# 4. .gitignore does nothing for ALREADY-TRACKED files.
git rm --cached file

# 5. git stash does NOT include untracked files by default.
git stash -u

# 6. Rebasing shared branches rewrites SHAs and breaks everyone else's clone.
#    Rebase only local, unpushed commits.

# 7. During a REBASE, --ours and --theirs are SWAPPED relative to a merge,
#    because your commits are being replayed onto their branch.

# 8. git pull silently creates merge commits. Configure pull.rebase or
#    pull.ff-only so it cannot surprise you.

# 9. Detached HEAD: commits made there belong to no branch and are eventually
#    garbage-collected. git switch -c name to keep them.

# 10. git clean -fdx deletes ignored files too — including node_modules, .env
#     and any local config. Always run git clean -n first.

# 11. Committing a secret is not undone by deleting it in the next commit.
#     It stays in history forever. ROTATE the credential, then filter-repo.

# 12. git commit -a skips UNTRACKED files, so brand-new files are silently
#     left out of the commit.

# 13. Tags are not pushed by git push. Use --follow-tags or --tags.

# 14. Case-only renames are invisible on macOS/Windows (case-insensitive FS).
git mv --force File.txt file.txt

# 15. Line-ending churn: a whole file shows as modified. Fix core.autocrlf
#     and add a .gitattributes with "* text=auto".

# 16. git checkout is overloaded — it switches branches AND discards files.
#     Use git switch and git restore; they cannot be confused for each other.

# 17. Merging with uncommitted changes can fail halfway and leave a mess.
#     Commit or stash first; enable rebase.autoStash for rebases.

# 18. Submodules pin a SHA. Forgetting --recurse-submodules gives you empty
#     directories and a confusing build failure.

# 19. Deleting a remote branch does not delete your remote-tracking ref.
git fetch --prune                # or set fetch.prune true

# 20. --amend rewrites the commit. If it was pushed, you now need a
#     force-with-lease push, with all the same sharing caveats as a rebase.`,
  },
];
