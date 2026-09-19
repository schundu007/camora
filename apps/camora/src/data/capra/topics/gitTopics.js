/**
 * Git — branching, integration at scale, and history forensics.
 *
 * Split out of the single `git-for-devops` command reference, which covered
 * syntax but none of the questions engineers actually get asked: which
 * branching model to pick and why, how to ship a change that depends on
 * another unmerged change, what happens when forty developers merge into one
 * branch, and how to find the commit that broke something three weeks ago.
 *
 * Structure follows the reviewed DevOps convention: description (standfirst
 * plus overview), introduction, topics[] as chapters, quickFire[], references.
 *
 * 2026-09: a fundamentals track (F1–F5) was added at the top, grounded in the
 * Visual Git Reference, Pro Git, Learn Git Branching, Git Immersion and the
 * Atlassian tutorials. Diagrams: /diagrams/git/*.png from
 * scripts/gen-git-learn-diagrams.py. The Learn Git Branching companion was
 * rewritten against the real level tree (36 levels).
 */
import { devopsCategories } from './devopsTopics.js';

export const gitTopics = [
  // ── F1 ───────────────────────────────────────────────────────────────
  {
    id: 'git-three-trees-fundamentals',
    title: 'The Three Trees — Which Tree Every Git Command Reads and Writes',
    icon: 'layers',
    color: '#26619C',
    questions: 12,
    description: 'Nearly every Git command copies files between three places: the working directory, the stage (also called the index) and the HEAD commit. One picture per command — add, commit, diff, checkout, reset, amend — showing exactly which tree is read and which is written, plus the walkthrough that proves each arrow with cat-file.',
    introduction: `## Overview
Most Git confusion is not about syntax. It is about not knowing **where a command copies files from and to**. Once you can name the three places, almost every command becomes a single arrow between two of them.

The three places, using the names git status itself uses:

| Tree | What it holds | Also called |
| --- | --- | --- |
| Working directory | The files you edit and see on disk | working tree, sandbox |
| Stage | The proposed next commit, file by file | index, staging area, cache |
| HEAD | The snapshot of the last commit on the current branch | the repository, history |

Git's daily loop is "make the stage look right, then turn it into a commit". git add copies a file from the working directory into the stage. git commit turns the stage into a commit and moves the current branch to it. Everything else in this topic is a variation: a command that copies in the other direction, a command that skips the stage, or a command that moves a branch pointer and then optionally refreshes the other two trees to match.

The diagrams follow Mark Lodato's Visual Git Reference, redrawn: commits are green boxes with five-character ids, branches are gold pills pointing at a commit, HEAD is a gray pill, the stage is blue and the working directory is red. A dashed arrow is HEAD moving; a solid arrow is files being copied; a faded box is where a reference used to be.`,
    topics: [
      {
        title: 'The four copy commands, and the three that skip the stage',
        image: '/diagrams/git/fund-basic-usage.png',
        content: `**The four basic commands** copy files between the working directory, the stage and history. Read the picture as two upward arrows on the right (publishing toward history) and two downward arrows on the left (copying back toward your files).

    git add <files>            # working directory  -> stage
    git commit                 # stage              -> history (new commit)
    git reset -- <files>       # HEAD commit        -> stage      (unstage)
    git checkout -- <files>    # stage              -> working directory (throw away edits)

Two of those deserve a second look because nearly everyone has the source wrong.

**git reset -- file copies from HEAD to the stage.** It does not touch your working directory. It is the exact inverse of git add: add copies your edit into the stage, reset copies the committed version back over it. This is why git status suggests it (or its modern spelling git restore --staged file) under "Changes to be committed".

**git checkout -- file copies from the stage, not from HEAD.** If you staged version 3 of a file and then edited it to version 4, git checkout -- file gives you version 3 back, not the committed version 2. The walkthrough at the end of this chapter demonstrates it. The modern spelling is git restore file and it has the same source.

Any of the four takes -p (patch) to choose hunks interactively rather than whole files: git add -p, git reset -p, git checkout -p, git restore -p.

**Three commands jump over the stage.** Each one produces two arrows in the diagram, because Git keeps the stage consistent as a side effect.

    git commit -a                   # working directory -> stage -> history, for every tracked file
    git commit <files>              # working directory -> history for those files (and they are staged too)
    git checkout HEAD -- <files>    # HEAD -> stage AND working directory

git commit -a is equivalent to running git add on every file that existed in the latest commit, then committing. It never adds a brand-new untracked file. git commit <files> is subtler: it creates a commit containing the contents of the latest commit plus a snapshot of the named files taken from the working directory, bypassing whatever version of them was staged, and it copies those files into the stage as well. git checkout HEAD -- file is the one that updates both the stage and the working directory from a commit; its modern equivalent is git restore --source=HEAD --staged --worktree file, and note that plain git restore --source=HEAD file updates the working directory only.

**Proving the arrows.** Git can print a file from any of the three trees, which makes every claim above testable in a scratch repository. HEAD:path reads the file from the HEAD commit; :path (a leading colon, no number) reads it from the stage; cat reads the working directory.

    git init lab && cd lab
    echo 1 > myfile && git add myfile && git commit -m "version 1"

    show_status() {
      echo "HEAD:     $(git cat-file -p HEAD:myfile)"
      echo "Stage:    $(git cat-file -p :myfile)"
      echo "Worktree: $(cat myfile)"
    }

    echo 2 > myfile && git add myfile && git commit -m "version 2"
    echo 3 > myfile && git add myfile      # stage version 3
    echo 4 > myfile                        # edit again, do not stage
    show_status                            # HEAD 2 / Stage 3 / Worktree 4

From that three-way state, each command lands on a different result. Reset the lab to 2 / 3 / 4 between rows.

| Command | HEAD | Stage | Worktree | What was copied |
| --- | --- | --- | --- | --- |
| git reset -- myfile | 2 | 2 | 4 | HEAD to stage |
| git checkout -- myfile | 2 | 3 | 3 | stage to working directory |
| git checkout HEAD -- myfile | 2 | 2 | 2 | HEAD to both |
| git commit myfile -m "v4" | 4 | 4 | 4 | working directory to both, bypassing the staged 3 |

Run this once and the three trees stop being a diagram and become something you can feel. The last row is the one that surprises people: the staged version 3 never made it into any commit.`,
      },
      {
        title: 'Reading the diagrams — commits, branches, HEAD, and the five diff questions',
        image: '/diagrams/git/fund-conventions.png',
        content: `**Commits point at their parents.** Each green box is a commit, named by the first five characters of its hash. The arrow from a commit points to its parent, so history is read right to left: ed489 was made on top of da985, which was made on top of c10b9. The ellipsis on the left stands for everything older.

**A branch is a pointer to one commit.** The gold pill main points at ed489; stable points at the older a47c3. Neither contains commits. "The commits on main" simply means every commit reachable by following parent arrows from the commit main points at. Because the pointer is all there is, creating a branch writes one small file and takes no time.

**HEAD is a pointer to the current branch.** It sits on top of main in the picture, which is the normal, attached state: commit, and main moves, and HEAD moves with it. When HEAD points directly at a commit instead of at a branch, it is detached, which the checkout chapter covers.

**Below the chain sit the stage and the working directory.** The stage is the file list the next commit will be built from. The working directory is the files you actually see. When all three agree, git status reports a clean tree.

**The five diff questions.** git diff is a comparison between two of the trees, and the flags choose which two. Every one of them accepts filenames at the end to narrow the comparison.

    git diff                    # stage           vs working directory: what have I edited but not staged?
    git diff --cached           # HEAD commit     vs stage:             what will the next commit contain?
    git diff HEAD               # HEAD commit     vs working directory: everything I have changed, staged or not
    git diff stable             # the commit stable points at vs working directory
    git diff b325c da985        # commit vs commit; nothing on disk is involved

--staged is a synonym for --cached. The second and third forms are the ones people confuse: --cached answers "what am I about to commit", HEAD answers "what have I changed since the last commit". If a change shows in git diff HEAD but not in git diff --cached, it has not been staged yet.

The file lifecycle in the gallery below shows the same trees from the point of view of a single file: untracked, then unmodified once committed, modified once edited, staged once added, and back to unmodified after the commit.`,
      },
      {
        title: 'Commit — a new node, a moved pointer, and what --amend really does',
        image: '/diagrams/git/fund-commit.png',
        content: `**A normal commit does three things in order.** It creates a new commit object from the files in the stage, sets that commit's parent to the current commit, and then moves the current branch to point at it. In the picture, main pointed at ed489 before; afterwards a new commit f0cec exists with parent ed489, main points at f0cec, and HEAD, being attached to main, comes along. The working directory is not touched at all: it already contained what you committed.

**The same three steps run when the current branch is an ancestor of another.** Check out stable, which points at a47c3, an ancestor of main, and commit. A new commit 1800b is created with parent a47c3 and stable moves to it. From this moment stable is no longer an ancestor of main: the two histories have forked, and joining them again will need a merge or a rebase. This is the smallest possible picture of divergence, and every branching-strategy argument in later topics is about how long you let this state persist.

**git commit --amend does not edit a commit.** It creates a new commit with the same parent as the current one, built from the current stage, and moves the branch to it. The old commit ed489 is still in the object store, still pointing at da985, but nothing references it any more, so it will eventually be garbage collected. Two consequences follow. Amending is safe locally because the old commit lingers in the reflog. Amending is dangerous once pushed because everyone else's copy of the branch still points at the old commit, and their next pull will try to reconcile two versions of the same change. The topic on rewriting history builds on exactly this picture.

**Committing with a detached HEAD** is the fourth case and is covered in the next chapter, because the picture only makes sense once you have seen how checkout detaches HEAD in the first place.

A useful habit while learning: after each commit, run git log --oneline --graph --decorate --all and check that the picture in your head matches the one Git prints.`,
      },
      {
        title: 'Checkout is three different commands wearing one name',
        image: '/diagrams/git/fund-checkout-branch.png',
        content: `git checkout copies files from history (or the stage) into the working directory, and optionally switches branches. Which of those it does depends entirely on the arguments, which is why Git 2.23 split it into git switch and git restore. Learn the three cases and both spellings.

**Case A: a filename is given.** git checkout HEAD~ foo.c copies foo.c from the commit named HEAD~ (the parent of the current commit) into both the stage and the working directory. No branch moves, HEAD does not move. If no commit is named, git checkout -- foo.c copies from the stage. Modern spellings: git restore --source=HEAD~ --staged --worktree foo.c for the first, git restore foo.c for the second.

**Case B: a local branch name, no filename.** git checkout stable moves HEAD to point at stable, then makes the stage and the working directory match the commit stable points at. Nothing is created and no branch pointer moves; only HEAD re-attaches, which is what the dashed arrow across the top of the picture shows. The file rule for the working directory is precise and worth memorising: any file that exists in the new commit is copied in; any file that exists in the old commit but not in the new one is deleted; any file that exists in neither is left alone. That last clause is why untracked files survive a branch switch, and the first is why Git refuses to switch when it would overwrite an uncommitted edit. Modern spelling: git switch stable.

**Case C: a reference that is not a local branch, no filename.** A tag, a remote-tracking branch, a raw hash, or an expression such as main~3 gives you an anonymous branch, called a **detached HEAD**. HEAD points straight at the commit, the stage and the working directory are set to match it, and no branch is involved. This is the right tool for looking around: git checkout v1.6.6.1, build it, then git checkout main to come back. Modern spelling: git switch --detach main~3.

**Committing on a detached HEAD** works like any other commit except that no branch moves. The three-frame sequence in the gallery tells the whole story. Frame one: commit, and a new commit 2eecb appears with HEAD pointing at it and no branch anywhere near. Frame two: git checkout main, and HEAD re-attaches to main; 2eecb is now referenced by nothing except the reflog, and will be collected when that entry expires. Frame three, the rescue: git checkout -b new creates a branch at 2eecb and attaches HEAD to it, so the work is kept. If you notice the loss only after leaving, git reflog still knows the hash, and git branch rescued <hash> is the same rescue performed late.

The lesson people take from these three pictures is the one that matters: **checkout moves HEAD; it never moves a branch pointer.** Reset, in the next chapter, is the command that moves the branch.`,
      },
      {
        title: 'Reset — move the branch, then optionally the stage, then optionally the files',
        image: '/diagrams/git/fund-reset-modes.png',
        content: `git reset does up to three things, always in the same order, and the flag says where to stop. Pro Git calls this the single most useful mental model in the book.

1. **Move the branch that HEAD points to** to the named commit. This is the whole of --soft.
2. **Make the stage look like that commit.** This is where --mixed, the default, stops.
3. **Make the working directory look like the stage.** Only --hard goes this far.

So git reset --soft HEAD~ undoes the last commit but leaves everything staged, as if you had just run git add. git reset HEAD~ undoes the commit and the add, leaving your edits present but unstaged. git reset --hard HEAD~ undoes the commit, the add and the edits themselves. **--hard is the only flag that makes reset dangerous**, and one of the very few places Git destroys data: committed work is still recoverable from the reflog, but an uncommitted edit that --hard overwrites is simply gone.

In the picture, git reset HEAD~3 moves main from ed489 back to b325c. The three commits after it are still drawn, because they still exist; nothing points at them any more. The stage is refreshed from b325c because the default is --mixed, and the working directory is refreshed only if --hard was given. Compare that with the checkout picture in the previous chapter: checkout moved HEAD and left main alone; reset moves main and HEAD follows.

**Reset with no commit** defaults to HEAD. The branch does not move, so what remains is step two: the stage is reset to the last commit, which unstages everything. Add --hard and step three discards every working-directory change too, which is the common "throw away all my uncommitted work" command.

**Reset with a filename** skips step one entirely, because HEAD is a pointer and cannot point at part of one commit and part of another. git reset -- file copies that file from HEAD into the stage, which unstages it. git reset <commit> -- file copies the file's contents as of that commit into the stage, leaving the working directory alone, so the next commit reverts the file without the old version ever appearing on disk. File-level reset never touches the working directory, which makes it always safe.

**The squash trick.** Because --soft leaves the stage intact, git reset --soft HEAD~3 followed by git commit collapses the last three commits into one with no interactive rebase involved. The stage already held the final state; only the branch pointer moved.

**Checkout versus reset, side by side.** Without a path, git checkout main and git reset --hard main both end with all three trees matching main, but checkout moves HEAD to a different branch and refuses to overwrite uncommitted work, while reset drags the current branch to main's commit and overwrites without checking. With a path, git checkout <commit> file updates the stage and the working directory; git reset <commit> file updates only the stage.

| Command | Moves | Stage | Working dir | Safe for uncommitted edits? |
| --- | --- | --- | --- | --- |
| reset --soft <commit> | the branch | no | no | yes |
| reset <commit> | the branch | yes | no | yes |
| reset --hard <commit> | the branch | yes | yes | no |
| checkout <branch> | HEAD | yes | yes | yes, it refuses instead |
| reset <commit> -- file | nothing | yes | no | yes |
| checkout <commit> -- file | nothing | yes | yes | no |

**And revert is neither.** git revert <commit> creates a new commit that undoes an earlier one. It moves nothing backwards and rewrites nothing, which is why it is the correct undo for anything already shared. The rule of thumb Atlassian's tutorial gives is exactly right: reset and checkout for private, local undo; revert for public undo.`,
      },
    ],
    visualizations: [
      { title: 'git commit on an ancestor branch — stable forks away from main', image: '/diagrams/git/fund-commit-stable.png', content: 'Committing while on stable, which pointed at an ancestor of main, creates 1800b with parent a47c3 and moves stable there. stable is no longer an ancestor of main; the histories have diverged and a merge or rebase will be needed to rejoin them.' },
      { title: 'git commit --amend — a sibling commit with the same parent', image: '/diagrams/git/fund-commit-amend.png', content: 'Amend creates 4ca87 with the same parent as ed489 and moves main to it. ed489 still exists but nothing references it any more except the reflog.' },
      { title: 'git checkout HEAD~ files — copy one file from a commit into both the stage and the working directory', image: '/diagrams/git/fund-checkout-files.png', content: 'With a filename, checkout moves nothing. It copies the named files from the given commit, here da985, into the stage and the working directory. The current branch is unchanged.' },
      { title: 'git checkout main~3 — detached HEAD', image: '/diagrams/git/fund-checkout-detached.png', content: 'Checking out something that is not a local branch points HEAD straight at the commit. The stage and working directory are set to match b325c. No branch is involved, so a commit made here will not move any branch.' },
      { title: 'Committing on a detached HEAD, leaving, and rescuing the commit', image: '/diagrams/git/fund-detached-sequence.png', content: 'Left: git commit creates 2eecb with HEAD pointing at it and no branch. Middle: git checkout main re-attaches HEAD and leaves 2eecb referenced by nothing but the reflog. Right: git checkout -b new creates a branch on 2eecb, which keeps it.' },
      { title: 'git reset HEAD~3 — the branch moves; the stage and files follow only as far as the flag allows', image: '/diagrams/git/fund-reset-commit.png', content: 'main moves from ed489 back to b325c. The stage is refreshed from b325c unless --soft was given; the working directory is refreshed only with --hard. The three abandoned commits still exist until garbage collection.' },
      { title: 'git reset with no commit — unstage everything', image: '/diagrams/git/fund-reset-bare.png', content: 'The commit defaults to HEAD, so the branch does not move. The stage is reset to the last commit, and with --hard the working directory is too.' },
      { title: 'git reset -- files — copy from HEAD into the stage only', image: '/diagrams/git/fund-reset-files.png', content: 'With a filename, reset copies those files from HEAD into the stage and touches nothing else. It is the inverse of git add and is always safe for your working directory.' },
      { title: 'The five diff forms as arrows between the trees', image: '/diagrams/git/fund-diff.png', content: 'git diff compares the stage with the working directory; --cached compares HEAD with the stage; git diff HEAD compares HEAD with the working directory; git diff stable compares a named commit with the working directory; two commit names compare the two commits.' },
      { title: 'The three states and the .git directory', image: '/diagrams/git/graph-three-states.png', content: 'Pro Git draws the same model as working tree, staging area and .git directory. Checkout copies out of the project history into the working tree, stage copies into the staging area, commit writes the staging area into history.' },
      { title: 'The lifecycle of one file', image: '/diagrams/git/graph-file-lifecycle.png', content: 'A file is untracked until added, unmodified once committed, modified once edited, staged once added again, and back to unmodified after the next commit. Removing it returns it to untracked.' },
    ],
    quickFire: [
      { q: 'Name the three trees and what each holds.', a: 'The working directory holds the files you edit on disk. The stage, also called the index, holds the proposed next commit file by file. HEAD holds the snapshot of the last commit on the current branch. git add copies working directory to stage; git commit turns the stage into a commit.' },
      { q: 'HEAD has version 2 of a file, the stage has 3, the working directory has 4. What does git checkout -- file leave?', a: 'HEAD 2, stage 3, working directory 3. checkout with a filename and no commit copies from the stage, not from HEAD. People expect 2 and get 3, which is why the walkthrough exists.' },
      { q: 'Same starting state. What does git reset -- file leave?', a: 'HEAD 2, stage 2, working directory 4. reset with a filename copies from HEAD into the stage and never touches the working directory. It is the inverse of git add.' },
      { q: 'Same starting state. What does git commit file -m msg leave?', a: 'HEAD 4, stage 4, working directory 4. git commit with filenames snapshots those files from the working directory, bypassing whatever was staged, and stages them as a side effect. The staged version 3 never reaches any commit.' },
      { q: 'What is the difference between git diff --cached and git diff HEAD?', a: '--cached compares HEAD with the stage: what the next commit will contain. HEAD compares HEAD with the working directory: everything changed since the last commit, staged or not. A change visible in the second but not the first has not been staged.' },
      { q: 'Is git restore --source=HEAD~2 file the same as git checkout HEAD~2 -- file?', a: "No. The old checkout form updates both the stage and the working directory. git restore --source updates the working directory only unless you add --staged --worktree. The two spellings are not equivalent, and treating them as such is a common mistake." },
      { q: 'What does git commit --amend actually do to the object graph?', a: 'It creates a new commit with the same parent as the current one, built from the current stage, and moves the branch to it. The old commit is left unreferenced except by the reflog. Nothing is edited in place, which is why amending a pushed commit is a rewrite.' },
      { q: 'State the file rule when checkout switches branches.', a: 'Files that exist in the new commit are copied in; files that exist in the old commit but not the new one are deleted; files that exist in neither are ignored. The third clause is why untracked files survive a switch, the first is why Git refuses to switch over an uncommitted edit.' },
      { q: 'What are the three steps of git reset, and where does each flag stop?', a: 'Move the branch HEAD points to; make the stage look like that commit; make the working directory look like the stage. --soft stops after step one, --mixed (the default) after step two, --hard after step three. Only --hard can destroy uncommitted work.' },
      { q: 'Checkout versus reset — what moves?', a: 'Checkout moves HEAD to a different branch and leaves every branch pointer where it was. Reset moves the branch HEAD points to and HEAD follows. Both end with the trees matching the target, but reset --hard overwrites uncommitted work without checking, while checkout refuses.' },
      { q: 'Why is file-level reset always safe and file-level checkout not?', a: 'reset <commit> -- file copies into the stage only, so your working-directory edit is untouched. checkout <commit> -- file copies into both the stage and the working directory, overwriting the edit. The Pro Git cheat table marks exactly these two rows differently.' },
      { q: 'How do you squash the last three commits into one without interactive rebase?', a: 'git reset --soft HEAD~3 then git commit. --soft moves the branch back and leaves the stage exactly as it was, still holding the final state, so a single commit writes it on top of the older base.' },
    ],
    references: [
      'https://marklodato.github.io/visual-git-guide/index-en.html',
      'https://git-scm.com/book/en/v2/Git-Tools-Reset-Demystified',
      'https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F',
      'https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository',
      'https://www.atlassian.com/git/tutorials/resetting-checking-out-and-reverting',
      'https://git-scm.com/docs/git-reset',
      'https://git-scm.com/docs/git-restore',
      'https://git-scm.com/docs/git-checkout',
    ],
  },
  // ── F2 ───────────────────────────────────────────────────────────────
  {
    id: 'git-commits-branches-head',
    title: 'Commits, Branches and HEAD — Reading the Commit Graph',
    icon: 'gitBranch',
    color: '#0ea5e9',
    questions: 12,
    description: 'What a commit object really contains, why a branch is a 41-byte file, how HEAD follows a branch and what detaching it means, and the relative-reference syntax (^, ~, ^2, A..B) that lets you name any commit in the graph without a hash. The Pro Git chapter 3 pictures, redrawn.',
    introduction: `## Overview
Everything Git does is a small operation on one data structure: a graph of commits, each pointing at its parents, with a handful of named pointers into it. Branching, merging, rebasing, cherry-picking and resetting are all "add a node" or "move a pointer". Once you can draw the graph, the commands stop being spells and become arithmetic.

This topic builds the picture from the bottom. A commit points at a tree of files and at its parent commits. A branch is a pointer to a commit. HEAD is a pointer to the branch you are on. The revision syntax is a way of walking the graph from any of those pointers. Nothing here is advanced, but every advanced topic assumes it, and interviewers test it directly because it separates people who have used Git from people who understand it.

The figures are Pro Git's, redrawn: the three-blob initial commit, the master and testing branches sharing one history, HEAD moving between them, and the graph diverging after a commit on each.`,
    topics: [
      {
        title: 'What a commit contains, and why Git stores snapshots rather than diffs',
        image: '/diagrams/git/graph-commit-and-tree.png',
        content: `Stage three files and commit them:

    git add README test.rb LICENSE
    git commit -m "Initial commit"

Git writes **five objects**. Three **blobs**, one per file's contents. One **tree**, the directory listing that maps each filename to its blob. One **commit**, holding a pointer to that tree, the author and committer with timestamps, the message, and pointers to any parent commits. The initial commit has no parent; a normal commit has one; a merge commit has two or more.

    git cat-file -p HEAD          # tree <hash>, parent lines, author, committer, message
    git cat-file -p HEAD^{tree}   # 100644 blob <hash> README ...

Run those two commands once. Seeing that a commit is a few lines of text pointing at a tree hash is what makes the rest of the model concrete.

**Snapshots, not differences.** Most older version control systems stored a base file plus a series of patches. Git stores a full snapshot of the tree at every commit: every file is recorded as it was, and a file that did not change is recorded as a pointer to the same blob as before, so unchanged content costs nothing extra. Diffs are computed on demand by comparing two trees. This single decision is why branching is instant (nothing to copy), why checkout of an old version is a lookup rather than a replay of patches, and why the commit hash can serve as an integrity check over everything reachable from it: change any byte in any ancestor and every descendant hash changes.

**Commits point at their parents.** The second figure in the gallery shows three commits in a row. Each holds a pointer to the snapshot it was made from and to the commit that came before it. Following those pointers backwards from any commit reproduces the entire history that led to it, and that walk is what git log prints.

**A small vocabulary that pays for itself.** The hash is the commit's name; the first seven characters are usually enough to be unique, which is why git log --oneline shows them. Author is who wrote the change, committer is who last applied it; they differ after a rebase, a cherry-pick or an applied patch. The tree hash and the parent hashes are what make the commit's own hash change when history is rewritten.`,
      },
      {
        title: 'A branch is a pointer, HEAD is a pointer to a pointer',
        image: '/diagrams/git/graph-branches-head.png',
        content: `**A branch is a lightweight movable pointer to one commit.** After three commits, the master branch points at the third one, f30ab. That is the entire content of the branch: a 41-byte file at .git/refs/heads/master holding the 40-character hash and a newline. master is not special; it is simply the name git init gives the first branch, and many projects now name it main instead.

    git branch testing                 # create a second pointer at the current commit
    git log --oneline --decorate       # f30ab (HEAD -> master, testing) Add feature #32 ...

git branch creates the pointer and does **not** switch to it. After the command, master and testing both point at f30ab, and the picture has two pills over one commit.

**HEAD tells Git which branch you are on.** It is a pointer to a branch, not to a commit, and it is what moves when you switch:

    git checkout testing               # HEAD -> testing
    git switch testing                 # the same, Git 2.23 and later

Nothing in the graph changed. Only HEAD moved from master to testing. Now commit:

    git commit -a -m "Make a change"

The new commit 87ab2 is created with parent f30ab, and **testing moves to it because that is the branch HEAD points at**. master stays on f30ab. Switch back with git checkout master and two things happen: HEAD points at master again, and the working directory is rewound to master's snapshot, because that is what checkout does to the files. Git refuses the switch if it cannot do so without overwriting an uncommitted change.

Commit again on master and the history diverges:

    git commit -a -m "Make other changes"
    git log --oneline --decorate --graph --all
    * c2b9e (HEAD -> master) Make other changes
    | * 87ab2 (testing) Make a change
    |/
    * f30ab Add feature #32
    * 34ac2 Fix bug #1328
    * 98ca9 Initial commit

Two branches, two lines of work, one common ancestor. Because every commit records its parents, Git can find that ancestor by itself when you later ask it to merge, which is the subject of the next topic.

**The commands that manage the pointers.**

    git branch                         # list; * marks the branch HEAD is on
    git branch -v                      # with each branch's last commit
    git branch --merged                # branches already reachable from HEAD: safe to delete
    git branch --no-merged             # branches with work not yet merged: -d refuses, -D forces
    git branch --move old new          # rename
    git checkout -b hotfix             # create and switch in one step
    git switch -c hotfix               # the same, new spelling
    git switch -                       # back to the previous branch
    git branch -f main HEAD~3          # move a branch pointer without checking it out

The last one is the direct expression of "a branch is just a pointer": it relocates main three commits back and touches nothing else. Real Git refuses to do this to the branch that is currently checked out; use reset for that.`,
      },
      {
        title: 'Detached HEAD, relative references, and ranges',
        image: '/diagrams/git/fund-checkout-detached.png',
        content: `**Detached HEAD is HEAD pointing straight at a commit.** Check out anything that is not a local branch, such as a tag, a remote-tracking branch, a raw hash or an expression like main~3, and HEAD stops pointing at a branch and points at the commit itself. It is not an error state; it is how you look at an old version, run a bisect, or inspect what a colleague pushed. The only consequence is that a commit made in this state moves no branch, so once you check out something else it is referenced by nothing but the reflog. If you meant to keep it, git switch -c rescue creates a branch at HEAD before you leave, and git branch rescue <hash> does the same after the fact.

    git switch --detach v1.6.6.1       # look around at a release
    git switch main                    # come back; HEAD re-attaches

**Relative references** let you name commits by walking from a pointer you already know. The full hash is rarely needed; enough leading characters to be unique will do, and Git will tell you if it is ambiguous.

    HEAD^        # the first parent of HEAD
    HEAD^^       # the grandparent (first parent of the first parent)
    HEAD~3       # three first-parents back: the same as HEAD^^^
    HEAD^2       # the SECOND parent, which only a merge commit has
    HEAD~2^2~    # chained: two back, then the second parent, then one back
    main^, v1~1, origin/main~2, abc123^   # any reference works, not only HEAD

The distinction between the two operators is the interview question. **~ with a number walks back that many commits along first parents.** **^ with a number selects which parent of a merge to follow**; ^ alone means ^1. On a merge commit made by git merge feature while on main, ^1 is the commit main was on and ^2 is the tip of feature that was merged in. That is why git revert -m 1 <merge> means "keep the mainline side".

**Ranges** name a set of commits rather than one, and they are the vocabulary of git log, git diff and git rebase.

    main..feature        # reachable from feature but not from main: what my branch adds
    feature..main        # reachable from main but not from feature: what I am missing
    main...feature       # reachable from either but not both: the symmetric difference
    git log --left-right main...feature   # marks each commit with the side it belongs to

Getting the direction right is most of range usage. git log main..feature is "what would this pull request contain"; git log origin/main..main is "what have I not pushed yet".

**Naming a commit by other means.** HEAD@{2} is where HEAD was two moves ago, from the reflog; main@{yesterday} is where main was then; :/fix login is the most recent commit whose message matches; abc123:path/to/file is a file inside a commit, and :path/to/file is that file in the stage. Every command that takes a commit accepts all of these.

**Special references you will meet.** ORIG_HEAD is set by merge, rebase, reset and pull to where HEAD was before the operation, giving a one-step undo. MERGE_HEAD exists only during a merge and names the commit being merged in. FETCH_HEAD is the tip of whatever the last fetch brought down. CHERRY_PICK_HEAD names the commit being picked while a conflicted cherry-pick is in progress.`,
      },
    ],
    visualizations: [
      { title: 'Commits and their parents', image: '/diagrams/git/graph-commits-and-parents.png', content: 'Three commits in a row. Each points at the snapshot it recorded and at the commit before it. Following parent pointers backwards from any commit reproduces its whole history.' },
      { title: 'Snapshots versus deltas', image: '/diagrams/git/graph-snapshots-vs-deltas.png', content: 'Delta-based systems store a base file plus a chain of changes per file. Git stores a full snapshot of the tree at every commit, with unchanged files pointing at the same blob as before, so nothing is duplicated and nothing has to be replayed to check out an old version.' },
      { title: 'HEAD moves, branches diverge', image: '/diagrams/git/graph-divergent-history.png', content: 'Left: a commit on testing moves testing forward while master stays. Middle: git checkout master moves HEAD back and rewinds the working directory. Right: a commit on master creates the fork; f30ab is the common ancestor Git will use for any later merge.' },
      { title: 'Double-dot and triple-dot ranges', image: '/diagrams/git/graph-double-dot.png', content: 'master..experiment is the set of commits reachable from experiment and not from master. master...experiment is everything reachable from exactly one of them. The direction of the two-dot form is the thing to get right.' },
    ],
    quickFire: [
      { q: 'What objects does an initial commit of three files create?', a: 'Five: three blobs holding file contents, one tree mapping filenames to those blobs, and one commit pointing at the tree with author, committer, message and no parent. A later commit adds a parent pointer; a merge commit has two or more.' },
      { q: 'Does Git store diffs?', a: 'No. Every commit points at a full snapshot of the tree, with unchanged files sharing the same blob as before. Diffs are computed on demand by comparing two trees. This is why branching is instant and why a hash covers all reachable history.' },
      { q: 'What is a branch, physically?', a: 'A 41-byte file under .git/refs/heads containing one commit hash and a newline. It contains no commits; the "commits on a branch" are whatever is reachable by walking parents from that hash. Creating one writes a file, which is why it takes no time.' },
      { q: 'What does git branch testing do to HEAD?', a: 'Nothing. It creates a second pointer at the current commit and leaves HEAD on the branch you were on. git checkout testing or git switch testing is what moves HEAD. git checkout -b and git switch -c do both steps.' },
      { q: 'You commit on testing. Which pointers move?', a: 'testing moves to the new commit because HEAD points at testing; HEAD follows it. master stays where it was. If you then commit on master the two branches diverge from their common ancestor, and Git remembers that ancestor through the parent pointers.' },
      { q: 'What happens to the working directory when you switch branches?', a: 'Checkout makes the files match the target snapshot: files in the new commit are copied in, files only in the old commit are deleted, files in neither are left alone. Git refuses to switch if that would overwrite an uncommitted change.' },
      { q: 'What is detached HEAD, and is it a problem?', a: 'HEAD pointing directly at a commit instead of at a branch, which happens when you check out a tag, a remote branch, a hash or main~3. It is the normal way to inspect history. The only risk is committing there and leaving, since no branch moves; git switch -c keeps the work, and the reflog recovers it afterwards.' },
      { q: 'HEAD~2 versus HEAD^2?', a: 'HEAD~2 walks back two commits along first parents. HEAD^2 selects the second parent of HEAD, which only a merge commit has. On a merge made on main, ^1 is the mainline side and ^2 is the branch that was merged in. They chain: HEAD~2^2~ is a valid path.' },
      { q: 'What does git branch -f main HEAD~3 do?', a: 'Relocates the main pointer three commits back without checking anything out or touching the working directory. It is the purest demonstration that a branch is only a pointer. Git refuses it on the currently checked-out branch, where reset is the tool.' },
      { q: 'Difference between main..feature and main...feature?', a: 'Two dots: commits reachable from feature but not main, which is what the branch adds. Three dots: reachable from either but not both. git log main..feature is what a pull request would contain; git log origin/main..main is what you have not pushed.' },
      { q: 'What are ORIG_HEAD, MERGE_HEAD and FETCH_HEAD?', a: 'ORIG_HEAD is where HEAD was before the last merge, rebase, reset or pull, so git reset --hard ORIG_HEAD undoes it. MERGE_HEAD names the commit being merged in during a merge. FETCH_HEAD is the tip of the last fetch, which pull then merges.' },
      { q: 'How do you name a file inside a commit, or inside the stage?', a: 'abc123:path/to/file names the file as it was in that commit; HEAD:path/to/file the committed version; :path/to/file, with a bare leading colon, the staged version. git show and git cat-file -p accept all three, which is how you compare the three trees for one file.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell',
      'https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F',
      'https://git-scm.com/book/en/v2/Git-Tools-Revision-Selection',
      'https://git-scm.com/docs/gitrevisions',
      'https://learngitbranching.js.org/',
      'https://www.atlassian.com/git/tutorials/refs-and-the-reflog',
      'https://git-scm.com/docs/git-branch',
      'https://git-scm.com/docs/git-switch',
    ],
  },
  // ── F3 ───────────────────────────────────────────────────────────────
  {
    id: 'git-merge-rebase-visual',
    title: 'Merge, Fast-Forward and Rebase — Before and After, Drawn',
    icon: 'gitMerge',
    color: '#22c55e',
    questions: 12,
    description: 'The two ways to join diverged histories, shown as commit graphs before and after: the fast-forward that only moves a pointer, the three-way merge that writes a commit with two parents, the rebase that replays commits as copies, rebase --onto, and the golden rule with the picture of what happens when you break it.',
    introduction: `## Overview
Two branches that started from the same commit and each gained work are **diverged**. Git offers exactly two ways to bring them back together, and both are easier to reason about as pictures than as commands.

A **merge** adds one new commit with two parents and leaves every existing commit where it is. A **rebase** copies the commits of one branch onto the tip of the other, producing new commits with new hashes, and abandons the originals. Both end with the same file contents; they differ only in the shape of the history they leave behind, and that difference drives every argument about which to use.

The third case is the one that needs no new commit at all. When the branch you are merging is directly ahead of you, Git simply moves your pointer forward: a **fast-forward**. There is nothing to reconcile, so a fast-forward can never conflict.

This topic walks Pro Git's chapter 3 story with its figures redrawn: an issue branch, an urgent hotfix, a fast-forward, a real merge, then the same divergence resolved by rebase. The last chapter shows the one picture everyone should see before they ever force-push.`,
    topics: [
      {
        title: 'The fast-forward and the three-way merge',
        image: '/diagrams/git/graph-basic-branching.png',
        content: `**The story.** You are on main at commit C2 and start work on issue 53:

    git switch -c iss53          # branch and switch; same as git branch iss53 + git switch iss53
    # edit, then
    git commit -a -m "Create new footer [issue 53]"   # C3 on iss53

A production bug arrives. You switch back to main, which rewinds your working directory to C2, and fix it on its own branch:

    git switch main
    git switch -c hotfix
    git commit -a -m "Fix broken email address"       # C4 on hotfix

**Fast-forward.** Merge the fix into main:

    git switch main
    git merge hotfix
    Updating f42c576..3a0874c
    Fast-forward

C4 is a direct descendant of C2, the commit main is on. There is nothing to combine, so Git moves main forward to C4 and checks that commit out. No merge commit is created, and **a fast-forward can never produce a conflict**. Delete the branch, since main now points at the same commit:

    git branch -d hotfix

Finish the footer on iss53 (C5). The hotfix is not in iss53; a branch only ever contains what is reachable from its tip.

**The three-way merge.** Now merge iss53 into main. main is on C4, iss53 on C5, and neither is an ancestor of the other. Git finds the **merge base**, the most recent common ancestor, which is C2, and compares three snapshots: C2 (the base), C4 (ours), and C5 (theirs). Wherever only one side changed a region relative to the base, that change is taken; where both changed the same region differently, Git stops and writes a conflict. The result is a new snapshot and a **merge commit** C6 with two parents, C4 and C5.

    git switch main
    git merge iss53
    Merge made by the 'ort' strategy.

Older tutorials print recursive here; ort has been the default strategy since Git 2.34 and does the same job with better rename handling.

**Two preconditions worth knowing.** Before merging, the stage must match HEAD: uncommitted staged changes block a merge, while a dirty working directory is tolerated as long as the merge does not touch those files. And if the branch you name is already an ancestor of where you are, Git prints Already up to date and does nothing, which is the trivial case.

**When it conflicts.**

    CONFLICT (content): Merge conflict in index.html
    Automatic merge failed; fix conflicts and then commit the result.

git status lists the file under Unmerged paths. Inside it, the region between the markers shows both versions: HEAD's side first, the other branch's second.

    <<<<<<< HEAD:index.html
    ... your version ...
    =======
    ... their version ...
    >>>>>>> iss53:index.html

Edit the file to what it should be, remove the markers, then git add it, which is how you tell Git the conflict is resolved. git commit finishes the merge; the default message is "Merge branch 'iss53'". git merge --abort at any point restores the pre-merge state. The merge conflicts topic in this category covers the diff3 view, which shows the base as well, and the tools for verifying a resolution.

**Merging in the other direction** is just as common and often forgotten by beginners: from a feature branch, git merge main pulls the latest mainline into your work so your branch stays compatible. It produces the same kind of merge commit, on your branch instead of main.`,
      },
      {
        title: 'Rebase — replay the commits as copies, then fast-forward',
        image: '/diagrams/git/graph-rebase-vs-merge.png',
        content: `Start from the same divergence: master on C3, experiment on C4, common ancestor C2. Merging produces C5 with two parents. Rebasing produces something different:

    git switch experiment
    git rebase master
    Successfully rebased and updated refs/heads/experiment.

**What rebase does, step by step.** It finds the common ancestor of the two branches (C2), computes the change each commit on the current branch introduced since then (only C4 here), rewinds the current branch to the target (master's C3), and applies each saved change in turn as a **new commit**. C4' has the same diff and message as C4 but a different parent and therefore a different hash. experiment now points at C4'. The original C4 is drawn faded in the diagram because nothing references it any more, though it stays in the object store and the reflog until garbage collection.

The snapshot at C4' is identical to the snapshot a merge would have produced at C5. Only the history differs: rebase leaves a straight line, merge leaves a fork and a join. Finish by moving master forward:

    git switch master
    git merge experiment         # fast-forward, because C4' is directly ahead of C3

This rebase-then-fast-forward sequence is the standard way to land a small branch with a linear history, and it is what git pull --rebase does for you against a remote.

**Rebase is a series of cherry-picks.** Each replayed commit is exactly what git cherry-pick does to one commit: take its diff against its parent, apply it here, write a new commit. Understanding that removes most of the mystery, and it explains why a rebase can conflict at any individual step: git rebase --continue after resolving, git rebase --skip to drop that commit, git rebase --abort to return to where you started.

**Two forms worth typing.** git rebase <base> <branch> checks out the branch and rebases it onto the base in one command, so git rebase main feature is git switch feature followed by git rebase main. And the interactive form git rebase -i <base> opens the list of commits about to be replayed and lets you reorder, drop, reword or squash them before Git does the copying. The rewriting-history topic covers it in depth.

**rebase --onto: replay a slice, not the whole branch.** Sometimes you want to move only some commits. Suppose client was branched from server, which was branched from master, and you want the client changes on master without the server ones:

    git rebase --onto master server client

Read it as "take the commits reachable from client but not from server, and replay them onto master". The general form is git rebase --onto <new-base> <old-base> [<branch>]; leave off the branch and it applies to the one you are on. The same command repairs a branch cut from the wrong base (git rebase --onto main develop feature) and trims a branch to its last few commits (git rebase --onto main feature~3 feature). The rebase-onto figures in the gallery show the topic-off-a-topic case from Pro Git in full.

**Why choose one over the other.** Merge records what actually happened, including exactly when upstream was pulled in, at the cost of a busier graph. Rebase tells a cleaner story that reads as if the work had been done in order, at the cost of rewriting commits and losing the record of when integration happened. The house rule most teams settle on: rebase your own unshared work to keep it tidy, merge anything that has been shared. The next chapter is about why that rule exists.`,
      },
      {
        title: 'The golden rule of rebasing, and the picture of breaking it',
        image: '/diagrams/git/graph-perils-of-rebasing.png',
        content: `**Do not rebase commits that exist outside your repository and that people may have based work on.** Everything about rebase safety follows from one fact from the first chapter: a rebase abandons commits and creates similar but different ones. If nobody else has the originals, nothing is lost. If someone does, you have created two versions of the same work, and Git will faithfully try to keep both.

**The scenario, frame by frame.** You clone a server and base some work on it (frame one). A teammate pushes a merge; you fetch it and merge it into your branch, so their commits C4 and C6 are now part of your history (frame two). The teammate then decides their merge was untidy, rebases it away and force-pushes: the server now has C4' where C4 and C6 used to be, while your copy still holds the originals (frame three). If you now fetch and merge again, because that is what a plain pull does, your history gains C4' beside C4 and C6, the same change with the same author, date and message twice, plus an extra merge commit tying them together, and your next push reintroduces the abandoned commits to the server for everyone else to inherit. That duplicate-commit history is what the golden rule prevents, and the picture is worth remembering more than the rule. Frame four is the way out, covered next.

**Git's partial rescue: rebase when you rebase.** If it happens to you, do not merge the rewritten branch. Rebase your work onto it instead:

    git fetch
    git rebase teamone/master        # or: git pull --rebase

Git computes a patch id for each commit, a checksum of the change alone, and skips any local commit whose patch id already exists upstream. It drops merge commits and the commits that were rewritten (C4 matches C4'), and replays only your genuinely new work (C2 and C3) on top. Setting pull.rebase true makes this the default behaviour of git pull.

**Force-pushing is the mechanism of harm.** A rebased branch cannot be pushed normally, because the remote branch is not an ancestor of the new tip. git push --force overwrites the remote regardless, and that is the moment a private rewrite becomes a public one. Use git push --force-with-lease, which refuses if the remote moved since you last fetched, so you cannot silently discard someone else's commit. The one legitimate case for force-pushing is a branch you have already pushed as a backup that nobody has fetched or built on.

**Rebasing across a pull request.** Once you open a pull request the branch is effectively public: reviewers have fetched it and their comments hang off specific commits. Do your interactive cleanup before opening the request, not after, and bring in upstream changes with a merge rather than a rebase while the request is under review. After approval, one safe pattern to get a linear result is to rebase on a temporary branch first:

    git switch feature
    git switch -c integrate-feature
    git rebase -i main               # tidy and update; feature itself is untouched if this goes wrong
    git switch main
    git merge integrate-feature      # fast-forward

**Rebasing onto a teammate's branch is fine.** The rule is about rewriting commits others have, not about which branch you rebase onto. If you and a colleague both commit to feature and you rebase your local commits onto their pushed ones, only your own unpushed commits move; everything before the fork point, including their work, is untouched.

**History as record versus history as story.** One school treats history as a record of what actually happened and never rewrites it. The other treats it as the story of how the project was made and edits it for clarity before publishing. Both are defensible. The practical position most teams hold: rebase local changes before pushing to clean up your work, and never rebase anything you have pushed somewhere. If that is your rule, the perils in the picture cannot happen to you.`,
      },
    ],
    visualizations: [
      { title: 'A three-way merge: base, ours, theirs, and the merge commit', image: '/diagrams/git/graph-three-way-merge.png', content: 'C2 is the merge base, C4 the current branch tip, C5 the branch being merged. Git combines the three snapshots and writes C6 with two parents. No existing commit moves or changes.' },
      { title: 'git merge main from stable — a fast-forward is only a pointer move', image: '/diagrams/git/fund-merge-ff.png', content: 'stable is an ancestor of main, so Git moves stable to main\'s commit and checks it out. No commit is created, which is why a fast-forward cannot conflict.' },
      { title: 'git merge other — the three inputs of a real merge', image: '/diagrams/git/fund-merge-3way.png', content: 'The current commit, the other commit and their common ancestor feed the three-way merge. The result lands in the working directory and the stage first, and only if there are no conflicts does Git write the merge commit with the other commit as a second parent.' },
      { title: 'git rebase main — the originals fade, the copies chain onto main', image: '/diagrams/git/fund-rebase.png', content: 'The commits on topic but not on main are replayed as new commits on top of main. topic moves to the last copy. The old commits stay drawn but are referenced by nothing.' },
      { title: 'git rebase --onto main 169a6 — replay only the commits after 169a6', image: '/diagrams/git/fund-rebase-onto.png', content: 'Only 2c33a is copied onto main, because --onto limits the replay to commits reachable from the current branch but not from 169a6. 169a6 itself stays where it was.' },
      { title: 'Rebasing a topic off a topic: --onto master server client', image: '/diagrams/git/graph-rebase-onto-topic.png', content: 'client was branched from server, which was branched from master. --onto takes only the client commits, replays them on master, and leaves server\'s commits behind. Then master fast-forwards to client, and server is rebased and merged in turn.' },
      { title: 'git cherry-pick 2c33a — one commit copied onto the current branch', image: '/diagrams/git/fund-cherry-pick.png', content: 'A new commit f142b is created on main with the same change and message as 2c33a. The dashed arrow marks the copy relationship, which Git does not record unless you pass -x. Rebase is this operation repeated for every commit on a branch.' },
    ],
    quickFire: [
      { q: 'What is a fast-forward merge, and why can it never conflict?', a: 'When the branch being merged is a direct descendant of the current commit, Git just moves the current branch pointer forward to it and checks it out. No new commit is created and nothing is combined, so there is nothing to conflict. Pro Git\'s hotfix into main is the canonical example.' },
      { q: 'What are the three inputs of a three-way merge?', a: 'The current branch tip (ours), the other branch tip (theirs), and their merge base, the most recent common ancestor, which Git finds by itself from the parent pointers. Regions changed on only one side are taken; regions changed differently on both sides become conflicts.' },
      { q: 'What does a merge commit look like in the graph?', a: 'A single new commit with two parents: the first is the branch you were on, the second is the branch you merged in. Every existing commit stays exactly where it was. That first-parent ordering is why ^1 is the mainline and ^2 is the merged branch.' },
      { q: 'Describe what git rebase master does, mechanically.', a: 'Find the common ancestor, compute the diff each commit on the current branch introduced since it, reset the current branch to master\'s tip, then apply each diff as a new commit. The copies have new hashes; the originals become unreferenced. The final snapshot equals what a merge would have produced.' },
      { q: 'Why does rebase change commit hashes?', a: 'A commit\'s hash covers its parent. Replaying a commit onto a different parent produces a different object even if the diff and message are identical. That is the whole reason rebasing shared history is dangerous: others still hold the old objects.' },
      { q: 'How is rebase related to cherry-pick?', a: 'Rebase is an automated series of cherry-picks: each replayed commit is exactly "take this commit\'s diff, apply it here, write a new commit". Understanding that explains why a rebase can conflict at each step and why --continue, --skip and --abort exist.' },
      { q: 'Explain git rebase --onto master server client.', a: 'Take the commits reachable from client but not from server, and replay them onto master. It moves a slice rather than a whole branch. The same form fixes a branch cut from the wrong base or trims a branch to its last N commits.' },
      { q: 'State the golden rule of rebasing.', a: 'Do not rebase commits that exist outside your repository and that people may have based work on. Rebasing abandons commits and creates similar but different ones; if someone else has the originals, both versions end up in history with an extra merge tying them together.' },
      { q: 'A teammate force-pushed a rebased branch you had merged. What do you do?', a: 'Do not merge again. git fetch then git rebase onto the rewritten branch, or git pull --rebase. Git compares patch ids, skips your commits that were rewritten upstream and drops merge commits, replaying only your genuinely new work. Set pull.rebase true to make this the default.' },
      { q: 'When is it legitimate to force-push a rebased branch?', a: 'When the branch is still effectively private: pushed only as a backup and nobody has fetched or based work on it. Even then use --force-with-lease, which refuses the push if the remote moved since your last fetch, so you cannot discard a commit you have not seen.' },
      { q: 'You have opened a pull request. Should you still rebase the branch?', a: 'No. Once reviewed it is public: reviewers have fetched it and comments hang off specific commits. Do interactive cleanup before opening the request, bring in upstream changes with a merge while it is under review, and if you want a linear result after approval, rebase on a temporary branch and fast-forward main from that.' },
      { q: 'Merge or rebase — how do you decide?', a: 'Merge preserves the true record including when integration happened, at the cost of a busier graph. Rebase gives a linear story at the cost of rewriting commits and losing that record. The working rule: rebase your own unshared work to tidy it, merge anything that has been shared, never rewrite what others have.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging',
      'https://git-scm.com/book/en/v2/Git-Branching-Rebasing',
      'https://www.atlassian.com/git/tutorials/merging-vs-rebasing',
      'https://marklodato.github.io/visual-git-guide/index-en.html#merge',
      'https://marklodato.github.io/visual-git-guide/index-en.html#rebase',
      'https://git-scm.com/docs/git-merge',
      'https://git-scm.com/docs/git-rebase',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegt',
    ],
  },
  // ── F4 ───────────────────────────────────────────────────────────────
  {
    id: 'git-remotes-fetch-pull-push',
    title: 'Remotes — Clone, Fetch, Pull, Push, Tracking Branches and Bare Repositories',
    icon: 'refreshCw',
    color: '#8b5cf6',
    questions: 13,
    description: 'What origin/main really is and why it is never live, the proof that fetch touches nothing local, pull as fetch plus an integration step, why a push gets rejected and the two ways out, tracking branches, refspec syntax, bare repositories as the shape of every server, and the workflows built on top: centralized, forking, hub and spoke.',
    introduction: `## Overview
A clone is a complete repository, not a checkout. It has every commit, every tree and every blob the server had, plus one extra piece of bookkeeping: a set of **remote-tracking branches** that record where the server's branches were the last time you talked to it. Almost everything confusing about remotes is a misunderstanding of those bookmarks.

Three ideas carry the whole topic. **origin is just a name**: the conventional label for the repository you cloned from, stored in .git/config, with no special powers. **origin/main is a local file that only moves when you fetch**: it is not the server, it is your last snapshot of the server. **fetch downloads; pull downloads and integrates**: the first half is always safe, the second half is where the surprises live.

The pictures come from three sources: Pro Git's server-versus-local diagrams with origin/master and teamone/master, Learn Git Branching's o/main trees for fetch, pull and diverged pushes, and Git Immersion's hub-and-spoke labs with a bare repository in the middle.`,
    topics: [
      {
        title: 'Clone, origin, and remote-tracking branches',
        image: '/diagrams/git/remote-clone-and-tracking.png',
        content: `**What clone sets up.** git clone <url> copies every object from the server, names that server origin, creates a remote-tracking branch origin/main pointing at the same commit the server's main is on, and creates a local main at the same place, configured to track origin/main. From this moment there are two things called main in your repository and they can drift apart.

    git remote                      # origin
    git remote -v                   # origin <url> (fetch) / origin <url> (push)
    git remote show origin          # HEAD branch, tracked branches, what pull merges and push targets
    git branch                      # * main            (local branches only)
    git branch -r                   # origin/HEAD -> origin/main, origin/main, origin/greet
    git branch -a                   # both lists

origin/HEAD is a pointer to the remote's default branch, which is what a bare git clone checks out. The remote-tracking branches under remotes/ are **not local branches**: you cannot commit to them, and checking one out puts you in detached HEAD. If the remote has a greet branch and you want to work on it, you create a local branch from it, which the tracking section below covers.

**Remote-tracking branches are bookmarks, not live views.** origin/main is a file at .git/refs/remotes/origin/main holding a hash. Git moves it only during network contact: clone, fetch, pull and push. Between those moments it can be arbitrarily stale. The middle frame of the picture shows the drift: you commit locally so main moves ahead; meanwhile someone pushes to the server, so the server's main moves too; your origin/main still points at the old commit because you have not fetched. Nothing is wrong, but three different commits are now called main by somebody.

**Adding, renaming and removing remotes.** A remote is a bookmark in .git/config with a URL and a fetch refspec. There is nothing special about origin, and you can have as many as you like:

    git remote add teamone https://git.team1.ourcompany.com/project.git
    git fetch teamone               # creates teamone/master, and any other branches it has
    git remote rename teamone t1
    git remote remove t1
    git clone -o booyah <url>       # name the default remote something other than origin

The second frame of the gallery shows what fetching a second remote produces: another set of remote-tracking branches under its own prefix, pointing at whatever that server had.

**Remotes can be local paths.** A URL can be a directory on the same machine, which is the fastest way to learn all of this without a server:

    git clone hello cloned_hello    # clone a directory; origin is ../hello
    git remote add shared ../hello.git

Git Immersion's labs are built entirely on this trick, and the hands-on walkthrough topic reproduces them.

**Learn Git Branching draws origin/main as o/main** because the full name does not fit in a node; the commands still use the word origin.`,
      },
      {
        title: 'Fetch, pull, push, and what to do when the push is rejected',
        image: '/diagrams/git/remote-fetch-vs-pull.png',
        content: `**Fetch does two things and only two things.** It downloads any commits the remote has that you lack, and it moves your remote-tracking branches to where the remote's branches now are. It does not touch your local branches, your stage or your working directory. The proof is worth running once: fetch, then cat a file that changed upstream, and observe it has not changed on disk.

    git fetch                       # all remotes' branches you track; usually just origin
    git fetch origin                # one remote
    git fetch origin main           # one branch
    git fetch --all                 # every remote
    git fetch --prune               # also delete remote-tracking branches the server no longer has
    git log --oneline main..origin/main    # what came down that I do not have yet

After a fetch, origin/main is ahead of main in the left picture. Integrating is a separate, explicit step, and it is an ordinary merge of an ordinary commit:

    git merge origin/main           # or: git rebase origin/main

**Pull is fetch followed by an integration step.** That second half is the whole difference. By default the integration is a merge, which on a diverged branch produces a merge commit like the one in the right picture. With --rebase it replays your local commits on top of the fetched ones instead, giving a straight line. Since Git 2.27 a bare git pull on a diverged branch warns when no preference is configured, and since 2.34 it stops and asks; choose once and move on:

    git config --global pull.rebase true      # pull = fetch + rebase; pair with rebase.autoStash true
    git pull --no-rebase                      # merge this time
    git pull --rebase                         # rebase this time

The equivalence to remember: git pull origin main is git fetch origin main followed by git merge FETCH_HEAD into whatever branch you are on.

**Push uploads and moves the remote branch.** git push origin main sends the commits reachable from your main that the server lacks and moves the server's main to your tip. Your origin/main is updated at the same time, because a successful push is also a moment of contact. The rule the server enforces: **the update must be a fast-forward.** If the server's main has a commit yours does not, the push is rejected:

    ! [rejected]        main -> main (fetch first)
    error: failed to push some refs
    hint: Updates were rejected because the remote contains work that you do not have locally.

This is not an error in your work; it is Git refusing to discard someone else's. The remedy is always the same: integrate the remote's commits first, then push. The two routes lead to two different histories, shown in the diverged-push figure in the gallery:

    git pull --rebase && git push       # your C3 becomes C3' on top of their C2: linear
    git pull && git push                # a merge commit joining C2 and C3: a fork and a join

Rebase is the tidier default for your own unpushed commits; merge is the safe choice when the branch is shared. Never answer a rejected push with --force; that overwrites the commits you were being warned about. When you genuinely must replace a remote branch, git push --force-with-lease refuses if the remote has moved since your last fetch.

**Locked main.** On a team where main is protected, even a fast-forward push is rejected with a message telling you to use a pull request. The fix is the real workflow: put the commits on a branch, push that, open the request, and reset your local main back to origin/main so the next pull does not conflict.

    git branch feature              # keep the commits
    git push -u origin feature
    git reset --hard origin/main    # local main back in step with the server

**Tracking branches make bare push and pull work.** A local branch can be configured with an upstream: the remote branch it pulls from and pushes to. Clone sets this up for main. For anything else, set it at creation or afterwards:

    git switch -c greet origin/greet             # create greet tracking origin/greet
    git checkout --track origin/greet            # the same, older spelling
    git branch --track greet origin/greet        # create without switching
    git branch -u origin/greet                   # set the upstream of the current branch later
    git push -u origin feature                   # push and set upstream in one step
    git branch -vv                               # every branch with its upstream and ahead/behind counts
    git merge @{u}                               # @{u} or @{upstream} names the current upstream

The ahead/behind numbers in git branch -vv are computed from your last fetch; they do not contact the server. git checkout greet with no local greet and exactly one remote greet creates the tracking branch for you.

**push.default** decides what a bare git push does. The modern default simple pushes the current branch to its upstream only if the names match; upstream pushes to the configured upstream regardless of name, which is what Learn Git Branching assumes. Either way, a detached HEAD has no upstream and a bare push fails there.

**Deleting a remote branch.**

    git push origin --delete feature    # or the older git push origin :feature
    git fetch --prune                   # clean up origin/* for branches others deleted`,
      },
      {
        title: 'Refspecs, bare repositories, protocols, and the workflows built on them',
        image: '/diagrams/git/remote-refspec.png',
        content: `**A refspec is the mapping between a ref on one side and a ref on the other.** Every fetch and push uses one, usually the default written into .git/config when the remote was added:

    [remote "origin"]
        url = https://github.com/example/project.git
        fetch = +refs/heads/*:refs/remotes/origin/*

Read it as <source>:<destination> with an optional leading + meaning "allow a non-fast-forward update". This one says: every branch under refs/heads on the remote lands under refs/remotes/origin locally. That is the entire mechanism behind remote-tracking branches, and it explains why origin/main, remotes/origin/main and refs/remotes/origin/main are the same name.

On the command line, an explicit refspec lets you aim at any pair of refs:

    git push origin main:main               # what git push origin main expands to
    git push origin feature:qa/feature      # push a local branch under a different remote name
    git push origin main^:foo               # any expression Git can resolve works as the source
    git push origin :feature                # empty source deletes the remote branch
    git fetch origin main:refs/remotes/origin/mymaster   # fetch into a custom name
    git fetch origin c3:foo                 # fetch straight onto a LOCAL branch (not the checked-out one)
    git fetch origin :bar                   # empty source creates an empty local branch
    git pull origin bar:bugFix              # = git fetch origin bar:bugFix; git merge bugFix

For fetch, source is a place on the remote and destination is local; for push it is the reverse. Fetch never writes to a local non-tracking branch unless you name it explicitly with a colon, and it refuses to write to the branch you have checked out. Multiple fetch lines are allowed, and since Git 2.6 partial globs such as refs/heads/qa*:refs/remotes/origin/qa* narrow what a fetch brings down. A push line in the config (push = refs/heads/main:refs/heads/qa/main) makes a bare git push origin do that mapping by default.

**A bare repository is a .git directory with no working tree.** It is what every server hosts, because a repository that nobody edits in place has no reason to carry checked-out files. By convention its name ends in .git:

    git clone --bare hello hello.git
    ls hello.git                    # HEAD config description hooks info objects packed-refs refs

There is no working directory to cd into and pull in, so a bare repository is fed by push and read by clone or fetch. Git Immersion's hub-and-spoke lab, in the gallery, builds one on a local path, adds it as a remote named shared to two working clones, pushes from one and pulls from the other. That is the shape of every hosted service reduced to three directories.

    cd hello && git remote add shared ../hello.git && git push shared main
    cd ../cloned_hello && git remote add shared ../hello.git && git pull shared main

Bare repositories also enable a well-known trick for tracking dotfiles in your home directory without a .git folder there: git init --bare $HOME/.cfg, then an alias config that runs git with --git-dir=$HOME/.cfg/ --work-tree=$HOME, and config config --local status.showUntrackedFiles no so your whole home directory does not show as untracked.

**Transport protocols.** A remote URL can be a local path, ssh://user@host/path (the usual choice for pushing, authenticated by your SSH key), https://host/path (works through firewalls, authenticated by token or password), or git://host/path (fast, no authentication at all, read-only in sane deployments). git daemon --verbose --export-all --base-path=. serves the current directory over git:// and is the quickest way to share a repository across a room; add --enable=receive-pack only if you understand that anyone who can reach it can push. Under the hood every transfer is a negotiation: for a fetch the client's fetch-pack tells the server's upload-pack which commits it wants and which it already has, and the server builds a packfile containing exactly the difference; for a push, send-pack talks to receive-pack the other way round. The old dumb HTTP protocol, which walked objects one GET at a time, is essentially gone.

**Credentials.** Over HTTPS Git asks for a token on every push unless a credential helper is configured. git config --global credential.helper cache holds it in memory for a while; store writes it to disk in plain text; osxkeychain, wincred and Git Credential Manager use the platform keychain. Over SSH the key does the work and no helper is needed.

**Workflows built on these pieces.** Every collaboration model is a choice about who may push where.

- **Centralized.** One bare repository, one main branch, everyone pushes to it. A rejected push means git pull --rebase then push again, which keeps history linear. The simplest possible model and a fine one for a small team.
- **Feature branch.** The same repository, but work lands through short branches and pull requests, so main is never broken. Most teams live here.
- **Forking.** Every contributor has their own server-side copy. You clone your fork (origin), add the maintainer's repository as a second remote (upstream), do work on a branch, push it to your fork, and open a pull request against upstream. The maintainer never grants push access to anyone; contributions arrive by pull, not push. Keep your main a mirror of upstream/main with git fetch upstream and git merge upstream/main, and rebase feature branches onto it before asking for review. The integration-manager figure in the gallery is Pro Git's drawing of this model.
- **Hub and spoke with a bare repository** is what the first two are physically; the diagram just makes the bare repository visible.

The branching-strategies topic later in this category picks up from here with GitFlow, trunk-based development and release branches.`,
      },
    ],
    visualizations: [
      { title: 'A second remote: teamone/master appears after git fetch teamone', image: '/diagrams/git/remote-second-remote.png', content: 'Adding another server as a remote and fetching creates a separate set of remote-tracking branches under its own prefix. Each records where that server\'s branches were at the last fetch.' },
      { title: 'Diverged history: the rejected push and the two ways out', image: '/diagrams/git/remote-diverged-push.png', content: 'Your C3 is based on C1 but the remote already has C2, so the push is rejected. git pull --rebase replays C3 as C3\' on top of C2 and the push succeeds with a straight line; a plain pull would instead create a merge commit joining C2 and C3.' },
      { title: 'Hub and spoke: a bare repository shared by two working clones', image: '/diagrams/git/remote-bare-hub.png', content: 'hello.git in the middle has no working tree. hello pushes main into it; cloned_hello pulls main out of it. Every hosted Git service is this picture with a network in between.' },
      { title: 'Centralized workflow', image: '/diagrams/git/remote-centralized-workflow.png', content: 'One shared repository that everyone pushes to and pulls from. A push that is not a fast-forward is rejected, so each developer integrates before publishing.' },
      { title: 'Integration-manager (forking) workflow', image: '/diagrams/git/remote-integration-manager.png', content: 'Each developer pushes only to their own public fork. The integration manager pulls from those forks, merges, and pushes to the blessed repository that everyone clones from. No contributor needs write access to it.' },
    ],
    quickFire: [
      { q: 'What exactly is origin/main?', a: 'A remote-tracking branch: a local file under .git/refs/remotes recording where the server\'s main was at your last fetch, pull or push. It is not live, you cannot commit to it, and checking it out gives detached HEAD. Stale origin/main is the source of most remote confusion.' },
      { q: 'Is there anything special about the name origin?', a: 'No. It is the conventional name clone gives the repository you cloned from, stored in .git/config with a URL and a fetch refspec. You can rename it, add more remotes with any names, or clone with -o to call it something else. A remote can even be a local directory path.' },
      { q: 'What does git fetch do, and what does it never do?', a: 'It downloads commits the remote has that you lack and moves your remote-tracking branches to match. It never touches local branches, the stage or the working directory, which is why it is always safe. Fetch then cat a changed file to prove it.' },
      { q: 'Define git pull in terms of other commands.', a: 'git fetch followed by an integration step: a merge by default, a rebase with --rebase or pull.rebase true. git pull origin main is fetch then merge FETCH_HEAD into the checked-out branch. Since Git 2.34 a bare pull on a diverged branch stops and asks you to choose.' },
      { q: 'Why was your push rejected, and what do you do?', a: 'The server\'s branch has a commit yours does not, so the update would not be a fast-forward and Git refuses to discard it. Integrate first: git pull --rebase then push for a linear history, or git pull then push for a merge commit. Never answer with --force.' },
      { q: 'What is a tracking branch and how do you create one?', a: 'A local branch with a configured upstream, so bare git pull and git push know where to go. git switch -c greet origin/greet or git checkout --track origin/greet at creation; git branch -u origin/greet afterwards; git push -u origin feature for a new branch. git branch -vv shows every upstream with ahead/behind counts from the last fetch.' },
      { q: 'What is a refspec?', a: 'The <source>:<destination> mapping every fetch and push uses, with a leading + to allow non-fast-forward updates. The default fetch line +refs/heads/*:refs/remotes/origin/* is what creates remote-tracking branches. On the command line it lets you push main^ to foo, push to a differently named branch, or fetch straight onto a local branch.' },
      { q: 'What does an empty source in a refspec mean?', a: 'For push, git push origin :feature sends nothing to the remote branch, which deletes it; --delete is the clearer spelling. For fetch, git fetch origin :bar creates an empty local branch. Learn Git Branching\'s Source of Nothing level is built on exactly this.' },
      { q: 'What is a bare repository and why do servers use one?', a: 'A repository with no working tree, just the contents of .git, conventionally named with a .git suffix. Nobody edits files in it, so it needs none; it is fed by push and read by fetch and clone. Git Immersion builds one on a local path and shares it between two clones, which is every hosted service in miniature.' },
      { q: 'Name the transport protocols and when each fits.', a: 'A local path for repositories on the same machine; ssh:// for authenticated push with your key; https:// through firewalls with a token, usually with a credential helper; git:// served by git daemon, fast and unauthenticated, so read-only unless you deliberately enable receive-pack. Under all of them a fetch is a want/have negotiation that yields one packfile.' },
      { q: 'You forgot main is protected and committed on it. Fix it.', a: 'git branch feature to keep the commits, git push -u origin feature, open a pull request, then git reset --hard origin/main so local main matches the server and the next pull does not conflict.' },
      { q: 'How does the forking workflow differ from a shared repository?', a: 'Each contributor has a server-side fork and pushes only there; the maintainer\'s repository is a second remote called upstream that nobody but the maintainer pushes to. Contributions arrive as pull requests. Keep main mirroring upstream/main and rebase feature branches onto it before review.' },
      { q: 'How would you track your dotfiles with Git without a .git in your home directory?', a: 'A bare repository elsewhere: git init --bare $HOME/.cfg, an alias that runs git with --git-dir=$HOME/.cfg --work-tree=$HOME, and status.showUntrackedFiles no on it so the rest of the home directory stays quiet. Clone it bare onto a new machine and check out into $HOME.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Branching-Remote-Branches',
      'https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes',
      'https://git-scm.com/book/en/v2/Git-Internals-The-Refspec',
      'https://git-scm.com/book/en/v2/Git-Internals-Transfer-Protocols',
      'https://git-scm.com/book/en/v2/Distributed-Git-Distributed-Workflows',
      'https://learngitbranching.js.org/?locale=en_US',
      'https://gitimmersion.com/lab_46.html',
      'https://www.atlassian.com/git/tutorials/syncing',
      'https://www.atlassian.com/git/tutorials/comparing-workflows',
      'https://www.atlassian.com/git/tutorials/dotfiles',
      'https://git-scm.com/docs/git-fetch',
      'https://git-scm.com/docs/git-push',
    ],
  },
  // ── F5 ───────────────────────────────────────────────────────────────
  {
    id: 'git-hands-on-walkthrough',
    title: 'Hands-On Walkthrough — One Repository, Every Core Command, in Order',
    icon: 'terminal',
    color: '#f59e0b',
    questions: 12,
    description: 'A runnable lab modelled on the 53 Git Immersion labs: one small Python project taken through commit, status, log, tags, the three levels of undo, amend, the .git directory, branches, merge, conflict, rebase versus merge on the same commits, clone, fetch, pull, tracking and a bare hub. Every step names the log you should see next.',
    introduction: `## Overview
Reading about Git builds vocabulary. Typing it builds intuition. This topic is a script: create a scratch directory, type each block, and check that what Git prints matches what the text says it will. It follows the order of Git Immersion, which is unusually well paced, but uses its own sample project and modern spellings (git switch and git restore alongside git checkout and git reset), and it stops to explain the one thing each step is really teaching.

Four chapters, about ninety minutes in total. Chapter one is a single repository on a single branch: the commit loop, history, time travel, every level of undo. Chapter two opens the .git directory and reads the objects by hand. Chapter three branches, merges, hits a conflict, then rewinds and redoes the same integration with rebase so you can compare the two logs side by side. Chapter four clones the repository, pulls changes through fetch and merge, sets up tracking, and shares through a bare repository the way every server does.

One alias makes every history readable and is defined first:

    git config --global alias.hist "log --pretty=format:'%h %ad | %s%d [%an]' --graph --date=short"

%h is the short hash, %ad the author date, %s the subject, %d the branch and tag decorations, %an the author. Every log shape in this topic is git hist output.`,
    topics: [
      {
        title: 'Chapter 1 — commit, status, history, tags and the four levels of undo',
        image: '/diagrams/git/graph-file-lifecycle.png',
        content: `**Setup, once per machine.**

    git config --global user.name "Your Name"
    git config --global user.email "you@example.com"
    git config --global core.autocrlf input      # true on Windows: normalise line endings on commit
    git config --global core.safecrlf true       # refuse a commit that would mangle a mixed-ending file
    git config --global init.defaultBranch main

**Create the repository and make the first commit.**

    mkdir hello && cd hello
    printf 'print("Hello, World")\\n' > hello.py
    git init
    git status                     # Untracked files: hello.py
    git add hello.py
    git status                     # Changes to be committed: new file: hello.py
    git commit -m "First commit"
    git status                     # nothing to commit, working tree clean

git status is the compass for the entire walkthrough. Read it after every step; its hints name the next command.

**Changes, not files.** Edit hello.py to read a name from sys.argv, then:

    git add hello.py               # stage the argv version
    # now edit hello.py AGAIN: add a default name when no argument is given
    git status

hello.py appears twice: once under Changes to be committed, once under Changes not staged for commit. git add did not "add the file"; it recorded the file's contents at that instant. The second edit came later and is not staged. Commit now and only the first edit lands:

    git commit -m "Use argv for the name"
    git status                     # the default-name edit is still unstaged
    git add .
    git commit -m "Add a default name"

Separating staging from committing is what lets you shape each commit. git add -p, which offers each hunk separately, is the same idea at a finer grain. Check the status before git add . so you never sweep in a file by accident.

**History.**

    git log
    git log --pretty=oneline
    git log --pretty=oneline --max-count=2
    git log --pretty=oneline --since='5 minutes ago'
    git log --pretty=oneline --author="Your Name"
    git hist

Expected hist, newest first: three lines, the top one decorated (HEAD -> main).

**Time travel.** Take the hash of the first commit from git hist:

    git switch --detach <first-hash>    # older spelling: git checkout <first-hash>
    cat hello.py                        # the original one-liner
    git switch main                     # back to the tip; older spelling: git checkout main
    cat hello.py

Checking out a commit puts you in detached HEAD; the files match that snapshot; nothing is lost; git switch main returns.

**Tags are names for commits that never move.**

    git tag v1
    git switch --detach v1^             # the parent of v1; v1~1 also works
    git tag v1-beta
    git switch --detach v1 ; git switch --detach v1-beta
    git tag                             # v1  v1-beta
    git hist main --all

Relative references work on any name: v1^ is the commit before the tag, exactly as HEAD^ is the commit before HEAD.

**Undo level one: an edit in the working directory.** Return to main, add a bad comment to hello.py, then:

    git status
    git restore hello.py                # older spelling: git checkout hello.py
    git status                          # clean

**Undo level two: something staged.** Add the bad comment again and stage it:

    git add hello.py
    git status                          # Changes to be committed
    git restore --staged hello.py       # older spelling: git reset HEAD hello.py
    git restore hello.py
    git status

Two steps because there are two trees to clean: unstaging copies HEAD's version into the stage; restoring copies the stage into the working directory.

**Undo level three: a commit that is already shared.** Add the bad comment, stage, commit, then revert:

    git commit -m "Oops, we did not want this"
    git revert HEAD --no-edit
    git hist                            # a new "Revert" commit on top; nothing removed

revert adds a commit that undoes another. It works on any commit, and because it rewrites nothing it is safe on a branch other people have.

**Undo level four: commits that are local only.** Now remove both the oops commit and its revert by moving the branch pointer. First anchor them with a tag so they stay visible while you look:

    git tag oops
    git reset --hard v1
    git hist                            # main is back on v1
    git hist --all                      # the two commits are still there, held by the oops tag
    git tag -d oops
    git hist --all                      # gone from view; garbage collection will remove them later
    git reflog                          # ... and still findable here, for weeks

Nothing is ever lost until garbage collection runs, and the reflog holds unreferenced commits open for ninety days by default. The tag trick is a beginner-friendly safety net; git branch backup before a risky rebase is the same trick with a branch.

**Amend.** Add an author comment, stage and commit it; then add the email, stage it, and fold it into the previous commit:

    git commit -m "Add an author comment"
    # edit: add the email
    git add hello.py
    git commit --amend -m "Add an author and email comment"
    git hist                            # one commit, new hash, old one gone

Amend is reset --soft one commit back followed by a new commit. It creates a new object; the old one becomes unreferenced.

**Move a file, add structure.**

    mkdir lib && git mv hello.py lib
    git status                          # renamed: hello.py -> lib/hello.py
    git commit -m "Move hello.py to lib"
    printf 'run:\\n\\tpython3 lib/hello.py\\n' > Makefile
    git add Makefile && git commit -m "Add a Makefile"

git mv is mv plus git add on the new path plus git rm on the old. Git detects the rename from content, which is why a moved file keeps its history.

**What you should now believe.** Git records the contents of a file at the moment you add it, not the file itself. There is one undo per tree: restore for the working directory, restore --staged for the stage, revert for a shared commit, reset for a local commit. A commit that no longer appears in the log is not deleted until garbage collection, and the reflog remembers it.`,
      },
      {
        title: 'Chapter 2 — inside .git: refs, objects, and following a commit down to a file',
        image: '/diagrams/git/walk-object-graph.png',
        content: `**Look around.**

    ls -C .git
    # COMMIT_EDITMSG  HEAD  ORIG_HEAD  config  description  hooks  index  info  logs  objects  refs

Each entry is a chapter of this whole category. objects is the database. refs holds branches and tags. HEAD says which branch you are on. index is the stage. logs is the reflog. config is the per-repository settings that override your global ones, which you can confirm:

    cat .git/config                     # [core] ... bare = false ...
    ls .git/refs/heads                  # main
    ls .git/refs/tags                   # v1  v1-beta
    cat .git/refs/tags/v1               # a 40-character hash: a tag is a file holding a hash
    cat .git/HEAD                       # ref: refs/heads/main

A branch is a file whose content is a commit hash. HEAD is a file whose content is the name of that file. That is the entire reference mechanism, and it is why creating a branch is instantaneous.

**The object store.**

    ls -C .git/objects                  # two-character directories
    ls -C .git/objects/<one-of-them>    # 38-character filenames

Every object lives at objects/<first two hex chars>/<remaining 38>. The name is the hash of the object's own content, so the same content always gets the same name and is stored once. The files are zlib-compressed; you read them with plumbing, not cat.

**Follow a commit down to a file.** Take the newest hash from git hist --max-count=1:

    git cat-file -t <hash>              # commit
    git cat-file -p <hash>
    # tree 096b74c...
    # parent 22273f2...
    # author You <you@example.com> 1686383357 -0400
    # committer You <you@example.com> 1686383357 -0400
    #
    # Add a Makefile

A commit is five lines of text. Follow the tree:

    git cat-file -p <tree-hash>
    # 100644 blob 28e0e9d...    Makefile
    # 040000 tree e46f374...    lib
    git cat-file -p <lib-tree-hash>
    # 100644 blob c45f26b...    hello.py
    git cat-file -p <blob-hash>         # the contents of hello.py

100644 is an ordinary file, 100755 an executable, 040000 a directory, which is another tree. Blobs hold contents and nothing else, not even the filename; the tree supplies names. That is all there is: blobs, trees and commits, plus tag objects for annotated tags.

**Build a commit by hand.** This is the sequence git add and git commit run for you, and it is a standard interview question:

    echo 'version 1' > test.txt
    git hash-object -w test.txt                     # write a blob, print its hash
    git update-index --add --cacheinfo 100644 <blob-hash> test.txt   # put it in the stage
    git write-tree                                  # turn the stage into a tree object, print its hash
    echo 'Hand-made commit' | git commit-tree <tree-hash> -p HEAD    # write a commit object
    git cat-file -p <new-commit-hash>               # it is a normal commit
    git update-ref refs/heads/main <new-commit-hash>   # move the branch to it, safely
    git hist                                        # the hand-made commit is on main

hash-object writes blobs, write-tree writes a tree from the stage, commit-tree writes a commit pointing at a tree and a parent, update-ref moves a branch. Porcelain commands are these plumbing commands in a convenient order.

**Exercise.** Starting from the newest commit, follow parent pointers and trees until you reach the blob of the very first hello.py, then print it with git cat-file -p. Everything you need is in the two commands above.

**What you should now believe.** A branch is a file holding a hash; HEAD is a file naming a branch. Objects are stored once, by the hash of their content, and a commit is a tree hash, parent hashes, two identities and a message. Nothing about the model is hidden, and git cat-file -p reads all of it.`,
      },
      {
        title: 'Chapter 3 — branch, diverge, merge, conflict, then rewind and rebase',
        image: '/diagrams/git/graph-rebase-vs-merge.png',
        content: `**A feature branch with three commits.**

    git switch -c greet                 # = git branch greet + git switch greet; older: git checkout -b greet
    printf 'class Greeter:\\n    def __init__(self, who):\\n        self.who = who\\n    def greet(self):\\n        return f"Hello, {self.who}"\\n' > lib/greeter.py
    git add lib/greeter.py && git commit -m "Add Greeter class"
    # edit lib/hello.py to import Greeter and print Greeter(name).greet()
    git add lib/hello.py && git commit -m "Hello uses Greeter"
    # edit the Makefile to run with a name argument
    git add Makefile && git commit -m "Update Makefile"
    git hist --all

Switch between the branches and watch the file change under you:

    git switch main ; cat lib/hello.py     # no Greeter
    git switch greet ; cat lib/hello.py    # uses Greeter

**Diverge.** Commit on main while greet has moved on:

    git switch main
    echo "This is the Hello World example." > README
    git add README && git commit -m "Add README"
    git hist --all                      # the first fork in the graph: two lines from one ancestor

**Merge main into the feature branch.** The direction beginners use most, and the one that keeps a long branch compatible with the mainline:

    git switch greet
    git merge main
    git hist --all                      # a merge commit on greet with the |\\ shape

**Create a conflict.** On main, change lib/hello.py to prompt for the name interactively when no argument is given. greet changed the same lines to use Greeter.

    git switch main
    # edit lib/hello.py: prompt with input() when no argument
    git add lib/hello.py && git commit -m "Make hello interactive"
    git switch greet
    git merge main
    # CONFLICT (content): Merge conflict in lib/hello.py
    cat lib/hello.py

Between <<<<<<< HEAD and ======= is greet's version; between ======= and >>>>>>> main is main's. Edit the file so it does both things, prompting when no argument is given and greeting through Greeter, then remove the markers:

    git add lib/hello.py                # add marks the conflict resolved
    git commit -m "Merge main, resolve the greeting conflict"
    git hist --all

**Rewind both branches to before the merges.** This is the part that makes the merge-versus-rebase argument concrete. Find the hash of "Update Makefile" on greet and "Add README" on main, then:

    git switch greet
    git reset --hard <hash of "Update Makefile">
    git switch main
    git reset --hard <hash of "Add README">
    git hist --all                      # back to the plain fork; the merge commits are unreferenced

reset --hard moves a branch pointer anywhere. The merge commits are not deleted; nothing points at them.

**Redo the integration with rebase.** Bring main forward to the interactive change first so the conflict recurs, then rebase greet onto it:

    git switch main
    # re-apply the interactive edit to lib/hello.py
    git add lib/hello.py && git commit -m "Make hello interactive"
    git switch greet
    git rebase main
    # CONFLICT again, in the "Hello uses Greeter" commit: resolve the same way, then
    git add lib/hello.py
    git rebase --continue
    git hist                            # a straight line: main's commits, then the three greet commits with NEW hashes

Compare this log with the merge log you saw a few minutes ago. Same file contents, different history: the rebased greet reads as if it had been written after the README and the interactive change. The three greet commits have new hashes because their parents changed. Git Immersion's own rule fits here: rebase short-lived local branches, merge branches that are public.

**Fast-forward.** greet is now directly ahead of main, so merging it needs no merge commit:

    git switch main
    git merge greet
    # Updating 976950b..5f626c6
    # Fast-forward
    git hist                            # (HEAD -> main, greet) on the same commit

A fast-forward moves the pointer and checks out the commit. There is nothing to reconcile, so there can never be a conflict in a fast-forward merge.

**What you should now believe.** A branch is cheap and switching is a checkout of a snapshot. A merge adds a commit with two parents and preserves both lines. A conflict is two versions between markers that you combine by hand, then git add and commit. A rebase replays your commits onto a new base and gives them new hashes; it produces a line where a merge produces a fork and a join. Rewinding with reset --hard is how you compare the two on identical inputs.`,
      },
      {
        title: 'Chapter 4 — clone, fetch and merge, pull, tracking, and a bare hub',
        image: '/diagrams/git/remote-bare-hub.png',
        content: `**Clone the repository into a sibling directory.**

    cd ..
    git clone hello cloned_hello
    cd cloned_hello
    git hist --all
    # (HEAD -> main, origin/main, origin/greet, origin/HEAD) on the top commit

The clone has every commit. The only new things are the origin/* names: remote-tracking branches recording where the original's branches were at clone time.

    git remote                          # origin
    git remote show origin              # Fetch URL: ../hello ; HEAD branch: main ; main tracked, greet tracked
    git branch                          # * main
    git branch -a                       # remotes/origin/HEAD -> origin/main, remotes/origin/greet, remotes/origin/main

origin is just a name for the directory you cloned from. Remote branches are not local branches; the clone has main, but greet exists only as origin/greet until you create a local one.

**Change the original, then fetch in the clone.**

    cd ../hello
    echo "(changed in original)" >> README
    git add README && git commit -m "Change README in original"
    cd ../cloned_hello
    git fetch
    git hist --all                      # origin/main is one commit ahead of main
    cat README                          # unchanged on disk

fetch brought the commit down and moved origin/main. It changed nothing about your branch or your files; the README proves it.

**Merge what fetch brought.**

    git merge origin/main               # Fast-forward
    cat README                          # now changed

git pull is exactly these two commands: git fetch followed by git merge origin/main (or a rebase, if pull.rebase is set).

    git pull                            # nothing to do now; try it after the next change to the original

**A local branch that tracks a remote one.**

    git switch -c greet origin/greet    # older spelling: git branch --track greet origin/greet
    git branch -a                       # greet, main, and the three remotes
    git hist --max-count=2              # (origin/greet, greet) on the same commit

The tracking link is what lets a bare git pull or git push on greet know which remote branch it means.

**A bare repository to share through.** Servers do not have working directories; they hold the .git directory alone. Make one and use it as a hub:

    cd ..
    git clone --bare hello hello.git
    ls hello.git                        # HEAD config description hooks info objects packed-refs refs

Nothing to edit, nowhere to cd in and pull. So repositories push into it:

    cd hello
    git remote add shared ../hello.git
    echo "(changed in the original and pushed to shared)" >> README
    git add README && git commit -m "Add a shared comment to README"
    git push shared main                # To ../hello.git   main -> main

And other repositories pull out of it:

    cd ../cloned_hello
    git remote add shared ../hello.git
    git pull shared main
    cat README

Git Immersion's version of this lab includes a line git branch --track shared main, which creates a local branch called shared tracking your own main; it is a mistake on the site and is left out here. git pull shared main works without it because it names the remote and the branch explicitly.

**Serve it over the network, optionally.**

    cd ..
    git daemon --verbose --export-all --base-path=.          # terminal 1: serves git://localhost/hello.git
    git clone git://localhost/hello.git network_hello        # terminal 2

git daemon has no authentication; add --enable=receive-pack only on a network you trust, because anyone who can reach it could push.

**What you should now believe.** A clone is a full repository. origin is a name, not a special place. origin/main is your last snapshot of the server and moves only when you fetch, pull or push. fetch is safe because it changes no local branch; pull is fetch plus a merge or rebase. A bare repository is the .git directory alone, and sharing through one is push in, fetch out, which is what every hosted service does.`,
      },
    ],
    quickFire: [
      { q: 'A file shows under both Changes to be committed and Changes not staged. How?', a: 'git add recorded the file\'s contents at that instant; a later edit is not part of that snapshot. Git stages content, not files. Commit now and only the staged version lands; git add again to include the second edit.' },
      { q: 'What does the hist alias show, and what is %d?', a: 'log --pretty=format:\'%h %ad | %s%d [%an]\' --graph --date=short: short hash, author date, subject, decorations and author, drawn as a graph. %d is the decoration: the branches and tags pointing at that commit, which is how you see where main, origin/main and v1 are.' },
      { q: 'Four levels of undo — name the command for each.', a: 'An edit in the working directory: git restore file (old: checkout file). Something staged: git restore --staged file (old: reset HEAD file). A commit that others may have: git revert. A commit that is only local: git reset --hard to an earlier point, after anchoring with a tag or branch if you want a way back.' },
      { q: 'You reset --hard to v1 and the oops commits vanished from the log. Are they gone?', a: 'No. Nothing is deleted until garbage collection. A tag placed on them beforehand keeps them visible in hist --all; without one, git reflog still lists them for ninety days by default, and git branch rescue <hash> makes them reachable again.' },
      { q: 'What does git commit --amend do in terms of reset?', a: 'It is git reset --soft HEAD~ followed by a new commit from the current stage: the branch moves back one, the stage keeps everything, and a new commit with a new hash replaces the old one, which becomes unreferenced.' },
      { q: 'What are the files in .git that matter, and what does each hold?', a: 'objects is the content-addressed database; refs/heads and refs/tags are files holding one hash each; HEAD holds the name of the current branch (or a hash when detached); index is the stage; logs is the reflog; config overrides your global settings for this repository.' },
      { q: 'Follow a commit to a file by hand.', a: 'git cat-file -p <commit> prints a tree hash; git cat-file -p <tree> lists mode, type, hash and name per entry, with 040000 tree for subdirectories; recurse into the subtree; git cat-file -p <blob> prints the file contents. Blobs have no names; trees supply them.' },
      { q: 'Which plumbing commands does git add and git commit run?', a: 'hash-object -w writes a blob; update-index --add --cacheinfo puts it in the stage; write-tree turns the stage into a tree object; commit-tree writes a commit pointing at the tree and a parent; update-ref moves the branch to the new commit.' },
      { q: 'Why merge main into a feature branch rather than the other way round?', a: 'To keep a long-lived branch compatible with the mainline as it moves, finding conflicts early in small pieces. The merge commit lands on the feature branch, not main. Beginners do this most, and it produces the busier graph that motivates rebase.' },
      { q: 'What did the rewind-and-redo show about merge versus rebase?', a: 'Identical inputs and identical final files, different histories. The merge left fork-and-join merge commits; the rebase replayed the three greet commits onto the new main with new hashes and left a straight line, after which main fast-forwarded with no merge commit at all.' },
      { q: 'How do you prove git fetch changes nothing local?', a: 'Change a file in the original, fetch in the clone, then cat the file: it is unchanged, while git hist --all shows origin/main one commit ahead of main. git merge origin/main is what changes the file, and pull is those two steps together.' },
      { q: 'How do two working repositories share changes without a server?', a: 'Through a bare repository: git clone --bare hello hello.git, then in each working repository git remote add shared ../hello.git. One pushes with git push shared main; the other pulls with git pull shared main. Add git daemon to serve it over git:// if you want a network in between.' },
    ],
    references: [
      'https://gitimmersion.com/',
      'https://gitimmersion.com/lab_09.html',
      'https://gitimmersion.com/lab_17.html',
      'https://gitimmersion.com/lab_23.html',
      'https://gitimmersion.com/lab_34.html',
      'https://gitimmersion.com/lab_48.html',
      'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects',
      'https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things',
      'https://git-scm.com/docs/git-daemon',
    ],
  },
  // ── 1 ────────────────────────────────────────────────────────────────
  {
    id: 'git-branching-strategies',
    title: 'Branching Strategies — Trunk-Based, GitFlow, and the Cost of a Long-Lived Branch',
    icon: 'gitBranch',
    color: '#f97316',
    questions: 10,
    description: 'Choosing a branching model is choosing how much merge debt you are willing to carry. Trunk-based development, GitHub Flow, GitLab Flow, GitFlow and release branches compared on the one axis that predicts pain: how long a branch lives before it is integrated.',
    introduction: `## Overview
Branching arguments are usually framed as taste. They are not. Every branching model is a bet about **integration frequency**, and the cost of the bet is measurable.

The mechanism is divergence. Two branches that both change the same codebase drift apart at a rate set by how fast the team commits. The work required to reconcile them grows faster than linearly with that divergence, because conflicts interact — resolving one can create another, and a semantic conflict (two changes that merge cleanly but are wrong together) is invisible to the merge algorithm entirely. **A branch that lives one day carries a day of divergence. A branch that lives six weeks carries six weeks of it, and nobody has been testing the combination in the meantime.**

This is why the DORA research repeatedly finds trunk-based development predictive of delivery performance: the specific practices it measured were branches living less than a day and fewer than three active branches in the repository. The finding is not that short branches are virtuous; it is that long branches hide integration risk until the worst possible moment.

The models below differ mainly in how many long-lived branches they mandate and what those branches are for.`,
    topics: [
      {
        title: 'The four models, and the situation each one is actually for',
        image: '/diagrams/git/topic-gitflow.png',
        content: `**Trunk-based development.** Everyone commits to one branch, main. Work either lands directly or through a short-lived branch measured in hours. Anything unfinished is hidden behind a feature flag or built as dark code that nothing calls yet, so main is always releasable even when features are not finished. This decouples deploy from release, which is the property that makes the model work at all — without flags, trunk-based development degrades into either broken mains or long branches wearing a different name.

The cost is real and worth stating: you need a fast, trustworthy test suite, feature-flag hygiene including a process for removing dead flags, and the cultural willingness to review small increments rather than finished features. Teams that adopt the branching rule without those three usually revert within a quarter.

**GitHub Flow.** One long-lived branch (main), plus a short-lived branch per change, merged through a pull request and deployed on merge. It is trunk-based development with the pull request made mandatory as the review and CI gate. This is the right default for most web services and for anything continuously deployed from a single production version.

**GitLab Flow.** GitHub Flow with explicit environment branches — main flows to a staging branch, then to production — or with release branches for versioned software. It exists to answer the question GitHub Flow ignores: what is deployed right now, and how do I promote a known-good commit rather than whatever landed last? Where GitOps is in use, the environment branch is often replaced by an environment directory in a config repo, which is the same idea with better auditability.

**GitFlow** (Vincent Driessen, 2010). Two permanent branches, main and develop, plus feature, release and hotfix branches. It was designed for software with **multiple versions live in the field simultaneously** — desktop applications, firmware, on-premise products where customers sit on 3.2 while you develop 4.0. In that setting it is correct and hard to replace.

For a continuously deployed web service it is a poor fit, and Driessen himself later added a note to the original post saying so. The costs are that develop and main diverge continuously, that every change is integrated twice, and that release branches are exactly the long-lived divergence the model is supposed to manage. **The question that settles it: do you support more than one production version at once? If not, the second permanent branch is pure overhead.**

**Release branches without GitFlow.** A common and sensible middle position: trunk-based day to day, but cut a release branch at the moment you ship, and cherry-pick only fixes onto it. The branch is short-lived by policy, exists to stabilise one release, and is deleted after. This is roughly how the Linux kernel, Chromium and Kubernetes operate, and it scales to very large contributor counts.`,
      },
      {
        title: 'Long-lived branches — the failure modes and the ways out',
        content: `Divergence causes four distinct problems, and they need different remedies.

**Textual conflicts** are the visible ones: two branches edited the same lines. These are annoying but tractable, and they scale with how much code both branches touched.

**Semantic conflicts** are the dangerous ones. Branch A renames a function's contract; branch B adds a caller using the old contract. Both merge cleanly. Nothing conflicts. The build breaks, or worse, it does not and the behaviour is wrong. **No merge algorithm can detect this, which is the fundamental argument for integrating often** — only running the combined code finds it, and the only way to run the combined code is to combine it.

**Rebase-versus-merge** is downstream of this and much less important than the arguments suggest. Merge preserves the true history and creates a merge commit; rebase produces a linear history by replaying commits onto a new base, at the cost of rewriting commit hashes. A workable house rule: rebase your own unpushed work to keep it tidy, merge shared branches, and never rebase a branch that someone else has based work on. The golden rule of rewriting is that you may rewrite history nobody else has.

**Drift in review.** A long branch accumulates review debt too — a 3,000-line pull request gets a worse review than six 500-line ones, because reviewer defect detection falls off sharply with size. This is a quality cost, not just a merge cost.

Practical mitigations, in order of leverage:

- **Feature flags** to decouple merge from release, so the branch does not need to live until the feature is finished.
- **Branch by abstraction** for large refactors: introduce an abstraction layer on trunk, migrate callers incrementally behind it, then delete the old path. This turns a six-week branch into thirty small merges.
- **Expand and contract** (also called parallel change) for anything with a contract — schema, API, config. Add the new form, support both, migrate readers and writers, remove the old form. Each step is independently shippable and independently revertible.
- **Rebase the long branch daily** if it must exist, so conflicts are found in daily-sized pieces rather than all at once at the end.
- **Merge upstream into the branch frequently** if it is shared and rebasing is unsafe. The direction differs; the point is the same.`,
      },
      {
        title: 'The two workflows this topic skipped, and the git-flow commands',
        content: `Atlassian's workflow comparison names two models that the four above assume rather than describe.

**Centralized workflow.** One bare repository, one branch, no feature branches at all. Every developer clones it, commits locally, and publishes with git push origin main. Because the central history is treated as immutable, a push that is not a fast-forward is rejected, and the developer runs git pull --rebase origin main to replay their commits on top of whatever landed first, then pushes again. Conflicts pause the rebase one commit at a time; git rebase --continue after each fix, or git rebase --abort to back out. It is the model of Subversion carried over into Git, it works for a small team, and its limit is exactly the bottleneck that motivates feature branches: everyone rebasing before every push does not scale.

**Feature branch workflow** is the centralized model plus a branch per change and a pull request as the gate, which is GitHub Flow under another name. **Forking workflow** changes who may push where: every contributor has a server-side fork and pushes only there; the maintainer's repository is a second remote called upstream that only the maintainer writes to, and contributions arrive as pull requests from forks. It is the model of nearly every open-source project and of any organisation that wants review without granting write access. The remotes topic in this category covers the two-remote setup and the fetch upstream, merge upstream/main routine that keeps a fork current.

**The git-flow extension.** GitFlow is often run through a helper that wraps the branch choreography in commands. git flow init asks for the production branch (main), the integration branch (develop) and the prefixes feature/, release/, hotfix/, support/ and a version tag prefix. Then:

    git flow feature start payments     # git switch develop && git switch -c feature/payments
    git flow feature finish payments    # merge feature/payments into develop, delete it
    git flow release start 1.4.0        # branch release/1.4.0 from develop; only fixes land here
    git flow release finish 1.4.0       # merge into main, tag 1.4.0, merge back into develop, delete
    git flow hotfix start 1.4.1         # branch hotfix/1.4.1 from main
    git flow hotfix finish 1.4.1        # merge into main, tag, merge into develop, delete

Each command is four or five plain Git commands, which is worth knowing because the wrapper hides the merge directions that make GitFlow expensive: a release or hotfix is merged twice, into main and back into develop, and that double integration is the cost the chapter above describes. Atlassian's own page now files GitFlow under legacy, with trunk-based development as the recommended default for continuous delivery.`,
      },
    ],
    quickFire: [
      { q: 'What does trunk-based development actually require?', a: 'Branches that live under a day, few active branches, and feature flags or dark code so unfinished work can merge without being released. Without the flags it degrades into broken mains or long branches under another name. It also needs a fast trustworthy test suite and reviewers willing to review increments rather than finished features.' },
      { q: 'Why does DORA associate trunk-based development with performance?', a: 'The measured practices were branches living less than a day and fewer than three active branches. The causal story is integration risk: long branches hide it until merge time, and semantic conflicts only surface when the combined code actually runs.' },
      { q: 'When is GitFlow the right choice?', a: 'When multiple versions are live in the field at once — desktop apps, firmware, on-premise products where customers sit on 3.2 while you build 4.0. There the hotfix and release branches earn their keep. For a single continuously deployed production version the second permanent branch is pure overhead, as Driessen himself later noted.' },
      { q: 'What is a semantic conflict?', a: 'Two changes that merge cleanly but are wrong together — one renames a contract, the other adds a caller using the old one. No merge algorithm can detect it because nothing textually conflicts. Only running the combined code finds it, which is the fundamental argument for integrating frequently.' },
      { q: 'Rebase or merge?', a: 'Rebase your own unpushed work to keep it tidy; merge shared branches; never rebase a branch someone else has based work on. Rebase gives linear history at the cost of rewriting hashes, merge preserves true history. The golden rule: you may rewrite only history nobody else has.' },
      { q: 'How do you land a six-week refactor without a six-week branch?', a: 'Branch by abstraction — introduce an abstraction on trunk, migrate callers incrementally behind it, delete the old path. Thirty small merges instead of one enormous one. For anything with a contract, use expand and contract: add the new form, support both, migrate, remove the old.' },
      { q: 'What is GitLab Flow for?', a: 'It answers what GitHub Flow ignores: what is deployed right now, and how do I promote a known-good commit rather than whatever landed last. Environment branches (main to staging to production) or release branches for versioned software. Under GitOps the environment branch is usually replaced by an environment directory in a config repo — same idea, better audit trail.' },
      { q: 'How do very large projects branch?', a: 'Trunk-based day to day, with a release branch cut at ship time that receives only cherry-picked fixes and is deleted after. Linux, Chromium and Kubernetes work roughly this way, and it scales to very large contributor counts because the branch is short-lived by policy.' },
      { q: 'Why is a 3,000-line pull request worse than six 500-line ones?', a: 'Reviewer defect detection falls off sharply with size, so the large PR gets a worse review as well as a harder merge. Divergence costs quality, not just time.' },
      { q: 'If a long-lived branch is unavoidable, what do you do?', a: 'Reduce the batch of conflict rather than the conflict itself: rebase it daily (or merge upstream into it daily if it is shared) so conflicts arrive in daily-sized pieces instead of all at once, and keep it releasable so it can be abandoned cheaply.' },
    ],
    references: [
      'https://trunkbaseddevelopment.com/',
      'https://nvie.com/posts/a-successful-git-branching-model/',
      'https://docs.github.com/en/get-started/using-github/github-flow',
      'https://martinfowler.com/articles/branching-patterns.html',
      'https://dora.dev/capabilities/trunk-based-development/',
      'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
      'https://www.atlassian.com/git/tutorials/comparing-workflows',
      'https://martinfowler.com/bliki/BranchByAbstraction.html',
      'https://martinfowler.com/bliki/ParallelChange.html',
    ],
  },

  // ── 2 ────────────────────────────────────────────────────────────────
  {
    id: 'git-stacked-prs',
    title: 'Stacked Pull Requests and PR Dependencies',
    icon: 'gitPullRequest',
    color: '#8b5cf6',
    questions: 10,
    description: 'How to ship a change that depends on another change that has not merged yet — without waiting, and without opening a 2,000-line pull request. Stacking, restacking after review, the tooling, and the failure modes.',
    introduction: `## Overview
Two forces pull in opposite directions. Small pull requests get better reviews and merge faster. But real work arrives in dependent chunks: the refactor that enables the feature, the API change the client needs, the migration before the query.

The usual responses are both bad. Waiting for PR 1 to merge before opening PR 2 serialises your own work behind someone else's review latency. Bundling everything into one PR produces the 2,000-line change that nobody reviews properly.

**Stacking is the third option: open PR 2 against PR 1's branch rather than against main.** Each PR stays small and independently reviewable, the diff shown for PR 2 contains only its own changes, and the stack merges bottom-up as reviews complete. Meta, Google and several large open-source projects work almost exclusively this way, which is why the workflow is often called stacked diffs — the Phabricator and Critique lineage rather than the GitHub one.

The cost is that Git has no native concept of a stack, so keeping one coherent after review feedback is manual unless you adopt tooling.`,
    topics: [
      {
        title: 'Building a stack, and the restack problem that defines the workflow',
        content: `The construction is straightforward. Branch feature-1 from main and open a PR targeting main. Branch feature-2 from feature-1 and open a PR **targeting feature-1**. Branch feature-3 from feature-2, and so on. Because each PR's base is its parent, the diff each reviewer sees contains only that increment.

The hard part is what happens next, and it is worth understanding precisely because it is the interview question. Suppose a reviewer asks for a change in PR 1. You amend the commit on feature-1. That rewrites the commit, giving it a new hash. feature-2 was branched from the **old** commit, which now has no descendant relationship to the new one, so feature-2's base has effectively vanished. Every branch above it in the stack is now stale.

Fixing that is called **restacking**: rebase feature-2 onto the new feature-1, then feature-3 onto the new feature-2, all the way up. Done by hand this is a sequence of rebases where a mistake in the middle silently duplicates or drops commits. Two Git features make it survivable:

- **git rebase --update-refs** (Git 2.38+) rebases a branch and moves the other branch pointers that lie within the rebased range at the same time — a one-command restack for simple stacks. Set rebase.updateRefs=true to make it the default.
- **git rerere** ("reuse recorded resolution") records how you resolved a conflict and replays it automatically the next time the same conflict appears. Since restacking replays the same conflicts repeatedly, enabling rerere.enabled=true removes most of the repetition. This is the single highest-value config change for anyone stacking by hand.

The other constant hazard is force-pushing. Restacking rewrites branches, so pushing requires force. **Always use --force-with-lease rather than --force**: it refuses the push if the remote moved since you last fetched, which is what stops you silently destroying a colleague's commit or a suggestion committed from the review UI. Better still is --force-with-lease with an explicit expected ref.

When merging, merge bottom-up: PR 1 into main, then retarget PR 2 to main (most platforms do this automatically when the base branch merges), and continue. Squash-merging each PR is common and keeps main linear, but be aware it rewrites the commit that the branch above expects, so a restack usually follows each merge.`,
      },
      {
        title: 'Tooling, alternatives, and when stacking is the wrong answer',
        content: `Plain Git plus --update-refs and rerere is workable for stacks of two or three. Beyond that, tooling pays for itself:

- **Graphite** — hosted, GitHub-native; tracks the stack, restacks on demand, and can merge the whole stack.
- **git-town** — open source; adds commands such as sync, append and ship that understand parent-child branch relationships.
- **spr** and **ghstack** — map local commits one-to-one onto GitHub PRs, closest to the Phabricator model, popular in Rust and PyTorch circles.
- **Gerrit** — a different model entirely, worth knowing because the comparison is illuminating. Gerrit reviews *commits* rather than branches, with a Change-Id trailer identifying a logical change across revisions. Dependencies between changes are first-class, so stacking is the default rather than a workaround. Used by Android, Chromium and Go.
- **GitLab merge trains** and **GitHub merge queue** solve the adjacent problem of serialising merges safely, covered in the merge-at-scale topic.

Alternatives worth considering before reaching for a stack. **Feature flags** often remove the dependency entirely — if PR 2 can merge behind a disabled flag, it does not need PR 1 to land first. **Expand and contract** does the same for contract changes. And if the chunks are genuinely independent, they should simply be separate PRs against main, not a stack; stacking independent work adds sequencing cost for nothing.

Where stacking goes wrong:

- **Stacks that grow too deep.** Beyond four or five, the restack cost after any feedback exceeds the review benefit. Keep stacks shallow and merge the bottom promptly.
- **Reviewers who cannot see the whole picture.** Each PR is small, which is the point, but the reviewer may not understand why. Write the stack's overall intent in every PR description, with a link to the others.
- **CI cost.** Each PR in a stack runs CI, and every restack re-runs all of them. On an expensive suite this multiplies quickly; some teams run only the full suite on the bottom PR and a fast subset above it.
- **The bottom PR stalls.** The entire stack is blocked behind one review. This is the real risk, and it is organisational rather than technical: stacking makes review latency the binding constraint, so it only works in a culture with a genuine review SLA.`,
      },
    ],
    quickFire: [
      { q: 'What is a stacked pull request?', a: 'A PR opened against another unmerged PR\'s branch rather than against main. Each PR stays small and independently reviewable, the reviewer sees only that increment, and the stack merges bottom-up. It is the standard workflow at Meta and Google, inherited from Phabricator and Critique rather than GitHub.' },
      { q: 'What problem does stacking solve?', a: 'Dependent work. Waiting for PR 1 to merge serialises your work behind someone else\'s review latency; bundling everything gives a 2,000-line PR nobody reviews properly. Stacking gets small reviewable units without the wait.' },
      { q: 'What is restacking and why is it needed?', a: 'Amending a commit in a lower PR rewrites it into a new hash, so every branch above was forked from a commit that no longer has a descendant relationship — the stack is stale. Restacking rebases each branch onto its new parent, bottom-up.' },
      { q: 'What is git rebase --update-refs?', a: 'Git 2.38+ — rebases a branch and simultaneously moves the other branch pointers inside the rebased range, giving a one-command restack for simple stacks. Set rebase.updateRefs=true to make it default.' },
      { q: 'What is git rerere and why does it matter for stacks?', a: 'Reuse recorded resolution: it records how you resolved a conflict and replays it automatically when the same conflict reappears. Restacking replays the same conflicts repeatedly, so rerere.enabled=true is the single highest-value config change for anyone stacking by hand.' },
      { q: 'Why --force-with-lease instead of --force?', a: 'It refuses the push if the remote moved since your last fetch, so you cannot silently destroy a colleague\'s commit or a suggestion committed from the review UI. Restacking requires force-pushing constantly, which makes this the difference between a safe workflow and an occasional data-loss incident.' },
      { q: 'How does Gerrit differ, and why is that interesting?', a: 'Gerrit reviews commits rather than branches, with a Change-Id trailer identifying a logical change across revisions, so dependencies between changes are first-class and stacking is the default rather than a workaround. Android, Chromium and Go use it. It shows that stacking is awkward in GitHub because of the branch-based review model, not because the idea is hard.' },
      { q: 'When should you not stack?', a: 'When the chunks are genuinely independent — then they are just separate PRs against main, and stacking adds sequencing cost for nothing. When a feature flag or expand-and-contract removes the dependency outright. And beyond about four or five deep, where restack cost after feedback exceeds the review benefit.' },
      { q: 'What is the real risk of stacking?', a: 'The bottom PR stalls and blocks the whole stack. That is organisational, not technical — stacking makes review latency the binding constraint, so it only works where there is a genuine review SLA.' },
      { q: 'What happens to CI cost with stacks?', a: 'Every PR in the stack runs CI and every restack re-runs all of them, so cost multiplies with depth and churn. A common mitigation is the full suite on the bottom PR and a fast subset above it, with the full suite gating the merge.' },
    ],
    references: [
      'https://git-scm.com/docs/git-rerere',
      'https://git-scm.com/docs/git-rebase#Documentation/git-rebase.txt---update-refs',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-with-leaseltrefnamegt',
      'https://www.gerritcodereview.com/',
      'https://graphite.dev/docs',
      'https://www.git-town.com/',
      'https://github.com/ezyang/ghstack',
    ],
  },

  // ── 3 ────────────────────────────────────────────────────────────────
  {
    id: 'git-merge-at-scale',
    title: 'Merging at Scale — Merge Queues, Semantic Conflicts, and N Developers on One Branch',
    icon: 'gitMerge',
    color: '#0ea5e9',
    questions: 11,
    description: 'What breaks when forty developers merge into one branch, why a green PR can still break main, and how merge queues, batching and bisect-on-failure keep an always-green trunk without serialising everyone behind a single build.',
    introduction: `## Overview
There is a specific bug that every large repository hits, and it has a name worth knowing: the **semantic merge conflict**, or more usefully, the fact that **CI passing on your branch does not mean CI will pass after your branch merges.**

The mechanism is simple. You branch from main at commit X and CI goes green. While you were working, someone else merged commit Y. Your PR still shows green — it was tested against X — but main is now X+Y, and nobody has ever tested X+Y+yours. If Y renamed something your change calls, main breaks the moment you merge, and it breaks for everybody.

The probability of this is not small. It rises with the number of developers, the merge rate and the size of changes, and it becomes near-certain at a few dozen active contributors. A broken main is expensive out of proportion to the bug: it blocks every other merge, every deploy, and every developer who pulls.

The naive fix — require every PR to be up to date with main before merging — works and is what "require branches to be up to date" does on GitHub. It also serialises the entire team: each merge invalidates every other open PR, which must then rebase and re-run CI. At scale this collapses throughput to one merge per CI cycle.

Merge queues exist to get the safety without the serialisation.`,
    topics: [
      {
        title: 'How a merge queue works, and why batching is the whole trick',
        content: `A merge queue takes approved PRs and, instead of merging them immediately, tests each one **as it would be after merging** — against the current tip plus everything ahead of it in the queue. Only if that speculative combination passes does it actually merge. Main therefore only ever receives commits that have been tested in their true final state.

Done one at a time this is correct but slow: throughput is capped at one merge per full CI run. The optimisation that makes queues practical is **speculative batching**. The queue takes the next N PRs, builds the combined result, and if it passes, merges all N at once — one CI run for N merges.

The interesting case is failure. If the batch of five fails, at least one PR is bad but the queue does not know which. Two strategies:

- **Bisect the batch.** Split it in half, test both halves, recurse. This finds the culprit in about log2(N) additional runs and is what Bors and Zuul-style systems do. It is the same idea as git bisect applied to a queue.
- **Speculate optimistically.** Test several possible futures in parallel — the batch as-is, and the batch minus the most suspicious PR — trading compute for latency. Zuul pioneered this with its concept of testing changes in dependent pipelines ahead of merge.

Either way, the offending PR is ejected, its author is told, and the rest of the batch proceeds. This is why batch size is a tuning parameter: large batches maximise throughput when the failure rate is low, and small batches minimise wasted work when it is high. A queue with a high ejection rate should shrink its batches.

The implementations worth knowing: **GitHub merge queue** (native, batches and speculative checks), **GitLab merge trains** (the same idea, with trains that rebuild on failure), **Bors-NG** (the Rust project's, bisect-on-failure), **Zuul** (OpenStack's, cross-repository dependent pipelines — the most sophisticated of the lot), and **Aviator** or **Mergify** as hosted options.`,
      },
      {
        title: 'Everything else that breaks with many developers, and what to do about it',
        content: `**Conflicts on shared generated files.** Lockfiles, generated clients, snapshot files and changelogs conflict on nearly every concurrent PR because everyone touches the same lines. Three remedies, in order of preference: stop committing the artefact if it can be generated deterministically in CI; use a **merge driver** (a custom entry in .gitattributes) that knows how to combine the format — the union driver works for append-only files such as changelogs; or move to a format that does not collide, such as one file per entry with a fragment directory, which is what changelog tools like towncrier do.

**Repeated identical conflicts.** Enable rerere.enabled=true globally. On a busy shared branch the same conflict reappears constantly, and rerere resolves it silently after the first time.

**A merge that went wrong.** Reverting a merge commit needs -m to say which parent is the mainline: git revert -m 1 <merge-sha> keeps the first parent, which is the branch you merged into. The subtlety that bites people: reverting a merge undoes the *code* but not the *merge relationship*, so re-merging that branch later brings nothing back — Git still believes it is merged. The fix is to revert the revert before re-merging.

**Losing the shape of history.** With many merges, git log becomes unreadable. git log --first-parent follows only the mainline, showing one entry per merged PR rather than every constituent commit — this is the view you want for release notes and for bisecting, and it is why keeping merge commits (rather than squashing everything) has real operational value.

**Ownership at scale.** A CODEOWNERS file routes review automatically by path, which stops the single-senior-reviewer bottleneck. Combine it with a review SLA; automated routing without a response commitment just relocates the queue.

**Repository size and clone time.** Covered properly under monorepo scale, but the headline for CI is: use partial clone (--filter=blob:none) rather than shallow clone (--depth=1) when history is needed, since shallow clones break bisect and blame outright.

**The organisational failure mode.** All of this machinery assumes a green main is a shared priority. If a broken main is normal, the queue will simply be bypassed under deadline pressure. The health metric to watch is not merge throughput but **time-to-green** — how long main stays broken when it breaks. If that number is measured in hours, the tooling is not the problem.`,
      },
    ],
    quickFire: [
      { q: 'Why can a green PR still break main?', a: 'Because it was tested against the commit it branched from, not against the current main. If someone merged in between, the combination of both changes has never been tested. That is a semantic merge conflict, and it becomes near-certain at a few dozen active contributors.' },
      { q: 'What does a merge queue do?', a: 'It tests each approved PR as it would be after merging — against the current tip plus everything ahead of it in the queue — and merges only if that speculative combination passes. Main therefore only receives commits tested in their true final state.' },
      { q: 'Why not just require every PR to be up to date with main?', a: 'It is correct but serialises the team: every merge invalidates every other open PR, which must rebase and re-run CI. Throughput collapses to one merge per CI cycle. Merge queues get the same safety without the serialisation.' },
      { q: 'What is speculative batching?', a: 'Testing the next N queued PRs as one combined result and merging all N if it passes — one CI run for N merges. Batch size is a tuning parameter: large batches win when the failure rate is low, small batches waste less when it is high.' },
      { q: 'A batch of five fails. How do you find the bad PR?', a: 'Bisect the batch — split, test both halves, recurse — finding the culprit in about log2(N) extra runs, which is what Bors does. Or speculate optimistically, testing several possible futures in parallel and trading compute for latency, which is Zuul\'s approach. Then eject the offender and let the rest proceed.' },
      { q: 'Name the merge queue implementations.', a: 'GitHub merge queue, GitLab merge trains, Bors-NG (Rust, bisect-on-failure), Zuul (OpenStack, cross-repository dependent pipelines and the most sophisticated), and hosted options such as Aviator and Mergify.' },
      { q: 'How do you stop lockfiles conflicting on every PR?', a: 'Best: do not commit the artefact if CI can regenerate it deterministically. Next: a custom merge driver via .gitattributes — the union driver handles append-only files like changelogs. Next: change format so entries do not collide, such as a fragment directory with one file per entry.' },
      { q: 'How do you revert a merge commit?', a: 'git revert -m 1 <merge-sha>, where -m 1 names the mainline parent (the branch you merged into). The trap: this undoes the code but not the merge relationship, so re-merging that branch later brings nothing back — Git still thinks it is merged. Revert the revert before re-merging.' },
      { q: 'What is git log --first-parent for?', a: 'Following only the mainline, so you see one entry per merged PR instead of every constituent commit. It is the right view for release notes and for bisecting a merge-heavy history, and it is a concrete reason to keep merge commits rather than squashing everything.' },
      { q: 'What does CODEOWNERS solve, and what does it not?', a: 'It routes review automatically by path, removing the single-senior-reviewer bottleneck. It does not create a response commitment — automated routing without a review SLA just relocates the queue.' },
      { q: 'What is the right health metric for trunk stability?', a: 'Time-to-green — how long main stays broken when it breaks — not merge throughput. If that is measured in hours, no queue will help, because the queue will be bypassed under deadline pressure.' },
    ],
    references: [
      'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue',
      'https://docs.gitlab.com/ee/ci/pipelines/merge_trains.html',
      'https://zuul-ci.org/docs/zuul/latest/gating.html',
      'https://github.com/bors-ng/bors-ng',
      'https://git-scm.com/docs/gitattributes#_defining_a_custom_merge_driver',
      'https://git-scm.com/docs/git-revert',
      'https://github.blog/2022-12-08-experiment-the-hidden-costs-of-waiting-on-slow-build-times/',
    ],
  },

  // ── 4 ────────────────────────────────────────────────────────────────
  {
    id: 'git-bisect-forensics',
    title: 'Finding the Commit That Broke It — Bisect, Pickaxe, and History Forensics',
    icon: 'search',
    color: '#ef4444',
    questions: 12,
    description: 'A test that passed three weeks ago fails today and 400 commits sit in between. How to find the exact commit in about nine steps with git bisect run, how to handle flaky tests and unbuildable commits, and the pickaxe and blame techniques for when bisect is the wrong tool.',
    introduction: `## Overview
The situation: something worked at some point in the past and is broken now, and the range of suspects is large. Reading 400 commits is not a plan. Binary search is.

**git bisect** performs binary search over commit history. Given one known-good commit and one known-bad commit, it checks out the midpoint and asks you to classify it; each answer halves the remaining range. Over 400 commits that is about nine tests instead of 400 — log2(400) is a little under nine. Over 10,000 commits it is fourteen.

The single most valuable thing to know about it is that **the classification can be a script.** git bisect run turns the whole thing into one non-interactive command that finds the offending commit while you do something else, and that is what separates people who use bisect occasionally from people who reach for it first.

Bisect answers "which commit changed the behaviour". It is the wrong tool for "when did this line get written" or "which commit touched this string", and the second half of this topic covers those.`,
    topics: [
      {
        title: 'git bisect run — the automated form, and the cases that complicate it',
        content: `The manual loop is: start the search, mark the endpoints, and classify each commit Git checks out until it reports the first bad one.

    git bisect start
    git bisect bad                 # current commit is broken
    git bisect good v2.14.0        # this tag was fine
    # Git checks out the midpoint; test it, then:
    git bisect good                # or: git bisect bad
    # ... repeat until Git prints the first bad commit
    git bisect reset               # return to where you started

The automated form replaces every classification with a script's exit status. **Exit 0 means good, exit 1 to 124 means bad, and exit 125 means skip — untestable.** Exit 128 or above aborts the bisect.

    git bisect start HEAD v2.14.0  # bad first, then good
    git bisect run ./scripts/check.sh

The check script is where the skill is. A robust one builds first and returns 125 if the build fails, so commits that cannot be compiled are skipped rather than misclassified as bad:

    #!/usr/bin/env bash
    make build || exit 125          # untestable, not bad
    ./run-one-test --name flaky_repro || exit 1
    exit 0

For a test-suite regression, git bisect run is often just the test command, since most test runners already exit non-zero on failure. Two refinements matter in practice. Narrow the test to the single failing case — bisect will run it up to fourteen times, so a five-minute full suite becomes an hour, while a five-second targeted test finishes before you have made coffee. And make sure the script is not itself part of the bisected history, or you will be running a different version of it at every step; keep it outside the repo or copy it to a temporary path first.

**Complications and their handling:**

- **Flaky tests.** Binary search assumes a reliable oracle. A flaky test will send bisect down the wrong half and confidently report an innocent commit. Fix the flakiness first if you can; otherwise make the script run the test several times and only report bad on consistent failure, which trades runtime for correctness.
- **Untestable commits.** git bisect skip, or exit 125 in a run script. Git will pick a nearby commit instead. If a whole region is unbuildable, Git may end up reporting a range rather than a single commit — that is honest output, not a failure.
- **Merge-heavy history.** By default bisect descends into the individual commits of merged branches, many of which were never independently tested. git bisect --first-parent (Git 2.29+) restricts the search to the mainline, so it identifies the merge — that is, the PR — that introduced the problem. For finding which PR broke main, this is almost always what you want, and it is much faster.
- **Inverted searches.** The good and bad terms can be renamed with git bisect start --term-old=slow --term-new=fast, which makes bisecting a performance regression or a fix read sensibly.
- **Resuming.** git bisect log writes the session out; git bisect replay reads it back. Useful when you realise you misclassified a step — replay the log up to the mistake instead of starting over.`,
      },
      {
        title: 'When bisect is the wrong tool — pickaxe, line log, and blame forensics',
        content: `Bisect finds the commit that changed a **behaviour**. Different questions want different tools.

**"Which commit added or removed this string?"** — the pickaxe. git log -S'<string>' finds commits where the *number of occurrences* of the string changed, which is the precise question you want when hunting where a config key, a feature flag or a magic constant came from. Its relative git log -G'<regex>' matches commits whose diff text matches a pattern, including moves that -S would consider a no-op. Add --pickaxe-all to show the whole commit rather than only the matching file.

    git log -S'MAX_RETRY_COUNT' --oneline -- src/

**"How did this function evolve?"** — line log. git log -L follows a range of lines through history, including across renames, and prints the diff at each change:

    git log -L :parseConfig:src/config.go       # follow a function by name
    git log -L 40,60:src/config.go              # follow a line range

This is often faster than bisect for a small, localised regression, because it shows you the actual sequence of edits to the code in question.

**"Who last touched this line, and why?"** — blame, with two essential refinements. Large reformat commits (a Prettier or gofmt sweep) destroy blame by attributing every line to the reformatter. The fix is to record those commits in a file and teach Git to look past them:

    git blame --ignore-rev <sha> src/app.js
    # or permanently:
    echo <sha> >> .git-blame-ignore-revs
    git config blame.ignoreRevsFile .git-blame-ignore-revs

GitHub and GitLab both honour .git-blame-ignore-revs, so the web UI improves too. The second refinement is git blame -C -M, which detects lines that were *moved or copied* from another file and blames the original author rather than the person who moved the code.

**"The commit exists but I cannot find the branch"** — reflog. git reflog records every movement of HEAD locally, including commits orphaned by a reset, rebase or amend, and it is how you recover work that appears lost. It is local and expires (90 days by default for reachable entries, 30 for unreachable), so it rescues your own mistakes, not a colleague's. For objects with no reflog entry at all, git fsck --lost-found lists dangling commits.

**Putting it together — a realistic workflow.** A test that passed in the last release fails today. Start with git bisect --first-parent and a run script narrowed to that one test, to find the offending PR in a handful of runs. Then, inside that PR's diff, use git log -L or -S to identify the specific hunk. Then git blame -C on that hunk to find the author and the original context. Bisect narrows to the change; the pickaxe and blame explain it.

One preventative note: all of this depends on history being useful. Squashing every PR into a single commit makes bisect coarse but keeps main clean, which is a reasonable trade. Rewriting or dropping history is not — and shallow clones (--depth=1) in CI break bisect and blame entirely, which is why partial clone (--filter=blob:none) is the better CI optimisation when history matters.`,
      },
    ],
    quickFire: [
      { q: 'How many steps does bisect need over 400 commits?', a: 'About nine — log2(400) is just under nine. Over 10,000 commits it is fourteen. That is the whole argument for using it rather than reading the log.' },
      { q: 'What are the exit codes for git bisect run?', a: '0 means good, 1 to 124 means bad, 125 means skip (untestable — for example the commit does not build), and 128 or above aborts the bisect. Returning 125 on build failure is what stops unbuildable commits being misclassified as bad.' },
      { q: 'Write a bisect run script for a regression.', a: 'A build guard then a narrow test: "make build || exit 125" to skip untestable commits, then the single failing test, exiting 1 on failure and 0 on success. Narrow the test to one case — bisect may run it fourteen times, so a five-minute suite becomes an hour.' },
      { q: 'Why must the bisect script live outside the repository?', a: 'Because bisect checks out historical commits, so a script inside the repo changes underneath you at every step and you end up testing with different versions of your own oracle. Keep it outside, or copy it to a temporary path first.' },
      { q: 'What does a flaky test do to bisect?', a: 'It breaks the assumption of a reliable oracle. One wrong answer sends the search down the wrong half and bisect will confidently name an innocent commit. Fix the flake, or have the script run the test several times and report bad only on consistent failure.' },
      { q: 'What is git bisect --first-parent for?', a: 'Restricting the search to mainline commits so it identifies the merge — that is, the PR — that introduced the problem, rather than descending into individual branch commits that were never independently tested. For "which PR broke main" it is almost always what you want, and it is much faster.' },
      { q: 'How do you bisect something that is not a pass/fail bug?', a: 'Rename the terms: git bisect start --term-old=slow --term-new=fast. That makes bisecting a performance regression, or finding where a bug was fixed rather than introduced, read correctly.' },
      { q: 'You misclassified a step halfway through a long bisect. What now?', a: 'git bisect log writes the session out and git bisect replay reads it back — edit the log to remove the bad classification and replay, rather than starting over.' },
      { q: 'Which commit introduced this string?', a: 'The pickaxe: git log -S\'STRING\' finds commits where the number of occurrences changed. git log -G\'regex\' matches diff text instead, catching moves that -S treats as a no-op. Add --pickaxe-all to see the whole commit.' },
      { q: 'How do you follow one function through history?', a: 'git log -L :funcName:path/file.go, or a line range with git log -L 40,60:path/file.go. It follows across renames and prints the diff at each change, which is often faster than bisect for a small localised regression.' },
      { q: 'A formatting sweep destroyed git blame. Fix it.', a: 'Record the sweep commits in .git-blame-ignore-revs and set blame.ignoreRevsFile to it, or pass --ignore-rev for a one-off. GitHub and GitLab both honour that file, so the web UI improves too. Also use git blame -C -M so moved or copied lines blame the original author.' },
      { q: 'Why is a shallow clone a bad CI optimisation?', a: 'Because --depth=1 breaks bisect and blame outright — the history they need is not there. Use partial clone, --filter=blob:none, which keeps the full commit graph and fetches blobs on demand.' },
    ],
    references: [
      'https://git-scm.com/docs/git-bisect',
      'https://git-scm.com/docs/git-log#Documentation/git-log.txt--Sltstringgt',
      'https://git-scm.com/docs/git-log#Documentation/git-log.txt--Lltstartgtltendgtltfilegt',
      'https://git-scm.com/docs/git-blame#Documentation/git-blame.txt---ignore-revltrevgt',
      'https://git-scm.com/docs/git-reflog',
      'https://docs.github.com/en/repositories/working-with-files/using-files/viewing-and-understanding-files#ignore-commits-in-the-blame-view',
      'https://git-scm.com/docs/partial-clone',
    ],
  },

  // ── 5 ────────────────────────────────────────────────────────────────
  {
    id: 'git-history-rewriting',
    title: 'Rewriting History Safely — Interactive Rebase, Force-Push, and Purging Secrets',
    icon: 'edit',
    color: '#f59e0b',
    questions: 10,
    description: 'Interactive rebase, autosquash and fixup commits, the difference between reset modes, why --force-with-lease is not optional, and the full procedure for removing a leaked credential from history — including the part everyone forgets.',
    introduction: `## Overview
Git history is append-only in the sense that commits are immutable — a commit's hash is a checksum over its content, its metadata and its parent, so changing anything produces a *different commit*. Rewriting history therefore never edits a commit; it creates new ones and moves a branch pointer to them, leaving the originals unreferenced.

That has two consequences that explain almost every rewriting rule. First, rewriting is safe locally, because the old commits linger in the reflog and can be recovered. Second, it is dangerous once shared, because everyone else's branch still points at commits your branch has abandoned, and their next merge will try to reconcile two versions of the same work.

The **golden rule** follows directly: rewrite freely any history that exists only on your machine; never rewrite history that others have based work on. Everything below is an application of that rule.`,
    topics: [
      {
        title: 'Interactive rebase, autosquash, and the three resets',
        image: '/diagrams/git/fund-reset-modes.png',
        content: `**Interactive rebase** replays a range of commits, letting you reorder, edit, combine or drop them. git rebase -i HEAD~5 opens a todo list where each line names an action:

- **pick** — keep the commit as is.
- **reword** — keep the change, edit the message.
- **edit** — stop at this commit so you can amend it or split it.
- **squash** — combine into the previous commit, opening an editor to merge the messages.
- **fixup** — the same, but discard this commit's message.
- **drop** — remove the commit entirely.
- **exec** — run a shell command at this point, which is useful for running tests at each step: git rebase -i --exec 'make test' HEAD~10 verifies that every commit in the range builds.

**Autosquash** is the ergonomic version and is underused. When you notice a problem in an earlier commit, commit the fix with git commit --fixup=<sha> (or --squash=<sha>). That creates a commit whose message marks it as belonging to the target. Then git rebase -i --autosquash HEAD~N pre-arranges the todo list so each fixup sits directly under its target with the right action already set. Set rebase.autoSquash=true to make it the default. This turns "clean up my branch before review" from careful manual reordering into two commands.

**Splitting a commit** is the one operation people find fiddly: mark it edit, and when the rebase stops, run git reset HEAD~ to unstage its changes while keeping them in the working tree, then commit them in pieces (git add -p is the tool for selecting hunks), and finish with git rebase --continue.

**The three resets** are worth being able to state exactly, because it is a standard interview question:

| Mode | Moves HEAD | Resets index | Resets working tree |
| --- | --- | --- | --- |
| --soft | yes | no | no |
| --mixed (default) | yes | yes | no |
| --hard | yes | yes | yes |

So --soft leaves everything staged (useful for recombining several commits into one), --mixed leaves changes present but unstaged, and --hard discards them. Only --hard loses work — and even then, committed work is recoverable from the reflog.

Related and often confused: **git revert** creates a *new* commit that undoes an earlier one, which is the correct tool for shared history because it rewrites nothing. **git restore** (Git 2.23+) discards working-tree or index changes, and **git switch** changes branches — these two exist specifically to split the overloaded git checkout into comprehensible halves.

**Force-pushing.** After any rewrite, the remote must be updated with force. Use --force-with-lease, which refuses the push if the remote moved since your last fetch. Plain --force will silently discard a colleague's commit, or a suggestion someone committed from the review UI. Note one sharp edge: --force-with-lease compares against your remote-tracking ref, so running git fetch immediately before the push updates that ref and defeats the protection. The stricter form --force-with-lease=<ref>:<expected-sha> states explicitly what you expect the remote to be, and --force-if-includes (Git 2.30+) adds a check that your local branch actually incorporates what the remote had.`,
      },
      {
        title: 'Purging a secret from history — the whole procedure',
        content: `A credential is committed and pushed. Rewriting history to remove it is necessary but **it is the second step, not the first**, and the ordering is what most answers get wrong.

**1. Rotate the credential immediately.** Assume it is compromised the moment it reaches a remote. Public repositories are scraped continuously — measured exposure times for keys pushed to public GitHub are seconds to minutes, not hours. Rewriting history without rotating is theatre: forks, clones, CI caches, and GitHub's own unreferenced-commit views may still hold it, and anyone who already fetched has it regardless.

**2. Rewrite the history.** The maintained tool is **git-filter-repo**, which replaced the built-in git filter-branch — filter-branch is officially discouraged for being slow and full of foot-guns, and Git's own documentation now points at filter-repo instead. For a file:

    git filter-repo --path path/to/secrets.env --invert-paths

For a string, replacing every occurrence throughout history:

    echo 'AKIAIOSFODNN7EXAMPLE==>REDACTED' > replacements.txt
    git filter-repo --replace-text replacements.txt

**BFG Repo-Cleaner** is a faster alternative for the common cases of deleting files or replacing text. Note that filter-repo deliberately removes the origin remote after rewriting, to force you to think before pushing.

**3. Force-push all rewritten refs**, including every branch and tag: git push --force --all and git push --force --tags. Every rewritten ref matters; a secret left on one stale release tag is still leaked.

**4. Deal with the copies you do not control.** Every collaborator must re-clone or hard-reset — a normal pull will merge the old history back in and reintroduce the secret. Forks are separate repositories and keep their own copy; on GitHub, contacting support to garbage-collect unreferenced commits is required because old commits stay reachable by SHA through the web UI even after a force-push. Also purge CI caches, build artefacts, container images and log output that may embed the value.

**5. Prevent recurrence.** Push protection and secret scanning at the forge (GitHub secret scanning with push protection, GitLab secret detection), a pre-commit hook using gitleaks or trufflehog, and a .gitignore that covers the file patterns that carry credentials. Prevention is dramatically cheaper than this procedure.

One related technique worth knowing: **git replace** can graft a modified commit over an existing one without rewriting, which lets you present a different history locally while leaving the real objects intact. It is a niche tool, but it is the honest answer to "can you change history without rewriting it".`,
      },
    ],
    visualizations: [
      { title: 'git commit --amend creates a sibling, it does not edit', image: '/diagrams/git/fund-commit-amend.png', content: 'The amended commit 4ca87 has the same parent as the original ed489. main moves to it; ed489 is left referenced only by the reflog. Every rewrite in this topic is this picture repeated.' },
      { title: 'What breaking the golden rule looks like', image: '/diagrams/git/graph-perils-of-rebasing.png', content: 'A teammate rebases away commits you had already merged and force-pushes. Your next pull merges the rewritten twins in beside the originals, and pushing sends the abandoned commits back to the server. Rebase onto the rewritten branch instead of merging it.' },
    ],
    quickFire: [
      { q: 'Why does rewriting history change commit hashes?', a: 'Because a hash is a checksum over the commit\'s content, metadata and parent. Change any of those and you get a different commit. Rewriting never edits a commit — it creates new ones and moves the branch pointer, orphaning the originals.' },
      { q: 'State the golden rule of rewriting.', a: 'Rewrite freely any history that exists only on your machine; never rewrite history others have based work on. It follows from the hash property: their branches still point at the commits yours abandoned.' },
      { q: 'What is autosquash and why should it be on by default?', a: 'Commit fixes with git commit --fixup=<sha>, then git rebase -i --autosquash pre-arranges the todo list so each fixup sits under its target with the right action set. Set rebase.autoSquash=true. It turns branch clean-up from manual reordering into two commands.' },
      { q: 'Difference between soft, mixed and hard reset?', a: 'All three move HEAD. --soft stops there, leaving everything staged. --mixed (the default) also resets the index, so changes are present but unstaged. --hard also resets the working tree, discarding changes. Only --hard loses work, and committed work is still recoverable from the reflog.' },
      { q: 'How do you split one commit into two?', a: 'Mark it edit in an interactive rebase; when it stops, git reset HEAD~ to unstage the changes while keeping them in the working tree, commit them in pieces using git add -p to select hunks, then git rebase --continue.' },
      { q: 'How do you run tests on every commit in a range?', a: 'git rebase -i --exec \'make test\' HEAD~10 — the exec action runs after each commit is applied, so you find which commit in the range stopped building.' },
      { q: 'Why is --force-with-lease not always enough?', a: 'It compares against your remote-tracking ref, so a git fetch immediately before pushing updates that ref and defeats the check. Use --force-with-lease=<ref>:<expected-sha> to state what you expect explicitly, or --force-if-includes (2.30+) to assert your branch incorporates what the remote had.' },
      { q: 'A secret was pushed. What is the first step?', a: 'Rotate the credential. Assume compromise the moment it reaches a remote — public repos are scraped in seconds. Rewriting first is theatre: forks, clones, CI caches and unreferenced-commit views may still hold it, and anyone who already fetched has it anyway.' },
      { q: 'Which tool removes a secret from history, and why not filter-branch?', a: 'git-filter-repo — with --path --invert-paths for a file, or --replace-text for a string. filter-branch is officially discouraged as slow and full of foot-guns, and Git\'s own docs now point at filter-repo. BFG Repo-Cleaner is a faster alternative for the simple cases.' },
      { q: 'After rewriting to remove a secret, what do people forget?', a: 'Force-pushing all branches AND tags; telling collaborators to re-clone or hard-reset rather than pull, since a pull merges the old history back; forks, which are separate repositories with their own copy; asking the forge to garbage-collect unreferenced commits, because old commits stay reachable by SHA in the web UI; and purging CI caches, images and logs that embed the value.' },
    ],
    references: [
      'https://git-scm.com/docs/git-rebase',
      'https://git-scm.com/docs/git-commit#Documentation/git-commit.txt---fixupamendrewordltcommitgt',
      'https://git-scm.com/docs/git-reset',
      'https://github.com/newren/git-filter-repo',
      'https://rtyley.github.io/bfg-repo-cleaner/',
      'https://docs.github.com/en/code-security/secret-scanning/push-protection-for-repositories-and-organizations',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt---force-if-includes',
    ],
  },

  // ── 6 ────────────────────────────────────────────────────────────────
  {
    id: 'git-monorepo-scale',
    title: 'Git at Repository Scale — Partial Clone, Sparse Checkout, and Monorepo Mechanics',
    icon: 'database',
    color: '#14b8a6',
    questions: 10,
    description: 'Why a large repository gets slow, and the mechanisms that fix it: partial clone versus shallow clone, sparse checkout and sparse index, commit-graph and FSMonitor, LFS, and the submodule versus subtree versus monorepo decision.',
    introduction: `## Overview
Git was designed for the Linux kernel — large history, moderate file count, text. Repositories that break it usually break it in one of three distinct ways, and the fixes are different, so the first job is identifying which one you have.

**Too much history.** Millions of commits make graph traversal — log, blame, and the revision walking behind almost everything — slow.

**Too many files.** A working tree with hundreds of thousands of paths makes git status slow, because it must stat every one of them.

**Too much content.** Large binaries make clone and fetch slow, and because every version is stored forever, one 200 MB asset committed fifty times is 10 GB in every clone, permanently.

The modern answers are all forms of *not downloading or materialising what you do not need*, and they compose: partial clone for content, sparse checkout for files, commit-graph for history.`,
    topics: [
      {
        title: 'Partial clone, sparse checkout, and making status fast',
        content: `**Partial clone** omits object content at clone time and fetches it on demand:

    git clone --filter=blob:none <url>      # skip all file contents
    git clone --filter=tree:0 <url>         # skip trees too — most aggressive

With blob:none you get the full commit graph and all history metadata, but a file's content is downloaded only when something actually needs it. Crucially, log, bisect and blame all still work; they simply fetch as they go.

**This is the key distinction against shallow clone.** git clone --depth=1 truncates history itself, which makes clones small but breaks bisect, blame and any merge-base computation — and it makes later deepening expensive. For CI where you only ever build the current commit, --depth=1 is fine. For anything that inspects history, --filter=blob:none is the correct optimisation, and it is what tools like the GitHub CLI and most modern CI templates now default to.

**Sparse checkout** limits which paths are materialised in the working tree:

    git sparse-checkout init --cone
    git sparse-checkout set services/payments libs/common

Cone mode restricts patterns to whole directories, which is less expressive than the original pattern mode but allows a much faster implementation. Combined with a partial clone, a developer on a 20 GB monorepo gets a working tree containing only their service.

The **sparse index** (Git 2.32+, enabled with index.sparse=true) extends this to the index itself: directories outside the sparse cone are stored as a single entry rather than one per file, which is what makes git status fast on a repository with a million paths. Without it, sparse checkout shrinks the working tree but the index still carries every path.

**Speeding up traversal and status:**

- **commit-graph** — a precomputed file of commit metadata and generation numbers that avoids walking objects for every traversal. git commit-graph write --reachable, or set fetch.writeCommitGraph=true. On a large repo this is often an order of magnitude on git log operations.
- **FSMonitor** — core.fsmonitor=true uses the OS file-watching service so git status does not have to stat the entire tree. With untrackedCache it is the difference between seconds and milliseconds on a large checkout.
- **Maintenance** — git maintenance start registers background jobs for incremental repack, commit-graph refresh and prefetch, which keeps the repository fast without manual gc.
- **Scalar** — ships with Git and applies all of the above as a preset: scalar clone <url> gives you partial clone, sparse checkout, FSMonitor, commit-graph and background maintenance in one command. It is the descendant of Microsoft's VFS for Git work on the Windows repository.

**Large binaries.** Git LFS replaces the file in history with a small pointer and stores content in a separate service, so clones no longer carry every version of every asset. Two caveats: LFS is a separate service with its own auth and quotas, and it does not retroactively fix history — a repository already fat with binaries needs filter-repo to excise them before LFS helps.

The operational side is where LFS is usually mishandled. git lfs track "*.psd" writes the pattern into .gitattributes as filter=lfs diff=lfs merge=lfs -text, and that file must be committed or nobody else's client will treat the pattern as LFS. A plain clone downloads LFS content one object at a time during checkout; git lfs fetch --recent limits that to refs touched within lfs.fetchrecentrefsdays (seven days by default), git lfs fetch --all pulls every version ever referenced, and -I and -X include or exclude paths. git lfs prune removes local objects not needed by the checked-out commit, an unpushed commit or a recent one, with --dry-run and --verify-remote as the safety catches. For files that cannot be merged, git lfs track "*.psd" --lockable plus git lfs lock and git lfs unlock give a checkout-style lock enforced by the server. Moving an LFS repository between hosts needs git lfs fetch --all from the old remote and git lfs push --all to the new one after the ordinary --mirror push, or the pointers arrive without their content.`,
      },
      {
        title: 'Monorepo, submodules, or subtree — and what each actually costs',
        content: `**Submodules** pin one repository inside another at a specific commit. The parent records a gitlink — a pointer to an exact SHA in the child — so the composition is precisely reproducible, which is their genuine strength for vendored dependencies and for firmware or OS images that must pin an exact source revision.

Their costs are equally real and are what make them unpopular. Clones need --recurse-submodules or the directories are empty. A submodule sits in detached HEAD by default, so work committed inside it is easy to lose. Updating means committing in the child, then committing the new pointer in the parent — two commits, two reviews, and an easy state to get wrong. And branch switching in the parent does not automatically move submodules unless submodule.recurse=true is set. Set that, and set status.submoduleSummary=true so the parent's status tells you when a submodule has moved.

**Subtree** copies another project's content into a subdirectory of your repository, optionally preserving its history. There is nothing extra to clone and no special commands for consumers, which is its appeal. The cost is that merging upstream changes back and forth is manual and history becomes intertwined, so it suits vendoring something you rarely update rather than an actively co-developed dependency.

**Monorepo** puts everything in one repository. What you buy is atomic cross-project changes — one commit updates the API and every caller, so the repository is never internally inconsistent — plus one version of every dependency, trivially discoverable code, and a single CI configuration. Google, Meta and Microsoft all made this trade deliberately.

What you pay is tooling. A monorepo demands, at minimum: **build-graph-aware CI** so a change to one service does not rebuild everything (Bazel, Buck, Pants, Nx, Turborepo), **CODEOWNERS** for review routing, and the scale mechanisms from the previous chapter. Without the first of those, CI time grows with the size of the repository rather than the size of the change, and that is the failure mode that makes people conclude monorepos do not work.

**Choosing.** The question is not repository layout, it is **how often changes cross the boundary**. If a typical change touches two components together, a boundary between them will be paid for on every change, in coordination and in version skew — that argues for one repository. If components genuinely release independently, on different cadences, to different consumers, separate repositories with real versioned interfaces are simpler and the boundary is doing useful work.

Two things not to do. Do not adopt a monorepo without the build tooling, because the CI cost arrives immediately and the benefits arrive slowly. And do not use submodules as a poor substitute for a package manager — if the dependency has releases and a version number, depend on it as a package. The operational side of submodules — the gitlink and .gitmodules split, recursive CI checkout, removing one cleanly, and the migrations out — is covered separately under Submodules and Vendoring.`,
      },
    ],
    quickFire: [
      { q: 'What are the three ways a repository gets slow?', a: 'Too much history (graph traversal — log, blame), too many files (status must stat every path), and too much content (clone and fetch, and every version is kept forever). The fixes differ, so identify which one you have first.' },
      { q: 'Partial clone versus shallow clone?', a: 'Partial clone (--filter=blob:none) omits file content but keeps the full commit graph, so log, bisect and blame still work and fetch on demand. Shallow clone (--depth=1) truncates history itself and breaks bisect, blame and merge-base. Shallow is fine for build-only CI; partial is correct whenever history matters.' },
      { q: 'What is sparse checkout cone mode?', a: 'A restriction of sparse patterns to whole directories, which is less expressive than pattern mode but allows a much faster implementation. git sparse-checkout init --cone then set the directories you need.' },
      { q: 'Why is sparse checkout alone not enough for a million-file repo?', a: 'Because the index still contains every path, so git status stays slow. The sparse index (index.sparse=true, Git 2.32+) stores out-of-cone directories as a single entry each, which is what actually makes status fast.' },
      { q: 'What does commit-graph do?', a: 'Precomputes commit metadata and generation numbers so traversals do not walk objects. git commit-graph write --reachable, or fetch.writeCommitGraph=true. Often an order of magnitude on log operations in a large repository.' },
      { q: 'What is Scalar?', a: 'A preset that ships with Git: scalar clone applies partial clone, sparse checkout, FSMonitor, commit-graph and background maintenance in one command. It descends from Microsoft\'s VFS for Git work on the Windows repository.' },
      { q: 'What does Git LFS fix, and what does it not?', a: 'It replaces large files in history with pointers and stores content in a separate service, so clones stop carrying every version of every asset. It does not fix history retroactively — a repo already fat with binaries needs filter-repo to excise them first — and it introduces a separate service with its own auth and quotas.' },
      { q: 'Submodule versus subtree?', a: 'Submodule pins an exact child commit via a gitlink — precisely reproducible, good for vendored deps and firmware pinning, but needs --recurse-submodules, sits in detached HEAD, and every update is two commits in two repos. Subtree copies content in, so consumers need no special commands, but syncing upstream is manual and histories intertwine. Subtree suits rarely-updated vendoring; submodule suits exact pinning.' },
      { q: 'What settings make submodules survivable?', a: 'submodule.recurse=true so branch switching moves submodules, and status.submoduleSummary=true so the parent\'s status reports when a submodule has moved. Without those, the common failure is committing a stale pointer.' },
      { q: 'How do you decide between monorepo and multi-repo?', a: 'By how often changes cross the boundary. If a typical change touches two components together, the boundary is paid for on every change in coordination and version skew — one repository. If components genuinely release independently on different cadences to different consumers, separate repos with versioned interfaces are simpler. And never adopt a monorepo without build-graph-aware CI, or CI time scales with repository size instead of change size.' },
    ],
    references: [
      'https://git-scm.com/docs/partial-clone',
      'https://git-scm.com/docs/git-sparse-checkout',
      'https://github.blog/2020-12-21-get-up-to-speed-with-partial-clone-and-shallow-clone/',
      'https://devblogs.microsoft.com/devops/introducing-scalar/',
      'https://git-scm.com/docs/git-commit-graph',
      'https://git-lfs.com/',
      'https://git-scm.com/book/en/v2/Git-Tools-Submodules',
    ],
  },

  // ── 7 ────────────────────────────────────────────────────────────────
  {
    id: 'git-internals-objects-refs',
    title: 'Git Internals — Objects, Refs, the Index, and Packfiles',
    icon: 'database',
    color: '#6366f1',
    questions: 11,
    description: 'Git is a content-addressed object store with a thin porcelain over it. Blobs, trees, commits and tags; how refs and the index really work; what a packfile is; and why understanding the DAG turns most Git confusion into arithmetic.',
    introduction: `## Overview
Almost every confusing Git behaviour becomes obvious once you know what is actually stored. There are exactly **four object types**, every object is addressed by the hash of its own content, and refs are just files containing a hash. That is the whole model.

**Blob** — file contents, with no name and no metadata. Two identical files anywhere in history are one blob.
**Tree** — a directory listing: names, modes, and the hash of the blob or tree each name points to.
**Commit** — a root tree hash, zero or more parent commit hashes, author, committer, and a message.
**Tag** — an annotated tag object: a target hash, a tagger, a message, optionally a signature.

Because a commit's hash covers its tree, its parents and its metadata, **the hash is an integrity checksum over all reachable history**. Change anything anywhere in the past and every descendant hash changes. This single fact explains why rewriting history produces new commits, why Git can detect corruption, and why a shared hash is a reliable identifier.

Commits form a directed acyclic graph, not a line. A branch is not a container of commits — it is a pointer to one commit, and the "contents" of a branch are whatever is reachable by walking parents from it.`,
    topics: [
      {
        title: 'The object store, refs, and the index',
        image: '/diagrams/git/walk-object-graph.png',
        content: `**Inspecting objects.** Every object is stored under .git/objects, either loose (zlib-compressed, path derived from its hash) or inside a packfile. The plumbing commands read them directly:

    git cat-file -t <sha>          # type: blob, tree, commit or tag
    git cat-file -p <sha>          # pretty-print the content
    git rev-parse HEAD             # resolve any revision expression to a sha
    git ls-tree HEAD               # the root tree of the current commit
    git hash-object -w file.txt    # write a blob, print its hash

Running git cat-file -p on a commit is the fastest way to internalise the model: you see a tree line, parent lines, author, committer and message — and nothing else. There is no diff stored. **Git stores snapshots, not deltas**; diffs are computed on demand, and delta compression happens later at the packfile level as a storage optimisation, not as the data model.

**Refs** are files under .git/refs whose content is a hash — .git/refs/heads/main holds the commit that main points to. Creating a branch writes a 41-byte file, which is why branching is instantaneous. HEAD is usually a *symbolic* ref, containing "ref: refs/heads/main"; when it contains a raw hash instead you are in **detached HEAD**, which is not an error state, just HEAD pointing directly at a commit rather than through a branch. Commits made there are unreferenced once you leave, which is why they seem to vanish. Packed refs (.git/packed-refs) is an optimisation that stores many refs in one file.

**The index** (.git/index, also called the staging area) is a binary file listing every tracked path with its blob hash, mode and stat data. It is neither the working tree nor the last commit, which is exactly what makes three-way comparisons meaningful: git diff compares working tree to index, git diff --cached compares index to HEAD, and git diff HEAD compares working tree to HEAD. The cached stat data is what lets git status avoid re-hashing unchanged files, and it is why a stat-only change can make Git briefly think a file is modified.

**Packfiles.** Loose objects are inefficient at scale, so git gc packs them into a .pack with an .idx index, applying delta compression between similar objects. This is a *storage* representation only — logically the objects are still full snapshots. git count-objects -vH reports loose versus packed, and git verify-pack -v inspects one.

**Reachability and garbage.** An object is alive if it is reachable from any ref, the index, or the reflog. Anything else is garbage and will eventually be pruned by gc. This is precisely why the reflog is a safety net: it holds references to commits that no branch points at any more.

**Building a commit with plumbing alone.** The most convincing demonstration of the model, and a standard interview sequence, is to do by hand what git add and git commit do:

    echo 'version 1' > test.txt
    git hash-object -w test.txt                                  # write a blob, print its hash
    git update-index --add --cacheinfo 100644 <blob> test.txt    # stage it by hash; 100644 file, 100755 executable, 120000 symlink
    git write-tree                                               # write the index as a tree object, print its hash
    echo 'First commit' | git commit-tree <tree>                 # a parentless commit
    echo 'Second commit' | git commit-tree <tree2> -p <commit1>  # chain the next one
    git update-ref refs/heads/main <commit2>                     # move the branch; also writes the reflog
    git read-tree --prefix=bak <tree>                            # read a tree into the index under a subdirectory

git log on the result is ordinary history. Porcelain is this sequence in a convenient order: write blobs for changed files, update the index, write the tree, write a commit pointing at the tree and its parents, move the ref. HEAD is normally a symbolic ref; git symbolic-ref HEAD reads it and git symbolic-ref HEAD refs/heads/test writes it safely, refusing anything outside refs/.

**Two rarely taught commands that follow from the model.** git replace <old> <new> records a replacement ref under refs/replace so that Git presents the new object wherever the old one is referenced, without rewriting any hash: it is how you graft a rewritten commit or an extra parent onto history locally, and how a shallow-imported history can be joined to the full one. git bundle create repo.bundle main packs commits and refs into a single file that another repository can git fetch from or git clone, which is how history moves across an air gap or an email; git bundle verify checks one before use.

**Environment variables worth knowing.** GIT_DIR and GIT_WORK_TREE relocate the repository and the working tree, which is what the dotfiles-in-a-bare-repository trick relies on. GIT_SSH_COMMAND="ssh -i ~/.ssh/other_key" selects a key for one command. GIT_AUTHOR_DATE and GIT_COMMITTER_DATE make scripted commits reproducible. GIT_TRACE=1 prints every sub-command Git runs, GIT_TRACE_PACKET=1 the wire protocol, GIT_TRACE_PERFORMANCE=1 timings, and GIT_CURL_VERBOSE=1 the HTTP exchange, which between them answer most "why is this slow or failing" questions.`,
      },
      {
        title: 'Revision syntax, and reading the DAG fluently',
        content: `Most Git commands take revisions, and the syntax is more expressive than people use.

**Single commits.** HEAD~3 walks back three *first parents*. HEAD^2 selects the *second parent* of a merge — so on a merge commit, ^1 is the branch you merged into and ^2 is the branch you merged in. HEAD@{2} is the reflog entry, and HEAD@{yesterday} works too. main@{u} (or @{push}) is the upstream of main.

**Ranges.** This is where confusion usually lives:

| Expression | Meaning |
| --- | --- |
| A..B | commits reachable from B but not A — "what is on B that is not on A" |
| A...B | symmetric difference — on either, but not both |
| B --not A | the same as A..B, in a form that extends to many refs |
| A..B --left-right | with ...B, marks which side each commit came from |

git log main..feature is the canonical "what does my branch add", and git log feature..main is "what has main gained that I do not have". Getting these the right way round is most of practical range usage.

**Merge bases.** git merge-base A B is the common ancestor from which a three-way merge is computed. git merge-base --is-ancestor A B answers containment questions in scripts, and git merge-base --fork-point handles the case where the upstream has itself been rebased.

**Useful graph reading:**

    git log --oneline --graph --decorate --all      # the whole DAG
    git log --first-parent --oneline                # mainline only: one entry per PR
    git log --merges / --no-merges                  # only merges / only real work
    git branch --contains <sha>                     # which branches include this commit
    git tag --contains <sha>                        # which releases include this fix
    git cherry -v main feature                       # commits not yet upstream, by patch-id

That last pair answers the question that comes up during incident review — "is the fix in the release?" — without reading any history at all.

**Why this matters practically.** Once the DAG is concrete, the operations stop being magic. Rebase is: compute the commits in upstream..mine, replay each as a new commit on the new base. Merge is: find the merge base, three-way merge the two trees, write a commit with two parents. Cherry-pick is: compute one commit's diff against its parent, apply it here, write a new commit. Reset is: move a ref, and optionally the index and working tree. **Each is a small operation on hashes and pointers, and the "confusing" behaviour is nearly always the DAG being exactly what you told it to be.**`,
      },
    ],
    quickFire: [
      { q: 'What are the four Git object types?', a: 'Blob (file content, no name), tree (directory listing of names, modes and hashes), commit (root tree, parents, author, committer, message) and annotated tag (target, tagger, message, optional signature). Everything else in Git is built on those.' },
      { q: 'Does Git store diffs?', a: 'No — it stores full snapshots. Each commit points at a complete tree, and diffs are computed on demand. Delta compression exists inside packfiles as a storage optimisation, not as the data model.' },
      { q: 'What is a branch, physically?', a: 'A file under .git/refs/heads containing one 40-character hash. That is why branching is instantaneous. The "contents" of a branch is whatever is reachable by walking parents from that commit.' },
      { q: 'What is detached HEAD?', a: 'HEAD containing a raw commit hash instead of a symbolic "ref: refs/heads/...". It is not an error, just HEAD pointing at a commit rather than through a branch — but commits made there are unreferenced once you leave, which is why they appear to vanish (and why the reflog recovers them).' },
      { q: 'What exactly is the index?', a: 'A binary file listing every tracked path with its blob hash, mode and cached stat data. It sits between the working tree and HEAD, which is what makes git diff (tree vs index), git diff --cached (index vs HEAD) and git diff HEAD (tree vs HEAD) three distinct questions.' },
      { q: 'Why does the hash cover the whole history?', a: 'A commit hash is a checksum over its tree, its parents and its metadata — and the parents\' hashes cover theirs. So any change anywhere in the past changes every descendant hash. That is the integrity guarantee, and the reason rewriting history produces new commits.' },
      { q: 'What makes an object garbage?', a: 'Being unreachable from any ref, the index or the reflog. gc prunes those. It is exactly why the reflog is a safety net — it keeps references to commits no branch points at any more.' },
      { q: 'What does HEAD^2 mean?', a: 'The second parent. On a merge commit, ^1 is the branch you merged into and ^2 is the branch you merged in — which is why git revert -m 1 keeps the mainline. Contrast HEAD~2, which walks back two first-parents.' },
      { q: 'Difference between A..B and A...B?', a: 'A..B is commits reachable from B but not A — "what does B add". A...B is the symmetric difference, on either but not both. git log main..feature is what your branch adds; git log feature..main is what you are missing.' },
      { q: 'Is this fix in the release?', a: 'git tag --contains <sha> lists the tags that include it, and git branch --contains <sha> the branches. git cherry -v main feature compares by patch-id, so it still works when the commit was cherry-picked and has a different hash.' },
      { q: 'Explain rebase in terms of the object model.', a: 'Compute the commits in upstream..mine, then replay each one as a new commit on the new base — new parents, therefore new hashes, therefore the originals become unreferenced. Merge, by contrast, finds the merge base, three-way merges the trees and writes one commit with two parents, leaving both histories intact.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects',
      'https://git-scm.com/book/en/v2/Git-Internals-Git-References',
      'https://git-scm.com/docs/gitrevisions',
      'https://git-scm.com/docs/git-cat-file',
      'https://git-scm.com/docs/git-merge-base',
      'https://git-scm.com/book/en/v2/Git-Internals-Packfiles',
      'https://www.atlassian.com/git/tutorials/what-is-git',
      'https://kodekloud.com/blog/git-interview-questions/',
    ],
  },

  // ── 8 ────────────────────────────────────────────────────────────────
  {
    id: 'git-merge-conflicts-strategies',
    title: 'Merge Strategies and Resolving Conflicts Properly',
    icon: 'gitMerge',
    color: '#dc2626',
    questions: 11,
    description: 'The ort strategy, why diff3 and zdiff3 conflict styles make resolution dramatically easier, strategy options like ours and theirs (and how they invert during a rebase), custom merge drivers, and how to verify a resolution was actually correct.',
    introduction: `## Overview
A conflict is not a failure — it is Git declining to guess. A three-way merge compares each side against the **merge base**, the common ancestor. Where only one side changed a region, that change is taken automatically. Where both sides changed the same region differently, Git cannot know which was intended, so it writes a conflict.

That framing has a direct practical consequence: **the merge base is the missing information in most difficult resolutions.** The default conflict presentation hides it, which is why so many resolutions are guesswork, and why the single most valuable configuration change in this whole topic is turning it back on.

Since Git 2.34 the default strategy is **ort** ("ostensibly recursive's twin"), a rewrite of the old recursive strategy. It is faster, handles renames far better, and fixes a number of correctness bugs — notably around directory renames and merges involving submodules.`,
    topics: [
      {
        title: 'Strategies, conflict styles, and strategy options',
        content: `**Strategies.**

- **ort** — the default since 2.34, for two-head merges. Detects renames, handles directory renames, and is substantially faster on large trees. It replaced **recursive**, which is still selectable but has no reason to be used.
- **ours** — a *strategy*, distinct from the -X option below: it produces a merge commit whose tree is entirely the current branch, discarding the other side's changes while recording the merge relationship. Its legitimate use is marking a branch as merged (so it will not be offered again) without taking its content.
- **octopus** — merges more than two heads at once, the default when you name several branches. It refuses to run if there are any conflicts, so it is only for combining topic branches that are known to be independent.
- **subtree** — a variant of ort for merging a project into a subdirectory.

**Conflict styles — the highest-leverage setting.** The default "merge" style shows only the two sides:

    <<<<<<< HEAD
    timeout = 30
    =======
    timeout = 60
    >>>>>>> feature

You cannot tell who changed what. If the base was 30, the other side raised it and you should probably take 60. If the base was 60, *you* lowered it and taking 60 reverts your change. **The two cases look identical.** The diff3 style adds the base:

    git config --global merge.conflictStyle zdiff3

    <<<<<<< HEAD
    timeout = 30
    ||||||| base
    timeout = 15
    =======
    timeout = 60
    >>>>>>> feature

Now it is clear that both sides raised it from 15, and the resolution is a judgement about which value is wanted rather than a guess about intent. **zdiff3** (Git 2.35+) is diff3 with common lines hoisted out of the conflict region, producing noticeably smaller conflicts. Use zdiff3; there is essentially no reason to prefer plain diff3, and none at all to keep the default.

**Strategy options (-X).** These resolve *only the conflicting hunks* automatically, keeping every non-conflicting change from both sides — quite different from the ours *strategy*, which discards a whole side.

    git merge -X ours feature      # on conflict, prefer current branch's hunk
    git merge -X theirs feature    # on conflict, prefer incoming hunk

The trap that catches everyone: **during a rebase, "ours" and "theirs" are inverted.** A rebase replays your commits onto the upstream, so at each step the upstream is the thing being merged *into* (ours) and your commit is what is being applied (theirs). During git rebase, -X theirs means "prefer my commit's version". Same words, opposite meaning, and it is a common interview question precisely because it is so easy to get backwards.

Other useful options: -X ignore-all-space for conflicts caused purely by whitespace, and -X renormalize when line-ending normalisation is generating spurious conflicts.

**Custom merge drivers.** For file formats where a textual merge is meaningless, define a driver in .gitattributes:

    # .gitattributes
    CHANGELOG.md      merge=union
    *.generated.go    merge=ours
    package-lock.json merge=npm-lockfile

The built-in **union** driver concatenates both sides without conflict markers, which is right for append-only files such as changelogs. A custom driver is any program taking the base, ours and theirs files; the ecosystem provides them for lockfiles, Jupyter notebooks (nbdime) and similar formats. This is the correct fix for "this file conflicts on every single PR".

**binary** in .gitattributes stops Git attempting a textual merge on images and archives at all.`,
      },
      {
        title: 'Working through a conflict, and proving the resolution is right',
        image: '/diagrams/git/fund-merge-3way.png',
        content: `**Orientation first.** git status names the conflicted paths and the operation in progress. git diff during a conflict shows a combined diff against both parents. And git log --merge lists only the commits that touched the conflicted files on either side since the merge base — usually the fastest way to understand *why* both sides changed.

    git log --merge -p <conflicted-file>

**Taking one side wholesale** for a specific file:

    git checkout --ours  path/file      # current branch's version
    git checkout --theirs path/file     # incoming version
    git restore --source=MERGE_HEAD --  path/file    # modern equivalent

**Seeing all three versions** — this is the technique that resolves genuinely hard conflicts. The index holds every stage during a conflict: 1 is the base, 2 is ours, 3 is theirs.

    git show :1:path/file > /tmp/base
    git show :2:path/file > /tmp/ours
    git show :3:path/file > /tmp/theirs

**git mergetool** launches a configured three-way tool; merge.tool set to vimdiff, meld, kdiff3 or your IDE. Set mergetool.keepBackup=false unless you want .orig files everywhere.

**Bailing out.** git merge --abort, git rebase --abort and git cherry-pick --abort all restore the pre-operation state. ORIG_HEAD also records where you were, so git reset --hard ORIG_HEAD recovers from a merge already completed in error. There is no situation where you have to push through a bad merge.

**Not repeating yourself.** rerere.enabled=true records each resolution and replays it automatically when the same conflict recurs — essential when rebasing a long branch repeatedly or restacking PRs, where the identical conflict appears at every attempt. git rerere diff shows what it will apply; git rerere forget <path> discards a recorded resolution you got wrong, which matters because a wrong resolution will otherwise be replayed silently forever.

**Verifying the resolution.** This is the step that is almost always skipped, and it is where semantic conflicts survive. A resolution can be textually plausible and still wrong.

- **Compile and test after resolving, before committing.** A merge that compiles is not a merge that is correct, but one that does not compile is definitely wrong.
- **Read the merge as a diff against each parent.** git show <merge> --remerge-diff (Git 2.36+) shows exactly what the *human* changed relative to what an automatic merge would have produced. That is the highest-value review artefact for a hairy merge, because it isolates your resolution from the mechanical part.
- **Look for lost changes.** git diff <merge-base>..<merge-result> should contain both sides' intent; a change that has quietly disappeared is the classic bad-resolution signature.
- **Never resolve a conflict you do not understand by picking a side.** Ask the author of the other change. Semantic conflicts merge cleanly and break at runtime; the ones that produce markers are the easy ones.

**Four more tools for the hard cases.** git checkout --conflict=diff3 path (or =zdiff3, or =merge) rewrites the conflict markers in a file you have partly edited, so you can start a resolution over with the base shown even if the config was not set. git diff during a merge, and git show on a finished merge commit, use the combined format, diff --cc, with two columns of plus and minus signs: the first column is relative to the first parent, the second relative to the second, so a line marked ++ was added by the resolution itself. git merge-file ours.txt base.txt theirs.txt is the three-way file merge as a standalone command, useful for a single file outside any Git operation or inside a script. And a custom merge tool is wired with mergetool.<name>.cmd, using $BASE, $LOCAL, $REMOTE and $MERGED, plus mergetool.<name>.trustExitCode true so its exit status decides whether the result is accepted; diff.external and diff.<name>.textconv in .gitattributes do the same for viewing, so that Word documents or images diff as text.`,
      },
    ],
    quickFire: [
      { q: 'What causes a conflict?', a: 'A three-way merge compares both sides against the merge base. Where only one side changed a region, that change is taken. Where both changed the same region differently, Git declines to guess and writes a conflict. Conflicts are Git refusing to invent intent.' },
      { q: 'What is the ort strategy?', a: 'The default two-head merge strategy since Git 2.34 — a rewrite of recursive that is faster, much better at renames including directory renames, and fixes correctness bugs. recursive is still selectable but has no reason to be used.' },
      { q: 'What is the single most valuable merge config change?', a: 'merge.conflictStyle=zdiff3. The default style hides the merge base, so you cannot tell whether the other side raised a value or you lowered it — the two cases look identical. diff3 shows the base; zdiff3 (2.35+) also hoists common lines out, giving smaller conflicts.' },
      { q: 'Difference between the ours strategy and -X ours?', a: 'The ours *strategy* discards the other side entirely, producing a merge commit whose tree is your branch — used to mark a branch merged without taking its content. -X ours is a strategy *option* that only decides conflicting hunks, keeping every non-conflicting change from both sides.' },
      { q: 'Why are ours and theirs inverted during a rebase?', a: 'Rebase replays your commits onto the upstream, so at each step the upstream is what is being merged into (ours) and your commit is what is being applied (theirs). During a rebase, -X theirs means "prefer my commit". Same words, opposite meaning.' },
      { q: 'A lockfile conflicts on every PR. Fix it.', a: 'A custom merge driver in .gitattributes. The built-in union driver suits append-only files like changelogs; lockfiles and notebooks have purpose-built drivers (nbdime for Jupyter). Better still, stop committing the artefact if CI can regenerate it deterministically.' },
      { q: 'How do you see all three versions of a conflicted file?', a: 'The index holds them as stages: git show :1:file is the base, :2: is ours, :3: is theirs. Dumping all three is the technique for genuinely hard conflicts, because it lets you diff base against each side separately.' },
      { q: 'What does git log --merge do?', a: 'Lists only the commits that touched the conflicted files on either side since the merge base — usually the fastest way to learn why both sides changed. Add -p to read the actual changes.' },
      { q: 'What is --remerge-diff?', a: 'Git 2.36+: git show <merge> --remerge-diff shows what the human changed relative to what an automatic merge would have produced, isolating the resolution from the mechanical part. It is the highest-value review artefact for a difficult merge.' },
      { q: 'How do you undo a merge you already committed?', a: 'git reset --hard ORIG_HEAD, which Git set to your pre-merge position. Before committing, git merge --abort. There is no situation where you must push through a bad merge.' },
      { q: 'What is the danger of rerere?', a: 'It replays recorded resolutions silently — including a wrong one, forever. git rerere diff shows what it will apply and git rerere forget <path> discards a recorded resolution. Enable it, but know how to clear a bad entry.' },
    ],
    references: [
      'https://git-scm.com/docs/merge-strategies',
      'https://git-scm.com/docs/git-merge#_how_conflicts_are_presented',
      'https://github.blog/2022-04-18-highlights-from-git-2-36/',
      'https://git-scm.com/docs/gitattributes#_defining_a_custom_merge_driver',
      'https://git-scm.com/docs/git-rerere',
      'https://git-scm.com/docs/git-mergetool',
      'https://www.atlassian.com/git/tutorials/using-branches/merge-conflicts',
    ],
  },

  // ── 9 ────────────────────────────────────────────────────────────────
  {
    id: 'git-recovery-and-reflog',
    title: 'Recovering Lost Work — Reflog, Dangling Objects, and Undoing Anything',
    icon: 'refreshCw',
    color: '#22c55e',
    questions: 11,
    description: 'Almost nothing committed to Git is ever really lost. The reflog, ORIG_HEAD, fsck and dangling objects, recovering a deleted branch, a bad rebase, a dropped stash, or a force-push that overwrote someone — plus the cases that genuinely are unrecoverable.',
    introduction: `## Overview
The recovery model rests on one property: **an object is deleted only when it is unreachable *and* garbage collection runs.** Between those two conditions there is a wide window, and the reflog holds the window open.

The reflog records every movement of every ref. Every commit, checkout, merge, rebase, reset and pull writes an entry saying where the ref was and where it went. Because a reflog entry is itself a reference, a commit mentioned in it is reachable, and therefore safe from gc.

Default expiry is **90 days for entries whose commits are still reachable and 30 days for unreachable ones** (gc.reflogExpire, gc.reflogExpireUnreachable). So the practical rule is: if it was ever committed, and it happened within a month, it is almost certainly recoverable.

Two limits define the boundaries. The reflog is **local and per-clone** — it recovers your mistakes, not a colleague's, and a fresh clone has none. And work that was never committed or staged has no object at all, so it cannot be recovered by Git.`,
    topics: [
      {
        title: 'The reflog, ORIG_HEAD, and undoing each operation',
        image: '/diagrams/git/topic-reflog-dangling.png',
        content: `**Reading the reflog.**

    git reflog                      # HEAD movements
    git reflog show main            # one branch's history of positions
    git log -g --oneline            # reflog with full commit formatting

Each entry is addressable as HEAD@{n}, and time expressions work: HEAD@{2.hours.ago}, main@{yesterday}. The operation name in each line (commit, rebase -i (finish), reset: moving to, pull) tells you what moved it, which is usually enough to identify the moment things went wrong.

**ORIG_HEAD** is set by any operation that moves HEAD significantly — merge, rebase, reset, pull. It is a one-slot undo for the most recent such operation:

    git reset --hard ORIG_HEAD

**Recovering specific disasters:**

*Accidental git reset --hard.* The commits still exist; only the ref moved.

    git reflog                       # find the sha before the reset
    git reset --hard HEAD@{1}

*A rebase that went wrong.* The pre-rebase position is in the reflog, and ORIG_HEAD usually points at it. For an interactive rebase mid-flight, git rebase --abort is cleaner.

    git reset --hard ORIG_HEAD

*A deleted branch.* Deleting a branch removes only the ref file; the commits remain until gc.

    git reflog                       # find its tip
    git branch recovered <sha>
    # if the reflog is gone:
    git fsck --lost-found

*An amended commit whose original you want back.* The pre-amend commit is in the reflog as the entry before the amend. git reflog show <branch> shows both positions.

*A dropped or cleared stash.* Stashes are commits, and git stash drop leaves them dangling. There is no stash reflog after dropping, so use fsck:

    git fsck --unreachable | grep commit
    git show <sha>                   # identify the right one
    git stash apply <sha>            # or: git branch recovered <sha>

*A force-push that overwrote someone else's work.* On the machine that pushed, the old commits are usually still present — the remote-tracking reflog (git reflog show origin/main) records what the remote was before. Push the recovered sha back. If they are only on the *server*, GitHub's REST API events, the Activity view, or support can often surface the orphaned sha; forges keep unreferenced objects for a period.

**Finding objects with no ref at all.**

    git fsck --full --unreachable --lost-found

fsck walks the whole object database and reports what nothing points at. --lost-found writes dangling commits and blobs into .git/lost-found for inspection. Dangling *blobs* matter too: content that was staged (git add) but never committed still exists as a blob, so even an uncommitted-but-staged file is recoverable this way.

**Not making it worse.** If you suspect you have lost something, **stop running commands and do not run git gc or git prune**. Copy the .git directory first. gc is what turns a recoverable situation into an unrecoverable one, and aggressive settings or a repack can trigger it.`,
      },
      {
        title: 'What is genuinely unrecoverable, and how to make recovery cheap',
        content: `**Truly gone:**

- **Uncommitted, unstaged working-tree changes** destroyed by git reset --hard, git checkout -- file, git restore, or a clean. No object was ever written, so Git has nothing. (An editor's local history or an IDE's local-history feature is often the only recourse — worth knowing that JetBrains IDEs and VS Code both keep one.)
- **Untracked files** removed by git clean -fd. Same reason.
- **Objects already garbage-collected** and past their reflog expiry.
- **A stash that was dropped and then gc'd.**

The pattern is consistent: **Git protects what it has hashed.** Anything committed or staged has an object; anything else does not exist as far as Git is concerned. This is the strongest practical argument for committing early and often on a local branch — commits are free, and they convert an unrecoverable situation into a reflog lookup.

**Making recovery cheap:**

- **Commit work-in-progress freely.** git commit -m wip on a local branch costs nothing and can be squashed away later with autosquash or an interactive rebase.
- **Prefer git stash over discarding**, since a stash is a real commit and therefore recoverable, whereas a discard is not.
- **Use --force-with-lease** rather than --force, so a force-push cannot silently destroy work the remote had. Add --force-if-includes (2.30+) for a stricter check.
- **Enable protected branches** on the forge — blocking force-push and deletion on main removes the whole category server-side, which is more reliable than discipline.
- **Extend the safety window** on repositories where it matters: gc.reflogExpire and gc.reflogExpireUnreachable can both be set to a longer period, or to never.
- **Keep a second remote.** git remote add backup and pushing all refs there periodically means the objects exist in two places, which no local mistake can undo.
- **Use worktrees rather than stash-juggling** when switching context, so half-finished work stays committed on its own branch instead of living in the index.

**A diagnostic worth internalising.** When something appears lost, ask one question: *was it ever committed or staged?* If yes, it is an object, and the job is finding the hash — reflog first, ORIG_HEAD second, fsck third. If no, Git never had it, and the answer is outside Git. That single question resolves nearly every "I lost my work" situation in seconds, and it is what an interviewer is listening for.

**The anchor trick, for people who do not yet trust the reflog.** Before a reset --hard or a risky rebase, put a name on where you are: git tag oops or git branch backup. The commits stay reachable and visible in git log --all no matter what the operation does; delete the tag or branch once you are sure. Git Immersion teaches this before it teaches the reflog, and it remains a good habit for anything that touches more than a few commits.

**Three commands with prune in the name that do different things.** git fetch --prune and git remote prune origin delete stale remote-tracking branches, origin/*, for branches that no longer exist on the server; they never touch a local branch or a commit. Plain git prune deletes unreachable objects from the object store and is normally run only inside git gc; a dry run with git prune -n usually prints nothing, because the reflog still references what looks orphaned. gc itself reads gc.reflogExpire (90 days), gc.reflogExpireUnreachable (30 days), gc.pruneExpire (two weeks: the grace period before an unreachable object is prunable), gc.auto (about 7,000 loose objects before an automatic run) and, under --aggressive, gc.aggressiveWindow and gc.aggressiveDepth for delta compression. git gc --auto runs after pull, merge, rebase and commit and does nothing unless a threshold is crossed. Setting gc.pruneExpire longer on a repository where mistakes are costly widens the recovery window at the price of disk.`,
      },
    ],
    quickFire: [
      { q: 'What makes recovery possible at all?', a: 'An object is deleted only when it is unreachable AND gc runs. The reflog holds the window open by referencing commits no branch points at — which makes them reachable, and therefore safe from collection.' },
      { q: 'How long does the reflog keep things?', a: '90 days for entries whose commits are still reachable, 30 days for unreachable ones (gc.reflogExpire and gc.reflogExpireUnreachable). Both can be extended, or set to never on repositories where it matters.' },
      { q: 'You ran git reset --hard by mistake. Recover.', a: 'The commits still exist; only the ref moved. git reflog to find the sha before the reset, then git reset --hard HEAD@{1}. ORIG_HEAD usually points there too.' },
      { q: 'What is ORIG_HEAD?', a: 'A one-slot undo, set by any operation that moves HEAD significantly — merge, rebase, reset, pull. git reset --hard ORIG_HEAD undoes the last such operation, including a merge you already committed.' },
      { q: 'You deleted a branch. Recover it.', a: 'Deleting a branch removes only the ref file; the commits remain until gc. Find the tip in git reflog and git branch recovered <sha>. If the reflog is gone, git fsck --lost-found lists dangling commits.' },
      { q: 'You dropped a stash. Recover it.', a: 'Stashes are commits, and dropping leaves them dangling with no reflog entry. git fsck --unreachable | grep commit, identify the right one with git show, then git stash apply <sha> or git branch recovered <sha>.' },
      { q: 'Someone force-pushed over your work. What now?', a: 'On the machine that pushed, the old commits are usually still local, and git reflog show origin/main records what the remote was before — push that sha back. If it exists only server-side, forge APIs and support can often surface the orphaned sha, since unreferenced objects are retained for a period.' },
      { q: 'What is the first thing to do when you think work is lost?', a: 'Stop running commands, and do not run git gc or git prune. Copy the .git directory. gc is what converts a recoverable situation into an unrecoverable one.' },
      { q: 'What is genuinely unrecoverable?', a: 'Uncommitted, unstaged changes destroyed by reset --hard, restore or checkout -- file; untracked files removed by git clean; and objects already collected past reflog expiry. No object was ever hashed, so Git has nothing to find.' },
      { q: 'Can you recover a file that was staged but never committed?', a: 'Yes — git add writes a blob, so the content exists as an object. git fsck --lost-found surfaces dangling blobs, and git show <sha> prints the content. This is the practical difference between staged and merely saved.' },
      { q: 'What single question resolves most "I lost my work" cases?', a: 'Was it ever committed or staged? If yes it is an object, and the job is finding the hash — reflog, then ORIG_HEAD, then fsck. If no, Git never had it and the answer lies outside Git, in editor local history or backups.' },
    ],
    references: [
      'https://git-scm.com/docs/git-reflog',
      'https://git-scm.com/docs/git-fsck',
      'https://git-scm.com/docs/git-gc#Documentation/git-gc.txt-gcreflogExpire',
      'https://git-scm.com/docs/git-stash',
      'https://git-scm.com/book/en/v2/Git-Internals-Maintenance-and-Data-Recovery',
      'https://www.atlassian.com/git/tutorials/undoing-changes',
      'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches',
    ],
  },

  // ── 10 ───────────────────────────────────────────────────────────────
  {
    id: 'git-cherry-pick-backports',
    title: 'Cherry-Pick, Backports, and Managing Release Branches',
    icon: 'gitBranch',
    color: '#a855f7',
    questions: 10,
    description: 'Getting one fix onto three supported release branches without dragging unrelated work along. Cherry-pick and its -x trail, rebase --onto for moving a range, patch-id and git cherry for detecting duplicates, and range-diff for reviewing a backport.',
    introduction: `## Overview
Backporting is the standard shape of production work in anything that supports more than one version: a fix lands on main, and it must also reach 3.1, 3.2 and the current release branch — without carrying along the twenty unrelated commits that landed on main in the meantime.

Cherry-pick is the primitive. It takes a commit, computes its diff against its own parent, applies that diff where you are, and writes a **new commit with a new hash**. That last part is the source of every complication in this topic: the same logical change now exists as two unrelated objects, so Git's normal reachability answers ("is this commit in that branch?") stop working.

Everything below is either a way to move changes efficiently or a way to answer questions about them despite the hash difference.`,
    topics: [
      {
        title: 'Cherry-picking well, and moving ranges with rebase --onto',
        image: '/diagrams/git/fund-cherry-pick.png',
        content: `**Basic use, and the flag that should always be on.**

    git cherry-pick <sha>
    git cherry-pick -x <sha>          # append "cherry picked from commit <sha>"

**-x is essentially mandatory for backports.** It records the source commit in the message, which is the only durable link between the two objects. Six months later, when someone asks whether the fix on 3.1 is the same as the one on main, that trailer is the answer. Kernel and distribution workflows treat it as required.

Other useful forms:

    git cherry-pick A..B              # a range, exclusive of A
    git cherry-pick A^..B             # a range, inclusive of A
    git cherry-pick -n <sha>          # apply without committing (stage only)
    git cherry-pick -m 1 <merge-sha>  # pick a merge, relative to parent 1
    git cherry-pick --continue / --skip / --abort

Picking a merge commit requires -m because a merge has no single parent to diff against; -m 1 means "the change this merge brought in relative to the mainline". It usually indicates you should have picked the individual commits instead.

**Moving a range of commits — rebase --onto.** Cherry-pick is fine for one or two commits; for a range, rebase --onto expresses the intent better. The form is:

    git rebase --onto <new-base> <old-base> <branch>

Read it as: take the commits in old-base..branch, and replay them onto new-base. Two common cases:

*A branch was cut from the wrong base.* You branched feature from develop but it should have come from main:

    git rebase --onto main develop feature

*You want only the last three commits of a branch.*

    git rebase --onto main feature~3 feature

Leave the branch name off and --onto applies to the branch you are on: git rebase --onto main 169a6 replays only the commits after 169a6, which is the case drawn in the gallery. The related two-argument form git rebase <base> <branch> checks the branch out first, so git rebase main feature is git switch feature followed by git rebase main; it reads well in scripts and in Learn Git Branching's harder levels.

**Conflicts during a backport** are expected and informative. A clean cherry-pick means the surrounding code is identical on both branches. A conflicting one means the branches have genuinely diverged there — and that is a signal to check whether the fix is even correct in the older context, not just to force the text through. **A backport that resolves cleanly but was never tested on the target branch is the classic source of "the fix broke the old release".** Always run the target branch's tests, not main's.

**When a fix is hard to backport,** the usual cause is that it depends on a refactor that only exists on main. Two honest options: backport the refactor first as a separate commit, or write a different, smaller fix for the old branch. Forcing the main version through with heavy conflict resolution produces a commit that resembles neither branch and that nobody can reason about later.`,
      },
      {
        title: 'Tracking what has been backported — patch-id, cherry, and range-diff',
        content: `Because a cherry-pick produces a new hash, git branch --contains <sha> will say the fix is *not* in the release branch even when it is. The tools below answer the question properly.

**patch-id** computes a hash of a diff's *content*, ignoring line numbers, whitespace and commit metadata. Two commits that make the same change have the same patch-id even with different hashes. That is the mechanism underneath the next two commands.

**git cherry** lists commits on one branch that have no equivalent upstream:

    git cherry -v main release-3.1

Each line is prefixed with + (not present upstream) or - (an equivalent change exists upstream). This is the direct answer to "what still needs backporting?" and it is patch-id based, so it sees through the hash change.

**git log --cherry-mark --left-right main...release-3.1** gives the same information as part of a normal log, marking equivalent commits with =.

**git range-diff** compares two *sequences* of commits — the single best tool for reviewing a backport:

    git range-diff main~5..main release-3.1~5..release-3.1

It pairs up corresponding commits and shows a diff **of the diffs**, so a reviewer sees exactly how the backported version differs from the original: usually nothing, and where it does differ, precisely what conflict resolution changed. Reviewing a backport by reading the full diff is far weaker, because it cannot distinguish "adapted for the old branch" from "accidentally dropped a hunk". range-diff is also the right tool for showing what changed between two versions of a rebased pull request.

**Release branch discipline.** A workable model, and roughly what Kubernetes, Chromium and most distributions use:

- **Fix on main first.** Always. A fix that lands only on a release branch is a regression waiting for the next release, and "forward-porting" is how that happens.
- **Backport by cherry-pick -x**, never by merging main into the release branch — merging drags in everything.
- **Gate what qualifies.** A release branch takes fixes, security patches and nothing else. Features on a release branch are how a stabilisation branch destabilises.
- **Automate the tracking.** A label such as needs-backport-3.1 plus a bot that opens the cherry-pick PR is standard; the automation matters more than the tool, because the failure mode is a fix that everyone assumed someone else had backported.
- **Tag and verify.** After backporting, git tag --contains and git cherry -v confirm the fix is where you believe it is — before the release, not after the incident.`,
      },
    ],
    visualizations: [
      { title: 'git rebase --onto main 169a6 — replay a slice, not the whole branch', image: '/diagrams/git/fund-rebase-onto.png', content: 'Only the commits after 169a6 on the current branch are copied onto main; 169a6 itself stays where it was. The three-argument form names the branch explicitly, the two-argument form uses the current one.' },
    ],
    quickFire: [
      { q: 'What does cherry-pick actually do?', a: 'Computes a commit\'s diff against its own parent, applies it where you are, and writes a NEW commit with a new hash. The hash difference is the source of every complication — reachability questions like branch --contains stop working.' },
      { q: 'Why is -x essentially mandatory for backports?', a: 'It appends "cherry picked from commit <sha>" to the message, which is the only durable link between the two objects. Months later it is how anyone establishes that the fix on 3.1 is the same one from main. Kernel and distro workflows treat it as required.' },
      { q: 'How do you cherry-pick a merge commit?', a: 'git cherry-pick -m 1 <merge-sha> — a merge has no single parent to diff against, so -m names the mainline parent. Needing it usually means you should be picking the individual commits instead.' },
      { q: 'Explain git rebase --onto.', a: 'git rebase --onto <new-base> <old-base> <branch> takes the commits in old-base..branch and replays them onto new-base. It fixes a branch cut from the wrong base (--onto main develop feature) or extracts a subrange (--onto main feature~3 feature).' },
      { q: 'What does a conflict during a backport tell you?', a: 'That the branches have genuinely diverged in that area — which is a signal to check whether the fix is even correct in the older context, not just to force the text through. Always run the target branch\'s tests, not main\'s.' },
      { q: 'What is patch-id?', a: 'A hash of a diff\'s content, ignoring line numbers, whitespace and metadata, so two commits making the same change share a patch-id despite different commit hashes. It is the mechanism behind git cherry and --cherry-mark.' },
      { q: 'What still needs backporting to 3.1?', a: 'git cherry -v main release-3.1. Lines prefixed + have no equivalent upstream, - means an equivalent change already exists. It is patch-id based, so it sees through the hash change that defeats branch --contains.' },
      { q: 'How do you review a backport properly?', a: 'git range-diff main~5..main release-3.1~5..release-3.1 — it pairs corresponding commits and shows a diff of the diffs, so you see exactly how the backport differs from the original. Reading the raw diff cannot distinguish "adapted for the old branch" from "accidentally dropped a hunk".' },
      { q: 'Why fix on main first, always?', a: 'A fix that lands only on a release branch is a regression waiting for the next release, because forward-porting is unreliable and easily forgotten. Fix on main, then cherry-pick -x down.' },
      { q: 'Why never merge main into a release branch?', a: 'It drags in every unrelated change on main, which is precisely what a stabilisation branch exists to exclude. Backport by cherry-pick, and gate the branch to fixes and security patches only.' },
    ],
    references: [
      'https://git-scm.com/docs/git-cherry-pick',
      'https://git-scm.com/docs/git-rebase#Documentation/git-rebase.txt---ontoltnewbasegt',
      'https://git-scm.com/docs/git-cherry',
      'https://git-scm.com/docs/git-range-diff',
      'https://git-scm.com/docs/git-patch-id',
      'https://www.kernel.org/doc/html/latest/process/stable-kernel-rules.html',
    ],
  },

  // ── 11 ───────────────────────────────────────────────────────────────
  {
    id: 'git-hooks-and-commit-standards',
    title: 'Hooks, Commit Conventions, and Signed Commits',
    icon: 'shield',
    color: '#0891b2',
    questions: 11,
    description: 'Client and server hooks and why client hooks are never a security control, the pre-commit framework, Conventional Commits driving semantic-release, and commit signing with GPG, SSH or Sigstore — including what a verified badge actually proves.',
    introduction: `## Overview
Three separate concerns get bundled together under "commit hygiene", and keeping them apart makes each one tractable.

**Hooks** run code at points in the Git lifecycle. **Commit conventions** impose structure on messages so tooling can act on them. **Signing** provides cryptographic evidence of who authored a commit.

The single most important principle spans all three: **client-side hooks are a convenience, never a control.** They live in .git/hooks, which is not part of the repository, are trivially bypassed with --no-verify, and do not exist at all in a fresh clone until something installs them. Any rule that actually matters must be enforced server-side — in CI, in a branch protection rule, or in a server-side hook. Client hooks exist to give fast feedback, not to guarantee anything.`,
    topics: [
      {
        title: 'Hooks — the useful ones, and how to distribute them',
        content: `**Client-side hooks**, in the order they fire:

- **pre-commit** — before the message editor. The place for linting and formatting. Keep it fast; anything over a second or two gets bypassed habitually.
- **prepare-commit-msg** — populate the message template, for example injecting a ticket ID parsed from the branch name.
- **commit-msg** — validate the message. Where Conventional Commits enforcement lives.
- **post-commit** — notifications; cannot affect the commit.
- **pre-push** — the last client-side gate. Better than pre-commit for a test suite, since it runs once per push rather than once per commit.
- **post-checkout / post-merge** — reinstall dependencies when a lockfile changes, a genuinely useful ergonomic hook.
- **pre-rebase** — receives the upstream and the branch being rebased and can refuse; Git's sample script blocks rebasing a branch that has already been merged into next, which is the golden rule of rebasing enforced by machine. **post-rewrite** runs after an amend or rebase with the old-to-new commit mapping, which is how tooling keeps notes and review metadata attached across a rewrite. **pre-auto-gc** can veto an automatic gc. The applypatch-msg, pre-applypatch and post-applypatch hooks belong to the git am email workflow and are rarely met outside the kernel.

**Server-side hooks**, which are the enforcing ones:

- **pre-receive** — runs once for the whole push, with all refs; rejecting here rejects the entire push. This is where real policy lives: message format, file size limits, secret scanning, protected paths.
- **update** — runs per ref, allowing partial acceptance.
- **post-receive** — after acceptance; triggers CI, notifications, deployments.

On hosted forges you usually cannot install server hooks (GitHub does not permit them; GitLab offers them on self-managed, and push rules on Premium). The equivalents are **branch protection rules**, **required status checks**, and **push protection** for secrets. The mental model stays the same: the check must live somewhere the developer cannot skip.

**Distributing client hooks.** Because .git/hooks is not versioned, hooks must be installed. Options:

- **core.hooksPath** — point Git at a versioned directory: git config core.hooksPath .githooks. Simple, no dependencies, but requires each developer to run it once.
- **pre-commit** (the framework, pre-commit.com) — a versioned .pre-commit-config.yaml declaring hooks with pinned versions, each in its own isolated environment. Language-agnostic, and the de facto standard in the Python ecosystem and increasingly beyond. It also runs in CI, which is what closes the bypass gap: pre-commit run --all-files as a required check means the same rules are enforced where they cannot be skipped.
- **Husky** — the JavaScript ecosystem equivalent, installed via a package.json prepare script, so it is set up by npm install. Usually paired with **lint-staged** so only staged files are processed, which is what keeps it fast.

The key design point: **whatever you run client-side, run the identical check in CI.** The client hook makes it fast; CI makes it true.`,
      },
      {
        title: 'Conventional Commits, release automation, and signing',
        content: `**Conventional Commits** is a message format that makes history machine-readable:

    <type>[optional scope][!]: <description>

    [optional body]

    [optional footer(s)]

Types are feat, fix, docs, style, refactor, perf, test, build, ci, chore. A ! before the colon, or a BREAKING CHANGE: footer, marks an incompatible change.

    feat(auth): add SAML login
    fix(api): handle null tenant in rate limiter
    refactor(db)!: drop legacy connection pool

The payoff is mechanical semantic versioning: **feat gives a minor bump, fix gives a patch, a breaking marker gives a major.** Tools such as **semantic-release**, **release-please** and **changesets** read the log, compute the next version, generate the changelog and publish — removing the "what version is this?" conversation entirely. **commitlint** enforces the format in a commit-msg hook and in CI.

Two caveats worth stating. The convention only pays for itself where releases are automated; imposing it without that is ceremony. And it describes the *type* of change, not its importance — a fix can matter far more than a feat, so a changelog generated purely from types still needs editorial judgement.

Independent of the convention, a good message answers **why**, not what: the diff already says what changed. The Linux kernel and Git's own guidelines both ask for a short imperative subject under about 50 characters, a blank line, and a body wrapped at 72 explaining motivation and context. A trailer such as Fixes: #123 or Refs: JIRA-456 links to the issue.

**Signing.** Commits carry an author field that is **plain text you can set to anything** — git config user.email is not authentication. Signing is what makes authorship verifiable.

- **GPG** — the original mechanism. git config user.signingkey <key>, commit.gpgsign=true, and upload the public key to the forge. Powerful, but key distribution and expiry make it operationally heavy.
- **SSH signing** (Git 2.34+) — sign with the SSH key you already have: gpg.format=ssh, user.signingkey=~/.ssh/id_ed25519.pub. Verification uses an allowed-signers file (gpg.ssh.allowedSignersFile). This is dramatically simpler and is now the pragmatic default for most teams; GitHub and GitLab both verify SSH signatures.
- **Sigstore / gitsign** — keyless signing using short-lived certificates tied to an OIDC identity, with the signature recorded in a public transparency log. It removes long-lived key management entirely and fits supply-chain frameworks such as SLSA.

Sign tags as well as commits (git tag -s), since a release tag is the artefact people actually trust.

**Checking a signature** is the half most people never do. git tag -v v1.4.0 verifies a signed tag. git log --show-signature and git show --show-signature print verification results per commit, and the %G? placeholder in a log format prints a one-letter status (G good, B bad, U unknown key, N none) so a script can audit a range. git merge --verify-signatures refuses to merge a branch containing unsigned or badly signed commits, and git pull --verify-signatures does the same on the way in; both are how a "require signed commits" policy is checked locally before the forge does.

**What a verified badge proves, and what it does not.** It proves the commit was signed by a key the forge associates with that account. It does **not** prove the code is good, that the author reviewed it, or that the account is not compromised. And because Git's author field is free text, an *unsigned* commit can claim any identity at all — which is the actual attack, and the reason to require signatures on protected branches rather than merely allowing them.

**DCO versus CLA.** A Developer Certificate of Origin is a Signed-off-by trailer (git commit -s) asserting the contributor has the right to submit the code — lightweight, enforced by a bot, used by the kernel and CNCF projects. A Contributor Licence Agreement is a separate legal document. They solve provenance-of-rights, not identity; signing solves identity. Projects frequently need both.`,
      },
    ],
    quickFire: [
      { q: 'Why are client-side hooks never a security control?', a: 'They live in .git/hooks, which is not part of the repository, are bypassed with --no-verify, and do not exist in a fresh clone until something installs them. Anything that must hold has to be enforced server-side — CI, branch protection, or a pre-receive hook.' },
      { q: 'Which hook enforces policy on a push?', a: 'pre-receive — it runs once for the whole push with all refs, so rejecting there rejects everything. update runs per ref and allows partial acceptance. post-receive runs after and triggers CI or deploys.' },
      { q: 'Hosted forges do not allow server hooks. What replaces them?', a: 'Branch protection rules, required status checks and push protection for secrets. GitLab self-managed offers server hooks and push rules on Premium. The model is unchanged: the check must live where the developer cannot skip it.' },
      { q: 'How do you distribute client hooks to a team?', a: 'core.hooksPath pointing at a versioned directory (simple, but each developer runs it once); the pre-commit framework with a pinned .pre-commit-config.yaml (language-agnostic, and runs in CI too); or Husky with lint-staged in the JS ecosystem, installed via a package.json prepare script.' },
      { q: 'What closes the --no-verify bypass gap?', a: 'Running the identical check in CI — for example pre-commit run --all-files as a required status check. The client hook makes it fast; CI makes it true.' },
      { q: 'Why pre-push rather than pre-commit for tests?', a: 'It runs once per push instead of once per commit. A pre-commit hook that takes more than a second or two gets habitually bypassed, which makes it worse than not having it.' },
      { q: 'What is Conventional Commits and what does it buy?', a: 'A message format — type(scope)!: description — with types feat, fix, docs, refactor, perf, test, build, ci, chore. It makes versioning mechanical: feat is a minor bump, fix a patch, a ! or BREAKING CHANGE footer a major. semantic-release, release-please and changesets consume it to version, changelog and publish automatically.' },
      { q: 'When is Conventional Commits not worth it?', a: 'When releases are not automated — then it is ceremony. And note it encodes the type of change, not its importance: a fix can matter more than a feat, so a generated changelog still needs editorial judgement.' },
      { q: 'What should a commit message say?', a: 'Why, not what — the diff already says what. Short imperative subject under ~50 characters, blank line, body wrapped at 72 covering motivation and context, plus a trailer like Fixes: #123. That is both the kernel and Git\'s own guidance.' },
      { q: 'GPG or SSH signing?', a: 'SSH signing (Git 2.34+) for most teams: gpg.format=ssh with your existing key, verified against an allowed-signers file, and supported by GitHub and GitLab. GPG is the original but key distribution and expiry make it heavy. Sigstore/gitsign is keyless — short-lived certs tied to an OIDC identity with a transparency log — and fits SLSA-style supply-chain requirements.' },
      { q: 'What does a "verified" badge actually prove?', a: 'That the commit was signed by a key the forge associates with that account. Not that the code is good, that the author reviewed it, or that the account is uncompromised. Since Git\'s author field is free text, an unsigned commit can claim any identity — which is why signatures should be required on protected branches, not merely permitted.' },
    ],
    references: [
      'https://git-scm.com/docs/githooks',
      'https://pre-commit.com/',
      'https://www.conventionalcommits.org/',
      'https://semantic-release.gitbook.io/',
      'https://git-scm.com/docs/git-config#Documentation/git-config.txt-gpgformat',
      'https://docs.sigstore.dev/cosign/signing/gitsign/',
      'https://developercertificate.org/',
    ],
  },

  // ── 12 ───────────────────────────────────────────────────────────────
  {
    id: 'git-worktrees-and-daily-workflow',
    title: 'Worktrees, Stash, and the Daily Workflow That Scales',
    icon: 'layers',
    color: '#eab308',
    questions: 10,
    description: 'Handling interruptions without losing context: worktrees for genuinely parallel checkouts, what stash really is and where it bites, fetch versus pull and why pull --rebase is a better default, plus the config that removes most day-to-day friction.',
    introduction: `## Overview
The interrupt is the defining event of a working day: you are mid-change and something urgent arrives. How you handle it determines how much context you lose.

The reflexive answer is git stash. It is often the wrong one. A stash is opaque (a name like "WIP on main: 3f2a1b" tells you nothing three days later), it is a stack that people push onto and never pop, it does not include untracked files unless you ask, and it forces you to keep switching one working directory back and forth.

**git worktree** is usually the better tool: it checks out a second branch into a second directory backed by the same repository. Both checkouts are live simultaneously, so the interrupt gets its own directory and the original work is never disturbed. No stashing, no context switch, no rebuild of the first tree when you come back.`,
    topics: [
      {
        title: 'Worktrees, and using stash correctly when you do use it',
        content: `**Worktrees.**

    git worktree add ../hotfix-tree hotfix-branch      # existing branch
    git worktree add -b urgent-fix ../urgent main      # create a branch too
    git worktree list
    git worktree remove ../hotfix-tree
    git worktree prune                                  # clean stale metadata

All worktrees share one object database, so this is far cheaper than a second clone — no re-fetch, and disk cost is only the checked-out files. Fetches and commits are immediately visible everywhere.

Where worktrees earn their keep:

- **Handling an interrupt** without touching the tree you are working in.
- **Long-running builds.** Keep a worktree pinned to main building while you develop elsewhere.
- **Bisecting** in a separate worktree, so your feature work is untouched while bisect checks out dozens of historical commits.
- **Comparing two versions side by side**, including running both at once.
- **Reviewing a PR** while keeping your own work live.

Constraints to know: **the same branch cannot be checked out in two worktrees** (Git refuses, which prevents divergent index states); worktrees are local, not shared or pushed; and they need occasional pruning after directories are deleted manually. Submodules and worktrees together remain awkward.

**Stash, when you do use it.** A stash is a real commit — in fact a small merge commit referenced by refs/stash — which is why it is recoverable via fsck after being dropped. The flags that matter:

    git stash push -m "descriptive message" -- path/  # name it, and scope it
    git stash -u                                      # include untracked files
    git stash -a                                      # include ignored files too
    git stash list
    git stash show -p stash@{1}                       # view the diff
    git stash apply stash@{1}                         # keep it in the list
    git stash pop                                     # apply and drop
    git stash branch new-branch stash@{1}             # apply onto a new branch

The two sharp edges: **-u is not the default**, so a plain git stash leaves new untracked files sitting in the tree, and people then switch branches and are confused about where they came from. And **pop drops the stash even if applying it produced conflicts** in some situations, so prefer apply followed by an explicit drop when the stash is valuable. Always use -m; an unlabelled stash more than a day old is usually deleted rather than understood.

**git stash branch** is the underused one: it creates a branch from the commit the stash was made on and applies the stash there, which is exactly what you want when a quick experiment turned into real work.`,
      },
      {
        title: 'Fetch, pull, and the configuration that removes daily friction',
        content: `**Fetch versus pull.** git fetch downloads objects and updates remote-tracking refs (origin/main) without touching your branch or working tree — always safe. git pull is fetch followed by an integration step, and that second half is where surprises live.

Plain git pull merges, producing a merge commit for every incidental sync. On a busy branch this creates a history full of "Merge branch main of github.com:..." commits that carry no information. **git pull --rebase** instead replays your local commits on top of the fetched ones, keeping history linear.

    git config --global pull.rebase true
    git config --global rebase.autoStash true

The second line matters: with autoStash, a rebase stashes dirty changes, rebases, and restores them, so pull --rebase stops failing because the tree is not clean. The caveat is the usual one — do not rebase commits others have already based work on — which is fine for the normal case of your own unpushed local commits.

Git 2.27+ warns when pull.rebase is unset precisely because there is no safe default; choosing explicitly is the point.

**Configuration worth setting once.** Each of these removes a recurring annoyance:

    # Safety
    git config --global merge.conflictStyle zdiff3      # show the merge base
    git config --global rerere.enabled true             # remember conflict resolutions
    git config --global push.default simple             # push only the current branch
    git config --global transfer.fsckObjects true       # verify objects on transfer

    # Ergonomics
    git config --global pull.rebase true
    git config --global rebase.autoStash true
    git config --global rebase.updateRefs true          # restack stacked branches
    git config --global rebase.autoSquash true          # honour fixup! commits
    git config --global diff.algorithm histogram        # better diffs than myers
    git config --global diff.colorMoved zebra           # distinguish moved code
    git config --global branch.sort -committerdate      # most recent branches first
    git config --global column.ui auto
    git config --global help.autocorrect prompt

    # Large repositories
    git config --global core.fsmonitor true
    git config --global fetch.writeCommitGraph true
    git maintenance start

Three of those repay explanation. **diff.algorithm=histogram** produces materially more readable diffs than the default myers, particularly on code with repeated structural lines. **diff.colorMoved=zebra** colours moved lines differently from added ones, which makes a refactor diff readable at a glance. And **branch.sort=-committerdate** turns git branch from an alphabetical list into a recency list, which is what you actually want.

**Credentials over HTTPS.** Pushing over HTTPS prompts for a token on every push until a credential helper is set. git config --global credential.helper cache keeps it in memory for fifteen minutes by default (cache --timeout=3600 for longer); store writes it to a plain-text file, which is only acceptable on a machine nobody else can read; osxkeychain on macOS, wincred on Windows and Git Credential Manager on all three use the platform keychain and are the right default. Over SSH the key does the work and no helper is involved.

**Exporting without a server.** git archive --format=tar.gz --output=release.tar.gz v1.4.0 writes the tree at a commit as an archive with no .git directory, which is what a release tarball or a deploy artefact should be; export-ignore in .gitattributes keeps test fixtures out of it. git bundle create repo.bundle --all packs the whole history into one file that another machine can clone or fetch from, which is how a repository crosses an air gap or an email attachment. Archive exports a snapshot; bundle exports history.

**A note on aliases.** Aliases for composite operations are worth it; aliases for single commands mostly train you out of fluency. The genuinely useful ones tend to be log formats:

    git config --global alias.lg "log --graph --abbrev-commit --decorate --format=format:'%C(bold blue)%h%C(reset) %C(dim white)%an%C(reset) %C(auto)%d%C(reset) %s'"
    git config --global alias.last "log -1 HEAD --stat"
    git config --global alias.unstage "restore --staged --"

**Finally, prefer switch and restore over checkout.** git checkout was overloaded to do two unrelated things — change branches and discard file changes — which is why "I ran checkout and lost my work" is such a common story. Git 2.23 split it: **git switch** changes branches, **git restore** changes files. Using them makes the destructive operation explicit rather than incidental.`,
      },
    ],
    quickFire: [
      { q: 'Why prefer a worktree over a stash for an interrupt?', a: 'A worktree checks the other branch out into a second directory backed by the same repository, so both are live at once — no stashing, no context switch, no rebuild of the first tree. Stashes are opaque, stack up unpopped, and force one directory to serve two tasks.' },
      { q: 'What do worktrees share, and what does that save?', a: 'One object database. So there is no re-fetch and the only extra disk cost is the checked-out files, unlike a second clone. Commits and fetches are visible from every worktree immediately.' },
      { q: 'What are the worktree constraints?', a: 'The same branch cannot be checked out in two worktrees — Git refuses, preventing divergent index states. They are local and not shared or pushed, need git worktree prune after manual directory deletion, and remain awkward with submodules.' },
      { q: 'What is a stash, really?', a: 'A real commit — a small merge commit referenced by refs/stash — which is why a dropped stash is recoverable via git fsck --unreachable.' },
      { q: 'What are the two sharp edges of stash?', a: '-u is not the default, so plain git stash leaves untracked files in the tree; and pop drops the stash even when applying produced conflicts in some cases, so prefer apply then an explicit drop for anything valuable. Always use -m — an unlabelled stash is usually deleted rather than understood.' },
      { q: 'What is git stash branch for?', a: 'It creates a branch from the commit the stash was made on and applies the stash there — exactly what you want when a quick experiment turned into real work, and it sidesteps conflicts from the branch having moved on.' },
      { q: 'Fetch versus pull?', a: 'fetch downloads objects and updates remote-tracking refs without touching your branch or working tree, so it is always safe. pull is fetch plus an integration step, and that step is where the surprises are.' },
      { q: 'Why pull.rebase true?', a: 'Plain pull merges, producing an uninformative "Merge branch main of..." commit on every sync. Rebase replays your local commits on top instead, keeping history linear. Pair it with rebase.autoStash so it stops failing on a dirty tree.' },
      { q: 'Name three config settings that materially improve daily Git.', a: 'merge.conflictStyle=zdiff3 (shows the merge base, making resolutions decidable), rerere.enabled=true (stops re-resolving identical conflicts), and diff.algorithm=histogram with diff.colorMoved=zebra (far more readable diffs, and moved code distinguished from added code).' },
      { q: 'Why use switch and restore instead of checkout?', a: 'checkout was overloaded to both change branches and discard file changes, which is why "I ran checkout and lost my work" is so common. Git 2.23 split it — switch for branches, restore for files — making the destructive operation explicit rather than incidental.' },
    ],
    references: [
      'https://git-scm.com/docs/git-worktree',
      'https://git-scm.com/docs/git-stash',
      'https://git-scm.com/docs/git-pull#Documentation/git-pull.txt---rebasefalsetruemergesinteractive',
      'https://git-scm.com/docs/git-switch',
      'https://git-scm.com/docs/git-restore',
      'https://git-scm.com/docs/git-config#Documentation/git-config.txt-diffalgorithm',
      'https://git-scm.com/docs/git-maintenance',
      'https://www.atlassian.com/git/tutorials/syncing',
      'https://kodekloud.com/blog/git-interview-questions/',
    ],
  },

  // ── 13 ───────────────────────────────────────────────────────────────
  {
    id: 'git-learn-branching-course',
    title: 'Learn Git Branching — All 36 Levels, with Goal and Solution',
    icon: 'gitBranch',
    color: '#3b82f6',
    questions: 12,
    description: 'A level-by-level companion to learngitbranching.js.org, the interactive tutorial that animates the commit graph: the Main tab (Introduction, Ramping Up, Moving and Staging Work, A Mixed Bag, Advanced Topics — 20 levels) and the Remote tab (Push & Pull, To Origin And Beyond — 16 levels), each with its id, the concept it teaches, the goal tree and the shortest solution, plus start-to-goal diagrams for the levels where the picture is the lesson.',
    introduction: `## Overview
[learngitbranching.js.org](https://learngitbranching.js.org/) is the most effective Git tutorial available because of one design decision: **it draws the commit graph and animates every command against it.** You type real Git, watch the nodes and pointers move, and then have to reproduce a target graph yourself. Most Git confusion is not syntax; it is having no picture of what the graph looks like before and after an operation. The site supplies the picture.

The level dialog has two tabs. **Main** holds five sequences and 20 levels: Introduction Sequence (4), Ramping Up (4), Moving and Staging Work (4), A Mixed Bag (5) and Advanced Topics (3). **Remote** holds two sequences and 16 levels: Push & Pull -- Git Remotes! (8) and To Origin And Beyond -- Advanced Git Remotes! (8). Nothing is optional and there are no side levels; 36 in all. Level ids are the sequence key plus a number, so level intro1 or level remoteAdvanced8 jumps straight to one.

Commands that matter in the app itself: levels opens the tree; level <id> jumps; objective re-shows the task; show goal and hide goal toggle the target graph; hint prints the hint; show solution fills in the solution (running it forfeits best-solution credit); help level replays the teaching slides; undo reverses one command; reset restores the start; sandbox leaves the level. Commit ids are C0, C1, C2 and so on; a copy made by rebase, cherry-pick, revert or --amend gets an apostrophe (C2 becomes C2', then C2''), and the original stays drawn, faded when nothing reaches it. The remote is drawn as o/main because origin/main does not fit in a node; commands still say origin. Levels count commands for a golf score; git status, git log and git show are free.

This topic lists every level in order with what it is really teaching, the goal in one line, and the solution, so it works as a companion while you play and as a revision sheet afterwards. The diagrams show the start and goal trees for the levels where the shape of the graph is the whole lesson.`,
    topics: [
      {
        title: 'Main tab — Introduction, Ramping Up, Moving and Staging Work (12 levels)',
        image: '/diagrams/git/lgb-intro3-merge.png',
        content: `**Introduction Sequence.** Four levels that establish the graph: a commit is a node with a parent, a branch is a pointer, a merge is a node with two parents, a rebase is a copy.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| intro1 | Introduction to Git Commits | A commit is a snapshot with a parent pointer; commits chain downward in the drawing | C1 → C2 → C3 on main | git commit; git commit |
| intro2 | Branching in Git | A branch is a pointer to a commit, nothing more; git branch creates, git checkout moves HEAD onto it; git checkout -b does both | bugFix at C1, checked out | git branch bugFix; git checkout bugFix |
| intro3 | Merging in Git | git merge writes a commit with two parents; following arrows up from main now reaches every commit; merging main into bugFix afterwards is a fast-forward | C2 on bugFix, C3 on main, C4 with parents C3 and C2 | git checkout -b bugFix; git commit; git checkout main; git commit; git merge bugFix |
| intro4 | Rebase Introduction | Rebase copies commits onto a new base; the original fades, the copy is C2'; a linear line results | C2' on top of C3, bugFix on C2', main still on C3 | git checkout -b bugFix; git commit; git checkout main; git commit; git checkout bugFix; git rebase main |

The site notes that lessons keep git checkout because git switch was experimental when they were written; git switch and git switch -c work in the app.

**Ramping Up.** Four levels on moving HEAD precisely and on the two ways to undo.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| rampup1 | Detach yo' HEAD | HEAD normally points at a branch; git checkout <commit> attaches it to the commit instead; that is detached HEAD | HEAD on C4 directly | git checkout C4 |
| rampup2 | Relative Refs (^) | ^ moves to the parent, ^^ to the grandparent; works from any branch or HEAD; hashes only need enough characters to be unique | HEAD on C3, the parent of bugFix | git checkout bugFix^ |
| rampup3 | Relative Refs #2 (~) | ~n moves n commits back; git branch -f <branch> <ref> relocates a branch by force (real Git refuses it on the checked-out branch) | main to C6, bugFix to C0, HEAD detached on C1 | git branch -f main C6; git checkout HEAD~1; git branch -f bugFix HEAD~1 |
| rampup4 | Reversing Changes in Git | git reset moves a branch backwards, rewriting local history; git revert adds C2' that undoes C2 and can be shared; pushed is a remote branch and local is not, which decides the tool | local back on C1, pushed on a revert commit C2' | git reset HEAD~1; git checkout pushed; git revert HEAD |

^2 for the second parent of a merge is not taught here; it arrives in Multiple parents below.

**Moving and Staging Work.** Four levels. The first two move commits; the second two, added recently, teach the staging area with real filenames next to each commit.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| move1 | Cherry-pick Intro | git cherry-pick <c1> <c2> ... copies the named commits below HEAD in order; the copies get apostrophes | C3', C4', C7' chained under C1 with main on C7' | git cherry-pick C3 C4 C7 |
| move2 | Interactive Rebase Intro | git rebase -i opens the list of commits to be copied; in the app you can reorder by drag and toggle pick to drop; real Git also squashes, rewords and edits | C3', C5', C4' under overHere with C2 dropped | git rebase -i overHere, then order C3, C5, C4 and unpick C2 |
| move3 | The Staging Area | Three zones: working directory, staging area (the loading dock), repository; git add chooses what rides along; git status lists modified files; .gitignore keeps files out for good | C2 containing app.js, C3 containing styles.css | git add app.js; git commit; git add styles.css; git commit |
| move4 | Undoing with git restore | git restore --staged <file> unstages and keeps the edit; git restore <file> discards the edit; these replace git reset HEAD <file> and git checkout -- <file> | one commit with app.js only; secret.env left modified and unstaged | git restore --staged secret.env; git restore experiment.js; git commit |

Cherry-pick when you know exactly which commits you want; interactive rebase when you want to review a range and decide there. The mixed1 level below shows both solving the same problem.`,
      },
      {
        title: 'Main tab — A Mixed Bag and Advanced Topics (8 levels)',
        image: '/diagrams/git/lgb-advanced2-multiple-parents.png',
        content: `**A Mixed Bag.** Five levels of realistic combinations.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| mixed1 | Grabbing Just 1 Commit | Debug and print commits sit under the fix; fast-forwarding main would bring them along; copy only the one commit | C4' under C1 with main and bugFix on it | git rebase -i main and keep only C4, then git rebase bugFix main; or git checkout main; git cherry-pick C4 |
| mixed2 | Juggling Commits | Amend a commit deep in a stack: rebase -i to bring it to the top, git commit --amend, rebase -i back, then move main; each move adds an apostrophe and the amend adds another; grading is on structure and relative apostrophes only | main on C1 → C2''' → C3'' | git rebase -i HEAD~2 (order C3, C2); git commit --amend; git rebase -i HEAD~2 (order C2'', C3'); git rebase caption main |
| mixed3 | Juggling Commits #2 | The same with cherry-pick, which avoids the reordering and its conflict risk: pick, amend, pick the next | main on C1 → C2'' → C3' | git checkout main; git cherry-pick C2; git commit --amend; git cherry-pick C3 |
| mixed4 | Git Tags | Tags mark a commit permanently and never move; git tag <name> with no ref uses HEAD; checking out a tag is detached HEAD because you cannot commit onto it | v1 at C2, v0 at C1, HEAD on v1 | git tag v1 side~1; git tag v0 main~2; git checkout v1 |
| mixed5 | Git Describe | git describe <ref> prints <tag>-<n>-g<hash>: nearest ancestor tag, commits since it, the hash; useful after a bisect or on a colleague's machine | one more commit on bugFix | git commit |

The describe output uses hyphens, for example v1-2-gC6 in the level and v1.0.0-14-gabc1234 in a real repository. Build systems embed it in version strings precisely because it answers "where am I relative to a release".

**Advanced Topics.** Three levels, each genuinely hard. Two of them do teach new syntax.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| advanced1 | Rebasing over 9000 times | Rebase four scattered branches into one line, in order; git rebase <base> <branch> checks out the branch and rebases it in one command; update main only at the end | C2 → C3' → C4' → C5' → C6' → C7' with every branch on the line | git rebase main bugFix; git rebase bugFix side; git rebase side another; git rebase another main |
| advanced2 | Multiple parents | ^ takes a number that selects which parent of a merge to follow (^2 is the second parent), unlike ~ which counts steps; modifiers chain: main^^2^ means first parent, then second parent, then first parent | a branch bugWork at C2 | git branch bugWork main^^2^ |
| advanced3 | Branch Spaghetti | Three branches need three different rewrites: one is a reorder plus a drop, two is a pure reorder, three is a single commit moved; cherry-pick expresses all of them | one: C4' → C3' → C2'; two: C5' → C4'' → C3'' → C2''; three at C2 | git checkout one; git cherry-pick C4 C3 C2; git checkout two; git cherry-pick C5 C4 C3 C2; git branch -f three C2 |

Finishing Advanced Topics is a fair signal that you can reason about the graph rather than recall recipes. They repay a second visit after a few months of real use.`,
      },
      {
        title: 'Remote tab — Push & Pull, and To Origin And Beyond (16 levels)',
        image: '/diagrams/git/lgb-remoteadv1-vs-2.png',
        content: `**Push & Pull -- Git Remotes!** Eight levels. The app introduces two commands that are not Git: git fakeTeamwork [branch] [n] adds n commits to the remote as if a colleague pushed, and git fakeCreateRemote turns a sandbox into a local-plus-origin pair for demos.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| remote1 | Clone Intro | A remote is a copy of the repository elsewhere; clone sets everything up; o/main records where the remote's main was at clone time | local copy with o/main at C1 | git clone |
| remote2 | Remote Branches | o/main is a remote branch: it reflects the remote as of your last contact, lives in your local repository, and checking it out is detached HEAD; committing there does not move it | C3 on main; C4 committed on a detached HEAD off o/main | git commit; git checkout o/main; git commit |
| remote3 | Git Fetchin' | fetch does exactly two things: downloads commits the remote has that you lack, and moves the o/ branches; it changes no local branch and no file | C4–C7 downloaded; o/main at C5, o/bugFix at C7; main and bugFix unchanged | git fetch |
| remote4 | Git Pullin' | Fetched commits are ordinary commits; merge, rebase or cherry-pick them; git pull is fetch plus merge; since Git 2.34 a bare pull on a diverged branch stops and asks, --no-rebase merges, --rebase rebases | merge commit C4 with parents C2 and C3, o/main at C3 | git pull |
| remote5 | Faking Teamwork | Simulate a colleague, then integrate | clone, two fake commits, one local commit, a pull merge C5 | git clone; git fakeTeamwork 2; git commit; git pull |
| remote6 | Git Pushin' | push uploads your commits, moves the remote branch and your o/ mirror; a bare push depends on push.default, assumed to be upstream | C2 and C3 on both sides | git commit; git commit; git push |
| remote7 | Diverged History | The remote moved while you worked, so push is refused; integrate first; four routes: fetch + rebase o/main + push, fetch + merge o/main + push, pull --rebase + push, pull + push; the level wants the rebase route | C3 rebased as C3' on top of the remote's C2, pushed | git clone; git fakeTeamwork; git commit; git pull --rebase; git push |
| remote8 | Locked Main | Push to main is rejected because policy requires a pull request; put the commits on a branch, push it, and set local main back to o/main so the next pull does not conflict | main back on C1, feature at C2 pushed as o/feature | git branch -f main o/main; git checkout -b feature C2; git push origin feature |

**To Origin And Beyond -- Advanced Git Remotes!** Eight levels. The first two are the clearest rebase-versus-merge pair on the site: identical start, one ends as a straight line, the other as a chain of merge commits.

| id | Level | What it teaches | Goal | Solution |
| --- | --- | --- | --- | --- |
| remoteAdvanced1 | Push Main! | Feature-branch workflow with rebasing: fetch, chain side1, side2, side3 onto o/main in order, fast-forward main, push | C8 → C2' → C3' → C4' → C5' → C6' → C7' pushed | git fetch; git rebase o/main side1; git rebase side1 side2; git rebase side2 side3; git rebase side3 main; git push |
| remoteAdvanced2 | Merging with remotes | The same integration by merging: cleaner truth, busier graph; the author prefers rebasing and calls it a preference | merge commits C9, C10, C11 pushed | git checkout main; git pull; git merge side1; git merge side2; git merge side3; git push |
| remoteAdvanced3 | Remote Tracking | main pulls into and pushes to o/main because clone set it to track; any branch can track: git checkout -b side o/main, or git branch -u o/main side afterwards; push then goes to remote main from a branch not called main | side tracking o/main with C3' pushed to remote main | git checkout -b side o/main; git commit; git pull --rebase; git push |
| remoteAdvanced4 | Git push arguments | git push <remote> <place>: the place names both source and destination, and where you are checked out is ignored; a bare push from detached HEAD fails | remote main at C2 and foo at C3 without checking out | git push origin main; git push origin foo |
| remoteAdvanced5 | Git push arguments -- Expanded! | git push origin <source>:<destination>, the colon refspec; the source can be any expression such as main^; a missing destination is created | remote main at C4, remote foo at C5, C6 never sent | git push origin main^:foo; git push origin foo:main |
| remoteAdvanced6 | Fetch arguments | The mirror image: git fetch origin foo lands on o/foo, never on foo; with <source>:<destination> the source is on the remote and the destination is a local branch, which fetch will write to unless it is checked out; the o/ pointers do not move | local foo at C3 merged with C6 as C7, main at C6; o/main and o/foo unchanged | git fetch origin C3:foo; git fetch origin C6:main; git checkout foo; git merge main |
| remoteAdvanced7 | Source of nothing | An empty source is legal both ways: git push origin :foo deletes the remote branch, git fetch origin :bar creates an empty local one | remote foo deleted, local bar created | git push origin :foo; git fetch origin :bar |
| remoteAdvanced8 | Pull arguments | pull is fetch with the same arguments, then merge where the commits landed; git pull origin foo is fetch origin foo then merge o/foo; git pull origin bar:bugFix is fetch origin bar:bugFix then merge bugFix; the merge goes into the checked-out branch | foo at C3 and side at C2 created, main merges them as C5 and C6 | git pull origin C3:foo; git pull origin C2:side |

**How to use the site well.** Do the Introduction and Ramping Up sequences until the picture is automatic. Then, whenever a real problem confuses you at work, reproduce it in the sandbox with git fakeCreateRemote and git fakeTeamwork and watch what each command does to the graph. That transfer step is what turns the tutorial into working knowledge. The remotes topic earlier in this category is the prose version of the Remote tab.`,
      },
    ],
    visualizations: [
      { title: 'intro4 — Rebase Introduction: the copy chains onto main and the original fades', image: '/diagrams/git/lgb-intro4-rebase.png', content: 'Start: C2 on bugFix and C3 on main, both from C1. After git rebase main on bugFix, C2\' sits under C3 with bugFix on it; C2 is still drawn but reachable from nothing.' },
      { title: 'rampup4 — Reversing Changes: reset moves a pointer back, revert adds a commit', image: '/diagrams/git/lgb-rampup4-reset-revert.png', content: 'local moves back from C3 to C1 and C3 fades: that is reset. pushed gains C2\' on top of C2 that undoes it: that is revert, the shareable undo.' },
      { title: 'move1 — Cherry-pick Intro: three commits copied from three branches', image: '/diagrams/git/lgb-move1-cherry-pick.png', content: 'git cherry-pick C3 C4 C7 creates C3\', C4\', C7\' in a chain under C1 and moves main to the last copy. The originals on bugFix, side and another are untouched.' },
      { title: 'move2 — Interactive Rebase Intro: reorder and drop', image: '/diagrams/git/lgb-move2-rebase-i.png', content: 'A straight C1..C5 becomes C3\', C5\', C4\' under overHere, with C2 dropped. Every original is left in place, faded.' },
      { title: 'mixed1 — Grabbing Just 1 Commit: only the fix, not the debug commits', image: '/diagrams/git/lgb-mixed1-grab-one.png', content: 'The stack debug, printf, bugFix sits above main. Only C4\' is copied under C1 and both main and bugFix point at it; the debug and print commits stay behind.' },
      { title: 'advanced1 — Rebasing over 9000 times: four branches into one line', image: '/diagrams/git/lgb-advanced1-rebase-9000.png', content: 'bugFix, side and another are rebased one after the other, then main is rebased onto the result. Each rebased commit gets an apostrophe; the result is C2 → C3\' → C4\' → C5\' → C6\' → C7\'.' },
      { title: 'remoteAdvanced6 — Fetch arguments: commits land on local branches and the ids swap', image: '/diagrams/git/lgb-remoteadv6-fetch-args.png', content: 'git fetch origin C3:foo puts the remote main\'s commits on local foo; git fetch origin C6:main puts the remote foo\'s commits on local main. o/main and o/foo do not move, and C4 is never downloaded.' },
    ],
    quickFire: [
      { q: 'How is the tutorial organised, and how many levels are there?', a: 'Two tabs. Main: Introduction Sequence (4), Ramping Up (4), Moving and Staging Work (4), A Mixed Bag (5), Advanced Topics (3), 20 levels. Remote: Push & Pull (8) and To Origin And Beyond (8), 16 levels. 36 in total, none optional, addressed as level <sequence><n> such as level rampup3.' },
      { q: 'What is a branch, in the tutorial\'s phrasing?', a: 'A pointer to a specific commit, nothing more, which is why you should branch early and often. Its "contents" are whatever is reachable by walking parents from the commit it points at. git branch creates the pointer; git checkout moves HEAD onto it.' },
      { q: 'What does the apostrophe on a commit id mean?', a: 'That the commit is a copy made by rebase, cherry-pick, revert or --amend: C2 becomes C2\', then C2\'\' if copied again. The original stays in the graph, faded when nothing reaches it. Hash-agnostic levels grade on relative apostrophe counts, so a commit amended after two moves must carry one more than its neighbour.' },
      { q: 'reset versus revert, as rampup4 frames it?', a: 'reset moves a branch pointer backwards as if the commits never happened: fine for a local branch. revert creates a new commit that undoes an earlier one, leaving history intact: the right choice for a pushed branch. The level gives you one of each and expects you to choose by the branch name.' },
      { q: 'Difference between ^ and ~, and where is ^2 taught?', a: '^ moves to the parent; ~n moves n first-parents back. ^ with a number selects which parent of a merge to follow, so main^2 is the merged-in side, and that is taught in Multiple parents (advanced2), not in the Relative Refs levels. Modifiers chain: main^^2^.' },
      { q: 'What does git branch -f do?', a: 'Reassigns a branch to a commit by force: git branch -f main HEAD~3 moves main three parents back without checking anything out. The app allows it on the checked-out branch; real Git does not.' },
      { q: 'What does git describe print?', a: '<tag>-<numCommits>-g<hash> with hyphens: the nearest ancestor tag, how many commits you are past it, and the hash. In the Git Describe level, git describe bugFix prints v1-2-gC6. Build systems embed it in version strings.' },
      { q: 'What is o/main and why is it drawn that way?', a: 'The tutorial\'s abbreviation for origin/main, because the full name does not fit in a node; commands still use origin. It is a remote branch: your record of where the remote\'s main was at your last contact, updated by fetch, pull and push, never by a local commit. Checking it out is detached HEAD.' },
      { q: 'Your push was rejected in Diverged History. What are the four routes?', a: 'fetch then rebase o/main then push; fetch then merge o/main then push; pull --rebase then push; pull then push. The first and third give a straight line with your commit copied as C3\'; the second and fourth give a merge commit. The level wants the rebase route.' },
      { q: 'What does git push origin main^:foo do?', a: 'Resolves main^ locally, uploads whatever commits the remote lacks, and points the remote branch foo at that commit, creating it if it does not exist. The source of a colon refspec can be any expression; the destination is created on demand.' },
      { q: 'Why does git fetch origin foo update o/foo and not foo?', a: 'A deliberate exception: you might have work on foo you do not want disturbed, so fetch never writes to a local non-remote branch unless you name it explicitly with a colon refspec such as git fetch origin foo:foo, and even then it refuses if foo is checked out.' },
      { q: 'What is the final level of the tutorial, and what does it teach?', a: 'Pull arguments (remoteAdvanced8). git pull with arguments is fetch with those arguments followed by a merge into the checked-out branch: git pull origin foo is fetch origin foo then merge o/foo; git pull origin bar:bugFix is fetch origin bar:bugFix then merge bugFix. Locked Main is the last level of Push & Pull, not of the course.' },
    ],
    references: [
      'https://learngitbranching.js.org/',
      'https://github.com/pcottle/learnGitBranching',
      'https://github.com/pcottle/learnGitBranching/tree/main/src/levels',
      'https://git-scm.com/docs/gitrevisions',
      'https://git-scm.com/docs/git-describe',
      'https://git-scm.com/docs/git-push#Documentation/git-push.txt-ltrefspecgt82308203',
      'https://git-scm.com/docs/git-fetch#Documentation/git-fetch.txt-ltrefspecgt',
    ],
  },

  // ── 14 ───────────────────────────────────────────────────────────────
  {
    id: 'git-submodules-and-vendoring',
    title: 'Submodules and Vendoring — the Gitlink Model in Practice',
    icon: 'package',
    color: '#0d9488',
    questions: 11,
    description: 'Submodules break in the same few ways every time, and all of them follow from where the three pieces of state live. The gitlink, .gitmodules and .git/config; init, update and --remote; recursive CI checkout with private credentials; removing one cleanly; and the migrations out.',
    introduction: `## Overview
A submodule is one repository pinned inside another **at an exact commit**. That pin is the whole feature and the whole problem: it gives byte-exact reproducibility of a composition, and it means the parent repository tracks a SHA rather than a branch, which is not what most people assume when they first use one.

Nearly every submodule failure — the empty directory after clone, the commit that vanished, the stale pointer merged into main, the URL change that did nothing — comes from the same root cause: **the state is split across three places, and updating one does not update the others.** Learn where those three live and the rest of the topic becomes mechanical.

Submodules also carry a reputation they only partly deserve. They are genuinely awkward for a co-developed dependency that changes daily. They are the correct tool, with no real alternative, when a build must pin an exact source revision — firmware, OS images, vendored code with no package manager, or a licence boundary that forbids copying code into the parent tree.`,
    topics: [
      {
        title: 'Three places the state lives — and every consequence that follows',
        image: '/diagrams/git/topic-submodule-state.png',
        content: `**1. The gitlink.** In the parent's tree there is an entry with mode **160000** whose value is a commit SHA in the child repository. This is not a file and not a directory — it is a pointer, and it is what git commit in the parent records. Running git ls-tree HEAD shows it plainly, and it is worth doing once because seeing mode 160000 next to a bare SHA explains most submodule behaviour immediately.

**2. .gitmodules.** A tracked file at the root of the parent, mapping a submodule name to its path, its URL, and optionally a branch. Because it is tracked, it is shared with everyone who clones — it is the *declaration*.

**3. .git/config.** Your clone's local configuration, which is what git actually uses to fetch. It is populated from .gitmodules by git submodule init, and it is **not** shared.

The consequences follow directly:

**A fresh clone leaves submodule directories empty.** Cloning the parent gets the gitlink and .gitmodules but does not fetch the child. Either clone with --recurse-submodules, or afterwards:

    git submodule update --init --recursive

The --recursive matters when submodules nest; --init copies .gitmodules into .git/config for any submodule not yet initialised.

**Changing a URL in .gitmodules appears to do nothing.** Because your clone fetches using .git/config, which still holds the old URL. The command that copies the new value across is:

    git submodule sync --recursive

This is the answer to "we moved the repo and everyone is still hitting the old host", and it is not discoverable from the error message.

**A submodule sits in detached HEAD, by design.** git submodule update checks out the exact recorded SHA, which is a commit, not a branch. Work committed inside a submodule without first checking out a branch is therefore unreferenced the moment you switch away, and this is the most common way people genuinely lose work with submodules. Always git switch to a branch inside the submodule before committing. (If it does happen, the commit is still in the submodule's reflog — see recovery.)

**Updating is two commits in two repositories.** Commit in the child, push it, then in the parent stage the moved gitlink and commit that. Skipping the child push produces the classic broken state: the parent references a SHA nobody else can fetch, so every other clone fails with a fetch error naming a commit that appears not to exist.

**git submodule update vs --remote.** Plain update moves the working tree *to the SHA the parent already records* — it is how you get to the pinned state. **--remote** ignores the recorded SHA, fetches the configured branch (submodule.<name>.branch in .gitmodules, defaulting to the remote's HEAD) and checks out its tip. That leaves the gitlink modified in the parent, which you must then commit; without that commit nothing has actually been updated for anyone else. Confusing these two accounts for most "I updated it and it reverted" reports.

**Configuration worth setting**, because the defaults are unhelpful:

    git config --global submodule.recurse true        # switch/pull/checkout move submodules too
    git config --global status.submoduleSummary true  # parent status shows a moved submodule
    git config --global diff.submodule log            # show commits, not two raw SHAs
    git config --global push.recurseSubmodules check  # refuse a push whose child commits are unpushed

The last one is the single highest-value setting: **push.recurseSubmodules=check** makes Git refuse to push a parent commit whose submodule SHA has not been pushed, which prevents the broken-reference state entirely. Use on-demand instead if you want Git to push the child for you.

Without submodule.recurse, switching branches in the parent leaves the submodule at the old commit, so the working tree is a mix of two revisions and git status reports a modified submodule you did not touch — the second most common confusion after detached HEAD.`,
      },
      {
        title: 'CI, clean removal, and the migrations out',
        content: `**CI checkout.** The default checkout in most CI systems does **not** fetch submodules, so a build that works locally fails in CI with missing files. In GitHub Actions:

    - uses: actions/checkout@v4
      with:
        submodules: recursive
        fetch-depth: 0

For a **private** submodule the credential is the real problem: the job's default token is scoped to the current repository only, so a private sibling fails to authenticate. The options, roughly in order of preference, are a GitHub App installation token scoped to both repositories, a deploy key per submodule, or a PAT stored as a secret. Note also that submodule URLs are commonly SSH while CI authenticates over HTTPS; rather than editing .gitmodules, rewrite at fetch time:

    git config --global url."https://x-access-token:$TOKEN@github.com/".insteadOf "git@github.com:"

**Shallow submodules** cut checkout time when history is not needed:

    git submodule update --init --recursive --depth 1

with the same caveat as any shallow clone — bisect and blame inside the submodule stop working, so do not use it on a job that has to investigate history.

**Removing a submodule cleanly** is a four-step sequence, and skipping the last step is why a re-added submodule at the same path fails with "already exists in the index":

    git submodule deinit -f path/to/sub     # clear it from .git/config, empty the working tree
    git rm -f path/to/sub                   # remove the gitlink and the .gitmodules entry
    rm -rf .git/modules/path/to/sub         # the child repo's real storage lives here
    git commit -m "Remove submodule"

Git keeps each submodule's actual repository under .git/modules, not inside the submodule directory — the directory contains only a .git *file* pointing there. That indirection is why deleting the folder achieves nothing, and why the stale metadata blocks re-adding later.

**The breakages you will actually meet:**

- **Empty directory after clone** — nobody ran --init. The fix is the clone flag or submodule update --init --recursive.
- **Fetch fails on a commit that does not exist** — a parent commit references a child SHA that was never pushed. Fix in the child, and prevent it with push.recurseSubmodules=check.
- **Modified submodule you did not touch** — a parent branch switch without submodule.recurse. Run git submodule update to bring it back to the recorded commit.
- **A commit vanished inside the submodule** — committed on detached HEAD. Recover it from the submodule's own reflog and put a branch on it.
- **A stale pointer merged to main** — someone committed the parent while their submodule was behind. status.submoduleSummary and a CI check that the recorded SHA is reachable on the child's main branch both catch this.
- **Merge conflict on the gitlink itself** — two branches moved the submodule to different commits. Git cannot merge a pointer, so resolve it by choosing: check out the intended commit inside the submodule, then git add the path in the parent.

**Migrating out.** Two destinations, both one-way in practice:

- **To subtree.** git subtree add --prefix=path <url> <ref> --squash copies the content into the parent's tree. Consumers then need no special commands and no init step at all, which is the main appeal; the cost is that pulling upstream changes later is a manual git subtree pull and the histories intertwine. Suits vendoring something you rarely update.
- **To a monorepo.** Use git-filter-repo with --to-subdirectory-filter on the child to rewrite its history under the target path, then merge it into the parent with --allow-unrelated-histories. This preserves the child's history, which a plain copy does not, and it is the right move when the two repositories are genuinely co-developed.

**When to keep them.** Submodules remain correct where the requirement is an exact, auditable source pin: firmware and OS image builds, a vendored dependency with no package manager, a licence boundary that forbids mixing trees, or large assets kept out of the main repository. **What they should not be is a substitute for a package manager** — if the dependency has releases and a version number, depend on it as a package and let the resolver do the work.`,
      },
    ],
    quickFire: [
      { q: 'Where does a submodule store its state?', a: 'Three places: the gitlink (a tree entry with mode 160000 holding the child commit SHA), .gitmodules (tracked — name, path, URL, optional branch, shared with everyone), and .git/config (local, populated by submodule init, and what Git actually fetches with). Nearly every submodule problem is one of these being out of step with the others.' },
      { q: 'Why is the submodule directory empty after cloning?', a: 'A clone fetches the gitlink and .gitmodules but not the child repository. Use git clone --recurse-submodules, or afterwards git submodule update --init --recursive — --init copies .gitmodules into .git/config, --recursive handles nesting.' },
      { q: 'You changed a submodule URL in .gitmodules and nothing happened. Why?', a: 'Git fetches using .git/config, which still holds the old URL. git submodule sync --recursive copies the new value across. This is the fix for "we moved the repo and everyone still hits the old host", and the error message does not hint at it.' },
      { q: 'Why is a submodule in detached HEAD, and why does that matter?', a: 'Because submodule update checks out an exact recorded commit, not a branch. Anything committed there is unreferenced as soon as you switch away, which is the most common way work is genuinely lost with submodules. Switch to a branch inside the submodule before committing; if you forget, the commit is still in the submodule’s reflog.' },
      { q: 'Difference between git submodule update and --remote?', a: 'Plain update moves the working tree to the SHA the parent already records — it gets you to the pinned state. --remote ignores that, fetches the configured branch (submodule.<name>.branch, defaulting to the remote HEAD) and checks out its tip, leaving the gitlink modified so you must commit it in the parent. Confusing the two produces "I updated it and it reverted".' },
      { q: 'What is the single most valuable submodule setting?', a: 'push.recurseSubmodules=check — Git refuses to push a parent commit whose submodule SHA has not been pushed, which prevents the broken state where the parent references a commit nobody else can fetch. Use on-demand if you want Git to push the child for you.' },
      { q: 'Why does the parent show a modified submodule you never touched?', a: 'A branch switch in the parent moved the gitlink but not the submodule working tree, because submodule.recurse is not enabled. Set submodule.recurse=true so switch, pull and checkout move submodules too; git submodule update restores the recorded commit in the meantime.' },
      { q: 'How do you remove a submodule properly?', a: 'Four steps: git submodule deinit -f <path>, git rm -f <path>, rm -rf .git/modules/<path>, then commit. The child repository actually lives under .git/modules — the submodule folder holds only a .git file pointing there — so skipping the third step leaves metadata that blocks re-adding the same path later.' },
      { q: 'A private submodule fails to authenticate in CI. What are the options?', a: 'The default job token is scoped to the current repository only. Use a GitHub App installation token scoped to both repos, a per-submodule deploy key, or a PAT secret. Also note submodule URLs are often SSH while CI uses HTTPS — rewrite with url.<https>.insteadOf at fetch time rather than editing .gitmodules.' },
      { q: 'How do you resolve a conflict on the gitlink itself?', a: 'Git cannot merge a pointer, so there is nothing to merge — decide which commit is correct, check that commit out inside the submodule, then git add the submodule path in the parent to record the choice.' },
      { q: 'When are submodules the right tool, and when are they not?', a: 'Right when you need an exact auditable source pin: firmware and OS image builds, vendored code with no package manager, a licence boundary that forbids mixing trees, or large assets kept out of the main repo. Wrong as a substitute for a package manager — if the dependency has releases and a version number, depend on it as a package.' },
    ],
    references: [
      'https://git-scm.com/book/en/v2/Git-Tools-Submodules',
      'https://git-scm.com/docs/git-submodule',
      'https://git-scm.com/docs/gitmodules',
      'https://git-scm.com/docs/git-config#Documentation/git-config.txt-pushrecurseSubmodules',
      'https://github.com/actions/checkout#checkout-submodules',
      'https://git-scm.com/docs/git-subtree',
      'https://www.atlassian.com/git/tutorials/git-submodule',
    ],
  },
];

export const gitTopicCategoryMap = Object.fromEntries(
  gitTopics.map((t) => [t.id, 'git']),
);

export const gitCategories = devopsCategories.filter((c) => c.id === 'git');
