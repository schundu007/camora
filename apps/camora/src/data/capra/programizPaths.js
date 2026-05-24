// Curated Programiz Python tutorial paths.
// Each entry links to the canonical programiz.com tutorial page.

export const PROGRAMIZ_PATHS = [
  // ── Basics ───────────────────────────────────────────────────────────────
  { slug: 'pz-introduction',         title: 'Python Introduction',              category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/introduction' },
  { slug: 'pz-variables-datatypes',  title: 'Variables & Data Types',           category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/variables-datatypes' },
  { slug: 'pz-input-output',         title: 'Python Input/Output',              category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/input-output-import' },
  { slug: 'pz-operators',            title: 'Python Operators',                 category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/operators' },
  { slug: 'pz-type-conversion',      title: 'Type Conversion',                  category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/type-conversion-and-casting' },
  { slug: 'pz-namespace',            title: 'Namespace & Scope',                category: 'basics',          level: 'beginner',     url: 'https://www.programiz.com/python-programming/namespace' },
  // ── Control Flow ─────────────────────────────────────────────────────────
  { slug: 'pz-if-elif-else',         title: 'Python if...elif...else',          category: 'control-flow',    level: 'beginner',     url: 'https://www.programiz.com/python-programming/if-elif-else' },
  { slug: 'pz-for-loop',             title: 'Python for Loop',                  category: 'control-flow',    level: 'beginner',     url: 'https://www.programiz.com/python-programming/for-loop' },
  { slug: 'pz-while-loop',           title: 'Python while Loop',                category: 'control-flow',    level: 'beginner',     url: 'https://www.programiz.com/python-programming/while-loop' },
  { slug: 'pz-break-continue',       title: 'break and continue',               category: 'control-flow',    level: 'beginner',     url: 'https://www.programiz.com/python-programming/break-continue' },
  { slug: 'pz-pass-statement',       title: 'pass Statement',                   category: 'control-flow',    level: 'beginner',     url: 'https://www.programiz.com/python-programming/pass-statement' },
  // ── Functions ─────────────────────────────────────────────────────────────
  { slug: 'pz-functions',            title: 'Python Functions',                 category: 'functions',       level: 'beginner',     url: 'https://www.programiz.com/python-programming/function' },
  { slug: 'pz-function-arguments',   title: 'Function Arguments',               category: 'functions',       level: 'beginner',     url: 'https://www.programiz.com/python-programming/function-argument' },
  { slug: 'pz-recursion',            title: 'Python Recursion',                 category: 'functions',       level: 'intermediate', url: 'https://www.programiz.com/python-programming/recursion' },
  { slug: 'pz-lambda',               title: 'Anonymous/Lambda Functions',       category: 'functions',       level: 'intermediate', url: 'https://www.programiz.com/python-programming/anonymous-lambda-function' },
  { slug: 'pz-global-local',         title: 'Global, Local & Nonlocal',         category: 'functions',       level: 'intermediate', url: 'https://www.programiz.com/python-programming/global-local-nonlocal-variables' },
  { slug: 'pz-modules',              title: 'Python Modules',                   category: 'functions',       level: 'beginner',     url: 'https://www.programiz.com/python-programming/modules' },
  // ── Data Structures ──────────────────────────────────────────────────────
  { slug: 'pz-list',                 title: 'Python List',                      category: 'data-structures', level: 'beginner',     url: 'https://www.programiz.com/python-programming/list' },
  { slug: 'pz-tuple',                title: 'Python Tuple',                     category: 'data-structures', level: 'beginner',     url: 'https://www.programiz.com/python-programming/tuple' },
  { slug: 'pz-string',               title: 'Python String',                    category: 'data-structures', level: 'beginner',     url: 'https://www.programiz.com/python-programming/string' },
  { slug: 'pz-dictionary',           title: 'Python Dictionary',                category: 'data-structures', level: 'beginner',     url: 'https://www.programiz.com/python-programming/dictionary' },
  { slug: 'pz-set',                  title: 'Python Set',                       category: 'data-structures', level: 'beginner',     url: 'https://www.programiz.com/python-programming/set' },
  { slug: 'pz-list-comprehension',   title: 'List Comprehension',               category: 'data-structures', level: 'intermediate', url: 'https://www.programiz.com/python-programming/list-comprehension' },
  { slug: 'pz-matrix',               title: 'Python Matrix & 2D Arrays',        category: 'data-structures', level: 'intermediate', url: 'https://www.programiz.com/python-programming/matrix' },
  // ── OOP ──────────────────────────────────────────────────────────────────
  { slug: 'pz-oop',                  title: 'OOP in Python',                    category: 'oop',             level: 'intermediate', url: 'https://www.programiz.com/python-programming/object-oriented-programming' },
  { slug: 'pz-class',                title: 'Python Classes & Objects',         category: 'oop',             level: 'intermediate', url: 'https://www.programiz.com/python-programming/class' },
  { slug: 'pz-inheritance',          title: 'Python Inheritance',               category: 'oop',             level: 'intermediate', url: 'https://www.programiz.com/python-programming/inheritance' },
  { slug: 'pz-multiple-inheritance', title: 'Multiple Inheritance',             category: 'oop',             level: 'intermediate', url: 'https://www.programiz.com/python-programming/multiple-inheritance' },
  { slug: 'pz-operator-overloading', title: 'Operator Overloading',             category: 'oop',             level: 'intermediate', url: 'https://www.programiz.com/python-programming/operator-overloading' },
  // ── Advanced ─────────────────────────────────────────────────────────────
  { slug: 'pz-iterators',            title: 'Python Iterators',                 category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/iterator' },
  { slug: 'pz-generators',           title: 'Python Generators',                category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/generator' },
  { slug: 'pz-closures',             title: 'Python Closures',                  category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/closure' },
  { slug: 'pz-decorators',           title: 'Python Decorators',                category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/decorator' },
  { slug: 'pz-property',             title: 'Python @property',                 category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/property' },
  { slug: 'pz-exceptions',           title: 'Exception Handling',               category: 'advanced',        level: 'intermediate', url: 'https://www.programiz.com/python-programming/exception-handling' },
  { slug: 'pz-file-io',              title: 'File I/O',                         category: 'advanced',        level: 'intermediate', url: 'https://www.programiz.com/python-programming/file-operation' },
  { slug: 'pz-regex',                title: 'Regular Expressions',              category: 'advanced',        level: 'advanced',     url: 'https://www.programiz.com/python-programming/regular-expression' },
];
